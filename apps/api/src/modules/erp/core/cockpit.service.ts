import { prisma } from '../../../lib/prisma.js'
import { countTasksForStaff } from './task.service.js'
import type { ErpStaffContext } from '../../../plugins/erpAuth.js'
import type { CockpitQuery } from 'shared/validators'
import type { BusinessUnitKey } from 'shared/constants'

// Cockpit ERP — n'agrège que des tables EXISTANTES.
//
// La phase 1 ne crée aucune donnée métier : elle donne à l'équipe une lecture
// unique des trois lignes d'activité à partir de ce que la plateforme produit
// déjà (factures, commandes, abonnements, leads, prospection).
//
// Rattachement d'une ligne d'activité aux données actuelles, faute de colonne
// `businessUnit` sur les modèles historiques :
//   MARKETPLACE → commandes sans entreprise (particuliers, mécaniciens)
//   FLOTTE      → commandes rattachées à une entreprise + abonnements
//   LOGISTIQUE  → demandes de cotation logistique
// Les phases suivantes poseront la colonne à la source ; d'ici là cette
// heuristique est la seule lecture honnête possible et elle est documentée
// comme telle dans l'UI.

/** Commandes en cours de traitement : payées mais pas encore soldées. */
const ACTIVE_ORDER_STATUSES = [
  'PAID',
  'VENDOR_CONFIRMED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
] as const

/** Leads logistique encore dans le tunnel. */
const OPEN_LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUOTING', 'QUOTED'] as const

/** Prospects vendeurs encore travaillables. */
const OPEN_CONTACT_STATUSES = ['A_CONTACTER', 'APPELE', 'VISITE', 'RELANCE', 'A_REVOIR'] as const

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Filtre entreprise dérivé de la ligne d'activité demandée. */
function orderScopeFor(businessUnit?: BusinessUnitKey) {
  if (businessUnit === 'MARKETPLACE') return { enterpriseId: null }
  if (businessUnit === 'FLOTTE') return { enterpriseId: { not: null } }
  return {}
}

export async function getCockpit(query: CockpitQuery, staff: ErpStaffContext) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - (query.months - 1), 1)
  const bu = query.businessUnit
  const orderScope = orderScopeFor(bu)

  // La logistique ne produit pas encore de facture : ses indicateurs sont
  // ceux du tunnel de cotation, pas du chiffre d'affaires.
  const invoiceScope =
    bu === 'FLOTTE'
      ? { enterpriseId: { not: null } }
      : bu === 'MARKETPLACE'
        ? { enterpriseId: null }
        : {}

  const [
    monthInvoices,
    prevMonthInvoices,
    seriesInvoices,
    activeOrders,
    pendingPaymentOrders,
    openLeads,
    wonLeadsMonth,
    activeSubscriptions,
    trialingSubscriptions,
    fleetVehicles,
    openContacts,
    publishedVendors,
    enterprises,
    tasks,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...invoiceScope, issuedAt: { gte: monthStart } },
      _sum: { totalTtc: true, subtotalHt: true, tvaAmount: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: { ...invoiceScope, issuedAt: { gte: prevMonthStart, lt: monthStart } },
      _sum: { totalTtc: true },
    }),
    prisma.invoice.findMany({
      where: { ...invoiceScope, issuedAt: { gte: seriesStart } },
      select: { issuedAt: true, totalTtc: true, subtotalHt: true, enterpriseId: true },
    }),
    prisma.order.count({
      where: { ...orderScope, status: { in: [...ACTIVE_ORDER_STATUSES] } },
    }),
    prisma.order.count({ where: { ...orderScope, status: 'PENDING_PAYMENT' } }),
    prisma.logisticsQuoteRequest.count({ where: { status: { in: [...OPEN_LEAD_STATUSES] } } }),
    prisma.logisticsQuoteRequest.count({
      where: { status: 'WON', closedAt: { gte: monthStart } },
    }),
    prisma.enterpriseSubscription.count({ where: { status: 'ACTIVE' } }),
    prisma.enterpriseSubscription.count({ where: { status: 'TRIALING' } }),
    prisma.vehicle.count({ where: { enterpriseId: { not: null } } }),
    prisma.vendorContact.count({ where: { statut: { in: [...OPEN_CONTACT_STATUSES] } } }),
    prisma.vendor.count({ where: { status: 'ACTIVE' } }),
    prisma.enterprise.count(),
    countTasksForStaff(staff.staffId),
  ])

  // Série mensuelle : on agrège en mémoire plutôt qu'en SQL brut. Le volume est
  // celui des factures d'un semestre — quelques milliers de lignes au pire.
  const buckets = new Map<string, { ttc: number; ht: number; count: number }>()
  for (let i = 0; i < query.months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - (query.months - 1 - i), 1)
    buckets.set(monthKey(d), { ttc: 0, ht: 0, count: 0 })
  }
  for (const inv of seriesInvoices) {
    const bucket = buckets.get(monthKey(inv.issuedAt))
    if (!bucket) continue
    bucket.ttc += inv.totalTtc
    bucket.ht += inv.subtotalHt
    bucket.count += 1
  }

  // Répartition marketplace / flotte du mois, indépendante du filtre courant :
  // c'est la vue de direction, elle doit toujours montrer les deux.
  const monthSeries = seriesInvoices.filter((i) => i.issuedAt >= monthStart)
  const caFlotte = monthSeries
    .filter((i) => i.enterpriseId !== null)
    .reduce((n, i) => n + i.totalTtc, 0)
  const caMarketplace = monthSeries
    .filter((i) => i.enterpriseId === null)
    .reduce((n, i) => n + i.totalTtc, 0)

  const caMois = monthInvoices._sum.totalTtc ?? 0
  const caMoisPrecedent = prevMonthInvoices._sum.totalTtc ?? 0
  const facturesMois = monthInvoices._count._all

  return {
    generatedAt: now.toISOString(),
    businessUnit: bu ?? null,
    ventes: {
      caMois,
      caMoisHt: monthInvoices._sum.subtotalHt ?? 0,
      tvaMois: monthInvoices._sum.tvaAmount ?? 0,
      facturesMois,
      panierMoyen: facturesMois > 0 ? Math.round(caMois / facturesMois) : 0,
      caMoisPrecedent,
      // Évolution en points de pourcentage, null quand le mois précédent est
      // vide (une croissance « infinie » n'informe personne).
      evolutionPct:
        caMoisPrecedent > 0
          ? Math.round(((caMois - caMoisPrecedent) / caMoisPrecedent) * 100)
          : null,
    },
    commandes: {
      actives: activeOrders,
      enAttentePaiement: pendingPaymentOrders,
    },
    flotte: {
      abonnementsActifs: activeSubscriptions,
      abonnementsEssai: trialingSubscriptions,
      vehiculesGeres: fleetVehicles,
      entreprises: enterprises,
    },
    logistique: {
      leadsOuverts: openLeads,
      leadsGagnesMois: wonLeadsMonth,
    },
    crm: {
      prospectsVendeurs: openContacts,
      vendeursActifs: publishedVendors,
    },
    mesTaches: tasks,
    repartitionMois: [
      { businessUnit: 'MARKETPLACE' as const, ca: caMarketplace },
      { businessUnit: 'FLOTTE' as const, ca: caFlotte },
    ],
    serieCa: [...buckets.entries()].map(([mois, v]) => ({
      mois,
      ca: v.ttc,
      caHt: v.ht,
      factures: v.count,
    })),
  }
}
