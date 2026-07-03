import { z } from 'zod'

export const phoneSchema = z
  .string()
  .regex(/^\+225(01|05|07)\d{8}$/, 'Numéro ivoirien invalide (format: +225 XX XX XX XX XX)')

export const emailSchema = z
  .string()
  .email('Adresse email invalide')
  .max(255)

/** Password rules for email sign-up. Supabase (bcrypt) caps the input at 72 bytes. */
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(72, 'Le mot de passe est trop long')

/** Body for email/password sign-in. */
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
})

/** Body for email/password sign-up. */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

/** Body for POST /auth/whatsapp/start — begin WhatsApp reverse-OTP login */
export const whatsappLoginStartSchema = z.object({
  phone: phoneSchema,
})

/** Query for GET /auth/whatsapp/status — poll a reverse-OTP login code */
export const whatsappLoginStatusSchema = z.object({
  code: z.string().regex(/^P-?\d{4}$/i, 'Code de connexion invalide'),
})
