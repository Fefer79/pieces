import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  createEnterpriseSchema,
  inviteMemberSchema,
  fleetVehicleSchema,
  updateVehicleSchema,
  updateMileageSchema,
  createMaintenanceScheduleSchema,
  updateMaintenanceScheduleSchema,
  createMaintenanceCenterSchema,
  updateMaintenanceCenterSchema,
  setVehicleHomeCenterSchema,
  createBufferStockSchema,
  updateBufferStockSchema,
  adjustBufferStockSchema,
} from 'shared/validators'
import {
  listBufferStock,
  createBufferStock,
  updateBufferStock,
  adjustBufferStock,
  deleteBufferStock,
  type BufferStockInput,
} from './bufferStock.service.js'
import {
  listCenters,
  getCenter,
  createCenter,
  updateCenter,
  deleteCenter,
  setVehicleHomeCenter,
  type CenterInput,
} from './center.service.js'
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  markScheduleDone,
  listEnterpriseUpcomingMaintenance,
  type ScheduleInput,
} from './maintenance.service.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import {
  createEnterprise,
  listEnterprisesForUser,
  getEnterprise,
  inviteMember,
  listMembers,
  removeMember,
} from './enterprise.service.js'
import {
  listEnterpriseVehicles,
  getEnterpriseVehicle,
  createEnterpriseVehicle,
  updateEnterpriseVehicle,
  updateMileage,
  deleteEnterpriseVehicle,
  importVehiclesFromCsv,
  getVehicleAnalytics,
} from './vehicle.service.js'
import { getEnterpriseDashboard, exportEnterpriseOrdersCsv } from './dashboard.service.js'
import { getSubscriptionForMember } from './subscription.service.js'
import type { VehicleUsageType, EnterpriseMemberRole } from '@prisma/client'

