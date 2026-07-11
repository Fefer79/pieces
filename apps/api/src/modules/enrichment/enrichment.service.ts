import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { uploadToR2 } from '../../lib/r2.js'
import { processVariants } from '../../lib/imageProcessor.js'
import { dHash } from '../../lib/perceptualHash.js'
import { isAnthropicConfigured } from '../../lib/anthropic.js'
import { recordActivity } from '../../lib/activityLog.js'
import { enqueue } from '../queue/queueService.js'
import sharp from 'sharp'
import { joinCategory, PART_CATEGORIES } from 'shared/constants'
import {
  enrichmentCompleteSchema,
  enrichmentModerateSchema,
  enrichmentArbitrateSchema,
  enrichmentListQuerySchema,
} from 'shared/validators'
import type { EnrichmentPass1Output, EnrichmentPass2Output } from 'shared/validators'
import {
  runIdentificationPass,
  runCompatibilityPass,
  generateFleetDescription,
} from './enrichment.agent.js'
import type { IdentificationPayload } from './enrichment.agent.js'
import type { PartEnrichment, Prisma } from '@prisma/client'

type Logger = { warn: (obj: Record<string, unknown>, msg: string) => void }

export interface EnrichmentActor {
  userId: string
  role: 'LIAISON' | 'SELLER' | 'ADMIN'
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MIN_PHOTOS = 2
const MAX_PHOTOS = 4
/** Limite de débit par compte vendeur (spec §8) : largement suffisant pour un
 * onboarding honnête, dissuasif pour un flood. */
const VENDOR_DAILY_LIMIT = 100
/** Resoumissions de la même pièce avant remontée automatique à la modération. */
const RESUBMISSION_FLAG_THRESHOLD = 5
/** Seuil de déclenchement de la passe 2 (spec §2). */
const PASS2_CONFIDENCE_THRESHOLD = 0.7
/** Score d'authenticité au-dessous duquel le badge exige une inspection (spec §6). */
const INSPECTION_SCORE_THRESHOLD = 4
/** Note minimale pour le badge « pièce garantie » (grille : 5 = sans badge). */
export const BADGE_MIN_SCORE = 6

function ensureAgentConfigured() {
  if (!isAnthropicConfigured()) {
    throw new AppError('ENRICHMENT_AGENT_UNAVAILABLE', 503, {
      message: 'Agent d\'identification indisponible. Réessayez plus tard ou créez la fiche manuellement.',
    })
  }
}

// ---------------------------------------------------------------------------
// Sérialisation cloisonnée par rôle (spec §8) : pour les rôles non admin, les
// champs sensibles (score brut, signaux, sourcing, tentatives…) sont ABSENTS
// de la réponse — pas mis à null. Un champ nul est un champ qui existe.
// ---------------------------------------------------------------------------

/** Statuts affichés hors admin : étapes de modération classiques d'une
 * marketplace, indistinguables d'un contrôle qualité de routine. */
function displayStatus(statut: PartEnrichment['statut'], role: EnrichmentActor['role']): string {
  if (role === 'ADMIN') return statut
  if (statut === 'VALIDE') return 'VALIDE'
  if (statut === 'BROUILLON') return 'BROUILLON'
  // La liaison voit les inspections à programmer (elle les exécute) — jamais le motif.
  if (statut === 'A_VERIFIER' && role === 'LIAISON') return 'INSPECTION_PROGRAMMEE'
  return 'EN_VERIFICATION'
}

function serializeBase(e: PartEnrichment, role: EnrichmentActor['role']) {
  return {
    id: e.id,
    partId: e.partId,
    origine: e.origine,
    statut: displayStatus(e.statut, role),
    photoFeedback: e.photoFeedback,
    identification: e.identification,
    classification: e.classification,
    fitments: e.fitments,
    confianceGlobale: e.confianceGlobale,
    photos: e.photos,
    photosVariants: e.photosVariants,
    prix: e.prix,
    stockQuantite: e.stockQuantite,
    warrantyValue: e.warrantyValue,
    warrantyUnit: e.warrantyUnit,
    fournisseurVisite: e.fournisseurVisite,
    vendeurId: e.vendeurId,
    liaisonId: e.liaisonId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

export function serializeEnrichment(e: PartEnrichment, role: EnrichmentActor['role']) {
  const base = serializeBase(e, role)
  if (role !== 'ADMIN') return base
  return {
    ...base,
    statutBrut: e.statut,
    authenticite: e.authenticite,
    sourcing: e.sourcing,
    sourcingBatchId: e.sourcingBatchId,
    noteQualite: e.noteQualite,
    descriptionIndependante: e.descriptionIndependante,
    livrablesApprouvesAt: e.livrablesApprouvesAt,
    corrections: e.corrections,
    tentatives: e.tentatives,
    contentValidatedAt: e.contentValidatedAt,
    validatedAt: e.validatedAt,
  }
}

// ---------------------------------------------------------------------------
// Création (passe 1)
// ---------------------------------------------------------------------------

export interface EnrichmentPhotoInput {
  buffer: Buffer
  mimeType: string
  fileName: string
}

async function resolveVendorForActor(actor: EnrichmentActor, vendeurId?: string) {
  if (actor.role === 'SELLER') {
    const vendor = await prisma.vendor.findUnique({ where: { userId: actor.userId } })
    if (!vendor) {
      throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Aucune boutique associée à ce compte' })
    }
    return vendor.id
  }
  return vendeurId ?? null
}

async function enforceVendorRateLimit(vendorId: string) {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  const count = await prisma.partEnrichment.count({
    where: { vendeurId: vendorId, origine: 'VENDEUR', createdAt: { gte: since } },
  })
  if (count >= VENDOR_DAILY_LIMIT) {
    throw new AppError('ENRICHMENT_RATE_LIMITED', 429, {
      message: `Limite de ${VENDOR_DAILY_LIMIT} fiches par jour atteinte. Réessayez demain.`,
    })
  }
}

/** Redimensionne pour l'agent : 2000 px max, JPEG (limite API + économie data). */
async function prepareForAgent(buffer: Buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
}

export async function createEnrichment(
  actor: EnrichmentActor,
  photos: EnrichmentPhotoInput[],
  opts: { vendeurId?: string; fournisseurVisite?: string },
  logger?: Logger,
) {
  ensureAgentConfigured()

  if (photos.length < MIN_PHOTOS || photos.length > MAX_PHOTOS) {
    throw new AppError('ENRICHMENT_PHOTO_COUNT', 422, {
      message: `Entre ${MIN_PHOTOS} et ${MAX_PHOTOS} photos requises (étiquette, pièce nue, emballage)`,
    })
  }
  for (const photo of photos) {
    if (photo.buffer.length > MAX_IMAGE_BYTES) {
      throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
    }
    if (!ALLOWED_IMAGE_MIME.includes(photo.mimeType)) {
      throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
    }
  }

  const vendeurId = await resolveVendorForActor(actor, opts.vendeurId)
  if (actor.role === 'SELLER' && vendeurId) {
    await enforceVendorRateLimit(vendeurId)
  }

  // Hash perceptuel + uploads R2 (originaux EXIF conservés + variantes WebP).
  const hashes: string[] = []
  const photoUrls: string[] = []
  const photosVariants: Array<Record<string, string>> = []
  const timestamp = Date.now()
  for (const [i, photo] of photos.entries()) {
    hashes.push(await dHash(photo.buffer))
    const safeName = photo.fileName.replace(/[^a-zA-Z0-9._-]/g, '')
    const ext = photo.mimeType.split('/')[1] ?? 'jpg'
    const baseKey = `enrichment/${actor.userId}/${timestamp}_${i}_${safeName}`
    const variants = await processVariants(photo.buffer)
    const [urlOriginal, urlThumb, urlSmall, urlMedium, urlLarge] = await Promise.all([
      uploadToR2(`${baseKey}.${ext}`, photo.buffer, photo.mimeType),
      uploadToR2(`${baseKey}_thumb.webp`, variants.thumb, 'image/webp'),
      uploadToR2(`${baseKey}_small.webp`, variants.small, 'image/webp'),
      uploadToR2(`${baseKey}_medium.webp`, variants.medium, 'image/webp'),
      uploadToR2(`${baseKey}_large.webp`, variants.large, 'image/webp'),
    ])
    photoUrls.push(urlOriginal)
    photosVariants.push({ urlOriginal, urlThumb, urlSmall, urlMedium, urlLarge })
  }

  // Garde-fous anti-manipulation (spec §8) : toutes les soumissions sont
  // journalisées, y compris les brouillons ; la réutilisation de photos et les
  // resoumissions répétées remontent automatiquement à la modération.
  const priorSameActor = await prisma.partEnrichment.count({
    where: {
      photoHashes: { hasSome: hashes },
      ...(actor.role === 'SELLER' ? { vendeurId } : { liaisonId: actor.userId }),
    },
  })
  const tentatives = priorSameActor + 1

  const reusedFromOther = await prisma.partEnrichment.findFirst({
    where: {
      photoHashes: { hasSome: hashes },
      ...(actor.role === 'SELLER'
        ? { OR: [{ vendeurId: { not: vendeurId } }, { vendeurId: null }] }
        : { liaisonId: { not: actor.userId } }),
    },
    select: { id: true },
  })

  let fraudFlag: 'ENRICHMENT_PHOTO_REUSE' | 'ENRICHMENT_RESUBMISSION' | null = null
  if (reusedFromOther) fraudFlag = 'ENRICHMENT_PHOTO_REUSE'
  else if (tentatives >= RESUBMISSION_FLAG_THRESHOLD) fraudFlag = 'ENRICHMENT_RESUBMISSION'

  // Passe 1 — vision seule, synchrone.
  const agentImages = await Promise.all(
    photos.map(async (p) => ({
      data: (await prepareForAgent(p.buffer)).toString('base64'),
      mediaType: 'image/jpeg' as const,
    })),
  )
  const pass1 = await runIdentificationPass(agentImages, logger)
  if (!pass1) {
    throw new AppError('ENRICHMENT_AGENT_UNAVAILABLE', 503, {
      message: 'Analyse indisponible pour le moment. Réessayez ou créez la fiche manuellement.',
    })
  }

  const classification = sanitizeClassification(pass1)

  // Statut initial : brouillon côté Liaison (validation sur place) ; file de
  // modération côté vendeur. Photos insuffisantes = brouillon à reprendre.
  let statut: PartEnrichment['statut'] = 'BROUILLON'
  if (pass1.statut === 'ok' && actor.role === 'SELLER') statut = 'EN_MODERATION'
  if (fraudFlag && pass1.statut === 'ok') statut = 'EN_MODERATION'

  const created = await prisma.partEnrichment.create({
    data: {
      origine: actor.role === 'SELLER' ? 'VENDEUR' : 'LIAISON',
      statut,
      identification: (pass1.identification ?? undefined) as Prisma.InputJsonValue | undefined,
      classification: (classification ?? undefined) as Prisma.InputJsonValue | undefined,
      photoFeedback: pass1.photo_feedback,
      authenticite: (pass1.authenticite ?? undefined) as Prisma.InputJsonValue | undefined,
      confianceGlobale: pass1.confiance_globale,
      photos: photoUrls,
      photoHashes: hashes,
      photosVariants: photosVariants as Prisma.InputJsonValue,
      liaisonId: actor.role === 'SELLER' ? null : actor.userId,
      vendeurId,
      fournisseurVisite: opts.fournisseurVisite ?? null,
      tentatives,
    },
  })

  if (fraudFlag) {
    await recordActivity({
      actorId: actor.userId,
      actorRole: actor.role,
      action: fraudFlag,
      targetType: 'PartEnrichment',
      targetId: created.id,
      payload: { tentatives, reusedFrom: reusedFromOther?.id ?? null },
    })
  }

  // Passe 2 — déclenchée dès qu'une référence exploitable a une confiance ≥ 70 %.
  if (pass1.statut === 'ok' && hasSearchableReference(pass1)) {
    await enqueue('ENRICHMENT_FITMENTS', { enrichmentId: created.id })
  }

  return serializeEnrichment(created, actor.role)
}

function sanitizeClassification(pass1: EnrichmentPass1Output) {
  if (!pass1.classification) return null
  const { categorie, sous_categorie, confiance } = pass1.classification
  const known = (PART_CATEGORIES as readonly string[]).find(
    (c) => c.toLowerCase() === categorie.toLowerCase(),
  )
  // Catégorie hors taxonomie = a_classer (l'agent ne doit jamais en inventer,
  // ceci est le filet de sécurité côté serveur).
  if (!known && categorie !== 'a_classer') {
    return { categorie: 'a_classer', sous_categorie: null, confiance: 0, propose: categorie }
  }
  return { categorie: known ?? 'a_classer', sous_categorie, confiance }
}

function hasSearchableReference(pass1: EnrichmentPass1Output): boolean {
  const id = pass1.identification
  if (!id) return false
  const bestOem = id.references_oem.some((r) => r.confiance >= PASS2_CONFIDENCE_THRESHOLD)
  const fabricant =
    id.reference_fabricant.valeur != null &&
    id.reference_fabricant.confiance >= PASS2_CONFIDENCE_THRESHOLD
  return bestOem || fabricant
}

function identificationPayloadOf(e: PartEnrichment): IdentificationPayload | null {
  const id = e.identification as EnrichmentPass1Output['identification'] | null
  if (!id) return null
  return {
    marque_fabricant: id.marque_fabricant?.valeur ?? null,
    reference_fabricant: id.reference_fabricant?.valeur ?? null,
    references_oem: (id.references_oem ?? []).map((r) => ({
      constructeur: r.constructeur,
      reference: r.reference,
    })),
  }
}

// ---------------------------------------------------------------------------
// Passe 2 (handler de job)
// ---------------------------------------------------------------------------

export async function runFitmentsForEnrichment(enrichmentId: string, logger?: Logger) {
  const enrichment = await prisma.partEnrichment.findUnique({ where: { id: enrichmentId } })
  if (!enrichment) return
  const payload = identificationPayloadOf(enrichment)
  if (!payload) return

  const result = await runCompatibilityPass(payload, logger)
  if (!result) {
    throw new AppError('ENRICHMENT_PASS2_UNAVAILABLE', 503, { message: 'Passe 2 indisponible (sera retentée)' })
  }

  await prisma.partEnrichment.update({
    where: { id: enrichmentId },
    data: { fitments: result.fitments as unknown as Prisma.InputJsonValue },
  })
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

async function findAccessible(actor: EnrichmentActor, id: string) {
  const e = await prisma.partEnrichment.findUnique({ where: { id } })
  if (!e) throw new AppError('ENRICHMENT_NOT_FOUND', 404, { message: 'Fiche introuvable' })

  if (actor.role === 'ADMIN') return e
  if (actor.role === 'LIAISON') {
    const isOwn = e.liaisonId === actor.userId
    const inModerationQueue = e.origine === 'VENDEUR' && e.statut === 'EN_MODERATION'
    const isInspectionTask = e.statut === 'A_VERIFIER'
    if (isOwn || inModerationQueue || isInspectionTask) return e
  }
  if (actor.role === 'SELLER') {
    const vendor = await prisma.vendor.findUnique({ where: { userId: actor.userId } })
    if (vendor && e.vendeurId === vendor.id && e.origine === 'VENDEUR') return e
  }
  throw new AppError('ENRICHMENT_FORBIDDEN', 403, { message: 'Accès refusé à cette fiche' })
}

export async function getEnrichment(actor: EnrichmentActor, id: string) {
  const e = await findAccessible(actor, id)
  return serializeEnrichment(e, actor.role)
}

export async function listEnrichments(actor: EnrichmentActor, query: unknown) {
  const parsed = enrichmentListQuerySchema.safeParse(query ?? {})
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 400, { message: 'Paramètres invalides', details: parsed.error.issues })
  }
  const { statut, file, page, pageSize } = parsed.data

  let where: Prisma.PartEnrichmentWhereInput
  if (actor.role === 'ADMIN') {
    where = statut ? { statut } : {}
  } else if (actor.role === 'LIAISON') {
    if (file === 'moderation') {
      where = { origine: 'VENDEUR', statut: 'EN_MODERATION' }
    } else if (file === 'inspections') {
      // Tâches d'inspection (« inspection à programmer chez X ») — le motif
      // n'est jamais exposé : contrôle qualité de routine côté Liaison.
      where = { statut: 'A_VERIFIER' }
    } else {
      where = { liaisonId: actor.userId }
    }
  } else {
    const vendor = await prisma.vendor.findUnique({ where: { userId: actor.userId } })
    if (!vendor) return { items: [], total: 0, page, pageSize }
    where = { vendeurId: vendor.id, origine: 'VENDEUR' }
  }

  const [items, total] = await Promise.all([
    prisma.partEnrichment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.partEnrichment.count({ where }),
  ])

  return {
    items: items.map((e) => serializeEnrichment(e, actor.role)),
    total,
    page,
    pageSize,
  }
}

// ---------------------------------------------------------------------------
// Complétion humaine (prix / stock / corrections)
// ---------------------------------------------------------------------------

export async function completeEnrichment(actor: EnrichmentActor, id: string, body: unknown) {
  const parsed = enrichmentCompleteSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 400, { message: 'Données invalides', details: parsed.error.issues })
  }
  const input = parsed.data
  const e = await findAccessible(actor, id)

