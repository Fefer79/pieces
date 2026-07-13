import { AppError } from './appError.js'
import { extractOemLabel } from './gemini.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Scan d'une étiquette / code-barres OEM : Gemini lit les références imprimées
 * et propose les compatibilités véhicule connues pour ces références. Résultat
 * purement suggestif — l'auteur (liaison ou vendeur) relit et corrige avant
 * publication.
 */
export async function scanOemLabel(
  fileBuffer: Buffer,
  mimeType: string,
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
) {
  if (fileBuffer.length > MAX_IMAGE_BYTES) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }
  if (!ALLOWED_IMAGE_MIME.includes(mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }

  const extraction = await extractOemLabel(fileBuffer, mimeType, logger)
  if (!extraction) {
    throw new AppError('OEM_SCAN_UNAVAILABLE', 503, {
      message: 'Analyse indisponible pour le moment. Saisissez la référence manuellement.',
    })
  }
  if (extraction.oemReferences.length === 0) {
    throw new AppError('OEM_SCAN_UNREADABLE', 422, {
      message:
        'Aucune référence lisible sur la photo. Rapprochez-vous de l\'étiquette et évitez les reflets.',
    })
  }

  return extraction
}
