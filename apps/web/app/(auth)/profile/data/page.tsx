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
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error || 'Données introuvables'}
        </div>
      </main>
    )
  }

  const field = 'mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <Link href="/profile" className="mb-3 inline-block text-sm text-ink-2 hover:underline">
        ← Retour au profil
      </Link>

      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Compte · RGPD
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes données</h1>
      </div>

      <div className="space-y-2.5">
        <section className="rounded-md border border-border bg-card p-4">
          <p className={field}>Téléphone</p>
          <p className="font-mono text-base text-ink">{data.phone}</p>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <p className={field}>Rôles</p>
          <p className="text-base text-ink">
            {data.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}
          </p>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <p className={field}>Contexte actif</p>
          <p className="text-base text-ink">
            {data.activeContext ? (ROLE_LABELS[data.activeContext] ?? data.activeContext) : 'Aucun'}
          </p>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <p className={field}>Consentement ARTCI</p>
          <p className="text-base text-ink">
            {data.consentedAt
              ? `Accepté le ${new Date(data.consentedAt).toLocaleDateString('fr-CI')}`
              : 'Non consenti'}
          </p>
        </section>

        <section className="rounded-md border border-border bg-card p-4">
          <p className={field}>Compte créé le</p>
          <p className="font-mono text-base tabular text-ink">
            {new Date(data.createdAt).toLocaleDateString('fr-CI')}
          </p>
        </section>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {deletionRequested ? (
        <div className="mt-4 rounded-md border border-success-fg/20 bg-success-bg p-4 text-sm text-success-fg">
          ✓ Votre demande de suppression a été enregistrée. Elle sera traitée conformément à la réglementation en vigueur.
        </div>
      ) : (
        <button
          onClick={handleDeletionRequest}
          disabled={requesting}
          className="mt-4 w-full rounded-md border border-error-fg/30 bg-error-bg/40 px-4 py-3 text-sm font-semibold text-error-fg transition-colors hover:border-error-fg/50 disabled:opacity-50"
          style={{ minHeight: '48px' }}
        >
          {requesting ? 'Envoi…' : 'Demander la suppression de mes données'}
        </button>
      )}
    </main>
  )
}
