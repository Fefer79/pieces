import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  cockpitQuerySchema,
  createNoteSchema,
  createStaffMemberSchema,
  createTaskSchema,
  noteListQuerySchema,
  staffListQuerySchema,
  taskListQuerySchema,
  updateStaffMemberSchema,
  updateTaskSchema,
} from 'shared/validators'
import { STAFF_ROLE_LABELS, ERP_CAPABILITY_LABELS } from 'shared/constants'
import { zodToFastify } from '../../../lib/zodSchema.js'
import { requireAuth } from '../../../plugins/auth.js'
import { loadStaffContext, requireErpCapability } from '../../../plugins/erpAuth.js'
import {
  createStaffMember,
  listStaffMembers,
  searchStaffCandidates,
  updateStaffMember,
} from './staff.service.js'
import { createTask, listTasks, updateTask } from './task.service.js'
import { createNote, listNotes } from './note.service.js'
import { getCockpit } from './cockpit.service.js'
import { listSequences } from './sequence.service.js'

// Socle de l'ERP interne — `/api/v1/erp`.
//
// Toutes les routes exigent `requireAuth` puis une capacité. `GET /me` est la
// seule exception : elle est ouverte à tout utilisateur authentifié et renvoie
// des capacités éventuellement vides, car c'est elle qui permet au front de
// décider s'il affiche l'ERP ou un écran « accès réservé ». La refuser en 403
// obligerait le client à interpréter un code d'erreur pour une réponse qui est
// une information légitime.

export async function erpCoreRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/me',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['ERP'],
        description: 'Profil ERP de l’utilisateur courant (rôle métier et capacités)',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const staff = await loadStaffContext(request.user.id, request.user.roles ?? [])
      return reply.send({
        data: {
          ...staff,
          staffRoleLabel: staff.staffRole ? STAFF_ROLE_LABELS[staff.staffRole] : null,
          user: {
            id: request.user.id,
            name: null,
            phone: request.user.phone,
            email: request.user.email,
            roles: request.user.roles,
          },
        },
      })
    },
  )

  fastify.get(
    '/cockpit',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Indicateurs consolidés des trois lignes d’activité',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(cockpitQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await getCockpit(cockpitQuerySchema.parse(request.query), request.staff)
      return reply.send({ data })
    },
  )

  // ---- Équipe ------------------------------------------------------------

  fastify.get(
    '/staff',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Membres de l’équipe interne',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(staffListQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await listStaffMembers(staffListQuerySchema.parse(request.query))
      return reply.send({ data })
    },
  )

  fastify.get(
    '/staff/candidates',
    {
      preHandler: [requireAuth, requireErpCapability('erp:admin')],
      schema: {
        tags: ['ERP'],
        description: 'Rechercher un utilisateur à enrôler dans l’équipe',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q } = request.query as { q?: string }
      const data = await searchStaffCandidates(q ?? '')
      return reply.send({ data })
    },
  )

  fastify.post(
    '/staff',
    {
      preHandler: [requireAuth, requireErpCapability('erp:admin')],
      schema: {
        tags: ['ERP'],
        description: 'Enrôler un utilisateur dans l’équipe interne',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createStaffMemberSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await createStaffMember(createStaffMemberSchema.parse(request.body))
      return reply.status(201).send({ data })
    },
  )

  fastify.patch(
    '/staff/:staffId',
    {
      preHandler: [requireAuth, requireErpCapability('erp:admin')],
      schema: {
        tags: ['ERP'],
        description: 'Modifier le rôle métier, les lignes d’activité ou l’activation',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateStaffMemberSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { staffId } = request.params as { staffId: string }
      const data = await updateStaffMember(staffId, updateStaffMemberSchema.parse(request.body))
      return reply.send({ data })
    },
  )

  fastify.get(
    '/capabilities',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Référentiel des capacités et des rôles métier',
        security: [{ BearerAuth: [] }],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        data: {
          capabilities: ERP_CAPABILITY_LABELS,
          staffRoles: STAFF_ROLE_LABELS,
        },
      })
    },
  )

  // ---- Tâches ------------------------------------------------------------

  fastify.get(
    '/tasks',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Tâches et relances internes',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(taskListQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await listTasks(taskListQuerySchema.parse(request.query), request.staff)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/tasks',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Créer une tâche',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createTaskSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await createTask(createTaskSchema.parse(request.body), request.staff)
      return reply.status(201).send({ data })
    },
  )

  fastify.patch(
    '/tasks/:taskId',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Mettre à jour une tâche (statut, échéance, attribution)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateTaskSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { taskId } = request.params as { taskId: string }
      const data = await updateTask(taskId, updateTaskSchema.parse(request.body))
      return reply.send({ data })
    },
  )

  // ---- Notes -------------------------------------------------------------

  fastify.get(
    '/notes',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Notes internes rattachées à une entité',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(noteListQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await listNotes(noteListQuerySchema.parse(request.query))
      return reply.send({ data })
    },
  )

  fastify.post(
    '/notes',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Ajouter une note interne',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createNoteSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await createNote(createNoteSchema.parse(request.body), request.staff)
      return reply.status(201).send({ data })
    },
  )

  // ---- Paramètres --------------------------------------------------------

  fastify.get(
    '/sequences',
    {
      preHandler: [requireAuth, requireErpCapability('erp:admin')],
      schema: {
        tags: ['ERP'],
        description: 'État des compteurs de numérotation',
        security: [{ BearerAuth: [] }],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const data = await listSequences()
      return reply.send({ data })
    },
  )
}
