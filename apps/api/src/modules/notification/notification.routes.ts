import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { updatePreferencesSchema, sendNotificationSchema } from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { sendNotification } from './notification.service.js'

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get user notification preferences
  fastify.get(
    '/preferences',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Notifications'], description: 'Préférences de notification', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId: request.user.id },
      })

      const defaults = {
        userId: request.user.id,
        whatsapp: true,
        sms: false,
        push: false,
      }

      return reply.status(200).send({ data: prefs ?? defaults })
    },
  )

  // Update notification preferences
  fastify.put(
    '/preferences',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Notifications'],
        description: 'Mettre à jour les préférences',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updatePreferencesSchema),
      },
    },
    async (request, reply) => {
      const body = updatePreferencesSchema.parse(request.body)

      const prefs = await prisma.notificationPreference.upsert({
        where: { userId: request.user.id },
        create: {
          userId: request.user.id,
          whatsapp: body.whatsapp ?? true,
          sms: body.sms ?? false,
          push: body.push ?? false,
        },
        update: {
          whatsapp: body.whatsapp,
          sms: body.sms,
          push: body.push,
        },
      })

      return reply.status(200).send({ data: prefs })
    },
  )

  // Admin: send notification to user (for SLA breach proactive calls etc.)
  fastify.post(
    '/send',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Notifications'],
        description: 'Envoyer une notification (admin)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(sendNotificationSchema),
      },
    },
    async (request, reply) => {
      const body = sendNotificationSchema.parse(request.body)
      const result = await sendNotification({ ...body, channel: body.channel })
      return reply.status(200).send({ data: result })
    },
  )
}
