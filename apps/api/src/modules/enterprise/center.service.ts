import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'

export interface CenterInput {
  name: string
  commune?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  contactName?: string | null
  contactPhone?: string | null
  deliveryDayOfWeek?: number | null
  active?: boolean
  notes?: string | null
}

const SELECT = {
  id: true,
  enterpriseId: true,
  name: true,
  commune: true,
  address: true,
  lat: true,
  lng: true,
  contactName: true,
  contactPhone: true,
  deliveryDayOfWeek: true,
  active: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listCenters(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)
  const centers = await prisma.maintenanceCenter.findMany({
    where: { enterpriseId },
    select: {
      ...SELECT,
      _count: { select: { vehicles: true } },
    },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
  return centers.map((c) => ({
    ...c,
    vehiclesCount: c._count.vehicles,
    _count: undefined,
  }))
}

export async function getCenter(enterpriseId: string, userId: string, centerId: string) {
  await assertMember(enterpriseId, userId)
  const center = await prisma.maintenanceCenter.findFirst({
    where: { id: centerId, enterpriseId },
    select: {
      ...SELECT,
      _count: { select: { vehicles: true } },
    },
  })
  if (!center) throw new AppError('CENTER_NOT_FOUND', 404)
  return { ...center, vehiclesCount: center._count.vehicles, _count: undefined }
}

export async function createCenter(
  enterpriseId: string,
  userId: string,
  data: CenterInput,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  return prisma.maintenanceCenter.create({
    data: {
      enterpriseId,
      name: data.name,
      commune: data.commune ?? null,
      address: data.address ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      contactName: data.contactName ?? null,
      contactPhone: data.contactPhone ?? null,
      deliveryDayOfWeek: data.deliveryDayOfWeek ?? null,
      active: data.active ?? true,
      notes: data.notes ?? null,
    },
    select: SELECT,
  })
}

export async function updateCenter(
  enterpriseId: string,
  userId: string,
  centerId: string,
  data: Partial<CenterInput>,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const existing = await prisma.maintenanceCenter.findFirst({
    where: { id: centerId, enterpriseId },
    select: { id: true },
  })
  if (!existing) throw new AppError('CENTER_NOT_FOUND', 404)
  return prisma.maintenanceCenter.update({
    where: { id: centerId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.commune !== undefined && { commune: data.commune }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.lat !== undefined && { lat: data.lat }),
      ...(data.lng !== undefined && { lng: data.lng }),
      ...(data.contactName !== undefined && { contactName: data.contactName }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.deliveryDayOfWeek !== undefined && { deliveryDayOfWeek: data.deliveryDayOfWeek }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: SELECT,
  })
}

export async function deleteCenter(
  enterpriseId: string,
  userId: string,
  centerId: string,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER'])
  const existing = await prisma.maintenanceCenter.findFirst({
    where: { id: centerId, enterpriseId },
    select: { id: true, _count: { select: { vehicles: true } } },
  })
  if (!existing) throw new AppError('CENTER_NOT_FOUND', 404)
  // Vehicles auto-detach via onDelete: SetNull
  await prisma.maintenanceCenter.delete({ where: { id: centerId } })
  return { deleted: true, vehiclesDetached: existing._count.vehicles }
}

export async function setVehicleHomeCenter(
  enterpriseId: string,
  userId: string,
  vehicleId: string,
  homeCenterId: string | null,
) {
  await assertMember(enterpriseId, userId, ['OWNER', 'MANAGER', 'MECHANIC'])
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true },
  })
  if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 404)
  if (homeCenterId) {
    const center = await prisma.maintenanceCenter.findFirst({
      where: { id: homeCenterId, enterpriseId },
      select: { id: true },
    })
    if (!center) throw new AppError('CENTER_NOT_FOUND', 404)
  }
  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: { homeCenterId },
    select: { id: true, homeCenterId: true },
  })
}
