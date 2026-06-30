import { prisma } from '../../lib/prisma.js'
import { notifyVendorsIncomplete } from '../notification/notification.service.js'

// Espacement minimal entre deux relances d'un même vendeur, et plafond d'envois
// pour ne pas harceler indéfiniment une fiche qui ne sera jamais complétée.
const RELANCE_INTERVAL_MS = 3 * 86_400_000 // 3 jours
const MAX_RELANCES = 4

export function vendorMissingFields(v: {
  commune: string | null
  lat: number | null
  kyc: { id: string } | null
}): string[] {
  const missing: string[] = []
  if (!v.kyc) missing.push('KYC')
  if (!v.commune) missing.push('commune')
  if (v.lat == null) missing.push('GPS')
  return missing
}

/**
 * Relance les fiches vendeurs incomplètes (onboarding minimal : nom + téléphone)
 * en envoyant un récapitulatif WhatsApp au liaison qui les gère. Regroupe par
 * liaison (un seul message listant ses vendeurs à compléter).
 *
 * Dédoublonnage : un vendeur n'est relancé qu'après RELANCE_INTERVAL_MS depuis
 * la dernière relance, et au plus MAX_RELANCES fois. On ne marque la relance
 * (relanceLastSentAt / relanceCount) QUE si l'envoi a réussi — donc tant que
 * WhatsApp n'est pas configuré en prod, le scan ne consomme rien et réessaiera
 * dès que le token sera en place. Idempotent et sûr à rejouer.
 */
export async function scanAndSendVendorRelances(opts?: { liaisonId?: string }) {
  const threshold = new Date(Date.now() - RELANCE_INTERVAL_MS)

  const vendors = await prisma.vendor.findMany({
    where: {
      managedByLiaisonId: opts?.liaisonId ?? { not: null },
      relanceCount: { lt: MAX_RELANCES },
      AND: [
        { OR: [{ relanceLastSentAt: null }, { relanceLastSentAt: { lte: threshold } }] },
        // Incomplet = KYC absent OU commune absente OU GPS absent.
        { OR: [{ kyc: { is: null } }, { commune: null }, { lat: null }] },
      ],
    },
    select: {
      id: true,
      shopName: true,
      commune: true,
      lat: true,
      managedByLiaisonId: true,
      kyc: { select: { id: true } },
      managedByLiaison: { select: { phone: true } },
    },
  })

  // Regroupe les vendeurs dus par liaison gestionnaire.
  const byLiaison = new Map<
    string,
    { phone: string | null; vendors: { id: string; shopName: string; missing: string[] }[] }
  >()
  for (const v of vendors) {
    const missing = vendorMissingFields(v)
    if (missing.length === 0) continue // garde-fou
    const key = v.managedByLiaisonId as string
    const group = byLiaison.get(key) ?? { phone: v.managedByLiaison?.phone ?? null, vendors: [] }
    group.vendors.push({ id: v.id, shopName: v.shopName, missing })
    byLiaison.set(key, group)
  }

  let liaisonsNotified = 0
  const sentVendorIds: string[] = []

  for (const group of byLiaison.values()) {
    // Sans contact joignable, on ne marque rien : on réessaiera plus tard.
    if (!group.phone) continue
    const res = await notifyVendorsIncomplete(group.phone, {
      vendors: group.vendors.map((v) => ({ shopName: v.shopName, missing: v.missing })),
    })
    // Échec / WhatsApp non configuré → ne pas marquer, retenter au prochain scan.
    if (res.success !== true) continue
    liaisonsNotified++
    sentVendorIds.push(...group.vendors.map((v) => v.id))
  }

  if (sentVendorIds.length > 0) {
    await prisma.vendor.updateMany({
      where: { id: { in: sentVendorIds } },
      data: { relanceLastSentAt: new Date(), relanceCount: { increment: 1 } },
    })
  }

  return {
    vendorsDue: vendors.length,
    liaisonsNotified,
    vendorsRelanced: sentVendorIds.length,
  }
}
