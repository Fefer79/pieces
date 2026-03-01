import { sendWhatsAppMessage, sendWhatsAppTemplate } from '../whatsapp/whatsapp.service.js'

export type NotificationChannel = 'whatsapp' | 'sms' | 'push'

export interface NotificationPayload {
  to: string
  channel: NotificationChannel
  template?: string
  message: string
  params?: string[]
}

export async function sendNotification(payload: NotificationPayload) {
  switch (payload.channel) {
    case 'whatsapp':
      if (payload.template) {
        return sendWhatsAppTemplate(payload.to, payload.template, payload.params ?? [])
      }
      return sendWhatsAppMessage(payload.to, payload.message)

    case 'sms':
      // SMS provider stub — to be integrated (e.g. Twilio, Orange SMS API)
      return { success: false, reason: 'SMS not configured' }

    case 'push':
      // Web Push stub — to be integrated via service worker
      return { success: false, reason: 'Push not configured' }

    default:
      return { success: false, reason: 'Unknown channel' }
  }
}

export async function sendMultiChannel(
  to: string,
  channels: NotificationChannel[],
  message: string,
  template?: string,
  params?: string[],
) {
  const results = await Promise.allSettled(
    channels.map((channel) =>
      sendNotification({ to, channel, message, template, params }),
    ),
  )

  return results.map((r, i) => ({
    channel: channels[i],
    success: r.status === 'fulfilled' && r.value.success === true,
  }))
}

// Predefined notification dispatchers for common events
export async function notifyOrderStatusChange(phone: string, orderId: string, newStatus: string) {
  const statusMessages: Record<string, string> = {
    PAID: `Votre commande ${orderId.slice(0, 8)} est confirmée. Le vendeur prépare votre pièce.`,
    VENDOR_CONFIRMED: `Le vendeur a confirmé votre commande ${orderId.slice(0, 8)}. Livraison en cours de préparation.`,
    DISPATCHED: `Votre commande ${orderId.slice(0, 8)} a été expédiée! Un livreur est en route.`,
    DELIVERED: `Votre commande ${orderId.slice(0, 8)} a été livrée. Confirmez la réception.`,
    CANCELLED: `Votre commande ${orderId.slice(0, 8)} a été annulée.`,
  }

  const message = statusMessages[newStatus]
  if (!message) return { sent: false, reason: 'No notification for this status' }

  const result = await sendNotification({ to: phone, channel: 'whatsapp', message })
  return { sent: result.success === true }
}

export async function notifyVendorNewOrder(phone: string, orderId: string, itemCount: number) {
  const message = `Nouvelle commande ${orderId.slice(0, 8)} : ${itemCount} pièce(s). Confirmez dans les 45 minutes.`
  return sendNotification({ to: phone, channel: 'whatsapp', message })
}

export async function notifyVendorLowStock(phone: string, itemName: string) {
  const message = `Stock critique : "${itemName}" est en rupture. Mettez à jour votre catalogue.`
  return sendNotification({ to: phone, channel: 'whatsapp', message })
}

export async function notifyRiderAssignment(phone: string, deliveryId: string, pickupAddress: string) {
  const message = `Nouvelle livraison ${deliveryId.slice(0, 8)} assignée. Récupérez à : ${pickupAddress}`
  return sendNotification({ to: phone, channel: 'whatsapp', message })
}