  if (actor.role !== 'ADMIN' && (e.statut === 'VALIDE' || e.statut === 'BLOQUE')) {
    throw new AppError('ENRICHMENT_LOCKED', 422, { message: 'Cette fiche ne peut plus être modifiée' })
  }

  // Journal des corrections humaines : futur jeu de données pour mesurer la
  // précision de l'agent (spec §7).
  let corrections = e.corrections as Prisma.JsonValue
  if (input.corrections) {
    const history = Array.isArray((corrections as { entries?: unknown[] } | null)?.entries)
      ? ((corrections as { entries: unknown[] }).entries)
      : []
    corrections = {
      entries: [
        ...history,
        { par: actor.userId, role: actor.role, le: new Date().toISOString(), valeurs: input.corrections },
      ],
    } as unknown as Prisma.JsonValue
  }

  const updated = await prisma.partEnrichment.update({
    where: { id },
    data: {
      prix: input.prix ?? e.prix,
      stockQuantite: input.stockQuantite ?? e.stockQuantite,
      warrantyValue: input.warrantyValue ?? e.warrantyValue,
      warrantyUnit: input.warrantyUnit ?? e.warrantyUnit,
      fournisseurVisite: input.fournisseurVisite ?? e.fournisseurVisite,
      vendeurId: actor.role !== 'SELLER' ? (input.vendeurId ?? e.vendeurId) : e.vendeurId,
      corrections: corrections as Prisma.InputJsonValue,
    },
  })
  return serializeEnrichment(updated, actor.role)
}

