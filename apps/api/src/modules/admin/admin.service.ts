import { prisma } from '../../lib/prisma.js'
import { Prisma } from '@prisma/client'
import { AppError } from '../../lib/appError.js'
import { addPhotoToItem, removePhotoFromItem, reorderItemPhotos } from '../catalog/catalog.service.js'

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

export async function getAdminCatalog(status?: string) {
  const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
  const where = status && validStatuses.includes(status as typeof validStatuses[number])
    ? { status: status as typeof validStatuses[number] }
    : {}

  const items = await prisma.catalogItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      vendor: { select: { id: true, shopName: true } },
    },
  })

  return { items, total: items.length }
}

// ---------------------------------------------------------------------------
// Admin annonce detail + edit (clickable rows in the Annonces menu)
// ---------------------------------------------------------------------------

export async function getAdminCatalogItem(id: string) {
  const item = await prisma.catalogItem.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, shopName: true, isExternal: true, externalSource: true } },
      photos: { orderBy: { position: 'asc' } },
      fitments: { orderBy: [{ brand: 'asc' }, { model: 'asc' }] },
    },
  })
  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Annonce introuvable' })
  }
  return item
}

interface AdminCatalogItemPatch {
  name?: string | null
  category?: string | null
  oemReference?: string | null
  price?: number | null
  condition?: 'NEW' | 'USED' | 'REFURBISHED' | null
  partSource?: 'OEM' | 'AFTERMARKET' | 'COMPATIBLE' | null
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  inStock?: boolean
}

export async function updateAdminCatalogItem(id: string, patch: AdminCatalogItemPatch) {
  const exists = await prisma.catalogItem.findUnique({ where: { id }, select: { id: true } })
  if (!exists) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Annonce introuvable' })
  }

  const data: Prisma.CatalogItemUpdateInput = {}
  if (patch.name !== undefined) data.name = patch.name
  if (patch.category !== undefined) data.category = patch.category
  if (patch.oemReference !== undefined) data.oemReference = patch.oemReference
  if (patch.condition !== undefined) data.condition = patch.condition
  if (patch.partSource !== undefined) data.partSource = patch.partSource
  if (patch.status !== undefined) data.status = patch.status
  if (patch.inStock !== undefined) data.inStock = patch.inStock
  if (patch.price !== undefined) {
    data.price = patch.price
    data.priceUpdatedAt = new Date()
  }

  await prisma.catalogItem.update({ where: { id }, data })
  return getAdminCatalogItem(id)
}

// Admin fitment correction — bypasses the vendor-ownership guard used by the
// SELLER-facing catalog API. An admin may fix compatibility on any annonce,
// including externally-imported ones (subject to overwrite on next import).
export interface AdminFitmentInput {
  brand: string
  model?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  engine?: string | null
}

export async function replaceAdminFitments(itemId: string, fitments: AdminFitmentInput[]) {
  const exists = await prisma.catalogItem.findUnique({ where: { id: itemId }, select: { id: true } })
  if (!exists) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Annonce introuvable' })
  }
  return prisma.$transaction(async (tx) => {
    await tx.catalogItemFitment.deleteMany({ where: { catalogItemId: itemId } })
    if (fitments.length > 0) {
      await tx.catalogItemFitment.createMany({
        data: fitments.map((f) => ({
          catalogItemId: itemId,
          brand: f.brand,
          model: f.model ?? null,
          yearFrom: f.yearFrom ?? null,
          yearTo: f.yearTo ?? null,
          engine: f.engine ?? null,
        })),
      })
    }
    return tx.catalogItemFitment.findMany({
      where: { catalogItemId: itemId },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearFrom: 'asc' }],
    })
  })
}

interface AdminVendorPatch {
  shopName?: string
  contactName?: string
  phone?: string
}

