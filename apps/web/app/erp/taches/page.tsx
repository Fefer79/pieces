'use client'

import { useEffect, useState } from 'react'
import { Chip } from '@/components/ui/chip'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Modal } from '@/components/ui/modal'
import { Select, TextArea, TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { ErpShell } from '@/components/erp/erp-shell'
import { useErp } from '@/components/erp/erp-context'
import {
  erpFetch,
  fmtDateTime,
  type Paginated,
  type StaffRow,
  type TaskPriorityKey,
  type TaskRow,
  type TaskStatusKey,
} from '@/lib/erp-api'
import { BUSINESS_UNIT_LABELS, BUSINESS_UNITS } from 'shared/constants'
import {
  TASK_PRIORITY_CHIP,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_CHIP,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  formatDueLabel,
  isOverdue,
  nextStatusFor,
  nextStatusLabel,
} from './_shared'

type ScopeFilter = 'MINE' | 'ALL' | 'OVERDUE'

const SCOPES: Array<{ value: ScopeFilter; label: string }> = [
  { value: 'MINE', label: 'Mes tâches' },
  { value: 'OVERDUE', label: 'En retard' },
  { value: 'ALL', label: 'Toute l’équipe' },
]

export default function ErpTasksPage() {
  const me = useErp()
  const toast = useToast()

  const [scope, setScope] = useState<ScopeFilter>(me.staffId ? 'MINE' : 'ALL')
  const [status, setStatus] = useState<TaskStatusKey | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<TaskRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const pageSize = 25

  // Voir le commentaire de app/erp/layout.tsx pour la forme inline en IIFE
  // async et le pilotage du rechargement par `reloadToken`.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (scope === 'MINE') qs.set('mine', 'true')
      if (scope === 'OVERDUE') qs.set('overdue', 'true')
      if (status !== 'ALL') qs.set('status', status)

      const res = await erpFetch<Paginated<TaskRow>>(`/tasks?${qs.toString()}`)
      if (cancelled) return

      if (!res.ok) {
        setError(res.message)
        setLoading(false)
        return
      }
      setError(null)
      setRows(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [page, scope, status, reloadToken])

  // La liste de l'équipe sert au sélecteur d'attribution : chargée une fois.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await erpFetch<Paginated<StaffRow>>('/staff?active=true&pageSize=100')
      if (cancelled || !res.ok) return
      setStaff(res.data.items)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function reload() {
    setLoading(true)
    setReloadToken((t) => t + 1)
  }

  async function advance(task: TaskRow) {
    const next = nextStatusFor(task.status)
    if (!next) return
    const res = await erpFetch<TaskRow>(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(next === 'DONE' ? 'Tâche terminée' : 'Tâche démarrée')
    reload()
  }

  const columns: Array<Column<TaskRow>> = [
      {
        key: 'title',
        header: 'Tâche',
        render: (t) => (
          <div>
            <span className="font-medium text-ink">{t.title}</span>
            {t.description && (
              <span className="mt-0.5 block max-w-md truncate text-[12.5px] text-muted">
                {t.description}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'priority',
        header: 'Priorité',
        render: (t) => (
          <Chip variant={TASK_PRIORITY_CHIP[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Chip>
        ),
      },
      {
        key: 'status',
        header: 'Statut',
        render: (t) => (
          <Chip variant={TASK_STATUS_CHIP[t.status]}>{TASK_STATUS_LABELS[t.status]}</Chip>
        ),
      },
      {
        key: 'dueAt',
        header: 'Échéance',
        hideOnMobile: true,
        render: (t) => (
          <span
            className={`font-mono text-[12.5px] tabular ${
              isOverdue(t.dueAt, t.status) ? 'font-medium text-error-fg' : 'text-muted'
            }`}
          >
            {formatDueLabel(t.dueAt)}
          </span>
        ),
      },
      {
        key: 'assignee',
        header: 'Assignée à',
        hideOnMobile: true,
        render: (t) => (
          <span className="text-[13px] text-ink">
            {t.assignee?.user.name ?? t.assignee?.user.phone ?? '— non assignée'}
          </span>
        ),
      },
      {
        key: 'businessUnit',
        header: 'Ligne',
        hideOnMobile: true,
        render: (t) => (
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
            {t.businessUnit ? BUSINESS_UNIT_LABELS[t.businessUnit] : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (t) => {
          const label = nextStatusLabel(t.status)
          if (!label) {
            return (
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-2">
                {fmtDateTime(t.completedAt)}
              </span>
            )
          }
          return (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                advance(t)
              }}
            >
              {label}
            </Button>
          )
        },
      },
  ]

  return (
    <ErpShell
      me={me}
      eyebrow="Pilotage"
      title="Tâches"
      actions={
        <Button variant="accent" onClick={() => setCreateOpen(true)} style={{ minHeight: '48px' }}>
          Nouvelle tâche
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-1.5">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setScope(s.value)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                scope === s.value
                  ? 'bg-ink text-white'
                  : 'border border-border-strong bg-card text-ink hover:bg-surface'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setStatus('ALL')
              setPage(1)
            }}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              status === 'ALL'
                ? 'bg-ink-2 text-white'
                : 'border border-border-strong bg-card text-ink hover:bg-surface'
            }`}
          >
            Tous statuts
          </button>
          {TASK_STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s)
                setPage(1)
              }}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                status === s
                  ? 'bg-ink-2 text-white'
                  : 'border border-border-strong bg-card text-ink hover:bg-surface'
              }`}
            >
              {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {scope === 'MINE' && !me.staffId && (
        <div className="mb-4 rounded-md border border-border bg-warn-bg px-4 py-3 text-[13.5px] text-warn-fg">
          Vous accédez à l’ERP comme administrateur, sans fiche d’équipe. Créez-la dans
          Paramètres › Équipe pour qu’on puisse vous attribuer des tâches.
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        emptyLabel={
          scope === 'OVERDUE' ? 'Aucune tâche en retard' : 'Aucune tâche pour ce filtre'
        }
        emptyHint={
          scope === 'OVERDUE'
            ? 'Rien ne traîne — c’est le but.'
            : 'Créez une tâche pour suivre une relance, un règlement ou un contrôle.'
        }
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />

      {/* `key` remonte la modale à chaque ouverture : les champs repartent de
          leur état initial sans effet de remise à zéro. */}
      {createOpen && (
        <CreateTaskModal
          key={reloadToken}
          staff={staff}
          defaultAssignee={me.staffId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            toast.success('Tâche créée')
            reload()
          }}
        />
      )}
    </ErpShell>
  )
}

/** Montée uniquement quand la modale est ouverte : l'état initial suffit. */
function CreateTaskModal({
  onClose,
  staff,
  defaultAssignee,
  onCreated,
}: {
  onClose: () => void
  staff: StaffRow[]
  defaultAssignee: string | null
  onCreated: () => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriorityKey>('NORMAL')
  const [dueAt, setDueAt] = useState('')
  const [businessUnit, setBusinessUnit] = useState('')
  const [assigneeStaffId, setAssigneeStaffId] = useState(defaultAssignee ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function submit() {
    if (title.trim().length < 3) {
      setFieldError('Donnez un intitulé d’au moins 3 caractères.')
      return
    }
    setSubmitting(true)
    setFieldError(null)

    const res = await erpFetch<TaskRow>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        priority,
        // L'input date rend `YYYY-MM-DD` ; l'API attend un datetime ISO.
        ...(dueAt && { dueAt: new Date(`${dueAt}T12:00:00`).toISOString() }),
        ...(businessUnit && { businessUnit }),
        ...(assigneeStaffId && { assigneeStaffId }),
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    onCreated()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle tâche"
      description="Relance commerciale, rappel de règlement, contrôle de stock…"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="accent" onClick={submit} disabled={submitting}>
            {submitting ? 'Création…' : 'Créer la tâche'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Intitulé"
          required
          value={title}
          error={fieldError}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Relancer Garage Koumassi sur le devis"
        />
        <TextArea
          label="Détail"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Optionnel — le contexte utile à celui qui traitera."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Priorité"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriorityKey)}
          >
            {TASK_PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
          <TextInput
            label="Échéance"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Ligne d’activité"
            value={businessUnit}
            onChange={(e) => setBusinessUnit(e.target.value)}
          >
            <option value="">Non précisée</option>
            {BUSINESS_UNITS.map((bu) => (
              <option key={bu} value={bu}>
                {BUSINESS_UNIT_LABELS[bu]}
              </option>
            ))}
          </Select>
          <Select
            label="Assignée à"
            value={assigneeStaffId}
            onChange={(e) => setAssigneeStaffId(e.target.value)}
            hint="Par défaut : vous."
          >
            <option value="">Moi</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.name ?? s.user.phone ?? s.id}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  )
}
