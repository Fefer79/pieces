import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import { normalizeHeader, extractSheetRows } from './xlsxImport.js'
import type { VehicleUsageType } from '@prisma/client'

type VehicleInput = {
  brand: string
  model: string
  year: number
  vin?: string
  plate?: string
  engine?: string
  mileage?: number
  usageType?: VehicleUsageType
  groupName?: string
  photoUrl?: string
}

const SELECT = {
  id: true,
  brand: true,
  model: true,
  year: true,
  vin: true,
  plate: true,
  engine: true,
  mileage: true,
  mileageUpdatedAt: true,
  usageType: true,
  groupName: true,
  photoUrl: true,
  homeCenterId: true,
  homeCenter: {
    select: { id: true, name: true, commune: true, deliveryDayOfWeek: true },
  },
  createdAt: true,
  updatedAt: true,
} as const

export async function listEnterpriseVehicles(
  enterpriseId: string,
  userId: string,
  filters?: { groupName?: string; usageType?: VehicleUsageType },
) {
  await assertMember(enterpriseId, userId)
  return prisma.vehicle.findMany({
    where: {
      enterpriseId,
      groupName: filters?.groupName,
      usageType: filters?.usageType,
    },
    orderBy: { createdAt: 'desc' },
    select: SELECT,
  })
}

export async function getEnterpriseVehicle(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
) {
  await assertMember(enterpriseId, userId)
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: {
      ...SELECT,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paidAt: true,
          createdAt: true,
        },
      },
    },
  })
  if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 404)
  return vehicle
}

export async function createEnterpriseVehicle(
  enterpriseId: string,
  userId: string,
  data: VehicleInput,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  return prisma.vehicle.create({
    data: {
      enterpriseId,
      ...data,
      mileageUpdatedAt: data.mileage != null ? new Date() : null,
    },
    select: SELECT,
  })
}

export async function updateEnterpriseVehicle(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  data: Partial<VehicleInput>,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  const existing = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true },
  })
  if (!existing) throw new AppError('VEHICLE_NOT_FOUND', 404)

  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      ...data,
      ...(data.mileage != null ? { mileageUpdatedAt: new Date() } : {}),
    },
    select: SELECT,
  })
}

export async function updateMileage(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  mileage: number,
) {
  return updateEnterpriseVehicle(enterpriseId, userId, vehicleId, { mileage })
}

export async function getVehicleAnalytics(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
) {
  await assertMember(enterpriseId, userId)

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true, brand: true, model: true, year: true, mileage: true },
  })
  if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 404)

  // Paid orders + items for this vehicle
  const orders = await prisma.order.findMany({
    where: { vehicleId, enterpriseId, paidAt: { not: null } },
    select: {
      id: true,
      paidAt: true,
      createdAt: true,
      totalAmount: true,
      items: {
        select: {
          id: true,
          name: true,
          category: true,
          priceSnapshot: true,
          quantity: true,
          vendorShopName: true,
          imageThumbUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: { paidAt: 'desc' },
  })

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const totalSpend = orders.reduce((s, o) => s + o.totalAmount, 0)
  const ytdSpend = orders
    .filter((o) => o.paidAt && o.paidAt >= yearStart)
    .reduce((s, o) => s + o.totalAmount, 0)

  // Last 12 months
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

  // Flatten items with order paidAt for the history table
  const items = orders.flatMap((o) =>
    o.items.map((it) => ({
      ...it,
      orderId: o.id,
      orderPaidAt: o.paidAt,
      lineTotal: it.priceSnapshot * it.quantity,
    })),
  )

  // Peers: same enterprise, same brand+model, year ±2 (excluding self)
  const peers = await prisma.vehicle.findMany({
    where: {
      enterpriseId,
      id: { not: vehicleId },
      brand: vehicle.brand,
      model: vehicle.model,
      year: { gte: vehicle.year - 2, lte: vehicle.year + 2 },
    },
    select: { id: true },
  })
  const peerIds = peers.map((p) => p.id)

  let avgSpendForSimilar: number | null = null
  let outlierFlag = false
  if (peerIds.length >= 3) {
    const peerAgg = await prisma.order.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { in: peerIds }, paidAt: { not: null } },
      _sum: { totalAmount: true },
    })
    if (peerAgg.length > 0) {
      const totals = peerAgg.map((p) => p._sum.totalAmount ?? 0)
      const sum = totals.reduce((s, n) => s + n, 0)
      avgSpendForSimilar = Math.round(sum / peerAgg.length)
      if (avgSpendForSimilar > 0 && totalSpend > avgSpendForSimilar * 1.5) {
        outlierFlag = true
      }
    }
  }

  // Spend by part category (aggregated in-memory from items already loaded)
  const byCategory = new Map<string, number>()
  for (const it of items) {
    const key = it.category ?? 'Autre'
    byCategory.set(key, (byCategory.get(key) ?? 0) + it.lineTotal)
  }
  const spendByCategory = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // Cost per km: total spend / current mileage (null if mileage unknown or zero)
  const costPerKm =
    vehicle.mileage != null && vehicle.mileage > 0
      ? Math.round((totalSpend / vehicle.mileage) * 100) / 100
      : null

  return {
    vehicleId,
    totalSpend,
    ytdSpend,
    spendByMonth,
    spendByCategory,
    costPerKm,
    items,
    peerCount: peerIds.length,
    avgSpendForSimilar,
    outlierFlag,
  }
}

