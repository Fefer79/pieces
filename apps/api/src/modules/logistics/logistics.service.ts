// Demandes de cotation logistique — logistique.pieces.ci.
//
// ⚠ À ne pas confondre avec modules/enterprise/logistics.service.ts, qui calcule
// la matrice d'arbitrage d'une demande de pièce DÉJÀ rattachée à une flotte.
// Ici on traite l'entrée en amont : un lead (visiteur, compte simple ou flotte)
// qui décrit une pièce à importer et reçoit une estimation.

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { uploadToR2 } from '../../lib/r2.js'
import { processVariants, MAX_FILE_SIZE } from '../../lib/imageProcessor.js'
import { normalizeIvorianPhone } from '../../lib/phone.js'
import { assertMember } from '../enterprise/enterprise.service.js'
import { getShipmentForQuoteRequest } from '../sourcing/shipment.service.js'
import { sendBaileysText, isBaileysConnected } from '../whatsapp/baileys.sender.js'
import {
  createLogisticsQuoteRequestSchema,
  type CreateLogisticsQuoteRequestInput,
  type AdminLogisticsListQuery,
  type AdminUpdateLogisticsQuoteRequestInput,
  type EnterpriseLogisticsListQuery,
} from 'shared/validators'
import {
  computeArbitrageMatrix,
  matchLogisticsFamily,
  resolveEconomyCategory,
  computeCertainty,
  DOWNTIME_COST_PER_DAY,
  type ArbitrageOptionInput,
  type LeadCertaintySignals,
  type VehicleEconomyCategory,
} from 'shared/constants'
import type {
  LogisticsLeadPhotoKind,
  LogisticsLeadStatus,
  Prisma,
} from '@prisma/client'

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTOS_PER_REQUEST = 4
const UPLOAD_TOKEN_TTL_MS = 30 * 60 * 1000
/** Un humain ne remplit pas trois étapes en moins de 3 secondes. */
const MIN_FILL_DURATION_MS = 3_000
/** Fenêtre d'idempotence : un double-clic ou un retour arrière ne crée pas de doublon. */
const DEDUP_WINDOW_MS = 10 * 60 * 1000

/**
 * Options d'acheminement proposées au public. `PRE_POSITIONED` est exclu : un
 * prospect n'a pas de stock consigné, et c'est l'option qui gagne toujours —
 * l'afficher reviendrait à annoncer un délai qu'on ne peut pas tenir.
 */
const PUBLIC_MODES = ['LOCAL', 'AIR_NOW', 'AIR_STANDARD', 'AIR_ECONOMY', 'SEA_LCL'] as const

export interface RequestContext {
  /** Utilisateur authentifié (Bearer optionnel sur la route publique). */
  userId?: string | null
  ip?: string | null
  userAgent?: string | null
  referer?: string | null
}

