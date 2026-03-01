import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockDeletionCreate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
      upsert: vi.fn(),
    },
    dataDeletionRequest: {
      create: (...args: unknown[]) => mockDeletionCreate(...args),
    },
  },
}))

const { recordConsent, getUserData, requestDeletion } = await import('./consent.service.js')

describe('recordConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records consent with accepted: true', async () => {
    const consentDate = new Date('2026-03-01T12:00:00Z')
    mockUserUpdate.mockResolvedValueOnce({ consentedAt: consentDate })

    const result = await recordConsent('user-1', { accepted: true })
    expect(result).toEqual({ consentedAt: consentDate })
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { consentedAt: expect.any(Date) },
      }),
    )
  })

  it('throws CONSENT_MUST_ACCEPT when accepted is false', async () => {
    await expect(recordConsent('user-1', { accepted: false })).rejects.toMatchObject({
      code: 'CONSENT_MUST_ACCEPT',
      statusCode: 400,
    })
  })

  it('throws CONSENT_MUST_ACCEPT when accepted is missing', async () => {
    await expect(recordConsent('user-1', {})).rejects.toMatchObject({
      code: 'CONSENT_MUST_ACCEPT',
      statusCode: 400,
    })
  })

  it('is idempotent — overwrites previous consentedAt', async () => {
    const newDate = new Date('2026-03-02T12:00:00Z')
    mockUserUpdate.mockResolvedValueOnce({ consentedAt: newDate })

    const result = await recordConsent('user-1', { accepted: true })
    expect(result.consentedAt).toEqual(newDate)
  })
})

describe('getUserData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user personal data', async () => {
    const userData = {
      phone: '+2250700000000',
      roles: ['MECHANIC'],
      activeContext: 'MECHANIC',
      consentedAt: new Date('2026-03-01T12:00:00Z'),
      createdAt: new Date('2026-02-15T10:00:00Z'),
    }
    mockFindUnique.mockResolvedValueOnce(userData)

    const result = await getUserData('user-1')
    expect(result).toEqual(userData)
  })

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    await expect(getUserData('nonexistent')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('requestDeletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a deletion request with PENDING status', async () => {
    const deletionData = {
      id: 'del-1',
      status: 'PENDING',
      requestedAt: new Date('2026-03-01T12:00:00Z'),
    }
    mockDeletionCreate.mockResolvedValueOnce(deletionData)

    const result = await requestDeletion('user-1')
    expect(result).toEqual(deletionData)
    expect(mockDeletionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'user-1' },
      }),
    )
  })
})
