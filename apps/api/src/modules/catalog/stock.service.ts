import { prisma } from '../../lib/prisma.js'
import { notifyVendorLowStock } from '../notification/notification.service.js'

interface Logger {
  info?: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

// ---------------------------------------------------------------------------
// Traçabilité ERP (StockLevel / StockMovement)
//
// Stratégie simple tant que le stock vendeur n'est pas alloué par emplacement :
// le mouvement est rattaché au niveau de la PREMIÈRE location active (la plus
// anciennement créée) qui suit l'article. Sans niveau existant, rien n'est
// tracé — le vendeur gère son stock hors ERP et la mise à jour du compteur
// CatalogItem.stockQuantity reste le comportement de référence.
// ---------------------------------------------------------------------------

async function firstTrackedLevel(catalogItemId: string) {
  return prisma.stockLevel.findFirst({
    where: { catalogItemId, location: { actif: true } },
    orderBy: { location: { createdAt: 'asc' } },
  })
}

/**
 * Décrémente le stock des pièces d'une commande payée.
 *
 * Seules les fiches à quantité suivie (stockQuantity non null) sont touchées :
 * la quantité est décrémentée, inStock passe à false à 0, et le vendeur reçoit
 * une alerte WhatsApp au franchissement du seuil (lowStockThreshold) ou à la rupture.
 *
 * Appelée en fire-and-forget après le passage en PAID — ne doit jamais throw.
 */
export async function consumeStockForOrder(orderId: string, logger?: Logger) {
  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { catalogItemId: true, quantity: true },
    })

    for (const orderItem of items) {
      const item = await prisma.catalogItem.findUnique({
        where: { id: orderItem.catalogItemId },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          lowStockThreshold: true,
          vendor: { select: { phone: true, shopName: true } },
        },
      })

      // Quantité non suivie : le vendeur gère inStock à la main, on ne touche à rien.
      if (!item || item.stockQuantity === null) continue

      const oldQty = item.stockQuantity
      const newQty = Math.max(0, oldQty - Math.max(1, orderItem.quantity))

      await prisma.catalogItem.update({
        where: { id: item.id },
        data: { stockQuantity: newQty, inStock: newQty > 0 },
      })

      logger?.info?.(
        { event: 'CATALOG_STOCK_CONSUMED', orderId, itemId: item.id, oldQty, newQty },
        `Stock ${item.id}: ${oldQty} → ${newQty}`,
      )

      // Traçabilité ERP : mouvement SORTIE_COMMANDE + niveau miroir si l'article
      // est suivi en entrepôt. Ne doit jamais interrompre la boucle principale.
      const consumed = oldQty - newQty
      try {
        const level = await firstTrackedLevel(item.id)
        if (level && consumed > 0) {
          await prisma.stockLevel.update({
            where: { id: level.id },
            data: { qtyOnHand: Math.max(0, level.qtyOnHand - consumed) },
          })
          await prisma.stockMovement.create({
            data: {
              type: 'SORTIE_COMMANDE',
              catalogItemId: item.id,
              locationId: level.locationId,
              quantite: consumed,
              refType: 'Order',
              refId: orderId,
            },
          })
        }
      } catch (err) {
        logger?.warn(
          { event: 'CATALOG_STOCK_MOVEMENT_FAILED', orderId, itemId: item.id, err: String(err) },
          'Échec traçabilité ERP (mouvement sortie commande)',
        )
      }

      // Alerte uniquement au franchissement (pas de répétition à chaque vente sous le seuil).
      const crossedThreshold = oldQty > item.lowStockThreshold && newQty <= item.lowStockThreshold
      const justDepleted = newQty === 0 && oldQty > 0

      if ((crossedThreshold || justDepleted) && item.vendor?.phone) {
        const itemName = item.name ?? 'Pièce sans nom'
        void notifyVendorLowStock(item.vendor.phone, itemName, newQty).catch((err) => {
          logger?.warn(
            { event: 'CATALOG_STOCK_ALERT_FAILED', itemId: item.id, err: String(err) },
            'Échec envoi alerte stock faible',
          )
        })
      }
    }
  } catch (err) {
    logger?.warn(
      { event: 'CATALOG_STOCK_CONSUME_FAILED', orderId, err: String(err) },
      'Échec décrément stock après paiement',
    )
  }
}

/**
 * Restitue le stock des pièces d'une commande annulée APRÈS paiement
 * (symétrique de consumeStockForOrder, appelée uniquement si order.paidAt est
 * renseigné — garde faite côté appelant avant la transition).
 *
 * Mêmes règles : seules les fiches à quantité suivie sont touchées, la
 * quantité commandée (min 1) est ré-incrémentée, inStock est recalculé, et un
 * mouvement RESTITUTION + niveau miroir sont tracés si l'article est suivi
 * en entrepôt.
 *
 * Appelée en fire-and-forget après le passage en CANCELLED — ne doit jamais throw.
 */
export async function restockForOrder(orderId: string, logger?: Logger) {
  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { catalogItemId: true, quantity: true },
    })

    for (const orderItem of items) {
      const item = await prisma.catalogItem.findUnique({
        where: { id: orderItem.catalogItemId },
        select: { id: true, name: true, stockQuantity: true },
      })

      if (!item || item.stockQuantity === null) continue

      const oldQty = item.stockQuantity
      const restored = Math.max(1, orderItem.quantity)
      const newQty = oldQty + restored

      await prisma.catalogItem.update({
        where: { id: item.id },
        data: { stockQuantity: newQty, inStock: newQty > 0 },
      })

      logger?.info?.(
        { event: 'CATALOG_STOCK_RESTOCKED', orderId, itemId: item.id, oldQty, newQty },
        `Stock ${item.id}: ${oldQty} → ${newQty}`,
      )

      // Traçabilité ERP : mouvement RESTITUTION + niveau miroir.
      try {
        const level = await firstTrackedLevel(item.id)
        if (level) {
          await prisma.stockLevel.update({
            where: { id: level.id },
            data: { qtyOnHand: level.qtyOnHand + restored },
          })
          await prisma.stockMovement.create({
            data: {
              type: 'RESTITUTION',
              catalogItemId: item.id,
              locationId: level.locationId,
              quantite: restored,
              refType: 'Order',
              refId: orderId,
            },
          })
        }
      } catch (err) {
        logger?.warn(
          { event: 'CATALOG_STOCK_MOVEMENT_FAILED', orderId, itemId: item.id, err: String(err) },
          'Échec traçabilité ERP (mouvement restitution)',
        )
      }
    }
  } catch (err) {
    logger?.warn(
      { event: 'CATALOG_STOCK_RESTOCK_FAILED', orderId, err: String(err) },
      'Échec restitution stock après annulation',
    )
  }
}
