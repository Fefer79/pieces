import type { Prisma } from '@prisma/client'
import {
  financeOverviewQuerySchema,
  financeMonthlyQuerySchema,
  financeVendorsQuerySchema,
  financeExportQuerySchema,
} from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

// Filtre « commandes terminées » : repris EXACTEMENT de getAdminOverview
// (modules/admin/admin.service.ts, COMPLETED_STATUS) — statut COMPLETED seul,
// période sur order.createdAt (bornes UTC), commission = Σ OrderItem.commissionAmount.
const COMPLETED_STATUS = 'COMPLETED' as const

// Statuts escrow (enum EscrowStatus du schéma Prisma) : HELD = fonds bloqués,
// RELEASED = libérés au vendeur, REFUNDED = remboursés au client.
const ESCROW_HELD = 'HELD' as const
const ESCROW_RELEASED = 'RELEASED' as const

// Période/paramètres invalides → 400 (et non le 422 générique des erreurs de
// schéma Fastify) : message français directement exploitable côté back-office.
function invalidQuery(error: { issues: { message: string }[] }): AppError {
  return new AppError('FINANCE_INVALID_QUERY', 400, {
    message: error.issues[0]?.message ?? 'Paramètres invalides',
  })
}

// ---------------------------------------------------------------------------
// Périodes mensuelles 'YYYY-MM' — bornes UTC. Mêmes helpers que
// modules/equipe/equipe.service.ts (dupliqués pour ne pas coupler les modules).
// ---------------------------------------------------------------------------

export function currentPeriode(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export function periodeBounds(periode: string): { start: Date; end: Date } {
  const [y, m] = periode.split('-').map(Number)
  const start = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, 1))
  const end = new Date(Date.UTC(y ?? 0, m ?? 1, 1))
  return { start, end }
}

function orderPeriodWhere(start: Date, end: Date): Prisma.OrderWhereInput {
  return { status: COMPLETED_STATUS, createdAt: { gte: start, lt: end } }
}

// Variation en % vs période précédente ; null quand la base est nulle
// (pas de point de comparaison — évite un « +∞ % » trompeur).
function variationPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// ---------------------------------------------------------------------------
// Overview — cockpit d'une période
// ---------------------------------------------------------------------------

export async function getFinanceOverview(rawQuery: unknown) {
  const parsed = financeOverviewQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw invalidQuery(parsed.error)
  const periode = parsed.data.periode ?? currentPeriode()
  const { start, end } = periodeBounds(periode)
  const prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1))

  const [cur, prev, itemsCur, itemsPrev, escrowHeld, escrowReleased] = await Promise.all([
    prisma.order.aggregate({
      where: orderPeriodWhere(start, end),
      _sum: { totalAmount: true, deliveryFee: true, laborCost: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: orderPeriodWhere(prevStart, start),
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.orderItem.aggregate({
      where: { order: orderPeriodWhere(start, end) },
      _sum: { commissionAmount: true },
    }),
    prisma.orderItem.aggregate({
      where: { order: orderPeriodWhere(prevStart, start) },
      _sum: { commissionAmount: true },
    }),
    // Fonds actuellement bloqués : instantané sans filtre de période.
    prisma.escrowTransaction.aggregate({
      where: { status: ESCROW_HELD },
      _sum: { amount: true },
    }),
    // Fonds libérés pendant la période (sur releasedAt).
    prisma.escrowTransaction.aggregate({
      where: { status: ESCROW_RELEASED, releasedAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ])

  const gmv = cur._sum.totalAmount ?? 0
  const commissions = itemsCur._sum.commissionAmount ?? 0
  const commandes = cur._count._all

  return {
    periode,
    gmv,
    commissions,
    fraisLivraison: cur._sum.deliveryFee ?? 0,
    mainOeuvre: cur._sum.laborCost ?? 0,
    commandes,
    panierMoyen: commandes > 0 ? Math.round(gmv / commandes) : 0,
    escrowBloque: escrowHeld._sum.amount ?? 0,
    escrowLibere: escrowReleased._sum.amount ?? 0,
    variation: {
      gmv: variationPct(gmv, prev._sum.totalAmount ?? 0),
      commissions: variationPct(commissions, itemsPrev._sum.commissionAmount ?? 0),
    },
  }
}

// ---------------------------------------------------------------------------
// Monthly — buckets mensuels (même ventilation que getAdminOverview)
// ---------------------------------------------------------------------------

export async function getFinanceMonthly(rawQuery: unknown) {
  const parsed = financeMonthlyQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw invalidQuery(parsed.error)
  const months = parsed.data.months ?? 12

  const now = new Date()
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1))

  const orders = await prisma.order.findMany({
    where: { status: COMPLETED_STATUS, createdAt: { gte: first } },
    select: { totalAmount: true, createdAt: true, items: { select: { commissionAmount: true } } },
  })

  const buckets: { periode: string; gmv: number; commissions: number; orders: number }[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1))
    buckets.push({ periode: d.toISOString().slice(0, 7), gmv: 0, commissions: 0, orders: 0 })
  }
  for (const order of orders) {
    if (!order.createdAt) continue
    const key = order.createdAt.toISOString().slice(0, 7)
    const bucket = buckets.find((b) => b.periode === key)
    if (!bucket) continue
    bucket.gmv += order.totalAmount ?? 0
    bucket.orders += 1
    bucket.commissions += order.items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0)
  }

  return { buckets }
}

