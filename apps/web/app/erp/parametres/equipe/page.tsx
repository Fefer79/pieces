'use client'

import { useEffect, useState } from 'react'
import { Chip } from '@/components/ui/chip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Modal } from '@/components/ui/modal'
import { Field, Select, TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { ErpShell } from '@/components/erp/erp-shell'
import { useErp } from '@/components/erp/erp-context'
import {
  erpFetch,
  fmtDate,
  type Paginated,
  type StaffCandidate,
  type StaffRow,
} from '@/lib/erp-api'
import {
  BUSINESS_UNITS,
  BUSINESS_UNIT_LABELS,
  ERP_CAPABILITIES,
  ERP_CAPABILITY_LABELS,
  STAFF_ROLE_LABELS,
  hasCapability,
  type BusinessUnitKey,
  type ErpCapability,
  type StaffRoleKey,
} from 'shared/constants'
import { STAFF_ROLE_CHIP, STAFF_ROLE_HINTS, STAFF_ROLE_ORDER } from './_shared'

export default function ErpTeamPage() {
  const me = useErp()
  const toast = useToast()
  const canAdmin = hasCapability(me.capabilities, 'erp:admin')

  const [rows, setRows] = useState<StaffRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<StaffRow | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const pageSize = 25

  // Voir le commentaire de app/erp/layout.tsx pour la forme inline en IIFE
  // async et le pilotage du rechargement par `reloadToken`.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await erpFetch<Paginated<StaffRow>>(`/staff?page=${page}&pageSize=${pageSize}`)
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
  }, [page, reloadToken])

  function reload() {
    setLoading(true)
    setReloadToken((t) => t + 1)
  }

  const columns: Array<Column<StaffRow>> = [
      {
        key: 'user',
        header: 'Membre',
        render: (s) => (
          <div>
            <span className="font-medium text-ink">
              {s.user.name ?? s.user.phone ?? s.user.email ?? '—'}
            </span>
            {s.title && (
              <span className="mt-0.5 block text-[12.5px] text-muted">{s.title}</span>
            )}
          </div>
        ),
      },
      {
        key: 'staffRole',
        header: 'Métier',
        render: (s) => (
          <Chip variant={STAFF_ROLE_CHIP[s.staffRole]}>{STAFF_ROLE_LABELS[s.staffRole]}</Chip>
        ),
      },
      {
        key: 'businessUnits',
        header: 'Lignes d’activité',
        hideOnMobile: true,
        render: (s) =>
          s.businessUnits.length === 0 ? (
            <span className="text-[13px] text-muted">Toutes</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {s.businessUnits.map((bu) => (
                <span
                  key={bu}
                  className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted"
                >
                  {BUSINESS_UNIT_LABELS[bu]}
                </span>
              ))}
            </div>
          ),
      },
      {
        key: 'capabilities',
        header: 'Droits',
        num: true,
        hideOnMobile: true,
        render: (s) => (
          <span className="font-mono text-[12.5px] tabular text-muted">
            {s.capabilities.length}
          </span>
        ),
      },
      {
        key: 'active',
        header: 'État',
        render: (s) => (
          <Chip variant={s.active ? 'status-ok' : 'status-err'}>
            {s.active ? 'Actif' : 'Désactivé'}
          </Chip>
        ),
      },
      {
        key: 'hiredAt',
        header: 'Arrivée',
        num: true,
        hideOnMobile: true,
        render: (s) => (
          <span className="font-mono text-[12.5px] tabular text-muted">{fmtDate(s.hiredAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (s) =>
          canAdmin ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(s)
              }}
            >
              Modifier
            </Button>
          ) : null,
      },
  ]

  return (
    <ErpShell
      me={me}
      eyebrow="Paramètres"
      title="Équipe"
      actions={
        canAdmin ? (
          <Button
            variant="accent"
            onClick={() => setInviteOpen(true)}
            style={{ minHeight: '48px' }}
          >
            Ajouter un membre
          </Button>
        ) : null
      }
    >
      {!me.staffId && (
        <Card className="mb-5 border-warn-fg/25 bg-warn-bg">
          <p className="text-[13.5px] leading-relaxed text-warn-fg">
            Vous accédez à l’ERP en tant qu’administrateur de la plateforme, sans fiche d’équipe.
            Cela vous donne tous les droits, mais vos actions ne sont imputées à personne : créez
            votre fiche pour pouvoir recevoir des tâches et signer des notes.
          </p>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        loading={loading}
        error={error}
        emptyLabel="Aucun membre enrôlé"
        emptyHint="Ajoutez les premières personnes de l’équipe pour leur ouvrir l’ERP."
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />

      <Card className="mt-6">
        <h2 className="font-display text-[20px] leading-tight text-ink">Ce que donne chaque métier</h2>
        <p className="mt-1 text-[13px] text-muted">
          Les droits découlent du métier — il n’y a rien à cocher personne par personne.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STAFF_ROLE_ORDER.map((role) => (
            <div key={role} className="rounded-md border border-border bg-surface p-3">
              <Chip variant={STAFF_ROLE_CHIP[role]}>{STAFF_ROLE_LABELS[role]}</Chip>
              <p className="mt-2 text-[12.5px] leading-snug text-muted">{STAFF_ROLE_HINTS[role]}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Modales montées à la demande, avec `key` : les champs repartent de leur
          état initial sans effet de remise à zéro. */}
      {inviteOpen && (
        <InviteModal
          key={`invite-${reloadToken}`}
          onClose={() => setInviteOpen(false)}
          onCreated={() => {
            setInviteOpen(false)
            toast.success('Membre ajouté à l’équipe')
            reload()
          }}
        />
      )}

      {editing && (
        <EditModal
          key={editing.id}
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            toast.success('Fiche mise à jour')
            reload()
          }}
        />
      )}
    </ErpShell>
  )
}

