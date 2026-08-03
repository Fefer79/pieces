import {
  getAnthropicClient,
  createWithPauseResume,
  extractJson,
  textOf,
  webSearchTool,
} from '../../lib/anthropic.js'
import {
  enrichmentPass1OutputSchema,
  enrichmentPass2OutputSchema,
  enrichmentSourcingOutputSchema,
} from 'shared/validators'
import type {
  EnrichmentPass1Output,
  EnrichmentPass2Output,
  EnrichmentSourcingOutput,
} from 'shared/validators'
import {
  PROMPT_PASSE_1,
  PROMPT_PASSE_2,
  PROMPT_SOURCING,
  PROMPT_DESCRIPTION,
  GRILLE_AUTHENTICITE,
  SCHEMA_PASSE_1,
  SCHEMA_PASSE_2,
  SCHEMA_SOURCING,
  buildTaxonomyBlock,
} from './enrichment.prompts.js'

type Logger = { warn: (obj: Record<string, unknown>, msg: string) => void }

const pass1Model = () => process.env.ENRICHMENT_PASS1_MODEL ?? 'claude-haiku-4-5'
const pass2Model = () => process.env.ENRICHMENT_PASS2_MODEL ?? 'claude-sonnet-4-6'

export interface AgentImage {
  data: string // base64 (JPEG ≤ 2000 px, redimensionné côté serveur)
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface IdentificationPayload {
  marque_fabricant: string | null
  reference_fabricant: string | null
  references_oem: Array<{ constructeur: string; reference: string }>
}

/**
 * Passe 1 — synchrone, vision seule (< 10 s). Un seul appel avec les photos,
 * sans recherche web : contrôle qualité photos, identification, classification,
 * score d'authenticité. Renvoie null sur erreur API (le Liaison ressaisit à la main).
 */
export async function runIdentificationPass(
  images: AgentImage[],
  logger?: Logger,
): Promise<EnrichmentPass1Output | null> {
  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: pass1Model(),
      max_tokens: 4096,
      system: PROMPT_PASSE_1,
      messages: [
        {
          role: 'user',
          content: [
            ...images.map((img, i) => [
              { type: 'text' as const, text: `Photo ${i + 1} :` },
              {
                type: 'image' as const,
                source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
              },
            ]).flat(),
            {
              type: 'text' as const,
              text: `${buildTaxonomyBlock()}\n\n${GRILLE_AUTHENTICITE}\n\nSCHÉMA DE SORTIE\n${SCHEMA_PASSE_1}`,
            },
          ],
        },
      ],
    })

    const parsed = enrichmentPass1OutputSchema.safeParse(extractJson(textOf(response.content)))
    if (!parsed.success) {
      logger?.warn(
        { event: 'ENRICHMENT_PASS1_INVALID_OUTPUT', issues: parsed.error.issues.slice(0, 3) },
        'Sortie passe 1 invalide',
      )
      return null
    }
    return parsed.data
  } catch (err) {
    logger?.warn(
      { event: 'ENRICHMENT_PASS1_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude passe 1',
    )
    return null
  }
}

/**
 * Passe 2 — asynchrone, recherche web (30–90 s). Compatibilités véhicules
 * sourcées, priorisées sur le parc VTC ivoirien. `max_uses: 5` borne coût et latence.
 */
