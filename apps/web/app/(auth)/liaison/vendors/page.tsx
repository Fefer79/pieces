'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { liaisonFetch } from '@/lib/liaison-api'

interface VendorListItem {
  id: string
  shopName: string
  contactName: string
  phone: string
  status: string
  commune: string | null
  catalogCount: number
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_ACTIVATION: 'En attente',
  ACTIVE: 'Actif',
  PAUSED: 'Pausé',
}

export default function LiaisonVendorsPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    liaisonFetch<VendorListItem[]>('/vendors').then((r) => {
      if (r.ok) setVendors(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Mes vendeurs</h1>
          <p className="mt-1 text-sm text-muted">
            {vendors.length} vendeur{vendors.length > 1 ? 's' : ''} onboardé
            {vendors.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/liaison/vendors/new"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white"
          style={{ minHeight: 44 }}
        >
          + Onboarder
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && vendors.length === 0 && !error && (
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted">Aucun vendeur onboardé pour le moment.</p>
          <Link
            href="/liaison/vendors/new"
            className="mt-2 inline-block text-sm font-medium text-ink-2 hover:underline"
          >
            Onboarder le premier
          </Link>
        </div>
      )}

      {vendors.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {vendors.map((v) => (
            <li key={v.id}>
              <Link
                href={`/liaison/vendors/${v.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface"
                style={{ minHeight: 60 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{v.shopName}</p>
                  <p className="truncate text-xs text-muted">
                    {v.contactName} · {v.phone}
                    {v.commune ? ` · ${v.commune}` : ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      v.status === 'ACTIVE'
                        ? 'bg-[rgba(20,140,80,0.12)] text-[#148C50]'
                        : 'bg-[rgba(255,107,0,0.12)] text-accent'
                    }`}
                  >
                    {STATUS_LABELS[v.status] ?? v.status}
                  </span>
                  <span className="text-[11px] text-muted-2">
                    {v.catalogCount} pièce{v.catalogCount > 1 ? 's' : ''}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
