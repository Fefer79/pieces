import { prisma } from '../../lib/prisma.js'

/**
 * Recalcule la note moyenne / le nombre d'avis d'un mécanicien à partir des
 * avis PUBLIÉS uniquement (un avis masqué en modération ne doit plus peser).
 * Idempotent, appelé en fire-and-forget après chaque création/modération
 * d'avis — le fan-in par mécanicien est trop faible pour justifier un job de
 * scan comme recomputeAllVendorScores.
 */
export async function recomputeMechanicScore(mechanicId: string) {
  const reviews = await prisma.mechanicReview.findMany({
    where: { mechanicId, status: 'PUBLISHED' },
    select: { rating: true },
  })

  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 100) / 100
      : null

  await prisma.mechanic.update({
    where: { id: mechanicId },
    data: { avgRating, reviewCount },
  })

  return { mechanicId, avgRating, reviewCount }
}