// ---------------------------------------------------------------------------
// Validation de contenu (Liaison) — spec §7
// ---------------------------------------------------------------------------

export async function moderateEnrichment(actor: EnrichmentActor, id: string, body: unknown) {
  if (actor.role === 'SELLER') {
    throw new AppError('ENRICHMENT_FORBIDDEN', 403, { message: 'Accès refusé' })
  }
  const parsed = enrichmentModerateSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 400, { message: 'Données invalides', details: parsed.error.issues })
  }
  const e = await findAccessible(actor, id)

  if (parsed.data.action === 'DEMANDER_PHOTOS') {
    const updated = await prisma.partEnrichment.update({
      where: { id },
      data: {
        statut: 'BROUILLON',
        photoFeedback:
          parsed.data.commentaire ?? 'Photos complémentaires demandées par la modération',
        liaisonId: e.liaisonId ?? actor.userId,
      },
    })
    return serializeEnrichment(updated, actor.role)
  }

  // VALIDER_CONTENU : identification, classification, fitments, prix, stock
  // relus. La fiche part en arbitrage administrateur.
  if (e.statut !== 'BROUILLON' && e.statut !== 'EN_MODERATION') {
    throw new AppError('ENRICHMENT_INVALID_STATE', 422, { message: 'Fiche non modérable dans cet état' })
  }
  const updated = await prisma.partEnrichment.update({
    where: { id },
    data: {
      statut: 'EN_MODERATION',
      contentValidatedAt: new Date(),
      liaisonId: e.liaisonId ?? actor.userId, // modérateur des fiches vendeur
      photoFeedback: null,
    },
  })
  return serializeEnrichment(updated, actor.role)
}

