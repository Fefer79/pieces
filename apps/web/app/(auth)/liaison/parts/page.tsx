'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { liaisonFetch } from '@/lib/liaison-api'

interface PartItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  price: number | null
  status: string
  inStock: boolean
  imageThumbUrl: string | null
  createdAt: string
  vendor: {
    id: string
    shopName: string
    contactName: string
    phone: string
    commune: string | null
    address: string | null
    lat: number | null
    lng: number | null
  }
}

export default function LiaisonPartsPage() {
  const [parts, setParts] = useState<PartItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [vendorFilter, setVendorFilter] = useState<string>('')

  useEffect(() => {
    liaisonFetch<PartItem[]>('/parts').then((r) => {
      if (r.ok) setParts(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [])

  const vendors = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of parts) map.set(p.vendor.id, p.vendor.shopName)
    return Array.from(map, ([id, shopName]) => ({ id, shopName })).sort((a, b) =>
      a.shopName.localeCompare(b.shopName),
    )
  }, [parts])

  const filtered = vendorFilter
    ? parts.filter((p) => p.vendor.id === vendorFilter)
    : parts

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-ink">Mes pièces saisies</h1>
        <p className="mt-1 text-sm text-muted">
          {parts.length} pièce{parts.length > 1 ? 's' : ''} ajoutée
          {parts.length > 1 ? 's' : ''} pour {vendors.length} vendeur
          {vendors.length > 1 ? 's' : ''}
        </p>
      </header>

      {vendors.length > 1 && (
        <div className="mb-4 -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div className="flex w-max gap-2 lg:flex-wrap">
            <button
              onClick={() => setVendorFilter('')}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${
                !vendorFilter
                  ? 'bg-ink-2 text-white'
                  : 'bg-card text-muted ring-1 ring-border'
              }`}
              style={{ minHeight: 36 }}
            >
              Tous
            </button>
            {vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => setVendorFilter(v.id)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${
                  vendorFilter === v.id
                    ? 'bg-ink-2 text-white'
                    : 'bg-card text-muted ring-1 ring-border'
                }`}
                style={{ minHeight: 36 }}
              >
                {v.shopName}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-[#D32F2F]">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && filtered.length === 0 && !error && (
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted">Aucune pièce saisie.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {filtered.map((p) => {
            const mapHref =
              p.vendor.lat != null && p.vendor.lng != null
                ? `https://www.google.com/maps/search/?api=1&query=${p.vendor.lat},${p.vendor.lng}`
                : null
            return (
              <li key={p.id} className="px-3 py-3">
                <div className="flex gap-3">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                    {p.imageThumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageThumbUrl}
                        alt={p.name ?? ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {p.name ?? 'Pièce'}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {p.category ?? '—'} · {p.condition ?? '—'}
                    </p>
                    <Link
                      href={`/liaison/vendors/${p.vendor.id}`}
                      className="mt-1 inline-block truncate text-xs font-medium text-ink-2 hover:underline"
                    >
                      {p.vendor.shopName} · {p.vendor.contactName} · {p.vendor.phone}
                    </Link>
                    {(p.vendor.commune || mapHref) && (
                      <p className="text-[11px] text-muted-2">
                        {p.vendor.commune ?? ''}
                        {p.vendor.address ? ` · ${p.vendor.address}` : ''}
                        {mapHref && (
                          <>
                            {' · '}
                            <a
                              href={mapHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ink-2 hover:underline"
                            >
                              GPS
                            </a>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  {p.price != null && (
                    <p className="self-center text-sm font-medium text-ink">
                      {p.price.toLocaleString('fr-FR')} F
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
