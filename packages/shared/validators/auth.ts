import { z } from 'zod'

export const phoneSchema = z
  .string()
  .regex(/^\+225(01|05|07)\d{8}$/, 'Numéro ivoirien invalide (format: +225 XX XX XX XX XX)')

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Code OTP invalide (6 chiffres)')
