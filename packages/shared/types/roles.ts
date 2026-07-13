export const Role = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  RIDER: 'RIDER',
  ADMIN: 'ADMIN',
  ENTERPRISE: 'ENTERPRISE',
  LIAISON: 'LIAISON',
  // Chauffeur d'entreprise (invité par sa flotte) — présent dans l'enum
  // Prisma ; nécessaire ici pour switchContext/updateRoles et le SpaceGuard.
  DRIVER: 'DRIVER',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export type RolePermissions = {
  [K in Role]: string[]
}
