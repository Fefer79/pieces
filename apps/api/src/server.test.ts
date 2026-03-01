import { describe, it, expect, vi } from 'vitest'
import { AppError } from './lib/appError.js'

// Mock environment variables before importing server
vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

vi.mock('./lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('./lib/prisma.js', () => ({
  prisma: { user: { upsert: vi.fn() } },
}))

const { buildApp } = await import('./server.js')

describe('API Server', () => {
  it('healthz returns ok', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/healthz' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('error handler returns structured AppError', async () => {
    const app = buildApp()
    app.get('/test-error', async () => {
      throw new AppError('TEST_ERROR', 404, { id: '123' })
    })
    await app.ready()
    const response = await app.inject({ method: 'GET', url: '/test-error' })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('TEST_ERROR')
    expect(body.error.statusCode).toBe(404)
    expect(body.error.details).toEqual({ id: '123' })
  })

  it('error handler returns 500 for unknown errors', async () => {
    const app = buildApp()
    app.get('/test-crash', async () => {
      const err = new Error('unexpected')
      throw err
    })
    await app.ready()
    const response = await app.inject({ method: 'GET', url: '/test-crash' })
    expect(response.statusCode).toBe(500)
    const body = response.json()
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
  })
})
