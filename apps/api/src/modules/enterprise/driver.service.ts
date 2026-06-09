import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import { normalizeHeader, extractSheetRows } from './xlsxImport.js'
import { parseCsv } from './vehicle.service.js'
import type { DriverStatus, DriverIncidentType, DriverIncidentSeverity } from '@prisma/client'

const MANAGE_ROLES = ['OWNER', 'MANAGER'] as const
const ENTRY_ROLES = ['OWNER', 'MANAGER', 'MECHANIC'] as const

const DRIVER_SELECT = {
  id: true,
  name: true,
  phone: true,
  licenseNumber: true,
  licenseCategory: true,
  photoUrl: true,
  status: true,
  hiredAt: true,
  notes: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const

type DriverInput = {
  name: string
  phone: string
  licenseNumber?: string
  licenseCategory?: string
  photoUrl?: string
  hiredAt?: string
  notes?: string
  status?: DriverStatus
}

async function assertDriver(enterpriseId: string, driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, enterpriseId },
    select: { id: true },
  })
  if (!driver) throw new AppError('DRIVER_NOT_FOUND', 404, { message: 'Chauffeur introuvable' })
}

async function assertVehicle(enterpriseId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true },
  })
  if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 404, { message: 'Véhicule introuvable' })
}

// Affectation active (endedAt null) avec le véhicule, pour enrichir les fiches.
function activeAssignmentInclude() {
  return {
    where: { endedAt: null },
    take: 1,
    orderBy: { startedAt: 'desc' as const },
    select: {
      id: true,
      startedAt: true,
      vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
    },
  }
}

export async function listEnterpriseDrivers(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)
  const drivers = await prisma.driver.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: 'desc' },
    select: {
      ...DRIVER_SELECT,
      assignments: activeAssignmentInclude(),
    },
  })
  return drivers.map(({ assignments, ...d }) => ({
    ...d,
    activeAssignment: assignments[0] ?? null,
  }))
}

export async function getEnterpriseDriver(enterpriseId: string, userId: string, driverId: string) {
  await assertMember(enterpriseId, userId)
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, enterpriseId },
    select: {
      ...DRIVER_SELECT,
      assignments: {
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
        },
      },
      dailyRecords: {
        orderBy: { date: 'desc' },
        take: 30,
        select: {
          id: true, date: true, revenue: true, fuelCost: true, otherExpenses: true,
          kmDriven: true, notes: true,
          vehicle: { select: { id: true, brand: true, model: true, plate: true } },
        },
      },
      incidents: {
        orderBy: { date: 'desc' },
        take: 30,
        select: {
          id: true, type: true, severity: true, date: true, description: true, costEstimate: true,
          vehicle: { select: { id: true, brand: true, model: true, plate: true } },
        },
      },
    },
  })
  if (!driver) throw new AppError('DRIVER_NOT_FOUND', 404, { message: 'Chauffeur introuvable' })
  const { assignments, ...rest } = driver
  return {
    ...rest,
    assignments,
    activeAssignment: assignments.find((a) => a.endedAt === null) ?? null,
  }
}

export async function createEnterpriseDriver(enterpriseId: string, userId: string, data: DriverInput) {
  await assertMember(enterpriseId, userId, [...MANAGE_ROLES])
  try {
    return await prisma.driver.create({
      data: {
        enterpriseId,
        name: data.name,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        licenseCategory: data.licenseCategory,
        photoUrl: data.photoUrl,
        hiredAt: data.hiredAt ? new Date(data.hiredAt) : undefined,
        notes: data.notes,
      },
      select: DRIVER_SELECT,
    })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      throw new AppError('DRIVER_PHONE_TAKEN', 409, {
        message: 'Un chauffeur avec ce numéro existe déjà dans cette flotte',
      })
    }
    throw err
  }
}

export async function updateEnterpriseDriver(
  enterpriseId: string,
  userId: string,
  driverId: string,
  data: Partial<DriverInput>,
) {
  await assertMember(enterpriseId, userId, [...MANAGE_ROLES])
  await assertDriver(enterpriseId, driverId)
  return prisma.driver.update({
    where: { id: driverId },
    data: {
      ...data,
      ...(data.hiredAt !== undefined ? { hiredAt: data.hiredAt ? new Date(data.hiredAt) : null } : {}),
    },
    select: DRIVER_SELECT,
  })
}

