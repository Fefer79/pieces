'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { erpFetch, type ErpMe } from '@/lib/erp-api'
import { ErpProvider } from '@/components/erp/erp-context'
import { ToastProvider } from '@/components/ui/toast'

// Garde de l'ERP interne.
//
// Comme /admin, l'ERP porte sa propre coquille et sa propre garde plutôt que de
// passer par l'AppShell + SpaceGuard : la navigation est pilotée par les
// capacités métier, pas par le rôle d'espace.
//
// `GET /erp/me` répond 200 même sans capacité — c'est ce qui permet de
// distinguer « pas connecté » (redirection) de « connecté mais pas de l'équipe »
// (écran d'accès réservé). Un 403 obligerait à deviner lequel des deux.

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [me, setMe] = useState<ErpMe | null>(null)
  const [state, setState] = useState<'checking' | 'ready' | 'forbidden' | 'error'>('checking')
  const [message, setMessage] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // ⚠ Le travail est écrit en IIFE async DANS l'effet, et non extrait dans une
  // fonction appelée depuis l'effet.
  //
  // La règle `react-hooks/set-state-in-effect` (compilateur React) modélise la
  // frontière `await` : un `setState` placé après un await ne compte pas comme
  // synchrone. En revanche elle ne traverse pas les appels de fonction — un
  // `useCallback` async appelé depuis l'effet est signalé même si son corps
  // n'attaque l'état qu'après un await. D'où cette forme.
  //
  // Le rechargement se pilote par `reloadToken`, incrémenté depuis un
  // gestionnaire d'événement (autorisé, contrairement au corps d'un effet).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await erpFetch<ErpMe>('/me')
      if (cancelled) return

      if (!res.ok) {
        // Session absente ou expirée : on renvoie vers la connexion en gardant
        // la destination pour y revenir.
        if (res.message.includes('Session')) {
          router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
          return
        }
        setMessage(res.message)
        setState('error')
        return
      }

      setMe(res.data)
      setState(res.data.capabilities.length > 0 ? 'ready' : 'forbidden')
    })()
    return () => {
      cancelled = true
    }
  }, [router, reloadToken])

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Vérification de l’accès…
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <ErpGate
        title="ERP indisponible"
        body={message ?? 'Impossible de charger votre profil ERP.'}
        retry={() => {
          setState('checking')
          setReloadToken((t) => t + 1)
        }}
      />
    )
  }

  if (state === 'forbidden' || !me) {
    return (
      <ErpGate
        title="Espace réservé"
        body="L’ERP est réservé à l’équipe interne Pièces. Demandez à la direction de vous ajouter dans Paramètres › Équipe."
      />
    )
  }

  return (
    <ToastProvider>
      <ErpProvider me={me}>{children}</ErpProvider>
    </ToastProvider>
  )
}

function ErpGate({
  title,
  body,
  retry,
}: {
  title: string
  body: string
  retry?: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-6 text-center">
        <h1 className="font-display text-[24px] leading-tight text-ink">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {retry && (
            <button
              type="button"
              onClick={retry}
              style={{ minHeight: '48px' }}
              className="rounded-md bg-ink-2 px-5 text-sm font-medium text-white transition-colors hover:bg-ink"
            >
              Réessayer
            </button>
          )}
          <Link
            href="/dashboard"
            style={{ minHeight: '48px' }}
            className="inline-flex items-center rounded-md border border-border-strong bg-card px-5 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
