import { z } from 'zod';
export declare const webEnvSchema: z.ZodObject<{
    NEXT_PUBLIC_API_URL: z.ZodString;
    NEXT_PUBLIC_SENTRY_DSN: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_ANON_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
    SUPABASE_ANON_KEY?: string | undefined;
}, {
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
    SUPABASE_ANON_KEY?: string | undefined;
}>;
export declare const apiEnvSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    SENTRY_DSN: z.ZodOptional<z.ZodString>;
    PINO_LOG_LEVEL: z.ZodDefault<z.ZodEnum<["info", "warn", "error", "fatal"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
    PINO_LOG_LEVEL: "info" | "warn" | "error" | "fatal";
    PORT: number;
    SENTRY_DSN?: string | undefined;
}, {
    DATABASE_URL: string;
    SENTRY_DSN?: string | undefined;
    PINO_LOG_LEVEL?: "info" | "warn" | "error" | "fatal" | undefined;
    PORT?: number | undefined;
}>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
