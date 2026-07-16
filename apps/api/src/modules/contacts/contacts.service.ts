import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import {
  createVendorContactSchema,
  updateVendorContactSchema,
  linkVendorContactSchema,
  vendorContactListQuerySchema,
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

export async function getTodayRelances() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return prisma.vendorContact.findMany({
    where: {
      relanceLe: { gte: today, lt: tomorrow },
      statut: { in: ['A_CONTACTER', 'APPELE', 'RELANCE', 'A_REVOIR'] },
    },
    select: CONTACT_SELECT,
    orderBy: { relanceLe: 'asc' },
  })
}
