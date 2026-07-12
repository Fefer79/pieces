// ---------------------------------------------------------------------------
// Baileys sender registry — lets other modules send a WhatsApp text through the
// live Baileys socket WITHOUT importing the heavy `baileys` package (which the
// server keeps out of the process unless WHATSAPP_PROVIDER=baileys).
//
// The gateway registers its socket's send function on connect and clears it on
// disconnect; consumers call sendBaileysText(). Keep sends strictly
// transactional (confirmations, replies) — never outbound campaigns — to stay
// under Meta's spam heuristics on this unofficial channel.
// ---------------------------------------------------------------------------

type SendMessage = (jid: string, content: { text: string }) => Promise<unknown>

const USER_JID_SUFFIX = '@s.whatsapp.net'

let sendFn: SendMessage | null = null

/** Called by the gateway: pass the socket sender on connect, null on disconnect. */
export function registerBaileysSender(fn: SendMessage | null): void {
  sendFn = fn
}

/** True when a Baileys socket is currently connected and able to send. */
export function isBaileysConnected(): boolean {
  return sendFn !== null
}

/**
 * Send a plain text to a phone number (any format — normalized to digits).
 * Returns false if no socket is connected or the send throws.
 */
export async function sendBaileysText(phone: string, text: string): Promise<boolean> {
  if (!sendFn) return false
  const digits = phone.replace(/\D/g, '')
  if (!digits) return false
  try {
    await sendFn(`${digits}${USER_JID_SUFFIX}`, { text })
    return true
  } catch {
    return false
  }
}
