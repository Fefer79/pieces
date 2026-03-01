import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodToFastify } from './zodSchema.js'

describe('zodToFastify', () => {
  it('converts a simple object schema to JSON Schema', () => {
    const schema = z.object({ name: z.string() })
    const result = zodToFastify(schema)

    expect(result).toHaveProperty('type', 'object')
    expect(result).toHaveProperty('properties')
    expect(result).not.toHaveProperty('$schema')
  })

  it('preserves required fields', () => {
    const schema = z.object({ phone: z.string(), otp: z.string() })
    const result = zodToFastify(schema) as Record<string, unknown>

    expect(result.required).toEqual(['phone', 'otp'])
  })

  it('handles z.literal(true)', () => {
    const schema = z.object({ accepted: z.literal(true) })
    const result = zodToFastify(schema) as { properties: Record<string, { type: string; enum: boolean[] }> }

    expect(result.properties.accepted.type).toBe('boolean')
    expect(result.properties.accepted.enum).toEqual([true])
  })

  it('handles regex patterns', () => {
    const schema = z.object({
      phone: z.string().regex(/^\+225\d{10}$/),
    })
    const result = zodToFastify(schema) as { properties: Record<string, { pattern: string }> }

    expect(result.properties.phone.pattern).toBeDefined()
  })

  it('strips $schema key for Fastify compatibility', () => {
    const schema = z.object({ id: z.string() })
    const result = zodToFastify(schema)

    expect(result).not.toHaveProperty('$schema')
  })
})
