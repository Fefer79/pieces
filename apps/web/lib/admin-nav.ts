// Arbre de navigation du back-office /admin — module pur, testé unitairement.
//
// Deux apports par rapport à la liste plate précédente :
//
//  1. Des sections métier. Dix-neuf entrées d'affilée ne se lisent pas ; les
//     regrouper par domaine rend le menu parcourable et repliable par bloc.
//  2. Une capacité par entrée. La sidebar n'affiche donc jamais une section que
//     l'API refusera : un comptable ne voit pas « Stock & achats » plutôt que
//     de cliquer dessus et récolter un 403.
//
// ⚠ La capacité déclarée ici doit correspondre à celle que garde la route API
//    correspondante (`requireCapability` dans apps/api/src/modules/*/…routes.ts).
//    Les deux lisent la même matrice, shared/constants/erp-rbac.

import { hasCapability, type ErpCapability } from 'shared/constants'

export interface AdminNavItem {
  href: string
  label: string
  /** Capacité requise. `erp:read` = visible par toute l'équipe. */
  capability: ErpCapability
}

export interface AdminNavSection {
  key: string
  label: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    key: 'pilotage',
    label: 'Pilotage',
    items: [
      { href: '/admin', label: 'Tableau de bord', capability: 'erp:read' },
      { href: '/admin/finances', label: 'Modélisation', capability: 'erp:admin' },
      { href: '/admin/equipe', label: 'Équipe', capability: 'erp:admin' },
    ],
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    items: [
      { href: '/admin/parts', label: 'Pièces', capability: 'erp:admin' },
      { href: '/admin/enrichments', label: 'Fiches terrain', capability: 'erp:admin' },
      { href: '/admin/external-imports', label: 'Imports externes', capability: 'erp:admin' },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    items: [
      { href: '/admin/crm', label: 'CRM', capability: 'crm:read' },
      { href: '/admin/clients', label: 'Clients', capability: 'erp:admin' },
      { href: '/admin/vendors', label: 'Vendeurs', capability: 'erp:admin' },
      // Émission et suivi des contrats d'adhésion : outil de terrain du
      // commercial, donc ouvert par `crm:write` — pas réservé à `erp:admin`.
      // L'écran existe pour émettre (POST gardé par `crm:write`) ; un profil en
      // lecture seule sur le CRM n'y ferait rien, on ne le lui montre pas.
      { href: '/admin/contrats-vendeurs', label: 'Contrats vendeurs', capability: 'crm:write' },
      { href: '/admin/enterprises', label: 'Entreprises', capability: 'erp:admin' },
      { href: '/admin/prospection', label: 'Prospection', capability: 'crm:read' },
      { href: '/admin/marketing', label: 'Marketing', capability: 'crm:read' },
      { href: '/admin/support', label: 'SAV', capability: 'crm:read' },
    ],
  },
  {
    key: 'achats',
    label: 'Achats & stock',
    items: [
      { href: '/admin/stock', label: 'Stock & achats', capability: 'stock:read' },
      { href: '/admin/sourcing', label: 'Sourcing', capability: 'purchase:read' },
      { href: '/admin/expeditions', label: 'Expéditions', capability: 'purchase:read' },
    ],
  },
  {
    key: 'logistique',
    label: 'Logistique',
    items: [
      { href: '/admin/logistique', label: 'Cotations logistique', capability: 'crm:read' },
      { href: '/admin/liaisons', label: 'Liaisons', capability: 'erp:admin' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    items: [{ href: '/admin/finance', label: 'Finance', capability: 'accounting:read' }],
  },
]

/**
 * Navigation filtrée pour un jeu de capacités.
 *
 * Une section sans aucune entrée visible disparaît entièrement — pas de titre
 * orphelin dans la sidebar.
 */
export function navForCapabilities(capabilities: readonly ErpCapability[]): AdminNavSection[] {
  return ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasCapability(capabilities, item.capability)),
  })).filter((section) => section.items.length > 0)
}

/**
 * Entrée active pour un chemin donné — la correspondance la plus longue gagne,
 * pour que `/admin/stock` n'active pas `/admin`.
 */
export function activeNavHref(pathname: string): string | null {
  const candidates = ADMIN_NAV.flatMap((s) => s.items.map((i) => i.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)
  return candidates[0] ?? null
}
