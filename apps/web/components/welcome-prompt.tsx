'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const FLAG = 'pieces_welcome_prompt_done'

// Bandeau de bienvenue sur /browse — remplace l'ancien écran bloquant
// /onboarding/role. Une seule question, ignorable, posée une seule fois :
// « Vous êtes plutôt ? » ajuste la variante acheteur (MECHANIC/OWNER), rien
// d'autre. Les espaces Vendeur/Flotte s'activent en contexte (SpaceGuard).
export function WelcomePrompt() {
  const { user, isAuthenticated, refreshProfile, getAccessToken } = useAuth()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [thanks, setThanks] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (localStorage.getItem(FLAG)) return
    // Seulement pour les comptes acheteur « neufs » — pas pour un vendeur ou
    // une flotte qui repasse par l'accueil.
    const buyerOnly = user.roles.every((r) => r === 'MECHANIC' || r === 'OWNER')
    if (!buyerOnly) {
      localStorage.setItem(FLAG, '1')
      return
    }
    setVisible(true)
  }, [isAuthenticated, user])

  function dismiss() {
    localStorage.setItem(FLAG, '1')
    setVisible(false)
  }

  async function choose(role: 'MECHANIC' | 'OWNER') {
    if (busy) return
    setBusy(true)
    try {
      const token = await getAccessToken()
      if (token) {
        await fetch('/api/v1/users/me/role', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role, switch: false }),
        })
        await refreshProfile()
      }
      setThanks(true)
      localStorage.setItem(FLAG, '1')
      setTimeout(() => setVisible(false), 1200)
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div className="mb-4 rounded-md border border-border bg-card p-4">
      {thanks ? (
        <p className="text-sm font-medium text-ink">✓ C&apos;est noté, bonne visite !</p>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Bienvenue sur Pièces<span className="text-accent">.</span>
            </p>
            <p className="text-xs text-muted">Vous êtes plutôt ?</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => choose('MECHANIC')}
              disabled={busy}
              className="rounded-md border border-border-strong px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink-2 disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              Mécanicien
            </button>
            <button
              type="button"
              onClick={() => choose('OWNER')}
              disabled={busy}
              className="rounded-md border border-border-strong px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink-2 disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              Particulier
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="px-2 py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              Passer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
