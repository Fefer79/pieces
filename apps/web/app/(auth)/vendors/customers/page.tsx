'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { vendorFetch } from '@/lib/vendor-api'
import { Price } from '@/components/ui/price'

interface VendorCustomer {
  phone: string
  name: string | null
  purchaseCount: number
  lastActivityAt: string
  totalSpend: number
}

export default function VendorCustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<VendorCustomer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const r = await vendorFetch<VendorCustomer[]>('/me/customers')
      if (!r.ok) {
        if (r.message.includes('vendeur')) {
          router.push('/vendors/onboarding')
          return
        }
        setError(r.message)
        return
      }
      setCustomers(r.data)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Boutique
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes clients</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && customers.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucun client pour le moment</p>
          <p className="mt-1 text-xs text-muted">
            Vos clients apparaîtront ici dès qu&apos;une commande ou une vente sera enregistrée avec leur
            numéro.
          </p>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {customers.map((c, idx) => (
            <div
              key={c.phone}
              className={`flex items-center justify-between px-4 py-3.5 ${idx > 0 ? 'border-t border-border' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{c.name ?? c.phone}</p>
                <p className="text-xs text-muted">
                  {c.name && `${c.phone} · `}
                  {c.purchaseCount} achat{c.purchaseCount > 1 ? 's' : ''} · dernier le{' '}
                  {new Date(c.lastActivityAt).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <Price amount={c.totalSpend} currency={false} className="text-sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
