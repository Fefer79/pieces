import { randomBytes } from 'node:crypto'
import type { VendorType } from '@prisma/client'
import { prisma } from './prisma.js'
import { AppError } from './appError.js'
import { uploadToR2, downloadFromR2 } from './r2.js'

const MAX_KYC_PHOTO_BYTES = 8 * 1024 * 1024
const ALLOWED_KYC_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/**
 * Enregistre la photo de la pièce d'identité d'un vendeur.
 *
 * FORMAL → RCCM, INFORMAL → CNI (au sens large : CNI, passeport, permis ou
 * attestation d'identité — c'est la photo qui fait foi sur le terrain, pas le
 * numéro, que beaucoup de vendeurs informels ne savent pas dicter).
 *
 * La clé R2 porte un suffixe aléatoire et n'est jamais renvoyée au client : la
 * lecture passe toujours par une route authentifiée, comme l'audio d'entretien.
 */
export async function storeKycPhoto(
  vendorId: string,
  vendorType: VendorType,
  fileBuffer: Buffer,
  mimeType: string,
) {
  if (!fileBuffer.length) {
    throw new AppError('KYC_PHOTO_EMPTY', 422, { message: 'Fichier vide' })
  }
  if (fileBuffer.length > MAX_KYC_PHOTO_BYTES) {
    throw new AppError('KYC_PHOTO_TOO_LARGE', 422, {
      message: 'Document trop volumineux (max 8 MB)',
    })
  }
  if (!ALLOWED_KYC_MIME.includes(mimeType)) {
    throw new AppError('KYC_PHOTO_INVALID_TYPE', 422, {
      message: 'Format accepté : photo JPEG, PNG, WebP ou PDF',
    })
  }

  const kycType = vendorType === 'FORMAL' ? 'RCCM' : 'CNI'
  const ext = EXT[mimeType] ?? 'bin'
  const key = `kyc/${vendorId}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`
  await uploadToR2(key, fileBuffer, mimeType)

  const documentImageAt = new Date()
  await prisma.vendorKyc.upsert({
    where: { vendorId },
    create: {
      vendorId,
      kycType,
      documentImageKey: key,
      documentImageMimeType: mimeType,
      documentImageAt,
      isPublic: false,
    },
    // On ne touche ni au numéro déjà relevé ni au type : seule la photo change.
    update: {
      documentImageKey: key,
      documentImageMimeType: mimeType,
      documentImageAt,
    },
  })

  return { kycType, documentImageAt }
}

/** Lit la photo KYC d'un vendeur. L'appelant est responsable des droits d'accès. */
export async function readKycPhoto(vendorId: string) {
  const kyc = await prisma.vendorKyc.findUnique({
    where: { vendorId },
    select: { documentImageKey: true, documentImageMimeType: true },
  })
  if (!kyc?.documentImageKey) {
    throw new AppError('KYC_PHOTO_NOT_FOUND', 404, {
      message: 'Aucune pièce d’identité enregistrée pour ce vendeur',
    })
  }
  const buffer = await downloadFromR2(kyc.documentImageKey)
  return { buffer, mimeType: kyc.documentImageMimeType ?? 'application/octet-stream' }
}
