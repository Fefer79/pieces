import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { upsertDailyRecord } from '../enterprise/driver.service.js'

const PROFILE_SELECT = {
  id: true,
  name: true,
  phone: true,
  status: true,
  photoUrl: true,
  enterprise: { select: { id: true, name: true } },
  assignments: {
    where: { endedAt: null },
    take: 1,
    orderBy: { startedAt: 'desc' as const },
    select: {
      id: true, startedAt: true,
      vehicle: { select: { id: true, brand: true, model: true, year: true, plate: true } },
    },
  },
} as const

/**
 * Profil chauffeur de l'utilisateur courant. Onboarding : si une fiche Driver
 * existe pour son téléphone mais n'est pas encore liée, on la lie à son compte
 * et on lui attribue le rôle DRIVER. Renvoie null si l'utilisateur n'est pas
 * (ou pas encore) un chauffeur.
 */
export async function getMyDriverProfile(userId: string, phone: string | null) {
  let driver = await prisma.driver.findFirst({
    where: { userId },
    select: PROFILE_SELECT,
  })

  if (!driver && phone) {
    const unlinked = await prisma.driver.findFirst({
      where: { phone, userId: null },
      select: { id: true },
    })
    if (unlinked) {
      driver = await prisma.driver.update({
        where: { id: unlinked.id },
        data: { userId },
        select: PROFILE_SELECT,
      })
      // Donne le rôle DRIVER (sans écraser les rôles existants) ; active le
      // contexte chauffeur si aucun contexte n'est encore défini.
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roles: true, activeContext: true },
      })
      if (user && !user.roles.includes('DRIVER')) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            roles: { set: [...user.roles, 'DRIVER'] },
            ...(user.activeContext ? {} : { activeContext: 'DRIVER' }),
          },
        })
      }
    }
  }

  if (!driver) return null

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayRecord = await prisma.driverDailyRecord.findUnique({
    where: { uq_driver_day: { driverId: driver.id, date: today } },
    select: { id: true, date: true, revenue: true, fuelCost: true, otherExpenses: true, kmDriven: true, notes: true },
  })

  const { assignments, ...rest } = driver
  return {
    ...rest,
    activeAssignment: assignments[0] ?? null,
    todayRecord,
  }
}

async function myDriverId(userId: string): Promise<string> {
  const driver = await prisma.driver.findFirst({ where: { userId }, select: { id: true } })
  if (!driver) throw new AppError('DRIVER_NOT_FOUND', 404, { message: 'Aucun profil chauffeur lié à ce compte' })
  return driver.id
}

export async function listMyDriverRecords(userId: string, days = 30) {
  const driverId = await myDriverId(userId)
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  since.setUTCHours(0, 0, 0, 0)
  return prisma.driverDailyRecord.findMany({
    where: { driverId, date: { gte: since } },
    orderBy: { date: 'desc' },
    select: {
      id: true, date: true, revenue: true, fuelCost: true, otherExpenses: true, kmDriven: true, notes: true,
      vehicle: { select: { id: true, brand: true, model: true, plate: true } },
    },
  })
}

type DailyInput = {
  date: string
  revenue: number
  fuelCost: number
  otherExpenses: number
  kmDriven?: number
  notes?: string
}

// Le chauffeur saisit lui-même son relevé du jour (véhicule = affectation active).
export async function upsertMyDailyRecord(userId: string, data: DailyInput) {
  const driverId = await myDriverId(userId)
  return upsertDailyRecord(driverId, data)
}
