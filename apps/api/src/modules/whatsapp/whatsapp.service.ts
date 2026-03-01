import crypto from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'pieces-verify-token'
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET
const GRAPH_API_VERSION = 'v18.0'
const SESSION_TTL_MS = 5 * 60 * 1000 // 5 minutes
const WHATSAPP_ORDER_THRESHOLD = 25_000 // FCFA

// ---------- Session Management (in-memory, Phase 1 pilot ≤20 users) ----------

export interface SearchResultItem {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { id: string; shopName: string }
}

export interface WhatsAppSession {
  type: 'disambiguation' | 'selection'
  data: {
    category?: string
    items?: SearchResultItem[]
  }
  expiresAt: Date
}

const sessions = new Map<string, WhatsAppSession>()

export function getSession(waNumber: string): WhatsAppSession | null {
  const session = sessions.get(waNumber)
  if (!session) return null
  if (session.expiresAt < new Date()) {
    sessions.delete(waNumber)
    return null
  }
  return session
}

export function setSession(waNumber: string, session: Omit<WhatsAppSession, 'expiresAt'>) {
  sessions.set(waNumber, { ...session, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
}

export function clearSession(waNumber: string) {
  sessions.delete(waNumber)
}

// Exposed for testing
export function _getSessionsMap() { return sessions }

// ---------- User Lookup ----------

export async function findUserByWhatsApp(waNumber: string) {
  const phone = `+${waNumber}`
  return prisma.user.findUnique({
    where: { phone },
    include: { vehicles: true },
  })
}

// ---------- Media Download ----------

export async function downloadWhatsAppMedia(imageId: string): Promise<Buffer> {
  if (!WHATSAPP_TOKEN) throw new Error('WhatsApp not configured')

  // Step 1: Get media URL
  const mediaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${imageId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!mediaRes.ok) throw new Error('Failed to get media URL')
  const mediaData = (await mediaRes.json()) as { url?: string }
  if (!mediaData.url) throw new Error('No media URL returned')

  // Step 2: Download the image
  const imageRes = await fetch(mediaData.url, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!imageRes.ok) throw new Error('Failed to download media')
  return Buffer.from(await imageRes.arrayBuffer())
}

// ---------- Formatting ----------

export function formatSearchResults(items: SearchResultItem[], query?: string): string {
  if (items.length === 0) {
    return `🔍 Aucun résultat${query ? ` pour "${query}"` : ''}.\n\nEssayez avec un terme différent ou envoyez une photo.`
  }

  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
  const header = query ? `🔍 Résultats pour "${query}" :\n` : '🔍 Résultats :\n'

  const lines = items.slice(0, 5).map((item, i) => {
    const price = item.price ? `${item.price.toLocaleString('fr-FR')} FCFA` : 'Prix non disponible'
    return `${emojis[i]} *${item.name ?? 'Pièce'}*\n   💰 ${price} — 🏪 ${item.vendor.shopName}`
  })

  const hasOrderable = items.some((item) => (item.price ?? 0) > 0)
  const footer = hasOrderable
    ? '\nRépondez le numéro pour commander, ou "recherche" pour chercher autre chose.'
    : ''

  return header + '\n' + lines.join('\n\n') + footer
}

export function getOrderThreshold() {
  return WHATSAPP_ORDER_THRESHOLD
}

export function getVerifyToken() {
  return WHATSAPP_VERIFY_TOKEN
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!WHATSAPP_APP_SECRET) return true // Skip in dev when not configured
  if (!signature) return false

  const expectedSig = crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest('hex')

  return signature === `sha256=${expectedSig}`
}

export async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return { success: false, reason: 'WhatsApp not configured' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      },
    )

    if (!res.ok) {
      return { success: false, reason: 'WhatsApp API error' }
    }

    return { success: true }
  } catch {
    return { success: false, reason: 'Network error' }
  }
}

export async function sendWhatsAppTemplate(to: string, templateName: string, params: string[]) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return { success: false, reason: 'WhatsApp not configured' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'fr' },
            components: params.length > 0 ? [{
              type: 'body',
              parameters: params.map((p) => ({ type: 'text', text: p })),
            }] : undefined,
          },
        }),
      },
    )

    return { success: res.ok }
  } catch {
    return { success: false, reason: 'Network error' }
  }
}

interface WhatsAppMessage {
  from?: string
  type?: string
  text?: { body?: string }
  image?: { id?: string; mime_type?: string }
}

interface WhatsAppWebhookEntry {
  changes?: Array<{ value?: { messages?: WhatsAppMessage[] } }>
}

export function parseIncomingMessage(body: Record<string, unknown>): {
  from: string | null
  text: string | null
  imageId: string | null
  imageMimeType: string | null
} {
  try {
    const entries = body.entry as WhatsAppWebhookEntry[] | undefined
    const entry = entries?.[0]
    const change = entry?.changes?.[0]
    const message = change?.value?.messages?.[0]

    if (!message) return { from: null, text: null, imageId: null, imageMimeType: null }

    return {
      from: message.from ?? null,
      text: message.type === 'text' ? (message.text?.body ?? null) : null,
      imageId: message.type === 'image' ? (message.image?.id ?? null) : null,
      imageMimeType: message.type === 'image' ? (message.image?.mime_type ?? null) : null,
    }
  } catch {
    return { from: null, text: null, imageId: null, imageMimeType: null }
  }
}
