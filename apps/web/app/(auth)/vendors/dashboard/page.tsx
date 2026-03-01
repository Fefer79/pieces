'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

interface DashboardData {
  vendor: {
    id: string
    shopName: string
    status: string
    deliveryZonesCount: number
  }
  catalog: {
    published: number
    draft: number
    archived: number
    outOfStock: number
  }
}

export default function VendorDashboardPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/v1/vendors/me/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement')
        setLoading(false)
        return
      }

      setData(body.data)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">Tableau de bord</h1>

      {error && <p className="mb-4 text-sm text-[#D32F2F]">{error}</p>}

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}

      {!loading && data && (
        <>
          <p className="mb-4 text-sm text-gray-500">{data.vendor.shopName}</p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-[#1976D2]">{data.catalog.published}</p>
              <p className="text-xs text-gray-500">Publiées</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{data.catalog.draft}</p>
              <p className="text-xs text-gray-500">Brouillons</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{data.catalog.outOfStock}</p>
              <p className="text-xs text-gray-500">Épuisées</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{data.catalog.archived}</p>
              <p className="text-xs text-gray-500">Archivées</p>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Accès rapide</h2>
            <button
              onClick={() => router.push('/vendors/catalog')}
              className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm transition-colors hover:bg-gray-50"
            >
              Mon catalogue &rarr;
            </button>
            <button
              onClick={() => router.push('/vendors/delivery-zones')}
              className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm transition-colors hover:bg-gray-50"
            >
              Zones de livraison ({data.vendor.deliveryZonesCount} commune{data.vendor.deliveryZonesCount > 1 ? 's' : ''}) &rarr;
            </button>
            <button
              onClick={() => router.push('/vendors/guarantees')}
              className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm transition-colors hover:bg-gray-50"
            >
              Garanties &rarr;
            </button>
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-400">Commandes & paiements</p>
            <p className="text-xs text-gray-300">Bientôt disponible</p>
          </div>
        </>
      )}
    </div>
  )
}
