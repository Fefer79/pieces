import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  whatsapp: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
})

export const sendNotificationSchema = z.object({
  to: z.string().min(1),
  channel: z.enum(['whatsapp', 'sms', 'push']),
  message: z.string().min(1).max(4096),
})
