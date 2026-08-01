import { crmClientSegmentSchema, crmVendorSegmentSchema } from 'shared/validators'
import { prisma } from './prisma.js'
import { AppError } from './appError.js'
import { vendorMissingFields } from '../modules/liaison/vendorRelance.service.js'

const DAY_MS = 24 * 60 * 60 * 1000

const CLIENT_SEGMENTS = ['nouveau', 'actif', 'fidele', 'a_risque', 'inactif'] as const

// ---------------------------------------------------------------------------
// Segments clients (comportementaux, calculés à la volée — rien n'est stocké)
// ---------------------------------------------------------------------------

interface ClientSignals {
  createdAt: Date
  lastOrderAt: Date | null
  orderCount: number
}

async function collectClientSignals(): Promise<Map<string, ClientSignals>> {
  const [users, orderStats] = await Promise.all([
    prisma.user.findMany({ select: { id: true, createdAt: true } }),
    prisma.order.groupBy({
      by: ['initiatorId'],
      _max: { createdAt: true },
      _count: { id: true },
    }),
  ])
  const statsByUser = new Map(orderStats.map((s) => [s.initiatorId, s]))
  const signals = new Map<string, ClientSignals>()
  for (const user of users) {
    const stats = statsByUser.get(user.id)
    signals.set(user.id, {
      createdAt: user.createdAt,
      lastOrderAt: stats?._max.createdAt ?? null,
      orderCount: stats?._count.id ?? 0,
    })
  }
  return signals
}

function matchesClientSegment(signals: ClientSignals, segment: string, now: Date): boolean {
  const accountAgeDays = (now.getTime() - signals.createdAt.getTime()) / DAY_MS
  const daysSinceLastOrder = signals.lastOrderAt
    ? (now.getTime() - signals.lastOrderAt.getTime()) / DAY_MS
    : null
  switch (segment) {
    case 'nouveau':
      return accountAgeDays <= 30
    case 'actif':
      return daysSinceLastOrder !== null && daysSinceLastOrder <= 60
    case 'fidele':
      return signals.orderCount >= 3 && daysSinceLastOrder !== null && daysSinceLastOrder <= 90
    case 'a_risque':
      return daysSinceLastOrder !== null && daysSinceLastOrder > 60 && daysSinceLastOrder <= 120
    case 'inactif':
      return daysSinceLastOrder !== null ? daysSinceLastOrder > 120 : accountAgeDays > 120
    default:
      return false
  }
}

function clientSegmentIds(
  signals: Map<string, ClientSignals>,
  segment: string,
  now: Date,
): string[] {
  const ids: string[] = []
  for (const [id, s] of signals) {
    if (matchesClientSegment(s, segment, now)) ids.push(id)
  }
  return ids
}

export async function resolveClientSegmentIds(segment: string): Promise<string[]> {
  const parsed = crmClientSegmentSchema.safeParse(segment)
  if (!parsed.success) {
    throw new AppError('CRM_INVALID_SEGMENT', 422, { message: 'Segment inconnu' })
  }
  const signals = await collectClientSignals()
  return clientSegmentIds(signals, parsed.data, new Date())
}

export async function countClientSegments(): Promise<Record<string, number>> {
  const signals = await collectClientSignals()
  const now = new Date()
  const counts: Record<string, number> = {}
  for (const segment of CLIENT_SEGMENTS) {
    counts[segment] = clientSegmentIds(signals, segment, now).length
  }
  return counts
}

// ---------------------------------------------------------------------------
// Segments vendeurs
// ---------------------------------------------------------------------------

export async function resolveVendorSegmentIds(segment: string): Promise<string[]> {
  const parsed = crmVendorSegmentSchema.safeParse(segment)
  if (!parsed.success) {
    throw new AppError('CRM_INVALID_SEGMENT', 422, { message: 'Segment inconnu' })
  }

  switch (parsed.data) {
    case 'actif': {
      const vendors = await prisma.vendor.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      })
      return vendors.map((v) => v.id)
    }
    case 'sans_commande_30j': {
      // Jamais commandé inclus : seuls les vendeurs avec une commande récente
      // (≤ 30 j, via OrderItem.createdAt) sont exclus.
      const threshold = new Date(Date.now() - 30 * DAY_MS)
      const [vendors, lastOrders] = await Promise.all([
        prisma.vendor.findMany({ select: { id: true } }),
        prisma.orderItem.groupBy({ by: ['vendorId'], _max: { createdAt: true } }),
      ])
      const lastByVendor = new Map(lastOrders.map((r) => [r.vendorId, r._max.createdAt]))
      return vendors
        .filter((v) => {
          const last = lastByVendor.get(v.id)
          return !last || last < threshold
        })
        .map((v) => v.id)
    }
    case 'fiche_incomplete': {
      // Mêmes critères que la relance automatique (vendorMissingFields : KYC,
      // commune, GPS). Les vendeurs externes (imports scrapers) sont exclus :
      // ce ne sont pas des fiches gérées et elles noieraient le segment.
      const vendors = await prisma.vendor.findMany({
        where: { isExternal: false },
        select: { id: true, commune: true, lat: true, kyc: { select: { id: true } } },
      })
      return vendors.filter((v) => vendorMissingFields(v).length > 0).map((v) => v.id)
    }
    case 'litiges_ouverts': {
      const disputes = await prisma.dispute.findMany({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        select: { order: { select: { items: { select: { vendorId: true } } } } },
      })
      const ids = new Set<string>()
      for (const dispute of disputes) {
        for (const item of dispute.order.items) {
          if (item.vendorId) ids.add(item.vendorId)
        }
      }
      return [...ids]
    }
  }
}
