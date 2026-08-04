// Arbre de navigation de la console ERP — module pur, testé unitairement.
//
// Neuf sections rangées par PROCESSUS, pas par table : l'équipe pense « je
// facture », « je réceptionne », « je relance ». C'est la réorganisation
// décrite dans docs/proposition-reorganisation-admin-2026-08.md.
//
// Deux règles structurelles :
//
//  1. Chaque entrée porte la capacité qui la débloque. La barre latérale
//     n'affiche donc jamais une section que l'API refusera : un comptable ne
//     voit pas « Achats » plutôt que de cliquer et récolter un 403. Personne ne
//     voit les neuf sections — un magasinier en voit trois.
//
//  2. Les entrées pointent vers les écrans EXISTANTS sous /admin tant qu'ils
//     n'ont pas migré. Le lot 1 réorganise la navigation sans réécrire un seul
//     écran : `/admin` est en passe-droit sur le sous-domaine (voir
//     erp-routes.ts). Les écrans encore à construire portent `soon: true` et
//     s'affichent grisés, pour que l'équipe voie la carte complète du produit
//     sans tomber sur des 404.

import { hasCapability, type ErpCapability, type ErpBadgeKey } from 'shared/constants'

export interface ErpNavItem {
  href: string
  label: string
  /** Capacité requise. `erp:read` = visible par toute l'équipe. */
  capability: ErpCapability
  /** Compteur de travail en attente affiché en pastille. */
  badge?: ErpBadgeKey
  /** Écran pas encore livré : affiché grisé, non cliquable. */
  soon?: boolean
  /** Lot de la feuille de route où l'écran arrive — infobulle du « bientôt ». */
  lot?: string
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
      { href: '/erp/ma-journee', label: 'Ma journée', capability: 'erp:read', soon: true, lot: 'lot 2' },
      // Projections stratégiques : hypothèses, pas résultats. Réservé à la
      // direction pour qu'on ne les confonde pas avec la comptabilité.
      { href: '/admin/finances', label: 'Projections', capability: 'erp:admin' },
    ],
  },
  {
    key: 'crm',
    label: 'CRM',
    items: [
      // ⚠ Les quatre entrées suivantes fusionnent en un seul écran « Comptes »
      // au lot 3 (une fiche par acteur, avec facettes). D'ici là on les garde
      // toutes : masquer un écran qui marche coûte plus cher que la redondance.
      { href: '/admin/crm', label: 'Comptes', capability: 'crm:read' },
      { href: '/admin/clients', label: 'Clients', capability: 'crm:read' },
      { href: '/admin/vendors', label: 'Vendeurs', capability: 'crm:read' },
      { href: '/admin/enterprises', label: 'Entreprises', capability: 'crm:read' },
      { href: '/admin/logistique', label: 'Pipeline', capability: 'crm:read', badge: 'pipeline' },
      {
        href: '/admin/prospection',
        label: 'Prospection',
        capability: 'crm:read',
        badge: 'prospection',
      },
      { href: '/admin/marketing', label: 'Campagnes', capability: 'crm:write' },
    ],
  },
  {
    key: 'ventes',
    label: 'Ventes',
    items: [
      {
        href: '/erp/ventes/commandes',
        label: 'Commandes',
        capability: 'sales:read',
        soon: true,
        lot: 'lot 4',
      },
      {
        href: '/erp/ventes/facturation',
        label: 'Facturation',
        capability: 'sales:invoice',
        soon: true,
        lot: 'phase 2',
      },
      { href: '/admin/support', label: 'SAV', capability: 'sales:read', badge: 'sav' },
    ],
  },
  {
    key: 'achats',
    label: 'Achats',
    items: [
      {
        href: '/admin/sourcing',
        label: 'Dossiers de sourcing',
        capability: 'purchase:read',
        badge: 'sourcing',
      },
      { href: '/admin/stock/achats', label: 'Bons de commande', capability: 'purchase:read' },
      {
        href: '/erp/achats/receptions',
        label: 'Réceptions',
        capability: 'purchase:read',
        soon: true,
        lot: 'lot 4',
      },
      { href: '/admin/stock/fournisseurs', label: 'Fournisseurs', capability: 'purchase:read' },
    ],
  },
  {
    key: 'stock',
    label: 'Stock',
    items: [
      { href: '/admin/stock', label: 'Niveaux', capability: 'stock:read' },
      { href: '/admin/stock/mouvements', label: 'Mouvements', capability: 'stock:read' },
      {
        href: '/erp/stock/inventaires',
        label: 'Inventaires',
        capability: 'stock:adjust',
        soon: true,
        lot: 'phase 2',
      },
    ],
  },
  {
    key: 'logistique',
    label: 'Logistique',
    items: [
      // Expéditions = flux entrant, il suit le bon de commande → capacité achats.
      // Livraisons = flux sortant vers le client → capacité ventes.
      { href: '/admin/expeditions', label: 'Expéditions', capability: 'purchase:read' },
      {
        href: '/erp/logistique/livraisons',
        label: 'Livraisons',
        capability: 'sales:read',
        soon: true,
        lot: 'lot 4',
      },
    ],
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    items: [
      { href: '/admin/parts', label: 'Pièces', capability: 'stock:read' },
      {
        href: '/admin/enrichments',
        label: 'Modération',
        capability: 'stock:read',
        badge: 'moderation',
      },
      { href: '/admin/external-imports', label: 'Sources externes', capability: 'stock:read' },
    ],
  },
  {
    key: 'comptabilite',
    label: 'Comptabilité',
    items: [
      { href: '/admin/finance', label: 'Exports', capability: 'accounting:read' },
      {
        href: '/erp/comptabilite/ecritures',
        label: 'Écritures',
        capability: 'accounting:post',
        soon: true,
        lot: 'phase 2',
      },
      {
        href: '/erp/comptabilite/balance',
        label: 'Balance',
        capability: 'accounting:read',
        soon: true,
        lot: 'phase 2',
      },
      {
        href: '/erp/comptabilite/periodes',
        label: 'Périodes',
        capability: 'accounting:close',
        soon: true,
        lot: 'phase 2',
      },
    ],
  },
  {
    key: 'parametres',
    label: 'Paramètres',
    items: [
      { href: '/erp/parametres/equipe', label: 'Équipe', capability: 'erp:read' },
      {
        href: '/admin/equipe',
        label: 'Rémunération terrain',
        capability: 'erp:admin',
        badge: 'remuneration',
      },
      { href: '/admin/liaisons', label: 'Activité terrain', capability: 'erp:admin' },
      {
        href: '/erp/parametres/audit',
        label: 'Journal d’audit',
        capability: 'erp:admin',
        soon: true,
        lot: 'lot 4',
      },
    ],
  },
]

/**
 * Navigation filtrée pour un jeu de capacités.
 *
 * Une section sans aucune entrée visible disparaît entièrement — pas de titre
 * orphelin dans la barre latérale.
 */
export function navForCapabilities(capabilities: readonly ErpCapability[]): ErpNavSection[] {
  return ERP_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasCapability(capabilities, item.capability)),
  })).filter((section) => section.items.length > 0)
}

/**
 * Entrée active pour un chemin donné — la correspondance la plus longue gagne,
 * pour que `/admin/stock/achats` n'active pas `/admin/stock`.
 */
export function activeNavHref(pathname: string): string | null {
  const candidates = ERP_NAV.flatMap((s) => s.items.map((i) => i.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)
  return candidates[0] ?? null
}
