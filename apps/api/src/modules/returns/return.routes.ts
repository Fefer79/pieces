import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { createReturnOrderSchema, transitionReturnSchema } from 'shared/validators'
import {
  createReturn,
  listReturnsForEnterprise,
  listReturnsForUser,
  getReturn,
  transitionReturn,
  cancelReturn,
  type CreateReturnInput,
} from './return.service.js'
import type { ReturnStatus } from '@prisma/client'

export async function returnRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/returns',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Returns'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createReturnOrderSchema),
      },
    },
    async (request, reply) => {
      const body = request.body as CreateReturnInput
      const data = await createReturn(request.user.id, body)
      request.log.info({ event: 'RETURN_CREATED', returnId: data.id, orderId: data.orderId })
      return reply.status(201).send({ data })
    },
  )

  fastify.get(
    '/returns/mine',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Returns'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const data = await listReturnsForUser(request.user.id)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/returns/by-enterprise/:enterpriseId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Returns'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await listReturnsForEnterprise(enterpriseId, {
        id: request.user.id,
        roles: request.user.roles,
      })
      return reply.send({ data })
    },
  )

  fastify.get(
    '/returns/:id',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Returns'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getReturn(id, { id: request.user.id, roles: request.user.roles })
      return reply.send({ data })
    },
  )

  fastify.post(
    '/returns/:id/cancel',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Returns'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await cancelReturn(request.user.id, id)
      request.log.info({ event: 'RETURN_CANCELLED', returnId: id })
      return reply.send({ data })
    },
  )

  // Admin / seller side transitions (ACCEPT, PICKED_UP, INSPECTED, REFUND, REJECT).
  fastify.post(
    '/returns/:id/transition',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'SELLER')],
      schema: {
        tags: ['Returns'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(transitionReturnSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        toStatus: ReturnStatus
        resolutionNote?: string | null
        refundAmount?: number | null
      }
      const data = await transitionReturn(
        id,
        body.toStatus,
        { id: request.user.id, roles: request.user.roles },
        {
          resolutionNote: body.resolutionNote,
          refundAmount: body.refundAmount,
        },
      )
      request.log.info({ event: 'RETURN_TRANSITION', returnId: id, to: body.toStatus })
      return reply.send({ data })
    },
  )
}
