'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import { enrichmentFetch, ENRICHMENT_STATUS_LABELS } from '@/lib/enrichment-api'
import type { Enrichment, ChampConfiance } from '@/lib/enrichment-api'

/** Seuils de confiance (spec §7) : ≥ 0.9 pré-rempli, 0.7–0.9 surligné à
 * confirmer, < 0.7 champ vide avec la proposition de l'agent en suggestion. */
const CONF_HIGH = 0.9
const CONF_MID = 0.7

const FITMENTS_POLL_MS = 5000
const FITMENTS_POLL_MAX = 24 // ~2 min : au-delà, la passe 2 arrivera plus tard

function initialValue(champ: ChampConfiance | undefined): string {
  if (!champ?.valeur) return ''
  return champ.confiance >= CONF_MID ? champ.valeur : ''
}

function fieldClass(confiance: number | undefined): string {
  const base =
    'rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink placeholder:text-muted-2'
  if (confiance == null) return base
  if (confiance >= CONF_HIGH) return base
  if (confiance >= CONF_MID) return `${base} bg-warn-bg`
  return base
}

export default function FicheDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fiche, setFiche] = useState<Enrichment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pollCount = useRef(0)

  // Champs éditables (pré-remplissage selon la confiance)
  const [marque, setMarque] = useState('')
  const [reference, setReference] = useState('')
  const [refOem, setRefOem] = useState('')
  const [categorie, setCategorie] = useState('')
  const [sousCategorie, setSousCategorie] = useState('')
  const [prix, setPrix] = useState('')
  const [stock, setStock] = useState('')
  const [warrantyValue, setWarrantyValue] = useState('')
  const [warrantyUnit, setWarrantyUnit] = useState('DAY')
  const [fitmentChecks, setFitmentChecks] = useState<boolean[]>([])

  const hydrate = useCallback((data: Enrichment, keepEdits = false) => {
    setFiche(data)
    if (keepEdits) return
    const idf = data.identification
    setMarque(initialValue(idf?.marque_fabricant))
    setReference(initialValue(idf?.reference_fabricant))
    const oem = idf?.references_oem?.[0]
    setRefOem(oem && oem.confiance >= CONF_MID ? oem.reference : '')
    const cls = data.classification
    setCategorie(cls && cls.confiance >= CONF_MID && cls.categorie !== 'a_classer' ? cls.categorie : '')
    setSousCategorie(cls && cls.confiance >= CONF_MID ? (cls.sous_categorie ?? '') : '')
    setPrix(data.prix != null ? String(data.prix) : '')
    setStock(data.stockQuantite != null ? String(data.stockQuantite) : '')
    setWarrantyValue(data.warrantyValue != null ? String(data.warrantyValue) : '')
    setWarrantyUnit(data.warrantyUnit ?? 'DAY')
    setFitmentChecks((data.fitments ?? []).map((f) => f.confiance >= CONF_MID))
  }, [])

  useEffect(() => {
    enrichmentFetch<Enrichment>(`/${id}`).then((r) => {
      if (r.ok) hydrate(r.data)
      else setError(r.message)
    })
  }, [id, hydrate])

  // Les compatibilités (passe 2) arrivent en tâche de fond pendant la saisie
  // prix / stock : on rafraîchit la fiche jusqu'à leur arrivée.
  const waitingFitments = fiche != null && fiche.fitments == null && fiche.identification != null
  useEffect(() => {
    if (!waitingFitments) return
    const timer = setInterval(async () => {
      pollCount.current += 1
      if (pollCount.current > FITMENTS_POLL_MAX) {
        clearInterval(timer)
        return
      }
      const r = await enrichmentFetch<Enrichment>(`/${id}`)
      if (r.ok && r.data.fitments != null) {
        setFiche((prev) => (prev ? { ...prev, fitments: r.data.fitments } : r.data))
        setFitmentChecks((r.data.fitments ?? []).map((f) => f.confiance >= CONF_MID))
        clearInterval(timer)
      }
    }, FITMENTS_POLL_MS)
    return () => clearInterval(timer)
  }, [waitingFitments, id])

  const corrections = useMemo(() => {
    if (!fiche) return {}
    const idf = fiche.identification
    const cls = fiche.classification
    const out: Record<string, unknown> = {}
    if (marque && marque !== (idf?.marque_fabricant?.valeur ?? '')) out.marqueFabricant = marque
    if (reference && reference !== (idf?.reference_fabricant?.valeur ?? '')) out.referenceFabricant = reference
    if (refOem && refOem !== (idf?.references_oem?.[0]?.reference ?? '')) out.referenceOem = refOem
    if (categorie && categorie !== (cls?.categorie ?? '')) out.categorie = categorie
    if (sousCategorie && sousCategorie !== (cls?.sous_categorie ?? '')) out.sousCategorie = sousCategorie
    const fitments = fiche.fitments ?? []
    if (fitments.length > 0) {
      out.fitments = fitments.map((f, i) => ({
        marque: f.marque,
        modele: f.modele,
        annees: f.annees,
        motorisation: f.motorisation,
        confirme: fitmentChecks[i] ?? false,
      }))
    }
    return out
  }, [fiche, marque, reference, refOem, categorie, sousCategorie, fitmentChecks])

  async function save(): Promise<boolean> {
    setSaving(true)
    setError(null)
    const r = await enrichmentFetch<Enrichment>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(prix ? { prix: parseInt(prix, 10) } : {}),
        ...(stock ? { stockQuantite: parseInt(stock, 10) } : {}),
        ...(warrantyValue
          ? { warrantyValue: parseInt(warrantyValue, 10), warrantyUnit }
          : {}),
        ...(Object.keys(corrections).length > 0 ? { corrections } : {}),
      }),
    })
    setSaving(false)
    if (!r.ok) {
      setError(r.message)
      return false
    }
    hydrate(r.data, true)
    setNotice('Fiche enregistrée.')
    return true
  }

  async function validate() {
    const saved = await save()
    if (!saved) return
    const r = await enrichmentFetch<Enrichment>(`/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action: 'VALIDER_CONTENU' }),
    })
    if (!r.ok) {
      setError(r.message)
      return
    }
    hydrate(r.data, true)
    setNotice('Contenu validé — la fiche part en vérification.')
  }

  if (error && !fiche) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>
      </div>
    )
  }
  if (!fiche) {
    return <div className="mx-auto max-w-xl px-4 py-6 text-sm text-muted">Chargement…</div>
  }

  const idf = fiche.identification
  const editable = fiche.statut === 'BROUILLON' || fiche.statut === 'EN_MODERATION'
  const statusVariant =
    fiche.statut === 'VALIDE' ? 'status-ok' : fiche.statut === 'BROUILLON' ? 'plain' : 'status-warn'

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Fiche produit</h1>
          <p className="mt-1 text-sm text-muted">Relisez, corrigez, puis validez le contenu.</p>
        </div>
        <Chip variant={statusVariant}>{ENRICHMENT_STATUS_LABELS[fiche.statut] ?? fiche.statut}</Chip>
      </header>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}
      {notice && <p className="mb-4 rounded-md bg-success-bg p-3 text-sm text-success-fg">{notice}</p>}

      {fiche.photoFeedback && (
        <div className="mb-4 rounded-md bg-warn-bg p-4 text-sm text-warn-fg">
          <p className="font-semibold">Photos à reprendre</p>
          <p className="mt-1">{fiche.photoFeedback}</p>
          <Link
            href="/liaison/fiches/new"
            className="mt-3 inline-block rounded-md bg-ink-2 px-4 py-2 text-sm font-medium text-white"
          >
            Reprendre les photos
          </Link>
        </div>
      )}

      {fiche.photos.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {(fiche.photosVariants ?? []).map((v, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={v.urlSmall ?? v.urlOriginal ?? fiche.photos[i]}
              alt={`Photo ${i + 1}`}
              className="h-24 w-32 shrink-0 rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}

      {idf && (
        <section className="rounded-md border border-border bg-card p-4">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Identification
          </span>
          <div className="mt-3 grid gap-3">
            <Field
              label="Marque fabricant"
              value={marque}
              onChange={setMarque}
              champ={idf.marque_fabricant}
              disabled={!editable}
            />
            <Field
              label="Référence fabricant"
              value={reference}
              onChange={setReference}
              champ={idf.reference_fabricant}
              disabled={!editable}
            />
            <Field
              label={`Référence OEM${idf.references_oem[0] ? ` (${idf.references_oem[0].constructeur})` : ''}`}
              value={refOem}
              onChange={setRefOem}
              champ={
                idf.references_oem[0]
                  ? { valeur: idf.references_oem[0].reference, confiance: idf.references_oem[0].confiance }
                  : { valeur: null, confiance: 0 }
              }
              disabled={!editable}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Catégorie"
                value={categorie}
                onChange={setCategorie}
                champ={
                  fiche.classification
                    ? { valeur: fiche.classification.categorie, confiance: fiche.classification.confiance }
                    : undefined
                }
                disabled={!editable}
              />
              <Field
                label="Sous-catégorie"
                value={sousCategorie}
                onChange={setSousCategorie}
                champ={
                  fiche.classification
                    ? { valeur: fiche.classification.sous_categorie, confiance: fiche.classification.confiance }
                    : undefined
                }
                disabled={!editable}
              />
            </div>
            {Object.entries(idf.caracteristiques ?? {}).length > 0 && (
              <p className="text-xs text-muted">
                {Object.entries(idf.caracteristiques)
                  .map(([k, v]) => `${k} : ${v}`)
                  .join(' · ')}
                {idf.pays_origine.valeur ? ` · Origine : ${idf.pays_origine.valeur}` : ''}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-4 rounded-md border border-border bg-card p-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Compatibilités véhicules
        </span>
        {fiche.fitments == null ? (
          <div className="mt-3 grid gap-2">
            <div className="h-9 animate-pulse rounded-sm bg-surface" />
            <div className="h-9 animate-pulse rounded-sm bg-surface" />
            <p className="text-xs text-muted">
              Recherche en cours — continuez la saisie du prix, les compatibilités arrivent.
            </p>
          </div>
        ) : fiche.fitments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aucune compatibilité confirmée par les sources. À compléter manuellement si besoin.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {fiche.fitments.map((f, i) => (
              <li
                key={`${f.marque}-${f.modele}-${i}`}
                className="flex items-center justify-between gap-2 rounded-sm border border-border px-3 py-2"
              >
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={fitmentChecks[i] ?? false}
                    disabled={!editable}
                    onChange={(e) =>
                      setFitmentChecks((prev) => prev.map((c, j) => (j === i ? e.target.checked : c)))
                    }
                    className="h-5 w-5 accent-[#002366]"
                  />
                  <span>
                    {f.marque} {f.modele}
                    {f.annees ? ` · ${f.annees}` : ''}
                    {f.motorisation ? ` · ${f.motorisation}` : ''}
                  </span>
                </label>
                {f.confiance < CONF_MID && <Chip variant="status-warn">à confirmer</Chip>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-md border border-border bg-card p-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Prix &amp; stock (déclarés avec le vendeur)
        </span>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Prix (FCFA)</span>
            <input
              inputMode="numeric"
              value={prix}
              disabled={!editable}
              onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))}
              className="rounded-sm border border-border-strong bg-card px-3 py-2.5 font-mono text-sm tabular text-ink"
              placeholder="0"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Stock déclaré</span>
            <input
              inputMode="numeric"
              value={stock}
              disabled={!editable}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
              className="rounded-sm border border-border-strong bg-card px-3 py-2.5 font-mono text-sm tabular text-ink"
              placeholder="Ex. 12"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Garantie</span>
            <input
              inputMode="numeric"
              value={warrantyValue}
              disabled={!editable}
              onChange={(e) => setWarrantyValue(e.target.value.replace(/\D/g, ''))}
              className="rounded-sm border border-border-strong bg-card px-3 py-2.5 font-mono text-sm tabular text-ink"
              placeholder="Ex. 30"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Unité</span>
            <select
              value={warrantyUnit}
              disabled={!editable}
              onChange={(e) => setWarrantyUnit(e.target.value)}
              className="rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink"
            >
              <option value="DAY">jours</option>
              <option value="WEEK">semaines</option>
              <option value="MONTH">mois</option>
            </select>
          </label>
        </div>
      </section>

      {editable && (
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={validate}
            disabled={saving || !prix}
            className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-white transition-transform hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
            style={{ minHeight: 48 }}
          >
            Valider le contenu
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-card px-4 py-3 text-sm font-medium text-ink ring-1 ring-border transition-colors hover:bg-surface disabled:opacity-50"
            style={{ minHeight: 48 }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
          </button>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        <button type="button" onClick={() => router.push('/liaison/fiches')} className="underline">
          Retour à mes fiches
        </button>
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  champ,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  champ?: ChampConfiance
  disabled?: boolean
}) {
  const lowConfidenceSuggestion =
    champ?.valeur && champ.confiance < CONF_MID ? champ.valeur : null
  return (
    <label className="grid gap-1 text-sm">
      <span className="flex items-center justify-between font-medium text-ink">
        {label}
        {champ && champ.confiance >= CONF_MID && champ.confiance < CONF_HIGH && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-warn-fg">
            à confirmer
          </span>
        )}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass(champ?.confiance)}
        placeholder={lowConfidenceSuggestion ? `Proposition : ${lowConfidenceSuggestion}` : ''}
      />
    </label>
  )
}
