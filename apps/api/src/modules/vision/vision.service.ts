import { prisma } from '../../lib/prisma.js'
import { identifyPart } from '../../lib/gemini.js'
import type { PartIdentification } from '../../lib/gemini.js'

const HIGH_CONFIDENCE_THRESHOLD = 0.7
const LOW_CONFIDENCE_THRESHOLD = 0.3

export interface VisionIdentifyResult {
  status: 'identified' | 'disambiguation' | 'failed'
  identification: PartIdentification | null
  candidates: CatalogCandidate[]
  matchingParts: CatalogCandidate[]
}

export interface CatalogCandidate {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { id: string; shopName: string }
}

export async function identifyFromPhoto(
  imageBuffer: Buffer,
  mimeType: string,
  vehicleFilter?: { brand?: string; model?: string; year?: number },
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
): Promise<VisionIdentifyResult> {
  const identification = await identifyPart(imageBuffer, mimeType, logger)

  if (!identification) {
    return { status: 'failed', identification: null, candidates: [], matchingParts: [] }
  }

  // Build search filter for matching parts in catalog
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
  }

  if (identification.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    // High confidence: search by identified name and category
    where.OR = [
      { name: { contains: identification.name, mode: 'insensitive' } },
      { category: { equals: identification.category, mode: 'insensitive' } },
    ]

    if (vehicleFilter?.brand) {
      where.vehicleCompatibility = { contains: vehicleFilter.brand, mode: 'insensitive' }
    }

    const matchingParts = await prisma.catalogItem.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        imageThumbUrl: true,
        vendor: { select: { id: true, shopName: true } },
      },
    })

    return { status: 'identified', identification, candidates: [], matchingParts }
  }

  if (identification.confidence >= LOW_CONFIDENCE_THRESHOLD) {
    // Low confidence: find disambiguation candidates (similar parts)
    const candidates = await prisma.catalogItem.findMany({
      where: {
        status: 'PUBLISHED',
        inStock: true,
        vendor: { status: 'ACTIVE' },
        OR: [
          { category: { equals: identification.category, mode: 'insensitive' } },
          { name: { contains: identification.name.split(' ')[0] ?? '', mode: 'insensitive' } },
        ],
      },
      take: 5,
      distinct: ['category'],
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        imageThumbUrl: true,
        vendor: { select: { id: true, shopName: true } },
      },
    })

    return { status: 'disambiguation', identification, candidates, matchingParts: [] }
  }

  // Very low confidence: failed
  return { status: 'failed', identification, candidates: [], matchingParts: [] }
}

export async function searchByCategory(
  category: string,
  vehicleFilter?: { brand?: string },
) {
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
    category: { equals: category, mode: 'insensitive' },
  }

  if (vehicleFilter?.brand) {
    where.vehicleCompatibility = { contains: vehicleFilter.brand, mode: 'insensitive' }
  }

  return prisma.catalogItem.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      imageThumbUrl: true,
      vendor: { select: { id: true, shopName: true } },
    },
  })
}
