'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { erpFetch, type ErpMe } from '@/lib/erp-api'
import { ErpProvider } from '@/components/erp/erp-context'

// Garde de la console ERP.
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

  // ⚠ Le travail est écrit en IIFE async DANS l'effet, et non extrait dans une
  // fonction appelée depuis l'effet : la règle `react-hooks/set-state-in-effect`
  // modélise la frontière `await` mais ne traverse pas les appels de fonction.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await erpFetch<ErpMe>('/me')
      if (cancelled) return

      if (!res.ok) {
        if (res.status === 401) {
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
  }, [router])

  if (state === 'checking') {
    return <div className="p-8 text-sm text-muted">Vérification des droits…</div>
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-lg text-ink">Console indisponible</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    )
  }

  if (state === 'forbidden' || !me) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-lg text-ink">Accès réservé</h1>
        <p className="mt-2 text-sm text-muted">
          Cette console est réservée à l’équipe Pièces. Si vous devez y accéder, demandez à la
          direction de vous enrôler dans l’équipe.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-ink-2 underline decoration-border-strong underline-offset-2"
        >
          Retour à mon espace
        </Link>
      </div>
    )
  }

  return <ErpProvider value={me}>{children}</ErpProvider>
}
