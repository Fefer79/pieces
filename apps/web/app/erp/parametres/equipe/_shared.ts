import type { ChipVariant } from '@/components/ui/chip'
import type { StaffRoleKey } from 'shared/constants'

// Variantes de puce des rôles métier.
//
// On code le métier par la couleur pour qu'un tableau de vingt lignes se lise
// d'un coup d'œil : navy pour la direction, orange pour ceux qui engagent de
// l'argent (achats), vert pour la compta, bleu pour le commerce.

export const STAFF_ROLE_CHIP: Record<StaffRoleKey, ChipVariant> = {
  DIRECTION: 'oem',
  COMMERCIAL: 'occasion',
  COMPTABLE: 'status-ok',
  ACHETEUR: 'reusine',
  MAGASINIER: 'aftermarket',
  OPS_LOGISTIQUE: 'status-warn',
  SUPPORT: 'plain',
}

/** Ordre d'affichage — hiérarchie décroissante, puis support. */
export const STAFF_ROLE_ORDER: StaffRoleKey[] = [
  'DIRECTION',
  'COMMERCIAL',
  'COMPTABLE',
  'ACHETEUR',
  'MAGASINIER',
  'OPS_LOGISTIQUE',
  'SUPPORT',
]

/** Une ligne d'explication par métier, affichée sous le sélecteur. */
export const STAFF_ROLE_HINTS: Record<StaffRoleKey, string> = {
  DIRECTION: 'Accès complet, y compris clôture comptable et administration de l’ERP.',
  COMMERCIAL: 'CRM en écriture, lecture des ventes et du stock. Pas d’accès comptable.',
  COMPTABLE: 'Factures, encaissements, écritures et clôture de période.',
  ACHETEUR: 'Crée les bons de commande. L’approbation reste à la direction.',
  MAGASINIER: 'Mouvements de stock et inventaires.',
  OPS_LOGISTIQUE: 'Cotations, suivi des expéditions, mouvements de stock.',
  SUPPORT: 'Lecture seule sur le CRM et les ventes.',
}
