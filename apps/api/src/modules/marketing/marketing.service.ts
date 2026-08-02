import type { Prisma } from '@prisma/client'
import {
  createCampaignSchema,
  marketingCampaignsQuerySchema,
  previewAudienceQuerySchema,
  crmClientSegmentSchema,
  crmVendorSegmentSchema,
} from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import {
  resolveClientSegmentIds,
  resolveVendorSegmentIds,
  countClientSegments,
} from '../../lib/crmSegments.js'
import { enqueue } from '../queue/queueService.js'

const DAY_MS = 24 * 60 * 60 * 1000

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

// ---------------------------------------------------------------------------
// Résolution d'audience — partagée entre l'aperçu, le lancement et le handler
// d'envoi (queue/handlers/marketingCampaignSend.ts).
// Mêmes règles que la relance CRM manuelle (sendCrmRelance) : l'opt-out se lit
// sur NotificationPreference.whatsapp ; pour un vendeur, sur le compte
// utilisateur lié (userId) s'il existe.
// ---------------------------------------------------------------------------

export interface AudienceRecipient {
  subject: 'USER' | 'VENDOR'
  subjectId: string
  nom: string | null
  phone: string | null
  optedOut: boolean
}

async function resolveUsers(userIds: string[]): Promise<AudienceRecipient[]> {
  if (userIds.length === 0) return []
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      phone: true,
      notificationPreference: { select: { whatsapp: true } },
    },
  })
  return users.map((u) => ({
    subject: 'USER' as const,
    subjectId: u.id,
    nom: u.name,
    phone: u.phone,
    optedOut: u.notificationPreference?.whatsapp === false,
  }))
}

async function resolveVendors(vendorIds: string[]): Promise<AudienceRecipient[]> {
  if (vendorIds.length === 0) return []
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: {
      id: true,
      shopName: true,
      phone: true,
      userId: true,
      user: { select: { notificationPreference: { select: { whatsapp: true } } } },
    },
  })
  return vendors.map((v) => ({
    subject: 'VENDOR' as const,
    subjectId: v.id,
    nom: v.shopName,
    phone: v.phone,
    // L'opt-out se vérifie sur le compte utilisateur lié, s'il existe.
    optedOut: v.userId ? v.user?.notificationPreference?.whatsapp === false : false,
  }))
}

/**
 * Résout une audience en destinataires concrets. Une clé de segment inconnue
 * donne une liste vide (pas d'erreur) — l'aperçu affiche 0 et le lancement
 * refuse avec MARKETING_EMPTY_AUDIENCE.
 */
export async function resolveAudienceRecipients(
  audienceType: string,
  audienceValue: string,
): Promise<AudienceRecipient[]> {
  if (audienceType === 'SEGMENT_CLIENT') {
    const parsed = crmClientSegmentSchema.safeParse(audienceValue)
    if (!parsed.success) return []
    const ids = await resolveClientSegmentIds(parsed.data)
    return resolveUsers(ids)
  }

  if (audienceType === 'SEGMENT_VENDEUR') {
    const parsed = crmVendorSegmentSchema.safeParse(audienceValue)
    if (!parsed.success) return []
    const ids = await resolveVendorSegmentIds(parsed.data)
    return resolveVendors(ids)
  }

  if (audienceType === 'TAG') {
    const assignments = await prisma.crmTagAssignment.findMany({
      where: { tagId: audienceValue },
    })
    const userIds = assignments.filter((a) => a.subject === 'USER').map((a) => a.subjectId)
    const vendorIds = assignments.filter((a) => a.subject === 'VENDOR').map((a) => a.subjectId)
    const [users, vendors] = await Promise.all([resolveUsers(userIds), resolveVendors(vendorIds)])
    return [...users, ...vendors]
  }

  return []
}

// ---------------------------------------------------------------------------
// Cockpit
// ---------------------------------------------------------------------------

export async function getMarketingOverview() {
  const since30j = new Date(Date.now() - 30 * DAY_MS)
  const [total, groupes, envoyes30j] = await Promise.all([
    prisma.marketingCampaign.count(),
    prisma.marketingCampaign.groupBy({ by: ['statut'], _count: { _all: true } }),
    prisma.marketingCampaign.aggregate({
      where: { statut: 'TERMINEE', completedAt: { gte: since30j } },
      _sum: { envoyes: true },
    }),
  ])

  const parStatut: Record<string, number> = {
    BROUILLON: 0,
    PLANIFIEE: 0,
    EN_COURS: 0,
    TERMINEE: 0,
    ANNULEE: 0,
  }
  for (const g of groupes) parStatut[g.statut] = g._count._all

  return { total, parStatut, envoyes30j: envoyes30j._sum.envoyes ?? 0 }
}

// ---------------------------------------------------------------------------
// Audiences disponibles (alimente le formulaire de campagne)
// ---------------------------------------------------------------------------

const CLIENT_SEGMENT_LABELS: Record<string, string> = {
  nouveau: 'Nouveaux',
  actif: 'Actifs',
  fidele: 'Fidèles',
  a_risque: 'À risque',
  inactif: 'Inactifs',
}

const VENDOR_SEGMENT_LABELS: Record<string, string> = {
  actif: 'Actifs',
  sans_commande_30j: 'Sans commande depuis 30 j',
  fiche_incomplete: 'Fiche incomplète',
  litiges_ouverts: 'Litiges ouverts',
}

