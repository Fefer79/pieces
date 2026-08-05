import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/appError.js'
import {
  capabilitiesFor,
  hasCapability,
  type ErpCapability,
  type StaffRoleKey,
  type BusinessUnitKey,
} from 'shared/constants'

// Garde du back-office interne (/admin).
//
// Deux dimensions indépendantes cohabitent :
//   - `Role` (BUYER, SELLER, …) → les « espaces » côté client, via requireRole.
//   - `TeamMemberProfile.staffRole` → les métiers internes, via cette garde.
//
// Un `Role.ADMIN` obtient toutes les capacités sans fiche d'équipe : c'est
// l'amorçage, il attribue les premiers rôles métier. Rien ne change donc pour
// les administrateurs actuels ; la garde n'ouvre l'accès qu'à de nouveaux
// profils, elle ne le retire à personne.
//
// ⚠ À composer TOUJOURS après `requireAuth`, qui pose `request.user`.

export interface StaffContext {
  /** Fiche d'équipe, absente pour un ADMIN plateforme sans profil. */
  staffId: string | null
  staffRole: StaffRoleKey | null
  businessUnits: BusinessUnitKey[]
  fonction: string | null
  active: boolean
  isPlatformAdmin: boolean
  capabilities: ErpCapability[]
}

declare module 'fastify' {
  interface FastifyRequest {
    staff: StaffContext
  }
}

async function erpAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('staff', undefined as unknown as StaffContext)
}

export const erpAuth = fp(erpAuthPlugin, { name: 'erpAuth' })

/** Charge le contexte staff de l'utilisateur courant. Ne lève jamais. */
export async function loadStaffContext(userId: string, roles: string[]): Promise<StaffContext> {
  const isPlatformAdmin = roles.includes('ADMIN')
  const member = await prisma.teamMemberProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      staffRole: true,
      businessUnits: true,
      fonction: true,
      actif: true,
    },
  })

  return {
    staffId: member?.id ?? null,
    staffRole: (member?.staffRole as StaffRoleKey | null | undefined) ?? null,
    businessUnits: (member?.businessUnits as BusinessUnitKey[] | undefined) ?? [],
    fonction: member?.fonction ?? null,
    active: member?.actif ?? false,
    isPlatformAdmin,
    capabilities: capabilitiesFor({
      staffRole: (member?.staffRole as StaffRoleKey | null | undefined) ?? null,
      active: member?.actif ?? false,
      isPlatformAdmin,
    }),
  }
}

/**
 * preHandler : exige une capacité. Décore `request.staff` au passage, pour que
 * le service sache qui agit (`staffId`) sans refaire la requête.
 *
 * Remplace `requireRole('ADMIN')` sur les routes du back-office : la capacité
 * est plus fine et l'ADMIN plateforme les a toutes.
 */
export function requireCapability(capability: ErpCapability) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw new AppError('AUTH_MISSING_TOKEN', 401)
    }

    const staff = await loadStaffContext(request.user.id, request.user.roles ?? [])
    request.staff = staff

    if (!hasCapability(staff.capabilities, capability)) {
      throw new AppError('ERP_FORBIDDEN', 403, {
        message: "Vous n'avez pas accès à cette partie du back-office",
        required: capability,
      })
    }
  }
}

/**
 * Exige une fiche d'équipe réelle (pas seulement le rôle ADMIN plateforme).
 * Utile pour les actions qui doivent être imputables à quelqu'un. À appeler
 * DANS le service.
 */
export function requireStaffId(staff: StaffContext): string {
  if (!staff.staffId) {
    throw new AppError('ERP_STAFF_PROFILE_REQUIRED', 409, {
      message:
        "Cette action doit être imputée à un membre de l'équipe. Créez votre fiche dans Équipe.",
    })
  }
  return staff.staffId
}
