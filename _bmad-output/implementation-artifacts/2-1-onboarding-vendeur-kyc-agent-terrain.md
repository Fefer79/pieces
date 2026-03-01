# Story 2.1: Onboarding Vendeur & KYC par Agent Terrain

Status: review

## Story

As a agente terrain Pièces,
I want onboarder un vendeur en capturant son KYC (RCCM ou CNI) et ses informations de base sur tablette,
So that le vendeur ait un profil créé et prêt pour la constitution de son catalogue.

## Acceptance Criteria (BDD)

### AC1: Formulaire tablette agent terrain

**Given** l'agente terrain est authentifiée avec le rôle `SELLER` (l'agente a aussi ce rôle, pas de rôle `AGENT_TERRAIN` dans l'enum actuel)
**When** elle accède à `/onboarding/new`
**Then** un formulaire adapté s'affiche avec les champs : nom boutique, nom contact, téléphone vendeur, type vendeur (formel/informel)
**And** les champs sont validés en temps réel inline (pas de popup d'erreur)
**And** le téléphone est validé au format ivoirien (+225...)

### AC2: KYC vendeur formel (RCCM)

**Given** le type vendeur est "formel"
**When** l'agente saisit les informations
**Then** le numéro RCCM est obligatoire
**And** la fiche KYC est créée avec `kycType: 'RCCM'`
**And** le RCCM est stocké pour affichage public sur la fiche vendeur (FR48)

### AC3: KYC vendeur informel (CNI)

**Given** le type vendeur est "informel"
**When** l'agente saisit les informations
**Then** un numéro de pièce d'identité (CNI ou carte de résident) est obligatoire
**And** la fiche KYC est créée avec `kycType: 'CNI'`
**And** la pièce d'identité est stockée de manière sécurisée (non publique)

### AC4: Création profil et statut

**Given** les informations KYC sont soumises via le formulaire
**When** le profil vendeur est créé
**Then** les tables Prisma `Vendor` et `VendorKyc` sont créées
**And** le statut vendeur est `PENDING_ACTIVATION`
**And** l'API retourne le vendeur créé avec son KYC
**And** un log structuré `VENDOR_CREATED` est émis

## Tasks / Subtasks

- [x] **Task 1: Migration Prisma — modèles Vendor et VendorKyc** (AC: #4)
  - [x] 1.1 Enums VendorStatus, VendorType, KycType ajoutés dans schema.prisma
  - [x] 1.2 Modèle Vendor créé avec tous les champs + @@map("vendors")
  - [x] 1.3 Modèle VendorKyc créé avec isPublic + @@map("vendor_kyc")
  - [x] 1.4 Relation User → Vendor (optional one-to-one via userId unique)
  - [x] 1.5 Migration SQL manuelle + prisma generate réussi

- [x] **Task 2: Validators Zod — onboarding vendeur** (AC: #1, #2, #3)
  - [x] 2.1 createVendorSchema dans packages/shared/validators/vendor.ts
  - [x] 2.2 Validation conditionnelle via .refine() (FORMAL→RCCM, INFORMAL→CNI)
  - [x] 2.3 Exporté depuis packages/shared/validators/index.ts

- [x] **Task 3: Module API onboarding — routes + service** (AC: #1, #2, #3, #4)
  - [x] 3.1 vendor.service.ts — createVendor avec transaction Prisma, getMyVendor
  - [x] 3.2 vendor.routes.ts — POST /vendors avec zodToFastify, tags, security
  - [x] 3.3 GET /vendors/me — profil vendeur ou 404
  - [x] 3.4 Routes enregistrées dans server.ts sous /api/v1/vendors

- [x] **Task 4: Page PWA onboarding — formulaire** (AC: #1, #2, #3)
  - [x] 4.1 Page onboarding/new/page.tsx créée avec tous les champs
  - [x] 4.2 kycType auto-déterminé par vendorType (radio formel/informel)
  - [x] 4.3 Validation HTML5 native (minLength, maxLength, required)
  - [x] 4.4 Appel API POST /api/v1/vendors + redirection vers /profile

- [x] **Task 5: Tests unitaires + intégration** (AC: tous)
  - [x] 5.1 vendor.service.test.ts — 7 tests (formel, informel, duplicate, mismatch, missing fields, getMyVendor, not found)
  - [x] 5.2 vendor.routes.test.ts — 6 tests (POST 201/422/401, GET 200/404/401)
  - [x] 5.3 Validator tests intégrés via service safeParse

- [x] **Task 6: Tests de régression** (AC: tous)
  - [x] 6.1 turbo test — 80 tests passent (12 fichiers)
  - [x] 6.2 turbo lint — 0 erreurs
  - [x] 6.3 turbo build — build réussi (api + web, /onboarding/new à 1.74 kB)

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD et les epics pour les choix techniques.**

**Décisions clés pour cette Story :**

| Sujet | Décision | Raison |
|-------|----------|--------|
| Rôle agent terrain | Pas de rôle `AGENT_TERRAIN` — utiliser `ADMIN` ou ajouter au Role enum | L'enum actuel n'a que 6 rôles, l'archi mentionne `field_agent` mais il faut décider |
| Module API | `modules/vendor/` (pas `onboarding/`) | Nomenclature plus claire pour CRUD vendeur, l'onboarding complet (bulk photo etc) viendra plus tard |
| Transaction Prisma | `prisma.$transaction()` pour créer Vendor + VendorKyc atomiquement | Garantit la cohérence des données |
| Pas de photo upload | Story 2.1 = texte/KYC seulement | Les photos de documents (scan RCCM/CNI) sont pour Story 2.3 |
| isPublic sur KycType | `isPublic: true` pour RCCM (FR48), `false` pour CNI | RCCM est public par loi, CNI est privé |

### IMPORTANT — Rôle AGENT_TERRAIN

L'enum `Role` actuelle dans `schema.prisma` ne contient PAS `AGENT_TERRAIN` / `FIELD_AGENT`. L'architecture mentionne `field_agent` comme 6ème rôle mais l'enum a `ENTERPRISE` à la place. Pour cette story, **NE PAS** modifier l'enum Role. L'agente terrain utilise simplement son compte ADMIN ou un compte avec un rôle existant. L'ajout d'un rôle `FIELD_AGENT` pourra être fait dans une story ultérieure si nécessaire.

### Stack Technique Exacte pour cette Story

| Catégorie | Technologie | Version |
|-----------|------------|---------|
| Backend | Fastify | ^5.7.4 |
| ORM | Prisma | ^6.19.2 (local via pnpm) |
| Validation | Zod | ^3.25.23 |
| Schema conversion | zod-to-json-schema | existant |
| Frontend | Next.js | ^15.5.12 |
| Styling | Tailwind CSS | ^4 |
| Testing | Vitest | ^3.2.1 |

### État Actuel du Code (ce qui existe déjà)

**Prisma Schema (`packages/shared/prisma/schema.prisma`):**
- `User` avec `id`, `supabaseId`, `phone`, `roles`, `activeContext`, `consentedAt`
- `DataDeletionRequest` (Story 1.4)
- Enum `Role`: MECHANIC, OWNER, SELLER, RIDER, ADMIN, ENTERPRISE
- **Pas de modèle Vendor ni VendorKyc**

**Auth (`plugins/auth.ts`):**
- `requireAuth` attache `request.user` = `{ id, phone, roles, activeContext, consentedAt }`
- `requireRole(...roles)` vérifie `request.user.roles`
- `requireConsent` vérifie `request.user.consentedAt`

**Routes existantes:**
- `/api/v1/auth/otp` et `/api/v1/auth/verify` — auth OTP
- `/api/v1/users/me` — profil
- `/api/v1/users/me/context` — switch contexte
- `/api/v1/users/:userId/roles` — admin update roles
- `/api/v1/users/me/consent` — consentement ARTCI
- `/api/v1/users/me/data` — données personnelles
- `/api/v1/users/me/data/deletion-request` — suppression

**Validators existants (`packages/shared/validators/`):**
- `auth.ts`: `phoneSchema`, `otpSchema`
- `user.ts`: `switchContextSchema`, `updateRolesSchema`
- `consent.ts`: `consentSchema`, `deletionRequestSchema`

**Pattern zodToFastify (`apps/api/src/lib/zodSchema.ts`):**
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema'
export function zodToFastify(schema: ZodType) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
  delete jsonSchema.$schema
  return jsonSchema
}
```

### Conventions de Code Obligatoires

**Nouveau module API — pattern à suivre :**
```typescript
// vendor.routes.ts
import type { FastifyInstance } from 'fastify'
import { createVendorSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { createVendor, getMyVendor } from './vendor.service.js'

export async function vendorRoutes(fastify: FastifyInstance) {
  fastify.post('/vendors', {
    schema: {
      body: zodToFastify(createVendorSchema),
      tags: ['Vendors'],
      description: 'Créer un profil vendeur avec KYC',
      security: [{ BearerAuth: [] }],
    },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const result = await createVendor(request.user.id, request.body)
    request.log.info({ event: 'VENDOR_CREATED', userId: request.user.id })
    return reply.status(201).send({ data: result })
  })
}
```

**Service pattern — avec transaction Prisma :**
```typescript
// vendor.service.ts
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { createVendorSchema } from 'shared/validators'

export async function createVendor(userId: string, body: unknown) {
  const parsed = createVendorSchema.safeParse(body)
  if (!parsed.success) throw new AppError('VENDOR_INVALID_DATA', 422)

  // Vérifier que l'utilisateur n'a pas déjà un profil vendeur
  const existing = await prisma.vendor.findUnique({ where: { userId } })
  if (existing) throw new AppError('VENDOR_ALREADY_EXISTS', 409)

  const { shopName, contactName, phone, vendorType, documentNumber, kycType } = parsed.data

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        userId,
        shopName,
        contactName,
        phone,
        vendorType,
        status: 'PENDING_ACTIVATION',
      },
    })

    await tx.vendorKyc.create({
      data: {
        vendorId: vendor.id,
        kycType,
        documentNumber,
        isPublic: kycType === 'RCCM',
      },
    })

    return prisma.vendor.findUnique({
      where: { id: vendor.id },
      include: { kyc: true },
    })
  })
}
```

**Naming conventions Prisma :**
- Model: `PascalCase` singulier (`Vendor`, `VendorKyc`)
- Table: `snake_case` pluriel via `@@map` (`vendors`, `vendor_kyc`)
- Column: `snake_case` via `@map` (`shop_name`, `vendor_type`)
- FK: `{table_singular}_id` (`user_id`, `vendor_id`)
- Index: `idx_{table}_{columns}` (`idx_vendors_user_id`)

**Test pattern — mock Prisma :**
```typescript
const mockVendorCreate = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockKycCreate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendor: {
      create: (...args) => mockVendorCreate(...args),
      findUnique: (...args) => mockVendorFindUnique(...args),
    },
    vendorKyc: {
      create: (...args) => mockKycCreate(...args),
    },
    $transaction: (fn) => mockTransaction(fn),
    // ...existing mocks for user
  },
}))
```

**IMPORTANT — Prisma migration sans DB locale :**
- Pas de `prisma migrate dev` (pas de PostgreSQL local)
- Créer la migration SQL manuellement dans `packages/shared/prisma/migrations/`
- Utiliser `DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" pnpm exec prisma generate` pour générer le client

