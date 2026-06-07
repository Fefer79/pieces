import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import { notifyBufferReplenish } from '../notification/notification.service.js'

export interface BufferStockInput {
  catalogItemId: string
  targetQty: number
  currentQty?: number
  autoReplenish?: boolean
  notes?: string | null
}

export type StockStatus = 'OUT' | 'LOW' | 'BELOW_TARGET' | 'OK'

const SELECT = {
  id: true,
  enterpriseId: true,
  catalogItemId: true,
  targetQty: true,
  currentQty: true,
  autoReplenish: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  catalogItem: {
    select: {
      id: true,
      name: true,
      category: true,
      oemReference: true,
      imageThumbUrl: true,
      vendor: { select: { id: true, shopName: true } },
    },
  },
} as const

export function computeStockStatus(currentQty: number, targetQty: number): StockStatus {
  if (currentQty <= 0) return 'OUT'
  if (targetQty > 0 && currentQty < targetQty * 0.5) return 'LOW'
  if (currentQty < targetQty) return 'BELOW_TARGET'
  return 'OK'
}

export async function listBufferStock(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)
  const rows = await prisma.enterpriseBufferStock.findMany({
    where: { enterpriseId },
    select: SELECT,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    ...r,
    status: computeStockStatus(r.currentQty, r.targetQty),
  }))
}

export async function createBufferStock(
  enterpriseId: string,
  userId: string,
  data: BufferStockInput,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const item = await prisma.catalogItem.findUnique({
    where: { id: data.catalogItemId },
    select: { id: true },
  })
  if (!item) throw new AppError('CATALOG_ITEM_NOT_FOUND', 404)

  const existing = await prisma.enterpriseBufferStock.findFirst({
    where: { enterpriseId, catalogItemId: data.catalogItemId },
    select: { id: true },
  })
  if (existing) {
    throw new AppError('BUFFER_STOCK_ALREADY_EXISTS', 409, {
      message: 'Cette référence est déjà suivie. Utilisez la mise à jour.',
    })
  }

  return prisma.enterpriseBufferStock.create({
    data: {
      enterpriseId,
      catalogItemId: data.catalogItemId,
      targetQty: data.targetQty,
      currentQty: data.currentQty ?? 0,
      autoReplenish: data.autoReplenish ?? false,
      notes: data.notes ?? null,
    },
    select: SELECT,
  })
}

