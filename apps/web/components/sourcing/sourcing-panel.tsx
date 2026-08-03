'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  sourcingFetch,
  fmtFcfa,
  SEARCH_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  type Paginated,
  type SourcingSearchDetail,
  type SourcingSearchRow,
} from '@/lib/sourcing-api'
import { SEARCH_STATUS_CHIP } from '@/lib/sourcing-utils'
import { Chip, ConditionChip } from '@/components/ui/chip'

/**
 * Encart « Sourcing » d'une cotation logistique : c'est le lien besoin →
 * recherche d'offres. Une seule recherche peut tourner à la fois sur une
 * demande — le bouton se désactive tant que la précédente n'a pas fini.
 */
export function SourcingPanel({ quoteRequestId }: { quoteRequestId: string }) {
  const [searches, setSearches] = useState<SourcingSearchRow[]>([])
  const [detail, setDetail] = useState<SourcingSearchDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    sourcingFetch<Paginated<SourcingSearchRow>>(
      `/searches?quoteRequestId=${encodeURIComponent(quoteRequestId)}&pageSize=5`,
    ).then((res) => {
      if (!res.ok) return
      setSearches(res.data.items)
      const latest = res.data.items[0]
      if (latest) {
        sourcingFetch<SourcingSearchDetail>(`/searches/${latest.id}`).then((d) => {
          if (d.ok) setDetail(d.data)
        })
      }
    })
  }, [quoteRequestId])

  useEffect(() => {
    load()
  }, [load])

  async function launch() {
    setBusy(true)
    const res = await sourcingFetch(`/searches`, {
      method: 'POST',
      body: JSON.stringify({ quoteRequestId }),
    })
    setBusy(false)
    if (!res.ok) return setError(res.message)
    setError(null)
    load()
  }

  const running = searches.some((s) => s.status === 'PENDING' || s.status === 'RUNNING')
  const offers = detail?.offers ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || running}
          onClick={launch}
          className="rounded-sm bg-ink px-3 py-2 text-[13px] text-card disabled:opacity-40"
        >
          {running ? 'Recherche en cours…' : 'Rechercher des offres'}
        </button>
        {detail && (
          <>
            <Chip variant={SEARCH_STATUS_CHIP[detail.status]}>
              {SEARCH_STATUS_LABELS[detail.status]}
            </Chip>
            <Link
              href={`/admin/sourcing/${detail.id}`}
              className="text-[13px] underline underline-offset-2"
            >
              Ouvrir l’arbitrage
            </Link>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-error-fg/30 bg-error-bg/40 p-3 text-[13px] text-error-fg">
          {error}
        </div>
      )}

      {running && (
        <p className="text-[12.5px] text-muted">
          L’agent parcourt les sites de vente (30 à 90 s). Rechargez la page dans un instant.
        </p>
      )}

      {detail?.status === 'FAILED' && detail.error && (
        <p className="text-[12.5px] text-error-fg">{detail.error}</p>
      )}

      {offers.length > 0 ? (
        <ul className="space-y-2">
          {offers.slice(0, 5).map((o) => (
            <li key={o.id} className="rounded-sm border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13.5px] font-medium text-ink">
                  {o.url ? (
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {o.supplierName}
                    </a>
                  ) : (
                    o.supplierName
                  )}
                </span>
                <span className="font-mono tabular text-[13.5px] text-ink">
                  {fmtFcfa(o.priceFcfa)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {/* DESIGN.md : la condition est une chip colorée. */}
                {o.condition ? (
                  <ConditionChip condition={o.condition} />
                ) : o.conditionLabel ? (
                  <Chip variant="aftermarket">{o.conditionLabel}</Chip>
                ) : null}
                <Chip variant="plain">{OFFER_STATUS_LABELS[o.status]}</Chip>
                {o.priceFcfa != null && !o.priceConfirmed && (
                  <Chip variant="status-warn">à confirmer</Chip>
                )}
                {o.country && <span className="text-[11.5px] text-muted">{o.country}</span>}
                {o.leadTimeDays != null && (
                  <span className="text-[11.5px] text-muted">{o.leadTimeDays} j</span>
                )}
              </div>
            </li>
          ))}
          {offers.length > 5 && (
            <li className="text-[12.5px] text-muted">
              +{offers.length - 5} autres offres —{' '}
              <Link href={`/admin/sourcing/${detail?.id}`} className="underline underline-offset-2">
                tout voir
              </Link>
            </li>
          )}
        </ul>
      ) : (
        !running && (
          <p className="text-[13px] text-muted">
            Aucune offre pour l’instant. Lancez une recherche pour interroger les marketplaces
            internationales et les exportateurs.
          </p>
        )
      )}
    </div>
  )
}
