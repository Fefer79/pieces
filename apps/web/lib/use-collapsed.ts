'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
// Repli de secours quand localStorage est inaccessible (navigation privée) :
// sans lui, le bouton n'aurait aucun effet.
const memory = new Map<string, boolean>()
const setMemory = new Map<string, string>()

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

/**
 * Variante pour un ensemble de clés repliées (une par section de menu), rangée
 * dans une seule entrée localStorage séparée par des virgules.
 *
 * On stocke les sections REPLIÉES, pas les dépliées : une section ajoutée au
 * menu apparaît donc ouverte par défaut, sans migration de la valeur stockée.
 */
export function useCollapsedSet(key: string): [ReadonlySet<string>, (item: string) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const stored = window.localStorage.getItem(key)
        if (stored !== null) return stored
      } catch {
        // ignore
      }
      return setMemory.get(key) ?? ''
    },
    () => '',
  )

  const collapsed = useMemo(
    () => new Set(raw.split(',').filter(Boolean)),
    [raw],
  )

  const toggle = useCallback(
    (item: string) => {
      const next = new Set(collapsed)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      const serialized = [...next].join(',')
      setMemory.set(key, serialized)
      try {
        window.localStorage.setItem(key, serialized)
      } catch {
        // ignore
      }
      emit()
    },
    [key, collapsed],
  )

  return [collapsed, toggle]
}