export async function deleteEnterpriseDriver(enterpriseId: string, userId: string, driverId: string) {
  await assertMember(enterpriseId, userId, [...MANAGE_ROLES])
  await assertDriver(enterpriseId, driverId)
  await prisma.driver.delete({ where: { id: driverId } })
  return { ok: true }
}

// Affecte un véhicule : clôt l'affectation active courante puis en ouvre une
// nouvelle. vehicleId null/absent = simple désaffectation.
export async function assignVehicleToDriver(
  enterpriseId: string,
  userId: string,
  driverId: string,
  vehicleId: string | null,
) {
  await assertMember(enterpriseId, userId, [...MANAGE_ROLES])
  await assertDriver(enterpriseId, driverId)
  if (vehicleId) await assertVehicle(enterpriseId, vehicleId)

  await prisma.driverAssignment.updateMany({
    where: { driverId, endedAt: null },
    data: { endedAt: new Date() },
  })
  if (vehicleId) {
    await prisma.driverAssignment.create({ data: { driverId, vehicleId } })
  }
  return getEnterpriseDriver(enterpriseId, userId, driverId)
}

// Véhicule actuellement affecté au chauffeur (sert de défaut aux relevés).
async function activeVehicleId(driverId: string): Promise<string | null> {
  const a = await prisma.driverAssignment.findFirst({
    where: { driverId, endedAt: null },
    orderBy: { startedAt: 'desc' },
    select: { vehicleId: true },
  })
  return a?.vehicleId ?? null
}

type DailyInput = {
  date: string
  revenue: number
  fuelCost: number
  otherExpenses: number
  kmDriven?: number
  vehicleId?: string
  notes?: string
}

// Upsert idempotent du relevé d'un jour (contrainte unique driver+date).
export async function upsertDailyRecord(driverId: string, data: DailyInput) {
  const vehicleId = data.vehicleId ?? (await activeVehicleId(driverId)) ?? undefined
  const date = new Date(`${data.date}T00:00:00.000Z`)
  return prisma.driverDailyRecord.upsert({
    where: { uq_driver_day: { driverId, date } },
    create: {
      driverId, vehicleId, date,
      revenue: data.revenue, fuelCost: data.fuelCost, otherExpenses: data.otherExpenses,
      kmDriven: data.kmDriven, notes: data.notes,
    },
    update: {
      vehicleId, revenue: data.revenue, fuelCost: data.fuelCost, otherExpenses: data.otherExpenses,
      kmDriven: data.kmDriven, notes: data.notes,
    },
    select: {
      id: true, date: true, revenue: true, fuelCost: true, otherExpenses: true, kmDriven: true, notes: true,
      vehicle: { select: { id: true, brand: true, model: true, plate: true } },
    },
  })
}

export async function addDriverDailyRecord(
  enterpriseId: string,
  userId: string,
  driverId: string,
  data: DailyInput,
) {
  await assertMember(enterpriseId, userId, [...ENTRY_ROLES])
  await assertDriver(enterpriseId, driverId)
  return upsertDailyRecord(driverId, data)
}

export async function addDriverIncident(
  enterpriseId: string,
  userId: string,
  driverId: string,
  data: {
    type: DriverIncidentType
    severity: DriverIncidentSeverity
    date: string
    description?: string
    costEstimate?: number
    vehicleId?: string
  },
) {
  await assertMember(enterpriseId, userId, [...ENTRY_ROLES])
  await assertDriver(enterpriseId, driverId)
  const vehicleId = data.vehicleId ?? (await activeVehicleId(driverId)) ?? undefined
  return prisma.driverIncident.create({
    data: {
      driverId, vehicleId,
      type: data.type, severity: data.severity,
      date: new Date(`${data.date}T00:00:00.000Z`),
      description: data.description, costEstimate: data.costEstimate,
    },
    select: {
      id: true, type: true, severity: true, date: true, description: true, costEstimate: true,
      vehicle: { select: { id: true, brand: true, model: true, plate: true } },
    },
  })
}

