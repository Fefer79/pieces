'use client'

import { useState, useEffect, useCallback } from 'react'

interface DashboardStats {
  totalUsers: number
  totalVendors: number
  totalOrders: number
  activeOrders: number
  totalDisputes: number
  openDisputes: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
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

  if (loading) return <main style={{ padding: 16 }}><p>Chargement...</p></main>
  if (!stats) return <main style={{ padding: 16 }}><p>Accès réservé aux administrateurs.</p></main>

  const cards = [
    { label: 'Utilisateurs', value: stats.totalUsers, color: '#1976d2' },
    { label: 'Vendeurs', value: stats.totalVendors, color: '#388e3c' },
    { label: 'Commandes', value: stats.totalOrders, color: '#f57c00' },
    { label: 'Commandes actives', value: stats.activeOrders, color: '#e64a19' },
    { label: 'Litiges', value: stats.totalDisputes, color: '#7b1fa2' },
    { label: 'Litiges ouverts', value: stats.openDisputes, color: '#c62828' },
  ]

  return (
    <main style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Tableau de bord admin</h1>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12,
      }}>
        {cards.map((card) => (
          <div key={card.label} style={{
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
            padding: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a href="/admin/users" style={{
          padding: '10px 16px', background: '#1976d2', color: '#fff',
          borderRadius: 6, textDecoration: 'none', fontSize: 14,
        }}>
          Gérer les utilisateurs
        </a>
        <a href="/admin/orders" style={{
          padding: '10px 16px', background: '#f57c00', color: '#fff',
          borderRadius: 6, textDecoration: 'none', fontSize: 14,
        }}>
          Voir les commandes
        </a>
        <a href="/admin/vendors" style={{
          padding: '10px 16px', background: '#388e3c', color: '#fff',
          borderRadius: 6, textDecoration: 'none', fontSize: 14,
        }}>
          Voir les vendeurs
        </a>
      </div>
    </main>
  )
}
