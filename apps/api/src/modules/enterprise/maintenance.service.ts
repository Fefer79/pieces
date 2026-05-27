import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import type { MaintenanceKind } from '@prisma/client'

export interface ScheduleInput {
  kind: MaintenanceKind
  label?: string | null
  intervalKm: number
  warningKm?: number
  lastDoneAtKm?: number | null
  lastDoneAt?: string | null
  enabled?: boolean
  notes?: string | null
}

export type ScheduleStatus = 'NEVER_DONE' | 'OK' | 'DUE_SOON' | 'OVERDUE'

const SELECT = {
  id: true,
  vehicleId: true,
  kind: true,
  label: true,
  intervalKm: true,
  warningKm: true,
  lastDoneAtKm: true,
  lastDoneAt: true,
  enabled: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

export function computeScheduleStatus(
  vehicleMileage: number | null,
  schedule: { intervalKm: number; warningKm: number; lastDoneAtKm: number | null },
): { status: ScheduleStatus; nextDueAtKm: number | null; kmRemaining: number | null } {
  if (schedule.lastDoneAtKm == null) {
    return { status: 'NEVER_DONE', nextDueAtKm: null, kmRemaining: null }
  }
  const nextDueAtKm = schedule.lastDoneAtKm + schedule.intervalKm
  if (vehicleMileage == null) {
    return { status: 'NEVER_DONE', nextDueAtKm, kmRemaining: null }
  }
  const kmRemaining = nextDueAtKm - vehicleMileage
  if (kmRemaining <= 0) return { status: 'OVERDUE', nextDueAtKm, kmRemaining }
  if (kmRemaining <= schedule.warningKm) return { status: 'DUE_SOON', nextDueAtKm, kmRemaining }
  return { status: 'OK', nextDueAtKm, kmRemaining }
}

async function loadVehicle(enterpriseId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true, mileage: true },
  })
  if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 404)
  return vehicle
}

export async function listSchedules(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
) {
  await assertMember(enterpriseId, userId)
  const vehicle = await loadVehicle(enterpriseId, vehicleId)
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { vehicleId },
    select: SELECT,
    orderBy: [{ enabled: 'desc' }, { kind: 'asc' }],
  })
  return schedules.map((s) => ({
    ...s,
    ...computeScheduleStatus(vehicle.mileage, s),
  }))
}

export async function createSchedule(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  data: ScheduleInput,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  await loadVehicle(enterpriseId, vehicleId)
  return prisma.maintenanceSchedule.create({
    data: {
      vehicleId,
      kind: data.kind,
      label: data.label ?? null,
      intervalKm: data.intervalKm,
      warningKm: data.warningKm ?? 500,
      lastDoneAtKm: data.lastDoneAtKm ?? null,
      lastDoneAt: data.lastDoneAt ? new Date(data.lastDoneAt) : null,
      enabled: data.enabled ?? true,
      notes: data.notes ?? null,
    },
    select: SELECT,
  })
}

export async function updateSchedule(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  scheduleId: string,
  data: Partial<ScheduleInput>,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  const existing = await prisma.maintenanceSchedule.findFirst({
    where: { id: scheduleId, vehicleId, vehicle: { enterpriseId } },
    select: { id: true },
  })
  if (!existing) throw new AppError('SCHEDULE_NOT_FOUND', 404)
  return prisma.maintenanceSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(data.kind !== undefined && { kind: data.kind }),
      ...(data.label !== undefined && { label: data.label }),
      ...(data.intervalKm !== undefined && { intervalKm: data.intervalKm }),
      ...(data.warningKm !== undefined && { warningKm: data.warningKm }),
      ...(data.lastDoneAtKm !== undefined && { lastDoneAtKm: data.lastDoneAtKm }),
      ...(data.lastDoneAt !== undefined && {
        lastDoneAt: data.lastDoneAt ? new Date(data.lastDoneAt) : null,
      }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: SELECT,
  })
}

