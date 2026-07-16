import type { ZodType } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

function normalizeNullableSchemas(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeNullableSchemas(item))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const schema = value as Record<string, unknown>
  const normalized = Object.entries(schema).reduce<Record<string, unknown>>((acc, [key, child]) => {
    acc[key] = normalizeNullableSchemas(child)
    return acc
    }, {})

  if (normalized.nullable === true) {
    const { nullable, ...baseSchema } = normalized
    return {
      anyOf: [baseSchema, { type: 'null' }],
    }
  }

  return normalized
}

/**
 * Convert a Zod schema to a Fastify-compatible JSON Schema (OpenAPI 3).
 * Used as single source of truth: Zod validates in services,
 * the derived JSON schema validates in Fastify routes + feeds Swagger.
 */
export function zodToFastify(schema: ZodType) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
  const normalizedSchema = normalizeNullableSchemas(jsonSchema) as Record<string, unknown>
  delete normalizedSchema.$schema
  return normalizedSchema
}