// ---------------------------------------------------------------------------
// Vendeurs — agrégation par vendeur sur les commandes COMPLETED de la période
// (une requête de lignes, agrégation JS comme getAdminOverview : le comptage
// distinct des commandes n'est pas exprimable en groupBy Prisma).
// ---------------------------------------------------------------------------

interface VendorAggregate {
  vendorId: string
  commandes: number
  gmv: number
  commissions: number
}

async function aggregateVendorsByPeriode(periode: string): Promise<VendorAggregate[]> {
  const { start, end } = periodeBounds(periode)
  const items = await prisma.orderItem.findMany({
    where: { order: orderPeriodWhere(start, end) },
    select: { vendorId: true, orderId: true, priceSnapshot: true, commissionAmount: true },
  })

  const byVendor = new Map<string, { commandes: Set<string>; gmv: number; commissions: number }>()
  for (const item of items) {
    let agg = byVendor.get(item.vendorId)
    if (!agg) {
      agg = { commandes: new Set<string>(), gmv: 0, commissions: 0 }
      byVendor.set(item.vendorId, agg)
    }
    agg.commandes.add(item.orderId)
    agg.gmv += item.priceSnapshot ?? 0
    agg.commissions += item.commissionAmount ?? 0
  }

  return [...byVendor.entries()]
    .map(([vendorId, agg]) => ({
      vendorId,
      commandes: agg.commandes.size,
      gmv: agg.gmv,
      commissions: agg.commissions,
    }))
    .sort((a, b) => b.commissions - a.commissions)
}

export async function listFinanceVendors(rawQuery: unknown) {
  const parsed = financeVendorsQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw invalidQuery(parsed.error)
  const periode = parsed.data.periode ?? currentPeriode()
  const page = parsed.data.page ?? 1
  const limit = parsed.data.limit ?? 20

  const rows = await aggregateVendorsByPeriode(periode)
  const total = rows.length
  const slice = rows.slice((page - 1) * limit, page * limit)

  const infos = await prisma.vendor.findMany({
    where: { id: { in: slice.map((r) => r.vendorId) } },
    select: { id: true, shopName: true, phone: true },
  })
  const infoById = new Map(infos.map((v) => [v.id, v]))

  const vendors = await Promise.all(
    slice.map(async (row) => {
      // Escrow actuellement bloqué sur les commandes contenant ce vendeur.
      const escrow = await prisma.escrowTransaction.aggregate({
        where: { status: ESCROW_HELD, order: { items: { some: { vendorId: row.vendorId } } } },
        _sum: { amount: true },
      })
      const info = infoById.get(row.vendorId)
      return {
        vendorId: row.vendorId,
        shopName: info?.shopName ?? '(supprimé)',
        phone: info?.phone ?? null,
        commandes: row.commandes,
        gmv: row.gmv,
        commissions: row.commissions,
        escrowEnCours: escrow._sum.amount ?? 0,
      }
    }),
  )

  return { vendors, total, page, limit }
}