export async function deleteSchedule(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  scheduleId: string,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const existing = await prisma.maintenanceSchedule.findFirst({
    where: { id: scheduleId, vehicleId, vehicle: { enterpriseId } },
    select: { id: true },
  })
  if (!existing) throw new AppError('SCHEDULE_NOT_FOUND', 404)
  await prisma.maintenanceSchedule.delete({ where: { id: scheduleId } })
}

export async function listEnterpriseUpcomingMaintenance(
  enterpriseId: string,
  userId: string,
) {
  await assertMember(enterpriseId, userId)
  const vehicles = await prisma.vehicle.findMany({
    where: { enterpriseId },
    select: {
      id: true,
      brand: true,
      model: true,
      year: true,
      plate: true,
      mileage: true,
      createdAt: true,
      maintenanceSchedules: {
        where: { enabled: true },
        select: {
          id: true,
          kind: true,
          label: true,
          intervalKm: true,
          warningKm: true,
          lastDoneAtKm: true,
          lastDoneAt: true,
        },
      },
    },
  })

  const now = Date.now()
  type Alert = {
    vehicleId: string
    brand: string
    model: string
    year: number
    plate: string | null
    mileage: number | null
    scheduleId: string
    kind: string
    label: string | null
    intervalKm: number
    nextDueAtKm: number | null
    kmRemaining: number | null
    status: ScheduleStatus
    estimatedDaysToDue: number | null
  }
  const alerts: Alert[] = []

  for (const v of vehicles) {
    // crude km/day estimate: mileage / days since vehicle creation, fallback null
    const ageDays = Math.max(1, (now - v.createdAt.getTime()) / 86_400_000)
    const kmPerDay = v.mileage != null && ageDays > 0 ? v.mileage / ageDays : null

    for (const s of v.maintenanceSchedules) {
      const { status, nextDueAtKm, kmRemaining } = computeScheduleStatus(v.mileage, s)
      if (status === 'OK') continue

      let estimatedDaysToDue: number | null = null
      if (status === 'DUE_SOON' && kmRemaining != null && kmPerDay != null && kmPerDay > 0) {
        estimatedDaysToDue = Math.max(1, Math.round(kmRemaining / kmPerDay))
      }

      alerts.push({
        vehicleId: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        plate: v.plate,
        mileage: v.mileage,
        scheduleId: s.id,
        kind: s.kind,
        label: s.label,
        intervalKm: s.intervalKm,
        nextDueAtKm,
        kmRemaining,
        status,
        estimatedDaysToDue,
      })
    }
  }

  const urgency: Record<ScheduleStatus, number> = {
    OVERDUE: 0,
    DUE_SOON: 1,
    NEVER_DONE: 2,
    OK: 3,
  }
  alerts.sort((a, b) => {
    const u = urgency[a.status] - urgency[b.status]
    if (u !== 0) return u
    return (a.kmRemaining ?? Number.POSITIVE_INFINITY) - (b.kmRemaining ?? Number.POSITIVE_INFINITY)
  })

  return {
    counts: {
      overdue: alerts.filter((a) => a.status === 'OVERDUE').length,
      dueSoon: alerts.filter((a) => a.status === 'DUE_SOON').length,
      neverDone: alerts.filter((a) => a.status === 'NEVER_DONE').length,
    },
    alerts,
  }
}

// "Mark done now" — convenience: sets lastDoneAtKm to current vehicle mileage and lastDoneAt to now.
export async function markScheduleDone(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  scheduleId: string,
  doneAtKm?: number,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  const vehicle = await loadVehicle(enterpriseId, vehicleId)
  const existing = await prisma.maintenanceSchedule.findFirst({
    where: { id: scheduleId, vehicleId },
    select: { id: true },
  })
  if (!existing) throw new AppError('SCHEDULE_NOT_FOUND', 404)
  const km = doneAtKm ?? vehicle.mileage
  if (km == null) {
    throw new AppError('MILEAGE_REQUIRED', 400, {
      message: 'Renseignez le kilométrage du véhicule avant de valider un entretien',
    })
  }
  return prisma.maintenanceSchedule.update({
    where: { id: scheduleId },
    data: { lastDoneAtKm: km, lastDoneAt: new Date() },
    select: SELECT,
  })
}
