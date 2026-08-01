'use client'

import { useState } from 'react'
import {
  crmFetch,
  type CrmInteraction,
  type CrmInteractionType,
  type CrmSubject,
} from '@/lib/crm-api'
import { INTERACTION_TYPE_LABELS } from '@/lib/crm-utils'

const TYPES = Object.keys(INTERACTION_TYPE_LABELS) as CrmInteractionType[]

export function CrmInteractionForm({
  subject,
  subjectId,
  onCreated,
}: {
  subject: CrmSubject
  subjectId: string
  onCreated: () => void
}) {
  const [type, setType] = useState<CrmInteractionType>('NOTE')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setFeedback(null)
    const res = await crmFetch<CrmInteraction>('/interactions', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        subjectId,
        type,
        details: details.trim() || null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setFeedback({ ok: false, msg: res.message })
      return
    }
    setDetails('')
    setFeedback({ ok: true, msg: 'Interaction enregistrée.' })
    onCreated()
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CrmInteractionType)}
          className="rounded-sm border border-border-strong bg-card px-2 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {INTERACTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          placeholder="Compte-rendu (optionnel)…"
          className="min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Enregistrement…' : 'Ajouter'}
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.ok ? 'text-success-fg' : 'text-error-fg'}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  )
}
