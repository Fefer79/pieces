'use client'

import { useState } from 'react'
import { equipeFetch, type TeamMemberProfile } from '@/lib/equipe-api'
import {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  capabilitiesFor,
  ERP_CAPABILITY_LABELS,
  type StaffRoleKey,
} from 'shared/constants'

/**
 * Formulaire de profil membre partagé (création ou édition — l'API upserte) :
 * rôle métier, fonction, taux de commission, date d'embauche, activation.
 *
 * Le rôle métier est ce qui ouvre le back-office : on affiche donc en clair ce
 * qu'il autorise, plutôt que de laisser deviner les conséquences d'un choix
 * dans une liste déroulante.
 */
export function ProfileFormCard({
  userId,
  initial,
  onSaved,
  onClose,
}: {
  userId: string
  initial?: TeamMemberProfile | null
  onSaved: () => void
  onClose?: () => void
}) {
  const [fonction, setFonction] = useState(initial?.fonction ?? '')
  const [staffRole, setStaffRole] = useState<StaffRoleKey | ''>(initial?.staffRole ?? '')
  const [taux, setTaux] = useState(String(initial?.tauxCommissionPct ?? 10))
  const [embaucheLe, setEmbaucheLe] = useState(initial?.embaucheLe?.slice(0, 10) ?? '')
  const [actif, setActif] = useState(initial?.actif ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const tauxNum = Number.parseInt(taux, 10)
    if (!Number.isInteger(tauxNum) || tauxNum < 0 || tauxNum > 100 || busy) return
    setBusy(true)
    setError(null)
    const res = await equipeFetch(`/members/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        fonction: fonction.trim() || null,
        staffRole: staffRole || null,
        tauxCommissionPct: tauxNum,
        actif,
        embaucheLe: embaucheLe ? new Date(`${embaucheLe}T00:00:00Z`).toISOString() : null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onSaved()
  }

  const tauxNum = Number.parseInt(taux, 10)
  const tauxValid = Number.isInteger(tauxNum) && tauxNum >= 0 && tauxNum <= 100

  // Aperçu des droits ouverts par le rôle choisi, en clair.
  const capabilities = staffRole ? capabilitiesFor({ staffRole, active: actif }) : []

  return (
    <div className="mb-4 rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Profil membre
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        )}
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Rôle métier
          <select
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as StaffRoleKey | '')}
            className="ml-1 rounded-sm border border-border-strong bg-surface px-2 py-2 text-sm text-ink"
          >
            <option value="">Aucun (pas d’accès back-office)</option>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {STAFF_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <input
          value={fonction}
          onChange={(e) => setFonction(e.target.value)}
          placeholder="Fonction (ex. Liaison terrain — Abidjan Nord)"
          className="min-w-[220px] flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <label className="text-xs text-muted">
          Taux %
          <input
            value={taux}
            onChange={(e) => setTaux(e.target.value)}
            inputMode="numeric"
            aria-label="Taux de commission en pourcent"
            className="ml-1 w-20 rounded-sm border border-border-strong bg-surface px-2 py-2 text-center font-mono text-sm"
          />
        </label>
        <label className="text-xs text-muted">
          Embauche
          <input
            type="date"
            value={embaucheLe}
            onChange={(e) => setEmbaucheLe(e.target.value)}
            className="ml-1 rounded-sm border border-border-strong bg-surface px-2 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-ink">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
          Actif
        </label>
        <button
          type="submit"
          disabled={busy || !tauxValid}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer le profil'}
        </button>
      </form>
      {capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {capabilities.map((c) => (
            <span
              key={c}
              className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-muted"
            >
              {ERP_CAPABILITY_LABELS[c]}
            </span>
          ))}
        </div>
      )}
      {staffRole && !actif && (
        <p className="mt-2 text-xs text-muted">
          Profil désactivé : le rôle est conservé mais n’ouvre aucun accès.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-error-fg">{error}</p>}
    </div>
  )
}
