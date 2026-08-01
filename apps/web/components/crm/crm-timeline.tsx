'use client'

import { useCallback, useEffect, useState } from 'react'
import { crmFetch, type CrmSubject, type CrmTimeline, type CrmTimelineEntry } from '@/lib/crm-api'
import {
  formatRelativeDay,
  formatShortDate,
  interactionTypeVariant,
  INTERACTION_TYPE_LABELS,
  timelineKindLabel,
} from '@/lib/crm-utils'
import { Chip } from '@/components/ui/chip'

const PAGE_SIZE = 20

function TimelineRow({ entry }: { entry: CrmTimelineEntry }) {
  return (
    <li className="flex gap-3 border-b border-border py-2.5 last:border-0">
      <div className="w-24 shrink-0 pt-0.5 text-right">
        <div className="text-[11px] font-medium text-muted">{formatRelativeDay(entry.at)}</div>
        <div className="text-[10px] text-muted-2">{formatShortDate(entry.at)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {entry.kind === 'interaction' && entry.type ? (
            <Chip variant={interactionTypeVariant(entry.type)}>
              {INTERACTION_TYPE_LABELS[entry.type]}
            </Chip>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {timelineKindLabel(entry.kind)}
            </span>
          )}
          <span className="text-[13px] font-medium text-ink">{entry.titre}</span>
        </div>
        {entry.detail && <p className="mt-0.5 whitespace-pre-line text-xs text-muted">{entry.detail}</p>}
        {entry.auteur && <p className="mt-0.5 text-[11px] text-muted-2">par {entry.auteur}</p>}
      </div>
    </li>
  )
}

export function CrmTimeline({
  subject,
  subjectId,
  refreshKey = 0,
}: {
  subject: CrmSubject
  subjectId: string
  /** Incrémenté par le parent pour forcer un rechargement (nouvelle interaction, relance…). */
  refreshKey?: number
}) {
  const [entries, setEntries] = useState<CrmTimelineEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loadedKey, setLoadedKey] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loading = loadedKey !== refreshKey

  const load = useCallback(
    (offset: number, append: boolean) => {
      return crmFetch<CrmTimeline>(
        `/timeline/${subject}/${subjectId}?limit=${PAGE_SIZE}&offset=${offset}`,
      ).then((res) => {
        if (!res.ok) {
          setError(res.message)
          return
        }
        setTotal(res.data.total)
        setEntries((prev) => (append ? [...prev, ...res.data.entries] : res.data.entries))
        setError(null)
      })
    },
    [subject, subjectId],
  )

  useEffect(() => {
    let cancelled = false
    load(0, false).finally(() => {
      if (!cancelled) setLoadedKey(refreshKey)
    })
    return () => {
      cancelled = true
    }
  }, [load, refreshKey])

  async function loadMore() {
    setLoadingMore(true)
    await load(entries.length, true)
    setLoadingMore(false)
  }

  if (loading) return <div className="py-4 text-sm text-muted">Chargement…</div>
  if (error) {
    return (
      <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
        {error}
      </div>
    )
  }

  return (
    <div>
      {entries.length === 0 ? (
        <p className="py-4 text-sm text-muted">Aucun événement pour le moment.</p>
      ) : (
        <ul>
          {entries.map((e, i) => (
            <TimelineRow key={e.refId ?? `${e.kind}-${e.at}-${i}`} entry={e} />
          ))}
        </ul>
      )}
      {total > entries.length && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-2 rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-40"
        >
          {loadingMore ? 'Chargement…' : `Charger plus (${entries.length}/${total})`}
        </button>
      )}
    </div>
  )
}
