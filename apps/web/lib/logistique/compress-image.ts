// Compression côté navigateur avant envoi.
//
// Deux raisons, pas une :
//   1. rester sous les 5 Mo du multipart Fastify ;
//   2. RÉ-ENCODER LE HEIC de l'iPhone en JPEG. Sans ça, `image/heic` est rejeté
//      par le contrôle MIME serveur — et on perdrait précisément le prospect qui
//      prend la peine de photographier sa pièce.

const MAX_EDGE = 1600
const QUALITY = 0.82

export async function compressImage(file: File): Promise<Blob> {
  // Si le navigateur ne sait pas décoder (HEIC sur desktop non-Apple), on
  // renvoie l'original : le serveur tranchera avec un message clair.
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    return blob ?? file
  } catch {
    return file
  }
}
