/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'
import type { ChipVariant } from '@/components/ui/chip'

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUOTING: 'En cotation',
  QUOTED: 'Devis envoyé',
  WON: 'Accepté',
  LOST: 'Perdu',
  SPAM: 'Spam',
}

const STATUS_CHIP: Record<string, ChipVariant> = {
  NEW: 'oem',
  CONTACTED: 'oem',
  QUOTING: 'status-warn',
  QUOTED: 'status-ok',
  WON: 'status-ok',
  LOST: 'plain',
  SPAM: 'plain',
}

const CERTAINTY_CHIP: Record<string, ChipVariant> = {
  LOW: 'status-warn',
  MEDIUM: 'oem',
  HIGH: 'status-ok',
}

interface Row {
  id: string
  reference: string
  status: keyof typeof STATUS_LABEL
  contactName: string
  phone: string
  partName: string
  vehicleBrand: string | null
  vehicleModel: string | null
  vin: string | null
  certaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  photos: { kind: 'PART' | 'REGISTRATION_CARD' | 'OTHER' }[]
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  byCertainty: Record<string, number>
}

const FUNNEL = ['NEW', 'CONTACTED', 'QUOTING', 'QUOTED', 'WON', 'LOST', 'SPAM'] as const

export default function AdminLogistiquePage() {
  const [items, setItems] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [certaintyFilter, setCertaintyFilter] = useState<string>('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams()
    if (statusFilter) qs.set('status', statusFilter)
    if (certaintyFilter) qs.set('certaintyLevel', certaintyFilter)
    if (q) qs.set('q', q)
    qs.set('pageSize', '50')
    const [listRes, statsRes] = await Promise.all([
      adminFetch<{ items: Row[]; total: number }>(`/admin/logistics/quote-requests?${qs.toString()}`),
      adminFetch<Stats>('/admin/logistics/quote-requests/stats'),
    ])
    setLoading(false)
    if ('data' in listRes && listRes.data) {
      const data = listRes.data as unknown as { items: Row[]; total: number }
      setItems(data.items)
      setTotal(data.total)
    } else {
      setError(String((listRes as { message?: string }).message ?? 'Erreur'))
    }
    if ('data' in statsRes && statsRes.data) setStats(statsRes.data as unknown as Stats)
  }, [statusFilter, certaintyFilter, q])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Administration
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Cotations logistique</h1>
          <p className="mt-1 text-sm text-muted">
            Demandes d&apos;import captées par logistique.pieces.ci et l&apos;espace Flotte. Le lead est
            acquis dès la soumission du formulaire, photos comprises.
          </p>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={stats.total} />
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map((k) => (
            <Stat
              key={k}
              label={`Identification ${k.toLowerCase()}`}
              value={stats.byCertainty[k] ?? 0}
            />
          ))}
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Statut
        </span>
        {(['', ...FUNNEL] as const).map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
              statusFilter === s
                ? 'bg-ink text-white'
                : 'border border-border-strong bg-card text-muted hover:text-ink'
            }`}
          >
            {s ? STATUS_LABEL[s] ?? s : 'Tous'}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Identification
        </span>
        {(['', 'LOW', 'MEDIUM', 'HIGH'] as const).map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => setCertaintyFilter(c)}
            className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
              certaintyFilter === c
                ? 'bg-ink text-white'
                : 'border border-border-strong bg-card text-muted hover:text-ink'
            }`}
          >
            {c || 'Tous'}
          </button>
        ))}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Référence, pièce, téléphone, VIN…"
          className="ml-auto min-w-[200px] rounded-md border border-border-strong bg-card px-3 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Référence</Th>
              <Th>Pièce</Th>
              <Th>Contact</Th>
              <Th>Véhicule</Th>
              <Th>Preuves</Th>
              <Th>Identification</Th>
              <Th>Statut</Th>
              <Th align="right">Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={8} align="center" className="py-8 text-muted">Chargement…</Td>
              </Tr>
            )}
            {!loading && items.length === 0 && (
              <Tr>
                <Td colSpan={8} align="center" className="py-8 text-muted">Aucune cotation.</Td>
              </Tr>
            )}
            {items.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link
                    href={`/admin/logistique/${row.id}`}
                    className="font-mono text-[12.5px] font-semibold text-ink-2 hover:underline"
                  >
                    {row.reference}
                  </Link>
                </Td>
                <Td className="text-ink">{row.partName}</Td>
                <Td className="text-muted">
                  <div className="text-ink">{row.contactName}</div>
                  <div className="font-mono text-[11px]">{row.phone}</div>
                </Td>
                <Td className="text-muted">
                  {[row.vehicleBrand, row.vehicleModel].filter(Boolean).join(' ') || '—'}
                  {row.vin && (
                    <div className="font-mono text-[10.5px] text-muted-2">{row.vin}</div>
                  )}
                </Td>
                <Td>
                  <ProofBadges photos={row.photos} vin={row.vin} />
                </Td>
                <Td>
                  <Chip variant={CERTAINTY_CHIP[row.certaintyLevel]}>{row.certaintyLevel}</Chip>
                </Td>
                <Td>
                  <Chip variant={STATUS_CHIP[row.status] ?? 'plain'}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Chip>
                </Td>
                <Td num className="text-muted">
                  {new Date(row.createdAt).toLocaleDateString('fr-FR')}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {total > items.length && (
          <div className="border-t border-border px-5 py-2 text-xs text-muted-2">
            {items.length} sur {total} affichées — affinez les filtres.
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="tabular font-mono text-[24px] text-ink">{value}</p>
      <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
    </div>
  )
}

function ProofBadges({
  photos,
  vin,
}: {
  photos: Row['photos']
  vin: string | null
}) {
  const hasPart = photos.some((p) => p.kind === 'PART')
  const hasReg = photos.some((p) => p.kind === 'REGISTRATION_CARD')
  return (
    <div className="flex flex-wrap gap-1.5">
      {vin && (
        <span
          title={`VIN ${vin}`}
          className="rounded-full bg-ink-2 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-white"
        >
          VIN
        </span>
      )}
      {hasPart && (
        <span
          title="Photo de la pièce"
          className="rounded-full bg-success-bg px-2 py-0.5 font-mono text-[10.5px] font-semibold text-success-fg"
        >
          📷 Pièce
        </span>
      )}
      {hasReg && (
        <span
          title="Photo de la carte grise"
          className="rounded-full bg-success-bg px-2 py-0.5 font-mono text-[10.5px] font-semibold text-success-fg"
        >
          📷 Carte
        </span>
      )}
    </div>
  )
}
