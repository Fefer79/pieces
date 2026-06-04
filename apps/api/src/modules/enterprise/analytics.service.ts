import { prisma } from '../../lib/prisma.js'
import { assertMember } from './enterprise.service.js'

const SPENT_ORDER_STATUSES = [
  'PAID',
  'VENDOR_CONFIRMED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
  'COMPLETED',
] as const

const USAGE_LABEL: Record<string, string> = {
  TRANSPORT: 'Transport',
  CHANTIER: 'Chantier',
  LIVRAISON: 'Livraison',
  DIRECTION: 'Direction',
  AUTRE: 'Autre',
}

/**
 * Analytics agrégée au niveau flotte : dépense par catégorie de pièce, par
 * type d'usage, par groupe, courbe mensuelle, et coût au kilomètre (moyenne +
 * classement). Réutilise la même définition de « dépense » que le dashboard
 * (commandes payées, totalAmount), sauf la ventilation par catégorie qui se
 * base sur les lignes de commande (priceSnapshot × quantité), comme l'analytics
 * par véhicule.
 */
export async function getFleetAnalytics(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)

  const [orders, vehicles] = await Promise.all([
    prisma.order.findMany({
      where: {
        enterpriseId,
        status: { in: [...SPENT_ORDER_STATUSES] },
        paidAt: { not: null },
      },
      select: {
        id: true,
        paidAt: true,
        totalAmount: true,
        vehicleId: true,
        items: { select: { category: true, priceSnapshot: true, quantity: true } },
      },
    }),
    prisma.vehicle.findMany({
      where: { enterpriseId },
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        plate: true,
        mileage: true,
        usageType: true,
        groupName: true,
      },
    }),
  ])

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
  const totalSpend = orders.reduce((s, o) => s + o.totalAmount, 0)

  // --- Spend by month (12 derniers mois) ---
  const now = new Date()
  const spendByMonth: { month: string; total: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = orders
      .filter((o) => o.paidAt && o.paidAt >= d && o.paidAt < next)
      .reduce((s, o) => s + o.totalAmount, 0)
    spendByMonth.push({ month: key, total })
  }

  // --- Spend by part category (lignes de commande) ---
  const byCategory = new Map<string, number>()
  for (const o of orders) {
    for (const it of o.items) {
      const key = it.category ?? 'Autre'
      byCategory.set(key, (byCategory.get(key) ?? 0) + it.priceSnapshot * it.quantity)
    }
  }
  const spendByCategory = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // --- Spend by usage type & group (via véhicule rattaché) ---
  const byUsage = new Map<string, number>()
  const byGroup = new Map<string, number>()
  const spendByVehicle = new Map<string, number>()
  for (const o of orders) {
    const v = o.vehicleId ? vehicleById.get(o.vehicleId) : undefined
    const usage = v?.usageType ? (USAGE_LABEL[v.usageType] ?? v.usageType) : 'Non précisé'
    const group = v?.groupName ?? 'Sans groupe'
    byUsage.set(usage, (byUsage.get(usage) ?? 0) + o.totalAmount)
    byGroup.set(group, (byGroup.get(group) ?? 0) + o.totalAmount)
    if (o.vehicleId) {
      spendByVehicle.set(o.vehicleId, (spendByVehicle.get(o.vehicleId) ?? 0) + o.totalAmount)
    }
  }
  const spendByUsageType = [...byUsage.entries()]
    .map(([usageType, total]) => ({ usageType, total }))
    .sort((a, b) => b.total - a.total)
  const spendByGroup = [...byGroup.entries()]
    .map(([groupName, total]) => ({ groupName, total }))
    .sort((a, b) => b.total - a.total)

  // --- Coût au kilomètre (moyenne flotte + classement) ---
  let mileageSum = 0
  let spendWithMileage = 0
  const costPerKmRanking: {
    vehicle: { id: string; brand: string; model: string; year: number; plate: string | null }
    totalSpend: number
    mileage: number
    costPerKm: number
  }[] = []
  for (const v of vehicles) {
    const spend = spendByVehicle.get(v.id) ?? 0
    if (v.mileage != null && v.mileage > 0 && spend > 0) {
      mileageSum += v.mileage
      spendWithMileage += spend
      costPerKmRanking.push({
        vehicle: { id: v.id, brand: v.brand, model: v.model, year: v.year, plate: v.plate },
        totalSpend: spend,
        mileage: v.mileage,
        costPerKm: Math.round((spend / v.mileage) * 100) / 100,
      })
    }
  }
  costPerKmRanking.sort((a, b) => b.costPerKm - a.costPerKm)
  const avgCostPerKm =
    mileageSum > 0 ? Math.round((spendWithMileage / mileageSum) * 100) / 100 : null

  return {
    totalSpend,
    ordersCount: orders.length,
    vehiclesCount: vehicles.length,
    spendByMonth,
    spendByCategory,
    spendByUsageType,
    spendByGroup,
    avgCostPerKm,
    costPerKmRanking: costPerKmRanking.slice(0, 10),
  }
}
