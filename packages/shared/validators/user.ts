import { z } from 'zod'
import { Role } from '../types/roles'

type RoleValue = (typeof Role)[keyof typeof Role]
const validRoles = Object.values(Role) as [RoleValue, ...RoleValue[]]

export const switchContextSchema = z.object({
  role: z.enum(validRoles, { message: 'Rôle invalide' }),
})

export const selectRoleSchema = z.object({
  role: z.enum(['MECHANIC', 'OWNER', 'SELLER', 'ENTERPRISE'] as const, {
    message: 'Rôle invalide. Choisissez MECHANIC, OWNER, SELLER ou ENTERPRISE',
  }),
})

export const updateRolesSchema = z.object({
  roles: z
    .array(z.enum(validRoles, { message: 'Rôle invalide' }))
    .min(1, 'Au moins un rôle est requis'),
})

// Enregistrement manuel d'un utilisateur WhatsApp par un admin (le bot n'étant
// pas encore branché en prod). Le numéro est normalisé côté serveur.
export const adminRegisterWhatsAppSchema = z.object({
  phone: z.string().min(8, 'Numéro requis').max(20, 'Numéro trop long'),
  name: z.string().trim().max(80, 'Nom trop long').optional(),
})
