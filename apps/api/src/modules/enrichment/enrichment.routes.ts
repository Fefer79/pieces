import type { FastifyInstance, FastifyRequest } from 'fastify'
import {
  enrichmentCompleteSchema,
  enrichmentModerateSchema,
  enrichmentArbitrateSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { AppError } from '../../lib/appError.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createEnrichment,
  getEnrichment,
  listEnrichments,
  completeEnrichment,
  moderateEnrichment,
  arbitrateEnrichment,
  generateDeliverables,
  getQualitySheetForPart,
} from './enrichment.service.js'
import type { EnrichmentActor, EnrichmentPhotoInput } from './enrichment.service.js'

function actorOf(request: FastifyRequest): EnrichmentActor {
  const role = request.user.activeContext
  if (role !== 'LIAISON' && role !== 'SELLER' && role !== 'ADMIN') {
    throw new AppError('ENRICHMENT_FORBIDDEN', 403, { message: 'Contexte non autorisé' })
  }
  return { userId: request.user.id, role }
}

export async function enrichmentRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('LIAISON', 'SELLER', 'ADMIN')]
  const adminGuard = [requireAuth, requireRole('ADMIN')]

  // POST / — photos (2–4) → fiche brouillon en < 10 s (passe 1, vision seule).
  // Les compatibilités (passe 2) arrivent en tâche de fond pendant la saisie
  // prix / stock. Capture caméra imposée côté app vendeur (pas d'import galerie).
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Créer une fiche produit par photos (Agent Fiche Terrain)',
        consumes: ['multipart/form-data'],
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const actor = actorOf(request)

      const photos: EnrichmentPhotoInput[] = []
      const fields: Record<string, string> = {}
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (photos.length >= 4) {
            // Draine le flux excédentaire pour ne pas bloquer la requête.
            await part.toBuffer()
            continue
          }
          photos.push({
            buffer: await part.toBuffer(),
            mimeType: part.mimetype,
            fileName: part.filename ?? `photo_${photos.length + 1}.jpg`,
          })
        } else if (typeof part.value === 'string') {
          fields[part.fieldname] = part.value
        }
      }

      const result = await createEnrichment(
        actor,
        photos,
        { vendeurId: fields.vendeurId, fournisseurVisite: fields.fournisseurVisite },
        request.log,
      )
      request.log.info({
        event: 'ENRICHMENT_CREATED',
        actorId: actor.userId,
        role: actor.role,
        enrichmentId: (result as { id: string }).id,
      })
      return reply.status(201).send({ data: result })
    },
  )

  // GET / — liste : ses fiches ; ?file=moderation (Liaison) : fiches vendeur à
  // modérer ; ?file=inspections (Liaison) : contrôles qualité à programmer.
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Lister les fiches (portée selon le rôle)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listEnrichments(actorOf(request), request.query)
      return reply.status(200).send({ data: result })
    },
  )

  // GET /part/:partId/qualite — note qualité + description indépendante d'une
  // pièce publiée (acheteurs flotte). Une conclusion, jamais la méthode.
  fastify.get(
    '/part/:partId/qualite',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Évaluation qualité Pièces d\'une pièce publiée (clients flotte)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('ENTERPRISE', 'ADMIN')],
    },
    async (request, reply) => {
      const { partId } = request.params as { partId: string }
      const result = await getQualitySheetForPart(partId)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Détail d\'une fiche (champs selon le rôle)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getEnrichment(actorOf(request), id)
      return reply.status(200).send({ data: result })
    },
  )

  // PATCH /:id — complétion humaine : prix / stock / garantie déclarés avec le
  // vendeur, corrections des champs agent (journalisées).
  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Compléter la fiche (prix, stock, corrections)',
        body: zodToFastify(enrichmentCompleteSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await completeEnrichment(actorOf(request), id, request.body)
      return reply.status(200).send({ data: result })
    },
  )

  // POST /:id/moderate — validation de contenu (Liaison) : sur place pour ses
  // fiches, à distance pour les fiches vendeur ; photos complémentaires possibles.
  fastify.post(
    '/:id/moderate',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Valider le contenu ou demander des photos (Liaison)',
        body: zodToFastify(enrichmentModerateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('LIAISON', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await moderateEnrichment(actorOf(request), id, request.body)
      return reply.status(200).send({ data: result })
    },
  )

  // POST /:id/deliverables — génère les livrables flotte (note + description)
  // en brouillon ; rien n'est publié sans approbation explicite.
  fastify.post(
    '/:id/deliverables',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Générer note qualité + description indépendante (admin)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: adminGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await generateDeliverables(request.user.id, id, request.log)
      return reply.status(200).send({ data: result })
    },
  )

  // POST /:id/arbitrate — arbitrage d'authenticité (administrateur seul) :
  // badge « pièce garantie », inspection physique, blocage.
  fastify.post(
    '/:id/arbitrate',
    {
      schema: {
        tags: ['Enrichment'],
        description: 'Arbitrer la fiche : approuver / inspection / bloquer (admin)',
        body: zodToFastify(enrichmentArbitrateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: adminGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await arbitrateEnrichment(request.user.id, id, request.body)
      return reply.status(200).send({ data: result })
    },
  )
}
