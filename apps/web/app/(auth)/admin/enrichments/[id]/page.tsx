'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import type { ChipVariant } from '@/components/ui/chip'
import { enrichmentFetch } from '@/lib/enrichment-api'
import type { EnrichmentAdmin } from '@/lib/enrichment-api'

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_MODERATION: 'En modération',
  A_VERIFIER: 'Inspection demandée',
  VALIDE: 'Validée',
  BLOQUE: 'Bloquée',
}

function statutVariant(statut: string): ChipVariant {
  if (statut === 'VALIDE') return 'status-ok'
  if (statut === 'BLOQUE') return 'status-err'
  if (statut === 'BROUILLON') return 'plain'
  return 'status-warn'
}

export default function AdminEnrichmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [fiche, setFiche] = useState<EnrichmentAdmin | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [noteQualite, setNoteQualite] = useState('')
  const [description, setDescription] = useState('')
  const [commentaire, setCommentaire] = useState('')

  const load = useCallback(() => {
    return enrichmentFetch<EnrichmentAdmin>(`/${id}`).then((r) => {
      if (r.ok) {
        setFiche(r.data)
        setNoteQualite(
          r.data.noteQualite != null
            ? String(r.data.noteQualite)
            : r.data.authenticite
              ? String(r.data.authenticite.score)
              : '',
        )
        setDescription(r.data.descriptionIndependante ?? '')
      } else setError(r.message)
    })
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function act(fn: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    const r = await fn()
    setBusy(false)
    if (!r.ok) {
      setError(r.message ?? 'Erreur')
      return
    }
    setNotice(done)
    await load()
  }

  const arbitrate = (decision: 'APPROUVER' | 'INSPECTION' | 'BLOQUER', publierLivrables = false) =>
    act(async () => {
      const r = await enrichmentFetch(`/${id}/arbitrate`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          ...(decision === 'APPROUVER' && noteQualite ? { noteQualite: parseInt(noteQualite, 10) } : {}),
          ...(decision === 'APPROUVER' && description ? { descriptionIndependante: description } : {}),
          ...(decision === 'APPROUVER' ? { publierLivrables } : {}),
          ...(commentaire ? { commentaire } : {}),
        }),
      })
      return r.ok ? { ok: true } : { ok: false, message: r.message }
    }, decision === 'APPROUVER' ? 'Fiche validée.' : decision === 'INSPECTION' ? 'Inspection demandée au Liaison.' : 'Fiche bloquée.')

  const generate = () =>
    act(async () => {
      const r = await enrichmentFetch<EnrichmentAdmin>(`/${id}/deliverables`, { method: 'POST' })
      return r.ok ? { ok: true } : { ok: false, message: r.message }
    }, 'Livrables générés — relisez avant publication.')

  if (error && !fiche) {
    return <div className="p-6"><p className="rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p></div>
  }
  if (!fiche) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const auth = fiche.authenticite
  const idf = fiche.identification

  return (
    <div className="max-w-4xl px-6 py-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            <Link href="/admin/enrichments" className="hover:underline">Fiches terrain</Link> / {fiche.id.slice(0, 8)}
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink">
            {[fiche.classification?.sous_categorie ?? fiche.classification?.categorie, idf?.marque_fabricant?.valeur, idf?.reference_fabricant?.valeur]
              .filter(Boolean)
              .join(' · ') || 'Fiche non identifiée'}
          </h1>
        </div>
        <Chip variant={statutVariant(fiche.statutBrut)}>{STATUT_LABELS[fiche.statutBrut]}</Chip>
      </header>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}
      {notice && <p className="mb-4 rounded-md bg-success-bg p-3 text-sm text-success-fg">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Photos + identification */}
        <section className="rounded-md border border-border bg-card p-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Identification
          </span>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {(fiche.photosVariants ?? []).map((v, i) => (
              <a key={i} href={v.urlOriginal ?? undefined} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.urlSmall ?? v.urlOriginal ?? ''}
                  alt={`Photo ${i + 1}`}
                  className="h-24 w-32 shrink-0 rounded-md border border-border object-cover"
                />
              </a>
            ))}
          </div>
          <dl className="mt-3 grid gap-1.5 text-sm">
            <Row label="Marque" value={idf?.marque_fabricant?.valeur} conf={idf?.marque_fabricant?.confiance} />
            <Row label="Référence" value={idf?.reference_fabricant?.valeur} conf={idf?.reference_fabricant?.confiance} />
            {(idf?.references_oem ?? []).map((r, i) => (
              <Row key={i} label={`OEM ${r.constructeur}`} value={r.reference} conf={r.confiance} />
            ))}
            <Row label="EAN" value={idf?.ean?.valeur} conf={idf?.ean?.confiance} />
            <Row label="Origine" value={idf?.pays_origine?.valeur} conf={idf?.pays_origine?.confiance} />
            <Row
              label="Classification"
              value={
                fiche.classification
                  ? `${fiche.classification.categorie}${fiche.classification.sous_categorie ? ` / ${fiche.classification.sous_categorie}` : ''}`
                  : null
              }
              conf={fiche.classification?.confiance}
            />
            <Row
              label="Prix déclaré"
              value={fiche.prix != null ? `${fiche.prix.toLocaleString('fr-FR')} FCFA` : null}
              mono
            />
            <Row label="Vendeur" value={fiche.vendeurId} />
            <Row label="Origine fiche" value={fiche.origine === 'VENDEUR' ? 'Vendeur (self-service)' : 'Liaison (terrain)'} />
            <Row label="Tentatives" value={String(fiche.tentatives)} />
          </dl>
        </section>

        {/* Score d'authenticité — exclusif administrateur */}
        <section className="rounded-md border border-border bg-card p-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Authenticité (confidentiel — niveau admin)
          </span>
          {auth ? (
            <div className="mt-3">
              <p className="font-mono text-3xl tabular text-ink">
                {auth.score}
                <span className="text-base text-muted">/10</span>
              </p>
              <p className="mt-2 text-sm text-ink">{auth.justification}</p>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {auth.signaux_positifs.map((s, i) => (
                  <li key={`p${i}`} className="flex items-start gap-2 text-success-fg">
                    <span>＋</span>
                    <span>
                      {s.signal}
                      {s.photo ? <span className="text-muted"> (photo {s.photo})</span> : null}
                    </span>
                  </li>
                ))}
                {auth.signaux_negatifs.map((s, i) => (
                  <li key={`n${i}`} className="flex items-start gap-2 text-error-fg">
                    <span>−</span>
                    <span>
                      {s.signal}
                      {s.photo ? <span className="text-muted"> (photo {s.photo})</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {auth.score <= 4 && fiche.statutBrut !== 'A_VERIFIER' && (
                <p className="mt-3 rounded-md bg-warn-bg p-2.5 text-xs text-warn-fg">
                  Score ≤ 4 : inspection physique obligatoire avant tout badge.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Pas d&apos;évaluation (photos insuffisantes).</p>
          )}
        </section>

        {/* Fitments */}
        <section className="rounded-md border border-border bg-card p-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Compatibilités (passe 2)
          </span>
          {fiche.fitments == null ? (
            <p className="mt-3 text-sm text-muted">Recherche en cours ou non déclenchée.</p>
          ) : fiche.fitments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Compatibilités introuvables dans les sources.</p>
          ) : (
            <ul className="mt-3 grid gap-1.5 text-sm">
              {fiche.fitments.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="text-ink">
                    {f.marque} {f.modele}
                    {f.annees ? ` · ${f.annees}` : ''}
                    {f.motorisation ? ` · ${f.motorisation}` : ''}
                  </span>
                  <span className="flex items-center gap-2">
                    {f.sources[0] && (
                      <a href={f.sources[0]} target="_blank" rel="noreferrer" className="text-xs text-ink-2 underline">
                        source
                      </a>
                    )}
                    <span className={`font-mono text-xs tabular ${f.confiance >= 0.7 ? 'text-success-fg' : 'text-warn-fg'}`}>
                      {Math.round(f.confiance * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sourcing — exclusif administrateur */}
        <section className="rounded-md border border-border bg-card p-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Sourcing (confidentiel — niveau admin)
          </span>
          {fiche.sourcing ? (
            <div className="mt-3 grid gap-3 text-sm">
              <div>
                <p className="font-medium text-ink">Équivalences</p>
                {fiche.sourcing.cross_references.length === 0 && <p className="text-muted">Aucune.</p>}
                {fiche.sourcing.cross_references.map((c, i) => (
                  <p key={i} className="text-muted">
                    {c.marque} <span className="font-mono">{c.reference}</span> ({c.type}) ·{' '}
                    <a href={c.source} target="_blank" rel="noreferrer" className="text-ink-2 underline">source</a>
                  </p>
                ))}
              </div>
              <div>
                <p className="font-medium text-ink">Fournisseurs</p>
                {fiche.sourcing.fournisseurs.length === 0 && <p className="text-muted">Aucun.</p>}
                {fiche.sourcing.fournisseurs.map((f, i) => (
                  <p key={i} className="text-muted">
                    {f.nom} · {f.canal}
                    {f.ville ? ` · ${f.ville}` : ''}
                    {f.contact_public ? ` · ${f.contact_public}` : ''}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-medium text-ink">Contacts producteur</p>
                {fiche.sourcing.contacts_producteur.length === 0 && <p className="text-muted">Aucun.</p>}
                {fiche.sourcing.contacts_producteur.map((c, i) => (
                  <p key={i} className="text-muted">
                    {c.entite} ({c.role}){c.email ? ` · ${c.email}` : ''} ·{' '}
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-ink-2 underline">lien</a>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Enrichi par le batch nocturne après validation de la fiche.
            </p>
          )}
        </section>
      </div>

      {/* Livrables flotte */}
      <section className="mt-4 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Livrables flotte (note qualité + description indépendante)
          </span>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-md bg-card px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-border-strong transition-colors hover:bg-surface disabled:opacity-50"
          >
            Générer une proposition
          </button>
        </div>
        <div className="mt-3 grid gap-3">
          <label className="grid max-w-[160px] gap-1 text-sm">
            <span className="font-medium text-ink">Note qualité (1–10)</span>
            <input
              inputMode="numeric"
              value={noteQualite}
              onChange={(e) => setNoteQualite(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="rounded-sm border border-border-strong bg-card px-3 py-2 font-mono text-sm tabular text-ink"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Description indépendante (rédigée par Pièces)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
              placeholder="Générer une proposition, puis relire et corriger avant publication."
            />
          </label>
          {fiche.livrablesApprouvesAt && (
            <p className="text-xs text-success-fg">
              Livrables publiés aux clients flotte le{' '}
              {new Date(fiche.livrablesApprouvesAt).toLocaleDateString('fr-FR')}.
            </p>
          )}
        </div>
      </section>

      {/* Arbitrage */}
      {fiche.statutBrut !== 'VALIDE' && (
        <section className="mt-4 rounded-md border border-border bg-card p-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Arbitrage
          </span>
          <label className="mt-3 grid gap-1 text-sm">
            <span className="font-medium text-ink">Commentaire interne (journalisé)</span>
            <input
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
              placeholder="Ex. hologramme suspect photo 3"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => arbitrate('APPROUVER', true)}
              disabled={busy || !fiche.contentValidatedAt}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              title={!fiche.contentValidatedAt ? 'Validation de contenu (Liaison) requise' : undefined}
            >
              Approuver + publier livrables
            </button>
            <button
              type="button"
              onClick={() => arbitrate('APPROUVER', false)}
              disabled={busy || !fiche.contentValidatedAt}
              className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Approuver sans livrables
            </button>
            <button
              type="button"
              onClick={() => arbitrate('INSPECTION')}
              disabled={busy}
              className="rounded-md bg-card px-4 py-2.5 text-sm font-medium text-warn-fg ring-1 ring-border-strong transition-colors hover:bg-surface disabled:opacity-50"
            >
              Demander une inspection
            </button>
            <button
              type="button"
              onClick={() => arbitrate('BLOQUER')}
              disabled={busy}
              className="rounded-md bg-card px-4 py-2.5 text-sm font-medium text-error-fg ring-1 ring-border-strong transition-colors hover:bg-surface disabled:opacity-50"
            >
              Bloquer
            </button>
          </div>
          {!fiche.contentValidatedAt && (
            <p className="mt-2 text-xs text-muted">
              L&apos;approbation exige la validation de contenu par le Liaison au préalable.
            </p>
          )}
        </section>
      )}

      {fiche.partId && (
        <p className="mt-4 text-sm text-muted">
          Publiée au catalogue :{' '}
          <Link href={`/admin/parts?focus=${fiche.partId}`} className="text-ink-2 underline">
            voir la pièce
          </Link>
        </p>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  conf,
  mono,
}: {
  label: string
  value?: string | null
  conf?: number
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right text-ink ${mono ? 'font-mono tabular' : ''}`}>
        {value ?? <span className="text-muted-2">—</span>}
        {conf != null && value != null && (
          <span className="ml-1.5 font-mono text-xs tabular text-muted">{Math.round(conf * 100)}%</span>
        )}
      </dd>
    </div>
  )
}
