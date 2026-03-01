import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUpsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

const { requireAuth, requireRole, requireConsent } = await import('./auth.js')

function createMockRequest(headers: Record<string, string> = {}, user?: unknown) {
  return {
    headers,
    user: user ?? null,
  } as never
}

const mockReply = {} as never

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('attaches user with roles when valid token provided', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'supabase-123', phone: '+2250700000000' } },
      error: null,
    })
    mockUpsert.mockResolvedValueOnce({
      id: 'prisma-user-123',
      phone: '+2250700000000',
      roles: ['MECHANIC'],
      activeContext: null,
      consentedAt: null,
    })
    mockUpdate.mockResolvedValueOnce({})

    const request = createMockRequest({ authorization: 'Bearer valid-token' })
    await requireAuth(request, mockReply)

    expect(request.user).toEqual({
      id: 'prisma-user-123',
      phone: '+2250700000000',
      roles: ['MECHANIC'],
      activeContext: 'MECHANIC',
      consentedAt: null,
    })
    expect(mockGetUser).toHaveBeenCalledWith('valid-token')
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { supabaseId: 'supabase-123' },
      update: {},
      create: { supabaseId: 'supabase-123', phone: '+2250700000000', roles: ['MECHANIC'] },
      select: { id: true, phone: true, roles: true, activeContext: true, consentedAt: true },
    })
    // Auto-set activeContext for single role user
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'prisma-user-123' },
      data: { activeContext: 'MECHANIC' },
    })
  })

  it('throws 401 when no authorization header', async () => {
    const request = createMockRequest({})
    await expect(requireAuth(request, mockReply)).rejects.toMatchObject({
      code: 'AUTH_MISSING_TOKEN',
      statusCode: 401,
    })
  })

  it('throws 401 when authorization header is not Bearer', async () => {
    const request = createMockRequest({ authorization: 'Basic abc' })
    await expect(requireAuth(request, mockReply)).rejects.toMatchObject({
      code: 'AUTH_MISSING_TOKEN',
      statusCode: 401,
    })
  })

  it('throws 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid token' },
    })

    const request = createMockRequest({ authorization: 'Bearer invalid-token' })
    await expect(requireAuth(request, mockReply)).rejects.toMatchObject({
      code: 'AUTH_INVALID_TOKEN',
      statusCode: 401,
    })
  })
})

describe('requireRole', () => {
  it('passes when user has required role', async () => {
    const request = createMockRequest({}, { id: 'user-123', roles: ['MECHANIC', 'OWNER'] })
    const handler = requireRole('MECHANIC')
    await expect(handler(request, mockReply)).resolves.toBeUndefined()
  })

  it('throws 403 when user lacks required role', async () => {
    const request = createMockRequest({}, { id: 'user-123', roles: ['OWNER'] })
    const handler = requireRole('ADMIN')
    await expect(handler(request, mockReply)).rejects.toMatchObject({
      code: 'AUTH_INSUFFICIENT_ROLE',
      statusCode: 403,
    })
  })

  it('throws 401 when no user on request', async () => {
    const request = createMockRequest({}, null)
    const handler = requireRole('MECHANIC')
    await expect(handler(request, mockReply)).rejects.toMatchObject({
      code: 'AUTH_MISSING_TOKEN',
      statusCode: 401,
    })
  })
})

describe('requireConsent', () => {
  it('passes when user has consentedAt', async () => {
    const request = createMockRequest({}, { id: 'user-123', consentedAt: '2026-03-01T12:00:00Z' })
    await expect(requireConsent(request, mockReply)).resolves.toBeUndefined()
  })

  it('throws 403 when consentedAt is null', async () => {
    const request = createMockRequest({}, { id: 'user-123', consentedAt: null })
    await expect(requireConsent(request, mockReply)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
      statusCode: 403,
    })
  })

  it('throws 401 when no user on request', async () => {
    const request = createMockRequest({}, null)
    await expect(requireConsent(request, mockReply)).rejects.toMatchObject({
      code: 'AUTH_MISSING_TOKEN',
      statusCode: 401,
    })
  })
})
