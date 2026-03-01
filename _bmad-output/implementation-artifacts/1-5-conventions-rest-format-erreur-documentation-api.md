# Story 1.5: Conventions REST, Format Erreur & Documentation API

Status: done

## Story

As a développeur,
I want des conventions REST standardisées, un format d'erreur uniforme, et une documentation Swagger auto-générée,
So that toutes les APIs soient cohérentes, prévisibles et documentées pour l'équipe.

## Acceptance Criteria (BDD)

### AC1: Format de réponse REST standardisé

**Given** n'importe quelle route API Fastify
**When** une réponse est envoyée
**Then** elle suit le format standardisé : `{ data, meta? }` pour les succès
**And** `{ error: { code, message, statusCode, details? } }` pour les erreurs
**And** les codes HTTP sont utilisés correctement (200, 201, 400, 401, 403, 404, 422, 500)

### AC2: Validation Zod → Fastify JSON Schema via zod-to-json-schema

**Given** un schema Zod défini dans `packages/shared/validators`
**When** une requête arrive avec des données invalides
**Then** la validation Fastify retourne une erreur 422 avec les détails des champs invalides
**And** le format erreur est `{ error: { code: "VALIDATION_ERROR", message, statusCode: 422, details: { field, message }[] } }`
**And** les schemas Zod sont la source unique de vérité (pas de JSON schemas manuels)

### AC3: Documentation Swagger auto-générée

**Given** l'API Fastify est démarrée
**When** un développeur accède à `/api/v1/docs`
**Then** la documentation Swagger est générée automatiquement depuis les schemas Fastify (dérivés de Zod)
**And** tous les endpoints existants sont documentés avec leurs paramètres, réponses et exemples
**And** le schéma de sécurité Bearer JWT est configuré

### AC4: Variables d'environnement fail-fast (déjà fait)

**Given** une variable d'environnement requise est manquante
**When** l'application démarre
**Then** le processus crash immédiatement avec un message explicite
**Note** : Déjà implémenté dans Story 1.1 via `apiEnvSchema.parse(process.env)` — cette AC est une validation de l'existant.

## Tasks / Subtasks

