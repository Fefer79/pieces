import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { supabaseAdmin } from '../lib/supabase.js'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../lib/appError.js'
import type { Role } from 'shared/types'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      phone: string
      roles: Role[]
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

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    throw new AppError('AUTH_INVALID_TOKEN', 401)
  }

  const user = await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    update: {},
    create: {
      supabaseId: data.user.id,
      phone: data.user.phone ?? '',
      roles: ['MECHANIC'],
    },
    select: { id: true, phone: true, roles: true },
  })

  request.user = {
    id: user.id,
    phone: user.phone,
    roles: user.roles as Role[],
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