export interface CreatedQuoteRequest {
  id: string
  reference: string
  uploadToken: string
  uploadTokenExpiresAt: string
  certaintyScore: number
  certaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  downtimeCostPerDay: number
  estimate: ReturnType<typeof computeArbitrageMatrix> | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1

/** « LOG-2607-8F3K » — court, dictable au téléphone, sans caractère ambigu. */
export function buildReference(now = new Date()): string {
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const suffix = Array.from(
    randomBytes(4),
    (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length],
  ).join('')
  return `LOG-${dd}${mm}-${suffix}`
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const salt = process.env.PII_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'pieces'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

/**
 * Le score de certitude est TOUJOURS recalculé ici : la valeur affichée au
 * prospect et celle vue par les ops viennent du même code, et le client ne peut
 * pas se déclarer « identifié » sans fournir les preuves.
 */
export function certaintySignalsFor(
  input: Pick<
    CreateLogisticsQuoteRequestInput,
    'partName' | 'partCategory' | 'oemReference' | 'vin' | 'vehicleBrand' | 'vehicleModel' | 'energyType'
  >,
  photos: { hasPart: boolean; hasRegistration: boolean },
): LeadCertaintySignals {
  return {
    partName: !!input.partName,
    partCategory: !!input.partCategory,
    oemReference: !!input.oemReference,
    partPhoto: photos.hasPart,
    vin: !!input.vin,
    registrationPhoto: photos.hasRegistration,
    vehicleManual: !!(input.vehicleBrand && input.vehicleModel),
    energyType: !!input.energyType,
  }
}

/**
 * Matrice recalculée serveur. On ne fait jamais confiance au chiffre envoyé par
 * le client : sinon un prospect peut « prouver » plus tard qu'on lui avait
 * annoncé un montant qu'il a fabriqué lui-même.
 *
 * ⚠ Sans `partPriceHint`, `partPrice = 0` : la douane (20 % de pièce + fret) ne
 * porte alors que sur le fret. Le total est un PLANCHER, jamais un devis — d'où
 * le libellé « coût d'acheminement + immobilisation » côté web.
 */
export function buildEstimate(input: {
  partName: string
  partCategory?: string | null
  oemReference?: string | null
  partPriceHint?: number | null
  economyCategory: VehicleEconomyCategory
}) {
  const partPrice = input.partPriceHint ?? 0
  const options: ArbitrageOptionInput[] = PUBLIC_MODES.map((mode) => ({
    mode,
    partPrice,
    // On ne prétend pas savoir si la pièce est dispo localement tant qu'un
    // opérateur ne l'a pas vérifié : l'option locale est affichée, marquée
    // « à confirmer » côté web.
    available: true,
  }))

  return computeArbitrageMatrix({
    downtimeCostPerDay: DOWNTIME_COST_PER_DAY[input.economyCategory],
    family: matchLogisticsFamily(input.partName, input.partCategory, input.oemReference),
    options,
  })
}

async function logEvent(
  quoteRequestId: string,
  toStatus: LogisticsLeadStatus | null,
  fromStatus: LogisticsLeadStatus | null,
  actorUserId: string | null,
  note?: string,
) {
  await prisma.logisticsQuoteRequestEvent.create({
    data: { quoteRequestId, toStatus, fromStatus, actorUserId, note },
  })
}

function notifyOps(reference: string, partName: string, phone: string, level: string) {
  const target = process.env.LOGISTICS_OPS_PHONE
  if (!target || !isBaileysConnected()) return
  const text = `Nouvelle cotation logistique ${reference}\n${partName}\nContact : ${phone}\nIdentification : ${level}`
  // Fire-and-forget : une panne WhatsApp ne doit jamais faire échouer un lead.
  void sendBaileysText(target, text).catch(() => {})
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function createQuoteRequest(
  raw: unknown,
  ctx: RequestContext = {},
): Promise<CreatedQuoteRequest> {
  const input = createLogisticsQuoteRequestSchema.parse(raw)
  const now = Date.now()

  // --- Anti-abus (les comptes authentifiés en sont dispensés : le lead est déjà
  // attribué à une identité vérifiée) ---
  const isAuthed = !!ctx.userId

  if (!isAuthed && input.website && input.website.trim().length > 0) {
    // Honeypot : on répond comme si tout allait bien, sans rien persister. Ne
    // jamais dire non à un bot — il adapterait sa charge utile.
    return {
      id: randomUUID(),
      reference: buildReference(),
      uploadToken: randomBytes(32).toString('hex'),
      uploadTokenExpiresAt: new Date(now + UPLOAD_TOKEN_TTL_MS).toISOString(),
      certaintyScore: 0,
      certaintyLevel: 'LOW',
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_ICE,
      estimate: null,
    }
  }

  const tooFast =
    !isAuthed && input.startedAt != null && now - input.startedAt < MIN_FILL_DURATION_MS

  const phone = normalizeIvorianPhone(input.phone)
  if (!phone) {
    throw new AppError('INVALID_PHONE', 422, {
      message: 'Numéro de téléphone ivoirien invalide (format attendu : +225 XX XX XX XX XX)',
    })
  }
  const whatsapp = input.whatsapp ? normalizeIvorianPhone(input.whatsapp) : null

  // --- Rattachements : toujours revérifiés contre le porteur du jeton ---
  let enterpriseId: string | null = null
  let vehicleId: string | null = null
  let partRequestId: string | null = null
  let vehicle: {
    brand: string
    model: string
    year: number
    vin: string | null
    energyType: 'ICE' | 'EV' | 'HYBRID' | null
  } | null = null

  if (ctx.userId && input.enterpriseId) {
    await assertMember(input.enterpriseId, ctx.userId, ['OWNER', 'MANAGER', 'MECHANIC'])
    enterpriseId = input.enterpriseId

    if (input.vehicleId) {
      const found = await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, enterpriseId },
        select: { brand: true, model: true, year: true, vin: true, energyType: true },
      })
      if (!found) {
        throw new AppError('LOGISTICS_VEHICLE_NOT_FOUND', 404, {
          message: 'Véhicule introuvable dans cette flotte',
        })
      }
      vehicle = found
      vehicleId = input.vehicleId
    }

    if (input.partRequestId) {
      const pr = await prisma.partRequest.findFirst({
        where: { id: input.partRequestId, enterpriseId },
        select: { id: true },
      })
      if (!pr) {
        throw new AppError('PART_REQUEST_NOT_FOUND', 404, { message: 'Demande de pièce introuvable' })
      }
      partRequestId = pr.id
    }
  }

