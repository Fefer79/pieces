import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

export type SubscriptionTier = 'FREE' | 'PRO_FLOTTE' | 'CONTINUITE'
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
export type BillingCycle = 'MONTHLY' | 'ANNUAL'

const ACTIVE_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE']
const DEFAULT_TRIAL_DAYS = 30
const ANNUAL_MONTHS_BILLED = 10 // payer 10 mois pour 12 = 2 mois offerts

// Paliers dégressifs par véhicule (FCFA / véhicule / mois)
// Continuité = Pro Flotte × 2 à chaque palier (mêmes seuils 1–20 / 21–50 / 51–100).
const PALIERS: Record<'PRO_FLOTTE' | 'CONTINUITE', ReadonlyArray<{ upTo: number; price: number }>> = {
  PRO_FLOTTE: [
    { upTo: 20, price: 5_000 },
    { upTo: 50, price: 4_000 },
    { upTo: 100, price: 3_000 },
  ],
  CONTINUITE: [
    { upTo: 20, price: 10_000 },
    { upTo: 50, price: 8_000 },
    { upTo: 100, price: 6_000 },
  ],
}

export function priceForVehicleCount(tier: SubscriptionTier, n: number): number {
  if (tier === 'FREE' || n <= 0) return 0
  const grid = PALIERS[tier]
  for (const p of grid) {
    if (n <= p.upTo) return p.price
  }
  return grid[grid.length - 1]!.price // 100+ : tarif négocié — par défaut palier le plus bas
}

export interface MonthlyAmountBreakdown {
  tier: SubscriptionTier
  vehicleCount: number
  pricePerVehicle: number
  monthlyTotal: number
  annualTotal: number
}

export function computeMonthlyAmount(tier: SubscriptionTier, vehicleCount: number): MonthlyAmountBreakdown {
  const pricePerVehicle = priceForVehicleCount(tier, vehicleCount)
  const monthlyTotal = pricePerVehicle * Math.max(0, vehicleCount)
  return {
    tier,
    vehicleCount,
    pricePerVehicle,
    monthlyTotal,
    annualTotal: monthlyTotal * ANNUAL_MONTHS_BILLED, // 2 mois offerts
  }
}

// Hiérarchie d'inclusion : CONTINUITE > PRO_FLOTTE > FREE
const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  PRO_FLOTTE: 1,
  CONTINUITE: 2,
}

export function tierIncludes(actual: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required]
}

