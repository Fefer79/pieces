import { prisma } from '../../lib/prisma.js'

// Story 9.1: Order history for user
export async function getUserOrderHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { initiatorId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: true,
        delivery: { select: { id: true, status: true, deliveredAt: true } },
      },
    }),
    prisma.order.count({ where: { initiatorId: userId } }),
  ])

  return { orders, total, page, totalPages: Math.ceil(total / limit) }
}

// Story 9.2: Admin cross-tenant operations
export async function getAdminDashboardStats() {
  const [
    totalUsers,
    totalVendors,
    totalOrders,
    activeOrders,
    totalDisputes,
    openDisputes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.dispute.count(),
    prisma.dispute.count({ where: { status: 'OPEN' } }),
  ])

  return { totalUsers, totalVendors, totalOrders, activeOrders, totalDisputes, openDisputes }
}

export async function getAdminUsers(page = 1, limit = 50) {
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        phone: true,
        roles: true,
        activeContext: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ])

  return { users, total, page, totalPages: Math.ceil(total / limit) }
}

const VALID_ORDER_STATUSES = [
  'DRAFT', 'PENDING_PAYMENT', 'PAID', 'VENDOR_CONFIRMED',
  'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'COMPLETED', 'CANCELLED',
] as const

export async function getAdminOrders(page = 1, limit = 50, status?: string) {
  const skip = (page - 1) * limit
  const validStatus = status && VALID_ORDER_STATUSES.includes(status as typeof VALID_ORDER_STATUSES[number])
    ? { status: status as typeof VALID_ORDER_STATUSES[number] }
    : {}
  const where = validStatus

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ])

  return { orders, total, page, totalPages: Math.ceil(total / limit) }
}

export async function getAdminVendors(page = 1, limit = 50) {
  const skip = (page - 1) * limit

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { kyc: { select: { kycType: true } } },
    }),
    prisma.vendor.count(),
  ])

  return { vendors, total, page, totalPages: Math.ceil(total / limit) }
}

// Story 9.3: Enterprise space
export async function getEnterpriseMembers(enterpriseUserId: string) {
  // Enterprise users can manage a fleet of mechanics
  // For MVP: return users sharing the same enterprise context
  const user = await prisma.user.findUnique({
    where: { id: enterpriseUserId },
    select: { roles: true },
  })

  if (!user?.roles.includes('ENTERPRISE')) {
    return { members: [], total: 0 }
  }

  // Placeholder: In full implementation, Enterprise model with member relations
  return { members: [], total: 0 }
}
