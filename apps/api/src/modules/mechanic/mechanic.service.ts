import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import type { MechanicSpecialty } from 'shared/constants'
import { recomputeMechanicScore } from './mechanicScore.service.js'

export interface RegisterMechanicInput {
  name: string
  phone: string
  commune?: string
  address?: string
  lat?: number
  lng?: number
  specialties: MechanicSpecialty[]
  bio?: string
}

export type UpdateMechanicInput = Partial<Omit<RegisterMechanicInput, 'phone'>>

/**
 * Inscription self-service : auto-publiée, aucune modération préalable (à la
 * différence de Vendor/KYC). userId vient de requireAuth — pas de compte
 * "mécanicien" séparé, Mechanic s'accroche simplement à l'identité existante.
 */
export async function registerMechanic(userId: string, input: RegisterMechanicInput) {
  const existing = await prisma.mechanic.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (existing) {
    throw new AppError('MECHANIC_ALREADY_EXISTS', 409, {
      message: 'Une fiche mécanicien existe déjà pour cet utilisateur',
    })
  }

  const phoneTaken = await prisma.mechanic.findUnique({
    where: { phone: input.phone },
    select: { id: true },
  })
  if (phoneTaken) {
    throw new AppError('MECHANIC_PHONE_TAKEN', 409, {
      message: 'Ce numéro est déjà associé à une autre fiche mécanicien',
    })
  }

  return prisma.mechanic.create({
    data: {
      userId,
      name: input.name,
      phone: input.phone,
      commune: input.commune,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      specialties: input.specialties,
      bio: input.bio,
    },
  })
}

/** Fiche du mécanicien connecté — quel que soit son statut (pour son propre tableau de bord). */
export async function getMyMechanic(userId: string) {
  const mechanic = await prisma.mechanic.findUnique({ where: { userId } })
  if (!mechanic) {
    throw new AppError('MECHANIC_NOT_FOUND', 404, {
      message: 'Aucune fiche mécanicien pour cet utilisateur',
    })
  }
  return mechanic
}

/** Profil public — uniquement les fiches actives, jamais les suspendues. */
export async function getMechanic(id: string) {
  const mechanic = await prisma.mechanic.findUnique({ where: { id } })
  if (!mechanic || mechanic.status !== 'ACTIVE') {
    throw new AppError('MECHANIC_NOT_FOUND', 404, { message: 'Fiche introuvable' })
  }
  return mechanic
}

export async function updateMechanic(
  requester: { id: string; roles: string[] },
  mechanicId: string,
  input: UpdateMechanicInput,
) {
  const mechanic = await prisma.mechanic.findUnique({ where: { id: mechanicId } })
  if (!mechanic) {
    throw new AppError('MECHANIC_NOT_FOUND', 404, { message: 'Fiche introuvable' })
  }

  const isOwner = mechanic.userId === requester.id
  const isStaff = requester.roles.includes('ADMIN') || requester.roles.includes('LIAISON')
  if (!isOwner && !isStaff) {
    throw new AppError('MECHANIC_FORBIDDEN', 403, {
      message: "Vous n'avez pas accès à cette fiche",
    })
  }

  return prisma.mechanic.update({ where: { id: mechanicId }, data: input })
}

/**
 * Distance du grand cercle (km) — formule haversine. Suffisant pour un
 * annuaire de quelques milliers de fiches ; pas de PostGIS pour ce volume.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export interface SearchMechanicsOptions {
  lat?: number
  lng?: number
  radiusKm?: number
  commune?: string
  specialty?: MechanicSpecialty
  q?: string
  page?: number
  limit?: number
}

/**
 * Recherche géo par pré-filtre bounding-box (indexable) + distance haversine
 * exacte en mémoire sur les candidats. Sans coordonnées, repli sur un tri par
 * note dans la commune demandée — le parcours "parcourir" par défaut.
 */
