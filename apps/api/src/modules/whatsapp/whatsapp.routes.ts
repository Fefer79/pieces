import type { FastifyInstance, FastifyRequest } from 'fastify'
import {
  getVerifyToken,
  parseIncomingMessage,
  sendWhatsAppMessage,
  verifyWebhookSignature,
  findUserByWhatsApp,
  downloadWhatsAppMedia,
  formatSearchResults,
  getSession,
  setSession,
  clearSession,
  getOrderThreshold,
} from './whatsapp.service.js'
import type { SearchResultItem } from './whatsapp.service.js'
import { searchParts } from '../browse/browse.service.js'
import { identifyFromPhoto } from '../vision/vision.service.js'
import { searchByCategory } from '../vision/vision.service.js'
import { createOrder } from '../order/order.service.js'
import { AppError } from '../../lib/appError.js'

// Augment FastifyRequest to carry the raw body for HMAC verification
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string
  }
}

export async function whatsappRoutes(fastify: FastifyInstance) {
  // Capture raw body BEFORE Fastify parses JSON — required for HMAC signature verification.
  // Scoped to this plugin only (Fastify encapsulation).
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as FastifyRequest).rawBody = (body as Buffer).toString('utf8')
    try {
      done(null, JSON.parse((body as Buffer).toString('utf8')))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // Webhook verification (GET)
  fastify.get(
    '/webhook',
    {
      schema: {
        tags: ['WhatsApp'],
        description: 'Vérification du webhook WhatsApp (Meta)',
      },
    },
    async (request, reply) => {
      const query = request.query as { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string }

      if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === getVerifyToken()) {
        return reply.status(200).send(query['hub.challenge'])
      }

      return reply.status(403).send('Forbidden')
    },
  )

  // Webhook incoming messages (POST) — HMAC verified
  fastify.post(
    '/webhook',
    {
      schema: {
        tags: ['WhatsApp'],
        description: 'Réception des messages WhatsApp entrants',
      },
    },
    async (request, reply) => {
      // Verify HMAC signature from Meta using the original raw body bytes
      const signature = request.headers['x-hub-signature-256'] as string | undefined
      const rawBody = request.rawBody ?? JSON.stringify(request.body)
      if (!verifyWebhookSignature(rawBody, signature)) {
        throw new AppError('WHATSAPP_INVALID_SIGNATURE', 401, { message: 'Invalid webhook signature' })
      }

      const body = request.body as Record<string, unknown>
      const { from, text, imageId, imageMimeType } = parseIncomingMessage(body)

      if (!from) {
        return reply.status(200).send({ status: 'ignored' })
      }

      // AC1: Link WhatsApp number to User account
      const user = await findUserByWhatsApp(from)
      const vehicleFilter = user?.vehicles?.[0]
        ? { brand: user.vehicles[0].brand ?? undefined, model: user.vehicles[0].model ?? undefined }
        : undefined

      // Check for active session (AC4, AC6: disambiguation or selection context)
      if (text) {
        const session = getSession(from)

        // Handle session-based responses first
        if (session && session.type === 'disambiguation') {
          await handleDisambiguationResponse(from, text, session.data.category!, vehicleFilter)
          return reply.status(200).send({ status: 'ok' })
        }

        if (session && session.type === 'selection') {
          const handled = await handleSelectionResponse(from, text, session.data.items!, user?.id)
          if (handled) {
            return reply.status(200).send({ status: 'ok' })
          }
          // Not a number — fall through to normal command handling
        }

        const command = text.trim().toLowerCase()

        if (command === 'aide' || command === 'help') {
          await sendWhatsAppMessage(from, 'Bienvenue sur Pièces! Envoyez une photo de votre pièce auto pour l\'identifier, ou tapez "recherche [nom]" pour chercher.')
        } else if (command.startsWith('recherche ')) {
          // AC2: Real catalog search
          await handleSearch(from, text.slice(10).trim())
        } else {
          await sendWhatsAppMessage(from, 'Commande non reconnue. Tapez "aide" pour les options disponibles.')
        }
      }

      if (imageId) {
        // AC3: Real photo AI identification (use actual MIME type from webhook)
        const mimeType = imageMimeType ?? 'image/jpeg'
        await handlePhotoIdentification(from, imageId, mimeType, vehicleFilter, request.log)
      }

      return reply.status(200).send({ status: 'ok' })
    },
  )
}

// AC2: Real search handler
async function handleSearch(from: string, query: string) {
  try {
    const results = await searchParts(query, { limit: 5 })
    const message = formatSearchResults(results.items as SearchResultItem[], results.query)
    await sendWhatsAppMessage(from, message)

    // Save session for selection if results found
    if (results.items.length > 0) {
      setSession(from, {
        type: 'selection',
        data: { items: results.items.slice(0, 5) as SearchResultItem[] },
      })
    }
  } catch {
    await sendWhatsAppMessage(from, 'Erreur lors de la recherche. Veuillez réessayer.')
  }
}

