'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  equipeFetch,
  fmtFcfa,
  type EquipeMember,
  type EquipeMemberList,
  type EquipeOverview,
} from '@/lib/equipe-api'
import { formatPeriode } from '@/lib/equipe-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { ProfileFormCard } from '@/components/equipe/profile-form-card'

export default function EquipeMembresPage() {
  const [overview, setOverview] = useState<EquipeOverview | null>(null)
  const [data, setData] = useState<EquipeMemberList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [actif, setActif] = useState('')
  const [page, setPage] = useState(1)

  const [editing, setEditing] = useState<EquipeMember | null>(null)

  const loadOverview = useCallback(() => {
    equipeFetch<EquipeOverview>('/overview').then((res) => {
      if (res.ok) setOverview(res.data)
    })
  }, [])

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (qDebounced) params.set('q', qDebounced)
    if (actif) params.set('actif', actif)
    params.set('page', String(page))
    equipeFetch<EquipeMemberList>(`/members?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [qDebounced, actif, page])

  // Recherche débouncée : évite un appel par frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setQDebounced(q.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Membres actifs" value={overview?.membresActifs ?? '…'} />
        <StatCard
          label={`Commissions dues · ${overview ? formatPeriode(overview.periode) : '…'}`}
          value={overview ? fmtFcfa(overview.commissionsDues.montantFcfa) : '…'}
          delta={overview ? `${overview.commissionsDues.count} commission(s)` : undefined}
        />
        <StatCard
          label="Payées depuis janvier"
          value={overview ? fmtFcfa(overview.commissionsPayeesAnnee.montantFcfa) : '…'}
          delta={overview ? `${overview.commissionsPayeesAnnee.count} commission(s)` : undefined}
        />
        <StatCard
          label="Objectifs < 50 %"
          value={overview ? overview.objectifsSous50 : '…'}
          delta={overview ? (overview.miMois ? 'à mi-mois' : 'mesuré à mi-mois') : undefined}
        />
        <StatCard label="Activité équipe 7 j" value={overview?.activites7j ?? '…'} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, téléphone)…"
          className="min-w-[200px] flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <select
          value={actif}
          onChange={(e) => {
            setPage(1)
            setActif(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {editing && (
        <ProfileFormCard
          userId={editing.id}
          initial={editing.profil}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
            loadOverview()
          }}
        />
      )}

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
                  <Th>Membre</Th>
                  <Th align="right">Vendeurs gérés</Th>
                  <Th align="right">Activité 7 j</Th>
                  <Th align="right">Commission du mois (estimée)</Th>
                  <Th align="right">Objectifs</Th>
                  <Th>Statut</Th>
                  <Th align="right"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.members.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <Link
                        href={`/admin/equipe/${m.id}`}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {m.name ?? '—'}
                      </Link>
                      <div className="text-xs text-muted">
                        {m.profil?.fonction ?? 'Profil non créé'}
                        {m.phone ? ` · ${m.phone}` : ''}
                      </div>
                    </Td>
                    <Td num>{m.vendeursGeres}</Td>
                    <Td num>
                      {m.activite7j}
                      {m.tachesEnRetard > 0 && (
                        <div className="text-xs text-error-fg">
                          {m.tachesEnRetard} tâche(s) en retard
                        </div>
                      )}
                    </Td>
                    <Td num>
                      {fmtFcfa(m.commissionMois.montantFcfa)}
                      <div className="text-xs text-muted">
                        {m.commissionMois.tauxPct} % de {fmtFcfa(m.commissionMois.baseFcfa)}
                      </div>
                    </Td>
                    <Td num>
                      {m.objectifsMois.atteints}/{m.objectifsMois.total}
                    </Td>
                    <Td>
                      {m.profil && !m.profil.actif ? (
                        <Chip variant="plain">Inactif</Chip>
                      ) : (
                        <Chip variant="status-ok">Actif</Chip>
                      )}
                    </Td>
                    <Td align="right">
                      <button
                        onClick={() => setEditing(m)}
                        className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-surface"
                      >
                        Profil
                      </button>
                    </Td>
                  </Tr>
                ))}
                {data.members.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={7} align="center" className="py-6 text-muted">
                      Aucun membre. Les comptes avec le rôle Liaison apparaissent ici.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} membres · page {data.page}/
              {Math.max(1, Math.ceil(data.total / data.limit))}
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
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
