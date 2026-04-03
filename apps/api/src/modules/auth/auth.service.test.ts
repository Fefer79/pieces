import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()
const mockUpsert = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

const { sendOtp, verifyOtp } = await import('./auth.service.js')

describe('sendOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends OTP for valid Ivorian phone number', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: null })

    const result = await sendOtp({ phone: '+2250700000000' })
    expect(result).toEqual({ sent: true })
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ phone: '+2250700000000' })
  })

  it('sends OTP for valid email', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: null })

    const result = await sendOtp({ email: 'test@example.com' })
    expect(result).toEqual({ sent: true })
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'test@example.com' })
  })

  it('rejects invalid phone number', async () => {
    await expect(sendOtp({ phone: '+33612345678' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('rejects phone without country code', async () => {
    await expect(sendOtp({ phone: '0700000000' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
  })

  it('rejects invalid email', async () => {
    await expect(sendOtp({ email: 'not-an-email' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
  })

  it('rejects when neither phone nor email provided', async () => {
    await expect(sendOtp({})).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
  })

  it('throws on Supabase error', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: { message: 'rate limited' } })

    await expect(sendOtp({ phone: '+2250700000000' })).rejects.toMatchObject({
      code: 'AUTH_OTP_SEND_FAILED',
      statusCode: 500,
    })
  })
})

describe('verifyOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verifies phone OTP and creates/updates user in Prisma', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: {
        user: { id: 'supabase-user-123' },
        session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
      },
      error: null,
    })
    mockUpsert.mockResolvedValueOnce({
      id: 'prisma-user-123',
      phone: '+2250700000000',
      email: null,
      roles: ['MECHANIC'],
    })

    const result = await verifyOtp({ phone: '+2250700000000', token: '123456' })
    expect(result).toEqual({
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      user: { id: 'prisma-user-123', phone: '+2250700000000', email: null, roles: ['MECHANIC'] },
    })
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      phone: '+2250700000000',
      token: '123456',
      type: 'sms',
    })
  })

  it('verifies email OTP and creates/updates user in Prisma', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: {
        user: { id: 'supabase-user-456' },
        session: { access_token: 'jwt-email', refresh_token: 'refresh-email' },
      },
      error: null,
    })
    mockUpsert.mockResolvedValueOnce({
      id: 'prisma-user-456',
      phone: null,
      email: 'test@example.com',
      roles: ['MECHANIC'],
    })

    const result = await verifyOtp({ email: 'test@example.com', token: '123456' })
    expect(result).toEqual({
      accessToken: 'jwt-email',
      refreshToken: 'refresh-email',
      user: { id: 'prisma-user-456', phone: null, email: 'test@example.com', roles: ['MECHANIC'] },
    })
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      token: '123456',
      type: 'email',
    })
  })

  it('rejects invalid OTP format', async () => {
    await expect(verifyOtp({ phone: '+2250700000000', token: '12345' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
    expect(mockVerifyOtp).not.toHaveBeenCalled()
  })

  it('rejects invalid phone number', async () => {
    await expect(verifyOtp({ phone: 'invalid', token: '123456' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
  })

  it('rejects when neither phone nor email provided', async () => {
    await expect(verifyOtp({ token: '123456' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_INPUT',
      statusCode: 400,
    })
  })

  it('handles expired OTP', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Token has expired or is invalid' },
    })

    await expect(verifyOtp({ phone: '+2250700000000', token: '123456' })).rejects.toMatchObject({
      code: 'AUTH_EXPIRED_OTP',
      statusCode: 400,
    })
  })

  it('handles Supabase verify error', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid OTP' },
    })

    await expect(verifyOtp({ phone: '+2250700000000', token: '123456' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_OTP',
      statusCode: 400,
    })
  })
})
