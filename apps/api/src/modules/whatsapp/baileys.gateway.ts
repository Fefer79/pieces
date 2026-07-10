import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from 'baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import type { FastifyBaseLogger } from 'fastify'
import { handleBaileysMessage } from './baileys.messages.js'

// ---------------------------------------------------------------------------
// Baileys gateway (WHATSAPP_PROVIDER=baileys) — free reverse-OTP channel.
//
// Connects a regular WhatsApp account over the WhatsApp Web protocol instead
// of the Meta Cloud API, so the login flow costs nothing and needs no extra
// number. Unofficial protocol: keep this channel strictly user-initiated
// (receive codes, reply confirmations) to stay under Meta's spam heuristics,
// and never run outbound campaigns from it.
//
// First run: link the account either by scanning the QR printed in the logs,
// or — headless deploys — by setting BAILEYS_PAIRING_PHONE to the account's
// number (digits only) and typing the logged pairing code in WhatsApp
// (Appareils connectés → Connecter un appareil → Connecter par numéro).
// Credentials persist in BAILEYS_AUTH_DIR; wipe the directory to re-link.
// ---------------------------------------------------------------------------

const RECONNECT_DELAY_MS = 5_000

let stopped = false
let pairingRequested = false

export async function startBaileysGateway(log: FastifyBaseLogger): Promise<void> {
  const authDir = process.env.BAILEYS_AUTH_DIR ?? '.baileys-auth'
  const pairingPhone = process.env.BAILEYS_PAIRING_PHONE?.replace(/\D/g, '') || null

  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    // Baileys logs are extremely chatty; the gateway logs what matters itself.
    logger: pino({ level: 'silent' }),
    // Stay "offline" so the linked phone keeps receiving its own notifications.
    markOnlineOnConnect: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr && !state.creds.registered) {
      if (pairingPhone && !pairingRequested) {
        pairingRequested = true
        sock
          .requestPairingCode(pairingPhone)
          .then((code) => log.warn(`[baileys] Code d'appairage WhatsApp : ${code}`))
          .catch((err) => log.error({ err }, '[baileys] requestPairingCode failed'))
      } else if (!pairingPhone) {
        log.warn('[baileys] Scannez ce QR avec WhatsApp (Appareils connectés) :')
        qrcode.generate(qr, { small: true })
      }
    }

    if (connection === 'open') {
      log.info('[baileys] WhatsApp gateway connected')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
        ?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        log.error(
          `[baileys] Session déconnectée par WhatsApp. Supprimez ${authDir} puis relancez pour ré-appairer.`,
        )
        return
      }
      if (stopped) return
      log.warn({ statusCode }, `[baileys] Connection closed, reconnecting in ${RECONNECT_DELAY_MS}ms`)
      setTimeout(() => {
        startBaileysGateway(log).catch((err) => log.error({ err }, '[baileys] reconnect failed'))
      }, RECONNECT_DELAY_MS)
    }
  })

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      handleBaileysMessage(msg, (jid, text) => sock.sendMessage(jid, { text }))
        .then((result) => {
          if (result !== 'ignored') log.info({ result }, '[baileys] login code processed')
        })
        .catch((err) => log.error({ err }, '[baileys] message handling failed'))
    }
  })
}

/** Prevent reconnect loops during graceful shutdown (used by tests). */
export function stopBaileysGateway() {
  stopped = true
}