/** Admin edit of a vendor's info (nom de boutique + nom du contact + téléphone). */
export async function updateAdminVendor(vendorId: string, patch: AdminVendorPatch) {
  const exists = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } })
  if (!exists) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Vendeur introuvable' })
  }

  const data: Prisma.VendorUpdateInput = {}
  if (patch.shopName !== undefined) data.shopName = patch.shopName
  if (patch.contactName !== undefined) data.contactName = patch.contactName
  if (patch.phone !== undefined) data.phone = patch.phone

  await prisma.vendor.update({ where: { id: vendorId }, data })
  return getAdminVendorDetail(vendorId)
}

/** Resolve an annonce's vendorId so the R2 key can be scoped, asserting it exists. */
async function adminItemVendorId(id: string): Promise<string> {
  const item = await prisma.catalogItem.findUnique({ where: { id }, select: { vendorId: true } })
  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Annonce introuvable' })
  }
  return item.vendorId
}

export async function addAdminPhoto(
  itemId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const vendorId = await adminItemVendorId(itemId)
  return addPhotoToItem(vendorId, itemId, fileBuffer, fileName, mimeType)
}

export async function removeAdminPhoto(itemId: string, photoId: string) {
  await adminItemVendorId(itemId)
  return removePhotoFromItem(itemId, photoId)
}

export async function reorderAdminPhotos(itemId: string, photoIds: string[]) {
  await adminItemVendorId(itemId)
  return reorderItemPhotos(itemId, photoIds)
}

// ---------------------------------------------------------------------------
// Phase 2: rich admin dashboard endpoints (overview, detail, analytics, CSV)
// ---------------------------------------------------------------------------

const COMPLETED_STATUS = 'COMPLETED' as const

export async function getAdminOverview() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    totalUsers,
    totalVendors,
    totalEnterprises,
    totalOrders,
    activeOrders,
    ordersThisMonth,
    newUsersThisMonth,
    completedOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.enterprise.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.findMany({
      where: { status: COMPLETED_STATUS },
      select: { totalAmount: true, createdAt: true, items: { select: { commissionAmount: true } } },
    }),
  ])

  const totalGMV = completedOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)
  const totalCommissions = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0),
    0,
  )

  // Revenue per month for the last 12 months
  const monthBuckets: { month: string; gmv: number; commissions: number; orders: number }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1)
    monthBuckets.push({ month: d.toISOString().slice(0, 7), gmv: 0, commissions: 0, orders: 0 })
  }
  for (const order of completedOrders) {
    if (!order.createdAt) continue
    const key = order.createdAt.toISOString().slice(0, 7)
    const bucket = monthBuckets.find((b) => b.month === key)
    if (!bucket) continue
    bucket.gmv += order.totalAmount ?? 0
    bucket.orders += 1
    bucket.commissions += order.items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0)
  }

  // Top 5 vendors by commissions earned
  const topVendorsRaw = await prisma.orderItem.groupBy({
    by: ['vendorId'],
    where: { order: { status: COMPLETED_STATUS } },
    _sum: { commissionAmount: true, priceSnapshot: true },
    _count: { _all: true },
    orderBy: { _sum: { commissionAmount: 'desc' } },
    take: 5,
  })
  const topVendors = await Promise.all(
    topVendorsRaw.map(async (row) => {
      const v = await prisma.vendor.findUnique({
        where: { id: row.vendorId },
        select: { id: true, shopName: true },
      })
      return {
        vendorId: row.vendorId,
        shopName: v?.shopName ?? '(supprimé)',
        commissions: row._sum.commissionAmount ?? 0,
        gmv: row._sum.priceSnapshot ?? 0,
        orderItems: row._count._all,
      }
    }),
  )

  return {
    totals: {
      users: totalUsers,
      vendors: totalVendors,
      enterprises: totalEnterprises,
      orders: totalOrders,
      activeOrders,
      gmv: totalGMV,
      commissions: totalCommissions,
    },
    thisMonth: { orders: ordersThisMonth, newUsers: newUsersThisMonth },
    revenueByMonth: monthBuckets,
    topVendors,
  }
}

