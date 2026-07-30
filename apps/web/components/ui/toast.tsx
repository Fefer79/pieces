'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// Notifications éphémères — généralisation du toast inline de `space-guard.tsx`.
//
// Volontairement minimal : pas de file d'attente, pas d'animation de sortie
// élaborée. Un toast confirme une action ou signale son échec ; s'il doit
// expliquer, c'est une modale ou un message dans la page qu'il faut.

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneClasses: Record<ToastTone, string> = {
  success: 'bg-ink text-white',
  error: 'bg-error-fg text-white',
  info: 'bg-ink-2 text-white',
}

const toneDot: Record<ToastTone, string> = {
  success: 'bg-success-bg',
  error: 'bg-white/80',
  info: 'bg-accent',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId++
      setItems((current) => [...current, { id, message, tone }])
      // Les erreurs restent plus longtemps : on doit avoir le temps de lire ce
      // qui a échoué avant que le message disparaisse.
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (message: string) => toast(message, 'success'),
      error: (message: string) => toast(message, 'error'),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // `aria-live` pour que le lecteur d'écran annonce le message sans que le
        // focus bouge.
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2"
      >
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex w-full items-center gap-2.5 rounded-md px-4 py-3 text-left text-[13.5px] font-medium shadow-md transition-opacity ${toneClasses[t.tone]}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[t.tone]}`} />
            <span className="flex-1">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * Hors `ToastProvider`, renvoie une API muette plutôt que de lever : un
 * composant réutilisable ne doit pas casser la page qui l'accueille parce
 * qu'elle n'a pas monté le provider.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  return (
    ctx ?? {
      toast: () => {},
      success: () => {},
      error: () => {},
    }
  )
}
