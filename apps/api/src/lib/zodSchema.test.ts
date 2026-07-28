import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import Fastify from 'fastify'
import { partRequestMatrixSchema } from 'shared/validators'
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
    const result = zodToFastify(schema) as {
      properties: Record<string, { type: string; enum: boolean[] }>
    }

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

  it('converts nullable fields to Fastify-compatible schemas', () => {
    const schema = z.object({
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
    })
    const result = zodToFastify(schema) as {
      properties: Record<string, { anyOf?: unknown[]; nullable?: boolean }>
    }

    expect(result.properties.email).toHaveProperty('anyOf')
    expect(result.properties.email.anyOf?.[1]).toEqual({ type: 'null' })
    expect(result.properties.email).not.toHaveProperty('nullable')

    expect(result.properties.phone).toHaveProperty('anyOf')
    expect(result.properties.phone.anyOf?.[1]).toEqual({ type: 'null' })
    expect(result.properties.phone).not.toHaveProperty('nullable')
  })

  it('strips $schema key for Fastify compatibility', () => {
    const schema = z.object({ id: z.string() })
    const result = zodToFastify(schema)

    expect(result).not.toHaveProperty('$schema')
  })

  it('converts boolean exclusive bounds to numeric form (Ajv 2020-12)', () => {
    const schema = z.object({
      weightKg: z.number().positive().max(3000).optional(),
      volumeDm3: z.number().positive().max(20000).optional(),
    })
    const result = zodToFastify(schema) as {
      properties: Record<string, Record<string, unknown>>
    }

    expect(result.properties.weightKg).toEqual({
      type: 'number',
      exclusiveMinimum: 0,
      maximum: 3000,
    })
    expect(result.properties.weightKg).not.toHaveProperty('minimum')
    expect(result.properties.volumeDm3?.exclusiveMinimum).toBe(0)
  })

  it('produces a body schema accepted by the Fastify/Ajv validator', async () => {
    // Regression: Fastify 5's Ajv (2020-12) rejected the boolean
    // `exclusiveMinimum` emitted for partRequestMatrixSchema.weightKg,
    // crashing the API at boot on the logistics-matrix route.
    const fastify = Fastify()
    fastify.post(
      '/logistics-matrix',
      { schema: { body: zodToFastify(partRequestMatrixSchema) } },
      async () => ({}),
    )

    // Rejects with FST_ERR_SCH_VALIDATION_BUILD if Ajv cannot compile the schema
    await fastify.ready()

    const valid = await fastify.inject({
      method: 'POST',
      url: '/logistics-matrix',
      payload: { weightKg: 12.5, localPrice: 4500 },
    })
    expect(valid.statusCode).toBe(200)

    const invalid = await fastify.inject({
      method: 'POST',
      url: '/logistics-matrix',
      payload: { weightKg: -1 },
    })
    expect(invalid.statusCode).toBe(400)
  })
})
