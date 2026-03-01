import { z } from 'zod'

const validRoles = ['MECHANIC', 'OWNER', 'SELLER', 'RIDER', 'ADMIN', 'ENTERPRISE'] as const

export const switchContextSchema = z.object({
  role: z.enum(validRoles, { message: 'Rôle invalide' }),
})

export const updateRolesSchema = z.object({
  roles: z
    .array(z.enum(validRoles, { message: 'Rôle invalide' }))
    .min(1, 'Au moins un rôle est requis'),
})
