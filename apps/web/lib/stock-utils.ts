import { LOGISTICS_MODES } from 'shared/constants'
import type { ChipVariant } from '@/components/ui/chip'
import type {
  PurchaseOrderMode,
  PurchaseOrderStatus,
  StockLevelStatus,
  StockLocationType,
  StockMovementType,
} from '@/lib/stock-api'

// ---------------------------------------------------------------------------
// Libellés et variantes de chips — miroir des enums de l'API stock
// ---------------------------------------------------------------------------

export const LOCATION_TYPE_LABELS: Record<StockLocationType, string> = {
  ENTREPOT: 'Entrepôt',
  BOUTIQUE: 'Boutique',
  TRANSIT: 'Transit',
}

export const LEVEL_STATUS_LABELS: Record<StockLevelStatus, string> = {
  rupture: 'Rupture',
  bas: 'Stock bas',
  ok: 'OK',
}

export function levelStatusVariant(statut: StockLevelStatus): ChipVariant {
  if (statut === 'rupture') return 'status-err'
  if (statut === 'bas') return 'status-warn'
  return 'status-ok'
}

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  RECEPTION: 'Réception',
  SORTIE_COMMANDE: 'Sortie commande',
  AJUSTEMENT: 'Ajustement',
  RESTITUTION: 'Restitution',
}

export function movementTypeVariant(type: StockMovementType): ChipVariant {
  if (type === 'RECEPTION' || type === 'RESTITUTION') return 'status-ok'
  if (type === 'SORTIE_COMMANDE') return 'status-warn'
  return 'plain'
}

/**
 * Préfixe de quantité pour l'affichage du journal : la quantité stockée est
 * toujours positive (le sens est porté par le type). Le signe d'un ajustement
 * manuel n'est pas conservé en base — affiché « ± ».
 */
export function movementQuantityPrefix(type: StockMovementType): string {
  if (type === 'RECEPTION' || type === 'RESTITUTION') return '+'
  if (type === 'SORTIE_COMMANDE') return '−'
  return '±'
}

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée',
  EN_TRANSIT: 'En transit',
  RECEPTION_PARTIELLE: 'Réception partielle',
  RECEPTIONNEE: 'Réceptionnée',
  ANNULEE: 'Annulée',
}

export function poStatusVariant(statut: PurchaseOrderStatus): ChipVariant {
  if (statut === 'BROUILLON') return 'plain'
  if (statut === 'ENVOYEE' || statut === 'EN_TRANSIT') return 'status-warn'
  if (statut === 'RECEPTION_PARTIELLE') return 'oem'
  if (statut === 'RECEPTIONNEE') return 'status-ok'
  return 'status-err'
}

// Matrice des transitions — recopiée de PO_TRANSITIONS
// (apps/api/src/modules/stock/stock.service.ts). L'API reste la référence :
// elle refuse toute transition non listée ici (PO_INVALID_TRANSITION).
export const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  BROUILLON: ['ENVOYEE', 'ANNULEE'],
  ENVOYEE: ['EN_TRANSIT', 'ANNULEE'],
  EN_TRANSIT: ['ANNULEE'],
  RECEPTION_PARTIELLE: ['RECEPTIONNEE'],
  RECEPTIONNEE: [],
  ANNULEE: [],
}

export function nextPoTransitions(statut: PurchaseOrderStatus): PurchaseOrderStatus[] {
  return PO_TRANSITIONS[statut] ?? []
}

/** Libellé d'action pour un bouton de transition. */
export function poTransitionActionLabel(target: PurchaseOrderStatus): string {
  if (target === 'ENVOYEE') return 'Envoyer au fournisseur'
  if (target === 'EN_TRANSIT') return 'Marquer en transit'
  if (target === 'RECEPTIONNEE') return 'Clôturer la réception'
  return 'Annuler le bon'
}

// ---------------------------------------------------------------------------
// Modes logistiques proposés à la création d'un BC (PRE_POSITIONED exclu :
// ce n'est pas un mode d'achat fournisseur). Libellés = source unique
// shared/constants (LOGISTICS_MODES).
// ---------------------------------------------------------------------------

export const PO_MODES: PurchaseOrderMode[] = [
  'LOCAL',
  'AIR_NOW',
  'AIR_STANDARD',
  'AIR_ECONOMY',
  'SEA_LCL',
]

export function poModeLabel(mode: string): string {
  return LOGISTICS_MODES[mode as PurchaseOrderMode]?.label ?? mode
}

export function poModeTransitDays(mode: PurchaseOrderMode): number {
  return LOGISTICS_MODES[mode].transitDays
}

/** Vrai pour les modes d'import (fret + douane + last-mile au lieu du forfait local). */
export function isImportMode(mode: string): boolean {
  return mode.startsWith('AIR_') || mode === 'SEA_LCL'
}

// ---------------------------------------------------------------------------
// Lignes de bon de commande (formulaire de création / réception)
// ---------------------------------------------------------------------------

export interface PoLineInput {
  quantite: number
  prixUnitaire: number
  poidsEstimeKg?: number | null
}

/** Montant des lignes en FCFA (devise FCFA au formulaire, taux = 1). */
export function computePoAmount(lines: PoLineInput[]): number {
  return lines.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0)
}

/** Poids total estimé (kg) — lignes sans poids renseigné comptent pour 0. */
export function computePoWeight(lines: PoLineInput[]): number {
  return lines.reduce((sum, l) => sum + (l.poidsEstimeKg ?? 0) * l.quantite, 0)
}

/** Quantité restant à réceptionner sur une ligne (jamais négative). */
export function poLineRemaining(line: { quantite: number; quantiteRecue: number }): number {
  return Math.max(0, line.quantite - line.quantiteRecue)
}

/** Date ISO → libellé court fr-FR (« 31/07/2026 »), tiret si absente. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}

// ---------------------------------------------------------------------------
// Chip stock d'une fiche catalogue (pages admin/parts)
// ---------------------------------------------------------------------------

export type PartStockStatus = StockLevelStatus | 'non-suivi'

/**
 * Statut stock d'une fiche catalogue à partir de ses compteurs vendeur
 * (stockQuantity null = quantité non suivie, gérée à la main par le vendeur).
 */
export function partStockStatus(item: {
  stockQuantity: number | null
  lowStockThreshold: number
}): PartStockStatus {
  if (item.stockQuantity === null) return 'non-suivi'
  if (item.stockQuantity <= 0) return 'rupture'
  if (item.stockQuantity <= item.lowStockThreshold) return 'bas'
  return 'ok'
}

export function partStockChipOf(item: {
  stockQuantity: number | null
  lowStockThreshold: number
}): { label: string; variant: ChipVariant } {
  const statut = partStockStatus(item)
  if (statut === 'non-suivi') return { label: 'Non suivi', variant: 'plain' }
  return { label: `Stock : ${item.stockQuantity}`, variant: levelStatusVariant(statut) }
}

export const PART_STOCK_FILTER_LABELS: Record<PartStockStatus, string> = {
  'non-suivi': 'Non suivi',
  rupture: 'Rupture',
  bas: 'Stock bas',
  ok: 'OK',
}