// KPIs de rentabilité sur une fenêtre glissante (défaut 30 j).
export async function getDriverAnalytics(
  enterpriseId: string,
  userId: string,
  driverId: string,
  days = 30,
) {
  await assertMember(enterpriseId, userId)
  await assertDriver(enterpriseId, driverId)
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  since.setUTCHours(0, 0, 0, 0)

  const records = await prisma.driverDailyRecord.findMany({
    where: { driverId, date: { gte: since } },
    select: { revenue: true, fuelCost: true, otherExpenses: true, kmDriven: true },
  })
  const incidents = await prisma.driverIncident.findMany({
    where: { driverId, date: { gte: since } },
    select: { severity: true, costEstimate: true },
  })

  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0)
  const totalFuel = records.reduce((s, r) => s + r.fuelCost, 0)
  const totalOther = records.reduce((s, r) => s + r.otherExpenses, 0)
  const totalKm = records.reduce((s, r) => s + (r.kmDriven ?? 0), 0)
  const daysWorked = records.length
  const netRevenue = totalRevenue - totalFuel - totalOther

  // Dépenses pièces sur les véhicules conduits par le chauffeur dans la fenêtre.
  const assignments = await prisma.driverAssignment.findMany({
    where: { driverId, OR: [{ endedAt: null }, { endedAt: { gte: since } }] },
    select: { vehicleId: true },
  })
  const vehicleIds = [...new Set(assignments.map((a) => a.vehicleId))]
  let partsSpend = 0
  if (vehicleIds.length > 0) {
    const orders = await prisma.order.findMany({
      where: { vehicleId: { in: vehicleIds }, paidAt: { gte: since } },
      select: { totalAmount: true },
    })
    partsSpend = orders.reduce((s, o) => s + o.totalAmount, 0)
  }
  const incidentCost = incidents.reduce((s, i) => s + (i.costEstimate ?? 0), 0)

  return {
    windowDays: days,
    daysWorked,
    totalRevenue,
    totalFuel,
    totalOther,
    netRevenue,
    avgDailyRevenue: daysWorked > 0 ? Math.round(totalRevenue / daysWorked) : 0,
    totalKm,
    revenuePerKm: totalKm > 0 ? Math.round(totalRevenue / totalKm) : 0,
    incidentCount: incidents.length,
    incidentCost,
    partsSpend,
    // Rentabilité nette : CA − carburant − dépenses − pièces − coût incidents.
    profit: netRevenue - partsSpend - incidentCost,
  }
}

// --- Import en masse (CSV / Excel) ---------------------------------------
// En-têtes acceptés (insensible à la casse, FR/EN). Feuille « Chauffeurs ».
//   nom complet|nom|name, téléphone|tel|phone, n° de permis|permis|license,
//   catégorie permis|catégorie|license_category, date d'embauche|embauche,
//   notes|remarques

type DriverImportInput = {
  name: string
  phone: string
  licenseNumber?: string
  licenseCategory?: string
  hiredAt?: Date
  notes?: string
}

const DRIVER_COLUMN_ALIASES: Record<string, keyof DriverImportInput> = {
  'nom complet': 'name',
  nom: 'name',
  name: 'name',
  téléphone: 'phone',
  telephone: 'phone',
  tel: 'phone',
  phone: 'phone',
  'n° de permis': 'licenseNumber',
  'numéro de permis': 'licenseNumber',
  permis: 'licenseNumber',
  'license number': 'licenseNumber',
  'catégorie permis': 'licenseCategory',
  'catégorie de permis': 'licenseCategory',
  catégorie: 'licenseCategory',
  'license category': 'licenseCategory',
  "date d'embauche": 'hiredAt',
  embauche: 'hiredAt',
  'hired at': 'hiredAt',
  notes: 'notes',
  note: 'notes',
  remarques: 'notes',
}

type ImportError = { line: number; message: string }
type DriverImportResult = { created: number; errors: ImportError[] }

export async function importDriversFromCsv(
  enterpriseId: string,
  userId: string,
  csv: string,
): Promise<DriverImportResult> {
  return importDriverRows(enterpriseId, userId, parseCsv(csv), 'Fichier CSV vide')
}

