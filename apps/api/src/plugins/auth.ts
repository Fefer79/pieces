import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { supabaseAdmin } from '../lib/supabase.js'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/appError.js'
import { isPiecesToken, verifyPiecesToken } from '../lib/piecesToken.js'
import type { Role } from 'shared/types'

interface UserRow {
  id: string
  phone: string | null
  email: string | null
  roles: Role[]
  activeContext: Role | null
  consentedAt: Date | null
}

const USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  roles: true,
  activeContext: true,
  consentedAt: true,
} as const

// Supabase renvoie le téléphone sans le « + » initial (ex. 2250700000000) ;
// tout le reste de l'app (WhatsApp, profil) utilise le format +225XXXXXXXXXX.
function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null
  return phone.startsWith('+') ? phone : `+${phone}`
}

function shapeUser(user: UserRow): FastifyRequest['user'] {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    roles: user.roles,
    activeContext: user.activeContext ?? null,
    consentedAt: user.consentedAt?.toISOString() ?? null,
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      phone: string | null
      email: string | null
      roles: Role[]
      activeContext: Role | null
      consentedAt: string | null
    }
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', undefined as unknown as FastifyRequest['user'])
}

export const auth = fp(authPlugin, { name: 'auth' })

export async function requireAuth(request: FastifyRequest) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('AUTH_MISSING_TOKEN', 401)
  }

  const token = authHeader.slice(7)

  // Pièces-native session (WhatsApp reverse-OTP login) — resolve without Supabase.
  if (isPiecesToken(token)) {
    const payload = verifyPiecesToken(token)
    if (!payload) {
      throw new AppError('AUTH_INVALID_TOKEN', 401)
    }
    const waUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: USER_SELECT,
    })
    if (!waUser) {
      throw new AppError('AUTH_INVALID_TOKEN', 401)
    }
    // Même auto-set que le chemin Supabase : un seul rôle → contexte posé.
    if (waUser.roles.length === 1 && !waUser.activeContext) {
      await prisma.user.update({
        where: { id: waUser.id },
        data: { activeContext: waUser.roles[0] },
      })
      waUser.activeContext = waUser.roles[0] ?? null
    }
    request.user = shapeUser(waUser as UserRow)
    return
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    throw new AppError('AUTH_INVALID_TOKEN', 401)
  }

  const phone = toE164(data.user.phone)
  const email = data.user.email ?? null

  let user
  try {
    user = await prisma.user.upsert({
      where: { supabaseId: data.user.id },
      // Ne jamais réécrire le profil à la connexion : une fois la ligne créée,
      // c'est le profil Pièces (modifiable via /profile) qui fait foi.
      update: {},
      create: {
        supabaseId: data.user.id,
        phone,
        email,
        roles: ['MECHANIC'],
      },
      select: { id: true, phone: true, email: true, roles: true, activeContext: true, consentedAt: true },
    })
  } catch (err: unknown) {
    // Unique constraint on email/phone: link existing user to this Supabase account
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
        select: { id: true, phone: true, email: true, roles: true, activeContext: true, consentedAt: true },
      })
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { supabaseId: data.user.id },
          select: { id: true, phone: true, email: true, roles: true, activeContext: true, consentedAt: true },
        })
      } else {
        throw err
      }
    } else {
      throw err
    }
  }

  // Auto-set activeContext if single role and not yet set
  if (user.roles.length === 1 && !user.activeContext) {
    await prisma.user.update({
      where: { id: user.id },
      data: { activeContext: user.roles[0] },
    })
    user.activeContext = user.roles[0] ?? null
  }

  request.user = shapeUser(user as UserRow)
}

export async function requireConsent(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError('AUTH_MISSING_TOKEN', 401)
  }

  if (!request.user.consentedAt) {
    throw new AppError('CONSENT_REQUIRED', 403)
  }
}

export function requireRole(...roles: Role[]) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw new AppError('AUTH_MISSING_TOKEN', 401)
    }

    const userRoles = request.user.roles ?? []
    const hasRole = roles.some((role) => userRoles.includes(role))

    if (!hasRole) {
      throw new AppError('AUTH_INSUFFICIENT_ROLE', 403)
    }
  }
}
