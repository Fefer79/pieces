'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { DeliveryPricingMode, ImportFreightMode } from 'shared/constants'
import { DEFAULT_IMPORT_FREIGHT_MODE, isImportFreightMode } from 'shared/constants'

const STORAGE_KEY = 'pieces_cart'
const EVENT = 'pieces:cart-changed'
const VEHICLE_KEY = 'pieces_cart_vehicle'
const VEHICLE_EVENT = 'pieces:cart-vehicle-changed'
const COMMUNE_KEY = 'pieces_cart_commune'
const COMMUNE_EVENT = 'pieces:cart-commune-changed'
const MODE_KEY = 'pieces_cart_delivery_mode'
const MODE_EVENT = 'pieces:cart-delivery-mode-changed'
// Acheminement depuis l'étranger d'une précommande d'import — indépendant du
// délai de livraison local, qui s'applique après dédouanement.
const FREIGHT_KEY = 'pieces_cart_logistics_mode'
const FREIGHT_EVENT = 'pieces:cart-logistics-mode-changed'

export interface CartItem {
  catalogItemId: string
  name: string
  category: string | null
  vendorId: string
  vendorShopName: string
  price: number | null
  condition: string | null
  partSource: string | null
  /** LOCAL (déjà à Abidjan) ou IMPORT (à faire venir) — pilote le checkout. */
  supplyMode?: string | null
  originCountry?: string | null
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

export function parse(raw: string | null): CartItem[] {
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
          // Sans ces deux champs, un panier de pièces à importer se comporte
          // comme un panier local : ni fret, ni douane, ni acompte.
          supplyMode: i.supplyMode === 'IMPORT' ? 'IMPORT' : 'LOCAL',
          originCountry: i.originCountry ?? null,
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

/**
 * Commune de livraison rattachée au panier : choisie sur la fiche produit,
 * elle doit persister jusqu'au panier (et au paiement) pour calculer les frais.
 */
function readCommuneRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(COMMUNE_KEY)
  } catch {
    return null
  }
}

function subscribeCommune(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(COMMUNE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(COMMUNE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Définit (ou efface avec '') la commune de livraison du panier. */
export function setCartCommune(commune: string) {
  if (typeof window === 'undefined') return
  try {
    if (commune) {
      window.localStorage.setItem(COMMUNE_KEY, commune)
    } else {
      window.localStorage.removeItem(COMMUNE_KEY)
    }
    window.dispatchEvent(new CustomEvent(COMMUNE_EVENT))
  } catch {
    // ignore
  }
}

/**
 * Délai de livraison choisi par l'acheteur : proposé dès la fiche produit (le
 * prix affiché en dépend), il persiste jusqu'au panier puis à la commande.
 * Valeur inconnue en storage → Standard, le compromis par défaut.
 */
function readModeRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(MODE_KEY)
  } catch {
    return null
  }
}

function subscribeMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(MODE_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(MODE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function parseMode(raw: string | null): DeliveryPricingMode {
  return raw === 'ECO' || raw === 'EXPRESS' || raw === 'STANDARD' ? raw : 'STANDARD'
}

/** Définit le délai de livraison du panier. */
export function setCartDeliveryMode(mode: DeliveryPricingMode) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MODE_KEY, mode)
    window.dispatchEvent(new CustomEvent(MODE_EVENT))
  } catch {
    // ignore
  }
}

function readFreightRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(FREIGHT_KEY)
  } catch {
    return null
  }
}

function subscribeFreight(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FREIGHT_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(FREIGHT_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Acheminement valide, ou l'aérien économique par défaut. */
export function parseFreightMode(raw: string | null): ImportFreightMode {
  return isImportFreightMode(raw) ? raw : DEFAULT_IMPORT_FREIGHT_MODE
}

/** Définit l'acheminement depuis l'étranger d'une précommande. */
export function setCartLogisticsMode(mode: ImportFreightMode) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FREIGHT_KEY, mode)
    window.dispatchEvent(new CustomEvent(FREIGHT_EVENT))
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

  const commune = useSyncExternalStore(subscribeCommune, readCommuneRaw, getServerSnapshot) ?? ''

  const rawMode = useSyncExternalStore(subscribeMode, readModeRaw, getServerSnapshot)
  const deliveryMode = useMemo(() => parseMode(rawMode), [rawMode])

  const rawFreight = useSyncExternalStore(subscribeFreight, readFreightRaw, getServerSnapshot)
  const logisticsMode = useMemo(() => parseFreightMode(rawFreight), [rawFreight])

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
    setCartCommune('')
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

  return {
    items,
    itemsByVendor,
    count,
    subtotal,
    vehicle,
    commune,
    deliveryMode,
    logisticsMode,
    // Un panier est entièrement local ou entièrement d'import : les deux
    // échéanciers de paiement sont incompatibles (une fois / acompte + solde),
    // et l'API refuse le mélange (ORDER_MIXED_SUPPLY_MODE).
    isImportCart: items.length > 0 && items.every((i) => i.supplyMode === 'IMPORT'),
    hasMixedSupply:
      items.some((i) => i.supplyMode === 'IMPORT') && items.some((i) => i.supplyMode !== 'IMPORT'),
    addItem,
    setQuantity,
    removeItem,
    clear,
    mergeItems,
    setVehicle: setCartVehicle,
    setCommune: setCartCommune,
    setDeliveryMode: setCartDeliveryMode,
    setLogisticsMode: setCartLogisticsMode,
  }
}
