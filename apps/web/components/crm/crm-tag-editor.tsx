'use client'

import { useCallback, useEffect, useState } from 'react'
import { crmFetch, type CrmSubject, type CrmTag } from '@/lib/crm-api'

function TagChip({
  tag,
  action,
  onClick,
  title,
}: {
  tag: CrmTag
  action: 'add' | 'remove'
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-card"
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-muted-2"
        style={tag.couleur ? { backgroundColor: tag.couleur } : undefined}
      />
      {tag.nom}
      <span className="text-muted-2">{action === 'remove' ? '×' : '+'}</span>
    </button>
  )
}

export function CrmTagEditor({ subject, subjectId }: { subject: CrmSubject; subjectId: string }) {
  const [allTags, setAllTags] = useState<CrmTag[]>([])
  const [assigned, setAssigned] = useState<CrmTag[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [nom, setNom] = useState('')
  const [couleur, setCouleur] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return Promise.all([
      crmFetch<CrmTag[]>('/tags'),
      crmFetch<CrmTag[]>(`/tags/on/${subject}/${subjectId}`),
    ]).then(([tagsRes, assignedRes]) => {
      if (!tagsRes.ok || !assignedRes.ok) {
        setError(!tagsRes.ok ? tagsRes.message : !assignedRes.ok ? assignedRes.message : 'Erreur')
        return
      }
      setAllTags(tagsRes.data)
      setAssigned(assignedRes.data)
      setError(null)
      setLoaded(true)
    })
  }, [subject, subjectId])

  useEffect(() => {
    void load()
  }, [load])

  async function assign(tag: CrmTag) {
    const res = await crmFetch(`/tags/${tag.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ subject, subjectId }),
    })
    if (!res.ok) setError(res.message)
    else await load()
  }

  async function unassign(tag: CrmTag) {
    const res = await crmFetch(`/tags/${tag.id}/assign`, {
      method: 'DELETE',
      body: JSON.stringify({ subject, subjectId }),
    })
    if (!res.ok) setError(res.message)
    else await load()
  }

  async function createTag(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim() || busy) return
    setBusy(true)
    const res = await crmFetch<CrmTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ nom: nom.trim(), couleur: couleur || null }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setNom('')
    setCouleur('')
    setCreating(false)
    await load()
  }

  const assignedIds = new Set(assigned.map((t) => t.id))
  const available = allTags.filter((t) => !assignedIds.has(t.id))

  return (
    <div>
      {!loaded && !error && <div className="py-1 text-sm text-muted">Chargement…</div>}
      {error && <p className="text-xs text-error-fg">{error}</p>}
      {loaded && (
        <div className="flex flex-wrap items-center gap-1.5">
          {assigned.map((t) => (
            <TagChip key={t.id} tag={t} action="remove" title="Retirer le tag" onClick={() => unassign(t)} />
          ))}
          {available.map((t) => (
            <TagChip key={t.id} tag={t} action="add" title="Assigner le tag" onClick={() => assign(t)} />
          ))}
          {allTags.length === 0 && !creating && (
            <span className="text-xs text-muted">Aucun tag pour le moment.</span>
          )}
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink"
          >
            {creating ? 'Annuler' : '+ Nouveau tag'}
          </button>
        </div>
      )}
      {creating && (
        <form onSubmit={createTag} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom du tag"
            maxLength={60}
            className="rounded-sm border border-border-strong bg-surface px-2 py-1.5 text-sm"
            autoFocus
          />
          <input
            type="color"
            value={couleur || '#002366'}
            onChange={(e) => setCouleur(e.target.value)}
            title="Couleur (optionnel)"
            className="h-8 w-10 cursor-pointer rounded-sm border border-border-strong bg-card p-0.5"
          />
          <button
            type="submit"
            disabled={busy || !nom.trim()}
            className="rounded-sm bg-ink-2 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink disabled:opacity-40"
          >
            {busy ? 'Création…' : 'Créer'}
          </button>
        </form>
      )}
    </div>
  )
}
