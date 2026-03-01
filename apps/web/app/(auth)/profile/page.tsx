'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

interface UserProfile {
  id: string
  phone: string
  roles: string[]
  activeContext: string | null
}

const ROLE_LABELS: Record<string, string> = {
  MECHANIC: 'Mécanicien',
  OWNER: 'Propriétaire',
  SELLER: 'Vendeur',
  RIDER: 'Livreur',
  ADMIN: 'Administrateur',
  ENTERPRISE: 'Entreprise',
}

function maskPhone(phone: string): string {
  // +2250700000000 → +225 07 ** ** 00 00
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 12) return phone
  const country = digits.slice(0, 3) // 225
  const d = digits.slice(3) // 0700000000
  return `+${country} ${d.slice(0, 2)} ** ** ${d.slice(6, 8)} ${d.slice(8, 10)}`
}

export default function ProfilePage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const res = await fetch(`/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        setError('Impossible de charger le profil')
        return
      }

      const body = await res.json()
      setProfile(body.data)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function handleSwitchContext(role: string) {
    if (switching || !profile) return
    setSwitching(true)
    setError('')

    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession()
      if (!session) return

      const res = await fetch(`/api/v1/users/me/context`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message ?? 'Impossible de changer de contexte')
        return
      }

      const body = await res.json()
      setProfile(body.data)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSwitching(false)
    }
  }

  async function handleLogout() {
    await getSupabase().auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4">
        <p className="text-red-600">{error || 'Profil introuvable'}</p>
      </main>
    )
  }

  const isMultiRole = profile.roles.length > 1

  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Mon profil</h1>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Téléphone</p>
        <p className="text-base font-medium">{maskPhone(profile.phone)}</p>
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm text-gray-500">Rôles</p>
        <div className="flex flex-wrap gap-2">
          {profile.roles.map((role) => (
            <span
              key={role}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                role === profile.activeContext
                  ? 'bg-[#1976D2] text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>
      </section>

      {isMultiRole && (
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm text-gray-500">Changer de contexte</p>
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            {profile.roles
              .filter((role) => role !== profile.activeContext)
              .map((role) => (
                <button
                  key={role}
                  onClick={() => handleSwitchContext(role)}
                  disabled={switching}
                  className="w-full rounded-lg border border-[#1976D2] px-4 py-3 text-sm font-medium text-[#1976D2] transition-colors hover:bg-[#1976D2] hover:text-white disabled:opacity-50"
                  style={{ minHeight: '48px' }}
                >
                  {switching ? 'Changement...' : `Passer en ${ROLE_LABELS[role] ?? role}`}
                </button>
              ))}
          </div>
        </section>
      )}

      <button
        onClick={handleLogout}
        className="w-full rounded-lg border border-red-300 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        style={{ minHeight: '48px' }}
      >
        Se déconnecter
      </button>
    </main>
  )
}
