/**
 * Enregistre manuellement un utilisateur WhatsApp quand il envoie une demande,
 * tant que le bot (webhook Meta) n'est pas branché en prod — cf. mémoire
 * "TODO WhatsApp token not set in prod".
 *
 * Crée (ou met à jour) le compte par numéro de téléphone, exactement comme le
 * ferait le bot après un "OUI" : rôle ACHETEUR (OWNER), consentement horodaté, même
 * supabaseId synthétique `wa:+225…`. Idempotent.
 *
 * Usage (⚠️ toujours viser la PROD db.prisma.io, PAS le .env fantôme) :
 *   cd apps/api
 *   DATABASE_URL='postgres://…@db.prisma.io:5432/postgres?sslmode=require' \
 *     pnpm tsx scripts/register-whatsapp-user.mts \
 *     --phone +2250700000000 [--name "Kouassi"]
 *
 * Le numéro accepte les formats +2250700000000, 2250700000000 ou 0700000000
 * (préfixe +225 ajouté automatiquement pour un numéro ivoirien à 10 chiffres).
 */
import { registerWhatsAppUser, normalizeWaNumber } from '../src/modules/whatsapp/whatsapp.service.js'
import { prisma } from '../src/lib/prisma.js'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

const phoneArg = arg('--phone')
const name = arg('--name')

if (!phoneArg) {
  console.error('Usage: --phone <+2250700000000> [--name "Nom"]')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL ?? ''
if (dbUrl.includes('supabase')) {
  console.error(
    '✋ DATABASE_URL pointe vers la base Supabase fantôme, pas la prod.\n' +
      "   Relance avec DATABASE_URL='…@db.prisma.io…' inline (cf. mémoire env-points-to-wrong-db).",
  )
  process.exit(1)
}

const waNumber = normalizeWaNumber(phoneArg)
if (!waNumber) {
  console.error(`Numéro invalide : "${phoneArg}". Attendu : +2250700000000 ou 0700000000.`)
  process.exit(1)
}

const user = await registerWhatsAppUser(waNumber)
if (name) {
  await prisma.user.update({ where: { id: user.id }, data: { name } })
}

console.log(`✅ Utilisateur enregistré : +${waNumber}${name ? ` (${name})` : ''}`)
console.log(`   id=${user.id} · rôles=${user.roles.join(', ')}`)
await prisma.$disconnect()