// ---------------------------------------------------------------------------
// Arbitrage administrateur — spec §6/§7
// ---------------------------------------------------------------------------

function authenticityScoreOf(e: PartEnrichment): number | null {
  const auth = e.authenticite as { score?: unknown } | null
  return typeof auth?.score === 'number' ? auth.score : null
}

/** Génère (sans publier) les livrables flotte : note qualité proposée +
 * description indépendante rédigée par l'agent. L'admin relit, corrige,
 * approuve — rien ne sort sans son feu vert. */
export async function generateDeliverables(adminId: string, id: string, logger?: Logger) {
  ensureAgentConfigured()
  const e = await prisma.partEnrichment.findUnique({ where: { id } })
  if (!e) throw new AppError('ENRICHMENT_NOT_FOUND', 404, { message: 'Fiche introuvable' })

  const description = await generateFleetDescription(
    {
      identification: e.identification,
      classification: e.classification,
      fitments: e.fitments,
      warrantyValue: e.warrantyValue,
      warrantyUnit: e.warrantyUnit,
    },
    logger,
  )
  if (!description) {
    throw new AppError('ENRICHMENT_AGENT_UNAVAILABLE', 503, { message: 'Génération indisponible, réessayez' })
  }

  const updated = await prisma.partEnrichment.update({
    where: { id },
    data: {
      descriptionIndependante: description,
      noteQualite: e.noteQualite ?? authenticityScoreOf(e),
    },
  })
  void adminId
  return serializeEnrichment(updated, 'ADMIN')
}

