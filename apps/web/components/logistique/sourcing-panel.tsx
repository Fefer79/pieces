'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  sourcingFetch,
  SEARCH_STATUS_LABEL,
  type SourcingSearchRow,
  type SourcingSearchStatus,
} from '@/lib/sourcing-api'
import { Chip, type ChipVariant } from '@/components/ui/chip'

const STATUS_CHIP: Record<SourcingSearchStatus, ChipVariant> = {
  PENDING: 'plain',
  RUNNING: 'status-warn',
  DONE: 'status-ok',
  FAILED: 'status-err',
}

/**
 * Encart « Sourcing » d'une demande de cotation : c'est le lien besoin →
 * recherche d'offres. Une recherche tourne 30–90 s en tâche de fond ; le
 * panneau se rafraîchit tant qu'elle n'est pas terminée.
 */
export function SourcingPanel({ quoteRequestId }: { quoteRequestId: string }) {
  const [searches, setSearches] = useState<SourcingSearchRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return sourcingFetch<{ items: SourcingSearchRow[] }>(
      `/searches?quoteRequestId=${encodeURIComponent(quoteRequestId)}`,
    ).then((res) => {
      if (!res.ok) {
        setError(res.message)
        return
      }
      setError(null)
      setSearches(res.data.items)
    })
  }, [quoteRequestId])

  useEffect(() => {
    load()
  }, [load])

  // Une recherche en cours finit sans notification : on repasse toutes les 15 s
  // tant qu'il en reste une, puis on arrête.
  const pending = searches?.some((s) => s.status === 'PENDING' || s.status === 'RUNNING') ?? false
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => load(), 15_000)
    return () => clearInterval(timer)
  }, [pending, load])

  const launch = useCallback(async () => {
    setBusy(true)
    const res = await sourcingFetch(`/searches`, {
      method: 'POST',
      body: JSON.stringify({ quoteRequestId }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    await load()
  }, [quoteRequestId, load])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-muted">
          Lance une recherche d&apos;offres réelles sur les sites de vente internationaux. Les prix
          rapportés sont indicatifs jusqu&apos;à confirmation auprès du vendeur.
        </p>
        <button
          onClick={() => void launch()}
          disabled={busy || pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? 'Recherche en cours…' : busy ? 'Lancement…' : 'Rechercher des offres'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-error-fg">{error}</p>}

      {searches && searches.length > 0 && (
        <ul className="mt-4 space-y-2">
          {searches.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2"
            >
              <Link
                href={`/admin/sourcing/${s.id}`}
                className="flex-1 text-sm font-semibold text-ink hover:underline"
              >
                {s.partName}
              </Link>
              <span className="text-[12px] text-muted">
                {s._count.offers} offre{s._count.offers > 1 ? 's' : ''}
              </span>
              <Chip variant={STATUS_CHIP[s.status]}>{SEARCH_STATUS_LABEL[s.status]}</Chip>
            </li>
          ))}
        </ul>
      )}

      {searches && searches.length === 0 && (
        <p className="mt-3 text-sm text-muted-2">Aucune recherche lancée pour cette demande.</p>
      )}
    </div>
  )
}
