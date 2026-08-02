import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  financeOverviewQuerySchema,
  financeMonthlyQuerySchema,
  financeVendorsQuerySchema,
  financeExportQuerySchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  getFinanceOverview,
  getFinanceMonthly,
  listFinanceVendors,
  exportCommandesCsv,
  exportCommissionsCsv,
  exportEscrowCsv,
} from './finance.service.js'

// Réponse CSV téléchargeable : Excel français (BOM en tête, fourni par le
// service), en-têtes de contenu explicites pour le navigateur.
function sendCsv(reply: FastifyReply, filename: string, csv: string) {
  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(csv)
}

// Module 100 % lecture seule : aucun recordActivity, aucune écriture.
// Les routes restent minces — tout le métier est dans finance.service.ts.
export async function financeRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('ADMIN')]

  // -------------------------------------------------------------------------
  // Cockpit
  // -------------------------------------------------------------------------

  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['Finance'],
        description:
          'Cockpit comptable d’une période : GMV, commissions, commandes, panier moyen, frais de livraison, main-d’œuvre, escrow, variation vs mois précédent',
        querystring: zodToFastify(financeOverviewQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await getFinanceOverview(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/monthly',
    {
      schema: {
        tags: ['Finance'],
        description:
          'Ventilation mensuelle (buckets) du GMV, des commissions et du nombre de commandes terminées',
        querystring: zodToFastify(financeMonthlyQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await getFinanceMonthly(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Vendeurs
  // -------------------------------------------------------------------------

  fastify.get(
    '/vendors',
    {
      schema: {
        tags: ['Finance'],
        description:
          'Agrégation par vendeur sur les commandes terminées de la période : commandes, GMV, commissions, escrow en cours — triée par commissions décroissantes, paginée',
        querystring: zodToFastify(financeVendorsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listFinanceVendors(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Exports CSV (Excel français : BOM UTF-8, séparateur « ; »)
  // -------------------------------------------------------------------------

  fastify.get(
    '/export/commandes',
    {
      schema: {
        tags: ['Finance'],
        description: 'Export CSV des commandes terminées de la période (une ligne par commande)',
        querystring: zodToFastify(financeExportQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { filename, csv } = await exportCommandesCsv(request.query)
      return sendCsv(reply, filename, csv)
    },
  )

  fastify.get(
    '/export/commissions',
    {
      schema: {
        tags: ['Finance'],
        description:
          'Export CSV des commissions par vendeur sur la période (agrégé, trié par commissions décroissantes)',
        querystring: zodToFastify(financeExportQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { filename, csv } = await exportCommissionsCsv(request.query)
      return sendCsv(reply, filename, csv)
    },
  )

  fastify.get(
    '/export/escrow',
    {
      schema: {
        tags: ['Finance'],
        description:
          'Export CSV des mouvements escrow touchés par la période (bloqués, libérés ou remboursés)',
        querystring: zodToFastify(financeExportQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { filename, csv } = await exportEscrowCsv(request.query)
      return sendCsv(reply, filename, csv)
    },
  )
}
