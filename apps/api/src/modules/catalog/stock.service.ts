import { prisma } from '../../lib/prisma.js'
import { notifyVendorLowStock } from '../notification/notification.service.js'

interface Logger {
  info?: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
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