export async function runCompatibilityPass(
  identification: IdentificationPayload,
  logger?: Logger,
): Promise<EnrichmentPass2Output | null> {
  try {
    const response = await createWithPauseResume({
      model: pass2Model(),
      max_tokens: 4096,
      system: PROMPT_PASSE_2,
      tools: [webSearchTool(5)],
      messages: [
        {
          role: 'user',
          content: `PIÈCE IDENTIFIÉE\n${JSON.stringify(identification, null, 2)}\n\nSCHÉMA DE SORTIE\n${SCHEMA_PASSE_2}`,
        },
      ],
    })

    const parsed = enrichmentPass2OutputSchema.safeParse(extractJson(textOf(response.content)))
    if (!parsed.success) {
      logger?.warn(
        { event: 'ENRICHMENT_PASS2_INVALID_OUTPUT', issues: parsed.error.issues.slice(0, 3) },
        'Sortie passe 2 invalide',
      )
      return null
    }
    return parsed.data
  } catch (err) {
    logger?.warn(
      { event: 'ENRICHMENT_PASS2_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude passe 2',
    )
    return null
  }
}

/**
 * Description indépendante destinée aux acheteurs flotte (spec §7) : texte
 * factuel rédigé par Pièces, jamais les signaux ni la méthode. Publiée après
 * approbation administrateur uniquement.
 */
export async function generateFleetDescription(
  payload: {
    identification: unknown
    classification: unknown
    fitments: unknown
    warrantyValue?: number | null
    warrantyUnit?: string | null
  },
  logger?: Logger,
): Promise<string | null> {
  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: pass1Model(),
      max_tokens: 1024,
      system: PROMPT_DESCRIPTION,
      messages: [
        {
          role: 'user',
          content: `FICHE VALIDÉE\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    })
    const text = textOf(response.content).trim()
    return text.length > 0 ? text : null
  } catch (err) {
    logger?.warn(
      { event: 'ENRICHMENT_DESCRIPTION_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude description',
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — sourcing batch nocturne (Batch API, −50 % sur les tokens)
// ---------------------------------------------------------------------------

export interface SourcingRequest {
  enrichmentId: string
  identification: IdentificationPayload
}

/** Soumet un lot de fiches validées à la Batch API. Renvoie l'id du batch. */
export async function submitSourcingBatch(requests: SourcingRequest[]): Promise<string> {
  const client = getAnthropicClient()
  const batch = await client.messages.batches.create({
    requests: requests.map((req) => ({
      custom_id: req.enrichmentId,
      params: {
        model: pass2Model(),
        max_tokens: 8192,
        system: PROMPT_SOURCING,
        tools: [webSearchTool(12)],
        messages: [
          {
            role: 'user' as const,
            content: `PIÈCE VALIDÉE\n${JSON.stringify(req.identification, null, 2)}\n\nSCHÉMA DE SORTIE\n${SCHEMA_SOURCING}`,
          },
        ],
      },
    })),
  })
  return batch.id
}

export type SourcingBatchResult =
  | { status: 'processing' }
  | { status: 'ended'; results: Map<string, EnrichmentSourcingOutput | null> }

/**
 * Relève un batch de sourcing. Tant que le batch tourne, renvoie `processing`
 * (le job de collecte se replanifie). Une fois terminé, renvoie le résultat
 * par fiche (null = requête en erreur ou sortie invalide, à retenter une
 * prochaine nuit).
 */
export async function collectSourcingBatch(
  batchId: string,
  logger?: Logger,
): Promise<SourcingBatchResult> {
  const client = getAnthropicClient()
  const batch = await client.messages.batches.retrieve(batchId)
  if (batch.processing_status !== 'ended') return { status: 'processing' }

  const results = new Map<string, EnrichmentSourcingOutput | null>()
  for await (const entry of await client.messages.batches.results(batchId)) {
    if (entry.result.type !== 'succeeded') {
      logger?.warn(
        { event: 'ENRICHMENT_SOURCING_REQUEST_FAILED', customId: entry.custom_id, type: entry.result.type },
        'Requête de sourcing en échec dans le batch',
      )
      results.set(entry.custom_id, null)
      continue
    }
    try {
      const parsed = enrichmentSourcingOutputSchema.safeParse(
        extractJson(textOf(entry.result.message.content)),
      )
      results.set(entry.custom_id, parsed.success ? parsed.data : null)
      if (!parsed.success) {
        logger?.warn(
          { event: 'ENRICHMENT_SOURCING_INVALID_OUTPUT', customId: entry.custom_id },
          'Sortie sourcing invalide',
        )
      }
    } catch {
      results.set(entry.custom_id, null)
    }
  }
  return { status: 'ended', results }
}