export async function enterpriseRoutes(fastify: FastifyInstance) {
  // ---- Enterprise CRUD --------------------------------------------------

  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        description: 'Liste les entreprises dont l\'utilisateur est membre',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const data = await listEnterprisesForUser(request.user.id)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        description: 'Crée une entreprise (l\'auteur devient OWNER)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createEnterpriseSchema),
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string
        commune: string
        address?: string
        lat?: number
        lng?: number
        rccm?: string
      }
      const enterprise = await createEnterprise(request.user.id, body)
      return reply.status(201).send({ data: enterprise })
    },
  )

  fastify.get(
    '/:enterpriseId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await getEnterprise(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  // ---- Members ----------------------------------------------------------

  fastify.get(
    '/:enterpriseId/members',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await listMembers(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/:enterpriseId/members',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(inviteMemberSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const body = request.body as {
        phone?: string
        email?: string
        role: EnterpriseMemberRole
      }
      const data = await inviteMember(enterpriseId, request.user.id, body)
      return reply.status(201).send({ data })
    },
  )

  fastify.delete(
    '/:enterpriseId/members/:memberId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, memberId } = request.params as {
        enterpriseId: string
        memberId: string
      }
      await removeMember(enterpriseId, request.user.id, memberId)
      return reply.status(204).send()
    },
  )

  // ---- Vehicles ---------------------------------------------------------

  fastify.get(
    '/:enterpriseId/vehicles',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            groupName: { type: 'string' },
            usageType: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const query = request.query as { groupName?: string; usageType?: VehicleUsageType }
      const data = await listEnterpriseVehicles(enterpriseId, request.user.id, query)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/:enterpriseId/vehicles',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(fleetVehicleSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await createEnterpriseVehicle(
        enterpriseId,
        request.user.id,
        request.body as Parameters<typeof createEnterpriseVehicle>[2],
      )
      return reply.status(201).send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/vehicles/:vehicleId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const data = await getEnterpriseVehicle(enterpriseId, request.user.id, vehicleId)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/buffer-stock',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await listBufferStock(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/:enterpriseId/buffer-stock',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createBufferStockSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await createBufferStock(
        enterpriseId,
        request.user.id,
        request.body as BufferStockInput,
      )
      return reply.status(201).send({ data })
    },
  )

  fastify.patch(
    '/:enterpriseId/buffer-stock/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateBufferStockSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, id } = request.params as { enterpriseId: string; id: string }
      const data = await updateBufferStock(
        enterpriseId,
        request.user.id,
        id,
        request.body as Partial<Omit<BufferStockInput, 'catalogItemId'>>,
      )
      return reply.send({ data })
    },
  )

  fastify.post(
    '/:enterpriseId/buffer-stock/:id/adjust',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(adjustBufferStockSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, id } = request.params as { enterpriseId: string; id: string }
      const { delta } = request.body as { delta: number }
      const data = await adjustBufferStock(enterpriseId, request.user.id, id, delta)
      return reply.send({ data })
    },
  )

  fastify.delete(
    '/:enterpriseId/buffer-stock/:id',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, id } = request.params as { enterpriseId: string; id: string }
      const data = await deleteBufferStock(enterpriseId, request.user.id, id)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/centers',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await listCenters(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/:enterpriseId/centers',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createMaintenanceCenterSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await createCenter(
        enterpriseId,
        request.user.id,
        request.body as CenterInput,
      )
      return reply.status(201).send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/centers/:centerId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, centerId } = request.params as {
        enterpriseId: string
        centerId: string
      }
      const data = await getCenter(enterpriseId, request.user.id, centerId)
      return reply.send({ data })
    },
  )

  fastify.patch(
    '/:enterpriseId/centers/:centerId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateMaintenanceCenterSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, centerId } = request.params as {
        enterpriseId: string
        centerId: string
      }
      const data = await updateCenter(
        enterpriseId,
        request.user.id,
        centerId,
        request.body as Partial<CenterInput>,
      )
      return reply.send({ data })
    },
  )

  fastify.delete(
    '/:enterpriseId/centers/:centerId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, centerId } = request.params as {
        enterpriseId: string
        centerId: string
      }
      const data = await deleteCenter(enterpriseId, request.user.id, centerId)
      return reply.send({ data })
    },
  )

  fastify.patch(
    '/:enterpriseId/vehicles/:vehicleId/home-center',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(setVehicleHomeCenterSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const { homeCenterId } = request.body as { homeCenterId: string | null }
      const data = await setVehicleHomeCenter(
        enterpriseId,
        request.user.id,
        vehicleId,
        homeCenterId,
      )
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/maintenance/upcoming',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await listEnterpriseUpcomingMaintenance(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/vehicles/:vehicleId/schedules',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const data = await listSchedules(enterpriseId, request.user.id, vehicleId)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/:enterpriseId/vehicles/:vehicleId/schedules',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createMaintenanceScheduleSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const data = await createSchedule(
        enterpriseId,
        request.user.id,
        vehicleId,
        request.body as ScheduleInput,
      )
      return reply.status(201).send({ data })
    },
  )

  fastify.patch(
    '/:enterpriseId/vehicles/:vehicleId/schedules/:scheduleId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateMaintenanceScheduleSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId, scheduleId } = request.params as {
        enterpriseId: string
        vehicleId: string
        scheduleId: string
      }
      const data = await updateSchedule(
        enterpriseId,
        request.user.id,
        vehicleId,
        scheduleId,
        request.body as Partial<ScheduleInput>,
      )
      return reply.send({ data })
    },
  )

  fastify.delete(
    '/:enterpriseId/vehicles/:vehicleId/schedules/:scheduleId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId, scheduleId } = request.params as {
        enterpriseId: string
        vehicleId: string
        scheduleId: string
      }
      await deleteSchedule(enterpriseId, request.user.id, vehicleId, scheduleId)
      return reply.send({ data: { deleted: true } })
    },
  )

  fastify.post(
    '/:enterpriseId/vehicles/:vehicleId/schedules/:scheduleId/done',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId, scheduleId } = request.params as {
        enterpriseId: string
        vehicleId: string
        scheduleId: string
      }
      const body = (request.body as { atKm?: number } | undefined) ?? {}
      const data = await markScheduleDone(
        enterpriseId,
        request.user.id,
        vehicleId,
        scheduleId,
        body.atKm,
      )
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/vehicles/:vehicleId/analytics',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const data = await getVehicleAnalytics(enterpriseId, request.user.id, vehicleId)
      return reply.send({ data })
    },
  )

  fastify.patch(
    '/:enterpriseId/vehicles/:vehicleId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateVehicleSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const data = await updateEnterpriseVehicle(
        enterpriseId,
        request.user.id,
        vehicleId,
        request.body as Parameters<typeof updateEnterpriseVehicle>[3],
      )
      return reply.send({ data })
    },
  )

  fastify.patch(
    '/:enterpriseId/vehicles/:vehicleId/mileage',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateMileageSchema),
      },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      const { mileage } = request.body as { mileage: number }
      const data = await updateMileage(enterpriseId, request.user.id, vehicleId, mileage)
      return reply.send({ data })
    },
  )

  fastify.delete(
    '/:enterpriseId/vehicles/:vehicleId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId, vehicleId } = request.params as {
        enterpriseId: string
        vehicleId: string
      }
      await deleteEnterpriseVehicle(enterpriseId, request.user.id, vehicleId)
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/:enterpriseId/vehicles/import',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Enterprise'],
        description: 'Import CSV de véhicules (multipart/form-data, champ "file")',
        security: [{ BearerAuth: [] }],
        consumes: ['multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const file = await request.file()
      if (!file) {
        return reply.status(400).send({
          error: { code: 'FILE_REQUIRED', message: 'Fichier CSV requis', statusCode: 400 },
        })
      }
      const buf = await file.toBuffer()
      const csv = buf.toString('utf8')
      const result = await importVehiclesFromCsv(enterpriseId, request.user.id, csv)
      return reply.status(result.created > 0 ? 201 : 200).send({ data: result })
    },
  )

  // ---- Dashboard --------------------------------------------------------

  fastify.get(
    '/:enterpriseId/dashboard',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await getEnterpriseDashboard(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/subscription',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }], description: 'Abonnement actif + tarif estimé' },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await getSubscriptionForMember(enterpriseId, request.user.id)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/orders/export.csv',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Enterprise'], security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const csv = await exportEnterpriseOrdersCsv(enterpriseId, request.user.id)
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header(
        'Content-Disposition',
        `attachment; filename="pieces-orders-${enterpriseId}.csv"`,
      )
      return reply.send(csv)
    },
  )
}
