'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import { enrichmentFetch, ENRICHMENT_STATUS_LABELS } from '@/lib/enrichment-api'
import type { Enrichment, EnrichmentList } from '@/lib/enrichment-api'

type Tab = 'mine' | 'moderation' | 'inspections'

const TABS: Array<{ key: Tab; label: string; query: string }> = [
  { key: 'mine', label: 'Mes fiches', query: '' },
  { key: 'moderation', label: 'Modération', query: '?file=moderation' },
  { key: 'inspections', label: 'Contrôles qualité', query: '?file=inspections' },
]

export default function FichesListPage() {
  const [tab, setTab] = useState<Tab>('mine')
  // Le tab de la donnée affichée sert d'indicateur de chargement : tant qu'il
  // diffère du tab sélectionné, la liste est en cours de (re)chargement.
  const [loaded, setLoaded] = useState<{ tab: Tab; list: EnrichmentList } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const query = TABS.find((t) => t.key === tab)?.query ?? ''
    enrichmentFetch<EnrichmentList>(`/${query}`).then((r) => {
      if (cancelled) return
      if (r.ok) setLoaded({ tab, list: r.data })
      else setError(r.message)
    })
    return () => {
      cancelled = true
    }
  }, [tab])

  const loading = loaded?.tab !== tab && !error
  const list = loaded?.tab === tab ? loaded.list : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Fiches terrain</h1>
          <p className="mt-1 text-sm text-muted">Fiches créées par photo, modération et contrôles.</p>
        </div>
        <Link
          href="/liaison/fiches/new"
          className="shrink-0 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          style={{ minHeight: 44 }}
        >
          + Nouvelle fiche
        </Link>
      </header>

      <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-md border border-border bg-card text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 font-medium transition-colors ${
              tab === t.key ? 'bg-ink-2 text-white' : 'text-ink hover:bg-surface'
            }`}
            style={{ minHeight: 44 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}
      {loading && (
        <div className="grid gap-2">
          <div className="h-16 animate-pulse rounded-md bg-card" />
          <div className="h-16 animate-pulse rounded-md bg-card" />
        </div>
      )}

      {!loading && list && list.items.length === 0 && (
        <p className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted">
          {tab === 'mine'
            ? 'Aucune fiche pour l\'instant. Photographiez une pièce pour commencer.'
            : tab === 'moderation'
              ? 'Aucune fiche vendeur en attente de modération.'
              : 'Aucun contrôle qualité à programmer.'}
        </p>
      )}

      {!loading && list && list.items.length > 0 && (
        <ul className="grid gap-2">
          {list.items.map((fiche) => (
            <li key={fiche.id}>
              <Link
                href={`/liaison/fiches/${fiche.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-surface"
              >
                <Thumb fiche={fiche} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{titleOf(fiche)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {fiche.fournisseurVisite ?? subtitleOf(fiche)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Chip
                    variant={
                      fiche.statut === 'VALIDE'
                        ? 'status-ok'
                        : fiche.statut === 'BROUILLON'
                          ? 'plain'
                          : 'status-warn'
                    }
                  >
                    {ENRICHMENT_STATUS_LABELS[fiche.statut] ?? fiche.statut}
                  </Chip>
                  {fiche.prix != null && (
                    <span className="font-mono text-sm tabular text-ink">
                      {fiche.prix.toLocaleString('fr-FR')} F
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function titleOf(fiche: Enrichment): string {
  const idf = fiche.identification
  const cls = fiche.classification
  const parts = [
    cls?.sous_categorie ?? cls?.categorie,
    idf?.marque_fabricant?.valeur,
    idf?.reference_fabricant?.valeur,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Fiche en cours d\'identification'
}

function subtitleOf(fiche: Enrichment): string {
  return new Date(fiche.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Thumb({ fiche }: { fiche: Enrichment }) {
  const src = fiche.photosVariants?.[0]?.urlThumb ?? fiche.photos[0]
  if (!src) {
    return <div className="h-14 w-14 shrink-0 rounded-md border border-border bg-surface" />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" />
}