interface AdminListQuery {
  q?: string
  status?: string
  vendorId?: string
  role?: string
  source?: 'HAUTOPARTS_3H' | 'MAPA_CI' | 'JUMIA_CI' | 'COINAFRIQUE_CI' | 'ANNUAIRE_CI' | 'GLOBAL_AUTO_CI' | 'OSM' | 'GOOGLE_PLACES' | 'NHTSA' | 'WIKIPEDIA' | 'PARTSOUQ' | 'MANUAL'
  hasOem?: 'true' | 'false'
  page?: number
  limit?: number
}

export async function getAdminCatalogList(query: AdminListQuery) {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 50, 200)
  const skip = (page - 1) * limit

  const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
  const where: Prisma.CatalogItemWhereInput = {}
  if (query.status && validStatuses.includes(query.status as typeof validStatuses[number])) {
    where.status = query.status as typeof validStatuses[number]
  }
  if (query.vendorId) where.vendorId = query.vendorId
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { category: { contains: query.q, mode: 'insensitive' } },
      { oemReference: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        vendor: { select: { id: true, shopName: true } },
        photos: { orderBy: { position: 'asc' }, take: 1, select: { urlThumb: true, urlOriginal: true } },
      },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getAdminVendorsList(query: AdminListQuery) {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 50, 200)
  const skip = (page - 1) * limit

  const where: Prisma.VendorWhereInput = {}
  if (query.q) {
    where.OR = [
      { shopName: { contains: query.q, mode: 'insensitive' } },
      { user: { phone: { contains: query.q } } },
      { user: { email: { contains: query.q, mode: 'insensitive' } } },
    ]
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, phone: true, email: true, name: true } },
        _count: { select: { catalogItems: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ])

  return { vendors, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getAdminVendorDetail(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      user: { select: { id: true, phone: true, email: true, name: true, createdAt: true } },
      kyc: true,
    },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Vendeur introuvable' })
  }

  const [items, transactions, commissionAgg] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        price: true,
        commissionAmount: true,
        status: true,
        condition: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { vendorId, order: { status: COMPLETED_STATUS } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        name: true,
        priceSnapshot: true,
        commissionAmount: true,
        quantity: true,
        createdAt: true,
        order: { select: { id: true, status: true, totalAmount: true } },
      },
    }),
    prisma.orderItem.aggregate({
      where: { vendorId, order: { status: COMPLETED_STATUS } },
      _sum: { commissionAmount: true, priceSnapshot: true },
      _count: { _all: true },
    }),
  ])

  // Per-month commission breakdown for last 12 months
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const monthBuckets: { month: string; commissions: number; gmv: number; orders: number }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1)
    monthBuckets.push({ month: d.toISOString().slice(0, 7), commissions: 0, gmv: 0, orders: 0 })
  }
  for (const t of transactions) {
    const key = t.createdAt.toISOString().slice(0, 7)
    const bucket = monthBuckets.find((b) => b.month === key)
    if (!bucket) continue
    bucket.commissions += t.commissionAmount ?? 0
    bucket.gmv += t.priceSnapshot * t.quantity
    bucket.orders += 1
  }

  return {
    vendor,
    items,
    transactions,
    totals: {
      commissions: commissionAgg._sum.commissionAmount ?? 0,
      gmv: commissionAgg._sum.priceSnapshot ?? 0,
      transactionCount: commissionAgg._count._all,
    },
    commissionByMonth: monthBuckets,
  }
}

