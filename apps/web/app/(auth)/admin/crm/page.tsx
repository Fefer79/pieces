'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'
import {
  crmFetch,
  loadTeamMembers,
  type CrmOverview,
  type CrmSubject,
  type CrmTask,
  type CrmTaskList,
  type CrmTaskStatus,
  type TeamMember,
} from '@/lib/crm-api'
import {
  CLIENT_SEGMENT_LABELS,
  dateInputToIsoEndOfDay,
  describeEcheance,
  subjectHref,
  TASK_STATUS_LABELS,
  taskStatusVariant,
} from '@/lib/crm-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const DUE_OPTIONS = [
  { value: '', label: 'Toutes les échéances' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'overdue', label: 'En retard' },
  { value: 'upcoming', label: 'À venir' },
]

export default function AdminCrmPage() {
  const [overview, setOverview] = useState<CrmOverview | null>(null)
  const [data, setData] = useState<CrmTaskList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])

  const [statut, setStatut] = useState('')
  const [due, setDue] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (statut) params.set('statut', statut)
    if (due) params.set('due', due)
    if (assigneeId) params.set('assigneeId', assigneeId)
    params.set('page', String(page))
    crmFetch<CrmTaskList>(`/tasks?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [statut, due, assigneeId, page])

  useEffect(() => {
    crmFetch<CrmOverview>('/overview').then((res) => {
      if (res.ok) setOverview(res.data)
    })
    loadTeamMembers().then(setTeam)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function markDone(task: CrmTask) {
    const res = await crmFetch(`/tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: 'FAIT' }),
    })
    if (!res.ok) setError(res.message)
    else {
      crmFetch<CrmOverview>('/overview').then((r) => r.ok && setOverview(r.data))
      load()
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-ink">CRM</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
        >
          + Tâche
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tâches du jour" value={overview?.tachesDuJour ?? '…'} />
        <StatCard label="En retard" value={overview?.tachesEnRetard ?? '…'} />
        <StatCard label="Interactions 7 j" value={overview?.interactions7j ?? '…'} />
        <StatCard label="Relances 7 j" value={overview?.relances7j ?? '…'} />
      </div>

      {overview && (
        <div className="mb-4 rounded-md border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            Segments clients
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CLIENT_SEGMENT_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/admin/clients?segment=${key}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface/60 hover:border-border-strong"
              >
                {label}
                <span className="font-mono tabular text-muted">
                  {overview.segmentsClients[key] ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={statut}
          onChange={(e) => {
            setPage(1)
            setStatut(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(TASK_STATUS_LABELS) as CrmTaskStatus[]).map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={due}
          onChange={(e) => {
            setPage(1)
            setDue(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          {DUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={assigneeId}
          onChange={(e) => {
            setPage(1)
            setAssigneeId(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les assignés</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Titre</Th>
                  <Th>Fiche</Th>
                  <Th>Échéance</Th>
                  <Th>Assigné</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.tasks.map((t) => {
                  const ech = describeEcheance(t.echeanceLe, t.statut)
                  return (
                    <Tr key={t.id}>
                      <Td className={t.statut === 'FAIT' ? 'text-muted line-through' : ''}>
                        {t.titre}
                      </Td>
                      <Td>
                        <Link
                          href={subjectHref(t.subject, t.subjectId)}
                          className="text-ink-2 hover:underline"
                        >
                          {t.subjectLabel ?? '—'}
                        </Link>
                        <span className="ml-1 text-[10px] text-muted-2">
                          {t.subject === 'USER' ? 'Client' : 'Vendeur'}
                        </span>
                      </Td>
                      <Td className={`text-xs ${ech.overdue ? 'font-medium text-error-fg' : ''}`}>
                        {ech.text}
                      </Td>
                      <Td className="text-xs">{t.assignee?.name ?? '—'}</Td>
                      <Td>
                        <Chip variant={taskStatusVariant(t.statut)}>
                          {TASK_STATUS_LABELS[t.statut]}
                        </Chip>
                      </Td>
                      <Td align="right">
                        {t.statut === 'A_FAIRE' && (
                          <button
                            onClick={() => markDone(t)}
                            className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-surface"
                          >
                            Fait
                          </button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
                {data.tasks.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={6} align="center" className="py-6 text-muted">
                      Aucune tâche.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.pagination.total} tâches · page {data.pagination.page}/
              {data.pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}

      {showCreate && (
        <QuickTaskDialog
          team={team}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Création rapide : la fiche cible est cherchée par nom (listes admin),
// pas saisie par UUID — le pointeur cliqué fournit l'id.
// ---------------------------------------------------------------------------

interface PickedSubject {
  subject: CrmSubject
  id: string
  label: string
}

function QuickTaskDialog({
  team,
  onClose,
  onCreated,
}: {
  team: TeamMember[]
  onClose: () => void
  onCreated: () => void
}) {
  const [subject, setSubject] = useState<CrmSubject>('USER')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PickedSubject[]>([])
  const [picked, setPicked] = useState<PickedSubject | null>(null)
  const [titre, setTitre] = useState('')
  const [echeance, setEcheance] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const term = search.trim()
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setResults([])
        return
      }
      try {
        if (subject === 'USER') {
          const res = await adminFetch<{ users: { id: string; name: string | null; phone: string | null }[] }>(
            `/admin/clients/list?q=${encodeURIComponent(term)}&limit=5`,
          )
          if (!ctrl.signal.aborted) {
            setResults(
              res.users.map((u) => ({
                subject: 'USER',
                id: u.id,
                label: u.name ?? u.phone ?? u.id,
              })),
            )
          }
        } else {
          const res = await adminFetch<{ vendors: { id: string; shopName: string }[] }>(
            `/admin/vendors/list?q=${encodeURIComponent(term)}&limit=5`,
          )
          if (!ctrl.signal.aborted) {
            setResults(res.vendors.map((v) => ({ subject: 'VENDOR', id: v.id, label: v.shopName })))
          }
        }
      } catch {
        if (!ctrl.signal.aborted) setResults([])
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [search, subject])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!picked || !titre.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await crmFetch('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        subject: picked.subject,
        subjectId: picked.id,
        titre: titre.trim(),
        echeanceLe: echeance ? dateInputToIsoEndOfDay(echeance) : null,
        assigneeId: assigneeId || null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Nouvelle tâche</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value as CrmSubject)
                setPicked(null)
                setResults([])
              }}
              className="rounded-sm border border-border-strong bg-card px-2 py-2 text-sm"
            >
              <option value="USER">Client</option>
              <option value="VENDOR">Vendeur</option>
            </select>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPicked(null)
              }}
              placeholder="Rechercher la fiche (nom, téléphone)…"
              className="min-w-0 flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </div>
          {picked ? (
            <div className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm">
              <span className="font-medium text-ink">{picked.label}</span>
              <button type="button" onClick={() => setPicked(null)} className="text-xs text-muted hover:text-ink">
                Changer
              </button>
            </div>
          ) : (
            results.length > 0 && (
              <ul className="max-h-44 overflow-y-auto rounded-sm border border-border">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(r)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre de la tâche"
            className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
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
              className="min-w-0 flex-1 rounded-sm border border-border-strong bg-card px-2 py-2 text-sm"
              aria-label="Assigné"
            >
              <option value="">Non assignée</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-error-fg">{error}</p>}
          <button
            type="submit"
            disabled={busy || !picked || !titre.trim()}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'Création…' : 'Créer la tâche'}
          </button>
        </form>
      </div>
    </div>
  )
}
