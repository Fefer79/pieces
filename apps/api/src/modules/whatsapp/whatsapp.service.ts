import crypto from 'node:crypto'

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'pieces-verify-token'
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET
const GRAPH_API_VERSION = 'v18.0'

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
  image?: { id?: string }
}

interface WhatsAppWebhookEntry {
  changes?: Array<{ value?: { messages?: WhatsAppMessage[] } }>
}

export function parseIncomingMessage(body: Record<string, unknown>): {
  from: string | null
  text: string | null
  imageId: string | null
} {
  try {
    const entries = body.entry as WhatsAppWebhookEntry[] | undefined
    const entry = entries?.[0]
    const change = entry?.changes?.[0]
    const message = change?.value?.messages?.[0]

    if (!message) return { from: null, text: null, imageId: null }

    return {
      from: message.from ?? null,
      text: message.type === 'text' ? (message.text?.body ?? null) : null,
      imageId: message.type === 'image' ? (message.image?.id ?? null) : null,
    }
  } catch {
    return { from: null, text: null, imageId: null }
  }
}
