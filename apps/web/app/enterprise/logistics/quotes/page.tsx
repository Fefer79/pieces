/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
} from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'
import {
  LOGISTIQUE_SLUGS_VALUES,
  STATUS_LABELS,
  STATUS_CHIP,
  CERTAINTY_CHIP,
  type FleetQuoteRow,
} from './_shared'

export default function FleetLogisticsQuotesPage() {
  const [items, setItems] = useState<FleetQuoteRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)

  useEffect(() => {
    setEnterpriseId(getActiveEnterpriseId())
  }, [])

  useEffect(() => {
    if (!enterpriseId) return
    let cancelled = false
    setLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    enterpriseFetch<{ items: FleetQuoteRow[]; total: number }>(
      `/${enterpriseId}/logistics/quote-requests${qs}`,
    ).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setItems(res.data.items)
      setTotal(res.data.total)
    })
    return () => {
      cancelled = true
    }
  }, [enterpriseId, statusFilter])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Mes cotations logistique</h1>
          <p className="mt-1 text-sm text-muted">
            Demandes d&apos;import et leur suivi. La matrice d&apos;arbitrage est recalculée par
            l&apos;équipe avant chaque devis confirmé.
          </p>
        </div>
        <Link
          href="/enterprise/logistics/quotes/new"
          className="rounded-md bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Nouvelle cotation
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Statut
        </span>
        {(['', ...Object.keys(STATUS_LABELS)] as const).map((s) => (
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
            {s ? STATUS_LABELS[s as keyof typeof STATUS_LABELS] : 'Tous'}
          </button>
        ))}
        <span className="ml-auto font-mono text-[12px] text-muted-2">{total} cotations</span>
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
              <Th>Véhicule</Th>
              <Th align="right">Coût estimé</Th>
              <Th>Identification</Th>
              <Th>Statut</Th>
              <Th align="right">Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={7} align="center" className="py-8 text-muted">Chargement…</Td>
              </Tr>
            )}
            {!loading && items.length === 0 && (
              <Tr>
                <Td colSpan={7} align="center" className="py-8 text-muted">
                  Aucune cotation pour le moment. Créez-en une depuis le bouton ci-dessus.
                </Td>
              </Tr>
            )}
            {items.map((q) => {
              const estimate = (q.estimateJson as { options?: { totalCost?: number }[] } | null)
              const best =
                estimate?.options?.find((o) => (o as { recommended?: boolean }).recommended)
                  ?.totalCost ??
                estimate?.options?.[0]?.totalCost ??
                null
              return (
                <Tr key={q.id}>
                  <Td>
                    <Link
                      href={`/enterprise/logistics/quotes/${q.id}`}
                      className="font-mono text-[12.5px] font-semibold text-ink-2 hover:underline"
                    >
                      {q.reference}
                    </Link>
                  </Td>
                  <Td className="text-ink">
                    {q.partName}
                    {q.quantity > 1 && (
                      <span className="ml-1.5 font-mono text-[11px] text-muted-2">
                        × {q.quantity}
                      </span>
                    )}
                  </Td>
                  <Td className="text-muted">
                    {[q.vehicleBrand, q.vehicleModel].filter(Boolean).join(' ') || '—'}
                    {q.energyType && (
                      <span className="ml-1.5 font-mono text-[10px] uppercase text-muted-2">
                        {q.energyType}
                      </span>
                    )}
                  </Td>
                  <Td num className="font-medium text-ink">
                    {best != null ? `${best.toLocaleString('fr-FR')} F` : '—'}
                  </Td>
                  <Td>
                    <Chip variant={CERTAINTY_CHIP[q.certaintyLevel]}>{q.certaintyLevel}</Chip>
                  </Td>
                  <Td>
                    <Chip variant={STATUS_CHIP[q.status]}>{STATUS_LABELS[q.status] ?? q.status}</Chip>
                  </Td>
                  <Td num className="text-muted">
                    {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

void LOGISTIQUE_SLUGS_VALUES
