'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId, type MaintenanceCenter } from '@/lib/enterprise-api'
import { ABIDJAN_COMMUNES } from 'shared/constants/communes'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const DAY_LABEL: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
}

export default function EnterpriseCentersPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [centers, setCenters] = useState<MaintenanceCenter[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // form state
  const [name, setName] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [deliveryDay, setDeliveryDay] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const res = await enterpriseFetch<MaintenanceCenter[]>(`/${enterpriseId}/centers`)
    if (!res.ok) { setError(res.message); return }
    setCenters(res.data)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [enterpriseId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId || name.trim().length < 2) return
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = { name }
    if (commune) payload.commune = commune
    if (address) payload.address = address
    if (contactName) payload.contactName = contactName
    if (contactPhone) payload.contactPhone = contactPhone
    if (deliveryDay !== '') payload.deliveryDayOfWeek = Number(deliveryDay)
    const res = await enterpriseFetch(`/${enterpriseId}/centers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    setName(''); setCommune(''); setAddress(''); setContactName(''); setContactPhone(''); setDeliveryDay('')
    setShowForm(false)
    load()
  }

  async function handleDelete(centerId: string) {
    if (!enterpriseId) return
    if (!confirm("Supprimer ce centre ? Les véhicules attribués seront détachés.")) return
    const res = await enterpriseFetch(`/${enterpriseId}/centers/${centerId}`, { method: 'DELETE' })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  async function handleToggleActive(c: MaintenanceCenter) {
    if (!enterpriseId) return
    const res = await enterpriseFetch(`/${enterpriseId}/centers/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !c.active }),
    })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Centres de maintenance</h1>
          <p className="mt-1 text-sm text-muted">
            Ateliers où les pièces sont livrées. Un véhicule peut être rattaché à un centre.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
        >
          {showForm ? 'Annuler' : '+ Ajouter un centre'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-md border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg text-ink">Nouveau centre</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom *">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="centers-input"
                placeholder="Ex. Atelier Yopougon"
              />
            </Field>
            <Field label="Commune">
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="centers-input"
              >
                <option value="">— Aucune —</option>
                {ABIDJAN_COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Adresse">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="centers-input"
                placeholder="Quartier, rue, repère…"
              />
            </Field>
            <Field label="Jour de livraison hebdo">
              <select
                value={deliveryDay}
                onChange={(e) => setDeliveryDay(e.target.value)}
                className="centers-input"
              >
                <option value="">— Pas de jour fixe —</option>
                {Object.entries(DAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Contact">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="centers-input"
                placeholder="Nom du chef d'atelier"
              />
            </Field>
            <Field label="Téléphone contact">
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="centers-input"
                placeholder="+225XXXXXXXXXX"
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-ink-2 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
            >
              {submitting ? 'Création…' : 'Créer'}
            </button>
          </div>
          <style jsx>{`
            :global(.centers-input) {
              width: 100%;
              padding: 0.6rem 0.75rem;
              border-radius: 6px;
              border: 1px solid var(--border, #e5e5e5);
              background: var(--card, #fff);
              color: var(--ink, #1a1a1a);
              font-size: 14px;
              min-height: 40px;
            }
          `}</style>
        </form>
      )}

      {centers.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong bg-card p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucun centre déclaré</p>
          <p className="mt-1 text-xs text-muted">
            Ajoutez vos ateliers pour planifier des livraisons consolidées.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Nom</Th>
                <Th>Commune</Th>
                <Th>Livraison</Th>
                <Th align="right">Véhicules</Th>
                <Th>Statut</Th>
                <Th align="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {centers.map((c) => (
                <Tr key={c.id}>
                  <Td className="text-ink">
                    {c.name}
                    {c.contactName && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted">{c.contactName}{c.contactPhone ? ` · ${c.contactPhone}` : ''}</p>
                    )}
                  </Td>
                  <Td className="text-muted">{c.commune ?? '—'}</Td>
                  <Td className="text-muted">
                    {c.deliveryDayOfWeek != null ? DAY_LABEL[c.deliveryDayOfWeek] : '—'}
                  </Td>
                  <Td num className="text-ink">{c.vehiclesCount}</Td>
                  <Td>
                    {c.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">Actif</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Inactif</span>
                    )}
                  </Td>
                  <Td align="right">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="mr-1 rounded-sm border border-border px-2 py-1 text-[11px] text-ink hover:bg-surface"
                    >
                      {c.active ? 'Désactiver' : 'Réactiver'}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-sm border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      <div className="mt-6 text-sm">
        <Link href="/enterprise/dashboard" className="text-muted hover:underline">← Tableau de bord</Link>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
