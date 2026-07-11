// Appairage du compte WhatsApp Baileys sans booter tout le serveur (aucune DB requise).
//
//   pnpm -F api whatsapp:pair
//
// Prérequis dans apps/api/.env : BAILEYS_PAIRING_PHONE=<numéro en chiffres> pour
// un code d'appairage dans les logs, sinon un QR est affiché. La session est
// persistée dans BAILEYS_AUTH_DIR (défaut .baileys-auth) et sera réutilisée par
// le serveur au prochain démarrage avec WHATSAPP_PROVIDER=baileys.
// Laisser tourner jusqu'au log "WhatsApp gateway connected", puis Ctrl-C.
import pino from 'pino'
import { startBaileysGateway } from '../src/modules/whatsapp/baileys.gateway.js'

const log = pino({ level: 'info' })
startBaileysGateway(log as never).catch((err) => {
  console.error("Échec de la passerelle d'appairage :", err)
  process.exit(1)
})
