import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job } from '@prisma/client'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockOrderFindMany = vi.fn()
const mockTransitionOrder = vi.fn()
const mockEnqueue = vi.fn()
const mockMarkCompleted = vi.fn()
const mockMarkFailed = vi.fn()

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
    },
  },
}))

vi.mock('../../order/order.service.js', () => ({
  transitionOrder: (...args: unknown[]) => mockTransitionOrder(...args),
}))

vi.mock('../queueService.js', () => ({
  enqueue: (...args: unknown[]) => mockEnqueue(...args),
  markCompleted: (...args: unknown[]) => mockMarkCompleted(...args),
  markFailed: (...args: unknown[]) => mockMarkFailed(...args),
}))

const { handleOrderAutoConfirmScan } = await import('./orderAutoConfirm.js')

const logger = { info: vi.fn(), warn: vi.fn() }
const job = { id: 'job-1' } as Job

describe('handleOrderAutoConfirmScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransitionOrder.mockResolvedValue({})
  })

  it('queries only DELIVERED orders older than 24h with no open/under-review dispute', async () => {
    mockOrderFindMany.mockResolvedValue([])

    await handleOrderAutoConfirmScan(job, logger)

    expect(mockOrderFindMany).toHaveBeenCalledWith({
      where: {
        status: 'DELIVERED',
        disputes: { none: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } },
        events: { some: { toStatus: 'DELIVERED', createdAt: { lte: expect.any(Date) } } },
      },
      select: { id: true },
    })
    const cutoff = (mockOrderFindMany.mock.calls[0] as [{ where: { events: { some: { createdAt: { lte: Date } } } } }])[0]
      .where.events.some.createdAt.lte
    expect(cutoff.getTime()).toBeLessThanOrEqual(Date.now() - 24 * 60 * 60 * 1000 + 1000)
  })

  it('transitions every candidate order to COMPLETED', async () => {
    mockOrderFindMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }])

    await handleOrderAutoConfirmScan(job, logger)

    expect(mockTransitionOrder).toHaveBeenCalledWith(
      'o1',
      'COMPLETED',
      'system',
      'Auto-confirmation après 24h sans litige',
    )
    expect(mockTransitionOrder).toHaveBeenCalledWith(
      'o2',
      'COMPLETED',
      'system',
      'Auto-confirmation après 24h sans litige',
    )
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('keeps processing remaining orders when one transition fails', async () => {
    mockOrderFindMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }])
    mockTransitionOrder.mockRejectedValueOnce(new Error('invalid transition')).mockResolvedValueOnce({})

    await handleOrderAutoConfirmScan(job, logger)

    expect(mockTransitionOrder).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'ORDER_AUTO_CONFIRM_ITEM_FAILED', orderId: 'o1' }),
      expect.any(String),
    )
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('re-enqueues the next scan in ~1h', async () => {
    mockOrderFindMany.mockResolvedValue([])

    await handleOrderAutoConfirmScan(job, logger)

    expect(mockEnqueue).toHaveBeenCalledOnce()
    const [type, , options] = mockEnqueue.mock.calls[0] as [string, unknown, { scheduledAt: Date }]
    expect(type).toBe('ORDER_AUTO_CONFIRM_SCAN')
    const deltaMs = options.scheduledAt.getTime() - Date.now()
    expect(deltaMs).toBeGreaterThan(59 * 60 * 1000)
    expect(deltaMs).toBeLessThanOrEqual(60 * 60 * 1000)
  })

  it('marks the job failed on error and does not re-enqueue', async () => {
    mockOrderFindMany.mockRejectedValue(new Error('db down'))

    await handleOrderAutoConfirmScan(job, logger)

    expect(mockMarkFailed).toHaveBeenCalledWith('job-1', 'db down')
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockMarkCompleted).not.toHaveBeenCalled()
  })
})
