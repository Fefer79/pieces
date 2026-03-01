'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Delivery {
  id: string
  status: string
  mode: string
  pickupAddress: string | null
  deliveryAddress: string | null
  codAmount: number | null
  order: { id: string; totalAmount: number; items: { name: string }[] }
}

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assignée',
  PICKUP_IN_PROGRESS: 'Ramassage',
  IN_TRANSIT: 'En route',
  DELIVERED: 'Livrée',
  CONFIRMED: 'Confirmée',
}

export default function RiderDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/deliveries/mine')
      if (res.ok) {
        const body = await res.json()
        setDeliveries(body.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-gray-500">Chargement...</p></div>
  }

  const active = deliveries.filter((d) => !['DELIVERED', 'CONFIRMED'].includes(d.status))
  const completed = deliveries.filter((d) => ['DELIVERED', 'CONFIRMED'].includes(d.status))

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-[#1A1A1A]">Mes livraisons</h1>

      {active.length === 0 && <p className="mb-4 text-sm text-gray-500">Aucune livraison en cours.</p>}

      {active.map((d) => (
        <Link key={d.id} href={`/rider/delivery/${d.id}`}
          className="mb-3 block rounded-lg border-2 border-[#1976D2] bg-blue-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm font-bold text-[#1976D2]">{STATUS_LABELS[d.status] ?? d.status}</span>
            <span className="rounded bg-[#1976D2] px-2 py-0.5 text-xs text-white">{d.mode}</span>
          </div>
          <p className="mt-1 text-sm text-[#1A1A1A]">{d.order.items.map((i) => i.name).join(', ')}</p>
          {d.codAmount != null && d.codAmount > 0 && (
            <p className="mt-1 text-lg font-bold text-green-700">COD: {d.codAmount.toLocaleString()} FCFA</p>
          )}
        </Link>
      ))}

      {completed.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-gray-500">Historique</h2>
          {completed.slice(0, 10).map((d) => (
            <div key={d.id} className="mb-2 rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{STATUS_LABELS[d.status]}</span>
                <span className="text-sm font-semibold">{d.order.totalAmount.toLocaleString()} F</span>
              </div>
              <p className="text-xs text-gray-400">{d.order.items.map((i) => i.name).join(', ')}</p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
