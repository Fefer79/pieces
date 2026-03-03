import { z } from 'zod'
import { Role } from '../types/roles'

type RoleValue = (typeof Role)[keyof typeof Role]
const validRoles = Object.values(Role) as [RoleValue, ...RoleValue[]]

export const switchContextSchema = z.object({
  role: z.enum(validRoles, { message: 'Rôle invalide' }),
})

export const selectRoleSchema = z.object({
  role: z.enum(['MECHANIC', 'OWNER', 'ENTERPRISE'] as const, {
    message: 'Rôle invalide. Choisissez MECHANIC, OWNER ou ENTERPRISE',
  }),
})

export const updateRolesSchema = z.object({
  roles: z
    .array(z.enum(validRoles, { message: 'Rôle invalide' }))
    .min(1, 'Au moins un rôle est requis'),
})
