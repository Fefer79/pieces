import type { OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { assertMember } from './enterprise.service.js'

/**
 * Commandes rattachées à une entreprise.
 *
 * À ne pas confondre avec `getUserOrderHistory` (admin.service.ts), qui filtre
 * sur `initiatorId` : un gestionnaire de flotte qui n'a jamais commandé
 * lui-même n'y voit rien, alors que sa flotte peut avoir des centaines de
 * commandes. Ici on filtre sur `enterpriseId` — posé par `createOrder` à partir
 * du véhicule concerné.
 */

// Le mécanicien voit ce qu'il a lui-même engagé, pas la dépense globale de son
// employeur. Le propriétaire, le gestionnaire et le comptable voient tout.
const FULL_VISIBILITY_ROLES = ['OWNER', 'MANAGER', 'ACCOUNTANT']

const SELECT = {
  id: true,
  status: true,
  totalAmount: true,
  deliveryFee: true,
  laborCost: true,
  paymentMethod: true,
  deliveryCommune: true,
  paidAt: true,
  createdAt: true,
  vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
  initiator: { select: { id: true, name: true, phone: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
  items: {
    select: {
      id: true,
      name: true,
      quantity: true,
      priceSnapshot: true,
      condition: true,
      partSource: true,
      vendorShopName: true,
    },
  },
} as const

export interface ListEnterpriseOrdersFilters {
  page?: number
  limit?: number
  status?: OrderStatus
  vehicleId?: string
  from?: string
  to?: string
}

export async function listEnterpriseOrders(
  enterpriseId: string,
  userId: string,
  filters: ListEnterpriseOrdersFilters = {},
) {
  const member = await assertMember(enterpriseId, userId)

  const page = Math.max(filters.page ?? 1, 1)
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
  const skip = (page - 1) * limit

  const where: {
    enterpriseId: string
    initiatorId?: string
    status?: OrderStatus
    vehicleId?: string
    createdAt?: { gte?: Date; lte?: Date }
  } = { enterpriseId }

  if (!FULL_VISIBILITY_ROLES.includes(member.role)) {
    where.initiatorId = userId
  }
  if (filters.status) where.status = filters.status
  if (filters.vehicleId) where.vehicleId = filters.vehicleId
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = new Date(filters.from)
    if (filters.to) where.createdAt.lte = new Date(filters.to)
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: SELECT,
    }),
    prisma.order.count({ where }),
  ])

  return {
    orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    // Le front en a besoin pour savoir s'il montre l'export CSV et la colonne
    // « Demandeur » (qui n'a pas de sens quand on ne voit que ses propres
    // commandes).
    scope: where.initiatorId ? ('own' as const) : ('enterprise' as const),
  }
}
