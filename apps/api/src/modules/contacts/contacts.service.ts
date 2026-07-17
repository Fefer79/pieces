import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import {
  createVendorContactSchema,
  updateVendorContactSchema,
  linkVendorContactSchema,
  vendorContactListQuerySchema,
  createContactActivitySchema,
  assignContactSchema,
  convertContactSchema,
} from 'shared/validators'
import type { Prisma } from '@prisma/client'

const CONTACT_SELECT = {
  id: true,
  name: true,
  shopName: true,
  phone: true,
  phone2: true,
  whatsapp: true,
  email: true,
  commune: true,
  address: true,
  lat: true,
  lng: true,
  pieces: true,
  piecesLibre: true,
  remarques: true,
  statut: true,
  relanceLe: true,
  derniereVisite: true,
  derniereCommande: true,
  notesAppel: true,
  photos: true,
  createdById: true,
  liaisonId: true,
  vendorId: true,
  source: true,
  sourceRef: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { liens: true } },
  liens: { select: { id: true, url: true, type: true, label: true, scrapedAt: true } },
} as const

export async function listContacts(userId: string, rawQuery: unknown) {
  const query = vendorContactListQuerySchema.parse(rawQuery)

  const where: Prisma.VendorContactWhereInput = {}

  if (query.statut) where.statut = query.statut
  if (query.commune) where.commune = query.commune
  if (query.source) where.source = query.source
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { shopName: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search } },
      { piecesLibre: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const [contacts, total] = await Promise.all([
    prisma.vendorContact.findMany({
      where,
      select: CONTACT_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.vendorContact.count({ where }),
  ])

  return { contacts, total, limit: query.limit, offset: query.offset }
}

export async function getContact(contactId: string) {
  const contact = await prisma.vendorContact.findUnique({
    where: { id: contactId },
    select: CONTACT_SELECT,
  })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })
  return contact
}

export async function createContact(userId: string, body: unknown) {
  const parsed = createVendorContactSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION', 422, { message: parsed.error.issues[0]?.message ?? 'Données invalides' })
  }
  const data = parsed.data

  const contact = await prisma.vendorContact.create({
    data: {
      name: data.name,
      shopName: data.shopName ?? null,
      phone: data.phone,
      phone2: data.phone2 ?? null,
      whatsapp: data.whatsapp ?? null,
      email: data.email ?? null,
      commune: data.commune ?? null,
      address: data.address ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      pieces: data.pieces ?? [],
      piecesLibre: data.piecesLibre ?? null,
      remarques: data.remarques ?? null,
      vendorId: data.vendorId ?? null,
      createdById: userId,
      liaisonId: userId,
      statut: 'A_CONTACTER',
    },
    select: CONTACT_SELECT,
  })

  return contact
}

export async function updateContact(userId: string, contactId: string, body: unknown) {
  const parsed = updateVendorContactSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION', 422, { message: parsed.error.issues[0]?.message ?? 'Données invalides' })
  }
  const data = parsed.data

  const existing = await prisma.vendorContact.findUnique({ where: { id: contactId }, select: { id: true } })
  if (!existing) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })

  return prisma.vendorContact.update({
    where: { id: contactId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.shopName !== undefined && { shopName: data.shopName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.phone2 !== undefined && { phone2: data.phone2 }),
      ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.commune !== undefined && { commune: data.commune }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.lat !== undefined && { lat: data.lat }),
      ...(data.lng !== undefined && { lng: data.lng }),
      ...(data.pieces !== undefined && { pieces: data.pieces }),
      ...(data.piecesLibre !== undefined && { piecesLibre: data.piecesLibre }),
      ...(data.remarques !== undefined && { remarques: data.remarques }),
      ...(data.vendorId !== undefined && { vendorId: data.vendorId }),
      ...(data.statut !== undefined && { statut: data.statut }),
      ...(data.relanceLe !== undefined && { relanceLe: data.relanceLe ? new Date(data.relanceLe) : null }),
      ...(data.derniereVisite !== undefined && { derniereVisite: data.derniereVisite ? new Date(data.derniereVisite) : null }),
      ...(data.derniereCommande !== undefined && { derniereCommande: data.derniereCommande ? new Date(data.derniereCommande) : null }),
      ...(data.notesAppel !== undefined && { notesAppel: data.notesAppel }),
      ...(data.photos !== undefined && { photos: data.photos }),
    },
    select: CONTACT_SELECT,
  })
}

export async function deleteContact(contactId: string) {
  const existing = await prisma.vendorContact.findUnique({ where: { id: contactId }, select: { id: true } })
  if (!existing) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })
  await prisma.vendorContact.delete({ where: { id: contactId } })
}

