import type { FastifyInstance } from 'fastify'
import {
  staffListQuerySchema,
  staffCandidatesQuerySchema,
  staffCreateSchema,
  staffUpdateSchema,
  staffParamsSchema,
  erpSearchQuerySchema,
} from 'shared/validators'
import type {
  StaffListQuery,
  StaffCandidatesQuery,
  StaffCreateInput,
  StaffUpdateInput,
  ErpSearchQuery,
} from 'shared/validators'
import {
  ERP_CAPABILITIES,
  ERP_CAPABILITY_LABELS,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_HINTS,
  BUSINESS_UNIT_LABELS,
} from 'shared/constants'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { loadStaffContext, requireErpCapability } from '../../plugins/erpAuth.js'
import { getAdminOverview } from '../admin/admin.service.js'
import {
  getErpIdentity,
  listStaff,
  listStaffCandidates,
  createStaff,
  updateStaff,
  getNavCounts,
  searchErp,
} from './erp.service.js'

export async function erpRoutes(fastify: FastifyInstance) {
  // -------------------------------------------------------------------------
  // Profil
  // -------------------------------------------------------------------------

  /**
   * Répond 200 même sans aucune capacité — c'est ce qui permet au web de
   * distinguer « pas connecté » (redirection vers /login) de « connecté mais
   * pas de l'équipe » (écran d'accès réservé). Un 403 obligerait à deviner.
   */
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
    async (request, reply) => {
      const [staff, user] = await Promise.all([
        loadStaffContext(request.user.id, request.user.roles ?? []),
        getErpIdentity(request.user.id),
      ])
      return reply.status(200).send({
        data: {
          user,
          staffId: staff.staffId,
          staffRole: staff.staffRole,
          businessUnits: staff.businessUnits,
          title: staff.title,
          active: staff.active,
          isPlatformAdmin: staff.isPlatformAdmin,
          capabilities: staff.capabilities,
        },
      })
    },
  )

  fastify.get(
    '/referentiel',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Référentiel des rôles métier, capacités et lignes d’activité',
        security: [{ BearerAuth: [] }],
      },
    },
    async (_request, reply) =>
      reply.status(200).send({
        data: {
          roles: ERP_CAPABILITIES,
          roleLabels: STAFF_ROLE_LABELS,
          roleHints: STAFF_ROLE_HINTS,
          capabilityLabels: ERP_CAPABILITY_LABELS,
          businessUnitLabels: BUSINESS_UNIT_LABELS,
        },
      }),
  )

  // -------------------------------------------------------------------------
  // Cockpit
  // -------------------------------------------------------------------------

  /**
   * Réutilise `getAdminOverview()` tel quel : le cockpit ERP et le tableau de
   * bord /admin doivent afficher les mêmes chiffres. Deux implémentations
   * divergeraient au premier changement de règle.
   */
  fastify.get(
    '/cockpit',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Indicateurs consolidés de la plateforme',
        security: [{ BearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      const overview = await getAdminOverview()
      return reply.status(200).send({ data: overview })
    },
  )

  // -------------------------------------------------------------------------
  // Compteurs de navigation
  // -------------------------------------------------------------------------

  fastify.get(
    '/nav-counts',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Travail en attente, par entrée de navigation',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await getNavCounts(request.staff.capabilities)
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Recherche globale
  // -------------------------------------------------------------------------

  fastify.get(
    '/search',
    {
      preHandler: [requireAuth, requireErpCapability('erp:read')],
      schema: {
        tags: ['ERP'],
        description: 'Recherche transverse (comptes, pièces, commandes, sourcing, expéditions)',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(erpSearchQuerySchema),
      },
    },
    async (request, reply) => {
      const query = request.query as ErpSearchQuery
      const result = await searchErp(query, request.staff.capabilities)
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Équipe
  // -------------------------------------------------------------------------

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
    async (request, reply) => {
      const result = await listStaff(request.query as StaffListQuery)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/staff/candidats',
    {
      preHandler: [requireAuth, requireErpCapability('erp:admin')],
      schema: {
        tags: ['ERP'],
        description: 'Rechercher un utilisateur à enrôler dans l’équipe',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(staffCandidatesQuerySchema),
      },
    },
    async (request, reply) => {
      const result = await listStaffCandidates(request.query as StaffCandidatesQuery)
      return reply.status(200).send({ data: result })
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
        body: zodToFastify(staffCreateSchema),
      },
    },
    async (request, reply) => {
      const result = await createStaff(request.body as StaffCreateInput)
      return reply.status(201).send({ data: result })
    },
  )

  fastify.patch(
    '/staff/:id',
    {
      preHandler: [requireAuth, requireErpCapability('erp:admin')],
      schema: {
        tags: ['ERP'],
        description: 'Modifier le rôle métier, les lignes d’activité ou l’activation',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(staffParamsSchema),
        body: zodToFastify(staffUpdateSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateStaff(id, request.body as StaffUpdateInput)
      return reply.status(200).send({ data: result })
    },
  )
}
