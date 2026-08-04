'use client'

import { useCallback, useEffect, useState } from 'react'
import { ErpShell } from '@/components/erp/erp-shell'
import { useErp } from '@/components/erp/erp-context'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import {
  erpFetch,
  type ErpStaffMember,
  type ErpStaffCandidate,
} from '@/lib/erp-api'
import {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_HINTS,
  BUSINESS_UNITS,
  BUSINESS_UNIT_LABELS,
  hasCapability,
  type StaffRoleKey,
  type BusinessUnitKey,
} from 'shared/constants'
import type { ChipVariant } from '@/components/ui/chip'

// Écran « Paramètres → Équipe ».
//
// C'est le seul écran qui ouvre la console à quelqu'un : sans fiche, un compte
// n'a aucune capacité (sauf les ADMIN plateforme, par amorçage). Il est donc
// livré au lot 1 — sans lui, le filtrage par capacité serait intestable.
//
// On désactive, on ne supprime pas : la désactivation coupe l'accès en gardant
// l'historique du membre.

const ROLE_CHIP: Record<StaffRoleKey, ChipVariant> = {
  DIRECTION: 'oem',
  COMMERCIAL: 'occasion',
  COMPTABLE: 'status-ok',
  ACHETEUR: 'reusine',
  MAGASINIER: 'aftermarket',
  OPS_LOGISTIQUE: 'status-warn',
  SUPPORT: 'plain',
}

