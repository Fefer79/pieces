'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'
import { ABIDJAN_COMMUNES, MECHANIC_SPECIALTIES, type MechanicSpecialty } from 'shared/constants'

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
  address: string | null
  lat: number | null
  lng: number | null
  specialty: string | null
  note: string | null
  photo: string | null
  suggestedById: string | null
  createdAt: string
}

interface SuggestionEditForm {
  name: string
  phone: string
  commune: string
  address: string
  lat: string
  lng: string
  specialty: MechanicSpecialty | ''
  note: string
  photo: string | null
}

function toEditForm(s: MechanicSuggestion): SuggestionEditForm {
  return {
    name: s.name,
    phone: s.phone ?? '',
    commune: s.commune ?? '',
    address: s.address ?? '',
    lat: s.lat != null ? String(s.lat) : '',
    lng: s.lng != null ? String(s.lng) : '',
    specialty: (s.specialty as MechanicSpecialty) ?? '',
    note: s.note ?? '',
    photo: s.photo,
  }
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

  const [editing, setEditing] = useState<MechanicSuggestion | null>(null)
  const [editForm, setEditForm] = useState<SuggestionEditForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  const openSuggestionDetails = (s: MechanicSuggestion) => {
    setEditing(s)
    setEditForm(toEditForm(s))
    setEditError(null)
  }

  const closeSuggestionDetails = () => {
    setEditing(null)
    setEditForm(null)
    setEditError(null)
  }

  // Renvoie la suggestion mise à jour (ou null en cas d'échec) — utilisé à la
  // fois par « Enregistrer » et par « Enregistrer et approuver ».
  const saveSuggestionEdits = async (): Promise<MechanicSuggestion | null> => {
    if (!editing || !editForm) return null
    setSavingEdit(true)
    setEditError(null)
    try {
      const lat = editForm.lat.trim() ? Number(editForm.lat.trim()) : undefined
      const lng = editForm.lng.trim() ? Number(editForm.lng.trim()) : undefined
      const updated = await adminFetch<MechanicSuggestion>(`/mechanics/suggestions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || undefined,
          commune: editForm.commune || undefined,
          address: editForm.address.trim() || undefined,
          lat,
          lng,
          specialty: editForm.specialty || undefined,
          note: editForm.note.trim() || undefined,
          photo: editForm.photo,
        }),
      })
      setEditing(updated)
      setEditForm(toEditForm(updated))
      setSuggestions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      return updated
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Erreur')
      return null
    } finally {
      setSavingEdit(false)
    }
  }

  const handleApproveFromModal = async () => {
    const saved = await saveSuggestionEdits()
    if (!saved) return
    await handleApproveSuggestion(saved.id)
    closeSuggestionDetails()
  }

  const handleRejectFromModal = async () => {
    if (!editing) return
    await handleRejectSuggestion(editing.id)
    closeSuggestionDetails()
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
                          onClick={() => openSuggestionDetails(s)}
                          disabled={busyId === s.id}
                          className="rounded-sm border border-border-strong px-2 py-1 text-xs hover:bg-surface disabled:opacity-40"
                        >
                          Détails / Modifier
                        </button>
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
                        href={`https://pieces.ci/mecaniciens/atelier/${m.id}`}
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

      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">Suggestion — {editing.name}</h2>
              <button onClick={closeSuggestionDetails} className="text-sm text-muted hover:text-ink">
                Fermer
              </button>
            </div>

            {editError && (
              <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-2 text-xs text-error-fg">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              {editForm.photo && (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editForm.photo}
                    alt=""
                    className="h-20 w-20 rounded-md border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => (f ? { ...f, photo: null } : f))}
                    className="text-xs font-medium text-error-fg hover:underline"
                  >
                    Retirer la photo
                  </button>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Nom</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Téléphone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, phone: e.target.value.replace(/[^\d+]/g, '') } : f,
                    )
                  }
                  className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Commune</label>
                  <select
                    value={editForm.commune}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, commune: e.target.value } : f))}
                    className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                  >
                    <option value="">—</option>
                    {ABIDJAN_COMMUNES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Adresse</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, address: e.target.value } : f))}
                    className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Latitude</label>
                  <input
                    type="text"
                    value={editForm.lat}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, lat: e.target.value } : f))}
                    className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Longitude</label>
                  <input
                    type="text"
                    value={editForm.lng}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, lng: e.target.value } : f))}
                    className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>
              {editForm.lat && editForm.lng && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${editForm.lat}&mlon=${editForm.lng}#map=16/${editForm.lat}/${editForm.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs font-medium text-accent hover:underline"
                >
                  Voir le point sur la carte →
                </a>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Spécialité</label>
                <select
                  value={editForm.specialty}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, specialty: e.target.value as MechanicSpecialty | '' } : f,
                    )
                  }
                  className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {MECHANIC_SPECIALTIES.map((sp) => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Note</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, note: e.target.value } : f))}
                  rows={3}
                  className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm"
                />
              </div>

              <p className="text-xs text-muted">
                Proposée {editing.suggestedById ? 'par un utilisateur connecté' : 'anonymement'} le{' '}
                {new Date(editing.createdAt).toLocaleDateString('fr-CI')}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={saveSuggestionEdits}
                disabled={savingEdit || busyId === editing.id}
                className="rounded-sm border border-border-strong px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-40"
              >
                Enregistrer
              </button>
              <button
                onClick={handleRejectFromModal}
                disabled={savingEdit || busyId === editing.id}
                className="rounded-sm border border-error-fg/30 px-3 py-1.5 text-xs text-error-fg hover:bg-error-bg disabled:opacity-40"
              >
                Rejeter
              </button>
              <button
                onClick={handleApproveFromModal}
                disabled={savingEdit || busyId === editing.id}
                className="rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
              >
                Enregistrer et approuver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