export async function getCurrentSubscription(enterpriseId: string) {
  const now = new Date()
  const sub = await prisma.enterpriseSubscription.findFirst({
    where: {
      enterpriseId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!sub) return null
  // Auto-expire trial (lazy: state stays TRIALING in DB until cron flips it)
  if (sub.status === 'TRIALING' && sub.trialEndsAt && sub.trialEndsAt < now) {
    return { ...sub, status: 'TRIALING' as const, trialExpired: true }
  }
  return { ...sub, trialExpired: false }
}

export async function currentTier(enterpriseId: string): Promise<SubscriptionTier> {
  const sub = await getCurrentSubscription(enterpriseId)
  if (!sub) return 'FREE'
  if (sub.trialExpired) return 'FREE'
  return sub.tier as SubscriptionTier
}

export async function hasActiveTier(enterpriseId: string, required: SubscriptionTier): Promise<boolean> {
  if (required === 'FREE') return true
  const tier = await currentTier(enterpriseId)
  return tierIncludes(tier, required)
}

export async function requireActiveTier(enterpriseId: string, required: SubscriptionTier): Promise<void> {
  const ok = await hasActiveTier(enterpriseId, required)
  if (!ok) {
    throw new AppError('SUBSCRIPTION_REQUIRED', 402, {
      message: `Cette fonctionnalité requiert un abonnement ${required}`,
      details: { required },
    })
  }
}

export interface CreateSubscriptionInput {
  tier: SubscriptionTier
  billingCycle?: BillingCycle
  startTrial?: boolean
  trialDays?: number
  notes?: string | null
  actorUserId?: string
}

export async function createSubscription(enterpriseId: string, input: CreateSubscriptionInput) {
  const enterprise = await prisma.enterprise.findUnique({ where: { id: enterpriseId } })
  if (!enterprise) {
    throw new AppError('ENTERPRISE_NOT_FOUND', 404, { message: 'Entreprise introuvable' })
  }

  // Cancel any currently active subscription before creating a new one
  await prisma.enterpriseSubscription.updateMany({
    where: { enterpriseId, status: { in: ACTIVE_STATUSES } },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })

  const useTrial = input.startTrial ?? input.tier !== 'FREE'
  const trialDays = input.trialDays ?? DEFAULT_TRIAL_DAYS
  const now = new Date()
  const trialEndsAt = useTrial && input.tier !== 'FREE' ? new Date(now.getTime() + trialDays * 86_400_000) : null

  const sub = await prisma.enterpriseSubscription.create({
    data: {
      enterpriseId,
      tier: input.tier,
      status: useTrial && input.tier !== 'FREE' ? 'TRIALING' : 'ACTIVE',
      billingCycle: input.billingCycle ?? 'MONTHLY',
      trialEndsAt,
      notes: input.notes ?? null,
    },
  })

  await prisma.enterpriseSubscriptionEvent.create({
    data: {
      subscriptionId: sub.id,
      kind: 'CREATED',
      payload: { tier: input.tier, trial: useTrial, trialDays: useTrial ? trialDays : null },
      actorUserId: input.actorUserId ?? null,
    },
  })
  if (useTrial && input.tier !== 'FREE') {
    await prisma.enterpriseSubscriptionEvent.create({
      data: {
        subscriptionId: sub.id,
        kind: 'TRIAL_STARTED',
        payload: { trialEndsAt },
        actorUserId: input.actorUserId ?? null,
      },
    })
  }
  return sub
}

export interface UpdateSubscriptionInput {
  tier?: SubscriptionTier
  status?: SubscriptionStatus
  billingCycle?: BillingCycle
  notes?: string | null
  actorUserId?: string
}

export async function updateSubscription(subscriptionId: string, input: UpdateSubscriptionInput) {
  const existing = await prisma.enterpriseSubscription.findUnique({ where: { id: subscriptionId } })
  if (!existing) {
    throw new AppError('SUBSCRIPTION_NOT_FOUND', 404, { message: 'Abonnement introuvable' })
  }

  const data: Record<string, unknown> = {}
  const events: Array<{ kind: string; payload: Record<string, string | number | boolean | null> }> = []

  if (input.tier && input.tier !== existing.tier) {
    data.tier = input.tier
    events.push({ kind: 'TIER_CHANGED', payload: { from: existing.tier, to: input.tier } })
  }
  if (input.billingCycle && input.billingCycle !== existing.billingCycle) {
    data.billingCycle = input.billingCycle
    events.push({ kind: 'CYCLE_CHANGED', payload: { from: existing.billingCycle, to: input.billingCycle } })
  }
  if (input.status && input.status !== existing.status) {
    data.status = input.status
    if (input.status === 'ACTIVE') {
      if (existing.status === 'SUSPENDED') events.push({ kind: 'REACTIVATED', payload: {} })
      else if (existing.status === 'TRIALING') events.push({ kind: 'ACTIVATED', payload: {} })
    } else if (input.status === 'SUSPENDED') events.push({ kind: 'SUSPENDED', payload: {} })
    else if (input.status === 'CANCELLED') {
      data.cancelledAt = new Date()
      events.push({ kind: 'CANCELLED', payload: {} })
    }
  }
  if (input.notes !== undefined) data.notes = input.notes

  if (Object.keys(data).length === 0) return existing

  const updated = await prisma.enterpriseSubscription.update({ where: { id: subscriptionId }, data })

  for (const e of events) {
    await prisma.enterpriseSubscriptionEvent.create({
      data: {
        subscriptionId,
        kind: e.kind as never,
        payload: e.payload,
        actorUserId: input.actorUserId ?? null,
      },
    })
  }
  return updated
}

export async function listSubscriptionsForEnterprise(enterpriseId: string) {
  return prisma.enterpriseSubscription.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: 'desc' },
    include: {
      events: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
}

// Constants exported for tests / pricing display
export const SUBSCRIPTION_CONSTANTS = {
  DEFAULT_TRIAL_DAYS,
  ANNUAL_MONTHS_BILLED,
  PALIERS,
}
