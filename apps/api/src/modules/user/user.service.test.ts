import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      upsert: vi.fn(),
    },
  },
}))

const { getProfile, switchContext, updateRoles } = await import('./user.service.js')

describe('getProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user profile', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'user-1',
      phone: '+2250700000000',
      roles: ['MECHANIC'],
      activeContext: 'MECHANIC',
    })

    const result = await getProfile('user-1')
    expect(result).toEqual({
      id: 'user-1',
      phone: '+2250700000000',
      roles: ['MECHANIC'],
      activeContext: 'MECHANIC',
    })
  })

  it('throws 404 when user not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    await expect(getProfile('nonexistent')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('switchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('switches context to an assigned role', async () => {
    mockFindUnique.mockResolvedValueOnce({
      roles: ['MECHANIC', 'OWNER'],
    })
    mockUpdate.mockResolvedValueOnce({
      id: 'user-1',
      phone: '+2250700000000',
      roles: ['MECHANIC', 'OWNER'],
      activeContext: 'OWNER',
    })

    const result = await switchContext('user-1', 'OWNER')
    expect(result.activeContext).toBe('OWNER')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { activeContext: 'OWNER' },
      select: { id: true, phone: true, roles: true, activeContext: true },
    })
  })

  it('throws 403 when role is not assigned', async () => {
    mockFindUnique.mockResolvedValueOnce({
      roles: ['MECHANIC'],
    })

    await expect(switchContext('user-1', 'ADMIN')).rejects.toMatchObject({
      code: 'USER_ROLE_NOT_ASSIGNED',
      statusCode: 403,
    })
  })

  it('throws 400 for invalid role', async () => {
    await expect(switchContext('user-1', 'INVALID')).rejects.toMatchObject({
      code: 'USER_INVALID_ROLE',
      statusCode: 400,
    })
  })

  it('throws 404 when user not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    await expect(switchContext('nonexistent', 'MECHANIC')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('updateRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates roles and preserves activeContext if still valid', async () => {
    mockFindUnique.mockResolvedValueOnce({ activeContext: 'MECHANIC' })
    mockUpdate.mockResolvedValueOnce({
      id: 'user-1',
      phone: '+2250700000000',
      roles: ['MECHANIC', 'SELLER'],
      activeContext: 'MECHANIC',
    })

    const result = await updateRoles('user-1', ['MECHANIC', 'SELLER'])
    expect(result.roles).toEqual(['MECHANIC', 'SELLER'])
    expect(result.activeContext).toBe('MECHANIC')
  })

  it('resets activeContext when current context removed from roles', async () => {
    mockFindUnique.mockResolvedValueOnce({ activeContext: 'ADMIN' })
    mockUpdate.mockResolvedValueOnce({
      id: 'user-1',
      phone: '+2250700000000',
      roles: ['MECHANIC', 'SELLER'],
      activeContext: 'MECHANIC',
    })

    const result = await updateRoles('user-1', ['MECHANIC', 'SELLER'])
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activeContext: 'MECHANIC' }),
      }),
    )
    expect(result.activeContext).toBe('MECHANIC')
  })

  it('throws 400 for empty roles array', async () => {
    await expect(updateRoles('user-1', [])).rejects.toMatchObject({
      code: 'USER_INVALID_ROLES',
      statusCode: 400,
    })
  })

  it('throws 404 when user not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    await expect(updateRoles('nonexistent', ['MECHANIC'])).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      statusCode: 404,
    })
  })
})
