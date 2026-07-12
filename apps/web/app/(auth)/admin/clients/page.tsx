'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { PredictiveSearch, type PredictiveItem } from '@/components/predictive-search'

interface Client {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  createdAt: string
  _count: { initiatedOrders: number }
}
interface ListResponse {
  users: Client[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function AdminClientsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (role) params.set('role', role)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/clients/list?${params}`).then(setData).catch((e) => setError(e.message))
  }, [q, role, page])

  useEffect(() => { load() }, [load])

  const fetchSuggestions = useCallback(async (term: string): Promise<PredictiveItem[]> => {
    const res = await adminFetch<{ suggestions: PredictiveItem[] }>(
      `/admin/suggest?entity=clients&q=${encodeURIComponent(term)}`,
    )
    return res.suggestions
  }, [])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-ink">Clients</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRegister((v) => !v)}
            className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
          >
            {showRegister ? 'Fermer' : '+ Utilisateur WhatsApp'}
          </button>
          <button onClick={() => downloadCsv('clients')} className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card">Export CSV</button>
        </div>
      </div>

      {showRegister && (
        <RegisterWhatsAppForm
          onDone={() => { setShowRegister(false); setPage(1); load() }}
        />
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <PredictiveSearch
          value={q}
          onChange={(v) => { setPage(1); setQ(v) }}
          fetchSuggestions={fetchSuggestions}
          placeholder="Rechercher (nom, téléphone, email)"
          className="flex-1 min-w-[200px]"
        />
        <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value) }} className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm">
          <option value="">Tous les rôles</option>
          <option value="MECHANIC">Mécanicien</option>
          <option value="OWNER">Propriétaire</option>
          <option value="SELLER">Vendeur</option>
          <option value="RIDER">Livreur</option>
          <option value="ENTERPRISE">Entreprise</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {error && <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>}
      {!data ? <div className="text-sm text-muted">Chargement…</div> : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Nom</Th>
                  <Th>Téléphone</Th>
                  <Th>Email</Th>
                  <Th>Rôles</Th>
                  <Th align="right">Commandes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.users.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <Link href={`/admin/clients/${u.id}`} className="text-ink-2 hover:underline">{u.name ?? '(sans nom)'}</Link>
                    </Td>
                    <Td className="text-xs">{u.phone ?? '—'}</Td>
                    <Td className="text-xs">{u.email ?? '—'}</Td>
                    <Td className="text-xs">{u.roles.join(', ')}</Td>
                    <Td num>{u._count.initiatedOrders}</Td>
                  </Tr>
                ))}
                {data.users.length === 0 && <Tr hover={false}><Td colSpan={5} align="center" className="py-6 text-muted">Aucun client.</Td></Tr>}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} clients · page {data.pagination.page}/{data.pagination.totalPages}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40">←</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface RegisterResult {
  id: string
  phone: string
  name: string | null
  roles: string[]
  alreadyExisted: boolean
}

/**
 * Enregistrement manuel d'un utilisateur WhatsApp (le bot n'étant pas encore
 * branché en prod). Le numéro est normalisé côté serveur — on accepte
 * +2250700000000 comme 0700000000.
 */
function RegisterWhatsAppForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim() || busy) return
    setBusy(true)
    setErr(null)
    setOk(null)
    try {
      const res = await adminFetch<RegisterResult>('/admin/clients/register-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim() || undefined }),
      })
      setOk(
        res.alreadyExisted
          ? `Déjà enregistré : ${res.phone}. Consentement mis à jour.`
          : `Enregistré : ${res.phone}${res.name ? ` (${res.name})` : ''}.`,
      )
      setPhone('')
      setName('')
      // Laisse le message visible un instant avant de rafraîchir la liste.
      setTimeout(onDone, 1200)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-md border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold text-ink">Enregistrer un utilisateur WhatsApp</h2>
      <p className="mt-1 text-xs text-muted">
        Pour ajouter une personne qui vous a écrit sur WhatsApp. Rôle Acheteur (Propriétaire) + consentement enregistré.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone (+2250700000000)"
          className="flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          autoFocus
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom (optionnel)"
          className="flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !phone.trim()}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      {err && <div className="mt-2 rounded-sm border border-error-fg/20 bg-error-bg p-2 text-xs text-error-fg">{err}</div>}
      {ok && <div className="mt-2 rounded-sm border border-accent/20 bg-accent/5 p-2 text-xs text-ink">{ok}</div>}
    </form>
  )
}
