'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ROLE_LABELS } from '@/lib/role-labels'

type SupabaseClient = ReturnType<typeof createClient>

interface UserData {
  phone: string
  roles: string[]
  activeContext: string | null
  consentedAt: string | null
  createdAt: string
}

export default function DataPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [deletionRequested, setDeletionRequested] = useState(false)
  const [error, setError] = useState('')

  const getToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    if (!session) {
      router.push('/login')
      return null
    }
    return session.access_token
  }, [router])

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch('/api/v1/users/me/data', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setError('Impossible de charger vos données')
        return
      }

      const body = await res.json()
      setData(body.data)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleDeletionRequest() {
    if (requesting) return
    setRequesting(true)
    setError('')

    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch('/api/v1/users/me/data/deletion-request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        setError('Erreur lors de la demande de suppression')
        return
      }

      setDeletionRequested(true)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4">
        <p className="text-red-600">{error || 'Données introuvables'}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-8">
      <Link href="/profile" className="mb-4 inline-block text-sm text-[#1976D2]">
        &larr; Retour au profil
      </Link>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Mes données</h1>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Téléphone</p>
        <p className="text-base font-medium">{data.phone}</p>
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Rôles</p>
        <p className="text-base font-medium">
          {data.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}
        </p>
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Contexte actif</p>
        <p className="text-base font-medium">
          {data.activeContext ? (ROLE_LABELS[data.activeContext] ?? data.activeContext) : 'Aucun'}
        </p>
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Consentement ARTCI</p>
        <p className="text-base font-medium">
          {data.consentedAt
            ? `Accepté le ${new Date(data.consentedAt).toLocaleDateString('fr-CI')}`
            : 'Non consenti'}
        </p>
      </section>

      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Compte créé le</p>
        <p className="text-base font-medium">
          {new Date(data.createdAt).toLocaleDateString('fr-CI')}
        </p>
      </section>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {deletionRequested ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Votre demande de suppression a été enregistrée. Elle sera traitée conformément à la réglementation en vigueur.
        </div>
      ) : (
        <button
          onClick={handleDeletionRequest}
          disabled={requesting}
          className="w-full rounded-lg border border-red-300 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          style={{ minHeight: '48px' }}
        >
          {requesting ? 'Envoi...' : 'Demander la suppression de mes données'}
        </button>
      )}
    </main>
  )
}