function BusinessUnitPicker({
  value,
  onChange,
}: {
  value: BusinessUnitKey[]
  onChange: (next: BusinessUnitKey[]) => void
}) {
  return (
    <Field
      label="Lignes d’activité"
      hint="Aucune sélection = toutes les lignes. Sert au filtrage des vues, pas aux droits."
    >
      <div className="flex flex-wrap gap-1.5">
        {BUSINESS_UNITS.map((bu) => {
          const on = value.includes(bu)
          return (
            <button
              key={bu}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== bu) : [...value, bu])}
              className={`rounded-full px-3 py-2 text-[12.5px] font-medium transition-colors ${
                on
                  ? 'bg-ink text-white'
                  : 'border border-border-strong bg-card text-ink hover:bg-surface'
              }`}
            >
              {BUSINESS_UNIT_LABELS[bu]}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

/** Montée uniquement quand la modale est ouverte : l'état initial suffit. */
function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [result, setResult] = useState<{ q: string; items: StaffCandidate[] } | null>(null)
  const [selected, setSelected] = useState<StaffCandidate | null>(null)
  const [staffRole, setStaffRole] = useState<StaffRoleKey>('COMMERCIAL')
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitKey[]>([])
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const query = q.trim()
  const searchable = query.length >= 2
  // Résultats dérivés du terme courant : tant que la requête en vol porte sur un
  // autre terme, on n'affiche pas ses résultats. Évite un `setCandidates([])`
  // synchrone dans l'effet.
  const candidates = result && result.q === query ? result.items : []
  const searching = searchable && (result === null || result.q !== query)

  // Recherche différée : on ne bombarde pas l'API à chaque frappe.
  useEffect(() => {
    if (!searchable) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await erpFetch<StaffCandidate[]>(
          `/staff/candidates?q=${encodeURIComponent(query)}`,
        )
        if (cancelled) return
        setResult({ q: query, items: res.ok ? res.data : [] })
      })()
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, searchable])

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    const res = await erpFetch<StaffRow>('/staff', {
      method: 'POST',
      body: JSON.stringify({
        userId: selected.id,
        staffRole,
        businessUnits,
        ...(title.trim() && { title: title.trim() }),
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
      title="Ajouter un membre"
      description="La personne doit déjà avoir un compte Pièces."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="accent" onClick={submit} disabled={submitting || !selected}>
            {submitting ? 'Ajout…' : 'Ajouter à l’équipe'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Rechercher la personne"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSelected(null)
          }}
          placeholder="Nom, téléphone ou e-mail"
          hint="Au moins 2 caractères. Seuls les comptes pas encore dans l’équipe apparaissent."
        />

        {searchable && (
          <div className="rounded-md border border-border">
            {searching && (
              <p className="px-3 py-3 text-[13px] text-muted">Recherche…</p>
            )}
            {!searching && candidates.length === 0 && (
              <p className="px-3 py-3 text-[13px] text-muted">
                Aucun compte trouvé, ou la personne est déjà dans l’équipe.
              </p>
            )}
            {!searching &&
              candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 transition-colors ${
                    selected?.id === c.id ? 'bg-surface' : 'hover:bg-surface'
                  }`}
                >
                  <span>
                    <span className="block text-[13.5px] font-medium text-ink">
                      {c.name ?? c.phone ?? c.email}
                    </span>
                    <span className="block font-mono text-[11.5px] text-muted">
                      {c.phone ?? c.email ?? '—'}
                    </span>
                  </span>
                  {selected?.id === c.id && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2">
                      choisi
                    </span>
                  )}
                </button>
              ))}
          </div>
        )}

        <Select
          label="Métier"
          value={staffRole}
          onChange={(e) => setStaffRole(e.target.value as StaffRoleKey)}
          hint={STAFF_ROLE_HINTS[staffRole]}
        >
          {STAFF_ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {STAFF_ROLE_LABELS[r]}
            </option>
          ))}
        </Select>

        <TextInput
          label="Intitulé de poste"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Responsable grands comptes"
          hint="Optionnel — affiché sous le nom."
        />

        <BusinessUnitPicker value={businessUnits} onChange={setBusinessUnits} />
      </div>
    </Modal>
  )
}

/**
 * Montée avec `key={member.id}` : l'état part des valeurs du membre, et changer
 * de membre remonte le composant. Pas d'effet de synchronisation prop → état.
 */
function EditModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffRow
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [staffRole, setStaffRole] = useState<StaffRoleKey>(member.staffRole)
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitKey[]>(member.businessUnits)
  const [title, setTitle] = useState(member.title ?? '')
  const [active, setActive] = useState(member.active)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    const res = await erpFetch<StaffRow>(`/staff/${member.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        staffRole,
        businessUnits,
        title: title.trim() === '' ? null : title.trim(),
        active,
      }),
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    onSaved()
  }

  // Aperçu des droits du métier choisi, lu dans la même matrice que celle
  // appliquée par l'API : ce que l'écran annonce est ce que l'API appliquera.
  const capabilityPreview: ErpCapability[] = [...ERP_CAPABILITIES[staffRole]]

  return (
    <Modal
      open
      onClose={onClose}
      title={member.user.name ?? member.user.phone ?? 'Membre'}
      description="Métier, périmètre et activation."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="accent" onClick={submit} disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Métier"
          value={staffRole}
          onChange={(e) => setStaffRole(e.target.value as StaffRoleKey)}
          hint={STAFF_ROLE_HINTS[staffRole]}
        >
          {STAFF_ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {STAFF_ROLE_LABELS[r]}
            </option>
          ))}
        </Select>

        <TextInput
          label="Intitulé de poste"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Responsable grands comptes"
        />

        <BusinessUnitPicker value={businessUnits} onChange={setBusinessUnits} />

        <Field
          label="Accès à l’ERP"
          hint="Un membre désactivé perd tous ses droits sans perdre son historique."
        >
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => setActive(true)}
              className={`rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors ${
                active ? 'bg-ink text-white' : 'border border-border-strong bg-card text-ink'
              }`}
            >
              Actif
            </button>
            <button
              type="button"
              aria-pressed={!active}
              onClick={() => setActive(false)}
              className={`rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors ${
                !active ? 'bg-error-fg text-white' : 'border border-border-strong bg-card text-ink'
              }`}
            >
              Désactivé
            </button>
          </div>
        </Field>

        <div className="rounded-md border border-border bg-surface p-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Droits accordés ({capabilityPreview.length})
          </div>
          <ul className="space-y-1">
            {capabilityPreview.map((cap) => (
              <li key={cap} className="text-[12.5px] text-ink">
                <span className="mr-1.5 text-muted-2">→</span>
                {ERP_CAPABILITY_LABELS[cap]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
