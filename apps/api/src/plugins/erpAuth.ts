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

// Garde de l'ERP interne.
//
// Deux dimensions indépendantes cohabitent :
//   - `Role` (BUYER, SELLER, …) → les « espaces » côté client, via requireRole.
//   - `StaffMember.staffRole`   → les métiers internes, via requireErpCapability.
//
// Un `Role.ADMIN` obtient toutes les capacités sans fiche staff : c'est
// l'amorçage, il peut créer les premiers `StaffMember`.
//
// ⚠ À composer TOUJOURS après `requireAuth`, qui pose `request.user`.

export interface ErpStaffContext {
  /** Fiche staff, absente pour un ADMIN plateforme sans fiche. */
  staffId: string | null
  staffRole: StaffRoleKey | null
  businessUnits: BusinessUnitKey[]
  title: string | null
  active: boolean
  isPlatformAdmin: boolean
  capabilities: ErpCapability[]
}

declare module 'fastify' {
  interface FastifyRequest {
    staff: ErpStaffContext
  }
}

async function erpAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('staff', undefined as unknown as ErpStaffContext)
}

export const erpAuth = fp(erpAuthPlugin, { name: 'erpAuth' })

/** Charge le contexte staff de l'utilisateur courant. Ne lève jamais. */
export async function loadStaffContext(userId: string, roles: string[]): Promise<ErpStaffContext> {
  const isPlatformAdmin = roles.includes('ADMIN')
  const member = await prisma.staffMember.findUnique({
    where: { userId },
    select: {
      id: true,
      staffRole: true,
      businessUnits: true,
      title: true,
      active: true,
    },
  })

  return {
    staffId: member?.id ?? null,
    staffRole: (member?.staffRole as StaffRoleKey | undefined) ?? null,
    businessUnits: (member?.businessUnits as BusinessUnitKey[] | undefined) ?? [],
    title: member?.title ?? null,
    active: member?.active ?? false,
    isPlatformAdmin,
    capabilities: capabilitiesFor({
      staffRole: (member?.staffRole as StaffRoleKey | undefined) ?? null,
      active: member?.active ?? false,
      isPlatformAdmin,
    }),
  }
}

/**
 * preHandler : exige une capacité ERP. Décore `request.staff` au passage, pour
 * que le service sache qui agit (`staffId`) sans refaire la requête.
 */
export function requireErpCapability(capability: ErpCapability) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw new AppError('AUTH_MISSING_TOKEN', 401)
    }

    const staff = await loadStaffContext(request.user.id, request.user.roles ?? [])
    request.staff = staff

    if (!hasCapability(staff.capabilities, capability)) {
      throw new AppError('ERP_FORBIDDEN', 403, {
        message: "Vous n'avez pas accès à cette partie de l'ERP",
        required: capability,
      })
    }
  }
}

/**
 * Exige une fiche staff réelle (pas seulement le rôle ADMIN plateforme).
 * Utile pour les actions qui doivent être imputables à un membre de l'équipe —
 * créer une tâche, signer une note. À appeler DANS le service.
 */
export function requireStaffId(staff: ErpStaffContext): string {
  if (!staff.staffId) {
    throw new AppError('ERP_STAFF_PROFILE_REQUIRED', 409, {
      message:
        "Cette action doit être imputée à un membre de l'équipe. Créez votre fiche dans Paramètres › Équipe.",
    })
  }
  return staff.staffId
}
