'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
  type EnterpriseMember,
} from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const ROLE_LABEL: Record<EnterpriseMember['role'], string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Manager',
  MECHANIC: 'Mécanicien',
  ACCOUNTANT: 'Comptable',
}

export default function EnterpriseMembersPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [members, setMembers] = useState<EnterpriseMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load(id: string) {
    setLoading(true)
    const res = await enterpriseFetch<EnterpriseMember[]>(`/${id}/members`)
    setLoading(false)
    if (!res.ok) { setError(res.message); return }
    setMembers(res.data)
  }

  useEffect(() => { if (enterpriseId) load(enterpriseId) }, [enterpriseId])

  async function handleRemove(memberId: string) {
    if (!enterpriseId) return
    if (!confirm('Retirer ce membre ?')) return
    const res = await enterpriseFetch(`/${enterpriseId}/members/${memberId}`, { method: 'DELETE' })
    if (!res.ok) { setError(res.message); return }
    load(enterpriseId)
  }

  if (!enterpriseId) {
    return (
      <div className="p-8 text-sm text-muted">
        Sélectionnez ou créez d'abord une entreprise depuis le{' '}
        <Link className="underline" href="/enterprise/dashboard">tableau de bord</Link>.
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Entreprise</div>
          <h1 className="mt-1 font-display text-3xl text-ink">Membres</h1>
          <p className="mt-1 text-sm text-muted">Gérez les mécaniciens et employés de votre entreprise.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
        >
          Inviter un membre
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Nom</Th>
              <Th>Rôle</Th>
              <Th>Téléphone</Th>
              <Th>Email</Th>
              <Th align="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && <Tr><Td colSpan={5} align="center" className="py-8 text-muted">Chargement…</Td></Tr>}
            {!loading && members.length === 0 && (
              <Tr><Td colSpan={5} align="center" className="py-12 text-muted">Aucun membre. Invitez-en un pour commencer.</Td></Tr>
            )}
            {members.map((m) => (
              <Tr key={m.id}>
                <Td className="text-ink">{m.user.name ?? '—'}</Td>
                <Td className="text-muted">{ROLE_LABEL[m.role]}</Td>
                <Td className="text-muted tabular">{m.user.phone ?? '—'}</Td>
                <Td className="text-muted">{m.user.email ?? '—'}</Td>
                <Td align="right">
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {showInvite && (
        <InviteMemberModal
          enterpriseId={enterpriseId}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); load(enterpriseId) }}
        />
      )}
    </div>
  )
}

function InviteMemberModal({
  enterpriseId, onClose, onInvited,
}: { enterpriseId: string; onClose: () => void; onInvited: () => void }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<EnterpriseMember['role']>('MECHANIC')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = { role }
    if (phone) payload.phone = phone
    if (email) payload.email = email

    const res = await enterpriseFetch(`/${enterpriseId}/members`, {
      method: 'POST', body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    onInvited()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl text-ink">Inviter un membre</h2>
        <p className="mb-4 text-xs text-muted">
          L'utilisateur doit déjà avoir un compte Pièces. Identifiez-le par téléphone ou email.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Téléphone</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+22507XXXXXXXX"
              className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm tabular"
            />
          </div>
          <div className="text-center text-xs text-muted">ou</div>
          <div>
            <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Rôle</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value as EnterpriseMember['role'])}
              className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="MECHANIC">Mécanicien — recherche et identification</option>
              <option value="MANAGER">Manager — gère véhicules et commandes</option>
              <option value="ACCOUNTANT">Comptable — exports financiers</option>
              <option value="OWNER">Propriétaire — accès total</option>
            </select>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted hover:bg-surface">
              Annuler
            </button>
            <button type="submit" disabled={submitting || (!phone && !email)} className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">
              {submitting ? 'Envoi…' : 'Inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
