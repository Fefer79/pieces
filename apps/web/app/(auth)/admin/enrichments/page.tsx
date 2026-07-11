'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import type { ChipVariant } from '@/components/ui/chip'
import { enrichmentFetch } from '@/lib/enrichment-api'
import type { EnrichmentAdmin, EnrichmentList } from '@/lib/enrichment-api'

const STATUTS = ['', 'BROUILLON', 'EN_MODERATION', 'A_VERIFIER', 'VALIDE', 'BLOQUE'] as const

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_MODERATION: 'En modération',
  A_VERIFIER: 'Inspection',
  VALIDE: 'Validée',
  BLOQUE: 'Bloquée',
}

function statutVariant(statut: string): ChipVariant {
  if (statut === 'VALIDE') return 'status-ok'
  if (statut === 'BLOQUE') return 'status-err'
  if (statut === 'BROUILLON') return 'plain'
  return 'status-warn'
}

function scoreVariant(score: number): ChipVariant {
  if (score >= 6) return 'status-ok'
  if (score === 5) return 'plain'
  if (score >= 4) return 'status-warn'
  return 'status-err'
}

export default function AdminEnrichmentsPage() {
  const [statut, setStatut] = useState<string>('EN_MODERATION')
  // Filtre de la donnée affichée = indicateur de chargement (pas de setState
  // synchrone dans l'effet).
  const [loaded, setLoaded] = useState<{ statut: string; list: EnrichmentList<EnrichmentAdmin> } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const query = statut ? `?statut=${statut}` : ''
    enrichmentFetch<EnrichmentList<EnrichmentAdmin>>(`/${query}`).then((r) => {
      if (cancelled) return
      if (r.ok) setLoaded({ statut, list: r.data })
      else setError(r.message)
    })
    return () => {
      cancelled = true
    }
  }, [statut])

  const loading = loaded?.statut !== statut && !error
  const list = loaded?.statut === statut ? loaded.list : null

  return (
    <div className="px-6 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Fiches terrain</h1>
          <p className="mt-1 text-sm text-muted">
            Arbitrage d&apos;authenticité, livrables flotte et sourcing.
          </p>
        </div>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'Tous les statuts' : STATUT_LABELS[s]}
            </option>
          ))}
        </select>
      </header>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}
      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && list && (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                <th className="px-4 py-2.5">Pièce</th>
                <th className="px-4 py-2.5">Origine</th>
                <th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5">Statut</th>
                <th className="px-4 py-2.5 text-right">Prix</th>
                <th className="px-4 py-2.5">Créée le</th>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Aucune fiche pour ce filtre.
                  </td>
                </tr>
              )}
              {list.items.map((fiche) => (
                <tr key={fiche.id} className="border-t border-border transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/admin/enrichments/${fiche.id}`} className="font-medium text-ink-2 hover:underline">
                      {titleOf(fiche)}
                    </Link>
                    {fiche.tentatives > 1 && (
                      <span className="ml-2 font-mono text-[11px] text-error-fg">
                        ×{fiche.tentatives}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{fiche.origine === 'VENDEUR' ? 'Vendeur' : 'Liaison'}</td>
                  <td className="px-4 py-3">
                    {fiche.authenticite ? (
                      <Chip variant={scoreVariant(fiche.authenticite.score)}>
                        {fiche.authenticite.score}/10
                      </Chip>
                    ) : (
                      <span className="text-muted-2">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Chip variant={statutVariant(fiche.statutBrut)}>{STATUT_LABELS[fiche.statutBrut]}</Chip>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular whitespace-nowrap">
                    {fiche.prix != null ? `${fiche.prix.toLocaleString('fr-FR')} F` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {new Date(fiche.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function titleOf(fiche: EnrichmentAdmin): string {
  const idf = fiche.identification
  const cls = fiche.classification
  const parts = [
    cls?.sous_categorie ?? cls?.categorie,
    idf?.marque_fabricant?.valeur,
    idf?.reference_fabricant?.valeur,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Fiche non identifiée'
}
