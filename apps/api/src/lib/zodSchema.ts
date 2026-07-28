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
    delete normalized.nullable
    return {
      anyOf: [normalized, { type: 'null' }],
    }
  }

  return normalized
}

/**
 * Fastify 5 validates schemas with Ajv in JSON Schema 2020-12 mode, where
 * `exclusiveMinimum`/`exclusiveMaximum` are numbers. zod-to-json-schema with
 * target `openApi3` emits them as booleans (draft-07 style), which Ajv rejects
 * at route registration — convert `exclusiveMinimum: true` + `minimum: N`
 * to `exclusiveMinimum: N`.
 */
function normalizeExclusiveBounds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeExclusiveBounds(item))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const schema = Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (acc, [key, child]) => {
      acc[key] = normalizeExclusiveBounds(child)
      return acc
    },
    {},
  )

  // Static keys only: ESLint forbids computed `delete`, and the two bounds are symmetric.
  if (typeof schema.exclusiveMinimum === 'boolean') {
    if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number') {
      schema.exclusiveMinimum = schema.minimum
      delete schema.minimum
    } else {
      delete schema.exclusiveMinimum
    }
  }

  if (typeof schema.exclusiveMaximum === 'boolean') {
    if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number') {
      schema.exclusiveMaximum = schema.maximum
      delete schema.maximum
    } else {
      delete schema.exclusiveMaximum
    }
  }

  return schema
}

/**
 * Convert a Zod schema to a Fastify-compatible JSON Schema.
 * Used as single source of truth: Zod validates in services,
 * the derived JSON schema validates in Fastify routes + feeds Swagger.
 */
export function zodToFastify(schema: ZodType) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
  const normalizedSchema = normalizeExclusiveBounds(normalizeNullableSchemas(jsonSchema)) as Record<
    string,
    unknown
  >
  delete normalizedSchema.$schema
  return normalizedSchema
}
