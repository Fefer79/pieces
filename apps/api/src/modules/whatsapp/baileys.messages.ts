import { looksLikeLoginCode, verifyLoginCode } from '../auth/whatsappLogin.service.js'

// ---------------------------------------------------------------------------
// Baileys message handling — pure logic, no dependency on the baileys package
// so it stays unit-testable without opening a WhatsApp socket.
//
// Since the 2025 LID migration, `key.remoteJid` may be an anonymized
// `<id>@lid`; the certified phone number then lives in `key.remoteJidAlt`.
// The reverse-OTP proof of possession requires the real phone number, so a
// message whose sender phone cannot be resolved is ignored.
// ---------------------------------------------------------------------------

export interface BaileysMessageKey {
  remoteJid?: string | null
  remoteJidAlt?: string | null
  fromMe?: boolean | null
}

export interface BaileysMessageContent {
  conversation?: string | null
  extendedTextMessage?: { text?: string | null } | null
  ephemeralMessage?: { message?: BaileysMessageContent | null } | null
}

export interface BaileysIncomingMessage {
  key?: BaileysMessageKey | null
  message?: BaileysMessageContent | null
}

const USER_JID_SUFFIX = '@s.whatsapp.net'

/** "2250700000000:3@s.whatsapp.net" → "2250700000000" (digits only, no '+'). */
function jidToPhone(jid: string): string | null {
  if (!jid.endsWith(USER_JID_SUFFIX)) return null
  const digits = jid.slice(0, -USER_JID_SUFFIX.length).split(':')[0] ?? ''
  return /^\d{8,15}$/.test(digits) ? digits : null
}

/**
 * Resolve the Meta-certified sender phone from a message key. Direct chats
 * only: group ("@g.us"), broadcast and unresolved LID-only senders return null.
 */
export function extractSenderPhone(key: BaileysMessageKey | null | undefined): string | null {
  if (!key) return null
  for (const jid of [key.remoteJid, key.remoteJidAlt]) {
    if (jid) {
      const phone = jidToPhone(jid)
      if (phone) return phone
    }
  }
  return null
}

/** Text body of a message, unwrapping disappearing-mode envelopes. */
export function extractMessageText(content: BaileysMessageContent | null | undefined): string | null {
  if (!content) return null
  if (content.conversation) return content.conversation
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text
  if (content.ephemeralMessage?.message) return extractMessageText(content.ephemeralMessage.message)
  return null
}

export type BaileysHandleResult = 'verified' | 'rejected' | 'ignored'

/**
 * Reverse-OTP handling for one incoming Baileys message. Mirrors the login
 * branch of the Cloud API webhook (whatsapp.routes.ts): a text matching a
 * login code from a certified sender proves possession of the phone.
 * Anything else is ignored (no bot features on the Baileys channel yet).
 */
export async function handleBaileysMessage(
  msg: BaileysIncomingMessage,
  sendText: (jid: string, text: string) => Promise<unknown>,
): Promise<BaileysHandleResult> {
  if (!msg.key || msg.key.fromMe) return 'ignored'

  const senderPhone = extractSenderPhone(msg.key)
  const text = extractMessageText(msg.message)
  if (!senderPhone || !text || !looksLikeLoginCode(text)) return 'ignored'

  const replyJid = msg.key.remoteJid ?? `${senderPhone}${USER_JID_SUFFIX}`
  const result = await verifyLoginCode(text, senderPhone)
  if (result.ok) {
    await sendText(replyJid, '✅ Connecté ! Retournez sur Pièces, votre session est active.')
    return 'verified'
  }
  await sendText(replyJid, '❌ Code de connexion invalide ou expiré. Recommencez depuis la page de connexion.')
  return 'rejected'
}
