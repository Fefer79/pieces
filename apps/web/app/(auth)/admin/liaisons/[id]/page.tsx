'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface LiaisonDetail {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  activeContext: string | null
  createdAt: string
  managedVendors: Array<{
    id: string
    shopName: string
    contactName: string
    phone: string
    status: string
    commune: string | null
    createdAt: string
    _count: { catalogItems: number }
  }>
  liaisonCatalogItems: Array<{
    id: string
    name: string | null
    price: number | null
    commissionAmount: number | null
    commissionAcceptedAt: string | null
    status: string
    createdAt: string
    vendor: { id: string; shopName: string }
  }>
}

interface ActivityItem {
  id: string
  action: string
  targetType: string
  targetId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

interface ActivityResponse {
  items: ActivityItem[]
  total: number
  page: number
  totalPages: number
}

const ACTION_LABELS: Record<string, string> = {
  LIAISON_VENDOR_CREATED: 'Vendeur créé',
  LIAISON_VENDOR_UPDATED: 'Vendeur modifié',
  LIAISON_PART_CREATED: 'Pièce ajoutée',
  LIAISON_PART_UPDATED: 'Pièce modifiée',
  LIAISON_COMMISSION_ACCEPTED: 'Commission agréée',
}

export default function AdminLiaisonDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<LiaisonDetail | null>(null)
  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    adminFetch<LiaisonDetail>(`/admin/liaisons/${id}`).then(setData).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    adminFetch<ActivityResponse>(`/admin/liaisons/${id}/activity?page=${page}`)
      .then(setActivity)
      .catch(() => {})
  }, [id, page])

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <Link href="/admin/liaisons" className="text-sm text-ink-2 hover:underline">
          ← Retour
        </Link>
        <div className="mt-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-4 lg:p-6 text-sm text-muted">Chargement…</div>
  }

  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/liaisons" className="text-sm text-ink-2 hover:underline">
        ← Retour
      </Link>

      <header className="mt-2 mb-6">
        <h1 className="font-display text-2xl text-ink">{data.name ?? '(sans nom)'}</h1>
        <p className="mt-1 text-sm text-muted">
          {data.phone ?? '—'}
          {data.email ? ` · ${data.email}` : ''}
        </p>
        <p className="mt-1 text-xs text-muted">
          Rôles : {data.roles.join(', ')} · Contexte actif : {data.activeContext ?? '—'} · Membre depuis{' '}
          {new Date(data.createdAt).toLocaleDateString('fr-FR')}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg text-ink">
          Vendeurs gérés ({data.managedVendors.length})
        </h2>
        {data.managedVendors.length === 0 ? (
          <p className="text-sm text-muted">Aucun vendeur géré.</p>
        ) : (
          <div className="rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Boutique</Th>
                  <Th>Contact</Th>
                  <Th>Commune</Th>
                  <Th>Statut</Th>
                  <Th align="right">Pièces</Th>
                  <Th align="right">Créé le</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.managedVendors.map((v) => (
                  <Tr key={v.id}>
                    <Td>{v.shopName}</Td>
                    <Td className="text-xs">
                      {v.contactName} · {v.phone}
                    </Td>
                    <Td className="text-xs">{v.commune ?? '—'}</Td>
                    <Td className="text-xs">{v.status}</Td>
                    <Td num>{v._count.catalogItems}</Td>
                    <Td num className="text-xs">
                      {new Date(v.createdAt).toLocaleDateString('fr-FR')}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg text-ink">
          Pièces saisies (50 dernières · {data.liaisonCatalogItems.length})
        </h2>
        {data.liaisonCatalogItems.length === 0 ? (
          <p className="text-sm text-muted">Aucune pièce saisie.</p>
        ) : (
          <div className="rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Pièce</Th>
                  <Th>Vendeur</Th>
                  <Th align="right">Prix</Th>
                  <Th align="right">Commission</Th>
                  <Th>Agréée</Th>
                  <Th>Statut</Th>
                  <Th align="right">Créée le</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.liaisonCatalogItems.map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.name ?? '—'}</Td>
                    <Td className="text-xs">{p.vendor.shopName}</Td>
                    <Td num>
                      {p.price != null ? `${p.price.toLocaleString('fr-FR')} F` : '—'}
                    </Td>
                    <Td num>
                      {p.commissionAmount != null
                        ? `${p.commissionAmount.toLocaleString('fr-FR')} F`
                        : '—'}
                    </Td>
                    <Td className="text-xs">
                      {p.commissionAcceptedAt ? (
                        <span className="text-[#148C50]">✓</span>
                      ) : (
                        <span className="text-accent">⏳</span>
                      )}
                    </Td>
                    <Td className="text-xs">{p.status}</Td>
                    <Td num className="text-xs">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Journal d&apos;activité</h2>
        {!activity ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : activity.items.length === 0 ? (
          <p className="text-sm text-muted">Aucune activité enregistrée.</p>
        ) : (
          <>
            <div className="rounded-md border border-border bg-card">
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Date</Th>
                    <Th>Action</Th>
                    <Th>Cible</Th>
                    <Th>Détails</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {activity.items.map((a) => (
                    <Tr key={a.id} className="align-top">
                      <Td className="text-xs whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString('fr-FR')}
                      </Td>
                      <Td className="text-xs">
                        {ACTION_LABELS[a.action] ?? a.action}
                      </Td>
                      <Td className="text-xs">
                        {a.targetType}
                        {a.targetId ? ` · ${a.targetId.slice(0, 8)}…` : ''}
                      </Td>
                      <Td className="text-[11px] font-mono text-muted-2">
                        {a.payload ? JSON.stringify(a.payload) : '—'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
              <div>
                {activity.total} entrée{activity.total > 1 ? 's' : ''} · page {activity.page}/
                {activity.totalPages}
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
                  disabled={page >= activity.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
