// Matrice des capacités de l'ERP interne — source unique, partagée API ↔ web.
//
// Pourquoi une matrice statique plutôt qu'une table de permissions : l'équipe
// interne se compte en dizaines de personnes et les métiers sont stables. Une
// table apporterait une jointure sur chaque requête et une UI d'administration
// à maintenir, pour un besoin qu'un enum couvre. Si un jour il faut des
// permissions par personne, on ajoutera un tableau d'exceptions sur
// `StaffMember` — pas avant.
//
// ⚠ Ce fichier est du code pur (aucun import Prisma / Fastify / React) : il est
//    importé par la garde API `requireErpCapability` ET par la navigation web,
//    et il est testé unitairement.

/** Rôles métier internes — miroir de l'enum Prisma `StaffRole`. */
export const STAFF_ROLES = [
  'DIRECTION',
  'COMMERCIAL',
  'COMPTABLE',
  'ACHETEUR',
  'MAGASINIER',
  'OPS_LOGISTIQUE',
  'SUPPORT',
] as const

export type StaffRoleKey = (typeof STAFF_ROLES)[number]

/** Lignes d'activité — miroir de l'enum Prisma `BusinessUnit`. */
export const BUSINESS_UNITS = ['MARKETPLACE', 'FLOTTE', 'LOGISTIQUE'] as const

export type BusinessUnitKey = (typeof BUSINESS_UNITS)[number]

export const BUSINESS_UNIT_LABELS: Record<BusinessUnitKey, string> = {
  MARKETPLACE: 'Marketplace',
  FLOTTE: 'Flottes',
  LOGISTIQUE: 'Logistique',
}

export const STAFF_ROLE_LABELS: Record<StaffRoleKey, string> = {
  DIRECTION: 'Direction',
  COMMERCIAL: 'Commercial',
  COMPTABLE: 'Comptable',
  ACHETEUR: 'Acheteur',
  MAGASINIER: 'Magasinier',
  OPS_LOGISTIQUE: 'Ops logistique',
  SUPPORT: 'Support',
}

/**
 * Capacités atomiques. Convention `domaine:action`.
 *
 * `erp:read` est le socle : sans elle, aucun accès à l'ERP. Toute capacité
 * l'implique (voir `capabilitiesFor`).
 */
export const ERP_CAPABILITIES_LIST = [
  'erp:read',
  'erp:admin',

  'crm:read',
  'crm:write',
  'crm:assign',

  'sales:read',
  'sales:invoice',
  'sales:payment',

  'accounting:read',
  'accounting:post',
  'accounting:close',

  'purchase:read',
  'purchase:order',
  'purchase:approve',

  'stock:read',
  'stock:move',
  'stock:adjust',
] as const

export type ErpCapability = (typeof ERP_CAPABILITIES_LIST)[number]

export const ERP_CAPABILITY_LABELS: Record<ErpCapability, string> = {
  'erp:read': 'Accéder à l’ERP',
  'erp:admin': 'Administrer l’ERP',
  'crm:read': 'Consulter le CRM',
  'crm:write': 'Modifier le CRM',
  'crm:assign': 'Attribuer les comptes et opportunités',
  'sales:read': 'Consulter les ventes',
  'sales:invoice': 'Émettre des factures et avoirs',
  'sales:payment': 'Saisir les encaissements',
  'accounting:read': 'Consulter la comptabilité',
  'accounting:post': 'Comptabiliser les écritures',
  'accounting:close': 'Clôturer une période',
  'purchase:read': 'Consulter les achats',
  'purchase:order': 'Créer des bons de commande',
  'purchase:approve': 'Approuver les bons de commande',
  'stock:read': 'Consulter le stock',
  'stock:move': 'Enregistrer des mouvements de stock',
  'stock:adjust': 'Ajuster le stock et valider les inventaires',
}

/**
 * Capacités par rôle métier.
 *
 * Principe de séparation des tâches : celui qui commande n'approuve pas
 * (`ACHETEUR` a `purchase:order` mais pas `purchase:approve`), et celui qui
 * saisit les mouvements de stock ne valide pas les écarts d'inventaire seul
 * (`MAGASINIER` a `stock:move`, `stock:adjust` reste avec lui car il est le
 * seul à compter, mais la clôture comptable lui échappe).
 */
export const ERP_CAPABILITIES: Record<StaffRoleKey, readonly ErpCapability[]> = {
  DIRECTION: [
    'erp:read',
    'erp:admin',
    'crm:read',
    'crm:write',
    'crm:assign',
    'sales:read',
    'sales:invoice',
    'sales:payment',
    'accounting:read',
    'accounting:post',
    'accounting:close',
    'purchase:read',
    'purchase:order',
    'purchase:approve',
    'stock:read',
    'stock:move',
    'stock:adjust',
  ],
  COMMERCIAL: ['erp:read', 'crm:read', 'crm:write', 'sales:read', 'stock:read'],
  COMPTABLE: [
    'erp:read',
    'crm:read',
    'sales:read',
    'sales:invoice',
    'sales:payment',
    'accounting:read',
    'accounting:post',
    'accounting:close',
    'purchase:read',
  ],
  ACHETEUR: [
    'erp:read',
    'crm:read',
    'purchase:read',
    'purchase:order',
    'stock:read',
  ],
  MAGASINIER: ['erp:read', 'stock:read', 'stock:move', 'stock:adjust', 'purchase:read'],
  OPS_LOGISTIQUE: [
    'erp:read',
    'crm:read',
    'crm:write',
    'sales:read',
    'purchase:read',
    'stock:read',
    'stock:move',
  ],
  SUPPORT: ['erp:read', 'crm:read', 'sales:read'],
}

/**
 * Capacités effectives d'un membre de l'équipe.
 *
 * `isPlatformAdmin` (rôle `ADMIN` de la marketplace) donne tout : c'est
 * l'amorçage. Les administrateurs existants accèdent à l'ERP sans qu'on ait à
 * migrer de données, et ils peuvent créer les premiers `StaffMember`.
 *
 * Un membre inactif n'a aucune capacité, même si son rôle en accorde.
 */
export function capabilitiesFor(params: {
  staffRole?: StaffRoleKey | null
  active?: boolean
  isPlatformAdmin?: boolean
}): ErpCapability[] {
  if (params.isPlatformAdmin) return [...ERP_CAPABILITIES_LIST]
  if (!params.staffRole) return []
  if (params.active === false) return []
  return [...(ERP_CAPABILITIES[params.staffRole] ?? [])]
}

/** Vrai si la liste de capacités couvre `capability`. `erp:admin` couvre tout. */
export function hasCapability(
  capabilities: readonly ErpCapability[],
  capability: ErpCapability,
): boolean {
  if (capabilities.includes('erp:admin')) return true
  return capabilities.includes(capability)
}

/** Vrai si au moins une des capacités demandées est couverte. */
export function hasAnyCapability(
  capabilities: readonly ErpCapability[],
  required: readonly ErpCapability[],
): boolean {
  if (required.length === 0) return true
  return required.some((c) => hasCapability(capabilities, c))
}