export async function updateBufferStock(
  enterpriseId: string,
  userId: string,
  id: string,
  data: Partial<Omit<BufferStockInput, 'catalogItemId'>>,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const existing = await prisma.enterpriseBufferStock.findFirst({
    where: { id, enterpriseId },
    select: { id: true },
  })
  if (!existing) throw new AppError('BUFFER_STOCK_NOT_FOUND', 404)
  return prisma.enterpriseBufferStock.update({
    where: { id },
    data: {
      ...(data.targetQty !== undefined && { targetQty: data.targetQty }),
      ...(data.currentQty !== undefined && { currentQty: data.currentQty }),
      ...(data.autoReplenish !== undefined && { autoReplenish: data.autoReplenish }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: SELECT,
  })
}

export async function adjustBufferStock(
  enterpriseId: string,
  userId: string,
  id: string,
  delta: number,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  const existing = await prisma.enterpriseBufferStock.findFirst({
    where: { id, enterpriseId },
    select: { id: true, currentQty: true },
  })
  if (!existing) throw new AppError('BUFFER_STOCK_NOT_FOUND', 404)
  const next = Math.max(0, existing.currentQty + delta)
  return prisma.enterpriseBufferStock.update({
    where: { id },
    data: { currentQty: next },
    select: SELECT,
  })
}

// On ne regénère pas un bon de réappro pour une même référence tant que le
// dernier date de moins de 7 jours — le temps qu'un gestionnaire le traite.
const REPLENISH_COOLDOWN_MS = 7 * 86_400_000

function generateShareToken(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Parcourt le stock tampon de toutes les entreprises (ou d'une seule) et, pour
 * les références en `autoReplenish` passées sous le seuil (OUT / LOW), génère
 * automatiquement UN bon de réapprovisionnement (commande DRAFT) par entreprise,
 * regroupant la quantité manquante de chaque référence, puis prévient les
 * gestionnaires par WhatsApp. Le paiement reste à la main d'un gestionnaire
 * (pas de prélèvement automatique). Idempotent : cooldown de 7 jours par ligne.
 */
export async function scanAndReplenish(opts?: { enterpriseId?: string }) {
  const enterprises = await prisma.enterprise.findMany({
    where: opts?.enterpriseId ? { id: opts.enterpriseId } : {},
    select: {
      id: true,
      members: {
        where: { role: { in: ['OWNER', 'MANAGER'] } },
        select: { role: true, userId: true, user: { select: { phone: true } } },
      },
      bufferStock: {
        where: { autoReplenish: true },
        select: {
          id: true,
          targetQty: true,
          currentQty: true,
          lastReplenishedAt: true,
          catalogItem: {
            select: {
              id: true,
              name: true,
              category: true,
              price: true,
              imageThumbUrl: true,
              condition: true,
              partSource: true,
              vendorId: true,
              vendor: { select: { shopName: true } },
            },
          },
        },
      },
    },
  })

  const now = Date.now()
  let enterprisesReplenished = 0
  let ordersCreated = 0
  let linesReplenished = 0
  let notificationsSent = 0

  for (const ent of enterprises) {
    // Initiateur du bon : un OWNER (à défaut un MANAGER) avec un compte.
    const initiator =
      ent.members.find((m) => m.role === 'OWNER' && m.userId)?.userId ??
      ent.members.find((m) => m.userId)?.userId
    if (!initiator) continue

    const due = ent.bufferStock.filter((b) => {
      const status = computeStockStatus(b.currentQty, b.targetQty)
      if (status !== 'OUT' && status !== 'LOW') return false
      if (b.catalogItem.price == null) return false // sans prix, on ne peut pas chiffrer
      if (b.targetQty - b.currentQty <= 0) return false
      const recent =
        b.lastReplenishedAt != null && now - b.lastReplenishedAt.getTime() < REPLENISH_COOLDOWN_MS
      return !recent
    })
    if (due.length === 0) continue

    const items = due.map((b) => ({
      catalogItemId: b.catalogItem.id,
      vendorId: b.catalogItem.vendorId,
      vendorShopName: b.catalogItem.vendor.shopName,
      name: b.catalogItem.name ?? 'Pièce',
      category: b.catalogItem.category,
      priceSnapshot: b.catalogItem.price as number,
      quantity: b.targetQty - b.currentQty,
      imageThumbUrl: b.catalogItem.imageThumbUrl,
      condition: b.catalogItem.condition,
      partSource: b.catalogItem.partSource,
    }))
    const totalAmount = items.reduce((s, it) => s + it.priceSnapshot * it.quantity, 0)
    const shareToken = generateShareToken()

    const order = await prisma.order.create({
      data: {
        initiatorId: initiator,
        enterpriseId: ent.id,
        shareToken,
        totalAmount,
        items: { create: items },
        events: {
          create: {
            toStatus: 'DRAFT',
            actor: initiator,
            note: 'Réapprovisionnement automatique',
          },
        },
      },
      select: { id: true },
    })
    ordersCreated++
    enterprisesReplenished++
    linesReplenished += due.length

    await prisma.enterpriseBufferStock.updateMany({
      where: { id: { in: due.map((b) => b.id) } },
      data: { lastReplenishedAt: new Date(), lastReplenishOrderId: order.id },
    })

    const phones = [
      ...new Set(ent.members.map((m) => m.user?.phone).filter((p): p is string => Boolean(p))),
    ]
    for (const phone of phones) {
      const res = await notifyBufferReplenish(phone, {
        itemCount: due.length,
        totalAmount,
        shareToken,
      })
      if (res.success === true) notificationsSent++
    }
  }

  return { enterprisesChecked: enterprises.length, enterprisesReplenished, ordersCreated, linesReplenished, notificationsSent }
}

export async function deleteBufferStock(
  enterpriseId: string,
  userId: string,
  id: string,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const existing = await prisma.enterpriseBufferStock.findFirst({
    where: { id, enterpriseId },
    select: { id: true },
  })
  if (!existing) throw new AppError('BUFFER_STOCK_NOT_FOUND', 404)
  await prisma.enterpriseBufferStock.delete({ where: { id } })
  return { deleted: true }
}
