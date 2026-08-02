'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv, fmtFcfa } from '@/lib/admin-api'
import { partStockChipOf, partStockStatus } from '@/lib/stock-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { PredictiveSearch, type PredictiveItem } from '@/components/predictive-search'
import { PartThumb } from '@/components/ui/part-thumb'
import { CategoryCascadeSelect } from '@/components/ui/category-select'

interface Item {
  id: string
  name: string | null
  category: string | null
  price: number | null
  commissionAmount: number | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  inStock: boolean
  stockQuantity: number | null
  lowStockThreshold: number
  createdAt: string
  vendor: { id: string; shopName: string }
  photos: { urlThumb: string | null; urlOriginal: string }[]
}

interface ListResponse {
  items: Item[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// Seul l'admin Pièces conserve la suggestion par vendeur.
const PART_BADGES = {
  part: { label: 'Pièce', className: 'text-ink-2 bg-surface' },
  brand: { label: 'Marque', className: 'text-accent bg-accent/10' },
  vendor: { label: 'Vendeur', className: 'text-ink bg-card' },
}

export default function AdminPartsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  // Filtre stock client-side (la liste admin n'a pas de filtre serveur dédié :
  // il s'applique à la page affichée, les compteurs viennent déjà avec chaque item).
  const [stockFilter, setStockFilter] = useState('')
  // Suppression : id en attente de confirmation, puis id en cours de suppression.
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (category) params.set('category', category)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/catalog/list?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [q, status, category, page])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      await adminFetch(`/admin/catalog/${id}`, { method: 'DELETE' })
      setConfirmId(null)
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((it) => it.id !== id),
              pagination: { ...prev.pagination, total: Math.max(0, prev.pagination.total - 1) },
            }
          : prev,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    } finally {
      setDeletingId(null)
    }
  }

  const fetchSuggestions = useCallback(async (term: string): Promise<PredictiveItem[]> => {
    const res = await adminFetch<{ suggestions: PredictiveItem[] }>(
      `/admin/catalog/suggest?q=${encodeURIComponent(term)}`,
    )
    return res.suggestions
  }, [])

  // Le filtre statut stock n'existe pas côté API : il s'applique à la page affichée.
  const displayedItems = data
    ? stockFilter
      ? data.items.filter((it) => partStockStatus(it) === stockFilter)
      : data.items
    : []

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Pièces</h1>
        <button
          onClick={() => downloadCsv('catalog')}
          className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <PredictiveSearch
          value={q}
          onChange={(v) => {
            setPage(1)
            setQ(v)
          }}
          fetchSuggestions={fetchSuggestions}
          badges={PART_BADGES}
          placeholder="Rechercher (nom, catégorie, OEM, marque, vendeur…)"
          className="min-w-[200px] flex-1"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PUBLISHED">Publié</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <div className="min-w-[180px]">
          <CategoryCascadeSelect
            value={category}
            onChange={(v) => {
              setPage(1)
              setCategory(v)
            }}
            className="w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
            categoryPlaceholder="Toutes les catégories"
            subcategoryPlaceholder="Toutes les sous-catégories"
          />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
          title="Filtre appliqué à la page affichée"
        >
          <option value="">Tout le stock</option>
          <option value="rupture">Rupture</option>
          <option value="bas">Stock bas</option>
          <option value="ok">Stock OK</option>
          <option value="non-suivi">Non suivi</option>
        </select>
      </div>

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
                  <Th>Photo</Th>
                  <Th>Nom</Th>
                  <Th>Vendeur</Th>
                  <Th align="right">Prix</Th>
                  <Th align="right">Commission</Th>
                  <Th>Stock</Th>
                  <Th>Statut</Th>
                  <Th align="right"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedItems.map((it) => {
                  const src = it.photos[0]?.urlThumb ?? it.photos[0]?.urlOriginal
                  const stockChip = partStockChipOf(it)
                  return (
                    <Tr key={it.id}>
                      <Td>
                        <div className="h-10 w-10 overflow-hidden rounded-sm bg-surface">
                          <PartThumb src={src} alt={it.name} />
                        </div>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/catalog/${it.id}`}
                          className="font-medium text-ink hover:text-accent hover:underline"
                        >
                          {it.name ?? '—'}
                        </Link>
                        <div className="text-xs text-muted">{it.category ?? ''}</div>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/vendors/${it.vendor.id}`}
                          className="text-ink-2 hover:underline"
                        >
                          {it.vendor.shopName}
                        </Link>
                      </Td>
                      <Td num>{fmtFcfa(it.price)}</Td>
                      <Td num>{fmtFcfa(it.commissionAmount)}</Td>
                      <Td>
                        <Chip variant={stockChip.variant}>{stockChip.label}</Chip>
                      </Td>
                      <Td>
                        {it.status === 'PUBLISHED' && <Chip variant="status-ok">Publié</Chip>}
                        {it.status === 'DRAFT' && <Chip variant="status-warn">Brouillon</Chip>}
                        {it.status === 'ARCHIVED' && <Chip variant="plain">Archivé</Chip>}
                      </Td>
                      <Td align="right">
                        {confirmId === it.id ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(it.id)}
                              disabled={deletingId === it.id}
                              className="rounded-sm bg-error-fg px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                              {deletingId === it.id ? 'Suppression…' : 'Confirmer'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              disabled={deletingId === it.id}
                              className="rounded-sm border border-border-strong px-2 py-1 text-xs hover:bg-surface disabled:opacity-50"
                            >
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(it.id)}
                            className="rounded-sm border border-border-strong px-2 py-1 text-xs text-error-fg hover:border-error-fg hover:bg-error-bg"
                          >
                            Effacer
                          </button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
                {displayedItems.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={8} align="center" className="py-6 text-muted">
                      Aucune pièce.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.pagination.total} pièces · page {data.pagination.page}/
              {data.pagination.totalPages}
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
                disabled={page >= data.pagination.totalPages}
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
