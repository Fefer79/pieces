import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
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
//   marque|brand, modele|model, annee|year, vin, immatriculation|plate,
//   motorisation|engine, kilometrage|mileage, usage|usage_type,
//   groupe|group_name, photo_url

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
  groupe: 'groupName',
  group: 'groupName',
  group_name: 'groupName',
  photo: 'photoUrl',
  photo_url: 'photoUrl',
}

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
  errors: ImportError[]
}

export async function importVehiclesFromCsv(
  enterpriseId: string,
  userId: string,
  csv: string,
): Promise<ImportResult> {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])

  const rows = parseCsv(csv)
  if (rows.length === 0) {
    throw new AppError('CSV_EMPTY', 400, { message: 'Fichier CSV vide' })
  }
  const header = rows[0]!.map((h) => h.trim().toLowerCase())
  const mapping: (keyof VehicleInput | null)[] = header.map((col) => COLUMN_ALIASES[col] ?? null)

  if (!mapping.includes('brand') || !mapping.includes('model') || !mapping.includes('year')) {
    throw new AppError('CSV_HEADER_INVALID', 400, {
      message: 'Colonnes obligatoires manquantes : marque, modele, annee',
    })
  }

  const errors: ImportError[] = []
  const valid: VehicleInput[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!
    if (row.every((c) => c.trim() === '')) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < row.length; c++) {
      const key = mapping[c]
      if (key) obj[key] = (row[c] ?? '').trim()
    }
    const parsed = parseRow(obj, i + 1, errors)
    if (parsed) valid.push(parsed)
  }

  if (valid.length === 0) {
    return { created: 0, errors }
  }

  const now = new Date()
  await prisma.vehicle.createMany({
    data: valid.map((v) => ({
      enterpriseId,
      ...v,
      mileageUpdatedAt: v.mileage != null ? now : null,
    })),
  })

  return { created: valid.length, errors }
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

function parseCsv(input: string): string[][] {
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