export async function searchMechanics(options: SearchMechanicsOptions) {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))

  const where = {
    status: 'ACTIVE' as const,
    ...(options.commune ? { commune: options.commune } : {}),
    ...(options.specialty ? { specialties: { has: options.specialty } } : {}),
    ...(options.q ? { name: { contains: options.q, mode: 'insensitive' as const } } : {}),
  }

  if (options.lat != null && options.lng != null) {
    const lat = options.lat
    const lng = options.lng
    const radiusKm = options.radiusKm ?? 10
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))

    const candidates = await prisma.mechanic.findMany({
      where: {
        ...where,
        lat: { gte: lat - latDelta, lte: lat + latDelta },
        lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
    })

    const withDistance = candidates
      .filter((m) => m.lat != null && m.lng != null)
      .map((m) => ({ ...m, distanceKm: haversineKm(lat, lng, m.lat as number, m.lng as number) }))
      .filter((m) => m.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    const total = withDistance.length
    const start = (page - 1) * limit
    return { mechanics: withDistance.slice(start, start + limit), total, page, limit }
  }

  const [mechanics, total] = await Promise.all([
    prisma.mechanic.findMany({
      where,
      orderBy: [{ avgRating: 'desc' }, { reviewCount: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mechanic.count({ where }),
  ])

  return { mechanics, total, page, limit }
}

export async function suspendMechanic(mechanicId: string, moderatorId: string, reason: string) {
  const mechanic = await prisma.mechanic.findUnique({ where: { id: mechanicId }, select: { id: true } })
  if (!mechanic) {
    throw new AppError('MECHANIC_NOT_FOUND', 404, { message: 'Fiche introuvable' })
  }
  return prisma.mechanic.update({
    where: { id: mechanicId },
    data: {
      status: 'SUSPENDED',
      suspendedReason: reason,
      suspendedAt: new Date(),
      moderatedById: moderatorId,
    },
  })
}

export async function reinstateMechanic(mechanicId: string, moderatorId: string) {
  const mechanic = await prisma.mechanic.findUnique({ where: { id: mechanicId }, select: { id: true } })
  if (!mechanic) {
    throw new AppError('MECHANIC_NOT_FOUND', 404, { message: 'Fiche introuvable' })
  }
  return prisma.mechanic.update({
    where: { id: mechanicId },
    data: {
      status: 'ACTIVE',
      suspendedReason: null,
      suspendedAt: null,
      moderatedById: moderatorId,
    },
  })
}

// ---------------------------------------------------------------------------
// Avis — ouverts à tout utilisateur authentifié (requireAuth, aucun rôle
// requis), sans qu'une transaction pieces.ci existe. `verified`/
// `verifiedOrderId` restent à false/null pour l'instant (chemin différé, voir
// plan produit B.4).
// ---------------------------------------------------------------------------

export async function createMechanicReview(
  reviewerId: string,
  mechanicId: string,
  input: { rating: number; comment?: string },
) {
  const mechanic = await prisma.mechanic.findUnique({
    where: { id: mechanicId },
    select: { id: true, status: true },
  })
  if (!mechanic || mechanic.status !== 'ACTIVE') {
    throw new AppError('MECHANIC_NOT_FOUND', 404, { message: 'Fiche introuvable' })
  }

  const existing = await prisma.mechanicReview.findFirst({
    where: { mechanicId, reviewerId },
    select: { id: true },
  })
  if (existing) {
    throw new AppError('MECHANIC_REVIEW_ALREADY_EXISTS', 409, {
      message: 'Vous avez déjà laissé un avis pour ce mécanicien',
    })
  }

  const review = await prisma.mechanicReview.create({
    data: {
      mechanicId,
      reviewerId,
      rating: input.rating,
      comment: input.comment,
    },
  })

  // Fire-and-forget : un échec de recalcul ne doit pas faire échouer le dépôt d'avis.
  void recomputeMechanicScore(mechanicId).catch(() => {})

  return review
}

export async function listMechanicReviews(
  mechanicId: string,
  options: { page?: number; limit?: number } = {},
) {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))

  const where = { mechanicId, status: 'PUBLISHED' as const }

  const [reviews, total] = await Promise.all([
    prisma.mechanicReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        verified: true,
        createdAt: true,
        reviewer: { select: { name: true } },
      },
    }),
    prisma.mechanicReview.count({ where }),
  ])

  return { reviews, total, page, limit }
}

export async function hideMechanicReview(reviewId: string, moderatorId: string) {
  const review = await prisma.mechanicReview.findUnique({
    where: { id: reviewId },
    select: { id: true, mechanicId: true },
  })
  if (!review) {
    throw new AppError('MECHANIC_REVIEW_NOT_FOUND', 404, { message: 'Avis introuvable' })
  }

  const updated = await prisma.mechanicReview.update({
    where: { id: reviewId },
    data: { status: 'HIDDEN', moderatedById: moderatorId },
  })

  void recomputeMechanicScore(review.mechanicId).catch(() => {})

  return updated
}