### Anti-Patterns à Éviter

1. **NE PAS** créer de rôle `AGENT_TERRAIN` dans l'enum Role — on utilise les rôles existants
2. **NE PAS** uploader des photos/documents dans cette story — c'est pour Story 2.3
3. **NE PAS** gérer la signature des garanties — c'est Story 2.2
4. **NE PAS** utiliser `npx prisma` — toujours `pnpm exec prisma` (éviter Prisma 7.x global)
5. **NE PAS** créer de JSON schemas manuels — utiliser `zodToFastify(zodSchema)`
6. **NE PAS** oublier les tags Swagger et security sur les nouvelles routes
7. **NE PAS** oublier `@@map` sur tous les modèles et champs Prisma

### Intelligence Stories 1.1-1.5 — Learnings

**Patterns établis à suivre :**
- `buildApp()` pattern dans `server.ts` — les tests importent `buildApp()` et créent des instances
- `requireAuth` fait un Prisma upsert et attache `{ id, phone, roles, activeContext, consentedAt }` à `request.user`
- Fastify JSON schema via `zodToFastify()` — source unique de vérité Zod
- Error handler retourne 422 pour validation Fastify, 400+ pour AppError
- Tests utilisent `vi.stubEnv()` + `vi.mock()` pour Supabase et Prisma
- AppError pour toutes les erreurs métier
- Pino pour tous les logs structurés
- Code review identifie 3-10 issues à chaque story