export async function getAdminClientsList(query: AdminListQuery) {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 50, 200)
  const skip = (page - 1) * limit

  const where: Prisma.UserWhereInput = {}
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { phone: { contains: query.q } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ]
  }
  if (query.role) {
    where.roles = { has: query.role as Prisma.UserWhereInput['roles'] extends { has?: infer R } ? R : never }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        roles: true,
        activeContext: true,
        createdAt: true,
        _count: { select: { initiatedOrders: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getAdminClientDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, phone: true, email: true, roles: true,
      activeContext: true, createdAt: true,
    },
  })
  if (!user) throw new AppError('USER_NOT_FOUND', 404, { message: 'Utilisateur introuvable' })

  const orders = await prisma.order.findMany({
    where: { initiatorId: userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, status: true, totalAmount: true, createdAt: true,
      items: { select: { id: true, name: true, priceSnapshot: true, quantity: true } },
    },
  })

  const totalSpent = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0)

  return { user, orders, totals: { orderCount: orders.length, totalSpent } }
}

export async function getAdminEnterprisesList(query: AdminListQuery) {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 50, 200)
  const skip = (page - 1) * limit

  const where: Prisma.EnterpriseWhereInput = {}
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { commune: { contains: query.q, mode: 'insensitive' } },
      { rccm: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  const [enterprises, total] = await Promise.all([
    prisma.enterprise.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { vehicles: true, members: true } } },
    }),
    prisma.enterprise.count({ where }),
  ])

  return { enterprises, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getAdminEnterpriseDetail(enterpriseId: string) {
  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      },
      vehicles: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!enterprise) {
    throw new AppError('ENTERPRISE_NOT_FOUND', 404, { message: 'Entreprise introuvable' })
  }

  const orders = await prisma.order.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, status: true, totalAmount: true, createdAt: true },
  })

  return { enterprise, orders }
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvRows(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const out = [headers.join(',')]
  for (const r of rows) out.push(r.map(csvCell).join(','))
  return out.join('\n')
}

export async function exportCsv(entity: 'vendors' | 'clients' | 'orders' | 'catalog'): Promise<string> {
  if (entity === 'vendors') {
    const rows = await prisma.vendor.findMany({
      include: { user: { select: { phone: true, email: true, name: true } } },
    })
    return csvRows(
      ['id', 'shopName', 'status', 'name', 'phone', 'email', 'createdAt'],
      rows.map((v) => [v.id, v.shopName, v.status, v.user?.name ?? '', v.user?.phone ?? v.phone, v.user?.email ?? '', v.createdAt.toISOString()]),
    )
  }

  if (entity === 'clients') {
    const rows = await prisma.user.findMany({
      select: { id: true, name: true, phone: true, email: true, roles: true, createdAt: true },
    })
    return csvRows(
      ['id', 'name', 'phone', 'email', 'roles', 'createdAt'],
      rows.map((u) => [u.id, u.name, u.phone, u.email, u.roles.join(';'), u.createdAt.toISOString()]),
    )
  }

  if (entity === 'orders') {
    const rows = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { select: { commissionAmount: true } } },
    })
    return csvRows(
      ['id', 'status', 'totalAmount', 'commissionsTotal', 'createdAt'],
      rows.map((o) => [
        o.id,
        o.status,
        o.totalAmount,
        o.items.reduce((s, i) => s + (i.commissionAmount ?? 0), 0),
        o.createdAt.toISOString(),
      ]),
    )
  }

  // catalog
  const rows = await prisma.catalogItem.findMany({
    include: { vendor: { select: { shopName: true } } },
  })
  return csvRows(
    ['id', 'vendorShopName', 'name', 'category', 'price', 'commissionAmount', 'status', 'condition', 'createdAt'],
    rows.map((c) => [
      c.id, c.vendor.shopName, c.name, c.category, c.price,
      c.commissionAmount, c.status, c.condition, c.createdAt.toISOString(),
    ]),
  )
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

// ---------------------------------------------------------------------------
// Liaisons admin oversight
// ---------------------------------------------------------------------------

