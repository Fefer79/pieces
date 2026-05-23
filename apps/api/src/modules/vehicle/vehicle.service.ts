import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

export async function getUserVehicles(userId: string) {
  return prisma.vehicle.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, brand: true, model: true, year: true, vin: true, createdAt: true },
  })
}

export async function addUserVehicle(userId: string, data: { brand: string; model: string; year: number; vin?: string }) {
  const count = await prisma.vehicle.count({ where: { userId } })
  if (count >= 5) {
    throw new AppError('VEHICLE_LIMIT_REACHED', 400, { message: 'Maximum 5 véhicules par utilisateur' })
  }

  return prisma.vehicle.create({
    data: { userId, brand: data.brand, model: data.model, year: data.year, vin: data.vin },
    select: { id: true, brand: true, model: true, year: true, vin: true, createdAt: true },
  })
}

export async function deleteUserVehicle(userId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
  })

  if (!vehicle) {
    throw new AppError('VEHICLE_NOT_FOUND', 404, { message: 'Véhicule introuvable' })
  }

  await prisma.vehicle.delete({ where: { id: vehicleId } })
}
