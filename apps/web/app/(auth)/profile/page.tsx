'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ROLE_LABELS } from '@/lib/role-labels'

type SupabaseClient = ReturnType<typeof createClient>

interface UserProfile {
  id: string
  phone: string
  roles: string[]
  activeContext: string | null
}

const ROLE_CARDS = [
  {
    role: 'MECHANIC',
    label: 'Mécanicien',
    description: 'Je cherche des pièces pour mes clients',
    icon: WrenchIcon,
    redirect: '/browse',
  },
  {
    role: 'OWNER',
    label: 'Propriétaire',
    description: 'Je cherche des pièces pour mon véhicule',
    icon: CarIcon,
    redirect: '/browse',
  },
  {
    role: 'ENTERPRISE',
    label: 'Entreprise',
    description: 'Je gère une flotte de véhicules',
    icon: BuildingIcon,
    redirect: '/enterprise/dashboard',
  },
] as const

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 12) return phone
  const country = digits.slice(0, 3)
  const d = digits.slice(3)
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
  const [selectingRole, setSelectingRole] = useState(false)
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

  async function handleSelectRole(role: string, redirect: string) {
    if (selectingRole) return
    setSelectingRole(true)
    setError('')

    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession()
      if (!session) return

      const res = await fetch('/api/v1/users/me/role', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message ?? 'Erreur lors de la sélection du rôle')
        return
      }

      router.push(redirect)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSelectingRole(false)
    }
  }

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

  // New user: only MECHANIC role and no activeContext → show role selection
  const isNewUser =
    profile.roles.length === 1 &&
    profile.roles[0] === 'MECHANIC' &&
    profile.activeContext === null

  if (isNewUser) {
    return (
      <main className="mx-auto w-full max-w-sm px-4 pt-8 lg:max-w-lg">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Bienvenue !</h1>
        <p className="mb-6 text-sm text-gray-600">
          Comment allez-vous utiliser Pieces ?
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          {ROLE_CARDS.map(({ role, label, description, icon: Icon, redirect }) => (
            <button
              key={role}
              onClick={() => handleSelectRole(role, redirect)}
              disabled={selectingRole}
              className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#1976D2] hover:shadow-md disabled:opacity-50"
              style={{ minHeight: '80px' }}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                <Icon />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    )
  }

  const isMultiRole = profile.roles.length > 1

  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-8 lg:max-w-lg">
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

      <Link
        href="/profile/data"
        className="mb-4 block w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        style={{ minHeight: '48px', lineHeight: '28px' }}
      >
        Mes données personnelles
      </Link>

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

function WrenchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17m-2 0a2 2 0 104 0 2 2 0 10-4 0" />
      <path d="M17 17m-2 0a2 2 0 104 0 2 2 0 10-4 0" />
      <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 012 2v4h-2" />
      <path d="M9 17h6" />
      <path d="M14 6l-1.5-3H9L7.5 6" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1976D2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9h1" />
      <path d="M9 13h1" />
      <path d="M9 17h1" />
    </svg>
  )
}