export async function addContactLink(contactId: string, body: unknown) {
  const parsed = linkVendorContactSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION', 422, { message: parsed.error.issues[0]?.message ?? 'Données invalides' })
  }
  const data = parsed.data

  const contact = await prisma.vendorContact.findUnique({ where: { id: contactId }, select: { id: true } })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })

  const lien = await prisma.vendorContactLink.create({
    data: {
      contactId,
      url: data.url,
      type: data.type,
      label: data.label ?? null,
      scrapedAt: new Date(),
    },
    select: { id: true, url: true, type: true, label: true, scrapedAt: true },
  })

  return lien
}

export async function scrapedContactLink(contactId: string, url: string, rawData: unknown, linkType: string) {
  const contact = await prisma.vendorContact.findUnique({ where: { id: contactId }, select: { id: true } })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })

  const lien = await prisma.vendorContactLink.upsert({
    where: { uq_vendor_contact_link_url: { contactId, url } },
    create: {
      contactId,
      url,
      type: linkType,
      rawData: rawData as Prisma.JsonObject,
      scrapedAt: new Date(),
    },
    update: {
      rawData: rawData as Prisma.JsonObject,
      scrapedAt: new Date(),
    },
    select: { id: true, url: true, type: true, label: true, scrapedAt: true },
  })

  return lien
}

export async function deleteContactLink(contactId: string, lienId: string) {
  const lien = await prisma.vendorContactLink.findFirst({
    where: { id: lienId, contactId },
    select: { id: true },
  })
  if (!lien) throw new AppError('LINK_NOT_FOUND', 404, { message: 'Lien introuvable' })
  await prisma.vendorContactLink.delete({ where: { id: lienId } })
}

export async function getTodayRelances(liaisonId?: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Inclut les relances en retard (< aujourd'hui) pour qu'elles ne disparaissent pas de l'agenda.
  return prisma.vendorContact.findMany({
    where: {
      relanceLe: { lt: tomorrow },
      statut: { in: ['A_CONTACTER', 'APPELE', 'RELANCE', 'A_REVOIR'] },
      ...(liaisonId ? { liaisonId } : {}),
    },
    select: CONTACT_SELECT,
    orderBy: { relanceLe: 'asc' },
  })
}

const ACTIVITY_SELECT = {
  id: true,
  type: true,
  note: true,
  statutAvant: true,
  statutApres: true,
  createdAt: true,
  author: { select: { id: true, name: true, phone: true } },
} as const

export async function listActivities(contactId: string) {
  const contact = await prisma.vendorContact.findUnique({ where: { id: contactId }, select: { id: true } })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })

  return prisma.contactActivity.findMany({
    where: { contactId },
    select: ACTIVITY_SELECT,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function addActivity(userId: string, contactId: string, body: unknown) {
  const parsed = createContactActivitySchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION', 422, { message: parsed.error.issues[0]?.message ?? 'Données invalides' })
  }
  const data = parsed.data

  const contact = await prisma.vendorContact.findUnique({
    where: { id: contactId },
    select: { id: true, statut: true },
  })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })

  const statutChange = data.statut !== undefined && data.statut !== contact.statut

  return prisma.$transaction(async (tx) => {
    const activity = await tx.contactActivity.create({
      data: {
        contactId,
        authorId: userId,
        type: data.type,
        note: data.note ?? null,
        statutAvant: statutChange ? contact.statut : null,
        statutApres: statutChange ? data.statut : null,
      },
      select: ACTIVITY_SELECT,
    })

    const updated = await tx.vendorContact.update({
      where: { id: contactId },
      data: {
        ...(data.statut !== undefined && { statut: data.statut }),
        ...(data.relanceLe !== undefined && { relanceLe: data.relanceLe ? new Date(data.relanceLe) : null }),
        ...(data.type === 'VISITE' && { derniereVisite: new Date() }),
      },
      select: CONTACT_SELECT,
    })

    return { activity, contact: updated }
  })
}

