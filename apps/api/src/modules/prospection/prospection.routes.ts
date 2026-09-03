import type { FastifyInstance, FastifyRequest } from 'fastify'
import {
  createProspectionInterviewSchema,
  recordProspectionConsentSchema,
  updateProspectionInterviewSchema,
  appendProspectionTranscriptSchema,
  applyProspectionInterviewSchema,
  prospectionInterviewParamsSchema,
  prospectionInterviewListQuerySchema,
} from 'shared/validators'
import type {
  CreateProspectionInterviewInput,
  RecordProspectionConsentInput,
  UpdateProspectionInterviewInput,
  AppendProspectionTranscriptInput,
  ApplyProspectionInterviewInput,
  ProspectionInterviewListQuery,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { AppError } from '../../lib/appError.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireRoleOrCapability } from '../../plugins/erpAuth.js'
import {
  createInterview,
  listInterviews,
  getInterview,
  recordConsent,
  updateInterview,
  appendTranscript,
  attachAudio,
  getAudio,
  requestExtraction,
  applyInterview,
  type Actor,
} from './prospection.service.js'

function actorOf(request: FastifyRequest): Actor {
  const role = request.user.activeContext ?? request.user.roles[0]
  if (!role) throw new AppError('PROSPECTION_FORBIDDEN', 403, { message: 'Contexte non autorisé' })
  // `request.staff` n'est décoré que si la garde a chargé le contexte staff
  // (accès par capacité). Un LIAISON passé par son rôle plateforme n'en a pas.
  return { userId: request.user.id, role, staff: request.staff ?? null }
}

export async function prospectionRoutes(fastify: FastifyInstance) {
  const readGuard = [requireAuth, requireRoleOrCapability(['LIAISON'], 'crm:read')]
  const writeGuard = [requireAuth, requireRoleOrCapability(['LIAISON'], 'crm:write')]

  fastify.post(
    '/interviews',
    {
      schema: {
        body: zodToFastify(createProspectionInterviewSchema),
        tags: ['Prospection'],
        description: 'Créer un entretien de démarchage (rattaché à un prospect ou un vendeur)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const result = await createInterview(
        actorOf(request),
        request.body as CreateProspectionInterviewInput,
      )
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/interviews',
    {
      schema: {
        querystring: zodToFastify(prospectionInterviewListQuerySchema),
        tags: ['Prospection'],
        description: 'Lister les entretiens de démarchage',
        security: [{ BearerAuth: [] }],
      },
      preHandler: readGuard,
    },
    async (request, reply) => {
      const result = await listInterviews(
        actorOf(request),
        request.query as ProspectionInterviewListQuery,
      )
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/interviews/:id',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        tags: ['Prospection'],
        description: 'Détail d’un entretien',
        security: [{ BearerAuth: [] }],
      },
      preHandler: readGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getInterview(actorOf(request), id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/interviews/:id',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        body: zodToFastify(updateProspectionInterviewSchema),
        tags: ['Prospection'],
        description: 'Mettre à jour un entretien (statut, notes, réponses)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateInterview(
        actorOf(request),
        id,
        request.body as UpdateProspectionInterviewInput,
      )
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/interviews/:id/consent',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        body: zodToFastify(recordProspectionConsentSchema),
        tags: ['Prospection'],
        description: 'Enregistrer le consentement du vendeur (préalable à tout audio/transcription)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await recordConsent(
        actorOf(request),
        id,
        request.body as RecordProspectionConsentInput,
      )
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/interviews/:id/transcript',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        body: zodToFastify(appendProspectionTranscriptSchema),
        tags: ['Prospection'],
        description: 'Ajouter un fragment de transcription (dictée du terminal)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await appendTranscript(
        actorOf(request),
        id,
        request.body as AppendProspectionTranscriptInput,
      )
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/interviews/:id/audio',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        tags: ['Prospection'],
        description: 'Téléverser l’enregistrement audio de l’entretien',
        consumes: ['multipart/form-data'],
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      let audio: { buffer: Buffer; mimeType: string } | null = null
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (audio) {
            await part.toBuffer()
            continue
          }
          audio = { buffer: await part.toBuffer(), mimeType: part.mimetype }
        }
      }
      if (!audio) {
        throw new AppError('PROSPECTION_AUDIO_MISSING', 400, { message: 'Aucun fichier audio reçu' })
      }

      const result = await attachAudio(actorOf(request), id, audio)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/interviews/:id/audio',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        tags: ['Prospection'],
        description: 'Récupérer l’enregistrement audio de l’entretien',
        security: [{ BearerAuth: [] }],
      },
      preHandler: readGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { buffer, mimeType } = await getAudio(actorOf(request), id)
      return reply.header('Content-Type', mimeType).header('Cache-Control', 'private, no-store').send(buffer)
    },
  )

  fastify.post(
    '/interviews/:id/extract',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        tags: ['Prospection'],
        description: 'Lancer l’extraction IA des réponses à partir de la transcription',
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await requestExtraction(actorOf(request), id)
      return reply.status(202).send({ data: result })
    },
  )

  fastify.post(
    '/interviews/:id/apply',
    {
      schema: {
        params: zodToFastify(prospectionInterviewParamsSchema),
        body: zodToFastify(applyProspectionInterviewSchema),
        tags: ['Prospection'],
        description: 'Reporter les réponses de l’entretien sur la fiche prospect',
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await applyInterview(
        actorOf(request),
        id,
        request.body as ApplyProspectionInterviewInput,
      )
      return reply.status(200).send({ data: result })
    },
  )
}
