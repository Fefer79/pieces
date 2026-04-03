import { z } from 'zod'

export const phoneSchema = z
  .string()
  .regex(/^\+225(01|05|07)\d{8}$/, 'Numéro ivoirien invalide (format: +225 XX XX XX XX XX)')

export const emailSchema = z
  .string()
  .email('Adresse email invalide')
  .max(255)

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Code OTP invalide (6 chiffres)')

/** Body for POST /auth/otp — send OTP via phone OR email */
export const sendOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((data) => data.phone || data.email, {
    message: 'Veuillez fournir un numéro de téléphone ou une adresse email',
  })

/** Body for POST /auth/verify — verify OTP from phone OR email */
export const verifyOtpSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    token: otpSchema,
  })
  .refine((data) => data.phone || data.email, {
    message: 'Veuillez fournir un numéro de téléphone ou une adresse email',
  })
