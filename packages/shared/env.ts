import { z } from 'zod'

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
})

export const apiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  // WhatsApp reverse-OTP login (optional; falls back to service-role key for signing)
  AUTH_SESSION_SECRET: z.string().optional(),
  WHATSAPP_BUSINESS_NUMBER: z.string().optional(),
  // Inbound WhatsApp channel: Meta Cloud API webhook ('cloud', default) or a
  // self-hosted Baileys socket on a regular WhatsApp account ('baileys', free).
  WHATSAPP_PROVIDER: z.enum(['cloud', 'baileys']).default('cloud'),
  BAILEYS_AUTH_DIR: z.string().optional(),
  BAILEYS_PAIRING_PHONE: z.string().optional(),
  PINO_LOG_LEVEL: z
    .enum(['info', 'warn', 'error', 'fatal'])
    .default('info'),
  PORT: z.coerce.number().default(3001),
})

export type WebEnv = z.infer<typeof webEnvSchema>
export type ApiEnv = z.infer<typeof apiEnvSchema>
