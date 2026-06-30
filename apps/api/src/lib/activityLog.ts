import type { Role, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export type ActivityAction =
  | 'LIAISON_VENDOR_CREATED'
  | 'LIAISON_VENDOR_UPDATED'
  | 'LIAISON_PART_CREATED'
  | 'LIAISON_QUICK_PART_CREATED'
  | 'LIAISON_PART_UPDATED'
  | 'LIAISON_COMMISSION_ACCEPTED'

interface RecordParams {
  actorId: string
  actorRole: Role
  action: ActivityAction
  targetType: 'Vendor' | 'CatalogItem'
  targetId?: string | null
  payload?: Record<string, unknown>
}

export async function recordActivity(params: RecordParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        ...(params.payload !== undefined && {
          payload: params.payload as Prisma.InputJsonValue,
        }),
      },
    })
  } catch {
    // Best-effort — never fail the parent operation if logging fails
  }
}
