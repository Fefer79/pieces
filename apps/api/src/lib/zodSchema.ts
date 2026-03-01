import type { ZodType } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

/**
 * Convert a Zod schema to a Fastify-compatible JSON Schema (OpenAPI 3).
 * Used as single source of truth: Zod validates in services,
 * the derived JSON schema validates in Fastify routes + feeds Swagger.
 */
export function zodToFastify(schema: ZodType) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' })
  // Remove $schema key that Fastify doesn't accept
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema: _schema, ...rest } = jsonSchema as Record<string, unknown>
  return rest
}
