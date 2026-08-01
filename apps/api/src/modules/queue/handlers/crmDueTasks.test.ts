import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job } from '@prisma/client'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockTaskFindMany = vi.fn()
const mockTaskUpdateMany = vi.fn()
const mockNotify = vi.fn()
const mockEnqueue = vi.fn()
const mockMarkCompleted = vi.fn()
const mockMarkFailed = vi.fn()

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    crmTask: {
      findMany: (...args: unknown[]) => mockTaskFindMany(...args),
      updateMany: (...args: unknown[]) => mockTaskUpdateMany(...args),
    },
  },
}))

vi.mock('../../whatsapp/whatsapp.service.js', () => ({
  notifyWhatsAppUser: (...args: unknown[]) => mockNotify(...args),
}))

vi.mock('../queueService.js', () => ({
  enqueue: (...args: unknown[]) => mockEnqueue(...args),
  markCompleted: (...args: unknown[]) => mockMarkCompleted(...args),
  markFailed: (...args: unknown[]) => mockMarkFailed(...args),
}))

const { handleCrmDueTasksScan } = await import('./crmDueTasks.js')

const logger = { info: vi.fn(), warn: vi.fn() }
const job = { id: 'job-1' } as Job

function task(over: Record<string, unknown> = {}) {
  const today = new Date()
  today.setHours(10, 0, 0, 0)
  return {
    id: 't1',
    assigneeId: 'a1',
    echeanceLe: today,
    assignee: { id: 'a1', phone: '+2250700000000', name: 'Admin A' },
    ...over,
  }
}

describe('handleCrmDueTasksScan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue({ sent: true, channel: 'cloud' })
    mockTaskUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('groups tasks per assignee and sends one digest each', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    mockTaskFindMany.mockResolvedValue([
      task({ id: 't1' }),
      task({ id: 't2', echeanceLe: yesterday }), // en retard
      task({
        id: 't3',
        assigneeId: 'a2',
        assignee: { id: 'a2', phone: '+2250101010101', name: 'Admin B' },
      }),
    ])

    await handleCrmDueTasksScan(job, logger)

    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenCalledWith(
      '+2250700000000',
      "Rappel CRM : 2 tâche(s) due(s) aujourd'hui (1 en retard) — voir /admin/crm",
    )
    expect(mockNotify).toHaveBeenCalledWith(
      '+2250101010101',
      "Rappel CRM : 1 tâche(s) due(s) aujourd'hui (0 en retard) — voir /admin/crm",
    )
    expect(mockTaskUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2'] } },
      data: { rappelEnvoyeAt: expect.any(Date) },
    })
    expect(mockTaskUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t3'] } },
      data: { rappelEnvoyeAt: expect.any(Date) },
    })
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('does NOT mark rappelEnvoyeAt when the send fails', async () => {
    mockNotify.mockResolvedValue({ sent: false, channel: null })
    mockTaskFindMany.mockResolvedValue([task()])

    await handleCrmDueTasksScan(job, logger)

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockTaskUpdateMany).not.toHaveBeenCalled()
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('skips an assignee without phone without marking anything', async () => {
    mockTaskFindMany.mockResolvedValue([
      task({ assignee: { id: 'a1', phone: null, name: 'Admin A' } }),
    ])

    await handleCrmDueTasksScan(job, logger)

    expect(mockNotify).not.toHaveBeenCalled()
    expect(mockTaskUpdateMany).not.toHaveBeenCalled()
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('re-enqueues the next scan at 7:00', async () => {
    mockTaskFindMany.mockResolvedValue([])

    await handleCrmDueTasksScan(job, logger)

    expect(mockEnqueue).toHaveBeenCalledOnce()
    const [type, , options] = mockEnqueue.mock.calls[0] as [string, unknown, { scheduledAt: Date }]
    expect(type).toBe('CRM_DUE_TASKS_SCAN')
    expect(options.scheduledAt.getHours()).toBe(7)
    expect(options.scheduledAt.getMinutes()).toBe(0)
    expect(options.scheduledAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('marks the job failed on error', async () => {
    mockTaskFindMany.mockRejectedValue(new Error('db down'))

    await handleCrmDueTasksScan(job, logger)

    expect(mockMarkFailed).toHaveBeenCalledWith('job-1', 'db down')
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockMarkCompleted).not.toHaveBeenCalled()
  })
})
