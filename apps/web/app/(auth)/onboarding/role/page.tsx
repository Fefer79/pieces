'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// L'écran de choix de rôle à l'inscription a été supprimé : tout le monde
// démarre dans l'espace Achat, les autres espaces s'activent en contexte
// (SpaceGuard) et la préférence Mécanicien/Particulier se règle via le
// bandeau de bienvenue sur /browse ou dans Profil → Identité.
// Cette route ne subsiste que pour les anciens liens / PWA en cache.
export default function OnboardingRoleRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/browse')
  }, [router])

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-muted">Redirection…</p>
    </main>
  )
}
