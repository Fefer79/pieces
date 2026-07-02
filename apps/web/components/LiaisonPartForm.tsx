'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { liaisonFetch } from '@/lib/liaison-api'
import { minCommissionFor } from 'shared/validators'
import { WARRANTY_UNITS, type WarrantyUnit, ABIDJAN_COMMUNES } from 'shared/constants'

const CONDITIONS = [
  { value: 'NEW', label: 'Neuf' },
  { value: 'USED', label: 'Occasion' },
  { value: 'REFURBISHED', label: 'Ré-usiné' },
] as const
type Condition = (typeof CONDITIONS)[number]['value']

const COMMON_CATEGORIES = [
  'Moteur',
  'Freinage',
  'Suspension',
  'Transmission',
  'Carrosserie',
  'Électronique',
  'Filtration',
  'Échappement',
  'Climatisation',
  'Allumage',
]

export interface FitmentEntry {
  brand: string
  model?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  engine?: string | null
}

export interface PartFormInitial {
  name?: string
  category?: string | null
  oemReference?: string | null
  vehicleCompatibility?: string | null
  fitments?: FitmentEntry[]
  price?: number | null
  condition?: Condition
  warrantyValue?: number | null
  warrantyUnit?: WarrantyUnit | null
  commissionAmount?: number | null
  inStock?: boolean
}

interface Props {
  mode: 'create' | 'edit'
  /** Vendeur cible (modes 'edit' et 'create' classique). Omis en saisie rapide. */
  vendorId?: string
  partId?: string
  initial?: PartFormInitial
  /** Saisie rapide : capture le vendeur tiers (nom, contact, location) + publie l'annonce en une étape. */
  quickVendor?: boolean
}