export async function assignContact(contactId: string, body: unknown) {
  const parsed = assignContactSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION', 422, { message: parsed.error.issues[0]?.message ?? 'Données invalides' })
  }
  const { liaisonId } = parsed.data

  const contact = await prisma.vendorContact.findUnique({ where: { id: contactId }, select: { id: true } })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })

  let liaisonName: string | null = null
  if (liaisonId) {
    const liaison = await prisma.user.findFirst({
      where: { id: liaisonId, roles: { has: 'LIAISON' } },
      select: { name: true, phone: true },
    })
    if (!liaison) throw new AppError('LIAISON_NOT_FOUND', 404, { message: 'Liaison introuvable' })
    liaisonName = liaison.name ?? liaison.phone ?? liaisonId
  }

  return prisma.vendorContact.update({
    where: { id: contactId },
    data: {
      liaisonId,
      activites: {
        create: {
          type: 'ASSIGNATION',
          note: liaisonName ? `Assigné à ${liaisonName}` : 'Assignation retirée',
        },
      },
    },
    select: CONTACT_SELECT,
  })
}

export async function convertContactToVendor(userId: string, contactId: string, body: unknown) {
  const parsed = convertContactSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VALIDATION', 422, { message: parsed.error.issues[0]?.message ?? 'Données invalides' })
  }
  const data = parsed.data

  const contact = await prisma.vendorContact.findUnique({ where: { id: contactId } })
  if (!contact) throw new AppError('CONTACT_NOT_FOUND', 404, { message: 'Contact introuvable' })
  if (contact.vendorId) {
    throw new AppError('CONTACT_ALREADY_CONVERTED', 409, { message: 'Ce contact est déjà lié à un vendeur' })
  }

  // Dédup par téléphone : si un vendeur existe déjà avec ce numéro, on lie la fiche au lieu de dupliquer.
  const existingVendor = await prisma.vendor.findFirst({
    where: { phone: contact.phone },
    select: { id: true, shopName: true },
  })

  return prisma.$transaction(async (tx) => {
    let vendorId = existingVendor?.id
    if (!vendorId) {
      const vendor = await tx.vendor.create({
        data: {
          shopName: data.shopName ?? contact.shopName ?? contact.name,
          contactName: contact.name,
          phone: contact.phone,
          vendorType: data.vendorType,
          status: 'PENDING_ACTIVATION',
          commune: contact.commune,
          address: contact.address,
          lat: contact.lat,
          lng: contact.lng,
          deliveryZones: data.deliveryZones,
          managedByLiaisonId: contact.liaisonId ?? userId,
        },
        select: { id: true },
      })
      vendorId = vendor.id
    }

    return tx.vendorContact.update({
      where: { id: contactId },
      data: {
        vendorId,
        statut: 'CONCLU',
        activites: {
          create: {
            authorId: userId,
            type: 'CONVERSION',
            note: existingVendor
              ? `Lié au vendeur existant « ${existingVendor.shopName} »`
              : 'Converti en vendeur',
            statutAvant: contact.statut !== 'CONCLU' ? contact.statut : null,
            statutApres: contact.statut !== 'CONCLU' ? 'CONCLU' : null,
          },
        },
      },
      select: CONTACT_SELECT,
    })
  })
}

export async function getProspectionStats() {
  const [byStatut, byCommune, byLiaison, total, converted, recentActivities] = await Promise.all([
    prisma.vendorContact.groupBy({ by: ['statut'], _count: { _all: true } }),
    prisma.vendorContact.groupBy({ by: ['commune'], _count: { _all: true } }),
    prisma.vendorContact.groupBy({ by: ['liaisonId'], _count: { _all: true } }),
    prisma.vendorContact.count(),
    prisma.vendorContact.count({ where: { vendorId: { not: null } } }),
    prisma.contactActivity.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
    }),
  ])

  const liaisonIds = byLiaison.map((l) => l.liaisonId).filter((id): id is string => id != null)
  const liaisons = liaisonIds.length
    ? await prisma.user.findMany({
        where: { id: { in: liaisonIds } },
        select: { id: true, name: true, phone: true },
      })
    : []
  const liaisonNames = new Map(liaisons.map((l) => [l.id, l.name ?? l.phone ?? l.id]))

  const concluParLiaison = await prisma.vendorContact.groupBy({
    by: ['liaisonId'],
    where: { statut: 'CONCLU' },
    _count: { _all: true },
  })
  const concluMap = new Map(concluParLiaison.map((l) => [l.liaisonId, l._count._all]))

  return {
    total,
    converted,
    recentActivities,
    byStatut: byStatut.map((s) => ({ statut: s.statut, count: s._count._all })),
    byCommune: byCommune
      .map((c) => ({ commune: c.commune, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    byLiaison: byLiaison.map((l) => ({
      liaisonId: l.liaisonId,
      liaisonName: l.liaisonId ? (liaisonNames.get(l.liaisonId) ?? l.liaisonId) : null,
      count: l._count._all,
      conclu: concluMap.get(l.liaisonId) ?? 0,
    })),
  }
}
