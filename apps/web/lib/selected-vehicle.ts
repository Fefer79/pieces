'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'pieces_selected_vehicle'
const EVENT = 'pieces:vehicle-changed'

export interface SelectedVehicle {
  brand: string
  model: string
  year: string
  motor?: string
}

function readFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): SelectedVehicle | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.brand && parsed.model) {
      return parsed as SelectedVehicle
    }
  } catch {
    // ignore
  }
  return null
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function getServerSnapshot() {
  return null
}

export function useSelectedVehicle() {
  const raw = useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot)
  const vehicle = parse(raw)

  const setVehicle = useCallback((v: SelectedVehicle | null) => {
    if (typeof window === 'undefined') return
    try {
      if (v) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
      window.dispatchEvent(new CustomEvent(EVENT))
    } catch {
      // ignore
    }
  }, [])

  const clearVehicle = useCallback(() => {
    setVehicle(null)
  }, [setVehicle])

  return { vehicle, setVehicle, clearVehicle }
}
