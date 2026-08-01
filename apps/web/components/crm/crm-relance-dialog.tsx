'use client'

import { useState } from 'react'
import { crmFetch, type CrmRelanceResult, type CrmSubject } from '@/lib/crm-api'

export function CrmRelanceDialog({
  subject,
  subjectId,
  onClose,
  onSent,
}: {
  subject: CrmSubject
  subjectId: string
  onClose: () => void
  /** Appelé après toute tentative (l'interaction RELANCE est tracée même en cas d'échec d'envoi). */
  onSent: () => void
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CrmRelanceResult | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await crmFetch<CrmRelanceResult>('/relance-whatsapp', {
      method: 'POST',
      body: JSON.stringify({ subject, subjectId, message: message.trim() }),
    })
    setBusy(false)
    if (!res.ok) {
      // 422 typiques : CRM_NO_PHONE, CRM_OPTOUT — message API déjà en français.
      setError(res.message)
      return
    }
    setResult(res.data)
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Relance WhatsApp</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        {!result ? (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-muted">
              Le message part sur le WhatsApp de la fiche et reste tracé dans la timeline (type
              Relance).
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Bonjour, … (personnalisez avec le prénom et le contexte de la fiche)"
              className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
              autoFocus
            />
            {error && (
              <div className="rounded-sm border border-error-fg/20 bg-error-bg p-2 text-xs text-error-fg">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || !message.trim()}
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                {busy ? 'Envoi…' : 'Envoyer la relance'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border-strong px-4 py-2.5 text-sm hover:bg-surface"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {result.sent ? (
              <div className="rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
                Message envoyé via WhatsApp (canal {result.channel ?? 'inconnu'}).
              </div>
            ) : (
              <div className="rounded-md border border-warn-fg/20 bg-warn-bg p-3 text-sm text-warn-fg">
                Message non envoyé — aucun canal WhatsApp disponible. La relance a quand même été
                consignée dans la timeline.
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-md border border-border-strong px-4 py-2.5 text-sm hover:bg-surface"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