export async function deleteEnterpriseVehicle(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const existing = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true },
  })
  if (!existing) throw new AppError('VEHICLE_NOT_FOUND', 404)
  await prisma.vehicle.delete({ where: { id: vehicleId } })
}

// --- CSV import ----------------------------------------------------------
// Header row required. Accepted columns (case-insensitive, FR or EN):
//   marque|brand, modele|model, annee|year, vin,
//   immatriculation|plaque|numéro d'immatriculation|plate,
//   motorisation|engine, kilometrage|mileage, usage|usage_type,
//   groupe|group_name, photo_url
// L'alias « numéro d'immatriculation » accepte l'export Yango « liste voitures »
// (summary_cars_list.csv) directement ; les colonnes inconnues sont ignorées.

const COLUMN_ALIASES: Record<string, keyof VehicleInput> = {
  marque: 'brand',
  brand: 'brand',
  modele: 'model',
  modèle: 'model',
  model: 'model',
  annee: 'year',
  année: 'year',
  year: 'year',
  vin: 'vin',
  immatriculation: 'plate',
  // Export Yango « liste voitures » (summary_cars_list) : colonne plaque.
  "numéro d'immatriculation": 'plate',
  "no d'immatriculation": 'plate',
  plaque: 'plate',
  plate: 'plate',
  motorisation: 'engine',
  moteur: 'engine',
  engine: 'engine',
  kilometrage: 'mileage',
  kilométrage: 'mileage',
  km: 'mileage',
  mileage: 'mileage',
  usage: 'usageType',
  usage_type: 'usageType',
  "type d'usage": 'usageType',
  "type d usage": 'usageType',
  groupe: 'groupName',
  group: 'groupName',
  group_name: 'groupName',
  site: 'groupName',
  photo: 'photoUrl',
  photo_url: 'photoUrl',
}

// En-têtes (normalisés) désignant le chauffeur attitré du véhicule.
const DRIVER_NAME_HEADERS = new Set([
  'chauffeur attitré',
  'chauffeur attribué',
  'chauffeur',
  'conducteur',
  'driver',
])

const VALID_USAGE: VehicleUsageType[] = [
  'TRANSPORT',
  'CHANTIER',
  'LIVRAISON',
  'DIRECTION',
  'AUTRE',
]

type ImportError = { line: number; message: string }
type ImportResult = {
  created: number
  // Nombre d'affectations chauffeur↔véhicule créées via la colonne « Chauffeur attitré ».
  assigned?: number
  errors: ImportError[]
}

export async function importVehiclesFromCsv(
  enterpriseId: string,
  userId: string,
  csv: string,
): Promise<ImportResult> {
  return importVehicleRows(enterpriseId, userId, parseCsv(csv), 'Fichier CSV vide')
}

export async function importVehiclesFromXlsx(
  enterpriseId: string,
  userId: string,
  buffer: Buffer,
): Promise<ImportResult> {
  const rows = await extractSheetRows(buffer, (name) => name.startsWith('véhicule') || name.startsWith('vehicule'))
  return importVehicleRows(enterpriseId, userId, rows, 'Feuille « Véhicules » vide')
}

export async function importVehicleRows(
  enterpriseId: string,
  userId: string,
  rows: string[][],
  emptyMessage: string,
): Promise<ImportResult> {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])

  const [headerRow] = rows
  if (!headerRow) {
    throw new AppError('IMPORT_EMPTY', 400, { message: emptyMessage })
  }
  const mapping: (keyof VehicleInput | 'driverName' | null)[] = headerRow.map((col) => {
    const norm = normalizeHeader(col)
    if (DRIVER_NAME_HEADERS.has(norm)) return 'driverName'
    return COLUMN_ALIASES[norm] ?? null
  })

  if (!mapping.includes('brand') || !mapping.includes('model') || !mapping.includes('year')) {
    throw new AppError('IMPORT_HEADER_INVALID', 400, {
      message: 'Colonnes obligatoires manquantes : marque, modèle, année',
    })
  }

  const errors: ImportError[] = []
  const valid: { input: VehicleInput; driverName?: string; line: number }[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => c.trim() === '')) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < row.length; c++) {
      const key = mapping[c]
      if (key) obj[key] = (row[c] ?? '').trim()
    }
    const parsed = parseRow(obj, i + 1, errors)
    if (parsed) valid.push({ input: parsed, driverName: obj.driverName || undefined, line: i + 1 })
  }

  if (valid.length === 0) {
    return { created: 0, errors }
  }

  const now = new Date()
  const data = valid.map((v) => ({
    enterpriseId,
    ...v.input,
    mileageUpdatedAt: v.input.mileage != null ? now : null,
  }))

  // Sans colonne chauffeur : insertion en masse, pas besoin des IDs créés.
  if (valid.every((v) => !v.driverName)) {
    await prisma.vehicle.createMany({ data })
    return { created: valid.length, errors }
  }

  // Avec affectations : on récupère les IDs (createManyAndReturn préserve
  // l'ordre d'insertion sur Postgres) pour lier chaque véhicule à son chauffeur.
  const created = await prisma.vehicle.createManyAndReturn({ data, select: { id: true } })
  const links: { vehicleId: string; driverName?: string; line: number }[] = []
  for (const [idx, v] of valid.entries()) {
    const row = created[idx]
    if (row) links.push({ vehicleId: row.id, driverName: v.driverName, line: v.line })
  }
  const assigned = await assignDriversToVehicles(enterpriseId, links, errors)

  return { created: valid.length, assigned, errors }
}

