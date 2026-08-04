'use client'

import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
// Repli de secours quand localStorage est inaccessible (navigation privée) :
// sans lui, le bouton n'aurait aucun effet.
const memory = new Map<string, boolean>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Un autre onglet qui replie la barre met celui-ci à jour.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/**
 * État « replié » persisté dans localStorage (barres latérales, sections de
 * menu).
 *
 * `useSyncExternalStore` plutôt qu'un `useState` + effet : le rendu serveur
 * utilise `defaultValue` et React bascule sur la valeur stockée après
 * hydratation, sans divergence ni rendu en cascade.
 */
export function useCollapsed(key: string, defaultValue = false): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const stored = window.localStorage.getItem(key)
        if (stored !== null) return stored === '1'
      } catch {
        // localStorage indisponible : on retombe sur l'état en mémoire.
      }
      return memory.get(key) ?? defaultValue
    },
    () => defaultValue,
  )

  const toggle = useCallback(() => {
    const next = !collapsed
    memory.set(key, next)
    try {
      window.localStorage.setItem(key, next ? '1' : '0')
    } catch {
      // ignore
    }
    emit()
  }, [key, collapsed])

  return [collapsed, toggle]
}
