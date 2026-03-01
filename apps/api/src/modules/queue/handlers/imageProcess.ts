import type { Job } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { downloadFromR2, uploadToR2 } from '../../../lib/r2.js'
import { processVariants, assessQuality } from '../../../lib/imageProcessor.js'
import { identifyPart } from '../../../lib/gemini.js'
import { markCompleted, markFailed } from '../queueService.js'

interface ImageProcessPayload {
  catalogItemId: string
  imageKey: string
  mimeType: string
}

export async function handleImageProcess(job: Job, logger: { info: (obj: Record<string, unknown>, msg: string) => void; warn: (obj: Record<string, unknown>, msg: string) => void }) {
  const payload = job.payload as unknown as ImageProcessPayload

  try {
    // Download raw image from R2
    const rawBuffer = await downloadFromR2(payload.imageKey)

    // Assess quality
    const quality = await assessQuality(rawBuffer)

    // Generate 4 WebP variants
    const variants = await processVariants(rawBuffer)

    // Upload variants to R2
    const basePath = payload.imageKey.replace(/\.[^.]+$/, '')
    const [thumbUrl, smallUrl, mediumUrl, largeUrl] = await Promise.all([
      uploadToR2(`${basePath}_thumb.webp`, variants.thumb, 'image/webp'),
      uploadToR2(`${basePath}_small.webp`, variants.small, 'image/webp'),
      uploadToR2(`${basePath}_medium.webp`, variants.medium, 'image/webp'),
      uploadToR2(`${basePath}_large.webp`, variants.large, 'image/webp'),
    ])

    // Update catalog item with variant URLs and quality
    await prisma.catalogItem.update({
      where: { id: payload.catalogItemId },
      data: {
        imageThumbUrl: thumbUrl,
        imageSmallUrl: smallUrl,
        imageMediumUrl: mediumUrl,
        imageLargeUrl: largeUrl,
        qualityScore: quality.score,
        qualityIssue: quality.issues.length > 0 ? quality.issues.join('; ') : null,
      },
    })

    logger.info({ event: 'IMAGE_VARIANTS_PROCESSED', catalogItemId: payload.catalogItemId }, 'Image variants generated')
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'IMAGE_PROCESS_FAILED', catalogItemId: payload.catalogItemId, error: message }, 'Image processing failed')
    await markFailed(job.id, message)
  }
}

export async function handleAiIdentify(job: Job, logger: { info: (obj: Record<string, unknown>, msg: string) => void; warn: (obj: Record<string, unknown>, msg: string) => void }) {
  const payload = job.payload as unknown as ImageProcessPayload

  try {
    const rawBuffer = await downloadFromR2(payload.imageKey)

    const identification = await identifyPart(rawBuffer, payload.mimeType, logger)

    if (identification) {
      await prisma.catalogItem.update({
        where: { id: payload.catalogItemId },
        data: {
          name: identification.name,
          category: identification.category,
          oemReference: identification.oemReference,
          vehicleCompatibility: identification.vehicleCompatibility,
          suggestedPrice: identification.suggestedPrice,
          aiConfidence: identification.confidence,
          aiGenerated: true,
        },
      })

      logger.info({ event: 'CATALOG_AI_IDENTIFIED', catalogItemId: payload.catalogItemId, confidence: identification.confidence }, 'Part identified by AI')
    } else {
      await prisma.catalogItem.update({
        where: { id: payload.catalogItemId },
        data: { aiGenerated: false },
      })

      logger.warn({ event: 'CATALOG_AI_FALLBACK', catalogItemId: payload.catalogItemId }, 'AI identification failed — manual entry required')
    }

    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'AI_IDENTIFY_FAILED', catalogItemId: payload.catalogItemId, error: message }, 'AI identification job failed')
    await markFailed(job.id, message)
  }
}
