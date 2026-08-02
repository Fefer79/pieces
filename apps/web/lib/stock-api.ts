'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'

// fmtFcfa est réexporté pour que les pages stock n'aient qu'une seule source
// d'imports utilitaires.
export { fmtFcfa }

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

async function getToken() {
  const {
    data: { session },
  } = await getSupabase().auth.getSession()
  return session?.access_token ?? null
}

/**
 * Client de l'API ERP « Stock, achats & fournisseurs » (/api/v1/admin/stock).
 * Même contrat que crmFetch : union discriminée, jamais d'exception.
 */
export async function stockFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/stock${path}`, {
    ...init,
    headers: {
      ...(init?.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  }
  return { ok: true, data: body.data as T }
}

// ---------------------------------------------------------------------------
// Types en miroir du contrat API /api/v1/admin/stock
// (apps/api/src/modules/stock/stock.service.ts — ne pas deviner, y faire
// référence en cas de doute)
// ---------------------------------------------------------------------------

export interface StockOverview {
  emplacementsActifs: number
  referencesSuivies: number
  ruptures: number
  stockBas: number
  valeurStockFcfa: number
  mouvements30j: number
  fournisseursActifs: number
  bcEnCours: number
}

export type StockLocationType = 'ENTREPOT' | 'BOUTIQUE' | 'TRANSIT'

export interface StockLocation {
  id: string
  nom: string
  type: StockLocationType
  commune: string | null
  adresse: string | null
  actif: boolean
  _count?: { levels: number }
}

export type StockLevelStatus = 'rupture' | 'bas' | 'ok'

export interface StockLevel {
  id: string
  catalogItemId: string
  locationId: string
  qtyOnHand: number
  seuilBas: number
  cumpFcfa: number | null
  statut: StockLevelStatus
  valeurFcfa: number | null
  catalogItem: {
    id: string
    name: string | null
    oemReference: string | null
    imageThumbUrl: string | null
  }
  location: { id: string; nom: string; type: StockLocationType }
}

export interface StockLevelList {
  levels: StockLevel[]
  total: number
  page: number
  limit: number
}

export type StockMovementType = 'RECEPTION' | 'SORTIE_COMMANDE' | 'AJUSTEMENT' | 'RESTITUTION'

export interface StockMovement {
  id: string
  type: StockMovementType
  catalogItemId: string
  locationId: string
  quantite: number
  coutUnitaireFcfa: number | null
  refType: string | null
  refId: string | null
  note: string | null
  createdAt: string
  catalogItem: { id: string; name: string | null; oemReference: string | null }
  location: { id: string; nom: string }
  actor: { id: string; name: string | null } | null
}

export interface StockMovementList {
  movements: StockMovement[]
  total: number
  page: number
  limit: number
}

export interface VendorStockAlert {
  id: string
  name: string | null
  oemReference: string | null
  stockQuantity: number
  lowStockThreshold: number
  type: 'rupture' | 'bas'
  vendor: { id: string; shopName: string; phone: string | null; isInternal: boolean }
}

export interface VendorStockAlertList {
  alerts: VendorStockAlert[]
  total: number
  page: number
  limit: number
}

export interface Supplier {
  id: string
  nom: string
  pays: string | null
  ville: string | null
  contactName: string | null
  telephone: string | null
  whatsapp: string | null
  email: string | null
  site: string | null
  devise: string
  delaiTypiqueJours: number | null
  conditions: string | null
  notes: string | null
  actif: boolean
  createdAt: string
  _count?: { purchaseOrders: number }
}

export interface SupplierList {
  suppliers: Supplier[]
  total: number
  page: number
  limit: number
}

export interface SupplierDetail extends Supplier {
  bonsCommande: PurchaseOrderSummary[]
  volumeFcfa: number
}

export type PurchaseOrderStatus =
  | 'BROUILLON'
  | 'ENVOYEE'
  | 'EN_TRANSIT'
  | 'RECEPTION_PARTIELLE'
  | 'RECEPTIONNEE'
  | 'ANNULEE'

export type PurchaseOrderMode = 'LOCAL' | 'AIR_NOW' | 'AIR_STANDARD' | 'AIR_ECONOMY' | 'SEA_LCL'

export interface PurchaseOrderLine {
  id: string
  catalogItemId: string | null
  designation: string
  oemReference: string | null
  quantite: number
  quantiteRecue: number
  prixUnitaire: number
  poidsEstimeKg: number | null
  catalogItem?: { id: string; name: string | null } | null
}

export interface LandedCost {
  fret: number
  douane: number
  lastMile: number
  total: number
  delaiJours: number
}

export interface PurchaseOrderSummary {
  id: string
  numero: string
  supplierId: string
  destinationId: string | null
  mode: string
  statut: PurchaseOrderStatus
  devise: string
  tauxChange: number | null
  montantEstimeFcfa: number | null
  fraisEstimes: LandedCost | null
  montantReelFcfa: number | null
  envoyeAt: string | null
  etaAt: string | null
  recuAt: string | null
  notes: string | null
  createdAt: string
  supplier?: { id: string; nom: string }
  destination?: { id: string; nom: string } | null
  _count?: { lines: number }
}

export interface PurchaseOrderDetail extends PurchaseOrderSummary {
  supplier: Supplier
  destination: StockLocation | null
  createdBy: { id: string; name: string | null }
  lines: PurchaseOrderLine[]
}

export interface PurchaseOrderList {
  purchaseOrders: PurchaseOrderSummary[]
  total: number
  page: number
  limit: number
}
