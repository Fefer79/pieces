'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Delivery {
  id: string
  status: string
  mode: string
  pickupAddress: string | null
  deliveryAddress: string | null
  codAmount: number | null
  clientAbsent: boolean
}

export default function DeliveryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const deliveryId = params.deliveryId as string
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const fetchDelivery = useCallback(async () => {
    // Use the order endpoint as a proxy — in real app this would be a direct delivery endpoint
    try {
      const res = await fetch(`/api/v1/deliveries/mine`)
      if (res.ok) {
        const body = await res.json()
        const found = body.data.find((d: Delivery) => d.id === deliveryId)
        if (found) setDelivery(found)
      }
    } finally {
      setLoading(false)
    }
  }, [deliveryId])

  useEffect(() => {
    fetchDelivery()
  }, [fetchDelivery])

  async function handleAction(action: string) {
    setActing(true)
    try {
      const res = await fetch(`/api/v1/deliveries/${deliveryId}/${action}`, { method: 'POST' })
      if (res.ok) {
        const body = await res.json()
        setDelivery(body.data)
      }
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-gray-500">Chargement...</p></div>
  }

  if (!delivery) {
    return <div className="mx-auto max-w-md px-4 py-6"><p className="text-sm text-[#D32F2F]">Livraison introuvable</p></div>
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.push('/rider')} className="mb-2 text-sm text-[#1976D2] hover:underline">&larr; Retour</button>

      <div className="mb-4 rounded-lg bg-[#1976D2] p-4 text-white">
        <p className="text-lg font-bold">{delivery.status.replace(/_/g, ' ')}</p>
        <p className="text-sm opacity-80">{delivery.mode}</p>
      </div>

      <div className="mb-3 rounded-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500">RAMASSAGE</p>
        <p className="text-sm text-[#1A1A1A]">{delivery.pickupAddress ?? 'Adresse non renseignée'}</p>
      </div>

      <div className="mb-3 rounded-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500">LIVRAISON</p>
        <p className="text-sm text-[#1A1A1A]">{delivery.deliveryAddress ?? 'Adresse non renseignée'}</p>
      </div>

      {delivery.codAmount != null && delivery.codAmount > 0 && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-center">
          <p className="text-xs text-green-600">Montant à collecter (COD)</p>
          <p className="text-3xl font-bold text-green-700">{delivery.codAmount.toLocaleString()} FCFA</p>
        </div>
      )}

      <div className="space-y-2">
        {delivery.status === 'ASSIGNED' && (
          <button onClick={() => handleAction('pickup')} disabled={acting}
            className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white disabled:bg-gray-300">
            {acting ? 'En cours...' : 'Démarrer le ramassage'}
          </button>
        )}

        {delivery.status === 'PICKUP_IN_PROGRESS' && (
          <button onClick={() => handleAction('transit')} disabled={acting}
            className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white disabled:bg-gray-300">
            {acting ? 'En cours...' : 'Pièce récupérée — En route'}
          </button>
        )}

        {delivery.status === 'IN_TRANSIT' && (
          <>
            <button onClick={() => handleAction('deliver')} disabled={acting}
              className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white disabled:bg-gray-300">
              {acting ? 'En cours...' : 'Confirmer la livraison'}
            </button>
            <button onClick={() => handleAction('client-absent')} disabled={acting}
              className="w-full rounded-lg border border-amber-300 bg-amber-50 py-3 text-sm font-semibold text-amber-700 disabled:bg-gray-100">
              Client absent
            </button>
          </>
        )}

        {delivery.status === 'DELIVERED' && (
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <p className="text-sm font-semibold text-green-700">Livraison confirmée</p>
          </div>
        )}
      </div>
    </div>
  )
}
