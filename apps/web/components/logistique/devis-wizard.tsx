'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  computeArbitrageMatrix,
  matchLogisticsFamily,
  resolveEconomyCategory,
  DOWNTIME_COST_PER_DAY,
  type VehicleEconomyCategory,
  type VehicleEnergyType,
  type ArbitrageResult,
} from 'shared/constants'
import {
  LEAD_FORM_COPY,
  CUSTOMER_TYPE_OPTIONS,
  FLEET_CUSTOMER_TYPES,
  isCustomerType,
  computeCertainty,
  type LeadCertaintySignals,
  type LeadCertaintyLevel,
} from '@/lib/logistique-content'
import { CertaintyMeter } from './certainty-meter'
import { EstimatePanel } from './estimate-panel'
import { PhotoField, type PickedPhoto } from './photo-field'
import { VinField } from './vin-field'
import {
  createLead,
  uploadLeadPhoto,
  type CreateLeadResponse,
} from '@/lib/logistique/leads-api'
import { PART_LOGISTICS_FAMILIES } from 'shared/constants'
import type { DevisContext } from './devis-context'

// Toutes les familles déclarées dans la base de produits — pour la datalist du
// champ « pièce » (saisie semi-libre avec suggestions).
const PART_LABELS = PART_LOGISTICS_FAMILIES.map((f) => f.label)

const fmt = (n: number) => n.toLocaleString('fr-FR')

interface FormState {
  // Pièce
  partName: string
  partCategory: string
  oemReference: string
  quantity: number
  partPriceHint: number | null
  partPhoto: PickedPhoto | null
  // Véhicule
  vin: string
  registrationPhoto: PickedPhoto | null
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: number | null
  energyType: VehicleEnergyType | null
  vehicleImmobilized: boolean
  // Contact
  contactName: string
  phone: string
  whatsapp: string
  whatsappSame: boolean
  email: string
  companyName: string
  commune: string
  customerType: string
  fleetSize: number | null
  consent: boolean
  // Flotte
  enterpriseId: string | null
  vehicleId: string | null
  partRequestId: string | null
}

type Status = 'idle' | 'submitting' | 'created' | 'error'

const VEHICLE_YEARS = (() => {
  const now = new Date().getFullYear()
  const years: number[] = []
  for (let y = now + 1; y >= 1990; y--) years.push(y)
  return years
})()

const COMMUNE_LIST = [
  'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody',
  'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon',
  'Autre / hors Abidjan',
]

