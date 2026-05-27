import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const scheduleFindMany = vi.fn()
const scheduleCreate = vi.fn()
const scheduleUpdate = vi.fn()
const scheduleFindFirst = vi.fn()
const vehicleFindMany = vi.fn()
const vehicleFindFirst = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    maintenanceSchedule: {
      findMany: (...a: unknown[]) => scheduleFindMany(...a),
      create: (...a: unknown[]) => scheduleCreate(...a),
      update: (...a: unknown[]) => scheduleUpdate(...a),
      findFirst: (...a: unknown[]) => scheduleFindFirst(...a),
    },
    vehicle: {
      findMany: (...a: unknown[]) => vehicleFindMany(...a),
      findFirst: (...a: unknown[]) => vehicleFindFirst(...a),
    },
    enterpriseMember: {
      findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a),
    },
  },
}))

const {
  computeScheduleStatus,
  listSchedules,
  markScheduleDone,
  listEnterpriseUpcomingMaintenance,
} = await import('./maintenance.service.js')

function asMember(role = 'OWNER') {
  enterpriseMemberFindUnique.mockResolvedValue({ role })
}

describe('computeScheduleStatus', () => {
  const base = { intervalKm: 5000, warningKm: 500, lastDoneAtKm: null as number | null }

  it('returns NEVER_DONE when no lastDoneAtKm', () => {
    expect(computeScheduleStatus(12000, base).status).toBe('NEVER_DONE')
  })

  it('returns NEVER_DONE when vehicle has no mileage', () => {
    expect(computeScheduleStatus(null, { ...base, lastDoneAtKm: 10000 }).status).toBe('NEVER_DONE')
  })

  it('returns OK when next due is far ahead', () => {
    const r = computeScheduleStatus(12000, { ...base, lastDoneAtKm: 10000 })
    expect(r.status).toBe('OK')
    expect(r.nextDueAtKm).toBe(15000)
    expect(r.kmRemaining).toBe(3000)
  })

  it('returns DUE_SOON when within warningKm', () => {
    const r = computeScheduleStatus(14600, { ...base, lastDoneAtKm: 10000 })
    expect(r.status).toBe('DUE_SOON')
    expect(r.kmRemaining).toBe(400)
  })

  it('returns OVERDUE when km remaining is zero or negative', () => {
    const r = computeScheduleStatus(15500, { ...base, lastDoneAtKm: 10000 })
    expect(r.status).toBe('OVERDUE')
    expect(r.kmRemaining).toBe(-500)
  })
})

describe('listSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asMember('MECHANIC')
  })

  it('augments each schedule with computed status', async () => {
    vehicleFindFirst.mockResolvedValueOnce({ id: 'v1', mileage: 12000 })
    scheduleFindMany.mockResolvedValueOnce([
      { id: 's1', intervalKm: 5000, warningKm: 500, lastDoneAtKm: 10000 },
      { id: 's2', intervalKm: 30000, warningKm: 500, lastDoneAtKm: null },
    ])

    const result = await listSchedules('e1', 'u1', 'v1')
    expect(result[0]?.status).toBe('OK')
    expect(result[0]?.kmRemaining).toBe(3000)
    expect(result[1]?.status).toBe('NEVER_DONE')
  })
})

describe('markScheduleDone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asMember('MECHANIC')
  })

  it('uses vehicle.mileage when no atKm override', async () => {
    vehicleFindFirst.mockResolvedValueOnce({ id: 'v1', mileage: 17500 })
    scheduleFindFirst.mockResolvedValueOnce({ id: 's1' })
    scheduleUpdate.mockResolvedValueOnce({ id: 's1', lastDoneAtKm: 17500 })

    await markScheduleDone('e1', 'u1', 'v1', 's1')
    expect(scheduleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastDoneAtKm: 17500 }),
      }),
    )
  })

  it('rejects if vehicle has no mileage and no override provided', async () => {
    vehicleFindFirst.mockResolvedValueOnce({ id: 'v1', mileage: null })
    scheduleFindFirst.mockResolvedValueOnce({ id: 's1' })
    await expect(markScheduleDone('e1', 'u1', 'v1', 's1')).rejects.toMatchObject({
      code: 'MILEAGE_REQUIRED',
    })
  })
})

describe('listEnterpriseUpcomingMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asMember()
  })

  it('aggregates OVERDUE before DUE_SOON and skips OK entries', async () => {
    vehicleFindMany.mockResolvedValueOnce([
      {
        id: 'v1',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2018,
        plate: 'CI-1',
        mileage: 50000,
        createdAt: new Date(Date.now() - 365 * 86_400_000),
        maintenanceSchedules: [
          // OVERDUE: due at 45000, current 50000
          { id: 'sOv', kind: 'OIL_CHANGE', label: null, intervalKm: 5000, warningKm: 500, lastDoneAtKm: 40000, lastDoneAt: null },
          // DUE_SOON: due at 50300, current 50000, warning 500
          { id: 'sSoon', kind: 'OIL_FILTER', label: null, intervalKm: 5000, warningKm: 500, lastDoneAtKm: 45300, lastDoneAt: null },
          // OK: due at 60000, current 50000 — should be filtered out
          { id: 'sOk', kind: 'AIR_FILTER', label: null, intervalKm: 15000, warningKm: 500, lastDoneAtKm: 45000, lastDoneAt: null },
        ],
      },
    ])

    const result = await listEnterpriseUpcomingMaintenance('e1', 'u1')
    expect(result.counts.overdue).toBe(1)
    expect(result.counts.dueSoon).toBe(1)
    expect(result.counts.neverDone).toBe(0)
    expect(result.alerts).toHaveLength(2)
    expect(result.alerts[0]?.scheduleId).toBe('sOv')   // OVERDUE first
    expect(result.alerts[1]?.scheduleId).toBe('sSoon')
  })

  it('computes estimatedDaysToDue for DUE_SOON when km/day is positive', async () => {
    // Vehicle 100 days old, 10000 km → 100 km/day, 500 km remaining → ~5 days
    vehicleFindMany.mockResolvedValueOnce([
      {
        id: 'v1',
        brand: 'X',
        model: 'Y',
        year: 2020,
        plate: null,
        mileage: 10000,
        createdAt: new Date(Date.now() - 100 * 86_400_000),
        maintenanceSchedules: [
          { id: 's', kind: 'OIL_CHANGE', label: null, intervalKm: 5000, warningKm: 1000, lastDoneAtKm: 5500, lastDoneAt: null },
        ],
      },
    ])

    const result = await listEnterpriseUpcomingMaintenance('e1', 'u1')
    expect(result.alerts[0]?.status).toBe('DUE_SOON')
    expect(result.alerts[0]?.estimatedDaysToDue).toBeGreaterThanOrEqual(4)
    expect(result.alerts[0]?.estimatedDaysToDue).toBeLessThanOrEqual(6)
  })
})
