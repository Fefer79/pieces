/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { enterpriseFetch, getActiveEnterpriseId, type PartRequest } from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  REVIEWING: 'En relecture',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CONVERTED: 'Convertie',
  CANCELLED: 'Annulée',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  REVIEWING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const URGENCY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  NORMAL: 'Normal',
  HIGH: 'Urgent',
  CRITICAL: 'Critique',
}

const URGENCY_COLOR: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function EnterpriseRequestsPage() {
  const router = useRouter()
  const [enterpriseId] = useState<string | null>(getActiveEnterpriseId)
  const [requests, setRequests] = useState<PartRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('')

  useEffect(() => {
    if (!enterpriseId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (urgencyFilter) params.set('urgency', urgencyFilter)
    enterpriseFetch<PartRequest[]>(`/${enterpriseId}/part-requests?${params.toString()}`).then((res) => {
      setLoading(false)
      if (!res.ok) return
      setRequests(res.data)
    })
  }, [enterpriseId, statusFilter, urgencyFilter])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Demandes de pièces</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? 'Chargement…' : `${requests.length} demande${requests.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/enterprise/requests/new"
          className="shrink-0 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Nouvelle demande
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        >
          <option value="">Toutes les urgences</option>
          {Object.entries(URGENCY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Date</Th>
              <Th>Véhicule</Th>
              <Th>Pièce</Th>
              <Th>Urgence</Th>
              <Th>Statut</Th>
              <Th align="right">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={6} align="center" className="py-12 text-muted">
                  Chargement…
                </Td>
              </Tr>
            )}

            {!loading && requests.length === 0 && (
              <Tr>
                <Td colSpan={6} align="center" className="py-12 text-muted">
                  Aucune demande{statusFilter || urgencyFilter ? ' correspondant aux filtres' : ''}.
                </Td>
              </Tr>
            )}

            {!loading && requests.map((r) => (
              <Tr key={r.id}>
                <Td className="font-mono text-[11px] text-muted">
                  {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                </Td>
                <Td className="text-ink">
                  {r.vehicle.brand} {r.vehicle.model} <span className="text-muted">{r.vehicle.year}</span>
                  <p className="font-mono text-[10px] text-muted-2">{r.vehicle.plate ?? '—'}</p>
                </Td>
                <Td className="text-ink">
                  {r.partName}
                  <p className="text-[11px] text-muted-2">{r.category ?? '—'}</p>
                </Td>
                <Td>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${URGENCY_COLOR[r.urgency]}`}>
                    {URGENCY_LABEL[r.urgency]}
                  </span>
                </Td>
                <Td>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </Td>
                <Td align="right">
                  <button
                    onClick={() => router.push(`/enterprise/requests/${r.id}`)}
                    className="text-sm font-medium text-ink-2 hover:underline"
                  >
                    Voir
                  </button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}