export async function listAudiences() {
  const [clientCounts, tags] = await Promise.all([
    countClientSegments(),
    prisma.crmTag.findMany({
      orderBy: { nom: 'asc' },
      include: { _count: { select: { assignments: true } } },
    }),
  ])

  const segmentsClients = Object.entries(CLIENT_SEGMENT_LABELS).map(([key, label]) => ({
    key,
    label,
    count: clientCounts[key] ?? 0,
  }))

  const segmentsVendeurs = await Promise.all(
    Object.entries(VENDOR_SEGMENT_LABELS).map(async ([key, label]) => ({
      key,
      label,
      count: (await resolveVendorSegmentIds(key)).length,
    })),
  )

  return {
    segmentsClients,
    segmentsVendeurs,
    tags: tags.map((t) => ({
      id: t.id,
      nom: t.nom,
      couleur: t.couleur,
      count: t._count.assignments,
    })),
  }
}

// ---------------------------------------------------------------------------
// Aperçu d'audience
// ---------------------------------------------------------------------------

export async function previewAudience(rawQuery: unknown) {
  const parsed = previewAudienceQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    throw new AppError('MARKETING_INVALID_QUERY', 400, {
      message: parsed.error.issues[0]?.message ?? 'Paramètres invalides',
    })
  }

  const recipients = await resolveAudienceRecipients(
    parsed.data.audienceType,
    parsed.data.audienceValue,
  )
  return {
    total: recipients.length,
    optouts: recipients.filter((r) => r.optedOut).length,
    sansTelephone: recipients.filter((r) => !r.phone).length,
    echantillon: recipients.slice(0, 10).map((r) => ({ nom: r.nom, telephone: r.phone })),
  }
}

// ---------------------------------------------------------------------------
// Campagnes
// ---------------------------------------------------------------------------

const CREATED_BY_SELECT = { createdBy: { select: { name: true } } } as const

export async function listCampaigns(rawQuery: unknown) {
  const query = marketingCampaignsQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.MarketingCampaignWhereInput = {}
  if (query.statut) where.statut = query.statut

  const [campaigns, total] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: CREATED_BY_SELECT,
    }),
    prisma.marketingCampaign.count({ where }),
  ])

  return { campaigns, total, page, limit }
}

export async function createCampaign(body: unknown, adminId: string) {
  const parsed = createCampaignSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const { nom, message, audienceType, audienceValue, scheduledAt } = parsed.data

  const scheduled = scheduledAt ? new Date(scheduledAt) : null
  // Une date d'envoi dans le futur planifie la campagne ; passée ou absente,
  // elle reste un brouillon à lancer manuellement.
  const statut = scheduled && scheduled.getTime() > Date.now() ? 'PLANIFIEE' : 'BROUILLON'

  return prisma.marketingCampaign.create({
    data: {
      nom,
      message,
      audienceType,
      audienceValue,
      statut,
      scheduledAt: scheduled,
      createdById: adminId,
    },
    include: CREATED_BY_SELECT,
  })
}

export async function getCampaign(id: string) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id },
    include: CREATED_BY_SELECT,
  })
  if (!campaign) {
    throw new AppError('CAMPAIGN_NOT_FOUND', 404, { message: 'Campagne introuvable' })
  }
  return campaign
}

/**
 * Lancement : résout l'audience (refus si vide), fige totalCibles et enfile le
 * job d'envoi. Date d'envoi dans le futur → statut PLANIFIEE + job planifié ;
 * sinon EN_COURS immédiat. maxAttempts 1 : jamais de relance automatique, donc
 * jamais de doublon d'envoi en cas d'échec global.
 */
export async function launchCampaign(id: string, now = new Date()) {
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id } })
  if (!campaign) {
    throw new AppError('CAMPAIGN_NOT_FOUND', 404, { message: 'Campagne introuvable' })
  }
  if (campaign.statut !== 'BROUILLON' && campaign.statut !== 'PLANIFIEE') {
    throw new AppError('CAMPAIGN_INVALID_STATUS', 409, {
      message: 'Seules les campagnes brouillon ou planifiées peuvent être lancées',
    })
  }

  const recipients = await resolveAudienceRecipients(campaign.audienceType, campaign.audienceValue)
  if (recipients.length === 0) {
    throw new AppError('MARKETING_EMPTY_AUDIENCE', 422, {
      message: "L'audience ne contient aucun destinataire",
    })
  }

  const planifiee = campaign.scheduledAt !== null && campaign.scheduledAt.getTime() > now.getTime()
  const updated = await prisma.marketingCampaign.update({
    where: { id },
    data: planifiee
      ? { statut: 'PLANIFIEE', totalCibles: recipients.length }
      : { statut: 'EN_COURS', totalCibles: recipients.length, startedAt: now },
    include: CREATED_BY_SELECT,
  })

  await enqueue(
    'MARKETING_CAMPAIGN_SEND',
    { campaignId: id },
    planifiee
      ? { maxAttempts: 1, scheduledAt: campaign.scheduledAt as Date }
      : { maxAttempts: 1 },
  )

  return updated
}

export async function cancelCampaign(id: string) {
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id } })
  if (!campaign) {
    throw new AppError('CAMPAIGN_NOT_FOUND', 404, { message: 'Campagne introuvable' })
  }
  if (campaign.statut !== 'BROUILLON' && campaign.statut !== 'PLANIFIEE') {
    throw new AppError('CAMPAIGN_INVALID_STATUS', 409, {
      message: 'Seules les campagnes brouillon ou planifiées peuvent être annulées',
    })
  }

  return prisma.marketingCampaign.update({
    where: { id },
    data: { statut: 'ANNULEE' },
    include: CREATED_BY_SELECT,
  })
}
