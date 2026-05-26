import type { ZodType } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

// OpenAPI 3.0 (Draft-04) emits `exclusiveMinimum: true` + `minimum: N`, but Fastify's AJV
// expects Draft-07 (`exclusiveMinimum: N` as a number). Normalize so route validation works
// regardless of which Zod constraint (.positive(), .gt(), .lt()) produced the schema.
function normalizeExclusiveBounds(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeExclusiveBounds)
  if (node === null || typeof node !== 'object') return node
  const obj = node as Record<string, unknown>
  if (typeof obj.exclusiveMinimum === 'boolean') {
    if (obj.exclusiveMinimum === true && typeof obj.minimum === 'number') {
      obj.exclusiveMinimum = obj.minimum
      delete obj.minimum
    } else {
      delete obj.exclusiveMinimum
    }
  }
  if (typeof obj.exclusiveMaximum === 'boolean') {
    if (obj.exclusiveMaximum === true && typeof obj.maximum === 'number') {
      obj.exclusiveMaximum = obj.maximum
      delete obj.maximum
    } else {
      delete obj.exclusiveMaximum
    }
  }
  for (const key of Object.keys(obj)) {
    obj[key] = normalizeExclusiveBounds(obj[key])
  }
  return obj
}

/**
 * Convert a Zod schema to a Fastify-compatible JSON Schema (OpenAPI 3).
 * Used as single source of truth: Zod validates in services,
 * the derived JSON schema validates in Fastify routes + feeds Swagger.
 */
export function zodToFastify(schema: ZodType) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
  delete jsonSchema.$schema
  return normalizeExclusiveBounds(jsonSchema) as Record<string, unknown>
}
