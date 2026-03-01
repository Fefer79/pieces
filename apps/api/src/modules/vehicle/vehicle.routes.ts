import type { FastifyInstance } from 'fastify'
import { createVehicleSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { getUserVehicles, addUserVehicle, deleteUserVehicle } from './vehicle.service.js'

export async function vehicleRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/me/vehicles',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        description: 'Liste des véhicules de l\'utilisateur',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const vehicles = await getUserVehicles(request.user.id)
      return reply.status(200).send({ data: vehicles })
    },
  )

  fastify.post(
    '/me/vehicles',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        description: 'Ajouter un véhicule au profil',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createVehicleSchema),
      },
    },
    async (request, reply) => {
      const body = request.body as { brand: string; model: string; year: number; vin?: string }
      const vehicle = await addUserVehicle(request.user.id, body)
      return reply.status(201).send({ data: vehicle })
    },
  )

  fastify.delete(
    '/me/vehicles/:vehicleId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        description: 'Supprimer un véhicule du profil',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { vehicleId } = request.params as { vehicleId: string }
      await deleteUserVehicle(request.user.id, vehicleId)
      return reply.status(204).send()
    },
  )
}
