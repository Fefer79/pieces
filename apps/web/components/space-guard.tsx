'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { spaceForPath, type Space } from '@/lib/spaces'

// Garde des espaces : monté autour du contenu de l'AppShell.
// - Route hors espace (partagée) → rend les enfants, ne touche à rien.
// - L'utilisateur a l'accès mais un autre contexte actif → bascule silencieuse
//   (PATCH /me/context) + toast « ● Espace X ».
// - Pas l'accès → interstitiel d'activation en un tap (espaces auto-activables)
//   ou écran « espace réservé » (RIDER, DRIVER, LIAISON).
export function SpaceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading, refreshProfile, getAccessToken } = useAuth()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncing = useRef(false)

  const space = spaceForPath(pathname)
  const hasAccess =
    !!space && !!user && user.roles.some((r) => space.matchRoles.includes(r))
  const contextMatches =
    !!space && !!user && space.matchRoles.includes(user.activeContext ?? '')

  const showToast = useCallback((label: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(label)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // Bascule silencieuse quand on entre dans un espace qu'on possède déjà.
  useEffect(() => {
    if (!space || !user || !hasAccess || contextMatches || syncing.current) return
    syncing.current = true
    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const role = user.roles.find((r) => space.matchRoles.includes(r))
        const res = await fetch('/api/v1/users/me/context', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role }),
        })
        if (res.ok) {
          await refreshProfile()
          showToast(space.label)
        }
      } finally {
        syncing.current = false
      }
    })()
  }, [space, user, hasAccess, contextMatches, getAccessToken, refreshProfile, showToast])

  if (!space) return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  // Pas connecté sur une route d'espace : le middleware redirige vers /login ;
  // on ne bloque rien ici pour éviter un flash.
  if (!user) return <>{children}</>

  if (!hasAccess) {
    return space.activation ? (
      <SpaceActivation space={space} />
    ) : (
      <ReservedSpace space={space} />
    )
  }

  return (
    <>
      {children}
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6"
        >
          <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-white shadow-md">
            <span className="text-accent">●</span>
            {toast}
          </span>
        </div>
      )}
    </>
  )
}

// Interstitiel d'activation : remplace le 403 / cul-de-sac quand l'utilisateur
// n'a pas encore l'espace. Un tap pour activer, puis on continue vers la
// destination initiale.
function SpaceActivation({ space }: { space: Space }) {
  const router = useRouter()
  const pathname = usePathname()
  const { refreshProfile, getAccessToken } = useAuth()
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')

  async function activate() {
    if (activating) return
    setActivating(true)
    setError('')
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Reconnectez-vous.')
        return
      }
      const res = await fetch('/api/v1/users/me/role', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: space.role }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? "Erreur lors de l'activation")
        return
      }
      await refreshProfile()
      const dest = space.postActivation ?? pathname
      if (dest !== pathname) router.replace(dest)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setActivating(false)
    }
  }

  const copy = space.activation!

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Espaces
        </p>
        <h1 className="mt-2 font-display text-2xl text-ink">{copy.title}</h1>
        <ul className="mt-4 space-y-2">
          {copy.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-ink">
              <span className="text-accent" aria-hidden>
                →
              </span>
              {b}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">{copy.note}</p>
        {error && (
          <div className="mt-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={activate}
          disabled={activating}
          className="mt-5 w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          style={{ minHeight: '48px' }}
        >
          {activating ? 'Activation…' : 'Activer et continuer'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-2 w-full rounded-md px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
          style={{ minHeight: '48px' }}
        >
          Pas maintenant
        </button>
      </div>
    </main>
  )
}

function ReservedSpace({ space }: { space: Space }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6 text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {space.label}
        </p>
        <h1 className="mt-2 font-display text-2xl text-ink">Espace réservé</h1>
        <p className="mt-3 text-sm text-muted">{space.reserved}</p>
        <Link
          href="/browse"
          className="mt-5 inline-block w-full rounded-md bg-ink-2 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink"
          style={{ minHeight: '48px' }}
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
