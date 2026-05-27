'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { liaisonFetch } from '@/lib/liaison-api'
import { minCommissionFor } from 'shared/validators'

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

export interface PartFormInitial {
  name?: string
  category?: string | null
  oemReference?: string | null
  vehicleCompatibility?: string | null
  price?: number | null
  condition?: Condition
  warrantyMonths?: number | null
  commissionAmount?: number | null
  inStock?: boolean
}

interface Props {
  mode: 'create' | 'edit'
  vendorId: string
  partId?: string
  initial?: PartFormInitial
}

export function LiaisonPartForm({ mode, vendorId, partId, initial }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [oemReference, setOemReference] = useState(initial?.oemReference ?? '')
  const [vehicleCompatibility, setVehicleCompatibility] = useState(
    initial?.vehicleCompatibility ?? '',
  )
  const initialPrice = initial?.price != null ? String(initial.price) : ''
  const [price, setPrice] = useState(initialPrice)
  const [condition, setCondition] = useState<Condition>(initial?.condition ?? 'USED')
  const [warrantyMonths, setWarrantyMonths] = useState(
    initial?.warrantyMonths != null ? String(initial.warrantyMonths) : '',
  )

  const initialMin = minCommissionFor(initialPrice ? Number(initialPrice) : 0)
  const [commission, setCommission] = useState(
    initial?.commissionAmount != null ? String(initial.commissionAmount) : String(initialMin),
  )
  const [commissionTouched, setCommissionTouched] = useState(initial?.commissionAmount != null)
  const [inStock, setInStock] = useState(initial?.inStock ?? true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceNum = useMemo(() => (price ? Number(price) : 0), [price])
  const minCommission = useMemo(() => minCommissionFor(priceNum), [priceNum])

  const handlePriceChange = (val: string) => {
    setPrice(val)
    if (!commissionTouched) {
      setCommission(String(minCommissionFor(val ? Number(val) : 0)))
    }
  }

  const commissionNum = commission ? Number(commission) : 0
  const commissionBelowMin = commissionNum < minCommission
  const valid = name.length >= 2

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
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
      commissionAmount: commission ? Number(commission) : undefined,
      inStock,
    }

    const path =
      mode === 'create'
        ? `/vendors/${vendorId}/parts`
        : `/vendors/${vendorId}/parts/${partId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const r = await liaisonFetch<{ id: string }>(path, {
      method,
      body: JSON.stringify(payload),
    })

    setSubmitting(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    router.push(`/liaison/vendors/${vendorId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
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
          onChange={(e) => handlePriceChange(e.target.value)}
          className="liaison-input"
          placeholder="Ex : 45000"
          min={0}
        />
      </Field>

      <Field
        label="Commission Pièces (FCFA)"
        hint={`Minimum : ${minCommission.toLocaleString('fr-FR')} FCFA (max de 1 000 F ou 5 % du prix)`}
      >
        <input
          type="number"
          inputMode="numeric"
          value={commission}
          onChange={(e) => {
            setCommissionTouched(true)
            setCommission(e.target.value)
          }}
          onBlur={() => {
            if (commissionBelowMin) setCommission(String(minCommission))
          }}
          className="liaison-input"
          min={0}
        />
        {commissionBelowMin && (
          <p className="mt-1 text-xs text-[#B45309]">
            Sera automatiquement remontée à {minCommission.toLocaleString('fr-FR')} FCFA
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

      <Field label="Compatibilité véhicule" hint="Marque · modèle · année">
        <input
          value={vehicleCompatibility ?? ''}
          onChange={(e) => setVehicleCompatibility(e.target.value)}
          className="liaison-input"
          placeholder="Ex : Toyota Hilux 2010-2015"
        />
      </Field>

      <Field label="Garantie (mois)">
        <input
          type="number"
          inputMode="numeric"
          value={warrantyMonths}
          onChange={(e) => setWarrantyMonths(e.target.value)}
          className="liaison-input"
          min={0}
          max={60}
        />
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
          href={`/liaison/vendors/${vendorId}`}
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
