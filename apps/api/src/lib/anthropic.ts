import Anthropic from '@anthropic-ai/sdk'
import { AppError } from './appError.js'

/**
 * Client API Claude (Agent Fiche Terrain). La clé est optionnelle : sans
 * ANTHROPIC_API_KEY les endpoints d'enrichissement répondent 503, le reste
 * de l'API fonctionne normalement.
 */

let clientInstance: Anthropic | null = null

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function getAnthropicClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return clientInstance
}

/** Réinitialise le singleton (tests). */
export function resetAnthropicClient() {
  clientInstance = null
}

/** Concatène les blocs texte d'une réponse Messages. */
export function textOf(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
}

/**
 * Extrait le premier objet JSON d'un texte de réponse : tolère les fences
 * markdown et le texte parasite autour (les prompts imposent du JSON pur,
 * ceci est le filet de sécurité).
 */
export function extractJson(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
  try {
    return JSON.parse(stripped)
  } catch {
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start === -1 || end <= start) {
      throw new AppError('ENRICHMENT_AGENT_OUTPUT', 502, { message: 'Aucun JSON dans la réponse agent' })
    }
    return JSON.parse(stripped.slice(start, end + 1))
  }
}

type MessageCreateParams = Parameters<Anthropic['messages']['create']>[0]

/**
 * Appel Messages avec reprise automatique sur `pause_turn` (la recherche web
 * côté serveur peut suspendre le tour après 10 itérations internes).
 */
export async function createWithPauseResume(
  params: MessageCreateParams & { stream?: false },
  maxContinuations = 4,
): Promise<Anthropic.Message> {
  const client = getAnthropicClient()
  let messages = [...params.messages]
  let response = (await client.messages.create({ ...params, messages })) as Anthropic.Message

  let continuations = 0
  while (response.stop_reason === 'pause_turn' && continuations < maxContinuations) {
    continuations++
    messages = [...messages, { role: 'assistant', content: response.content }]
    response = (await client.messages.create({ ...params, messages })) as Anthropic.Message
  }

  return response
}
