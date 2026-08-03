import {
  getAnthropicClient,
  createWithPauseResume,
  extractJson,
  textOf,
  webSearchTool,
} from '../../lib/anthropic.js'
import { sourcingOffersOutputSchema } from 'shared/validators'
import type { SourcingOffersOutput } from 'shared/validators'
import {
  PROMPT_SOURCING_OFFERS,
  SCHEMA_SOURCING_OFFERS,
  PROMPT_SUPPLIER_MESSAGE,
  buildOfferSearchQuery,
} from './sourcing.prompts.js'

type Logger = { warn: (obj: Record<string, unknown>, msg: string) => void }

/**
 * Même modèle que la passe 2 de l'enrichissement : c'est le même profil de
 * tâche (recherche web + synthèse structurée), inutile d'ajouter une variable
 * d'environnement de plus.
 */
export const sourcingModel = () => process.env.ENRICHMENT_PASS2_MODEL ?? 'claude-sonnet-4-6'

/** Plafond de recherches web par exécution — borne le coût d'une recherche. */
export const MAX_WEB_SEARCHES = 12

export interface OfferSearchInput {
  partName: string
  oemReference?: string | null
  vehicleBrand?: string | null
  vehicleModel?: string | null
  vehicleYear?: number | null
  quantity?: number | null
}

/**
 * Recherche d'offres achetables (30-90 s, jusqu'à 12 recherches web). Renvoie
 * `null` sur sortie invalide ou erreur API : le handler marque alors la
 * recherche FAILED et l'ops reprend à la main — on ne fabrique jamais d'offres
 * de repli.
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
          content: `PIÈCE RECHERCHÉE\n${buildOfferSearchQuery(input)}\n\nSCHÉMA DE SORTIE\n${SCHEMA_SOURCING_OFFERS}`,
        },
      ],
    })

    const parsed = sourcingOffersOutputSchema.safeParse(extractJson(textOf(response.content)))
    if (!parsed.success) {
      logger?.warn(
        { event: 'SOURCING_OFFERS_INVALID_OUTPUT', issues: parsed.error.issues.slice(0, 3) },
        'Sortie agent sourcing invalide',
      )
      return null
    }
    return parsed.data
  } catch (err) {
    logger?.warn(
      { event: 'SOURCING_OFFERS_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude sourcing',
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
  quantity?: number | null
  offerUrl?: string | null
}

/**
 * Brouillon de message d'enquête fournisseur. Appel court, SANS recherche web.
 * `null` sur erreur : l'ops écrit alors son message lui-même, rien ne bloque.
 */
export async function draftSupplierMessage(
  input: SupplierMessageInput,
  logger?: Logger,
): Promise<string | null> {
  try {
    const client = getAnthropicClient()
    const lines = [
      `Fournisseur : ${input.supplierName}`,
      input.country ? `Pays : ${input.country}` : null,
      `Pièce : ${input.partName}`,
      input.oemReference ? `Référence OEM : ${input.oemReference}` : null,
      input.vehicle ? `Véhicule : ${input.vehicle}` : null,
      `Quantité : ${input.quantity ?? 1}`,
      input.offerUrl ? `Annonce : ${input.offerUrl}` : null,
    ].filter(Boolean)

    const response = await client.messages.create({
      model: sourcingModel(),
      max_tokens: 1024,
      system: PROMPT_SUPPLIER_MESSAGE,
      messages: [{ role: 'user', content: lines.join('\n') }],
    })

    const text = textOf(response.content as Array<{ type: string; text?: string }>).trim()
    return text.length > 0 ? text : null
  } catch (err) {
    logger?.warn(
      { event: 'SOURCING_MESSAGE_API_ERROR', error: err instanceof Error ? err.message : 'unknown' },
      'Erreur API Claude brouillon fournisseur',
    )
    return null
  }
}
