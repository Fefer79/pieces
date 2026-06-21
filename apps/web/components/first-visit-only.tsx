'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'

const SEEN_KEY = 'pieces:hasSeenIntro'

// Décision capturée une seule fois par session (module-level) : ainsi le
// carrousel reste affiché pendant TOUTE la première visite, même après que le
// flag a été écrit en localStorage.
let cachedSeen: boolean | null = null

function getSnapshot(): boolean {
  if (cachedSeen === null) {
    try {
      cachedSeen = localStorage.getItem(SEEN_KEY) === '1'
    } catch {
      // localStorage indisponible (mode privé, etc.) → on montre le carrousel.
      cachedSeen = false
    }
  }
  return cachedSeen
}

// Côté serveur / hydratation : on considère « déjà vu » pour ne rien rendre dans
// le HTML SSR, puis useSyncExternalStore réconcilie vers la vraie valeur client
// sans erreur d'hydratation.
const getServerSnapshot = () => true

// Pas de source externe à observer : la valeur ne change pas pendant la session.
const subscribe = () => () => {}

/**
 * Rend ses enfants uniquement lors de la **première visite** du navigateur, puis
 * jamais (flag `pieces:hasSeenIntro` en localStorage). Utilisé pour le carrousel
 * promo de `/browse` : il accueille les nouveaux visiteurs puis cède la place à
 * la recherche/entonnoir aux visites suivantes (cf. DESIGN.md « Redesign 2026-06 »).
 */
export function FirstVisitOnly({ children }: { children: ReactNode }) {
  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Marque la visite pour les chargements suivants (write-only, n'affecte pas la
  // décision déjà capturée pour cette session).
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // ignore
    }
  }, [])

  if (seen) return null
  return <>{children}</>
}