export async function importDriversFromXlsx(
  enterpriseId: string,
  userId: string,
  buffer: Buffer,
): Promise<DriverImportResult> {
  const rows = await extractSheetRows(buffer, (name) => name.startsWith('chauffeur'))
  return importDriverRows(enterpriseId, userId, rows, 'Feuille « Chauffeurs » vide')
}

/** Met le numéro au format +225XXXXXXXXXX, en récupérant un éventuel 0 perdu par Excel. */
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) {
    digits = '+' + digits.slice(1).replace(/\D/g, '')
  } else if (digits.startsWith('225')) {
    digits = '+' + digits
  } else if (digits.length === 10) {
    digits = '+225' + digits // numéro local 0X……
  } else if (digits.length === 9) {
    digits = '+2250' + digits // Excel a mangé le 0 initial
  } else {
    digits = '+225' + digits
  }
  return /^\+225\d{10}$/.test(digits) ? digits : null
}

/** Parse une date JJ/MM/AAAA ou AAAA-MM-JJ ; null si invalide/vide. */
function parseHiredAt(raw: string): Date | null {
  const v = raw.trim()
  if (!v) return null
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)
  let y: number, m: number, d: number
  if (fr) {
    d = Number(fr[1]); m = Number(fr[2]); y = Number(fr[3])
  } else if (iso) {
    y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3])
  } else {
    return null
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  return Number.isNaN(date.getTime()) ? null : date
}

export async function importDriverRows(
  enterpriseId: string,
  userId: string,
  rows: string[][],
  emptyMessage: string,
): Promise<DriverImportResult> {
  await assertMember(enterpriseId, userId, [...MANAGE_ROLES])

  const [headerRow] = rows
  if (!headerRow) {
    throw new AppError('IMPORT_EMPTY', 400, { message: emptyMessage })
  }
  const mapping: (keyof DriverImportInput | null)[] = headerRow.map(
    (col) => DRIVER_COLUMN_ALIASES[normalizeHeader(col)] ?? null,
  )
  if (!mapping.includes('name') || !mapping.includes('phone')) {
    throw new AppError('IMPORT_HEADER_INVALID', 400, {
      message: 'Colonnes obligatoires manquantes : nom, téléphone',
    })
  }

  const errors: ImportError[] = []
  const valid: DriverImportInput[] = []
  const seenPhones = new Set<string>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => c.trim() === '')) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < row.length; c++) {
      const key = mapping[c]
      if (key) obj[key] = (row[c] ?? '').trim()
    }
    const line = i + 1
    if (!obj.name || !obj.phone) {
      errors.push({ line, message: 'nom ou téléphone manquant' })
      continue
    }
    const phone = normalizePhone(obj.phone)
    if (!phone) {
      errors.push({ line, message: `téléphone invalide : ${obj.phone}` })
      continue
    }
    if (seenPhones.has(phone)) {
      errors.push({ line, message: `numéro en double dans le fichier : ${phone}` })
      continue
    }
    seenPhones.add(phone)
    valid.push({
      name: obj.name,
      phone,
      licenseNumber: obj.licenseNumber || undefined,
      licenseCategory: obj.licenseCategory || undefined,
      hiredAt: obj.hiredAt ? (parseHiredAt(obj.hiredAt) ?? undefined) : undefined,
      notes: obj.notes || undefined,
    })
  }

  if (valid.length === 0) {
    return { created: 0, errors }
  }

  // Numéros déjà présents dans la flotte → signalés, non recréés.
  const existing = await prisma.driver.findMany({
    where: { enterpriseId, phone: { in: valid.map((v) => v.phone) } },
    select: { phone: true },
  })
  const existingPhones = new Set(existing.map((e) => e.phone))
  const toCreate = valid.filter((v) => {
    if (existingPhones.has(v.phone)) {
      errors.push({ line: 0, message: `numéro déjà enregistré : ${v.phone}` })
      return false
    }
    return true
  })

  if (toCreate.length > 0) {
    await prisma.driver.createMany({
      data: toCreate.map((v) => ({ enterpriseId, ...v })),
    })
  }

  return { created: toCreate.length, errors }
}