  const vehicleBrand = vehicle?.brand ?? input.vehicleBrand ?? null
  const vehicleModel = vehicle?.model ?? input.vehicleModel ?? null
  const vehicleYear = vehicle?.year ?? input.vehicleYear ?? null
  const vin = (vehicle?.vin ?? input.vin ?? null)?.toUpperCase() ?? null
  const energyType = vehicle?.energyType ?? input.energyType ?? null

  const economyCategory = resolveEconomyCategory({ energyType, model: vehicleModel })

  // --- Déduplication : même téléphone + même pièce dans les 10 minutes ---
  const existing = await prisma.logisticsQuoteRequest.findFirst({
    where: {
      phone,
      partName: input.partName,
      createdAt: { gte: new Date(now - DEDUP_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      reference: true,
      certaintyScore: true,
      certaintyLevel: true,
      downtimeCostPerDay: true,
      estimateJson: true,
    },
  })
  if (existing) {
    // Idempotent : on renvoie l'enregistrement existant avec un nouveau jeton
    // d'upload (l'utilisateur peut vouloir compléter ses photos).
    const uploadToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(now + UPLOAD_TOKEN_TTL_MS)
    await prisma.logisticsQuoteRequest.update({
      where: { id: existing.id },
      data: { uploadTokenHash: hashToken(uploadToken), uploadTokenExpiresAt: expiresAt },
    })
    return {
      id: existing.id,
      reference: existing.reference,
      uploadToken,
      uploadTokenExpiresAt: expiresAt.toISOString(),
      certaintyScore: existing.certaintyScore,
      certaintyLevel: existing.certaintyLevel,
      downtimeCostPerDay: existing.downtimeCostPerDay ?? DOWNTIME_COST_PER_DAY[economyCategory],
      estimate: (existing.estimateJson as CreatedQuoteRequest['estimate']) ?? null,
    }
  }

  // --- Score de certitude (photos pas encore envoyées à ce stade) ---
  const { score, level } = computeCertainty(
    certaintySignalsFor(
      {
        ...input,
        vin: vin ?? undefined,
        vehicleBrand: vehicleBrand ?? undefined,
        vehicleModel: vehicleModel ?? undefined,
        energyType: energyType ?? undefined,
      },
      { hasPart: false, hasRegistration: false },
    ),
  )

  const estimate = buildEstimate({
    partName: input.partName,
    partCategory: input.partCategory,
    oemReference: input.oemReference,
    partPriceHint: input.partPriceHint,
    economyCategory,
  })

  const uploadToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(now + UPLOAD_TOKEN_TTL_MS)
  const reference = buildReference()

  const created = await prisma.logisticsQuoteRequest.create({
    data: {
      reference,
      status: tooFast ? 'SPAM' : 'NEW',
      userId: ctx.userId ?? null,
      enterpriseId,
      vehicleId,
      partRequestId,
      contactName: input.contactName,
      companyName: input.companyName ?? null,
      phone,
      whatsapp,
      email: input.email ?? null,
      commune: input.commune ?? null,
      customerType: input.customerType,
      fleetSize: input.fleetSize ?? null,
      partName: input.partName,
      partCategory: input.partCategory ?? null,
      oemReference: input.oemReference ?? null,
      quantity: input.quantity,
      partPriceHint: input.partPriceHint ?? null,
      familyId: estimate.familyId,
      vin,
      vinDecoded: false,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      energyType,
      economyCategory,
      vehicleImmobilized: input.vehicleImmobilized,
      certaintyScore: score,
      certaintyLevel: level,
      downtimeCostPerDay: estimate.downtimeCostPerDay,
      estimateJson: estimate as unknown as Prisma.InputJsonValue,
      surface: input.surface,
      campaign: input.campaign ?? null,
      referer: ctx.referer ?? null,
      ipHash: hashIp(ctx.ip),
      userAgent: ctx.userAgent?.slice(0, 500) ?? null,
      consentAt: new Date(),
      uploadTokenHash: hashToken(uploadToken),
      uploadTokenExpiresAt: expiresAt,
    },
    select: { id: true, reference: true },
  })

  await logEvent(created.id, tooFast ? 'SPAM' : 'NEW', null, ctx.userId ?? null, 'Demande créée')

  if (!tooFast) notifyOps(reference, input.partName, phone, level)

  return {
    id: created.id,
    reference: created.reference,
    uploadToken,
    uploadTokenExpiresAt: expiresAt.toISOString(),
    certaintyScore: score,
    certaintyLevel: level,
    downtimeCostPerDay: estimate.downtimeCostPerDay,
    estimate,
  }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export interface PhotoInput {
  buffer: Buffer
  mimeType: string
  filename: string
  kind: LogisticsLeadPhotoKind
}

/**
 * Autorise soit le jeton d'upload à usage court, soit un Bearer dont le compte
 * possède le lead. Une seule route, deux chemins d'autorisation.
 */
async function assertPhotoAccess(id: string, uploadToken: string | null, userId: string | null) {
  const lead = await prisma.logisticsQuoteRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      userId: true,
      enterpriseId: true,
      uploadTokenHash: true,
      uploadTokenExpiresAt: true,
      _count: { select: { photos: true } },
    },
  })
  if (!lead) {
    throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Demande introuvable' })
  }