/**
 * Lie chaque véhicule au chauffeur nommé (résolution par nom, insensible à la
 * casse). Renvoie le nombre d'affectations créées ; pousse une erreur par ligne
 * pour les noms introuvables, ambigus ou un chauffeur déjà affecté dans l'import.
 */
async function assignDriversToVehicles(
  enterpriseId: string,
  rows: { vehicleId: string; driverName?: string; line: number }[],
  errors: ImportError[],
): Promise<number> {
  const toAssign = rows.filter((r) => r.driverName)
  if (toAssign.length === 0) return 0

  const drivers = await prisma.driver.findMany({
    where: { enterpriseId },
    select: { id: true, name: true },
  })
  const byName = new Map<string, { id: string; name: string }[]>()
  for (const d of drivers) {
    const key = d.name.trim().toLowerCase()
    const list = byName.get(key) ?? []
    list.push(d)
    byName.set(key, list)
  }

  const usedDrivers = new Set<string>()
  let assigned = 0
  for (const r of toAssign) {
    const name = r.driverName
    if (!name) continue
    const matches = byName.get(name.trim().toLowerCase()) ?? []
    const only = matches[0]
    if (!only) {
      errors.push({ line: r.line, message: `chauffeur introuvable : ${name}` })
      continue
    }
    if (matches.length > 1) {
      errors.push({ line: r.line, message: `chauffeur ambigu (plusieurs « ${name} »)` })
      continue
    }
    const driverId = only.id
    if (usedDrivers.has(driverId)) {
      errors.push({ line: r.line, message: `chauffeur « ${name} » déjà affecté dans ce fichier` })
      continue
    }
    usedDrivers.add(driverId)
    // Clôt l'affectation active courante puis ouvre la nouvelle.
    await prisma.driverAssignment.updateMany({
      where: { driverId, endedAt: null },
      data: { endedAt: new Date() },
    })
    await prisma.driverAssignment.create({ data: { driverId, vehicleId: r.vehicleId } })
    assigned++
  }
  return assigned
}


function parseRow(
  obj: Record<string, string>,
  line: number,
  errors: ImportError[],
): VehicleInput | null {
  const brand = obj.brand
  const model = obj.model
  const yearRaw = obj.year
  if (!brand || !model || !yearRaw) {
    errors.push({ line, message: 'marque, modele ou annee manquant' })
    return null
  }
  const year = Number(yearRaw)
  if (!Number.isFinite(year) || year < 1980 || year > new Date().getFullYear() + 1) {
    errors.push({ line, message: `année invalide : ${yearRaw}` })
    return null
  }

  const mileage = obj.mileage ? Number(obj.mileage.replace(/\s/g, '')) : undefined
  if (mileage != null && (!Number.isFinite(mileage) || mileage < 0)) {
    errors.push({ line, message: `kilométrage invalide : ${obj.mileage}` })
    return null
  }

  let usageType: VehicleUsageType | undefined
  if (obj.usageType) {
    const upper = obj.usageType.toUpperCase() as VehicleUsageType
    if (!VALID_USAGE.includes(upper)) {
      errors.push({
        line,
        message: `usage invalide : ${obj.usageType} (attendu : ${VALID_USAGE.join('|')})`,
      })
      return null
    }
    usageType = upper
  }

  let vin: string | undefined
  if (obj.vin) {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(obj.vin)) {
      errors.push({ line, message: `VIN invalide : ${obj.vin}` })
      return null
    }
    vin = obj.vin.toUpperCase()
  }

  return {
    brand,
    model,
    year,
    vin,
    plate: obj.plate || undefined,
    engine: obj.engine || undefined,
    mileage,
    usageType,
    groupName: obj.groupName || undefined,
    photoUrl: obj.photoUrl || undefined,
  }
}

export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',' || ch === ';') {
      row.push(cell)
      cell = ''
    } else if (ch === '\r') {
      // ignore
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}
