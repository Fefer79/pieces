import { prisma } from '../../lib/prisma.js'
import { assertMember } from './enterprise.service.js'

const ACTIVE_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'VENDOR_CONFIRMED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
] as const

const SPENT_ORDER_STATUSES = [
  'PAID',
  'VENDOR_CONFIRMED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
  'COMPLETED',
] as const

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export async function getEnterpriseDashboard(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)

  const since = monthStart()

  const [vehiclesCount, membersCount, activeOrders, monthlySpendAgg, topVehicles] =
    await Promise.all([
      prisma.vehicle.count({ where: { enterpriseId } }),
      prisma.enterpriseMember.count({ where: { enterpriseId } }),
      prisma.order.count({
        where: { enterpriseId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
      }),
      prisma.order.aggregate({
        where: {
          enterpriseId,
          status: { in: [...SPENT_ORDER_STATUSES] },
          paidAt: { gte: since },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.groupBy({
        by: ['vehicleId'],
        where: {
          enterpriseId,
          vehicleId: { not: null },
          status: { in: [...SPENT_ORDER_STATUSES] },
        },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
    ])

  const vehicleIds = topVehicles.map((t) => t.vehicleId).filter((v): v is string => Boolean(v))
  const vehicles = vehicleIds.length
    ? await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true, brand: true, model: true, year: true, plate: true },
      })
    : []
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

  return {
    vehiclesCount,
    membersCount,
    activeOrders,
    monthlySpend: monthlySpendAgg._sum.totalAmount ?? 0,
    topVehiclesByCost: topVehicles.map((t) => ({
      vehicle: t.vehicleId ? vehicleById.get(t.vehicleId) ?? null : null,
      totalSpent: t._sum.totalAmount ?? 0,
    })),
  }
}

export async function exportEnterpriseOrdersCsv(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'ACCOUNTANT'])
  const orders = await prisma.order.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      deliveryFee: true,
      laborCost: true,
      paymentMethod: true,
      paidAt: true,
      createdAt: true,
      vehicle: { select: { brand: true, model: true, year: true, plate: true } },
    },
  })

  const header = [
    'order_id',
    'created_at',
    'paid_at',
    'status',
    'payment_method',
    'vehicle',
    'plate',
    'total_amount',
    'delivery_fee',
    'labor_cost',
  ].join(',')

  const rows = orders.map((o) => {
    const v = o.vehicle
    const vehicleLabel = v ? `${v.brand} ${v.model} ${v.year}` : ''
    const cells = [
      o.id,
      o.createdAt.toISOString(),
      o.paidAt ? o.paidAt.toISOString() : '',
      o.status,
      o.paymentMethod ?? '',
      vehicleLabel,
      v?.plate ?? '',
      String(o.totalAmount),
      String(o.deliveryFee),
      o.laborCost != null ? String(o.laborCost) : '',
    ]
    return cells.map(csvEscape).join(',')
  })

  return [header, ...rows].join('\n')
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
