'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalUsers: number
  totalVendors: number
  totalOrders: number
  activeOrders: number
  totalDisputes: number
  openDisputes: number
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setStats(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!stats) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-md border border-error-fg/20 bg-error-bg p-4 text-sm text-error-fg">
          Accès réservé aux administrateurs.
        </div>
      </main>
    )
  }

  const cards: Array<{ label: string; value: number }> = [
    { label: 'Utilisateurs', value: stats.totalUsers },
    { label: 'Vendeurs', value: stats.totalVendors },
    { label: 'Commandes', value: stats.totalOrders },
    { label: 'Actives', value: stats.activeOrders },
    { label: 'Litiges', value: stats.totalDisputes },
    { label: 'Ouverts', value: stats.openDisputes },
  ]

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Administration · Pièces.ci
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Tableau de bord</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Actions
      </h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => (window.location.href = '/admin/users')}>
          Gérer les utilisateurs
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/admin/orders')}>
          Voir les commandes
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/admin/vendors')}>
          Voir les vendeurs
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/admin/catalog')}>
          Voir les annonces
        </Button>
      </div>
    </main>
  )
}
