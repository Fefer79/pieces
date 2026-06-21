'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface Detail {
  enterprise: {
    id: string; name: string; commune: string | null; address: string | null; rccm: string | null
    members: { id: string; role: string; joinedAt: string | null; user: { id: string; name: string | null; phone: string | null; email: string | null } }[]
    vehicles: { id: string; brand: string; model: string; year: number; plate: string | null; mileage: number | null }[]
  }
  orders: { id: string; status: string; totalAmount: number | null; createdAt: string }[]
}

export default function AdminEnterpriseDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<Detail>(`/admin/enterprises/${id}/detail`).then(setData).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const e = data.enterprise
  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/enterprises" className="mb-3 inline-block text-sm text-ink-2 hover:underline">← Entreprises</Link>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">{e.name}</h1>
        <Link
          href={`/admin/enterprises/${e.id}/subscription`}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          Gérer l&apos;abonnement
        </Link>
      </div>
      <div className="mb-4 text-sm text-muted">{e.commune ?? ''} · RCCM : {e.rccm ?? '—'}</div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Membres ({e.members.length})</div>
          <Table>
            <Tbody>
              {e.members.map((m) => (
                <Tr key={m.id}>
                  <Td>{m.user.name ?? '—'}</Td>
                  <Td className="text-xs">{m.user.phone ?? m.user.email ?? '—'}</Td>
                  <Td className="text-xs">{m.role}</Td>
                </Tr>
              ))}
              {e.members.length === 0 && <Tr hover={false}><Td colSpan={3} align="center" className="py-6 text-muted">Aucun membre.</Td></Tr>}
            </Tbody>
          </Table>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Parc auto ({e.vehicles.length})</div>
          <Table>
            <Tbody>
              {e.vehicles.map((v) => (
                <Tr key={v.id}>
                  <Td>{v.brand} {v.model} ({v.year})</Td>
                  <Td className="text-xs font-mono">{v.plate ?? '—'}</Td>
                  <Td num className="text-xs">{v.mileage ? `${v.mileage.toLocaleString('fr-FR')} km` : '—'}</Td>
                </Tr>
              ))}
              {e.vehicles.length === 0 && <Tr hover={false}><Td colSpan={3} align="center" className="py-6 text-muted">Aucun véhicule.</Td></Tr>}
            </Tbody>
          </Table>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Commandes ({data.orders.length})</div>
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Date</Th>
              <Th>Statut</Th>
              <Th align="right">Total</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.orders.map((o) => (
              <Tr key={o.id}>
                <Td className="text-xs">{o.createdAt.slice(0, 10)}</Td>
                <Td className="text-xs">{o.status}</Td>
                <Td num>{fmtFcfa(o.totalAmount)}</Td>
              </Tr>
            ))}
            {data.orders.length === 0 && <Tr hover={false}><Td colSpan={3} align="center" className="py-6 text-muted">Aucune commande.</Td></Tr>}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}