export async function getAdminLiaisonsList() {
  const liaisons = await prisma.user.findMany({
    where: { roles: { has: 'LIAISON' } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      roles: true,
      activeContext: true,
      createdAt: true,
      _count: {
        select: {
          managedVendors: true,
          liaisonCatalogItems: true,
          activityLogs: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // For pending acceptance, we need a separate count per liaison
  const pendingByLiaison = await prisma.catalogItem.groupBy({
    by: ['createdByLiaisonId'],
    where: {
      createdByLiaisonId: { not: null },
      commissionAcceptedAt: null,
    },
    _count: { _all: true },
  })

  const pendingMap = new Map<string, number>()
  for (const row of pendingByLiaison) {
    if (row.createdByLiaisonId) pendingMap.set(row.createdByLiaisonId, row._count._all)
  }

  return liaisons.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    roles: l.roles,
    activeContext: l.activeContext,
    createdAt: l.createdAt,
    stats: {
      vendors: l._count.managedVendors,
      parts: l._count.liaisonCatalogItems,
      activities: l._count.activityLogs,
      pendingAcceptance: pendingMap.get(l.id) ?? 0,
    },
  }))
}

export async function getAdminLiaisonDetail(liaisonId: string) {
  const liaison = await prisma.user.findFirst({
    where: { id: liaisonId, roles: { has: 'LIAISON' } },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      roles: true,
      activeContext: true,
      createdAt: true,
      managedVendors: {
        select: {
          id: true,
          shopName: true,
          contactName: true,
          phone: true,
          status: true,
          commune: true,
          createdAt: true,
          _count: { select: { catalogItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      liaisonCatalogItems: {
        select: {
          id: true,
          name: true,
          price: true,
          commissionAmount: true,
          commissionAcceptedAt: true,
          status: true,
          createdAt: true,
          vendor: { select: { id: true, shopName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!liaison) {
    throw new AppError('LIAISON_NOT_FOUND', 404, { message: 'Liaison introuvable' })
  }

  return liaison
}

export async function getAdminLiaisonActivity(
  liaisonId: string,
  page = 1,
  limit = 50,
) {
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { actorId: liaisonId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.activityLog.count({ where: { actorId: liaisonId } }),
  ])

  return { items, total, page, totalPages: Math.ceil(total / limit) }
}

export async function getAdminExternalImports(query: AdminListQuery) {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 50, 200)
  const skip = (page - 1) * limit

  const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
  const where: Prisma.CatalogItemWhereInput = {
    externalSource: query.source ?? { not: null },
  }
  if (query.status && validStatuses.includes(query.status as typeof validStatuses[number])) {
    where.status = query.status as typeof validStatuses[number]
  }
  if (query.hasOem === 'true') where.oemReference = { not: null }
  if (query.hasOem === 'false') where.oemReference = null
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { category: { contains: query.q, mode: 'insensitive' } },
      { oemReference: { contains: query.q, mode: 'insensitive' } },
      { externalSourceId: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        oemReference: true,
        price: true,
        status: true,
        condition: true,
        partSource: true,
        inStock: true,
        imageOriginalUrl: true,
        externalSource: true,
        externalSourceId: true,
        externalSourceUrl: true,
        createdAt: true,
        updatedAt: true,
        vendor: { select: { id: true, shopName: true, isExternal: true } },
      },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getAdminExternalImportStats() {
  const grouped = await prisma.catalogItem.groupBy({
    by: ['externalSource'],
    where: { externalSource: { not: null } },
    _count: { _all: true },
    _max: { updatedAt: true },
  })

  const withOemGrouped = await prisma.catalogItem.groupBy({
    by: ['externalSource'],
    where: { externalSource: { not: null }, oemReference: { not: null } },
    _count: { _all: true },
  })
  const withOemBySource = new Map(
    withOemGrouped.map((g) => [g.externalSource, g._count._all]),
  )

  const sources = grouped.map((g) => {
    const total = g._count._all
    const withOem = withOemBySource.get(g.externalSource) ?? 0
    return {
      source: g.externalSource,
      total,
      withOem,
      withoutOem: total - withOem,
      lastImportAt: g._max.updatedAt,
    }
  })

  return { sources }
}
