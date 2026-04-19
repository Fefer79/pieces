# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pièces** is a marketplace for used auto parts in Côte d'Ivoire (Abidjan). All user-facing text is in French, currency is FCFA. The platform supports 6 roles: MECHANIC (default), OWNER, SELLER, RIDER, ADMIN, ENTERPRISE. The core flow is tripartite: mechanic finds parts → creates order with shareToken → owner pays.

## Monorepo Structure

pnpm workspaces + Turborepo. Three packages:
- `apps/api` — Fastify 5.3 backend (Node.js, ESM, TypeScript)
- `apps/web` — Next.js 15.3 frontend (React 19, Tailwind CSS 4, PWA via Serwist)
- `packages/shared` — Prisma schema, Zod validators, types, env schemas, ESLint config

## Common Commands

```bash
pnpm dev                    # Run all apps in watch mode
pnpm build                  # Build all packages
pnpm test                   # Test all packages via Turbo
pnpm lint                   # ESLint all packages
pnpm format                 # Prettier all files

pnpm -F api dev             # API only (tsx watch)
pnpm -F web dev             # Web only (Next.js turbopack)

# Run specific test file
cd apps/api && pnpm vitest run src/modules/whatsapp/whatsapp.service.test.ts

# Run tests for a module
cd apps/api && pnpm vitest run src/modules/whatsapp/

# Database
pnpm -F shared db:generate  # Generate Prisma client
pnpm -F shared db:migrate   # Run pending migrations
pnpm -F shared db:push      # Quick schema sync (prototyping)
```

## API Architecture (apps/api)

### Server & Plugins

`src/server.ts` creates Fastify with plugins registered via `fp()` (fastify-plugin): helmet, cors, rateLimit, swagger, auth, multipart. Error handler converts `AppError` and Fastify validation errors to structured JSON. 13 route modules registered at `/api/v1/*`.

**CRITICAL**: Always use `fp()` wrapper for global plugins. Content type parsers registered inside a route plugin are scoped to that plugin only — this is intentional for cases like WhatsApp HMAC raw body capture.

### Module Pattern

Each module follows: `module.routes.ts` (Fastify routes + Zod schema) → `module.service.ts` (business logic + Prisma) → `module.*.test.ts`. Routes never access Prisma directly.

### Auth & RBAC

OTP via Supabase → Bearer token → `requireAuth` preHandler validates via Supabase and upserts User. Guards: `requireAuth`, `requireConsent`, `requireRole('SELLER', 'ADMIN')`. The user's `activeContext` determines which role is checked.

### Validation Pattern

Single source of truth: Zod schemas in `packages/shared/validators/`. Convert to Fastify/OpenAPI via `zodToFastify()` from `src/lib/zodSchema.ts`. Schemas used in route definitions AND as TypeScript types via `z.infer<>`.

### Error Handling

```typescript
throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
// → { error: { code, message, statusCode, details } }
```

### Order State Machine

Declarative transitions in `order.stateMachine.ts`: DRAFT → PENDING_PAYMENT → PAID → VENDOR_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → CONFIRMED → COMPLETED. `canTransition()` guard checked before all DB updates.

## Web Architecture (apps/web)

App Router with `(auth)` route group for protected pages. Middleware redirects unauthenticated users to `/login`. Supabase client for auth, API calls via fetch to `/api/v1/*` (proxied in next.config.ts). PWA with Serwist service worker.

## Database

PostgreSQL + Prisma 6. Schema at `packages/shared/prisma/schema.prisma`. Key models: User (roles, phone unique), Vendor, CatalogItem, Order (state machine), OrderItem, Delivery, Dispute, EscrowTransaction. Phone format: `+225XXXXXXXXXX` (Ivorian).

## Testing

Vitest 3.2. API tests use `buildApp()` from `server.ts` with `app.inject()` for integration tests. Mocking pattern: `vi.mock()` for services/prisma/supabase, then import after mocks. Environment variables stubbed with `vi.stubEnv()`.

Key gotcha: `toLocaleString('fr-FR')` produces non-breaking space U+00A0 between thousands — use regex assertions (`toMatch(/4.500 FCFA/)`) not `toContain`.

## External Services

- **Supabase**: Auth (OTP SMS), user management
- **Google Gemini 2.0 Flash**: AI image identification for auto parts (confidence thresholds: ≥0.7 identified, 0.3-0.7 disambiguation, <0.3 failed)
- **CinetPay**: Payment gateway (escrow model)
- **Cloudflare R2**: Image storage (S3-compatible)
- **Meta WhatsApp Cloud API v18.0**: Bot with HMAC SHA-256 webhook verification
- **Sharp**: Image processing (thumb/small/medium/large variants)

## BMAD Workflow System

Project uses BMAD (Business Model Agent Development) for story management. Story files in `_bmad-output/implementation-artifacts/`. Sprint tracking in `sprint-status.yaml`. Workflows: create-story → dev-story → code-review → retrospective. Skills invoked via `/bmad-bmm-*` commands.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions. All font choices, colors, spacing, aesthetic direction, component rules, and accessibility constraints are defined there. Do not deviate without explicit user approval. When reviewing PRs or code, flag anything that doesn't match DESIGN.md.

Two USP-load-bearing rules in particular:
- **Condition chips are first-class UI** — every product card / order line / admin row shows the condition (Neuf / Occasion importée / Ré-usiné / Aftermarket / OEM) as a colored chip, never buried in gray text.
- **Price breakdown is explicit** — on `/choose/[shareToken]`, product detail, and order summaries, show the full breakdown (vendor price / labor / delivery / platform fees / total) before the pay button. No hidden fees.
