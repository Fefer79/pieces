import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const subFindFirst = vi.fn()
const subFindUnique = vi.fn()
const subFindMany = vi.fn()
const subCreate = vi.fn()
const subUpdate = vi.fn()
const subUpdateMany = vi.fn()
const eventCreate = vi.fn()
const enterpriseFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    enterpriseSubscription: {
      findFirst: (...a: unknown[]) => subFindFirst(...a),
      findUnique: (...a: unknown[]) => subFindUnique(...a),
      findMany: (...a: unknown[]) => subFindMany(...a),
      create: (...a: unknown[]) => subCreate(...a),
      update: (...a: unknown[]) => subUpdate(...a),
      updateMany: (...a: unknown[]) => subUpdateMany(...a),
    },
    enterpriseSubscriptionEvent: {
      create: (...a: unknown[]) => eventCreate(...a),
    },
    enterprise: { findUnique: (...a: unknown[]) => enterpriseFindUnique(...a) },
  },
}))

const {
  priceForVehicleCount,
  computeMonthlyAmount,
  tierIncludes,
  currentTier,
  hasActiveTier,
  requireActiveTier,
  createSubscription,
  updateSubscription,
} = await import('./subscription.service.js')

beforeEach(() => {
  subFindFirst.mockReset()
  subFindUnique.mockReset()
  subFindMany.mockReset()
  subCreate.mockReset()
  subUpdate.mockReset()
  subUpdateMany.mockReset()
  eventCreate.mockReset()
  enterpriseFindUnique.mockReset()
})

describe('prix flat par véhicule', () => {
  it('FREE returns 0 regardless of count', () => {
    expect(priceForVehicleCount('FREE', 1)).toBe(0)
    expect(priceForVehicleCount('FREE', 200)).toBe(0)
  })

  it('Flotte Pro: 5 000 F flat à tous les volumes', () => {
    expect(priceForVehicleCount('PRO_FLOTTE', 1)).toBe(5_000)
    expect(priceForVehicleCount('PRO_FLOTTE', 20)).toBe(5_000)
    expect(priceForVehicleCount('PRO_FLOTTE', 100)).toBe(5_000)
    expect(priceForVehicleCount('PRO_FLOTTE', 500)).toBe(5_000)
  })

  it('Flotte Pro +: 10 000 F flat à tous les volumes', () => {
    expect(priceForVehicleCount('PRO_FLOTTE_PLUS', 1)).toBe(10_000)
    expect(priceForVehicleCount('PRO_FLOTTE_PLUS', 20)).toBe(10_000)
    expect(priceForVehicleCount('PRO_FLOTTE_PLUS', 100)).toBe(10_000)
    expect(priceForVehicleCount('PRO_FLOTTE_PLUS', 500)).toBe(10_000)
  })

  it('zero or negative count returns 0', () => {
    expect(priceForVehicleCount('PRO_FLOTTE', 0)).toBe(0)
    expect(priceForVehicleCount('PRO_FLOTTE_PLUS', -5)).toBe(0)
  })
})

describe('computeMonthlyAmount', () => {
  it('Pro Flotte 20 véhicules = 100 000 F', () => {
    const r = computeMonthlyAmount('PRO_FLOTTE', 20)
    expect(r.pricePerVehicle).toBe(5_000)
    expect(r.monthlyTotal).toBe(100_000)
    expect(r.annualTotal).toBe(1_000_000) // 10 mois facturés
  })

  it('Flotte Pro + 20 véhicules = 200 000 F (Flotte Pro ×2)', () => {
    const r = computeMonthlyAmount('PRO_FLOTTE_PLUS', 20)
    expect(r.pricePerVehicle).toBe(10_000)
    expect(r.monthlyTotal).toBe(200_000)
  })

  it('Flotte Pro + 50 véhicules = 10 000 × 50 = 500 000 F (prix flat)', () => {
    const r = computeMonthlyAmount('PRO_FLOTTE_PLUS', 50)
    expect(r.monthlyTotal).toBe(500_000)
  })

  it('FREE = 0', () => {
    expect(computeMonthlyAmount('FREE', 30).monthlyTotal).toBe(0)
  })
})

describe('tierIncludes', () => {
  it('PRO_FLOTTE_PLUS includes everything', () => {
    expect(tierIncludes('PRO_FLOTTE_PLUS', 'FREE')).toBe(true)
    expect(tierIncludes('PRO_FLOTTE_PLUS', 'PRO_FLOTTE')).toBe(true)
    expect(tierIncludes('PRO_FLOTTE_PLUS', 'PRO_FLOTTE_PLUS')).toBe(true)
  })
  it('PRO_FLOTTE includes FREE only', () => {
    expect(tierIncludes('PRO_FLOTTE', 'FREE')).toBe(true)
    expect(tierIncludes('PRO_FLOTTE', 'PRO_FLOTTE')).toBe(true)
    expect(tierIncludes('PRO_FLOTTE', 'PRO_FLOTTE_PLUS')).toBe(false)
  })
  it('FREE only includes itself', () => {
    expect(tierIncludes('FREE', 'FREE')).toBe(true)
    expect(tierIncludes('FREE', 'PRO_FLOTTE')).toBe(false)
  })
})

