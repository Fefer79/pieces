'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface OrderItem {
  id: string
  name: string
  category: string | null
  priceSnapshot: number
  quantity: number
  imageThumbUrl: string | null
  vendorShopName: string
  vendorId: string
}

interface Order {
  id: string
  status: string
  totalAmount: number
  deliveryFee: number
  laborCost: number | null
  shareToken: string
  items: OrderItem[]
}

export default function OwnerChoicePage() {
  const params = useParams()
  const router = useRouter()
  const shareToken = params.shareToken as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/orders/share/${shareToken}`)
      if (!res.ok) {
        setError('Commande introuvable')
        return
      }
      const body = await res.json()
      setOrder(body.data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [shareToken])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  async function handlePay() {
    if (!order || !selectedMethod) return
    setPaying(true)
    try {
      const res = await fetch(`/api/v1/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: selectedMethod }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur de paiement')
        return
      }
      setOrder(body.data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-gray-500">Chargement...</p></div>
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-[#D32F2F]">{error}</p>
      </div>
    )
  }

  if (!order) return null

  const grandTotal = order.totalAmount + order.deliveryFee + (order.laborCost ?? 0)

  const paymentMethods = [
    { id: 'ORANGE_MONEY', label: 'Orange Money' },
    { id: 'MTN_MOMO', label: 'MTN MoMo' },
    { id: 'WAVE', label: 'Wave' },
    ...(grandTotal <= 75000 ? [{ id: 'COD', label: 'Cash à la livraison' }] : []),
  ]

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">Votre commande</h1>
      <p className="mb-4 text-sm text-gray-500">Votre mécanicien a trouvé ces pièces pour vous.</p>

      {order.status === 'DRAFT' && (
        <>
          {order.items.map((item) => (
            <div key={item.id} className="mb-3 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.vendorShopName}</p>
                  {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                </div>
                <p className="text-sm font-bold text-[#1976D2]">{item.priceSnapshot.toLocaleString()} F</p>
              </div>
            </div>
          ))}

          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pièces</span>
              <span>{order.totalAmount.toLocaleString()} FCFA</span>
            </div>
            {order.laborCost != null && order.laborCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Main d&apos;oeuvre</span>
                <span>{order.laborCost.toLocaleString()} FCFA</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Livraison</span>
              <span>{order.deliveryFee > 0 ? `${order.deliveryFee.toLocaleString()} FCFA` : 'Gratuit'}</span>
            </div>
            <hr className="my-2 border-gray-200" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{grandTotal.toLocaleString()} FCFA</span>
            </div>
          </div>

          <h2 className="mb-2 text-sm font-semibold text-[#1A1A1A]">Mode de paiement</h2>
          <div className="mb-4 space-y-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setSelectedMethod(pm.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                  selectedMethod === pm.id
                    ? 'border-[#1976D2] bg-blue-50 font-semibold text-[#1976D2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>

          {error && <p className="mb-2 text-sm text-[#D32F2F]">{error}</p>}

          <button
            onClick={handlePay}
            disabled={!selectedMethod || paying}
            className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300"
          >
            {paying ? 'Traitement...' : `Payer ${grandTotal.toLocaleString()} FCFA`}
          </button>
        </>
      )}

      {order.status === 'PAID' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-700">Paiement confirmé</p>
          <p className="text-xs text-green-600">Le vendeur a 45 minutes pour confirmer votre commande.</p>
        </div>
      )}

      {order.status === 'VENDOR_CONFIRMED' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-700">Commande confirmée par le vendeur</p>
          <p className="text-xs text-green-600">Préparation en cours. Un livreur sera assigné sous peu.</p>
        </div>
      )}

      {order.status === 'CANCELLED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-[#D32F2F]">Commande annulée</p>
        </div>
      )}

      {['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(order.status) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-[#1976D2]">
            {order.status === 'DISPATCHED' && 'Livreur en route vers le vendeur'}
            {order.status === 'IN_TRANSIT' && 'Livraison en cours'}
            {order.status === 'DELIVERED' && 'Livré — en attente de confirmation'}
            {order.status === 'CONFIRMED' && 'Livraison confirmée'}
            {order.status === 'COMPLETED' && 'Commande terminée'}
          </p>
        </div>
      )}

      {['DRAFT', 'PAID', 'VENDOR_CONFIRMED'].includes(order.status) && (
        <button
          onClick={async () => {
            const res = await fetch(`/api/v1/orders/${order.id}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            if (res.ok) {
              const body = await res.json()
              setOrder(body.data)
            }
          }}
          className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Annuler la commande
        </button>
      )}

      <button onClick={() => router.push('/browse')} className="mt-2 w-full text-center text-sm text-[#1976D2] hover:underline">
        Retour au catalogue
      </button>
    </div>
  )
}
