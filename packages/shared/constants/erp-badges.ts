import type { ErpCapability } from './erp-rbac'

// Compteurs de la navigation ERP — source unique, partagée API ↔ web.
//
// Règle : un badge ne compte QUE du travail en attente d'un geste. Jamais un
// volume d'activité — un badge qui affiche « 1 240 commandes » devient du bruit
// en une semaine et l'équipe cesse de regarder tous les badges, y compris ceux
// qui comptent.
//
// La capacité portée ici sert deux fois : l'API refuse de calculer un compteur
// que l'appelant n'a pas le droit de voir, et le web n'affiche le badge que sur
// une entrée déjà visible. Les deux côtés lisent la même table.

export const ERP_BADGE_KEYS = [
  'sav',
  'moderation',
  'sourcing',
  'pipeline',
  'prospection',
  'remuneration',
] as const

export type ErpBadgeKey = (typeof ERP_BADGE_KEYS)[number]

export interface ErpBadgeSpec {
  /** Capacité nécessaire pour que le compteur soit calculé et renvoyé. */
  capability: ErpCapability
  /** Ce que le compteur mesure — repris en infobulle sur le badge. */
  hint: string
}

export const ERP_BADGES: Record<ErpBadgeKey, ErpBadgeSpec> = {
  sav: {
    capability: 'sales:read',
    hint: 'Litiges non pris en charge et retours à traiter',
  },
  moderation: {
    capability: 'stock:read',
    hint: 'Fiches terrain en attente de modération',
  },
  sourcing: {
    capability: 'purchase:read',
    hint: 'Offres retenues dont le prix reste à confirmer auprès du vendeur',
  },
  pipeline: {
    capability: 'crm:read',
    hint: 'Demandes de cotation non prises en charge',
  },
  prospection: {
    capability: 'crm:read',
    hint: 'Relances de prospects échues',
  },
  remuneration: {
    capability: 'erp:admin',
    hint: 'Commissions terrain dues, en attente de règlement',
  },
}

export function isErpBadgeKey(value: string): value is ErpBadgeKey {
  return (ERP_BADGE_KEYS as readonly string[]).includes(value)
}
