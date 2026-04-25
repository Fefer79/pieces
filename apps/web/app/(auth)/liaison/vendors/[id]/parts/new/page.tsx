'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { liaisonFetch } from '@/lib/liaison-api'

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

export default function NewPartPage() {
  const router = useRouter()
  const params = useParams()
  const vendorId = params.id as string

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [oemReference, setOemReference] = useState('')
  const [vehicleCompatibility, setVehicleCompatibility] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<Condition>('USED')
  const [warrantyMonths, setWarrantyMonths] = useState('')
  const [inStock, setInStock] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = name.length >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setSubmitting(true)
    setError(null)

    const r = await liaisonFetch<{ id: string }>(`/vendors/${vendorId}/parts`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        category: category || undefined,
        oemReference: oemReference || undefined,
        vehicleCompatibility: vehicleCompatibility || undefined,
        price: price ? Number(price) : undefined,
        condition,
        warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
        inStock,
      }),
    })

    setSubmitting(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    router.push(`/liaison/vendors/${vendorId}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-6">
      <Link
        href={`/liaison/vendors/${vendorId}`}
        className="mb-2 inline-block text-sm text-ink-2 hover:underline"
      >
        ← Retour au vendeur
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Ajouter une pièce</h1>
      <p className="mb-6 text-sm text-muted">
        La pièce sera publiée immédiatement au catalogue du vendeur.
      </p>

      {error && (
        <p className="mb-4 rounded-md border border-[#D32F2F]/40 bg-[#D32F2F]/5 p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
            value={category}
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

        <Field label="Référence OEM">
          <input
            value={oemReference}
            onChange={(e) => setOemReference(e.target.value)}
            className="liaison-input"
            placeholder="Ex : 27060-0L010"
          />
        </Field>

        <Field label="Compatibilité véhicule" hint="Marque · modèle · année">
          <input
            value={vehicleCompatibility}
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
            {submitting ? 'Ajout…' : 'Ajouter la pièce'}
          </button>
        </div>
      </form>

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
    </div>
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
