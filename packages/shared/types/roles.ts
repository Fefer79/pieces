export const Role = {
  MECHANIC: 'MECHANIC',
  OWNER: 'OWNER',
  SELLER: 'SELLER',
  RIDER: 'RIDER',
  ADMIN: 'ADMIN',
  ENTERPRISE: 'ENTERPRISE',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export type RolePermissions = {
  [K in Role]: string[]
}
