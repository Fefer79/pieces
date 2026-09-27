import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { uploadToR2 } from '../../lib/r2.js'
import type { MechanicSpecialty } from 'shared/constants'
import { recomputeMechanicScore } from './mechanicScore.service.js'

const MECHANIC_PHOTO_MAX_SIZE = 5 * 1024 * 1024
const MECHANIC_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
  input: { rating: number; comment?: string; amountPaid?: number; photos?: string[] },
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
      amountPaid: input.amountPaid,
      photos: input.photos ?? [],
    },
  })

  // Fire-and-forget : un échec de recalcul ne doit pas faire échouer le dépôt d'avis.
  void recomputeMechanicScore(mechanicId).catch(() => {})

  return review
}

function assertValidMechanicPhoto(fileBuffer: Buffer, mimeType: string) {
  if (fileBuffer.length > MECHANIC_PHOTO_MAX_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }
  if (!MECHANIC_PHOTO_MIME_TYPES.includes(mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }
}

/**
 * Upload d'une photo destinée à un avis, en amont de sa création — l'URL
 * obtenue est ensuite passée dans `photos` à `createMechanicReview`. Pas de
 * variantes (thumb/small/…) : ce sont des photos-preuve, pas des visuels
 * catalogue.
 */
export async function uploadMechanicReviewPhoto(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  assertValidMechanicPhoto(fileBuffer, mimeType)

  const ext = mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const key = `mechanic-reviews/${userId}/${timestamp}_${safeName}.${ext}`

  return uploadToR2(key, fileBuffer, mimeType)
}

/**
 * Upload d'une photo destinée à une suggestion — dépôt ouvert, donc sans
 * userId pour scoper la clé (contrairement aux avis). Même garde-fous
 * taille/format ; l'abus reste borné par le rate limit global de l'API.
 */
export async function uploadMechanicSuggestionPhoto(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  assertValidMechanicPhoto(fileBuffer, mimeType)

  const ext = mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const key = `mechanic-suggestions/${timestamp}_${random}_${safeName}.${ext}`

  return uploadToR2(key, fileBuffer, mimeType)
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
        amountPaid: true,
        photos: true,
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

// ---------------------------------------------------------------------------
// Suggestions — proposer un mécanicien absent de l'annuaire. Dépôt ouvert
// (utilisateur authentifié ou non), modéré par LIAISON/mechanics:moderate
// avant de devenir une fiche Mechanic. Distinct des avis (MechanicReview) qui
// notent une fiche déjà publiée.
// ---------------------------------------------------------------------------

export interface SuggestMechanicInput {
  name: string
  phone: string
  commune?: string
  address?: string
  lat?: number
  lng?: number
  specialty?: MechanicSpecialty
  note?: string
  photo?: string
}

export async function suggestMechanic(suggestedById: string | null, input: SuggestMechanicInput) {
  return prisma.mechanicSuggestion.create({
    data: {
      name: input.name,
      phone: input.phone,
      commune: input.commune,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      specialty: input.specialty,
      note: input.note,
      photo: input.photo,
      suggestedById: suggestedById ?? undefined,
    },
  })
}

export async function listMechanicSuggestions(
  options: { status?: 'PENDING' | 'APPROVED' | 'REJECTED'; page?: number; limit?: number } = {},
) {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 20))
  const where = { status: options.status ?? 'PENDING' } as const

  const [suggestions, total] = await Promise.all([
    prisma.mechanicSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mechanicSuggestion.count({ where }),
  ])

  return { suggestions, total, page, limit }
}

export interface UpdateMechanicSuggestionInput {
  name?: string
  phone?: string
  commune?: string
  address?: string
  lat?: number
  lng?: number
  specialty?: MechanicSpecialty
  note?: string
  photo?: string | null
}

/**
 * Corriger une suggestion avant de l'approuver (typo, commune erronée,
 * mauvais pin…) plutôt que de la rejeter pour la faire reproposer.
 */
export async function updateMechanicSuggestion(
  suggestionId: string,
  input: UpdateMechanicSuggestionInput,
) {
  const suggestion = await prisma.mechanicSuggestion.findUnique({ where: { id: suggestionId } })
  if (!suggestion) {
    throw new AppError('MECHANIC_SUGGESTION_NOT_FOUND', 404, { message: 'Suggestion introuvable' })
  }
  if (suggestion.status !== 'PENDING') {
    throw new AppError('MECHANIC_SUGGESTION_ALREADY_MODERATED', 409, {
      message: 'Cette suggestion a déjà été traitée',
    })
  }

  return prisma.mechanicSuggestion.update({
    where: { id: suggestionId },
    data: input,
  })
}

/**
 * Approuver une suggestion : crée la fiche Mechanic correspondante (statut
 * ACTIVE, reprenant le point géographique de la suggestion s'il existe —
 * sinon la géo se complète ensuite via update ou si le mécanicien revendique
 * sa fiche). Si le téléphone proposé correspond déjà à
 * une fiche existante, l'approbation échoue plutôt que de créer un doublon —
 * au modérateur de rejeter la suggestion ou de rediriger vers la fiche
 * existante.
 */
export async function approveMechanicSuggestion(suggestionId: string, moderatorId: string) {
  const suggestion = await prisma.mechanicSuggestion.findUnique({ where: { id: suggestionId } })
  if (!suggestion) {
    throw new AppError('MECHANIC_SUGGESTION_NOT_FOUND', 404, { message: 'Suggestion introuvable' })
  }
  if (suggestion.status !== 'PENDING') {
    throw new AppError('MECHANIC_SUGGESTION_ALREADY_MODERATED', 409, {
      message: 'Cette suggestion a déjà été traitée',
    })
  }
  if (!suggestion.phone) {
    throw new AppError('MECHANIC_SUGGESTION_MISSING_PHONE', 422, {
      message: 'Suggestion sans téléphone — impossible de créer la fiche',
    })
  }

  const taken = await prisma.mechanic.findUnique({
    where: { phone: suggestion.phone },
    select: { id: true },
  })
  if (taken) {
    throw new AppError('MECHANIC_PHONE_TAKEN', 409, {
      message: 'Ce numéro correspond déjà à une fiche mécanicien existante',
    })
  }

  const mechanic = await prisma.mechanic.create({
    data: {
      name: suggestion.name,
      phone: suggestion.phone,
      commune: suggestion.commune,
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      specialties: suggestion.specialty ? [suggestion.specialty as MechanicSpecialty] : [],
      bio: suggestion.note ?? undefined,
      photos: suggestion.photo ? [suggestion.photo] : [],
      createdByLiaisonId: moderatorId,
      moderatedById: moderatorId,
    },
  })

  const updated = await prisma.mechanicSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'APPROVED',
      moderatedById: moderatorId,
      moderatedAt: new Date(),
      createdMechanicId: mechanic.id,
    },
  })

  return { suggestion: updated, mechanic }
}

export async function rejectMechanicSuggestion(
  suggestionId: string,
  moderatorId: string,
  reason?: string,
) {
  const suggestion = await prisma.mechanicSuggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true, status: true },
  })
  if (!suggestion) {
    throw new AppError('MECHANIC_SUGGESTION_NOT_FOUND', 404, { message: 'Suggestion introuvable' })
  }
  if (suggestion.status !== 'PENDING') {
    throw new AppError('MECHANIC_SUGGESTION_ALREADY_MODERATED', 409, {
      message: 'Cette suggestion a déjà été traitée',
    })
  }

  return prisma.mechanicSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'REJECTED',
      moderatedById: moderatorId,
      moderatedAt: new Date(),
      rejectionReason: reason,
    },
  })
}
