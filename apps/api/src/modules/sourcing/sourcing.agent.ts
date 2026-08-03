import {
  getAnthropicClient,
  createWithPauseResume,
  extractJson,
  textOf,
  webSearchTool,
} from '../../lib/anthropic.js'
import { sourcingOffersOutputSchema } from 'shared/validators'
import type { SourcingOffersOutput } from 'shared/validators'
import { PROMPT_SOURCING_OFFERS, SCHEMA_SOURCING_OFFERS, PROMPT_SUPPLIER_MESSAGE } from './sourcing.prompts.js'

type Logger = { warn: (obj: Record<string, unknown>, msg: string) => void }

/** Même modèle que la passe 2 d'enrichissement : recherche web + raisonnement. */
export const sourcingModel = () => process.env.ENRICHMENT_PASS2_MODEL ?? 'claude-sonnet-4-6'

/**
 * Borne de coût et de latence d'une recherche. 12 recherches web ≈ 30–90 s ;
 * au-delà l'agent explore sans rien trouver de neuf.
 */
const MAX_WEB_SEARCHES = 12

export interface OfferSearchInput {
  partName: string
  oemReference?: string | null
  vehicleBrand?: string | null
  vehicleModel?: string | null
  vehicleYear?: number | null
  quantity?: number | null
}

/**
 * Recherche d'offres réelles. Renvoie `null` sur erreur API ou sortie invalide
 * (le handler marque alors la recherche FAILED — l'ops relance ou cherche à la
 * main). Aucune exception ne remonte : une panne Claude ne doit pas casser le
 * traitement d'une demande client.
 */
export async function runOfferSearch(
  input: OfferSearchInput,
  logger?: Logger,
): Promise<SourcingOffersOutput | null> {
  try {
    const response = await createWithPauseResume({
      model: sourcingModel(),
      max_tokens: 8192,
      system: PROMPT_SOURCING_OFFERS,
      tools: [webSearchTool(MAX_WEB_SEARCHES)],
      messages: [
        {
          role: 'user',
          content: `PIÈCE RECHERCHÉE\n${JSON.stringify(
            {
              piece: input.partName,
              referenceOem: input.oemReference ?? null,
              vehicule: [input.vehicleBrand, input.vehicleModel, input.vehicleYear]
                .filter(Boolean)
                .join(' ') || null,
              quantite: input.quantity ?? 1,
              destination: 'Abidjan, Côte d\'Ivoire',
            },
            null,
            2,
          )}\n\nSCHÉMA DE SORTIE\n${SCHEMA_SOURCING_OFFERS}`,
        },
      ],
    })

    const parsed = sourcingOffersOutputSchema.safeParse(extractJson(textOf(response.content)))
    if (!parsed.success) {
      logger?.warn(
        { event: 'SOURCING_SEARCH_INVALID_OUTPUT', issues: parsed.error.issues.slice(0, 3) },
        'Sortie de recherche d\'offres invalide',
      )
      return null
    }
    return parsed.data
  } catch (err) {
    logger?.warn(
      { event: 'SOURCING_SEARCH_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude sur la recherche d\'offres',
    )
    return null
  }
}

export interface SupplierMessageInput {
  supplierName: string
  country?: string | null
  partName: string
  oemReference?: string | null
  vehicle?: string | null
  quantity: number
  offerTitle?: string | null
  offerUrl?: string | null
}

/**
 * Brouillon de message d'enquête. Appel court, SANS recherche web. Le texte
 * n'est jamais envoyé automatiquement : `sourcing.service` le renvoie à l'ops,
 * qui déclenche l'envoi.
 */
export async function draftSupplierMessage(
  input: SupplierMessageInput,
  logger?: Logger,
): Promise<string | null> {
  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: sourcingModel(),
      max_tokens: 1024,
      system: PROMPT_SUPPLIER_MESSAGE,
      messages: [{ role: 'user', content: `CONTEXTE\n${JSON.stringify(input, null, 2)}` }],
    })
    const text = textOf(response.content).trim()
    return text.length > 0 ? text : null
  } catch (err) {
    logger?.warn(
      { event: 'SOURCING_MESSAGE_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude sur le brouillon de message fournisseur',
    )
    return null
  }
}