  const ownedByUser = !!userId && lead.userId === userId
  let tokenOk = false
  if (uploadToken && lead.uploadTokenHash) {
    tokenOk = safeEqualHex(hashToken(uploadToken), lead.uploadTokenHash)
    if (tokenOk && lead.uploadTokenExpiresAt && lead.uploadTokenExpiresAt.getTime() < Date.now()) {
      throw new AppError('LOGISTICS_UPLOAD_TOKEN_EXPIRED', 401, {
        message: 'Lien d\'envoi de photo expiré — reprenez votre demande',
      })
    }
  }

  if (!tokenOk && !ownedByUser) {
    throw new AppError('LOGISTICS_UPLOAD_TOKEN_INVALID', 401, {
      message: 'Jeton d\'envoi invalide',
    })
  }

  if (lead.status !== 'NEW') {
    throw new AppError('LOGISTICS_LEAD_LOCKED', 409, {
      message: 'Cette demande est déjà en cours de traitement — contactez-nous pour ajouter une photo',
    })
  }

  if (lead._count.photos >= MAX_PHOTOS_PER_REQUEST) {
    throw new AppError('LOGISTICS_MAX_PHOTOS', 422, {
      message: `Maximum ${MAX_PHOTOS_PER_REQUEST} photos par demande`,
    })
  }

  return lead
}

/**
 * ⚠ Vie privée : une carte grise porte nom, adresse et immatriculation, et
 * `uploadToR2` renvoie une URL PUBLIQUE. On utilise donc une clé non devinable,
 * et la réponse publique ne contient jamais l'URL — seules les routes admin et
 * propriétaires l'exposent.
 * DETTE : basculer ce préfixe sur un bucket privé + URL signée.
 */
export async function addQuoteRequestPhoto(
  id: string,
  uploadToken: string | null,
  userId: string | null,
  input: PhotoInput,
) {
  const lead = await assertPhotoAccess(id, uploadToken, userId)

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(input.mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, {
      message: 'Format accepté : JPEG, PNG, WebP',
    })
  }
  if (input.buffer.length > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 Mo)' })
  }

  const ext = input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/webp' ? 'webp' : 'jpg'
  const baseKey = `logistics-leads/${lead.id}/${randomUUID()}_${input.kind.toLowerCase()}`

  const variants = await processVariants(input.buffer)
  const [originalUrl, thumbUrl] = await Promise.all([
    uploadToR2(`${baseKey}.${ext}`, input.buffer, input.mimeType),
    uploadToR2(`${baseKey}_thumb.webp`, variants.thumb, 'image/webp'),
  ])

  const photo = await prisma.logisticsQuoteRequestPhoto.create({
    data: {
      quoteRequestId: lead.id,
      kind: input.kind,
      url: originalUrl,
      thumbUrl,
      position: lead._count.photos,
    },
    select: { id: true, kind: true, position: true },
  })

  await recomputeCertainty(lead.id)

  // Réponse volontairement sans URL.
  return photo
}

