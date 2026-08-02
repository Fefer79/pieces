'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  marketingFetch,
  type AudiencePreview,
  type AudienceType,
  type MarketingAudiences,
  type MarketingCampaign,
} from '@/lib/marketing-api'
import { AUDIENCE_TYPE_LABELS } from '@/lib/marketing-utils'

const MESSAGE_MAX = 1000

export default function NouvelleCampagnePage() {
  const router = useRouter()
  const [audiences, setAudiences] = useState<MarketingAudiences | null>(null)
  const [nom, setNom] = useState('')
  const [message, setMessage] = useState('')
  const [audienceType, setAudienceType] = useState<AudienceType>('SEGMENT_CLIENT')
  const [audienceValue, setAudienceValue] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    marketingFetch<MarketingAudiences>('/audiences').then((res) => {
      if (res.ok) setAudiences(res.data)
      else setError(res.message)
    })
  }, [])

  // Options d'audience selon le type choisi ; la valeur se réinitialise à
  // chaque changement de type.
  const options = useMemo(() => {
    if (!audiences) return []
    if (audienceType === 'SEGMENT_CLIENT') return audiences.segmentsClients
    if (audienceType === 'SEGMENT_VENDEUR') return audiences.segmentsVendeurs
    return audiences.tags.map((t) => ({ key: t.id, label: t.nom, count: t.count }))
  }, [audiences, audienceType])

  // La valeur d'audience et l'aperçu sont réinitialisés dans les gestionnaires
  // onChange des deux selects (jamais dans un effet — règle react-hooks).
  const runPreview = useCallback(() => {
    if (!audienceValue) return
    setPreviewing(true)
    const params = new URLSearchParams({ audienceType, audienceValue })
    marketingFetch<AudiencePreview>(`/audiences/preview?${params.toString()}`).then((res) => {
      setPreviewing(false)
      if (res.ok) {
        setPreview(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [audienceType, audienceValue])

  const submit = useCallback(() => {
    setSubmitting(true)
    setError(null)
    const body: Record<string, unknown> = { nom, message, audienceType, audienceValue }
    if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString()
    marketingFetch<MarketingCampaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((res) => {
      setSubmitting(false)
      if (res.ok) {
        setNotice('Campagne créée.')
        router.push(`/admin/marketing/${res.data.id}`)
      } else {
        setError(res.message)
      }
    })
  }, [nom, message, audienceType, audienceValue, scheduledAt, router])

  const canSubmit =
    nom.trim().length > 0 && message.trim().length > 0 && audienceValue.length > 0 && !submitting

  return (
    <div className="max-w-2xl">
      <div className="mb-4 rounded-md border border-border bg-surface p-3 text-sm text-muted">
        Les messages partent en WhatsApp ; les destinataires ayant désactivé les notifications sont
        exclus automatiquement, et chaque envoi est tracé dans la fiche CRM du client ou du
        vendeur.
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {notice}
        </div>
      )}

      <div className="space-y-4 rounded-md border border-border bg-card p-4">
        <div>
          <label htmlFor="nom" className="mb-1 block text-sm font-medium text-ink">
            Nom de la campagne
          </label>
          <input
            id="nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={120}
            placeholder="Ex. Relance clients à risque — août"
            className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-ink">
            Message WhatsApp
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            rows={5}
            placeholder="Bonjour, …"
            className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <p className="mt-1 text-right text-xs text-muted">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="audienceType" className="mb-1 block text-sm font-medium text-ink">
              Type d&apos;audience
            </label>
            <select
              id="audienceType"
              value={audienceType}
              onChange={(e) => {
                setAudienceType(e.target.value as AudienceType)
                setAudienceValue('')
                setPreview(null)
              }}
              className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              {(Object.keys(AUDIENCE_TYPE_LABELS) as AudienceType[]).map((t) => (
                <option key={t} value={t}>
                  {AUDIENCE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audienceValue" className="mb-1 block text-sm font-medium text-ink">
              Audience
            </label>
            <select
              id="audienceValue"
              value={audienceValue}
              onChange={(e) => {
                setAudienceValue(e.target.value)
                setPreview(null)
              }}
              className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="">Choisir…</option>
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} ({o.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={runPreview}
            disabled={!audienceValue || previewing}
            className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-card disabled:opacity-40"
          >
            {previewing ? 'Calcul…' : "Aperçu de l'audience"}
          </button>

          {preview && (
            <div className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">
              <p className="font-medium text-ink">
                {preview.total} destinataire{preview.total > 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-muted">
                {preview.optouts} désabonné{preview.optouts > 1 ? 's' : ''} (exclus) ·{' '}
                {preview.sansTelephone} sans téléphone (exclus)
              </p>
              {preview.echantillon.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-muted">
                  {preview.echantillon.map((e, i) => (
                    <li key={i}>
                      {e.nom ?? '(sans nom)'} — {e.telephone ?? 'pas de numéro'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="scheduledAt" className="mb-1 block text-sm font-medium text-ink">
            Date d&apos;envoi <span className="font-normal text-muted">(facultatif)</span>
          </label>
          <input
            id="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted">
            Une date future planifie l&apos;envoi ; sinon la campagne reste un brouillon à lancer
            manuellement.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {submitting ? 'Création…' : 'Créer la campagne'}
          </button>
        </div>
      </div>
    </div>
  )
}