export async function arbitrateEnrichment(adminId: string, id: string, body: unknown) {
  const parsed = enrichmentArbitrateSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 400, { message: 'Données invalides', details: parsed.error.issues })
  }
  const input = parsed.data
  const e = await prisma.partEnrichment.findUnique({ where: { id } })
  if (!e) throw new AppError('ENRICHMENT_NOT_FOUND', 404, { message: 'Fiche introuvable' })

  if (input.decision === 'INSPECTION') {
    // Tâche générée pour le Liaison sans en exposer le motif (spec §7).
    const updated = await prisma.partEnrichment.update({
      where: { id },
      data: { statut: 'A_VERIFIER' },
    })
    await recordActivity({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'ENRICHMENT_INSPECTION_REQUESTED',
      targetType: 'PartEnrichment',
      targetId: id,
      payload: { commentaire: input.commentaire ?? null },
    })
    return serializeEnrichment(updated, 'ADMIN')
  }

  if (input.decision === 'BLOQUER') {
    const updated = await prisma.partEnrichment.update({
      where: { id },
      data: { statut: 'BLOQUE' },
    })
    await recordActivity({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'ENRICHMENT_BLOCKED',
      targetType: 'PartEnrichment',
      targetId: id,
      payload: { commentaire: input.commentaire ?? null },
    })
    return serializeEnrichment(updated, 'ADMIN')
  }

  // APPROUVER
  if (!e.contentValidatedAt) {
    throw new AppError('ENRICHMENT_CONTENT_NOT_VALIDATED', 422, {
      message: 'La validation de contenu (Liaison) doit précéder l\'arbitrage',
    })
  }
  const score = authenticityScoreOf(e)
  // Ligne de défense anti-contrefaçon : un score ≤ 4 impose une inspection
  // physique avant tout badge (spec §6). L'approbation depuis A_VERIFIER vaut
  // arbitrage post-inspection.
  if (score != null && score <= INSPECTION_SCORE_THRESHOLD && e.statut !== 'A_VERIFIER') {
    throw new AppError('ENRICHMENT_INSPECTION_REQUIRED', 422, {
      message: 'Inspection physique requise avant validation de cette fiche',
    })
  }

  const noteQualite = input.noteQualite ?? e.noteQualite ?? score
  const description = input.descriptionIndependante ?? e.descriptionIndependante

  const partId = await publishToCatalog(e)

  const updated = await prisma.partEnrichment.update({
    where: { id },
    data: {
      statut: 'VALIDE',
      validatedAt: new Date(),
      noteQualite,
      descriptionIndependante: description,
      livrablesApprouvesAt: input.publierLivrables && description ? new Date() : e.livrablesApprouvesAt,
      partId: partId ?? e.partId,
    },
  })
  await recordActivity({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'ENRICHMENT_APPROVED',
    targetType: 'PartEnrichment',
    targetId: id,
    payload: { noteQualite, badge: noteQualite != null && noteQualite >= BADGE_MIN_SCORE, partId },
  })
  return serializeEnrichment(updated, 'ADMIN')
}

