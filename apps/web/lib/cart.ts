'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'pieces_cart'
const EVENT = 'pieces:cart-changed'
const VEHICLE_KEY = 'pieces_cart_vehicle'
const VEHICLE_EVENT = 'pieces:cart-vehicle-changed'

export interface CartItem {
  catalogItemId: string
  name: string
  category: string | null
  vendorId: string
  vendorShopName: string
  price: number | null
  condition: string | null
  partSource: string | null
  imageThumbUrl: string | null
  quantity: number
}

function readFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((i) => i && typeof i === 'object' && i.catalogItemId && i.vendorId)
        .map((i) => ({
          catalogItemId: String(i.catalogItemId),
          name: i.name ?? 'Pièce',
          category: i.category ?? null,
          vendorId: String(i.vendorId),
          vendorShopName: i.vendorShopName ?? 'Vendeur',
          price: typeof i.price === 'number' ? i.price : null,
          condition: i.condition ?? null,
          partSource: i.partSource ?? null,
          imageThumbUrl: i.imageThumbUrl ?? null,
          quantity: Math.min(99, Math.max(1, Number(i.quantity) || 1)),
        }))
    }
  } catch {
    // ignore
  }
  return []
}

function write(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    // ignore
  }
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

/**
 * Contexte véhicule du panier : lorsqu'un gestionnaire commande une pièce
 * depuis une alerte d'entretien, on retient le véhicule concerné pour
 * rattacher la commande (Order.vehicleId) et alimenter l'analytics de coûts.
 */
export interface CartVehicle {
  vehicleId: string
  /** Libellé lisible, ex. « Toyota Hilux 2018 » */
  label: string
}

function readVehicleRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(VEHICLE_KEY)
  } catch {
    return null
  }
}

function parseVehicle(raw: string | null): CartVehicle | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === 'object' && typeof v.vehicleId === 'string' && v.vehicleId) {
      return { vehicleId: v.vehicleId, label: typeof v.label === 'string' ? v.label : 'Véhicule' }
    }
  } catch {
    // ignore
  }
  return null
}

function subscribeVehicle(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(VEHICLE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(VEHICLE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Définit (ou efface avec null) le véhicule rattaché au panier. */
export function setCartVehicle(vehicle: CartVehicle | null) {
  if (typeof window === 'undefined') return
  try {
    if (vehicle) {
      window.localStorage.setItem(VEHICLE_KEY, JSON.stringify(vehicle))
    } else {
      window.localStorage.removeItem(VEHICLE_KEY)
    }
    window.dispatchEvent(new CustomEvent(VEHICLE_EVENT))
  } catch {
    // ignore
  }
}

export interface VendorGroup {
  vendorId: string
  vendorShopName: string
  items: CartItem[]
  subtotal: number
}

export function useCart() {
  const raw = useSyncExternalStore(subscribe, readFromStorage, getServerSnapshot)
  const items = useMemo(() => parse(raw), [raw])

  const rawVehicle = useSyncExternalStore(subscribeVehicle, readVehicleRaw, getServerSnapshot)
  const vehicle = useMemo(() => parseVehicle(rawVehicle), [rawVehicle])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const current = parse(readFromStorage())
    const qty = Math.min(99, Math.max(1, quantity))
    const existing = current.find((i) => i.catalogItemId === item.catalogItemId)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty)
      write([...current])
    } else {
      write([...current, { ...item, quantity: qty }])
    }
  }, [])

  const setQuantity = useCallback((catalogItemId: string, quantity: number) => {
    const current = parse(readFromStorage())
    const qty = Math.min(99, Math.max(1, quantity))
    write(current.map((i) => (i.catalogItemId === catalogItemId ? { ...i, quantity: qty } : i)))
  }, [])

  const removeItem = useCallback((catalogItemId: string) => {
    const current = parse(readFromStorage())
    write(current.filter((i) => i.catalogItemId !== catalogItemId))
  }, [])

  const clear = useCallback(() => {
    write([])
    setCartVehicle(null)
  }, [])

  // Fusionne des items (ex. brouillon serveur) : le local gagne si déjà présent.
  const mergeItems = useCallback((incoming: CartItem[]) => {
    const current = parse(readFromStorage())
    const byId = new Set(current.map((i) => i.catalogItemId))
    const merged = [...current]
    for (const i of incoming) {
      if (!byId.has(i.catalogItemId)) {
        merged.push({ ...i, quantity: Math.min(99, Math.max(1, i.quantity || 1)) })
        byId.add(i.catalogItemId)
      }
    }
    if (merged.length !== current.length) write(merged)
  }, [])

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
    [items],
  )

  const itemsByVendor = useMemo<VendorGroup[]>(() => {
    const groups = new Map<string, VendorGroup>()
    for (const i of items) {
      let g = groups.get(i.vendorId)
      if (!g) {
        g = { vendorId: i.vendorId, vendorShopName: i.vendorShopName, items: [], subtotal: 0 }
        groups.set(i.vendorId, g)
      }
      g.items.push(i)
      g.subtotal += (i.price ?? 0) * i.quantity
    }
    return [...groups.values()]
  }, [items])

  return { items, itemsByVendor, count, subtotal, vehicle, addItem, setQuantity, removeItem, clear, mergeItems, setVehicle: setCartVehicle }
}
