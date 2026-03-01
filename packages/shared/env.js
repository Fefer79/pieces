import { z } from 'zod';
export const webEnvSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
});
export const apiEnvSchema = z.object({
    DATABASE_URL: z.string().url(),
    SENTRY_DSN: z.string().optional(),
    PINO_LOG_LEVEL: z
        .enum(['info', 'warn', 'error', 'fatal'])
        .default('info'),
    PORT: z.coerce.number().default(3001),
});
