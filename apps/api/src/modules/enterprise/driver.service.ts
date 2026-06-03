import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
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