// ---------------------------------------------------------------------------
// Publication catalogue
// ---------------------------------------------------------------------------

type CorrectionValues = {
  marqueFabricant?: string
  referenceFabricant?: string
  referenceOem?: string
  categorie?: string
  sousCategorie?: string
  nom?: string
  fitments?: Array<{
    marque: string
    modele?: string | null
    annees?: string | null
    motorisation?: string | null
    confirme?: boolean
  }>
}

/** Dernière valeur corrigée pour chaque champ (le journal est append-only). */
function latestCorrections(e: PartEnrichment): CorrectionValues {
  const entries = (e.corrections as { entries?: Array<{ valeurs?: CorrectionValues }> } | null)?.entries
  if (!Array.isArray(entries)) return {}
  return entries.reduce<CorrectionValues>((acc, entry) => ({ ...acc, ...(entry.valeurs ?? {}) }), {})
}

function parseYearRange(annees?: string | null): { yearFrom: number | null; yearTo: number | null } {
  if (!annees) return { yearFrom: null, yearTo: null }
  const match = annees.match(/(\d{4})\s*[-–]\s*(\d{4})?/)
  if (!match) {
    const single = annees.match(/\d{4}/)
    const y = single ? parseInt(single[0], 10) : null
    return { yearFrom: y, yearTo: null }
  }
  return {
    yearFrom: parseInt(match[1] ?? '', 10) || null,
    yearTo: match[2] ? parseInt(match[2], 10) || null : null,
  }
}