export default function ErpEquipePage() {
  const me = useErp()
  const canAdmin = hasCapability(me.capabilities, 'erp:admin')

  const [members, setMembers] = useState<ErpStaffMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [actif, setActif] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (actif) params.set('actif', actif)
    const res = await erpFetch<{ members: ErpStaffMember[] }>(`/staff?${params}`)
    if (res.ok) {
      setMembers(res.data.members)
      setError(null)
    } else {
      setError(res.message)
    }
  }, [q, actif])

  useEffect(() => {
    const timer = setTimeout(() => {
      void load()
    }, 250)
    return () => clearTimeout(timer)
  }, [load])

  async function patch(id: string, body: Record<string, unknown>, message: string) {
    const res = await erpFetch<unknown>(`/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setNotice(message)
      await load()
    } else {
      setError(res.message)
    }
  }

  return (
    <ErpShell
      me={me}
      eyebrow="Paramètres"
      title="Équipe"
      actions={
        canAdmin ? (
          <button
            type="button"
            onClick={() => setEnrolling((v) => !v)}
            className="rounded-sm bg-ink px-3 py-1.5 text-[13px] font-medium text-white hover:bg-ink-2"
          >
            {enrolling ? 'Fermer' : 'Enrôler un membre'}
          </button>
        ) : null
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-ink-2">
          {notice}
        </div>
      )}

      {enrolling && canAdmin && (
        <EnrollCard
          onDone={async (msg) => {
            setEnrolling(false)
            setNotice(msg)
            await load()
          }}
          onError={setError}
        />
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, téléphone, e-mail)"
          className="min-w-[16rem] flex-1 rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        />
        <select
          value={actif}
          onChange={(e) => setActif(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Désactivés</option>
        </select>
      </div>

      {!members ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Membre</Th>
                <Th>Métier</Th>
                <Th>Lignes d’activité</Th>
                <Th>Statut</Th>
                {canAdmin && <Th align="right">Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {members.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <span className="block font-medium text-ink">
                      {m.user.name ?? m.user.phone ?? '(sans nom)'}
                    </span>
                    <span className="block text-xs text-muted">
                      {m.title ?? '—'}
                      {m.user.phone ? ` · ${m.user.phone}` : ''}
                    </span>
                  </Td>
                  <Td>
                    {canAdmin ? (
                      <select
                        value={m.staffRole}
                        onChange={(e) =>
                          patch(
                            m.id,
                            { staffRole: e.target.value },
                            `Métier mis à jour : ${STAFF_ROLE_LABELS[e.target.value as StaffRoleKey]}.`,
                          )
                        }
                        className="rounded-sm border border-border-strong bg-surface px-2 py-1 text-[13px]"
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {STAFF_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Chip variant={ROLE_CHIP[m.staffRole]}>{STAFF_ROLE_LABELS[m.staffRole]}</Chip>
                    )}
                  </Td>
                  <Td className="text-xs">
                    {m.businessUnits.length > 0
                      ? m.businessUnits.map((b) => BUSINESS_UNIT_LABELS[b]).join(' · ')
                      : '—'}
                  </Td>
                  <Td>
                    <Chip variant={m.active ? 'status-ok' : 'plain'}>
                      {m.active ? 'Actif' : 'Désactivé'}
                    </Chip>
                  </Td>
                  {canAdmin && (
                    <Td align="right">
                      <button
                        type="button"
                        onClick={() =>
                          patch(
                            m.id,
                            { active: !m.active },
                            m.active
                              ? 'Membre désactivé — son historique est conservé.'
                              : 'Membre réactivé.',
                          )
                        }
                        className="rounded-sm border border-border-strong px-2 py-1 text-[12.5px] hover:bg-surface"
                      >
                        {m.active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </Td>
                  )}
                </Tr>
              ))}
              {members.length === 0 && (
                <Tr hover={false}>
                  <Td colSpan={canAdmin ? 5 : 4} align="center" className="py-6 text-muted">
                    Aucun membre enrôlé. Les administrateurs de la plateforme accèdent à la console
                    sans fiche — c’est l’amorçage, pas le régime cible.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      )}
    </ErpShell>
  )
}

/** Enrôlement : on part toujours d'un compte Pièces existant, jamais d'un inconnu. */
function EnrollCard({
  onDone,
  onError,
}: {
  onDone: (message: string) => void | Promise<void>
  onError: (message: string) => void
}) {
  const [q, setQ] = useState('')
  const [candidates, setCandidates] = useState<ErpStaffCandidate[]>([])
  const [picked, setPicked] = useState<ErpStaffCandidate | null>(null)
  const [role, setRole] = useState<StaffRoleKey>('SUPPORT')
  const [units, setUnits] = useState<BusinessUnitKey[]>([])
  const [title, setTitle] = useState('')

  // Sous deux caractères on ne touche pas à l'état : la liste affichée est
  // dérivée de `q` (voir `shown`). Un setState synchrone dans un effet
  // déclencherait un rendu en cascade.
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        const res = await erpFetch<{ candidates: ErpStaffCandidate[] }>(
          `/staff/candidats?q=${encodeURIComponent(term)}`,
        )
        if (cancelled) return
        setCandidates(res.ok ? res.data.candidates : [])
      })()
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  const term = q.trim()
  const shown = term.length >= 2 ? candidates : []

  async function submit() {
    if (!picked) return
    const res = await erpFetch<unknown>('/staff', {
      method: 'POST',
      body: JSON.stringify({
        userId: picked.id,
        staffRole: role,
        businessUnits: units,
        ...(title.trim() ? { title: title.trim() } : {}),
      }),
    })
    if (res.ok) {
      await onDone(`${picked.name ?? picked.phone ?? 'Le membre'} rejoint l’équipe.`)
    } else {
      onError(res.message)
    }
  }

  return (
    <div className="mb-5 rounded-md border border-border bg-card p-4">
      <h2 className="font-display text-lg text-ink">Enrôler un membre</h2>
      <p className="mt-1 text-[13px] text-muted">
        On enrôle un compte Pièces existant : cherchez la personne, puis choisissez son métier.
      </p>

      {!picked ? (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, téléphone ou e-mail"
            className="mt-3 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <div className="mt-2 divide-y divide-border">
            {shown.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setPicked(c)}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-surface"
              >
                <span className="text-[13.5px] text-ink">{c.name ?? '(sans nom)'}</span>
                <span className="text-[12px] text-muted">{c.phone ?? c.email ?? '—'}</span>
              </button>
            ))}
            {term.length >= 2 && shown.length === 0 && (
              <p className="py-3 text-[13px] text-muted">
                Aucun compte disponible. Les membres déjà enrôlés n’apparaissent pas.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-sm bg-surface px-3 py-2">
            <span className="text-[13.5px] text-ink">
              {picked.name ?? picked.phone ?? '(sans nom)'}
            </span>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-[12.5px] text-muted underline"
            >
              changer
            </button>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Métier
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRoleKey)}
              className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {STAFF_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] leading-snug text-muted">{STAFF_ROLE_HINTS[role]}</p>
          </div>

          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Lignes d’activité
            </span>
            <div className="mt-1 flex flex-wrap gap-2">
              {BUSINESS_UNITS.map((b) => {
                const on = units.includes(b)
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setUnits(on ? units.filter((u) => u !== b) : [...units, b])}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      on ? 'bg-ink text-white' : 'border border-border-strong bg-surface text-ink'
                    }`}
                  >
                    {BUSINESS_UNIT_LABELS[b]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Intitulé (facultatif)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Responsable achats"
              className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            className="rounded-sm bg-accent px-4 py-2 text-[13.5px] font-medium text-white hover:opacity-90"
          >
            Enrôler
          </button>
        </div>
      )}
    </div>
  )
}
