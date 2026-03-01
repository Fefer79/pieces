import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockJobCreate = vi.fn()
const mockJobUpdate = vi.fn()
const mockJobFindUnique = vi.fn()
const mockQueryRawUnsafe = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    job: {
      create: (...args: unknown[]) => mockJobCreate(...args),
      update: (...args: unknown[]) => mockJobUpdate(...args),
      findUnique: (...args: unknown[]) => mockJobFindUnique(...args),
    },
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
        job: {
          update: (...args: unknown[]) => mockJobUpdate(...args),
        },
      }
      return fn(tx)
    },
  },
}))

const { enqueue, markCompleted, markFailed } = await import('./queueService.js')

describe('queueService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueue', () => {
    it('creates a job with correct type and payload', async () => {
      mockJobCreate.mockResolvedValueOnce({
        id: 'job-1',
        type: 'IMAGE_PROCESS_VARIANTS',
        status: 'PENDING',
        payload: { catalogItemId: 'item-1' },
      })

      const result = await enqueue('IMAGE_PROCESS_VARIANTS', { catalogItemId: 'item-1' })

      expect(result.id).toBe('job-1')
      expect(result.type).toBe('IMAGE_PROCESS_VARIANTS')
      expect(mockJobCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'IMAGE_PROCESS_VARIANTS',
            payload: { catalogItemId: 'item-1' },
            maxAttempts: 3,
          }),
        }),
      )
    })

    it('accepts custom maxAttempts', async () => {
      mockJobCreate.mockResolvedValueOnce({ id: 'job-1' })

      await enqueue('CATALOG_AI_IDENTIFY', { catalogItemId: 'item-1' }, { maxAttempts: 5 })

      expect(mockJobCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maxAttempts: 5 }),
        }),
      )
    })
  })

  describe('markCompleted', () => {
    it('updates job status to COMPLETED', async () => {
      mockJobUpdate.mockResolvedValueOnce({
        id: 'job-1',
        status: 'COMPLETED',
        completedAt: new Date(),
      })

      const result = await markCompleted('job-1')

      expect(result.status).toBe('COMPLETED')
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      )
    })
  })

  describe('markFailed', () => {
    it('sets status to FAILED when max attempts reached', async () => {
      mockJobFindUnique.mockResolvedValueOnce({ id: 'job-1', attempts: 3, maxAttempts: 3 })
      mockJobUpdate.mockResolvedValueOnce({ id: 'job-1', status: 'FAILED', error: 'timeout' })

      const result = await markFailed('job-1', 'timeout')

      expect(result?.status).toBe('FAILED')
      expect(mockJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED', error: 'timeout' }),
        }),
      )
    })

    it('sets status back to PENDING when retries remain', async () => {
      mockJobFindUnique.mockResolvedValueOnce({ id: 'job-1', attempts: 1, maxAttempts: 3 })
      mockJobUpdate.mockResolvedValueOnce({ id: 'job-1', status: 'PENDING', error: 'network error' })

      const result = await markFailed('job-1', 'network error')

      expect(result?.status).toBe('PENDING')
    })

    it('returns null when job not found', async () => {
      mockJobFindUnique.mockResolvedValueOnce(null)

      const result = await markFailed('nonexistent', 'error')

      expect(result).toBeNull()
    })
  })
})
