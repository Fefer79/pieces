'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ROLE_LABELS } from '@/lib/role-labels'

type SupabaseClient = ReturnType<typeof createClient>

interface OrderSummary {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  items: Array<{ name: string; quantity: number }>
}

interface Vehicle {
  id: string
  brand: string
  model: string
  year: number
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_PAYMENT: 'En attente',
  PAID: 'Payee',
  VENDOR_CONFIRMED: 'Confirmee',
  DISPATCHED: 'Expediee',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livree',
  CONFIRMED: 'Confirmee',
  COMPLETED: 'Terminee',
  CANCELLED: 'Annulee',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  PENDING_PAYMENT: { bg: 'bg-amber-50', text: 'text-amber-700' },
  PAID: { bg: 'bg-blue-50', text: 'text-blue-700' },
  VENDOR_CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700' },
  DISPATCHED: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  IN_TRANSIT: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  DELIVERED: { bg: 'bg-green-50', text: 'text-green-700' },
  CONFIRMED: { bg: 'bg-green-50', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' },
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [orderStats, setOrderStats] = useState({ total: 0, active: 0, completed: 0 })
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) { router.push('/login'); return }

      const headers = { Authorization: `Bearer ${session.access_token}` }

      const [ordersRes, vehiclesRes] = await Promise.all([
        fetch('/api/v1/orders/history?page=1&limit=5', { headers }),
        fetch('/api/v1/vehicles/me/vehicles', { headers }),
      ])

      if (ordersRes.ok) {
        const body = await ordersRes.json()
        const allOrders: OrderSummary[] = body.data.orders ?? []
        setOrders(allOrders)

        const active = allOrders.filter((o) =>
          !['COMPLETED', 'CANCELLED'].includes(o.status)
        ).length
        const completed = allOrders.filter((o) => o.status === 'COMPLETED').length

        setOrderStats({ total: body.data.total ?? 0, active, completed })
      }

      if (vehiclesRes.ok) {
        const body = await vehiclesRes.json()
        setVehicles(body.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  const roleName = user?.activeContext ? (ROLE_LABELS[user.activeContext] ?? user.activeContext) : ''

  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-8 pb-8 lg:max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mon tableau de bord</h1>
        {roleName && (
          <p className="mt-1 text-sm text-gray-500">
            Connecte en tant que <span className="font-medium text-[#002366]">{roleName}</span>
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-[#002366]">{orderStats.total}</p>
          <p className="text-xs text-gray-500">Commandes</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{orderStats.active}</p>
          <p className="text-xs text-gray-500">En cours</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{vehicles.length}</p>
          <p className="text-xs text-gray-500">Vehicules</p>
        </div>
      </div>

      {/* Quick actions */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/browse"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-[#002366]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-[#002366]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Chercher pieces</span>
          </Link>
          <Link
            href="/vehicles"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-[#002366]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-[#002366]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H21" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Mes vehicules</span>
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-[#002366]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-[#002366]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Commandes</span>
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-[#002366]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-5 w-5 text-[#002366]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Mon profil</span>
          </Link>
        </div>
      </section>

      {/* My vehicles preview */}
      {vehicles.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Mes vehicules</h2>
            <Link href="/vehicles" className="text-xs font-medium text-[#002366] hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {vehicles.slice(0, 3).map((v) => (
              <Link
                key={v.id}
                href={`/browse/${encodeURIComponent(v.brand)}/${encodeURIComponent(v.model)}/${v.year}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-[#002366]"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{v.brand} {v.model}</p>
                  <p className="text-xs text-gray-500">{v.year}</p>
                </div>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent orders */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Commandes recentes</h2>
          {orderStats.total > 0 && (
            <Link href="/orders" className="text-xs font-medium text-[#002366] hover:underline">
              Voir tout
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="mb-1 text-sm text-gray-500">Aucune commande</p>
            <Link href="/browse" className="text-sm font-medium text-[#002366] hover:underline">
              Rechercher des pieces
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const colors = STATUS_COLORS[order.status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
              return (
                <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mb-1 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('fr-CI', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </p>
                  <p className="mt-2 text-right text-sm font-semibold text-gray-900">
                    {order.totalAmount.toLocaleString()} FCFA
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
