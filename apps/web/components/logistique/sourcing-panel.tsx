'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  sourcingFetch,
  SEARCH_STATUS_LABEL,
  ORIGIN_LABEL,
  type SourcingSearchRow,
  type SourcingSearchStatus,
  type SourcingSearchOrigin,
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
 * offres.
 *
 * Le chemin standard est le dossier de saisie manuelle — l'opérateur relève
 * lui-même les annonces et les saisit. La recherche automatique est proposée en
 * second : elle coûte un appel modèle et n'est pas activée partout.
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

  // Une recherche automatique finit sans notification : on repasse toutes les
  // 15 s tant qu'il en reste une en cours, puis on arrête.
  const pending =
    searches?.some(
      (s) => s.origin === 'AGENT' && (s.status === 'PENDING' || s.status === 'RUNNING'),
    ) ?? false
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => load(), 15_000)
    return () => clearInterval(timer)
  }, [pending, load])

  const create = useCallback(
    async (origin: SourcingSearchOrigin) => {
      setBusy(true)
      const res = await sourcingFetch<{ id: string }>(`/searches`, {
        method: 'POST',
        body: JSON.stringify({ quoteRequestId, origin }),
      })
      setBusy(false)
      if (!res.ok) {
        setError(res.message)
        return
      }
      await load()
      if (origin === 'MANUAL') {
        // Le dossier manuel n'a d'intérêt qu'ouvert : on y emmène l'opérateur.
        window.location.href = `/admin/sourcing/${res.data.id}`
      }
    },
    [quoteRequestId, load],
  )

  return (
    <div>
      <p className="text-sm text-muted">
        Ouvrez un dossier pour comparer les offres au coût réel rendu Abidjan, immobilisation du
        véhicule comprise. Vous y saisissez les annonces que vous relevez ; tant qu&apos;un prix
        n&apos;a pas été confirmé auprès du vendeur, il reste indicatif.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void create('MANUAL')}
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Création…' : 'Ouvrir un dossier de sourcing'}
        </button>
        <button
          onClick={() => void create('AGENT')}
          disabled={busy || pending}
          title="Recherche automatique sur les sites de vente internationaux — coûteuse, à utiliser quand la saisie manuelle ne donne rien"
          className="rounded-sm border border-border px-3 py-2 text-[13px] text-ink hover:bg-surface disabled:opacity-40"
        >
          {pending ? 'Recherche automatique en cours…' : 'Lancer une recherche automatique'}
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
              <Chip variant={s.origin === 'MANUAL' ? 'oem' : 'plain'}>{ORIGIN_LABEL[s.origin]}</Chip>
              {s.origin === 'AGENT' && (
                <Chip variant={STATUS_CHIP[s.status]}>{SEARCH_STATUS_LABEL[s.status]}</Chip>
              )}
            </li>
          ))}
        </ul>
      )}

      {searches && searches.length === 0 && (
        <p className="mt-3 text-sm text-muted-2">Aucun dossier ouvert pour cette demande.</p>
      )}
    </div>
  )
}
