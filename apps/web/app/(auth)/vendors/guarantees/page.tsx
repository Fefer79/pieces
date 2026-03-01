'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

interface GuaranteeInfo {
  type: string
  label: string
  signed: boolean
  signedAt: string | null
}

interface GuaranteeStatus {
  vendorId: string
  shopName: string
  vendorType: string
  status: string
  guarantees: GuaranteeInfo[]
  allSigned: boolean
}

export default function VendorGuaranteesPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<GuaranteeStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchGuarantees = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/v1/vendors/me/guarantees', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement des garanties')
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
    fetchGuarantees()
  }, [fetchGuarantees])

  const handleSign = async () => {
    setError(null)
    setSigning(true)

    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const res = await fetch('/api/v1/vendors/me/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors de la signature')
        return
      }

      router.push('/profile')
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        {error && <p className="text-sm text-[#D32F2F]">{error}</p>}
      </div>
    )
  }

  const isPending = data.status === 'PENDING_ACTIVATION'

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-2 text-xl font-bold text-[#1A1A1A]">Garanties Obligatoires</h1>
      <p className="mb-6 text-sm text-gray-600">
        {data.shopName} — {data.vendorType === 'FORMAL' ? 'Formel' : 'Informel'}
      </p>

      <div className="space-y-4">
        {data.guarantees.map((g) => (
          <div
            key={g.type}
            className={`rounded-lg border p-4 ${g.signed ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'}`}
          >
            <p className="text-sm font-medium text-[#1A1A1A]">{g.label}</p>
            {g.signed && g.signedAt && (
              <p className="mt-1 text-xs text-green-700">
                Signée le {new Date(g.signedAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-[#D32F2F]">{error}</p>}

      {isPending && !data.allSigned && (
        <div className="mt-6 space-y-3">
          <button
            onClick={handleSign}
            disabled={signing}
            className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:opacity-50"
          >
            {signing ? 'Signature en cours...' : 'Signer les garanties et activer mon profil'}
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="w-full rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Refuser — mon profil restera inactif
          </button>
          <p className="text-xs text-gray-500">
            En refusant, votre profil restera en attente d&apos;activation et vous ne pourrez pas recevoir de commandes.
          </p>
        </div>
      )}

      {data.allSigned && (
        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-center">
          <p className="text-sm font-medium text-green-800">Toutes les garanties sont signées. Votre profil est actif.</p>
        </div>
      )}
    </div>
  )
}