/** Crée le CatalogItem publié depuis la fiche validée. Renvoie null (sans
 * bloquer l'arbitrage) si la fiche n'a pas encore de vendeur ou de prix. */
async function publishToCatalog(e: PartEnrichment): Promise<string | null> {
  if (e.partId) return e.partId
  if (!e.vendeurId || e.prix == null) return null

  const corrections = latestCorrections(e)
  const identification = e.identification as EnrichmentPass1Output['identification'] | null
  const classification = e.classification as {
    categorie?: string
    sous_categorie?: string | null
  } | null

  const categorie = corrections.categorie ?? classification?.categorie ?? null
  const sousCategorie = corrections.sousCategorie ?? classification?.sous_categorie ?? null
  const marque = corrections.marqueFabricant ?? identification?.marque_fabricant?.valeur ?? null
  const reference = corrections.referenceFabricant ?? identification?.reference_fabricant?.valeur ?? null
  const oemReference =
    corrections.referenceOem ?? identification?.references_oem?.[0]?.reference ?? null

  const name =
    corrections.nom ??
    [sousCategorie ?? categorie, marque, reference].filter(Boolean).join(' ').slice(0, 120)

  // Fitments retenus : corrections humaines confirmées en priorité, sinon les
  // fitments agent à confiance ≥ 0.7 (un fitment à 0.6 reste « à confirmer »,
  // jamais publié tel quel — spec §7).
  const agentFitments = (e.fitments as EnrichmentPass2Output['fitments'] | null) ?? []
  const fitmentRows = (
    corrections.fitments
      ? corrections.fitments.filter((f) => f.confirme !== false)
      : agentFitments.filter((f) => f.confiance >= PASS2_CONFIDENCE_THRESHOLD)
  ).map((f) => {
    const { yearFrom, yearTo } = parseYearRange(f.annees)
    return {
      brand: f.marque,
      model: ('modele' in f ? f.modele : null) ?? null,
      yearFrom,
      yearTo,
      engine: f.motorisation ?? null,
    }
  })

  const variants = (e.photosVariants as Array<Record<string, string | null>> | null) ?? []
  const first = variants[0]

  const item = await prisma.catalogItem.create({
    data: {
      vendorId: e.vendeurId,
      createdByLiaisonId: e.liaisonId,
      name: name || null,
      category: joinCategory(categorie, sousCategorie) || null,
      subcategory: sousCategorie,
      oemReference,
      price: e.prix,
      status: 'PUBLISHED',
      aiGenerated: true,
      aiConfidence: e.confianceGlobale,
      stockQuantity: e.stockQuantite,
      inStock: e.stockQuantite != null ? e.stockQuantite > 0 : true,
      warrantyValue: e.warrantyValue,
      warrantyUnit: (e.warrantyUnit as 'DAY' | 'WEEK' | 'MONTH' | null) ?? null,
      imageOriginalUrl: first?.urlOriginal ?? e.photos[0] ?? null,
      imageThumbUrl: first?.urlThumb ?? null,
      imageSmallUrl: first?.urlSmall ?? null,
      imageMediumUrl: first?.urlMedium ?? null,
      imageLargeUrl: first?.urlLarge ?? null,
      photos: {
        create: variants.map((v, position) => ({
          position,
          urlOriginal: v.urlOriginal ?? '',
          urlThumb: v.urlThumb,
          urlSmall: v.urlSmall,
          urlMedium: v.urlMedium,
          urlLarge: v.urlLarge,
        })),
      },
      fitments: { create: fitmentRows },
    },
  })
  return item.id
}

// ---------------------------------------------------------------------------
// Livrables flotte (lecture acheteur) — spec §7/§8
// ---------------------------------------------------------------------------

/** Note qualité + description indépendante d'une pièce publiée. Visible des
 * acheteurs flotte uniquement après approbation admin ; jamais les signaux ni
 * le raisonnement — une conclusion, pas une méthode. */
export async function getQualitySheetForPart(partId: string) {
  const e = await prisma.partEnrichment.findFirst({
    where: { partId, statut: 'VALIDE', livrablesApprouvesAt: { not: null } },
    select: { noteQualite: true, descriptionIndependante: true, validatedAt: true },
  })
  if (!e) {
    throw new AppError('QUALITY_SHEET_NOT_FOUND', 404, {
      message: 'Aucune évaluation qualité publiée pour cette pièce',
    })
  }
  return {
    noteQualite: e.noteQualite,
    description: e.descriptionIndependante,
    evalueeLe: e.validatedAt,
  }
}