/** Recalcule le score après ajout de photo — les preuves visuelles comptent. */
export async function recomputeCertainty(id: string) {
  const lead = await prisma.logisticsQuoteRequest.findUnique({
    where: { id },
    select: {
      partName: true,
      partCategory: true,
      oemReference: true,
      vin: true,
      vehicleBrand: true,
      vehicleModel: true,
      energyType: true,
      photos: { select: { kind: true } },
    },
  })
  if (!lead) return

  const { score, level } = computeCertainty(
    certaintySignalsFor(
      {
        partName: lead.partName,
        partCategory: lead.partCategory ?? undefined,
        oemReference: lead.oemReference ?? undefined,
        vin: lead.vin ?? undefined,
        vehicleBrand: lead.vehicleBrand ?? undefined,
        vehicleModel: lead.vehicleModel ?? undefined,
        energyType: lead.energyType ?? undefined,
      },
      {
        hasPart: lead.photos.some((p) => p.kind === 'PART'),
        hasRegistration: lead.photos.some((p) => p.kind === 'REGISTRATION_CARD'),
      },
    ),
  )

  await prisma.logisticsQuoteRequest.update({
    where: { id },
    data: { certaintyScore: score, certaintyLevel: level },
  })
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

/** Projection sans donnée sensible : ni URL de photo, ni note interne, ni IP. */
const PUBLIC_SELECT = {
  id: true,
  reference: true,
  status: true,
  partName: true,
  partCategory: true,
  oemReference: true,
  quantity: true,
  vehicleBrand: true,
  vehicleModel: true,
  vehicleYear: true,
  vin: true,
  certaintyScore: true,
  certaintyLevel: true,
  downtimeCostPerDay: true,
  estimateJson: true,
  createdAt: true,
  photos: { select: { id: true, kind: true, position: true }, orderBy: { position: 'asc' } },
} satisfies Prisma.LogisticsQuoteRequestSelect

const OWNER_SELECT = {
  ...PUBLIC_SELECT,
  contactName: true,
  phone: true,
  whatsapp: true,
  email: true,
  commune: true,
  companyName: true,
  partPriceHint: true,
  vehicleImmobilized: true,
  vehicleId: true,
  enterpriseId: true,
  partRequestId: true,
  photos: {
    select: { id: true, kind: true, position: true, url: true, thumbUrl: true },
    orderBy: { position: 'asc' },
  },
  events: {
    select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.LogisticsQuoteRequestSelect

export async function getQuoteRequestByReference(reference: string, uploadToken: string) {
  const lead = await prisma.logisticsQuoteRequest.findUnique({
    where: { reference },
    select: { ...PUBLIC_SELECT, uploadTokenHash: true },
  })
  if (!lead?.uploadTokenHash || !safeEqualHex(hashToken(uploadToken), lead.uploadTokenHash)) {
    // Même erreur que « introuvable » : aucune énumération possible.
    throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Demande introuvable' })
  }
  const { uploadTokenHash: _drop, ...rest } = lead
  // L'expédition, quand la demande en a une : le client suit la même référence
  // du devis à la livraison. Projection publique — le transitaire n'y est pas nommé.
  const shipment = await getShipmentForQuoteRequest(lead.id)
  return { ...rest, shipment }
}

export async function listQuoteRequestsForUser(userId: string) {
  return prisma.logisticsQuoteRequest.findMany({
    where: { userId, status: { not: 'SPAM' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: OWNER_SELECT,
  })
}

export async function listQuoteRequestsForEnterprise(
  enterpriseId: string,
  userId: string,
  query: EnterpriseLogisticsListQuery,
) {
  await assertMember(enterpriseId, userId)

  const where: Prisma.LogisticsQuoteRequestWhereInput = {
    enterpriseId,
    status: { not: 'SPAM' },
    ...(query.status && { status: query.status }),
    ...(query.vehicleId && { vehicleId: query.vehicleId }),
  }

  const [items, total] = await Promise.all([
    prisma.logisticsQuoteRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: OWNER_SELECT,
    }),
    prisma.logisticsQuoteRequest.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function getQuoteRequestForEnterprise(
  enterpriseId: string,
  userId: string,
  id: string,
) {
  await assertMember(enterpriseId, userId)
  const lead = await prisma.logisticsQuoteRequest.findFirst({
    where: { id, enterpriseId },
    select: OWNER_SELECT,
  })
  if (!lead) {
    throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Cotation introuvable' })
  }
  return lead
}

// ---------------------------------------------------------------------------
// Back-office
// ---------------------------------------------------------------------------

const ADMIN_SELECT = {
  ...OWNER_SELECT,
  opsNote: true,
  assignedToUserId: true,
  lostReason: true,
  surface: true,
  campaign: true,
  contactedAt: true,
  quotedAt: true,
  closedAt: true,
  familyId: true,
  economyCategory: true,
  energyType: true,
  customerType: true,
  fleetSize: true,
  updatedAt: true,
} satisfies Prisma.LogisticsQuoteRequestSelect

export async function adminListQuoteRequests(query: AdminLogisticsListQuery) {
  const where: Prisma.LogisticsQuoteRequestWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.certaintyLevel && { certaintyLevel: query.certaintyLevel }),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from && { gte: new Date(query.from) }),
            ...(query.to && { lte: new Date(query.to) }),
          },
        }
      : {}),
    ...(query.q && {
      OR: [
        { reference: { contains: query.q, mode: 'insensitive' as const } },
        { partName: { contains: query.q, mode: 'insensitive' as const } },
        { contactName: { contains: query.q, mode: 'insensitive' as const } },
        { phone: { contains: query.q } },
        { vin: { contains: query.q, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.logisticsQuoteRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: ADMIN_SELECT,
    }),
    prisma.logisticsQuoteRequest.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function adminQuoteRequestStats() {
  const grouped = await prisma.logisticsQuoteRequest.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  const byCertainty = await prisma.logisticsQuoteRequest.groupBy({
    by: ['certaintyLevel'],
    where: { status: { not: 'SPAM' } },
    _count: { _all: true },
  })

  return {
    byStatus: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])),
    byCertainty: Object.fromEntries(byCertainty.map((g) => [g.certaintyLevel, g._count._all])),
    total: grouped.reduce((n, g) => n + g._count._all, 0),
  }
}

export async function adminGetQuoteRequest(id: string) {
  const lead = await prisma.logisticsQuoteRequest.findUnique({ where: { id }, select: ADMIN_SELECT })
  if (!lead) {
    throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Cotation introuvable' })
  }
  return lead
}

const STATUS_TIMESTAMP: Partial<Record<LogisticsLeadStatus, 'contactedAt' | 'quotedAt' | 'closedAt'>> =
  {
    CONTACTED: 'contactedAt',
    QUOTED: 'quotedAt',
    WON: 'closedAt',
    LOST: 'closedAt',
  }

export async function adminUpdateQuoteRequest(
  id: string,
  actorUserId: string,
  input: AdminUpdateLogisticsQuoteRequestInput,
) {
  const current = await prisma.logisticsQuoteRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!current) {
    throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Cotation introuvable' })
  }

  const stamp = input.status ? STATUS_TIMESTAMP[input.status] : undefined

  const updated = await prisma.logisticsQuoteRequest.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.opsNote !== undefined && { opsNote: input.opsNote }),
      ...(input.assignedToUserId !== undefined && { assignedToUserId: input.assignedToUserId }),
      ...(input.lostReason !== undefined && { lostReason: input.lostReason }),
      ...(stamp ? { [stamp]: new Date() } : {}),
    },
    select: ADMIN_SELECT,
  })

  if (input.status && input.status !== current.status) {
    await logEvent(id, input.status, current.status, actorUserId, input.opsNote)
  } else if (input.opsNote) {
    await logEvent(id, null, null, actorUserId, input.opsNote)
  }

  return updated
}
