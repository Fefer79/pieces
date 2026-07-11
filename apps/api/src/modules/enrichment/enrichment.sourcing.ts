import { prisma } from '../../lib/prisma.js'
import { isAnthropicConfigured } from '../../lib/anthropic.js'
import { submitSourcingBatch, collectSourcingBatch } from './enrichment.agent.js'
import type { SourcingRequest } from './enrichment.agent.js'
import type { EnrichmentPass1Output, EnrichmentSourcingOutput } from 'shared/validators'
import { Prisma } from '@prisma/client'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

/** Taille max d'un lot nocturne — borne le coût d'une nuit de sourcing. */
const BATCH_MAX_SIZE = 50

/**
 * Phase 2 — sourcing batch nocturne (spec §9). Sélectionne les fiches
 * validées jamais sourcées et soumet un lot à la Batch API (−50 % tokens).
 * Renvoie l'id du batch soumis, ou null s'il n'y a rien à traiter.
 */
export async function scanAndSubmitSourcing(logger: Logger): Promise<string | null> {
  if (!isAnthropicConfigured()) {
    logger.warn({ event: 'ENRICHMENT_SOURCING_SKIPPED' }, 'ANTHROPIC_API_KEY absente — sourcing sauté')
    return null
  }

  const candidates = await prisma.partEnrichment.findMany({
    where: { statut: 'VALIDE', sourcing: { equals: Prisma.DbNull }, sourcingBatchId: null },
    take: BATCH_MAX_SIZE,
    orderBy: { validatedAt: 'asc' },
    select: { id: true, identification: true },
  })

  const requests: SourcingRequest[] = []
  for (const candidate of candidates) {
    const id = candidate.identification as EnrichmentPass1Output['identification'] | null
    if (!id) continue
    const references_oem = (id.references_oem ?? []).map((r) => ({
      constructeur: r.constructeur,
      reference: r.reference,
    }))
    if (references_oem.length === 0 && !id.reference_fabricant?.valeur) continue
    requests.push({
      enrichmentId: candidate.id,
      identification: {
        marque_fabricant: id.marque_fabricant?.valeur ?? null,
        reference_fabricant: id.reference_fabricant?.valeur ?? null,
        references_oem,
      },
    })
  }

  if (requests.length === 0) {
    logger.info({ event: 'ENRICHMENT_SOURCING_EMPTY' }, 'Aucune fiche à sourcer cette nuit')
    return null
  }

  const batchId = await submitSourcingBatch(requests)
  await prisma.partEnrichment.updateMany({
    where: { id: { in: requests.map((r) => r.enrichmentId) } },
    data: { sourcingBatchId: batchId },
  })
  logger.info(
    { event: 'ENRICHMENT_SOURCING_SUBMITTED', batchId, count: requests.length },
    `Batch de sourcing soumis (${requests.length} fiches)`,
  )
  return batchId
}

/**
 * Relève un batch de sourcing. `processing` → le job de collecte se
 * replanifie ; `done` → résultats stockés (fiche + tables normalisées).
 */
export async function collectSourcingResults(
  batchId: string,
  logger: Logger,
): Promise<'processing' | 'done'> {
  const outcome = await collectSourcingBatch(batchId, logger)
  if (outcome.status === 'processing') return 'processing'

  for (const [enrichmentId, result] of outcome.results) {
    if (!result) {
      // Échec ou sortie invalide : on libère la fiche pour la nuit suivante.
      await prisma.partEnrichment.update({
        where: { id: enrichmentId },
        data: { sourcingBatchId: null },
      })
      continue
    }
    await storeSourcingResult(enrichmentId, result)
  }
  logger.info(
    { event: 'ENRICHMENT_SOURCING_COLLECTED', batchId, count: outcome.results.size },
    'Batch de sourcing collecté',
  )
  return 'done'
}

async function storeSourcingResult(enrichmentId: string, result: EnrichmentSourcingOutput) {
  const enrichment = await prisma.partEnrichment.findUnique({
    where: { id: enrichmentId },
    select: { identification: true },
  })
  const identification = enrichment?.identification as
    | EnrichmentPass1Output['identification']
    | null
  const refSource =
    identification?.references_oem?.[0]?.reference ??
    identification?.reference_fabricant?.valeur ??
    null

  await prisma.partEnrichment.update({
    where: { id: enrichmentId },
    data: { sourcing: result as unknown as Prisma.InputJsonValue },
  })

  // Chaque équivalence est stockée avec sa source et sa date de vérification —
  // jamais affirmée sans source (spec §9).
  if (refSource) {
    for (const ref of result.cross_references) {
      const verifieLe = parseDateOrNow(ref.verifie_le)
      await prisma.crossReference.upsert({
        where: {
          uq_cross_reference: {
            refSource,
            refCible: ref.reference,
            marqueCible: ref.marque,
          },
        },
        create: {
          refSource,
          refCible: ref.reference,
          marqueCible: ref.marque,
          type: ref.type,
          sourceUrl: ref.source,
          verifieLe,
        },
        update: { type: ref.type, sourceUrl: ref.source, verifieLe },
      })
    }
  }

  for (const contact of result.contacts_producteur) {
    await prisma.manufacturerContact.upsert({
      where: {
        uq_manufacturer_contact: {
          marque: contact.marque,
          entite: contact.entite,
          role: contact.role,
        },
      },
      create: {
        marque: contact.marque,
        entite: contact.entite,
        role: contact.role,
        email: contact.email,
        telephone: contact.telephone ?? null,
        url: contact.url,
        verifieLe: new Date(),
      },
      update: {
        email: contact.email,
        telephone: contact.telephone ?? null,
        url: contact.url,
        verifieLe: new Date(),
      },
    })
  }
}

function parseDateOrNow(value: string): Date {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date() : d
}