describe('currentTier & gating', () => {
  it('returns FREE when no subscription', async () => {
    subFindFirst.mockResolvedValue(null)
    expect(await currentTier('ent-1')).toBe('FREE')
  })

  it('returns active PRO_FLOTTE', async () => {
    subFindFirst.mockResolvedValue({
      tier: 'PRO_FLOTTE',
      status: 'ACTIVE',
      trialEndsAt: null,
    })
    expect(await currentTier('ent-1')).toBe('PRO_FLOTTE')
  })

  it('TRIALING is active until trialEndsAt', async () => {
    subFindFirst.mockResolvedValue({
      tier: 'PRO_FLOTTE_PLUS',
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 86_400_000),
    })
    expect(await currentTier('ent-1')).toBe('PRO_FLOTTE_PLUS')
  })

  it('TRIALING expired falls back to FREE', async () => {
    subFindFirst.mockResolvedValue({
      tier: 'PRO_FLOTTE',
      status: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 1000),
    })
    expect(await currentTier('ent-1')).toBe('FREE')
  })

  it('hasActiveTier honors hierarchy', async () => {
    subFindFirst.mockResolvedValue({
      tier: 'PRO_FLOTTE_PLUS',
      status: 'ACTIVE',
      trialEndsAt: null,
    })
    expect(await hasActiveTier('ent-1', 'PRO_FLOTTE')).toBe(true)
    expect(await hasActiveTier('ent-1', 'PRO_FLOTTE_PLUS')).toBe(true)
  })

  it('requireActiveTier throws 402 when missing', async () => {
    subFindFirst.mockResolvedValue(null)
    await expect(requireActiveTier('ent-1', 'PRO_FLOTTE')).rejects.toMatchObject({
      code: 'SUBSCRIPTION_REQUIRED',
      statusCode: 402,
    })
  })
})

describe('createSubscription', () => {
  it('rejects unknown enterprise', async () => {
    enterpriseFindUnique.mockResolvedValue(null)
    await expect(createSubscription('ent-x', { tier: 'PRO_FLOTTE' })).rejects.toMatchObject({
      code: 'ENTERPRISE_NOT_FOUND',
    })
  })

  it('cancels prior active sub, creates TRIALING, emits CREATED + TRIAL_STARTED', async () => {
    enterpriseFindUnique.mockResolvedValue({ id: 'ent-1' })
    subUpdateMany.mockResolvedValue({ count: 1 })
    subCreate.mockResolvedValue({ id: 'sub-1', tier: 'PRO_FLOTTE', status: 'TRIALING' })
    eventCreate.mockResolvedValue({})

    await createSubscription('ent-1', { tier: 'PRO_FLOTTE' })

    expect(subUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ enterpriseId: 'ent-1' }),
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    )
    expect(subCreate).toHaveBeenCalled()
    expect(eventCreate).toHaveBeenCalledTimes(2) // CREATED + TRIAL_STARTED
    const kinds = eventCreate.mock.calls.map((c) => (c[0] as { data: { kind: string } }).data.kind)
    expect(kinds).toContain('CREATED')
    expect(kinds).toContain('TRIAL_STARTED')
  })

  it('FREE tier is created ACTIVE without trial', async () => {
    enterpriseFindUnique.mockResolvedValue({ id: 'ent-1' })
    subUpdateMany.mockResolvedValue({ count: 0 })
    subCreate.mockResolvedValue({ id: 'sub-free', tier: 'FREE', status: 'ACTIVE' })
    eventCreate.mockResolvedValue({})

    await createSubscription('ent-1', { tier: 'FREE' })
    const createArg = subCreate.mock.calls[0]![0] as { data: { status: string; trialEndsAt: Date | null } }
    expect(createArg.data.status).toBe('ACTIVE')
    expect(createArg.data.trialEndsAt).toBeNull()
  })
})

describe('updateSubscription', () => {
  it('emits TIER_CHANGED on tier upgrade', async () => {
    subFindUnique.mockResolvedValue({
      id: 'sub-1',
      tier: 'PRO_FLOTTE',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
    })
    subUpdate.mockResolvedValue({ id: 'sub-1', tier: 'PRO_FLOTTE_PLUS' })
    eventCreate.mockResolvedValue({})

    await updateSubscription('sub-1', { tier: 'PRO_FLOTTE_PLUS' })
    const kinds = eventCreate.mock.calls.map((c) => (c[0] as { data: { kind: string } }).data.kind)
    expect(kinds).toContain('TIER_CHANGED')
  })

  it('SUSPENDED → ACTIVE emits REACTIVATED', async () => {
    subFindUnique.mockResolvedValue({
      id: 'sub-1',
      tier: 'PRO_FLOTTE',
      status: 'SUSPENDED',
      billingCycle: 'MONTHLY',
    })
    subUpdate.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' })
    eventCreate.mockResolvedValue({})

    await updateSubscription('sub-1', { status: 'ACTIVE' })
    const kinds = eventCreate.mock.calls.map((c) => (c[0] as { data: { kind: string } }).data.kind)
    expect(kinds).toContain('REACTIVATED')
  })

  it('CANCELLED sets cancelledAt', async () => {
    subFindUnique.mockResolvedValue({
      id: 'sub-1',
      tier: 'PRO_FLOTTE',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
    })
    subUpdate.mockResolvedValue({ id: 'sub-1', status: 'CANCELLED' })
    eventCreate.mockResolvedValue({})

    await updateSubscription('sub-1', { status: 'CANCELLED' })
    const updateArg = subUpdate.mock.calls[0]![0] as { data: { cancelledAt?: Date } }
    expect(updateArg.data.cancelledAt).toBeInstanceOf(Date)
  })
})
