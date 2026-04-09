'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

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
    role: 'SELLER',
    label: 'Vendeur',
    description: 'Je vends des pièces détachées',
    icon: ShopIcon,
    redirect: '/vendors/catalog',
  },
  {
    role: 'ENTERPRISE',
    label: 'Entreprise',
    description: 'Je gère une flotte de véhicules',
    icon: BuildingIcon,
    redirect: '/enterprise/dashboard',
  },
] as const

export default function OnboardingRolePage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If user already has a role selected, skip this page
    async function check() {
      try {
        const { data: { session } } = await getSupabase().auth.getSession()
        if (!session) { router.push('/login'); return }

        const res = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const body = await res.json()
          if (body.data.activeContext) {
            router.push('/browse')
            return
          }
        }
      } catch {
        // continue to show role selection
      }
      setLoading(false)
    }
    check()
  }, [router])

  async function handleSelectRole(role: string, redirect: string) {
    if (selecting) return
    setSelecting(true)
    setError('')

    try {
      const { data: { session } } = await getSupabase().auth.getSession()
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
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm lg:max-w-lg">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Bienvenue !</h1>
        <p className="mb-6 text-sm text-gray-600">
          Comment allez-vous utiliser Pièces ?
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          {ROLE_CARDS.map(({ role, label, description, icon: Icon, redirect }) => (
            <button
              key={role}
              onClick={() => handleSelectRole(role, redirect)}
              disabled={selecting}
              className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#002366] hover:shadow-md disabled:opacity-50"
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
      </div>
    </main>
  )
}

function WrenchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#002366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#002366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17m-2 0a2 2 0 104 0 2 2 0 10-4 0" />
      <path d="M17 17m-2 0a2 2 0 104 0 2 2 0 10-4 0" />
      <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 012 2v4h-2" />
      <path d="M9 17h6" />
      <path d="M14 6l-1.5-3H9L7.5 6" />
    </svg>
  )
}

function ShopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#002366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#002366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9h1" />
      <path d="M9 13h1" />
      <path d="M9 17h1" />
    </svg>
  )
}
