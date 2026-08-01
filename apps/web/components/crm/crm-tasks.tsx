'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  crmFetch,
  loadTeamMembers,
  type CrmSubject,
  type CrmTask,
  type CrmTaskList,
  type TeamMember,
} from '@/lib/crm-api'
import {
  dateInputToIsoEndOfDay,
  describeEcheance,
  TASK_STATUS_LABELS,
  taskStatusVariant,
} from '@/lib/crm-utils'
import { Chip } from '@/components/ui/chip'

export function CrmTasks({ subject, subjectId }: { subject: CrmSubject; subjectId: string }) {
  const [tasks, setTasks] = useState<CrmTask[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])

  // Création inline
  const [titre, setTitre] = useState('')
  const [echeance, setEcheance] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    return crmFetch<CrmTaskList>(`/tasks?subject=${subject}&subjectId=${subjectId}&limit=50`).then(
      (res) => {
        if (res.ok) {
          setTasks(res.data.tasks)
          setError(null)
        } else {
          setError(res.message)
        }
      },
    )
  }, [subject, subjectId])

  useEffect(() => {
    void load()
    loadTeamMembers().then(setTeam)
  }, [load])

  async function setStatut(task: CrmTask, statut: 'FAIT' | 'A_FAIRE') {
    const res = await crmFetch<CrmTask>(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    })
    if (!res.ok) {
      setError(res.message)
      return
    }
    await load()
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim() || busy) return
    setBusy(true)
    setFormError(null)
    const res = await crmFetch<CrmTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        subjectId,
        titre: titre.trim(),
        echeanceLe: echeance ? dateInputToIsoEndOfDay(echeance) : null,
        assigneeId: assigneeId || null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setFormError(res.message)
      return
    }
    setTitre('')
    setEcheance('')
    setAssigneeId('')
    await load()
  }

  if (error) {
    return (
      <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!tasks ? (
        <div className="py-2 text-sm text-muted">Chargement…</div>
      ) : tasks.length === 0 ? (
        <p className="py-1 text-sm text-muted">Aucune tâche sur cette fiche.</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => {
            const ech = describeEcheance(t.echeanceLe, t.statut)
            return (
              <li
                key={t.id}
                className="flex items-start justify-between gap-2 rounded-sm border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <div className={`text-[13px] font-medium ${t.statut === 'FAIT' ? 'text-muted line-through' : 'text-ink'}`}>
                    {t.titre}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                    <span className={ech.overdue ? 'font-medium text-error-fg' : ''}>{ech.text}</span>
                    {t.assignee?.name && <span>· {t.assignee.name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Chip variant={taskStatusVariant(t.statut)}>{TASK_STATUS_LABELS[t.statut]}</Chip>
                  {t.statut === 'A_FAIRE' ? (
                    <button
                      onClick={() => setStatut(t, 'FAIT')}
                      className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-card"
                    >
                      Fait
                    </button>
                  ) : t.statut === 'FAIT' ? (
                    <button
                      onClick={() => setStatut(t, 'A_FAIRE')}
                      className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-card"
                    >
                      Rouvrir
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={create} className="space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Nouvelle tâche…"
            className="min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={echeance}
            onChange={(e) => setEcheance(e.target.value)}
            className="rounded-sm border border-border-strong bg-surface px-2 py-2 text-sm"
            aria-label="Échéance"
          />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="rounded-sm border border-border-strong bg-card px-2 py-2 text-sm"
            aria-label="Assigné"
          >
            <option value="">Non assignée</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy || !titre.trim()}
            className="rounded-sm bg-ink-2 px-3 py-2 text-sm font-medium text-white hover:bg-ink disabled:opacity-40"
          >
            {busy ? 'Création…' : '+ Tâche'}
          </button>
        </div>
        {formError && <p className="text-xs text-error-fg">{formError}</p>}
      </form>
    </div>
  )
}