// ---------------------------------------------------------------------------
// CSV — Excel français : BOM UTF-8, séparateur « ; », guillemets doublés,
// montants entiers FCFA, dates YYYY-MM-DD, lignes CRLF.
// ---------------------------------------------------------------------------

type CsvCell = string | number

function csvEscape(value: CsvCell): string {
  const s = String(value)
  if (!/[;"\n\r]/.test(s)) return s
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((cols) => cols.map(csvEscape).join(';'))
  // BOM (U+FEFF) en tête : sans lui, Excel interprète le fichier en latin-1.
  return `\u{FEFF}${lines.join('\r\n')}`
}

function csvDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : ''
}

/** Une ligne par commande COMPLETED de la période. */
export async function exportCommandesCsv(rawQuery: unknown) {
  const parsed = financeExportQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw invalidQuery(parsed.error)
  const periode = parsed.data.periode
  const { start, end } = periodeBounds(periode)

  const orders = await prisma.order.findMany({
    where: orderPeriodWhere(start, end),
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      deliveryFee: true,
      laborCost: true,
      initiator: { select: { name: true, phone: true } },
      items: { select: { vendorShopName: true, commissionAmount: true } },
      escrow: { select: { status: true } },
    },
  })

  const rows: CsvCell[][] = orders.map((o) => [
    csvDate(o.createdAt),
    o.id,
    o.initiator.name ?? o.initiator.phone ?? '',
    [...new Set(o.items.map((i) => i.vendorShopName))].join(', '),
    o.totalAmount ?? 0,
    o.deliveryFee ?? 0,
    o.laborCost ?? 0,
    o.items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0),
    o.escrow?.status ?? 'AUCUN',
  ])

  return {
    filename: `commandes-${periode}.csv`,
    csv: toCsv(
      [
        'Date',
        'N° commande',
        'Client',
        'Vendeur',
        'Montant',
        'Livraison',
        "Main-d'œuvre",
        'Commission',
        'Statut escrow',
      ],
      rows,
    ),
  }
}

/** Agrégé par vendeur (toutes lignes, trié par commissions décroissantes). */
export async function exportCommissionsCsv(rawQuery: unknown) {
  const parsed = financeExportQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw invalidQuery(parsed.error)
  const periode = parsed.data.periode

  const rows = await aggregateVendorsByPeriode(periode)
  const infos = await prisma.vendor.findMany({
    where: { id: { in: rows.map((r) => r.vendorId) } },
    select: { id: true, shopName: true, phone: true },
  })
  const infoById = new Map(infos.map((v) => [v.id, v]))

  const csvRows: CsvCell[][] = rows.map((r) => {
    const info = infoById.get(r.vendorId)
    return [info?.shopName ?? '(supprimé)', info?.phone ?? '', r.commandes, r.gmv, r.commissions]
  })

  return {
    filename: `commissions-${periode}.csv`,
    csv: toCsv(['Vendeur', 'Téléphone', 'Commandes', 'GMV', 'Commissions'], csvRows),
  }
}

/** Mouvements escrow touchés par la période (bloqués, libérés ou remboursés). */
export async function exportEscrowCsv(rawQuery: unknown) {
  const parsed = financeExportQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw invalidQuery(parsed.error)
  const periode = parsed.data.periode
  const { start, end } = periodeBounds(periode)

  const transactions = await prisma.escrowTransaction.findMany({
    where: {
      OR: [
        { heldAt: { gte: start, lt: end } },
        { releasedAt: { gte: start, lt: end } },
        { refundedAt: { gte: start, lt: end } },
      ],
    },
    orderBy: { heldAt: 'asc' },
    select: {
      orderId: true,
      amount: true,
      status: true,
      heldAt: true,
      releasedAt: true,
      refundedAt: true,
    },
  })

  const rows: CsvCell[][] = transactions.map((t) => [
    csvDate(t.heldAt),
    t.orderId,
    t.amount,
    t.status,
    csvDate(t.releasedAt),
    csvDate(t.refundedAt),
  ])

  return {
    filename: `escrow-${periode}.csv`,
    csv: toCsv(
      ['Date blocage', 'Commande', 'Montant', 'Statut', 'Date libération', 'Date remboursement'],
      rows,
    ),
  }
}
