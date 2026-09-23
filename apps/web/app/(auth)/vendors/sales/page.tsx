'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { catalogFetch } from '@/lib/catalog-api'
import { vendorFetch } from '@/lib/vendor-api'
import { StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { Chip } from '@/components/ui/chip'

interface SalesSummary {
  periodDays: number
  totalRevenue: number
  totalOrdersRevenue: number
  totalOffPlatformRevenue: number
  daily: Array<{ date: string; orders: number; offPlatform: number; total: number }>
  topItems: Array<{ name: string; revenue: number; quantity: number }>
}

interface VendorSale {
  id: string
  itemName: string
  quantity: number
  totalAmount: number
  channel: string
  buyerName: string | null
  soldAt: string
}

const CHANNEL_LABELS: Record<string, string> = {
  BOUTIQUE: 'Boutique',
  WHATSAPP: 'WhatsApp',
  TELEPHONE: 'Téléphone',
  AUTRE: 'Autre',
}

// `useSearchParams` (retour de la mise en file hors-ligne) impose une
// frontière Suspense, sans quoi le prérendu de la page échoue au build.
export default function VendorSalesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Chargement…</div>}>
      <VendorSalesPageContent />
    </Suspense>
  )
}

function VendorSalesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queued = searchParams.get('queued') === '1'
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [sales, setSales] = useState<VendorSale[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, salesRes] = await Promise.all([
        vendorFetch<SalesSummary>('/me/sales-summary'),
        catalogFetch<{ sales: VendorSale[] }>('/sales?limit=20'),
      ])

      if (!summaryRes.ok) {
        if (summaryRes.message.includes('vendeur')) {
          router.push('/vendors/onboarding')
          return
        }
        setError(summaryRes.message)
      } else {
        setSummary(summaryRes.data)
      }

      if (salesRes.ok) setSales(salesRes.data.sales)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Boutique
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Mes ventes</h1>
        </div>
        <Button variant="accent" onClick={() => router.push('/vendors/sales/new')}>
          + Vente
        </Button>
      </div>

      {queued && (
        <div className="mb-4 rounded-md border border-warn-fg/20 bg-warn-bg p-3 text-sm text-warn-fg">
          Connexion coupée pendant l&apos;enregistrement — la vente est en attente et sera envoyée
          automatiquement dès que la connexion revient.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && summary && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatCard label="30 derniers jours" value={`${(summary.totalRevenue / 1000).toFixed(0)}k FCFA`} />
            <StatCard
              label="Dont hors-plateforme"
              value={`${(summary.totalOffPlatformRevenue / 1000).toFixed(0)}k FCFA`}
            />
          </div>

          {summary.topItems.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Meilleures ventes (30 j)
              </h2>
              <div className="overflow-hidden rounded-md border border-border bg-card">
                {summary.topItems.map((item, idx) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{item.name}</p>
                      <p className="text-xs text-muted">×{item.quantity}</p>
                    </div>
                    <Price amount={item.revenue} currency={false} className="text-sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Ventes hors-plateforme récentes
            </h2>
          </div>

          {sales.length === 0 ? (
            <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-8 text-center">
              <p className="text-sm font-medium text-ink">Aucune vente hors-plateforme enregistrée</p>
              <p className="mt-1 text-xs text-muted">
                Notez ici vos ventes WhatsApp, téléphone ou en boutique pour suivre votre activité.
              </p>
              <div className="mt-4">
                <Button variant="accent" onClick={() => router.push('/vendors/sales/new')}>
                  + Enregistrer une vente
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              {sales.map((sale, idx) => (
                <div
                  key={sale.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${idx > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {sale.itemName} <span className="font-normal text-muted">×{sale.quantity}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Chip variant="plain">{CHANNEL_LABELS[sale.channel] ?? sale.channel}</Chip>
                      <span className="text-xs text-muted-2">
                        {new Date(sale.soldAt).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })}
                      </span>
                      {sale.buyerName && <span className="text-xs text-muted-2">· {sale.buyerName}</span>}
                    </div>
                  </div>
                  <Price amount={sale.totalAmount} currency={false} className="text-sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
