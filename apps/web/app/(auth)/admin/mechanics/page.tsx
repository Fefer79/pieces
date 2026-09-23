'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'

interface Mechanic {
  id: string
  name: string
  phone: string
  commune: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  avgRating: number | null
  reviewCount: number
}

interface SearchResponse {
  mechanics: Mechanic[]
  total: number
}

interface MechanicSuggestion {
  id: string
  name: string
  phone: string | null
  commune: string | null
  specialty: string | null
  note: string | null
  createdAt: string
}

interface SuggestionListResponse {
  suggestions: MechanicSuggestion[]
  total: number
}

// Modération de l'annuaire mécaniciens — auto-publié à l'inscription, cet
// écran est le filet de rattrapage a posteriori (signalement → suspension),
// pas un flux de validation préalable.
export default function AdminMechanicsPage() {
  const [q, setQ] = useState('')
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [suggestions, setSuggestions] = useState<MechanicSuggestion[]>([])
  const [suggestionsTotal, setSuggestionsTotal] = useState(0)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (q) params.set('q', q)
      const data = await adminFetch<SearchResponse>(`/mechanics?${params}`)
      setMechanics(data.mechanics)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [q])

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const data = await adminFetch<SuggestionListResponse>('/mechanics/suggestions?status=PENDING&limit=50')
      setSuggestions(data.suggestions)
      setSuggestionsTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  const handleApproveSuggestion = async (id: string) => {
    setBusyId(id)
    try {
      await adminFetch(`/mechanics/suggestions/${id}/approve`, { method: 'POST' })
      await Promise.all([loadSuggestions(), load()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusyId(null)
    }
  }

  const handleRejectSuggestion = async (id: string) => {
    const reason = window.prompt('Motif du rejet (optionnel) :') ?? undefined
    setBusyId(id)
    try {
      await adminFetch(`/mechanics/suggestions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      })
      await loadSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusyId(null)
    }
  }

  const handleSuspend = async (id: string) => {
    const reason = window.prompt('Motif de la suspension :')
    if (!reason) return
    setBusyId(id)
    try {
      await adminFetch(`/mechanics/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusyId(null)
    }
  }

  const handleReinstate = async (id: string) => {
    setBusyId(id)
    try {
      await adminFetch(`/mechanics/${id}/reinstate`, { method: 'POST' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Mécaniciens</h1>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-ink">
          Suggestions en attente {suggestionsTotal > 0 && `(${suggestionsTotal})`}
        </h2>
        {suggestionsLoading ? (
          <div className="text-sm text-muted">Chargement…</div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted">Aucune suggestion en attente.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Nom</Th>
                  <Th>Téléphone</Th>
                  <Th>Commune</Th>
                  <Th>Spécialité</Th>
                  <Th>Note</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {suggestions.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td className="text-xs">{s.phone ?? '—'}</Td>
                    <Td className="text-xs">{s.commune ?? '—'}</Td>
                    <Td className="text-xs">{s.specialty ?? '—'}</Td>
                    <Td className="max-w-xs truncate text-xs" title={s.note ?? undefined}>
                      {s.note ?? '—'}
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApproveSuggestion(s.id)}
                          disabled={busyId === s.id}
                          className="rounded-sm border border-border-strong px-2 py-1 text-xs hover:bg-surface disabled:opacity-40"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleRejectSuggestion(s.id)}
                          disabled={busyId === s.id}
                          className="rounded-sm border border-error-fg/30 px-2 py-1 text-xs text-error-fg hover:bg-error-bg disabled:opacity-40"
                        >
                          Rejeter
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      <div className="mb-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom…"
          className="w-full max-w-sm rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Nom</Th>
                  <Th>Téléphone</Th>
                  <Th>Commune</Th>
                  <Th>Statut</Th>
                  <Th align="right">Note</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {mechanics.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <Link
                        href={`https://mecanicien.pieces.ci/atelier/${m.id}`}
                        target="_blank"
                        className="font-medium text-ink-2 hover:underline"
                      >
                        {m.name}
                      </Link>
                    </Td>
                    <Td className="text-xs">{m.phone}</Td>
                    <Td className="text-xs">{m.commune ?? '—'}</Td>
                    <Td>
                      <Chip variant={m.status === 'ACTIVE' ? 'status-ok' : 'status-err'}>
                        {m.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                      </Chip>
                    </Td>
                    <Td num className="text-xs">
                      {m.avgRating != null ? `★ ${m.avgRating.toFixed(1)} (${m.reviewCount})` : '—'}
                    </Td>
                    <Td align="right">
                      {m.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleSuspend(m.id)}
                          disabled={busyId === m.id}
                          className="rounded-sm border border-error-fg/30 px-2 py-1 text-xs text-error-fg hover:bg-error-bg disabled:opacity-40"
                        >
                          Suspendre
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReinstate(m.id)}
                          disabled={busyId === m.id}
                          className="rounded-sm border border-border-strong px-2 py-1 text-xs hover:bg-surface disabled:opacity-40"
                        >
                          Réactiver
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
                {mechanics.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={6} align="center" className="py-6 text-muted">
                      Aucun mécanicien.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <p className="mt-3 text-sm text-muted">{total} mécanicien{total > 1 ? 's' : ''}</p>
        </>
      )}
    </div>
  )
}
