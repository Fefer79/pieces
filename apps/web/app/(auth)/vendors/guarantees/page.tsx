'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'

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
        headers: { Authorization: `Bearer ${token}` },
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
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
            {error}
          </div>
        )}
      </div>
    )
  }

  const isPending = data.status === 'PENDING_ACTIVATION'

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-2">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Vendeur · {data.vendorType === 'FORMAL' ? 'Formel' : 'Informel'}
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Garanties obligatoires</h1>
      </div>
      <p className="mb-6 text-sm text-muted">
        {data.shopName} — retour sous 48h + garantie 30 jours sur toute pièce vendue. C&apos;est la contrepartie de la confiance que les acheteurs vous accordent.
      </p>

      <div className="space-y-2.5">
        {data.guarantees.map((g) => (
          <div
            key={g.type}
            className={`flex items-start gap-3 rounded-md border p-4 ${
              g.signed ? 'border-success-fg/20 bg-success-bg' : 'border-border bg-card'
            }`}
          >
            <div className="flex-1">
              <p className={`text-sm font-medium ${g.signed ? 'text-success-fg' : 'text-ink'}`}>
                {g.label}
              </p>
              {g.signed && g.signedAt && (
                <p className="mt-1 text-xs text-success-fg/80">
                  Signée le {new Date(g.signedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
            {g.signed ? (
              <Chip variant="status-ok">Signée</Chip>
            ) : (
              <Chip variant="plain">Non signée</Chip>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {isPending && !data.allSigned && (
        <div className="mt-6 space-y-3">
          <Button variant="accent" size="lg" block onClick={handleSign} disabled={signing}>
            {signing ? 'Signature en cours…' : 'Signer les garanties et activer mon profil'}
          </Button>
          <Button variant="secondary" block onClick={() => router.push('/profile')}>
            Refuser — mon profil restera inactif
          </Button>
          <p className="text-xs text-muted">
            En refusant, votre profil restera en attente d&apos;activation et vous ne pourrez pas recevoir de commandes.
          </p>
        </div>
      )}

      {data.allSigned && (
        <div className="mt-6 rounded-md border border-success-fg/20 bg-success-bg p-4 text-center text-sm font-medium text-success-fg">
          🛡️ Toutes les garanties sont signées. Votre profil est actif.
        </div>
      )}
    </div>
  )
}
