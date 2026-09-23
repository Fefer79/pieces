import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { notifyVendorLowStock } from '../notification/notification.service.js'
import { firstTrackedLevel } from './stock.service.js'
import type { VendorSaleChannel } from '@prisma/client'

interface Logger {
  warn: (obj: Record<string, unknown>, msg: string) => void
}

async function requireVendor(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, phone: true },
  })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }
  return vendor
}

export interface CreateVendorSaleInput {
  catalogItemId?: string
  itemName?: string
  quantity: number
  unitPrice: number
  buyerName?: string
  buyerPhone?: string
  channel: VendorSaleChannel
  note?: string
  // Chaîne ISO brute reçue du client (voir commentaire du validateur Zod) —
  // convertie en Date ci-dessous.
  soldAt?: string
}

/**
 * Enregistre une vente hors du parcours commande pieces.ci (WhatsApp,
 * téléphone, en boutique) — le carnet numérique du vendeur. Si la vente porte
 * sur un article du catalogue à quantité suivie, le stock est décrémenté avec
 * la même dégradation gracieuse que consumeStockForOrder : seule la fiche
 * catalogue est mise à jour si aucun StockLevel ERP n'existe pour l'article.
 */
export async function createVendorSale(
  userId: string,
  input: CreateVendorSaleInput,
  logger?: Logger,
) {
  const vendor = await requireVendor(userId)

  let itemName = input.itemName
  let catalogItem: {
    id: string
    stockQuantity: number | null
    lowStockThreshold: number
    name: string | null
  } | null = null

  if (input.catalogItemId) {
    catalogItem = await prisma.catalogItem.findFirst({
      where: { id: input.catalogItemId, vendorId: vendor.id },
      select: { id: true, stockQuantity: true, lowStockThreshold: true, name: true },
    })
    if (!catalogItem) {
      throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
    }
    itemName = itemName ?? catalogItem.name ?? 'Pièce'
  }

  if (!itemName) {
    throw new AppError('VENDOR_SALE_ITEM_NAME_REQUIRED', 400, {
      message: "Indiquez le nom de l'article vendu",
    })
  }

  const sale = await prisma.vendorSale.create({
    data: {
      vendorId: vendor.id,
      catalogItemId: catalogItem?.id,
      itemName,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalAmount: input.unitPrice * input.quantity,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      channel: input.channel,
      note: input.note,
      soldAt: input.soldAt ? new Date(input.soldAt) : new Date(),
      createdById: userId,
    },
  })

  // Quantité non suivie (ou vente hors catalogue) : rien à décrémenter, le
  // vendeur gère inStock à la main — comportement identique à
  // consumeStockForOrder. Ne doit jamais interrompre la création de la vente.
  if (catalogItem && catalogItem.stockQuantity !== null) {
    try {
      const oldQty = catalogItem.stockQuantity
      const newQty = Math.max(0, oldQty - input.quantity)

      await prisma.catalogItem.update({
        where: { id: catalogItem.id },
        data: { stockQuantity: newQty, inStock: newQty > 0 },
      })

      const consumed = oldQty - newQty
      try {
        const level = await firstTrackedLevel(catalogItem.id)
        if (level && consumed > 0) {
          await prisma.stockLevel.update({
            where: { id: level.id },
            data: { qtyOnHand: Math.max(0, level.qtyOnHand - consumed) },
          })
          // Type SORTIE_COMMANDE réutilisé (pas de sortie dédiée pour une vente
          // hors-plateforme) — refType distingue les deux en reporting ERP.
          await prisma.stockMovement.create({
            data: {
              type: 'SORTIE_COMMANDE',
              catalogItemId: catalogItem.id,
              locationId: level.locationId,
              quantite: consumed,
              refType: 'VendorSale',
              refId: sale.id,
              actorId: userId,
            },
          })
        }
      } catch (err) {
        logger?.warn(
          { event: 'VENDOR_SALE_STOCK_MOVEMENT_FAILED', saleId: sale.id, err: String(err) },
          'Échec traçabilité ERP (vente hors-plateforme)',
        )
      }

      const crossedThreshold =
        oldQty > catalogItem.lowStockThreshold && newQty <= catalogItem.lowStockThreshold
      const justDepleted = newQty === 0 && oldQty > 0

      if ((crossedThreshold || justDepleted) && vendor.phone) {
        void notifyVendorLowStock(vendor.phone, itemName, newQty).catch((err) => {
          logger?.warn(
            { event: 'VENDOR_SALE_STOCK_ALERT_FAILED', saleId: sale.id, err: String(err) },
            'Échec envoi alerte stock faible',
          )
        })
      }
    } catch (err) {
      logger?.warn(
        { event: 'VENDOR_SALE_STOCK_CONSUME_FAILED', saleId: sale.id, err: String(err) },
        'Échec décrément stock après vente hors-plateforme',
      )
    }
  }

  return sale
}

export async function getVendorSales(
  userId: string,
  options: { channel?: VendorSaleChannel; page?: number; limit?: number } = {},
) {
  const vendor = await requireVendor(userId)

  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 20))

  const where = {
    vendorId: vendor.id,
    ...(options.channel ? { channel: options.channel } : {}),
  }

  const [sales, total] = await Promise.all([
    prisma.vendorSale.findMany({
      where,
      orderBy: { soldAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorSale.count({ where }),
  ])

  return { sales, total, page, limit }
}