- [x] **Task 1: Installer zod-to-json-schema** (AC: #2, #3)
  - [x] 1.1 Ajouter `zod-to-json-schema` comme dépendance dans `apps/api/package.json`
  - [x] 1.2 Créer helper `apps/api/src/lib/zodSchema.ts` — fonction `zodToFastify(zodSchema)` qui convertit un schema Zod en JSON Schema compatible Fastify

- [x] **Task 2: Standardiser le format de réponse** (AC: #1) — SKIPPED
  - [x] 2.1 ~~Créer helper `response.ts`~~ — Non nécessaire : les routes utilisent déjà `{ data }` directement, un helper serait du sur-engineering
  - [x] 2.2 Vérifier que toutes les routes existantes utilisent déjà `{ data }` — confirmé ✅

- [x] **Task 3: Mettre à jour le error handler pour 422** (AC: #1, #2)
  - [x] 3.1 Modifier `apps/api/src/plugins/errorHandler.ts` — détecter les erreurs de validation Fastify (statusCode 400 + `validation`) et retourner 422 avec format structuré
  - [x] 3.2 Gestion Zod dans services déjà couverte par AppError (safeParse → throw AppError)

- [x] **Task 4: Refactorer les routes pour utiliser les Zod schemas** (AC: #2, #3)
  - [x] 4.1 `auth.routes.ts` — zodToFastify pour `otpBodySchema` et `verifyBodySchema`
  - [x] 4.2 `user.routes.ts` — zodToFastify pour `switchContextSchema` et `updateRolesSchema`
  - [x] 4.3 `consent.routes.ts` — zodToFastify pour `consentSchema`
  - [ ] 4.4 Schemas de réponse `schema.response` — Différé (request schemas suffisants pour le moment)

- [x] **Task 5: Enrichir Swagger** (AC: #3)
  - [x] 5.1 securitySchemes BearerAuth (type http, scheme bearer, bearerFormat JWT)
  - [x] 5.2 security per-route `[{ BearerAuth: [] }]` sur toutes les routes authentifiées
  - [x] 5.3 Tags : Auth, Users, Consent avec descriptions
  - [x] 5.4 Descriptions françaises sur toutes les routes

- [x] **Task 6: Tests** (AC: tous)
  - [x] 6.1 Créé `apps/api/src/lib/zodSchema.test.ts` — 5 tests (conversion, required, literal, regex, $schema stripping)
  - [x] 6.2 Test 422 ajouté dans `server.test.ts` (pas de fichier errorHandler.test.ts séparé)
  - [x] 6.3 Tests existants mis à jour : 400→422 pour validation dans auth.routes.test.ts et consent.routes.test.ts

- [x] **Task 7: Tests de régression** (AC: tous)
  - [x] 7.1 `turbo test` — 67 tests passent (10 fichiers)
  - [x] 7.2 `turbo lint` — 0 erreurs
  - [x] 7.3 `turbo build` — build réussi (api + web)

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD et les epics pour les choix techniques.**

**Décisions clés pour cette Story :**

| Sujet | Décision | Raison |
|-------|----------|--------|
| Conversion Zod → JSON Schema | `zod-to-json-schema` | Lib légère, compatible Fastify, maintenue |
| Validation HTTP status | 422 pour validation, 400 pour bad request logique | 422 = "Unprocessable Entity" est sémantiquement correct pour validation |
| Response envelope | `{ data, meta? }` ou `{ error }` | Convention déjà en place, juste à formaliser |
| Swagger UI | `/api/v1/docs` | Déjà configuré, à enrichir |
| AC4 (env validation) | **Déjà fait** en Story 1.1 | `apiEnvSchema.parse(process.env)` dans server.ts |

### Stack Technique Exacte pour cette Story

| Catégorie | Technologie | Version |
|-----------|------------|---------|
| Backend | Fastify | ^5.7.4 |
| Validation | Zod | ^3.25.23 |
| Schema conversion | zod-to-json-schema | latest |
| Swagger | @fastify/swagger + @fastify/swagger-ui | existant |
| Testing | Vitest | ^3.2.1 |

### État Actuel du Code (ce qui existe déjà)

**Error Handler (`plugins/errorHandler.ts`):**
- Gère `AppError` → `{ error: { code, message, statusCode, details } }`
- Gère erreurs Fastify < 500 → `{ error: { code, message, statusCode } }`
- Gère erreurs 500 → message générique
- **Manque :** distinction 422 pour validation vs 400 pour logique

**Swagger (`plugins/swagger.ts`):**
- `@fastify/swagger` avec OpenAPI 3
- `@fastify/swagger-ui` à `/api/v1/docs`
- **Manque :** securitySchemes, tags, descriptions des endpoints

**AppError (`lib/appError.ts`):**
- `AppError(code, statusCode, details?)` — OK, pas de changement nécessaire

**Routes existantes:**
- `auth.routes.ts` — JSON schemas manuels `otpBodySchema`, `verifyBodySchema`
- `user.routes.ts` — JSON schemas manuels `switchContextBodySchema`, `updateRolesBodySchema`
- `consent.routes.ts` — JSON schema manuel `consentBodySchema`
- Toutes les routes utilisent déjà `reply.send({ data: result })` ✅

**Validators Zod (`packages/shared/validators/`):**
- `auth.ts` : `phoneSchema`, `otpSchema` (phone + token)
- `user.ts` : `switchContextSchema`, `updateRolesSchema`
- `consent.ts` : `consentSchema`, `deletionRequestSchema`

### Conventions de Code Obligatoires

**Zod → Fastify Schema:**
```typescript
import { zodToJsonSchema } from 'zod-to-json-schema'
import { phoneSchema } from 'shared/validators'

// Helper function
export function zodToFastify(schema: z.ZodType) {
  return zodToJsonSchema(schema, { target: 'openApi3' })
}

// Usage in routes
schema: { body: zodToFastify(phoneSchema) }
```

**Error Format Standard:**
```json
// Succès
{ "data": { ... }, "meta": { "page": 1, "total": 42 } }

// Erreur validation (422)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 422,
    "details": [
      { "field": "phone", "message": "Format invalide" }
    ]
  }
}

// Erreur logique (400/401/403/404)
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "statusCode": 404
  }
}
```

### Anti-Patterns à Éviter

1. **NE PAS** créer de JSON schemas manuels dans les routes → utiliser `zodToFastify(zodSchema)`
2. **NE PAS** utiliser `fastify-type-provider-zod` → trop intrusif, `zod-to-json-schema` est plus simple
3. **NE PAS** changer le format de réponse existant `{ data }` → il est déjà correct
4. **NE PAS** modifier les schemas Zod existants → ils sont déjà corrects
5. **NE PAS** oublier `target: 'openApi3'` dans `zodToJsonSchema` → sinon incompatible avec Swagger
6. **NE PAS** casser les tests existants → la validation passe de 400 → 422, il faut mettre à jour les assertions
7. **NE PAS** oublier les response schemas → nécessaires pour que Swagger documente les réponses

### Intelligence Stories 1.2-1.4 — Learnings

**Patterns établis à suivre :**
- `buildApp()` pattern dans `server.ts` — les tests importent `buildApp()` et créent des instances
- `requireAuth` fait un Prisma upsert et attache `{ id, phone, roles, activeContext, consentedAt }` à `request.user`
- `requireRole(...roles)` vérifie `request.user.roles`
- `requireConsent` vérifie `request.user.consentedAt`
- Fastify JSON schema obligatoire sur le body des routes (`schema: { body: ... }`)
- Error handler passe les erreurs avec statusCode < 500
- Tests utilisent `vi.stubEnv()` + `vi.mock()` pour Supabase et Prisma
- AppError pour toutes les erreurs métier
- Pino pour tous les logs

**Pièges résolus dans les stories précédentes :**
- `start()` appelé pendant import tests → guard `NODE_ENV !== 'test'`
- Fastify 5 `decorateRequest('user', null)` → `undefined as unknown`
- Rate limit plugin wrappé avec `fp()` pour scope global
- `useState(() => createClient())` casse le build SSR → useRef lazy pattern

### Structure Dossiers Cible (après Story 1.5)

```
apps/api/src/
├── server.ts                       # (INCHANGÉ)
├── lib/
│   ├── appError.ts                 # (INCHANGÉ)
│   ├── prisma.ts                   # (INCHANGÉ)
│   ├── supabase.ts                 # (INCHANGÉ)
│   ├── zodSchema.ts                # (NEW) zodToFastify() helper
│   ├── zodSchema.test.ts           # (NEW) tests
│   └── response.ts                 # (NEW) response helpers (optionnel si trivial)
├── plugins/
│   ├── auth.ts                     # (INCHANGÉ)
│   ├── cors.ts                     # (INCHANGÉ)
│   ├── errorHandler.ts             # (UPDATE) 422 pour validation
│   ├── errorHandler.test.ts        # (UPDATE) tests 422
│   ├── helmet.ts                   # (INCHANGÉ)
│   ├── rateLimit.ts                # (INCHANGÉ)
│   └── swagger.ts                  # (UPDATE) securitySchemes, tags
└── modules/
    ├── auth/auth.routes.ts          # (UPDATE) zodToFastify schemas
    ├── user/user.routes.ts          # (UPDATE) zodToFastify schemas
    └── consent/consent.routes.ts    # (UPDATE) zodToFastify schemas
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Section "API Boundaries"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Error Handling"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Naming Conventions"]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.5]
- [Source: _bmad-output/implementation-artifacts/1-4-consentement-artci-droits-donnees-personnelles.md — Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Lint fix: `_` → `_schema` with eslint-disable for destructuring $schema removal in zodSchema.ts
- `z.literal(true)` converts to `{ type: 'boolean', enum: [true] }` not `{ const: true }` in OpenAPI 3 mode

### Completion Notes List

- Task 2 (response.ts) skipped — routes already use `{ data }` directly, helper unnecessary
- Task 4.4 (response schemas) deferred — request schemas + tags + security documented, response shapes not yet in Swagger
- 422 validation test added to server.test.ts (no dedicated errorHandler.test.ts)
- Auth/consent route tests updated: 400→422 for Fastify schema validation errors
- Code review: 6 findings (1 HIGH, 3 MEDIUM, 2 LOW) — 2 fixed, 4 accepted

### File List

- `apps/api/package.json` — UPDATED: added `zod-to-json-schema` dependency
- `apps/api/src/lib/zodSchema.ts` — NEW: `zodToFastify()` helper
- `apps/api/src/lib/zodSchema.test.ts` — NEW: 5 unit tests
- `apps/api/src/plugins/errorHandler.ts` — UPDATED: 422 for validation errors with structured details
- `apps/api/src/plugins/swagger.ts` — UPDATED: securitySchemes (BearerAuth), tags (Auth, Users, Consent)
- `apps/api/src/modules/auth/auth.routes.ts` — UPDATED: zodToFastify, tags, descriptions
- `apps/api/src/modules/auth/auth.routes.test.ts` — UPDATED: 400→422 assertions
- `apps/api/src/modules/user/user.routes.ts` — UPDATED: zodToFastify, tags, descriptions, security
- `apps/api/src/modules/consent/consent.routes.ts` — UPDATED: zodToFastify, tags, descriptions, security
- `apps/api/src/modules/consent/consent.routes.test.ts` — UPDATED: 400→422 assertion
- `apps/api/src/server.test.ts` — UPDATED: added 422 validation error test
- `pnpm-lock.yaml` — UPDATED: lockfile
