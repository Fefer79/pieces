const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'pieces-verify-token'

export function getVerifyToken() {
  return WHATSAPP_VERIFY_TOKEN
}

export async function sendWhatsAppMessage(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    return { success: false, reason: 'WhatsApp not configured' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
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
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
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

export function parseIncomingMessage(body: Record<string, unknown>): {
  from: string | null
  text: string | null
  imageId: string | null
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = body.entry as any[]
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
