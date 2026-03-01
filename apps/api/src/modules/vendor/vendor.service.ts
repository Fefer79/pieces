import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { createVendorSchema } from 'shared/validators'

export async function createVendor(userId: string, body: unknown) {
  const parsed = createVendorSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VENDOR_INVALID_DATA', 400, {
      message: parsed.error.issues[0]?.message,
    })
  }

  const existingVendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (existingVendor) {
    throw new AppError('VENDOR_ALREADY_EXISTS', 409, {
      message: 'Un profil vendeur existe déjà pour cet utilisateur',
    })
  }

  const { shopName, contactName, phone, vendorType, documentNumber, kycType } =
    parsed.data

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        userId,
        shopName,
        contactName,
        phone,
        vendorType,
        status: 'PENDING_ACTIVATION',
      },
    })

    await tx.vendorKyc.create({
      data: {
        vendorId: vendor.id,
        kycType,
        documentNumber,
        isPublic: kycType === 'RCCM',
      },
    })

    return tx.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
      select: {
        id: true,
        shopName: true,
        contactName: true,
        phone: true,
        vendorType: true,
        status: true,
        createdAt: true,
        kyc: {
          select: {
            id: true,
            kycType: true,
            documentNumber: true,
            isPublic: true,
          },
        },
      },
    })
  })
}

export async function getMyVendor(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: {
      id: true,
      shopName: true,
      contactName: true,
      phone: true,
      vendorType: true,
      status: true,
      createdAt: true,
      kyc: {
        select: {
          id: true,
          kycType: true,
          documentNumber: true,
          isPublic: true,
        },
      },
    },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  return vendor
}