// AC3: Real photo identification handler
async function handlePhotoIdentification(
  from: string,
  imageId: string,
  mimeType: string,
  vehicleFilter?: { brand?: string; model?: string },
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
) {
  try {
    await sendWhatsAppMessage(from, '📸 Photo reçue ! Identification en cours...')

    const imageBuffer = await downloadWhatsAppMedia(imageId)
    const result = await identifyFromPhoto(imageBuffer, mimeType, vehicleFilter, logger)

    if (result.status === 'identified' && result.matchingParts.length > 0) {
      // High confidence: show matching parts
      const items = result.matchingParts.slice(0, 5) as SearchResultItem[]
      const partName = result.identification?.name ?? 'pièce identifiée'
      const message = formatSearchResults(items, partName)
      await sendWhatsAppMessage(from, message)

      setSession(from, { type: 'selection', data: { items } })
    } else if (result.status === 'identified') {
      // Identified but no matching parts in catalog
      const name = result.identification?.name ?? 'Pièce'
      await sendWhatsAppMessage(from, `✅ Pièce identifiée : *${name}* (${result.identification?.category ?? ''})\n\nAucune correspondance en catalogue pour le moment. Essayez "recherche ${name}".`)
    } else if (result.status === 'disambiguation') {
      // AC4: Disambiguation flow
      const category = result.identification?.category ?? 'Pièce auto'
      await sendWhatsAppMessage(from, `🤔 Identification incertaine.\n\nEst-ce un(e) *${category}* ?\n\nRépondez *O* pour oui, ou tapez le nom de la catégorie.`)

      setSession(from, { type: 'disambiguation', data: { category } })
    } else {
      // Failed
      await sendWhatsAppMessage(from, '❌ Impossible d\'identifier cette pièce. Essayez une autre photo ou tapez "recherche [nom]".')
    }
  } catch {
    await sendWhatsAppMessage(from, '❌ Erreur lors de l\'identification. Veuillez réessayer.')
  }
}

// AC4: Disambiguation response handler
async function handleDisambiguationResponse(
  from: string,
  text: string,
  sessionCategory: string,
  vehicleFilter?: { brand?: string },
) {
  clearSession(from)

  const answer = text.trim().toLowerCase()
  const category = (answer === 'o' || answer === 'oui') ? sessionCategory : text.trim()

  try {
    const items = await searchByCategory(category, vehicleFilter) as SearchResultItem[]
    if (items.length === 0) {
      await sendWhatsAppMessage(from, `Aucune pièce trouvée dans la catégorie "${category}". Essayez "recherche [nom]".`)
      return
    }

    const message = formatSearchResults(items.slice(0, 5), category)
    await sendWhatsAppMessage(from, message)

    setSession(from, { type: 'selection', data: { items: items.slice(0, 5) } })
  } catch {
    await sendWhatsAppMessage(from, 'Erreur lors de la recherche. Veuillez réessayer.')
  }
}

// AC5: Selection response handler (user picks a numbered result)
async function handleSelectionResponse(
  from: string,
  text: string,
  items: SearchResultItem[],
  userId?: string,
): Promise<boolean> {
  const trimmed = text.trim()
  const num = parseInt(trimmed, 10)

  if (isNaN(num) || num < 1 || num > items.length) {
    return false // Not a selection — let normal command handler process it
  }

  clearSession(from)
  const selectedItem = items[num - 1]!
  const price = selectedItem.price ?? 0

  if (price >= getOrderThreshold()) {
    // High value: send link to detailed page
    await sendWhatsAppMessage(from, `💰 *${selectedItem.name}* — ${price.toLocaleString('fr-FR')} FCFA\n\nPour commander, visitez : https://pieces.ci/browse`)
    return true
  }

  // Low value: create order directly
  try {
    if (!userId) {
      // Anonymous user — send link to browse instead of creating order
      await sendWhatsAppMessage(from, `💰 *${selectedItem.name}* — ${price.toLocaleString('fr-FR')} FCFA\n\nPour commander, visitez : https://pieces.ci/browse`)
      return true
    }

    const order = await createOrder(userId, [{ catalogItemId: selectedItem.id }], { ownerPhone: `+${from}` })
    const shareUrl = `https://pieces.ci/choose/${order.shareToken}`

    await sendWhatsAppMessage(from, `✅ Commande créée !\n\n*${selectedItem.name}* — ${price.toLocaleString('fr-FR')} FCFA\n\n💳 Finalisez votre paiement ici :\n${shareUrl}`)
    return true
  } catch {
    await sendWhatsAppMessage(from, 'Erreur lors de la création de la commande. Veuillez réessayer.')
    return true
  }
}