export function DevisWizard({ context }: { context: DevisContext }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [state, setState] = useState<FormState>(() => initialState(context, searchParams))
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreateLeadResponse | null>(null)
  const [photoResults, setPhotoResults] = useState<{ part?: 'ok' | 'fail'; registration?: 'ok' | 'fail' }>({})
  const [startedAt] = useState(() => Date.now())

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  // -------- Estimation live (zéro réseau) --------------------------------
  const estimate = useMemo<ArbitrageResult>(() => {
    const economyCategory: VehicleEconomyCategory = resolveEconomyCategory({
      energyType: state.energyType ?? undefined,
      model: state.vehicleModel || null,
    })
    return computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY[economyCategory],
      family: matchLogisticsFamily(state.partName, state.partCategory, state.oemReference),
      options: [
        { mode: 'LOCAL', partPrice: state.partPriceHint ?? 0, available: true },
        { mode: 'AIR_NOW', partPrice: state.partPriceHint ?? 0, available: true },
        { mode: 'AIR_STANDARD', partPrice: state.partPriceHint ?? 0, available: true },
        { mode: 'AIR_ECONOMY', partPrice: state.partPriceHint ?? 0, available: true },
        { mode: 'SEA_LCL', partPrice: state.partPriceHint ?? 0, available: true },
      ],
    })
  }, [
    state.energyType,
    state.vehicleModel,
    state.partName,
    state.partCategory,
    state.oemReference,
    state.partPriceHint,
  ])

  const economyCategory = useMemo(
    () =>
      resolveEconomyCategory({
        energyType: state.energyType ?? undefined,
        model: state.vehicleModel || null,
      }),
    [state.energyType, state.vehicleModel],
  )

  const signals: LeadCertaintySignals = useMemo(
    () => ({
      partName: !!state.partName,
      partCategory: !!state.partCategory,
      oemReference: !!state.oemReference,
      partPhoto: !!state.partPhoto,
      vin: !!state.vin,
      registrationPhoto: !!state.registrationPhoto,
      vehicleManual: !!(state.vehicleBrand && state.vehicleModel),
      energyType: !!state.energyType,
    }),
    [state],
  )

  const { level: certaintyLevel } = computeCertainty(signals)

  const canNext =
    step === 0
      ? state.partName.trim().length >= 2
      : step === 1
        ? !!state.vin || (!!state.vehicleBrand && !!state.vehicleModel) || !!state.registrationPhoto
        : step === 2
          ? state.contactName.trim().length >= 2 &&
            state.phone.replace(/\D/g, '').length >= 9 &&
            state.consent
          : true

  // -------- Soumission : lead d'abord, photos ensuite --------------------

  async function handleSubmit() {
    setStatus('submitting')
    setError(null)
    const payload: Record<string, unknown> = {
      contactName: state.contactName.trim(),
      phone: state.phone.trim(),
      whatsapp: state.whatsappSame ? state.phone.trim() : state.whatsapp.trim() || undefined,
      email: state.email.trim() || undefined,
      companyName: state.companyName.trim() || undefined,
      commune: state.commune || undefined,
      customerType: state.customerType,
      fleetSize: state.fleetSize ?? undefined,
      partName: state.partName.trim(),
      partCategory: state.partCategory.trim() || undefined,
      oemReference: state.oemReference.trim() || undefined,
      quantity: state.quantity,
      partPriceHint: state.partPriceHint ?? undefined,
      vin: state.vin || undefined,
      vehicleBrand: state.vehicleBrand.trim() || undefined,
      vehicleModel: state.vehicleModel.trim() || undefined,
      vehicleYear: state.vehicleYear ?? undefined,
      energyType: state.energyType ?? undefined,
      vehicleImmobilized: state.vehicleImmobilized,
      consent: true,
      startedAt,
      surface: context.mode === 'FLEET' ? 'FLEET' : context.mode === 'ACCOUNT' ? 'APP' : 'LANDING',
      campaign: searchParams.get('utm_campaign') ?? undefined,
    }
    if (context.mode === 'FLEET' && context.enterprise) {
      payload.enterpriseId = context.enterprise.id
      if (state.vehicleId) payload.vehicleId = state.vehicleId
    }
    if (context.fromRequest) payload.partRequestId = context.fromRequest.id

    const res = await createLead(payload, /* accessToken: */ null)
    if (!res.ok) {
      setStatus('error')
      setError(res.message)
      return
    }
    setCreated(res.data)
    setStatus('created')

    // Envoi séquentiel des photos — un échec n'annule pas le lead.
    const token = res.data.uploadToken
    if (state.partPhoto) {
      const up = await uploadLeadPhoto(res.data.id, state.partPhoto.blob, 'PART', token)
      setPhotoResults((r) => ({ ...r, part: up.ok ? 'ok' : 'fail' }))
    }
    if (state.registrationPhoto) {
      const up = await uploadLeadPhoto(res.data.id, state.registrationPhoto.blob, 'REGISTRATION_CARD', token)
      setPhotoResults((r) => ({ ...r, registration: up.ok ? 'ok' : 'fail' }))
    }

    // Redirection vers la page « merci » avec la référence.
    router.push(`/logistique/devis/merci?ref=${encodeURIComponent(res.data.reference)}`)
  }

  const submitLabel = status === 'submitting' ? LEAD_FORM_COPY.submitting : LEAD_FORM_COPY.submit
  const vehicleOptions = context.vehicles ?? []

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (step < 2) setStep(((step + 1) as 0 | 1 | 2))
          else void handleSubmit()
        }}
        className="space-y-6"
        noValidate
      >
        <Stepper step={step} />

        {step === 0 && (
          <Step1Part
            state={state}
            update={update}
          />
        )}
        {step === 1 && (
          <Step2Vehicle
            state={state}
            update={update}
            vehicleOptions={vehicleOptions}
            mode={context.mode}
          />
        )}
        {step === 2 && (
          <Step3Contact
            state={state}
            update={update}
            account={context.user ?? null}
            enterprise={context.enterprise ?? null}
          />
        )}

        {error && (
          <div className="rounded-md border border-error-fg/30 bg-error-bg/40 px-4 py-3 text-[13.5px] text-error-fg">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(((step - 1) as 0 | 1 | 2))}
              className="min-h-11 rounded-md border border-border-strong bg-card px-5 text-[14px] font-semibold text-ink hover:bg-surface"
            >
              ← Retour
            </button>
          )}
          <button
            type="submit"
            disabled={!canNext || status === 'submitting'}
            className="ml-auto min-h-11 rounded-md bg-accent px-6 text-[14.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {step < 2 ? 'Continuer' : submitLabel}
          </button>
        </div>

        {created && (photoResults.part === 'fail' || photoResults.registration === 'fail') && (
          <div className="rounded-md border border-warn-fg/30 bg-warn-bg px-4 py-3 text-[13px] text-warn-fg">
            {LEAD_FORM_COPY.photoRetry} Votre demande (réf. {created.reference}) est bien
            enregistrée.
          </div>
        )}
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CertaintyMeter signals={signals} />
        <EstimatePanel
          result={estimate}
          hasPartPrice={state.partPriceHint != null && state.partPriceHint > 0}
          certaintyLevel={certaintyLevel as LeadCertaintyLevel}
          downtimeAssumed={
            context.mode === 'PUBLIC' ||
            (context.mode === 'ACCOUNT' && !state.vehicleId)
          }
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-2">
          Hypothèse immobilisation : {fmt(DOWNTIME_COST_PER_DAY[economyCategory])} F/j (
          {economyCategory.toLowerCase().replace('_', ' ')})
        </p>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Étapes
