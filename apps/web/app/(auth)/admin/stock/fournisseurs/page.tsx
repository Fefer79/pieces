'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { stockFetch, type SupplierList } from '@/lib/stock-api'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { SupplierFormCard } from '@/components/stock/supplier-form-card'

export default function StockFournisseursPage() {
  const [data, setData] = useState<SupplierList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [actif, setActif] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (qDebounced) params.set('q', qDebounced)
    if (actif) params.set('actif', actif)
    params.set('page', String(page))
    stockFetch<SupplierList>(`/suppliers?${params}`).then((res) => {
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
    load()
  }, [load])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, pays, ville)…"
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
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
        >
          {showCreate ? 'Fermer' : '+ Nouveau fournisseur'}
        </button>
      </div>

      {showCreate && (
        <SupplierFormCard
          title="Nouveau fournisseur"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            load()
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
                  <Th>Nom</Th>
                  <Th>Localisation</Th>
                  <Th>Contact</Th>
                  <Th>Devise</Th>
                  <Th align="right">Délai typique</Th>
                  <Th align="right">Bons</Th>
                  <Th>Statut</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.suppliers.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link
                        href={`/admin/stock/fournisseurs/${s.id}`}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {s.nom}
                      </Link>
                    </Td>
                    <Td className="text-sm">
                      {[s.ville, s.pays].filter(Boolean).join(', ') || '—'}
                    </Td>
                    <Td className="text-sm">
                      {s.contactName ?? '—'}
                      {s.telephone && (
                        <div className="font-mono text-xs text-muted">{s.telephone}</div>
                      )}
                    </Td>
                    <Td className="font-mono text-sm">{s.devise}</Td>
                    <Td num>{s.delaiTypiqueJours != null ? `${s.delaiTypiqueJours} j` : '—'}</Td>
                    <Td num>{s._count?.purchaseOrders ?? 0}</Td>
                    <Td>
                      <Chip variant={s.actif ? 'status-ok' : 'plain'}>
                        {s.actif ? 'Actif' : 'Inactif'}
                      </Chip>
                    </Td>
                  </Tr>
                ))}
                {data.suppliers.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={7} align="center" className="py-6 text-muted">
                      Aucun fournisseur.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} fournisseurs · page {data.page}/
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
