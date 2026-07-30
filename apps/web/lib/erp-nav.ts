// Arbre de navigation de l'ERP — module pur, testé unitairement.
//
// Chaque entrée porte la capacité qui la débloque. La sidebar n'affiche donc
// jamais une section que l'API refusera : un comptable ne voit pas « Achats »
// plutôt que de cliquer dessus et récolter un 403.
//
// Les sections dont les écrans arrivent aux phases suivantes sont marquées
// `soon: true` : elles apparaissent grisées, pour que l'équipe voie la carte
// complète du produit sans tomber sur des 404.

import { hasCapability, type ErpCapability } from 'shared/constants'

export interface ErpNavItem {
  href: string
  label: string
  /** Capacité requise. `erp:read` = visible par toute l'équipe. */
  capability: ErpCapability
  /** Écran pas encore livré : affiché grisé, non cliquable. */
  soon?: boolean
}

export interface ErpNavSection {
  key: string
  label: string
  items: ErpNavItem[]
}

export const ERP_NAV: ErpNavSection[] = [
  {
    key: 'pilotage',
    label: 'Pilotage',
    items: [
      { href: '/erp', label: 'Cockpit', capability: 'erp:read' },
      { href: '/erp/taches', label: 'Tâches', capability: 'erp:read' },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    items: [
      { href: '/erp/crm/pipeline', label: 'Pipeline', capability: 'crm:read', soon: true },
      { href: '/erp/crm/comptes', label: 'Comptes', capability: 'crm:read', soon: true },
      // Les deux demi-CRM existants restent en place et opérationnels : on
      // pointe dessus au lieu de les dupliquer. La couche pipeline arrive en
      // phase 3 et les référencera.
      { href: '/admin/prospection', label: 'Prospection vendeurs', capability: 'crm:read' },
      { href: '/admin/logistique', label: 'Cotations logistique', capability: 'crm:read' },
    ],
  },
  {
    key: 'ventes',
    label: 'Ventes',
    items: [
      { href: '/erp/ventes/factures', label: 'Factures', capability: 'sales:read', soon: true },
      {
        href: '/erp/ventes/encaissements',
        label: 'Encaissements',
        capability: 'sales:payment',
        soon: true,
      },
      {
        href: '/erp/ventes/balance-agee',
        label: 'Balance âgée client',
        capability: 'sales:read',
        soon: true,
      },
    ],
  },
  {
    key: 'achats',
    label: 'Achats',
    items: [
      {
        href: '/erp/achats/fournisseurs',
        label: 'Fournisseurs',
        capability: 'purchase:read',
        soon: true,
      },
      {
        href: '/erp/achats/commandes',
        label: 'Bons de commande',
        capability: 'purchase:read',
        soon: true,
      },
      {
        href: '/erp/achats/receptions',
        label: 'Réceptions',
        capability: 'purchase:read',
        soon: true,
      },
    ],
  },
  {
    key: 'stock',
    label: 'Stock',
    items: [
      { href: '/erp/stock/niveaux', label: 'Niveaux', capability: 'stock:read', soon: true },
      { href: '/erp/stock/mouvements', label: 'Mouvements', capability: 'stock:read', soon: true },
      { href: '/erp/stock/inventaires', label: 'Inventaires', capability: 'stock:adjust', soon: true },
    ],
  },
  {
    key: 'comptabilite',
    label: 'Comptabilité',
    items: [
      {
        href: '/erp/comptabilite/ecritures',
        label: 'Écritures',
        capability: 'accounting:read',
        soon: true,
      },
      {
        href: '/erp/comptabilite/balance',
        label: 'Balance',
        capability: 'accounting:read',
        soon: true,
      },
      {
        href: '/erp/comptabilite/periodes',
        label: 'Périodes',
        capability: 'accounting:close',
        soon: true,
      },
    ],
  },
  {
    key: 'parametres',
    label: 'Paramètres',
    items: [{ href: '/erp/parametres/equipe', label: 'Équipe', capability: 'erp:read' }],
  },
]

/**
 * Navigation filtrée pour un jeu de capacités.
 *
 * Une section sans aucune entrée visible disparaît entièrement — pas de titre
 * orphelin dans la sidebar.
 */
export function navForCapabilities(capabilities: readonly ErpCapability[]): ErpNavSection[] {
  return ERP_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasCapability(capabilities, item.capability)),
  })).filter((section) => section.items.length > 0)
}

/**
 * Entrée active pour un chemin donné — la correspondance la plus longue gagne,
 * pour que `/erp/taches` n'active pas `/erp`.
 */
export function activeNavHref(pathname: string): string | null {
  const candidates = ERP_NAV.flatMap((s) => s.items.map((i) => i.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)
  return candidates[0] ?? null
}
