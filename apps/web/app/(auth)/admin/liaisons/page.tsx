'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface ActivityBreakdownItem {
  action: string
  count: number
}

interface LastActivity {
  action: string
  createdAt: string
}

interface LiaisonRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  activeContext: string | null
  createdAt: string
  lastActivity: LastActivity | null
  activityBreakdown: ActivityBreakdownItem[]
  stats: {
    vendors: number
    parts: number
    activities: number
    pendingAcceptance: number
  }
}

const ACTION_LABELS: Record<string, string> = {
  LIAISON_VENDOR_CREATED: 'Vendeur créé',
  LIAISON_VENDOR_UPDATED: 'Vendeur modifié',
  LIAISON_PART_CREATED: 'Pièce ajoutée',
  LIAISON_QUICK_PART_CREATED: 'Pièce rapide',
  LIAISON_PART_UPDATED: 'Pièce modifiée',
  LIAISON_COMMISSION_ACCEPTED: 'Commission agréée',
}

export default function AdminLiaisonsPage() {
  const [data, setData] = useState<LiaisonRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<LiaisonRow[]>('/admin/liaisons').then(setData).catch((e) => setError(e.message))
  }, [])

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-1 font-display text-2xl text-ink">Liaisons</h1>
      <p className="mb-4 text-sm text-muted">
        Vue d&apos;ensemble des utilisateurs avec le rôle LIAISON et leur activité.
      </p>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Nom</Th>
                <Th>Contact</Th>
                <Th align="right">Vendeurs</Th>
                <Th align="right">Pièces</Th>
                <Th align="right">À agréer</Th>
                <Th align="right">Actions</Th>
                <Th>Dernière activité</Th>
                <Th>Répartition des actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <Link href={`/admin/liaisons/${l.id}`} className="text-ink-2 hover:underline">
                      {l.name ?? '(sans nom)'}
                    </Link>
                  </Td>
                  <Td className="text-xs">
                    {l.phone ?? '—'}
                    {l.email ? ` · ${l.email}` : ''}
                  </Td>
                  <Td num>{l.stats.vendors}</Td>
                  <Td num>{l.stats.parts}</Td>
                  <Td
                    num
                    className={l.stats.pendingAcceptance > 0 ? 'text-accent font-semibold' : ''}
                  >
                    {l.stats.pendingAcceptance}
                  </Td>
                  <Td num>{l.stats.activities}</Td>
                  <Td className="text-xs whitespace-nowrap">
                    {l.lastActivity ? (
                      <>
                        <span className="text-ink-2">{ACTION_LABELS[l.lastActivity.action] ?? l.lastActivity.action}</span>
                        <br />
                        <span className="text-muted-2">{new Date(l.lastActivity.createdAt).toLocaleDateString('fr-FR')}</span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td className="text-xs">
                    {l.activityBreakdown.length > 0 ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {l.activityBreakdown.slice(0, 4).map((b) => (
                          <span key={b.action}>
                            <span className="font-medium text-ink-2">{b.count}</span>{' '}
                            <span className="text-muted-2">{ACTION_LABELS[b.action] ?? b.action}</span>
                          </span>
                        ))}
                        {l.activityBreakdown.length > 4 && (
                          <span className="text-muted-2">+{l.activityBreakdown.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
              {data.length === 0 && (
                <Tr hover={false}>
                  <Td colSpan={8} align="center" className="py-6 text-muted">
                    Aucun Liaison.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
