import type { FastifyInstance } from 'fastify'
import {
  createStockLocationSchema,
  updateStockLocationSchema,
  stockLocationParamsSchema,
  stockLevelsQuerySchema,
  stockAdjustmentSchema,
  stockMovementsQuerySchema,
  vendorStockAlertsQuerySchema,
  createSupplierSchema,
  updateSupplierSchema,
  suppliersQuerySchema,
  supplierParamsSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  receivePurchaseOrderSchema,
  purchaseOrdersQuerySchema,
  purchaseOrderParamsSchema,
  estimateLandedCostSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  getStockOverview,
  listStockLocations,
  createStockLocation,
  updateStockLocation,
  listStockLevels,
  adjustStock,
  listStockMovements,
  listVendorStockAlerts,
  listSuppliers,
  createSupplier,
  updateSupplier,
  getSupplier,
  estimateLandedCost,
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
} from './stock.service.js'

export async function stockRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireCapability('stock:read')]

  // -------------------------------------------------------------------------
  // Vue d'ensemble
  // -------------------------------------------------------------------------

  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['Stock'],
        description: 'Cockpit « Stock, achats & fournisseurs » (8 compteurs)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await getStockOverview()
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Emplacements
  // -------------------------------------------------------------------------

  fastify.get(
    '/locations',
    {
      schema: {
        tags: ['Stock'],
        description: 'Liste des emplacements de stock (entrepôts, boutiques, transit)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await listStockLocations()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/locations',
    {
      schema: {
        tags: ['Stock'],
        description: 'Créer un emplacement de stock',
        body: zodToFastify(createStockLocationSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await createStockLocation(request.body)
      request.log.info({
        event: 'STOCK_LOCATION_CREATED',
        adminId: request.user.id,
        locationId: result.id,
        nom: result.nom,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'STOCK_LOCATION_CREATED',
        targetType: 'StockLocation',
        targetId: result.id,
        payload: { nom: result.nom, type: result.type },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.patch(
    '/locations/:id',
    {
      schema: {
        tags: ['Stock'],
        description: 'Modifier un emplacement de stock (dont activation/désactivation)',
        params: zodToFastify(stockLocationParamsSchema),
        body: zodToFastify(updateStockLocationSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateStockLocation(id, request.body)
      request.log.info({
        event: 'STOCK_LOCATION_UPDATED',
        adminId: request.user.id,
        locationId: id,
      })
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Niveaux, ajustements, mouvements, alertes
  // -------------------------------------------------------------------------

  fastify.get(
    '/levels',
    {
      schema: {
        tags: ['Stock'],
        description: 'Niveaux de stock par emplacement (statut rupture/bas/ok, valorisation)',
        querystring: zodToFastify(stockLevelsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listStockLevels(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/adjustments',
    {
      schema: {
        tags: ['Stock'],
        description:
          'Ajustement manuel de stock (entrée/sortie) — mouvement AJUSTEMENT tracé, CUMP recalculé sur entrée valorisée',
        body: zodToFastify(stockAdjustmentSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const body = request.body as { catalogItemId: string; locationId: string; delta: number }
      const result = await adjustStock(request.user.id, request.body)
      request.log.info({
        event: 'STOCK_ADJUSTED',
        adminId: request.user.id,
        catalogItemId: body.catalogItemId,
        locationId: body.locationId,
        delta: body.delta,
        newQty: result.level.qtyOnHand,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'STOCK_ADJUSTED',
        targetType: 'StockLevel',
        targetId: result.level.id,
        payload: {
          catalogItemId: body.catalogItemId,
          locationId: body.locationId,
          delta: body.delta,
          newQty: result.level.qtyOnHand,
        },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/movements',
    {
      schema: {
        tags: ['Stock'],
        description:
          'Journal des mouvements de stock (réceptions, sorties, ajustements, restitutions)',
        querystring: zodToFastify(stockMovementsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listStockMovements(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/vendor-alerts',
    {
      schema: {
        tags: ['Stock'],
        description: 'Alertes stock des fiches vendeurs à quantité suivie (ruptures d’abord)',
        querystring: zodToFastify(vendorStockAlertsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listVendorStockAlerts(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Fournisseurs
  // -------------------------------------------------------------------------

  fastify.get(
    '/suppliers',
    {
      schema: {
        tags: ['Stock'],
        description: 'Liste des fournisseurs (recherche nom/pays/ville, filtre actif)',
        querystring: zodToFastify(suppliersQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listSuppliers(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/suppliers',
    {
      schema: {
        tags: ['Stock'],
        description: 'Créer un fournisseur',
        body: zodToFastify(createSupplierSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await createSupplier(request.body)
      request.log.info({
        event: 'SUPPLIER_CREATED',
        adminId: request.user.id,
        supplierId: result.id,
        nom: result.nom,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SUPPLIER_CREATED',
        targetType: 'Supplier',
        targetId: result.id,
        payload: { nom: result.nom, pays: result.pays },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/suppliers/:id',
    {
      schema: {
        tags: ['Stock'],
        description: 'Fiche fournisseur (20 derniers bons de commande + volume FCFA hors annulés)',
        params: zodToFastify(supplierParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getSupplier(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/suppliers/:id',
    {
      schema: {
        tags: ['Stock'],
        description: 'Modifier un fournisseur (dont activation/désactivation)',
        params: zodToFastify(supplierParamsSchema),
        body: zodToFastify(updateSupplierSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateSupplier(id, request.body)
      request.log.info({ event: 'SUPPLIER_UPDATED', adminId: request.user.id, supplierId: id })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SUPPLIER_UPDATED',
        targetType: 'Supplier',
        targetId: id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Bons de commande
  // -------------------------------------------------------------------------

  fastify.post(
    '/purchase-orders/estimate',
    {
      schema: {
        tags: ['Stock'],
        description:
          'Estime le coût rendu entrepôt (fret, douane, last-mile) pour un mode logistique',
        body: zodToFastify(estimateLandedCostSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await estimateLandedCost(request.body)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/purchase-orders',
    {
      schema: {
        tags: ['Stock'],
        description: 'Liste des bons de commande fournisseurs (filtres statut, fournisseur)',
        querystring: zodToFastify(purchaseOrdersQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listPurchaseOrders(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/purchase-orders',
    {
      schema: {
        tags: ['Stock'],
        description:
          'Créer un bon de commande (numéro BC-YYYYMMDD-XXXX, montant et frais estimés calculés)',
        body: zodToFastify(createPurchaseOrderSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await createPurchaseOrder(request.user.id, request.body)
      request.log.info({
        event: 'PURCHASE_ORDER_CREATED',
        adminId: request.user.id,
        purchaseOrderId: result.id,
        numero: result.numero,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'PURCHASE_ORDER_CREATED',
        targetType: 'PurchaseOrder',
        targetId: result.id,
        payload: {
          numero: result.numero,
          supplierId: result.supplierId,
          montantEstimeFcfa: result.montantEstimeFcfa,
        },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/purchase-orders/:id',
    {
      schema: {
        tags: ['Stock'],
        description: 'Détail d’un bon de commande (lignes, fournisseur, destination)',
        params: zodToFastify(purchaseOrderParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getPurchaseOrder(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/purchase-orders/:id',
    {
      schema: {
        tags: ['Stock'],
        description:
          'Modifier un bon de commande (statut avec matrice de transitions, destination, ETA, notes)',
        params: zodToFastify(purchaseOrderParamsSchema),
        body: zodToFastify(updatePurchaseOrderSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updatePurchaseOrder(id, request.body)
      request.log.info({
        event: 'PURCHASE_ORDER_UPDATED',
        adminId: request.user.id,
        purchaseOrderId: id,
        statut: result.statut,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'PURCHASE_ORDER_UPDATED',
        targetType: 'PurchaseOrder',
        targetId: id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/purchase-orders/:id/receive',
    {
      schema: {
        tags: ['Stock'],
        description:
          'Réceptionner un bon de commande (mouvements RECEPTION, niveaux + CUMP, compteur marketplace, statut recalculé)',
        params: zodToFastify(purchaseOrderParamsSchema),
        body: zodToFastify(receivePurchaseOrderSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await receivePurchaseOrder(request.user.id, id, request.body)
      request.log.info({
        event: 'PURCHASE_ORDER_RECEIVED',
        adminId: request.user.id,
        purchaseOrderId: id,
        statut: result.statut,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'PURCHASE_ORDER_RECEIVED',
        targetType: 'PurchaseOrder',
        targetId: id,
        payload: { statut: result.statut, montantReelFcfa: result.montantReelFcfa },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )
}
