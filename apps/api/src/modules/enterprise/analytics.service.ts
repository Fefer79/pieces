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

// Un véhicule est « gouffre » si son coût au km dépasse nettement la médiane de
// la flotte. On utilise la médiane (robuste aux extrêmes) plutôt que la moyenne,
// et on exige une flotte d'au moins 3 véhicules mesurables pour que la
// comparaison ait du sens. Le multiple est volontairement explicite.
const MONEY_PIT_MEDIAN_MULTIPLE = 1.5
const MONEY_PIT_MIN_FLEET = 3

export interface VehicleCostEntry {
  vehicle: { id: string; brand: string; model: string; year: number; plate: string | null }
  totalSpend: number
  mileage: number
  costPerKm: number
}

export interface MoneyPit extends VehicleCostEntry {
  // Combien de fois la médiane flotte ce véhicule coûte (ex. 2.1 = 2,1×).
  multipleOfMedian: number
  // Surcoût estimé vs un véhicule « normal » (coût/km ramené à la médiane), en F.
  excessSpend: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
  }
  return sorted[mid] ?? 0
}

/**
 * Détecte les véhicules « gouffres » : ceux dont le coût au km dépasse
 * MONEY_PIT_MEDIAN_MULTIPLE × la médiane de la flotte. Renvoie une liste triée
 * du plus coûteux au moins coûteux, avec le multiple et le surcoût estimé.
 * Liste vide si la flotte est trop petite pour conclure.
 */
export function computeMoneyPits(entries: VehicleCostEntry[]): {
  medianCostPerKm: number | null
  thresholdCostPerKm: number | null
  moneyPits: MoneyPit[]
} {
  if (entries.length < MONEY_PIT_MIN_FLEET) {
    return { medianCostPerKm: null, thresholdCostPerKm: null, moneyPits: [] }
  }
  const med = median(entries.map((e) => e.costPerKm))
  if (med <= 0) return { medianCostPerKm: null, thresholdCostPerKm: null, moneyPits: [] }
  const threshold = med * MONEY_PIT_MEDIAN_MULTIPLE

  const moneyPits = entries
    .filter((e) => e.costPerKm >= threshold)
    .map((e) => ({
      ...e,
      multipleOfMedian: Math.round((e.costPerKm / med) * 10) / 10,
      excessSpend: Math.round((e.costPerKm - med) * e.mileage),
    }))
    .sort((a, b) => b.costPerKm - a.costPerKm)

  return {
    medianCostPerKm: Math.round(med * 100) / 100,
    thresholdCostPerKm: Math.round(threshold * 100) / 100,
    moneyPits,
  }
}

/**
 * Charge les coûts/km par véhicule d'une entreprise et en déduit les véhicules
 * « gouffres ». Sans contrôle d'accès (réservé à un appelant déjà authentifié /
 * membre — dashboard et analytics flotte).
 */
export async function getFleetMoneyPits(enterpriseId: string) {
  const [orders, vehicles] = await Promise.all([
    prisma.order.groupBy({
      by: ['vehicleId'],
      where: {
        enterpriseId,
        vehicleId: { not: null },
        status: { in: [...SPENT_ORDER_STATUSES] },
        paidAt: { not: null },
      },
      _sum: { totalAmount: true },
    }),
    prisma.vehicle.findMany({
      where: { enterpriseId },
      select: { id: true, brand: true, model: true, year: true, plate: true, mileage: true },
    }),
  ])
  const spendByVehicle = new Map(
    orders.map((o) => [o.vehicleId as string, o._sum.totalAmount ?? 0]),
  )
  const entries: VehicleCostEntry[] = []
  for (const v of vehicles) {
    const spend = spendByVehicle.get(v.id) ?? 0
    if (v.mileage != null && v.mileage > 0 && spend > 0) {
      entries.push({
        vehicle: { id: v.id, brand: v.brand, model: v.model, year: v.year, plate: v.plate },
        totalSpend: spend,
        mileage: v.mileage,
        costPerKm: spend / v.mileage,
      })
    }
  }
  return computeMoneyPits(entries)
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

  const { medianCostPerKm, thresholdCostPerKm, moneyPits } = computeMoneyPits(costPerKmRanking)

  return {
    totalSpend,
    ordersCount: orders.length,
    vehiclesCount: vehicles.length,
    spendByMonth,
    spendByCategory,
    spendByUsageType,
    spendByGroup,
    avgCostPerKm,
    medianCostPerKm,
    moneyPitThreshold: thresholdCostPerKm,
    moneyPits,
    costPerKmRanking: costPerKmRanking.slice(0, 10),
  }
}