**Pièges résolus dans les stories précédentes :**
- `start()` appelé pendant import tests → guard `NODE_ENV !== 'test'`
- Fastify 5 `decorateRequest('user', null)` → `undefined as unknown`
- Rate limit plugin wrappé avec `fp()` pour scope global
- `useState(() => createClient())` casse le build SSR → useRef lazy pattern
- `npx prisma` tire Prisma 7.x global → toujours `pnpm exec prisma`
- `prisma.user.update` sans vérification existence → ajouter `findUnique` avant
- eslint-disable pour destructuring `$schema` → utiliser `delete` à la place

### Structure Dossiers Cible (après Story 2.1)

```
apps/api/src/
├── server.ts                       # UPDATE: register vendorRoutes
├── modules/
│   ├── auth/                       # (INCHANGÉ)
│   ├── user/                       # (INCHANGÉ)
│   ├── consent/                    # (INCHANGÉ)
│   └── vendor/                     # (NEW)
│       ├── vendor.routes.ts
│       ├── vendor.routes.test.ts
│       ├── vendor.service.ts
│       └── vendor.service.test.ts

apps/web/app/(auth)/
├── onboarding/
│   └── new/
│       └── page.tsx                # (NEW) formulaire onboarding

packages/shared/
├── validators/
│   ├── vendor.ts                   # (NEW) createVendorSchema
│   └── index.ts                    # (UPDATE) export vendor
├── prisma/
│   ├── schema.prisma               # (UPDATE) Vendor + VendorKyc models
│   └── migrations/
│       └── YYYYMMDD_add_vendor_kyc/ # (NEW) migration SQL
│           └── migration.sql
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Database Schemas"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "API Patterns"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Naming Conventions"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Onboarding Module"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4 Ibrahim]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 8 Aya]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2 Story 2.1]
- [Source: _bmad-output/implementation-artifacts/1-5-conventions-rest-format-erreur-documentation-api.md — Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `pnpm exec prisma generate` must be run from `packages/shared/` not repo root
- Zod `.refine()` not converted by zodToFastify — conditional kycType/vendorType enforced at service level via safeParse
- `turbo lint` / `turbo build` need `--filter=api --filter=web` to include all workspaces

### Completion Notes List

- All 6 tasks completed: Prisma migration, Zod validators, API routes+service, PWA page, unit/integration tests, regression
- 80 tests passing (12 files), lint clean, build clean
- Transaction pattern used for atomic Vendor+VendorKyc creation
- RCCM isPublic=true (FR48 legal requirement), CNI isPublic=false
- No AGENT_TERRAIN role added — existing roles used per architecture decision
- Web page at /onboarding/new uses useRef lazy pattern for Supabase client (SSR safe)

### File List

- `packages/shared/prisma/schema.prisma` — Added VendorStatus, VendorType, KycType enums + Vendor, VendorKyc models + User→Vendor relation
- `packages/shared/prisma/migrations/20260301_add_vendor_and_kyc/migration.sql` — SQL migration for vendors + vendor_kyc tables
- `packages/shared/validators/vendor.ts` — createVendorSchema with .refine() conditional validation
- `packages/shared/validators/index.ts` — Added vendor exports
- `apps/api/src/modules/vendor/vendor.service.ts` — createVendor (transaction) + getMyVendor
- `apps/api/src/modules/vendor/vendor.routes.ts` — POST /vendors + GET /vendors/me
- `apps/api/src/modules/vendor/vendor.service.test.ts` — 7 unit tests
- `apps/api/src/modules/vendor/vendor.routes.test.ts` — 6 integration tests
- `apps/api/src/server.ts` — Register vendorRoutes under /api/v1/vendors
- `apps/web/app/(auth)/onboarding/new/page.tsx` — Onboarding form page