// ---------------------------------------------------------------------------

function Stepper({ step }: { step: 0 | 1 | 2 | 3 }) {
  const labels = ['La pièce', 'Le véhicule', 'Vous']
  return (
    <ol className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
      {labels.map((l, i) => {
        const done = i < step
        const active = i === step
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] ${
                done
                  ? 'bg-success-fg text-white'
                  : active
                    ? 'bg-ink text-white'
                    : 'bg-surface text-muted'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={active || done ? 'text-ink' : ''}>{l}</span>
            {i < labels.length - 1 && <span className="mx-1 text-muted-2">·</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Step1Part({ state, update }: { state: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <section className="rounded-md border border-border bg-card p-5 lg:p-6">
      <h2 className="text-[20px] font-semibold text-ink">{LEAD_FORM_COPY.steps[0]!.title}</h2>
      <p className="mt-1 text-[13.5px] text-muted">{LEAD_FORM_COPY.steps[0]!.help}</p>

      <div className="mt-5 space-y-4">
        <Field label="Nom de la pièce" required>
          <input
            list="part-labels"
            type="text"
            value={state.partName}
            onChange={(e) => update('partName', e.target.value)}
            placeholder="ex. Amortisseur avant"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <datalist id="part-labels">
            {PART_LABELS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie" hint="Optionnel, aide à mieux classer la pièce">
            <input
              type="text"
              value={state.partCategory}
              onChange={(e) => update('partCategory', e.target.value)}
              placeholder="ex. Suspension"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Référence OEM" hint="Souvent gravée sur la pièce">
            <input
              type="text"
              value={state.oemReference}
              onChange={(e) => update('oemReference', e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantité">
            <input
              type="number"
              min={1}
              max={999}
              value={state.quantity}
              onChange={(e) => update('quantity', Math.max(1, Number(e.target.value) || 1))}
              className="tabular w-32 rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Prix de la pièce" hint="Optionnel, permet le coût total">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1000}
                value={state.partPriceHint ?? ''}
                onChange={(e) =>
                  update('partPriceHint', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="ex. 45 000"
                className="tabular w-40 rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
              />
              <span className="text-sm text-muted">F</span>
            </div>
          </Field>
        </div>

        <PhotoField
          id="part-photo"
          label="Photo de la pièce"
          hint="La photo vaut 15 points de certitude et nous évite de demander la pièce pour rien."
          value={state.partPhoto}
          onChange={(p) => update('partPhoto', p)}
        />
      </div>
    </section>
  )
}

function Step2Vehicle({
  state,
  update,
  vehicleOptions,
  mode,
}: {
  state: FormState
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  vehicleOptions: { id: string; brand: string; model: string; year: number; vin: string | null; energyType: 'ICE' | 'EV' | 'HYBRID' | null }[]
  mode: DevisContext['mode']
}) {
  const hasFleetVehicles = mode === 'FLEET' && vehicleOptions.length > 0
  const [manualMode, setManualMode] = useState(!hasFleetVehicles)

  return (
    <section className="rounded-md border border-border bg-card p-5 lg:p-6">
      <h2 className="text-[20px] font-semibold text-ink">{LEAD_FORM_COPY.steps[1]!.title}</h2>
      <p className="mt-1 text-[13.5px] text-muted">{LEAD_FORM_COPY.steps[1]!.help}</p>

      {hasFleetVehicles && !manualMode && (
        <div className="mt-5 space-y-3">
          <p className="text-[13px] text-muted">Sélectionnez un véhicule de la flotte :</p>
          <ul className="space-y-2">
            {vehicleOptions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    update('vehicleId', v.id)
                    update('vehicleBrand', v.brand)
                    update('vehicleModel', v.model)
                    update('vehicleYear', v.year)
                    update('vin', v.vin ?? '')
                    update('energyType', v.energyType ?? null)
                  }}
                  className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-[14px] transition-colors ${
                    state.vehicleId === v.id
                      ? 'border-accent bg-accent/5 text-ink'
                      : 'border-border-strong bg-card text-ink hover:bg-surface'
                  }`}
                >
                  <span>
                    <span className="font-semibold">{v.brand} {v.model}</span>
                    <span className="ml-2 text-muted">{v.year}</span>
                    {v.energyType && (
                      <span className="ml-2 rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] uppercase text-muted">
                        {v.energyType}
                      </span>
                    )}
                  </span>
                  {v.vin && (
                    <span className="font-mono text-[11px] tracking-[0.08em] text-muted-2">
                      {v.vin.slice(-8)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setManualMode(true)
              update('vehicleId', null)
            }}
            className="text-[13px] text-ink-2 underline underline-offset-2 hover:text-ink"
          >
            Saisie manuelle à la place
          </button>
        </div>
      )}

      {manualMode && (
        <div className="mt-5 space-y-4">
          <VinField
            value={state.vin}
            onChange={(v) => update('vin', v)}
            onDecoded={(r) => {
              if (r.make) update('vehicleBrand', r.make)
              if (r.model) update('vehicleModel', r.model)
              if (r.year) update('vehicleYear', r.year)
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marque">
              <input
                type="text"
                value={state.vehicleBrand}
                onChange={(e) => update('vehicleBrand', e.target.value)}
                className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </Field>
            <Field label="Modèle">
              <input
                type="text"
                value={state.vehicleModel}
                onChange={(e) => update('vehicleModel', e.target.value)}
                className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </Field>
            <Field label="Année">
              <select
                value={state.vehicleYear ?? ''}
                onChange={(e) =>
                  update('vehicleYear', e.target.value === '' ? null : Number(e.target.value))
                }
                className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">Non précisée</option>
                {VEHICLE_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </Field>
            <Field label="Motorisation">
              <select
                value={state.energyType ?? ''}
                onChange={(e) =>
                  update('energyType', (e.target.value as VehicleEnergyType | '') || null)
                }
                className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">Non précisée</option>
                <option value="ICE">Thermique (essence / diesel)</option>
                <option value="HYBRID">Hybride</option>
                <option value="EV">Électrique</option>
              </select>
            </Field>
          </div>

          <PhotoField
            id="registration-photo"
            label="Photo de la carte grise"
            hint="La case E porte le VIN. +15 points de certitude, additive au VIN."
            value={state.registrationPhoto}
            onChange={(p) => update('registrationPhoto', p)}
          />
        </div>
      )}

      <div className="mt-5 rounded-md border border-border bg-surface p-3">
        <label className="flex cursor-pointer items-start gap-2 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={state.vehicleImmobilized}
            onChange={(e) => update('vehicleImmobilized', e.target.checked)}
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span>
            Le véhicule est actuellement immobilisé (intervention impossible en l&apos;état).
          </span>
        </label>
      </div>
    </section>
  )
}

function Step3Contact({
  state,
  update,
  account,
  enterprise,
}: {
  state: FormState
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void
  account: { name: string | null; phone: string | null; email: string | null } | null
  enterprise: { name: string; commune: string | null; address: string | null } | null
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5 lg:p-6">
      <h2 className="text-[20px] font-semibold text-ink">{LEAD_FORM_COPY.steps[2]!.title}</h2>
      <p className="mt-1 text-[13.5px] text-muted">{LEAD_FORM_COPY.steps[2]!.help}</p>

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" required>
            <input
              type="text"
              value={state.contactName}
              onChange={(e) => update('contactName', e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Téléphone" required hint="Format +225 XX XX XX XX XX">
            <input
              type="tel"
              inputMode="tel"
              value={state.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+225 07 07 00 00 00"
              className="tabular w-full rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <input
                  type="checkbox"
                  checked={state.whatsappSame}
                  onChange={(e) => update('whatsappSame', e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <span>Même numéro que ci-dessus</span>
              </label>
              {!state.whatsappSame && (
                <input
                  type="tel"
                  inputMode="tel"
                  value={state.whatsapp}
                  onChange={(e) => update('whatsapp', e.target.value)}
                  placeholder="+225 07 07 00 00 00"
                  className="tabular w-full rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
                />
              )}
            </div>
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={state.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Société / Garage">
            <input
              type="text"
              value={state.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder={enterprise ? enterprise.name : ''}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Commune">
            <select
              value={state.commune}
              onChange={(e) => update('commune', e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Non précisée</option>
              {COMMUNE_LIST.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type de demandeur">
            <select
              value={state.customerType}
              onChange={(e) => update('customerType', e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            >
              {CUSTOMER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          {FLEET_CUSTOMER_TYPES.includes(state.customerType) && (
            <Field label="Taille de la flotte">
              <input
                type="number"
                min={0}
                value={state.fleetSize ?? ''}
                onChange={(e) =>
                  update('fleetSize', e.target.value === '' ? null : Number(e.target.value))
                }
                className="tabular w-32 rounded-md border border-border-strong bg-card px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </Field>
          )}
        </div>

        {/* Honeypot — laissé volontairement visible aux lecteurs d'écran mais
            jamais interactif pour un humain. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Site web
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={(state as unknown as { website?: string }).website ?? ''}
              onChange={(e) => update('website' as never, e.target.value as never)}
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-[13.5px] text-ink">
          <input
            type="checkbox"
            checked={state.consent}
            onChange={(e) => update('consent', e.target.checked)}
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span>
            {LEAD_FORM_COPY.consent}{' '}
            <a href="/cgu" className="underline underline-offset-2 hover:text-ink-2">CGU</a>{' '}
            ·{' '}
            <a
              href="/confidentialite"
              className="underline underline-offset-2 hover:text-ink-2"
            >
              Confidentialité
            </a>
          </span>
        </label>
      </div>
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// État initial — pré-remplissage par query params et par contexte (compte / flotte)
// ---------------------------------------------------------------------------

function initialState(context: DevisContext, searchParams: URLSearchParams | null): FormState {
  const qp = (k: string) => searchParams?.get(k) ?? undefined
  const base: FormState = {
    partName: qp('piece') ?? context.fromRequest?.partName ?? '',
    partCategory: qp('cat') ?? context.fromRequest?.partCategory ?? '',
    oemReference: context.fromRequest?.oemReference ?? '',
    quantity: 1,
    partPriceHint: qp('prix') ? Number(qp('prix')) : null,
    partPhoto: null,
    vin: '',
    registrationPhoto: null,
    vehicleBrand: qp('brand') ?? '',
    vehicleModel: qp('model') ?? '',
    vehicleYear: qp('year') ? Number(qp('year')) : null,
    energyType: null,
    vehicleImmobilized: false,
    contactName: context.user?.name ?? '',
    phone: context.user?.phone ?? '',
    whatsapp: '',
    whatsappSame: true,
    email: context.user?.email ?? '',
    companyName: context.enterprise?.name ?? '',
    commune: context.enterprise?.commune ?? '',
    // `?profil=` vient des cartes de segment de la vitrine : le visiteur a déjà
    // dit qui il est en cliquant, on ne le lui redemande pas. Une valeur inconnue
    // est ignorée (l'API refuserait un segment hors enum).
    // En mode flotte on ne connaît pas encore le segment exact (VTC, entreprise,
    // mines & BTP) : on pré-sélectionne le plus courant, le gestionnaire ajuste.
    customerType: isCustomerType(qp('profil'))
      ? qp('profil')!
      : context.mode === 'FLEET'
        ? 'FLEET_COMPANY'
        : 'OTHER',
    fleetSize: null,
    consent: false,
    enterpriseId: context.enterprise?.id ?? null,
    vehicleId: null,
    partRequestId: context.fromRequest?.id ?? null,
  }
  return base
}
