import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'

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
