/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { enterpriseFetch, getActiveEnterpriseId, type FleetVehicle } from '@/lib/enterprise-api'

const URGENCY_OPTIONS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Urgent' },
  { value: 'CRITICAL', label: 'Critique' },
]

const SOURCE_OPTIONS = [
  { value: 'ANY', label: 'Peu importe' },
  { value: 'LOCAL', label: 'Local (24–48 h)' },
  { value: 'AIR', label: 'Avion (3–5 j)' },
  { value: 'CARGO', label: 'Cargo (45 j)' },
]

const labelCls =
  'block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
const inputCls =
  'mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink'

// Formulaire de demande de pièce : mécanicien (cas nominal), owner ou manager.
// La demande part ensuite au manager pour approbation.
export default function NewPartRequestPage() {
  const router = useRouter()
  const [enterpriseId] = useState<string | null>(getActiveEnterpriseId)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [vehicleId, setVehicleId] = useState('')
  const [partName, setPartName] = useState('')
  const [category, setCategory] = useState('')
  const [oemReference, setOemReference] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('NORMAL')
  const [preferredSource, setPreferredSource] = useState('ANY')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enterpriseId) {
      setLoading(false)
      return
    }
    enterpriseFetch<FleetVehicle[]>(`/${enterpriseId}/vehicles`).then((res) => {
      setLoading(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setVehicles(res.data)
      if (res.data[0]) setVehicleId(res.data[0].id)
    })
  }, [enterpriseId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId || !vehicleId) return
    setSubmitting(true)
    setError(null)

    const created = await enterpriseFetch<{ id: string }>(`/${enterpriseId}/part-requests`, {
      method: 'POST',
      body: JSON.stringify({
        vehicleId,
        partName: partName.trim(),
        category: category.trim() || undefined,
        oemReference: oemReference.trim() || undefined,
        description: description.trim() || undefined,
        urgency,
        preferredSource,
      }),
    })

    if (!created.ok) {
      setSubmitting(false)
      setError(created.message)
      return
    }

    // La demande est créée en DRAFT : on la soumet immédiatement au manager.
    const submitted = await enterpriseFetch(
      `/${enterpriseId}/part-requests/${created.data.id}/submit`,
      { method: 'POST', body: JSON.stringify({}) },
    )
    setSubmitting(false)
    if (!submitted.ok) {
      setError(submitted.message)
      return
    }

    router.push(`/enterprise/requests/${created.data.id}`)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Entreprise
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Demander une pièce</h1>
        <p className="mt-1 text-sm text-muted">
          Saisie par le mécanicien, l’owner ou le manager. Une fois envoyée, la demande part au
          manager pour approbation.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-md border border-border bg-card p-5"
      >
        <div>
          <label className={labelCls}>Véhicule</label>
          {loading ? (
            <p className="mt-1 text-sm text-muted">Chargement…</p>
          ) : vehicles.length === 0 ? (
            <p className="mt-1 text-sm text-error-fg">Aucun véhicule dans la flotte.</p>
          ) : (
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className={inputCls}
              required
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} {v.year} — {v.plate ?? 'Sans plaque'}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className={labelCls}>Nom de la pièce</label>
          <input
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="Ex. Plaquettes avant"
            className={inputCls}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Catégorie</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex. Freinage"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Référence OEM</label>
            <input
              value={oemReference}
              onChange={(e) => setOemReference(e.target.value)}
              placeholder="Optionnel"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Diagnostic / symptôme</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Bruit, vibration, voyant, kilométrage, etc."
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Urgence</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className={inputCls}
            >
              {URGENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Source souhaitée</label>
            <select
              value={preferredSource}
              onChange={(e) => setPreferredSource(e.target.value)}
              className={inputCls}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || !vehicleId}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? 'Envoi…' : 'Envoyer au manager'}
          </button>
          <Link href="/enterprise/requests" className="text-sm font-medium text-ink-2 hover:underline">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