export function LiaisonPartForm({ mode, vendorId, partId, initial, quickVendor }: Props) {
  const router = useRouter()
  // Champs vendeur (saisie rapide uniquement)
  const [vShopName, setVShopName] = useState('')
  const [vContactName, setVContactName] = useState('')
  const [vPhone, setVPhone] = useState('+225')
  const [vCommune, setVCommune] = useState('')
  const [vAddress, setVAddress] = useState('')
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [oemReference, setOemReference] = useState(initial?.oemReference ?? '')
  const [vehicleCompatibility, setVehicleCompatibility] = useState(
    initial?.vehicleCompatibility ?? '',
  )
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [condition, setCondition] = useState<Condition>(initial?.condition ?? 'USED')
  const [warrantyValue, setWarrantyValue] = useState(
    initial?.warrantyValue != null ? String(initial.warrantyValue) : '',
  )
  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>(
    initial?.warrantyUnit ?? 'MONTH',
  )

  const [commission, setCommission] = useState(
    initial?.commissionAmount != null ? String(initial.commissionAmount) : '',
  )
  const [inStock, setInStock] = useState(initial?.inStock ?? true)
  const [fitments, setFitments] = useState<FitmentEntry[]>(initial?.fitments ?? [])
  const [fitBrand, setFitBrand] = useState('')
  const [fitModel, setFitModel] = useState('')
  const [fitYearFrom, setFitYearFrom] = useState('')
  const [fitYearTo, setFitYearTo] = useState('')
  const [fitEngine, setFitEngine] = useState('')

  const addFitment = () => {
    const brand = fitBrand.trim()
    if (brand.length < 1) return
    const yf = fitYearFrom ? Number(fitYearFrom) : null
    const yt = fitYearTo ? Number(fitYearTo) : null
    if (yf != null && yt != null && yf > yt) return
    setFitments((prev) => [
      ...prev,
      {
        brand,
        model: fitModel.trim() || null,
        yearFrom: yf,
        yearTo: yt,
        engine: fitEngine.trim() || null,
      },
    ])
    setFitBrand('')
    setFitModel('')
    setFitYearFrom('')
    setFitYearTo('')
    setFitEngine('')
  }
  const removeFitment = (idx: number) =>
    setFitments((prev) => prev.filter((_, i) => i !== idx))

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceNum = useMemo(() => (price ? Number(price) : 0), [price])
  const minCommission = useMemo(() => minCommissionFor(priceNum), [priceNum])

  const commissionNum = commission ? Number(commission) : 0
  const commissionBelowMin = commission !== '' && commissionNum < minCommission
  // Aligné sur phoneSchema côté serveur : préfixe mobile ivoirien (01|05|07) obligatoire.
  const phoneValid = /^\+225(01|05|07)\d{8}$/.test(vPhone)
  const vendorValid =
    !quickVendor ||
    (vShopName.trim().length >= 2 &&
      vContactName.trim().length >= 2 &&
      phoneValid &&
      vCommune.length > 0)
  const valid = name.length >= 2 && vendorValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)

    const payload = {
      name,
      category: category || undefined,
      oemReference: oemReference || undefined,
      vehicleCompatibility: vehicleCompatibility || undefined,
      price: price ? Number(price) : undefined,
      condition,
      warrantyValue: warrantyValue ? Number(warrantyValue) : undefined,
      warrantyUnit: warrantyValue ? warrantyUnit : undefined,
      commissionAmount: commission ? Number(commission) : undefined,
      inStock,
      fitments,
      ...(quickVendor && {
        vendor: {
          shopName: vShopName.trim(),
          contactName: vContactName.trim(),
          phone: vPhone.trim(),
          commune: vCommune,
          address: vAddress.trim() || undefined,
        },
      }),
    }

    const path = quickVendor
      ? '/parts/quick'
      : mode === 'create'
        ? `/vendors/${vendorId}/parts`
        : `/vendors/${vendorId}/parts/${partId}`
    const method = mode === 'create' || quickVendor ? 'POST' : 'PATCH'

    const r = await liaisonFetch<{ id: string; vendorId: string }>(path, {
      method,
      body: JSON.stringify(payload),
    })

    setSubmitting(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    router.push(`/liaison/vendors/${quickVendor ? r.data.vendorId : vendorId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      {quickVendor && (
        <fieldset className="space-y-4 rounded-md border border-border bg-card p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Vendeur tiers</legend>
          <p className="text-xs text-muted">
            Obligatoire pour publier au nom d&apos;un vendeur. Ces informations restent
            réservées à vous et à l&apos;administration.
          </p>

          <Field label="Nom du vendeur / boutique" required>
            <input
              value={vShopName}
              onChange={(e) => setVShopName(e.target.value)}
              className="liaison-input"
              placeholder="Ex : Casse Auto Adjamé"
            />
          </Field>

          <Field label="Personne à contacter" required>
            <input
              value={vContactName}
              onChange={(e) => setVContactName(e.target.value)}
              className="liaison-input"
              placeholder="Ex : Konan Yao"
            />
          </Field>

          <Field label="Téléphone" required>
            <input
              type="tel"
              value={vPhone}
              onChange={(e) => setVPhone(e.target.value)}
              className="liaison-input"
              placeholder="+225XXXXXXXXXX"
            />
            {vPhone.length > 4 && !phoneValid && (
              <p className="mt-1 text-xs text-[#B45309]">
                Format attendu : +225 puis 01, 05 ou 07 et 8 chiffres (mobile)
              </p>
            )}
          </Field>

          <Field label="Commune" required>
            <select
              aria-label="Commune du vendeur"
              value={vCommune}
              onChange={(e) => setVCommune(e.target.value)}
              className="liaison-input"
            >
              <option value="">Choisir…</option>
              {ABIDJAN_COMMUNES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Adresse / repère" hint="Optionnel">
            <input
              value={vAddress}
              onChange={(e) => setVAddress(e.target.value)}
              className="liaison-input"
              placeholder="Ex : Rue des Jardins, près du marché"
            />
          </Field>
        </fieldset>
      )}

      <Field label="Nom de la pièce" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="liaison-input"
          placeholder="Ex : Alternateur 90A"
        />
      </Field>

      <Field label="Catégorie">
        <input
          list="categories"
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value)}
          className="liaison-input"
          placeholder="Ex : Électronique"
        />
        <datalist id="categories">
          {COMMON_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label="État" required>
        <div className="grid grid-cols-3 gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`rounded-md px-3 py-2.5 text-sm transition-colors ${
                condition === c.value
                  ? 'bg-ink-2 text-white'
                  : 'bg-card text-ink ring-1 ring-border'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Prix (FCFA)" hint="Laissez vide si à confirmer">
        <input
          type="number"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="liaison-input"
          placeholder="Ex : 45000"
          min={0}
        />
      </Field>

      <Field
        label="Commission Pièces (FCFA)"
        hint="Montant agréé avec le vendeur"
      >
        <input
          type="number"
          inputMode="numeric"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          className="liaison-input"
          placeholder="Ex : 3000"
          min={0}
        />
        {commissionBelowMin && (
          <p className="mt-1 text-xs text-[#B45309]">
            Plancher de sécurité : sera enregistrée à {minCommission.toLocaleString('fr-FR')} FCFA minimum
          </p>
        )}
      </Field>

      <Field label="Référence OEM">
        <input
          value={oemReference ?? ''}
          onChange={(e) => setOemReference(e.target.value)}
          className="liaison-input"
          placeholder="Ex : 27060-0L010"
        />
      </Field>

      <Field label="Compatibilité véhicule (texte libre)" hint="Conservé pour la recherche plein-texte">
        <input
          value={vehicleCompatibility ?? ''}
          onChange={(e) => setVehicleCompatibility(e.target.value)}
          className="liaison-input"
          placeholder="Ex : Toyota Hilux 2010-2015"
        />
      </Field>

      <Field
        label="Compatibilités structurées"
        hint="Une ou plusieurs lignes marque + modèle + années + moteur (optionnels)"
      >
        {fitments.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {fitments.map((f, idx) => (
              <li
                key={`${f.brand}-${f.model ?? ''}-${f.yearFrom ?? ''}-${idx}`}
                className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm ring-1 ring-border"
              >
                <span className="truncate text-ink">
                  <strong>{f.brand}</strong>
                  {f.model ? ` · ${f.model}` : ''}
                  {f.yearFrom || f.yearTo
                    ? ` · ${f.yearFrom ?? '…'}–${f.yearTo ?? '…'}`
                    : ''}
                  {f.engine ? ` · ${f.engine}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeFitment(idx)}
                  className="ml-2 text-xs text-[#D32F2F] hover:underline"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input
            value={fitBrand}
            onChange={(e) => setFitBrand(e.target.value)}
            className="liaison-input"
            placeholder="Marque*"
          />
          <input
            value={fitModel}
            onChange={(e) => setFitModel(e.target.value)}
            className="liaison-input"
            placeholder="Modèle"
          />
          <input
            type="number"
            value={fitYearFrom}
            onChange={(e) => setFitYearFrom(e.target.value)}
            className="liaison-input"
            placeholder="Année min"
            min={1950}
            max={2100}
          />
          <input
            type="number"
            value={fitYearTo}
            onChange={(e) => setFitYearTo(e.target.value)}
            className="liaison-input"
            placeholder="Année max"
            min={1950}
            max={2100}
          />
          <input
            value={fitEngine}
            onChange={(e) => setFitEngine(e.target.value)}
            className="liaison-input"
            placeholder="Moteur"
          />
        </div>
        <button
          type="button"
          onClick={addFitment}
          disabled={fitBrand.trim().length < 1}
          className="mt-2 rounded-md bg-card px-3 py-2 text-sm text-ink ring-1 ring-border disabled:opacity-50"
        >
          + Ajouter une compatibilité
        </button>
      </Field>

      <Field label="Garantie">
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={warrantyValue}
            onChange={(e) => setWarrantyValue(e.target.value)}
            className="liaison-input flex-1"
            placeholder="Durée"
            min={0}
            max={365}
          />
          <select
            aria-label="Unité de garantie"
            value={warrantyUnit}
            onChange={(e) => setWarrantyUnit(e.target.value as WarrantyUnit)}
            className="liaison-input flex-1"
          >
            {WARRANTY_UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </Field>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm text-ink">En stock</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Link
          href={quickVendor ? '/liaison/parts' : `/liaison/vendors/${vendorId}`}
          className="rounded-md bg-card px-4 py-2.5 text-sm font-medium text-muted ring-1 ring-border"
          style={{ minHeight: 44 }}
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={!valid || submitting}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {submitting
            ? mode === 'create'
              ? 'Ajout…'
              : 'Enregistrement…'
            : mode === 'create'
            ? 'Ajouter la pièce'
            : 'Enregistrer'}
        </button>
      </div>

      <style jsx>{`
        :global(.liaison-input) {
          width: 100%;
          padding: 0.65rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border, #e5e5e5);
          background: var(--card, #fff);
          color: var(--ink, #1a1a1a);
          font-size: 14px;
          min-height: 44px;
        }
        :global(.liaison-input:focus) {
          outline: 2px solid rgba(0, 35, 102, 0.4);
          outline-offset: 1px;
        }
      `}</style>
    </form>
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
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-accent">*</span>}
      </span>
      {hint && <span className="mb-1.5 block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  )
}
