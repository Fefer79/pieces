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
  // Agent Fiche Terrain (identification de pièces par photo via l'API Claude).
  // Absente, les endpoints d'enrichissement répondent 503 — le reste de l'API
  // fonctionne normalement.
  ANTHROPIC_API_KEY: z.string().optional(),
  // Modèles surchargeables sans redéploiement (ex. passer la passe 1 sur Sonnet
  // si le taux d'erreur de lecture d'étiquettes dégradées est trop haut).
  ENRICHMENT_PASS1_MODEL: z.string().default('claude-haiku-4-5'),
  ENRICHMENT_PASS2_MODEL: z.string().default('claude-sonnet-4-6'),
  PINO_LOG_LEVEL: z
    .enum(['info', 'warn', 'error', 'fatal'])
    .default('info'),
  PORT: z.coerce.number().default(3001),
})

export type WebEnv = z.infer<typeof webEnvSchema>
export type ApiEnv = z.infer<typeof apiEnvSchema>
