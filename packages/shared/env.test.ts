import { describe, it, expect } from 'vitest'
import { apiEnvSchema, webEnvSchema } from './env.js'

describe('Environment Validation', () => {
  it('apiEnvSchema validates correct env', () => {
    const result = apiEnvSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost:5432/pieces',
      PINO_LOG_LEVEL: 'info',
      PORT: 3001,
    })
    expect(result.success).toBe(true)
  })

  it('apiEnvSchema applies defaults', () => {
    const result = apiEnvSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost:5432/pieces',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PINO_LOG_LEVEL).toBe('info')
      expect(result.data.PORT).toBe(3001)
    }
  })

  it('apiEnvSchema fails on missing DATABASE_URL', () => {
    const result = apiEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('apiEnvSchema rejects invalid PINO_LOG_LEVEL', () => {
    const result = apiEnvSchema.safeParse({
      DATABASE_URL: 'postgresql://localhost:5432/pieces',
      PINO_LOG_LEVEL: 'debug',
    })
    expect(result.success).toBe(false)
  })

  it('webEnvSchema validates correct env', () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_API_URL: 'http://localhost:3001',
    })
    expect(result.success).toBe(true)
  })

  it('webEnvSchema fails on invalid URL', () => {
    const result = webEnvSchema.safeParse({
      NEXT_PUBLIC_API_URL: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })
})
