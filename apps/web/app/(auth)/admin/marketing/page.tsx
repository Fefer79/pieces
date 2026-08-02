'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  marketingFetch,
  type CampaignList,
  type CampaignStatus,
  type MarketingOverview,
} from '@/lib/marketing-api'
import {
  AUDIENCE_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VARIANTS,
  formatDate,
} from '@/lib/marketing-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const STATUT_FILTRES: { value: CampaignStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'BROUILLON', label: CAMPAIGN_STATUS_LABELS.BROUILLON },
  { value: 'PLANIFIEE', label: CAMPAIGN_STATUS_LABELS.PLANIFIEE },
  { value: 'EN_COURS', label: CAMPAIGN_STATUS_LABELS.EN_COURS },
  { value: 'TERMINEE', label: CAMPAIGN_STATUS_LABELS.TERMINEE },
  { value: 'ANNULEE', label: CAMPAIGN_STATUS_LABELS.ANNULEE },
]

const LIMIT = 20

export default function MarketingCampaignsPage() {
  const [overview, setOverview] = useState<MarketingOverview | null>(null)
  const [list, setList] = useState<CampaignList | null>(null)
  const [statut, setStatut] = useState<CampaignStatus | ''>('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = useCallback(() => {
    marketingFetch<MarketingOverview>('/overview').then((res) => {
      if (res.ok) setOverview(res.data)
    })
  }, [])

  const loadCampaigns = useCallback(() => {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    params.set('limit', String(LIMIT))
    marketingFetch<CampaignList>(`/campaigns?${params.toString()}`).then((res) => {
      if (res.ok) {
        setList(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [statut, page])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.limit)) : 1

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Campagnes" value={overview?.total ?? '…'} />
        <StatCard label="En cours" value={overview?.parStatut.EN_COURS ?? '…'} />
        <StatCard label="Planifiées" value={overview?.parStatut.PLANIFIEE ?? '…'} />
        <StatCard label="Messages envoyés (30 j)" value={overview?.envoyes30j ?? '…'} />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUT_FILTRES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStatut(f.value)
              setPage(1)
            }}
            className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
              statut === f.value
                ? 'border-ink bg-ink font-semibold text-white'
                : 'border-border bg-card text-muted hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!list ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Nom</Th>
                <Th>Audience</Th>
                <Th>Statut</Th>
                <Th align="right">Cibles</Th>
                <Th align="right">Envoyés</Th>
                <Th>Créée le</Th>
              </Tr>
            </Thead>
            <Tbody>
              {list.campaigns.length === 0 ? (
                <Tr hover={false}>
                  <Td colSpan={6} className="py-8 text-center text-sm text-muted">
                    Aucune campagne pour ce filtre.
                  </Td>
                </Tr>
              ) : (
                list.campaigns.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        href={`/admin/marketing/${c.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {c.nom}
                      </Link>
                    </Td>
                    <Td className="text-sm text-muted">{AUDIENCE_TYPE_LABELS[c.audienceType]}</Td>
                    <Td>
                      <Chip variant={CAMPAIGN_STATUS_VARIANTS[c.statut]}>
                        {CAMPAIGN_STATUS_LABELS[c.statut]}
                      </Chip>
                    </Td>
                    <Td num>{c.totalCibles}</Td>
                    <Td num>{c.envoyes}</Td>
                    <Td className="text-sm text-muted">{formatDate(c.createdAt)}</Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      )}

      {list && list.total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <span>
            {list.total} campagne{list.total > 1 ? 's' : ''} · page {list.page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-sm border border-border bg-card px-2.5 py-1 disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-sm border border-border bg-card px-2.5 py-1 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
