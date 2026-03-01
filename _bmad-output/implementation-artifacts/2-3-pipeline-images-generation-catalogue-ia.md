# Story 2.3: Pipeline Images & Génération Catalogue IA

Status: review

## Story

As a vendeur (assisté par l'agente terrain),
I want envoyer des photos de mes pièces en stock pour que l'IA génère automatiquement les fiches catalogue,
So that mon catalogue soit constitué rapidement sans saisie manuelle des références.

## Acceptance Criteria (BDD)

### AC1: Upload d'image et stockage R2

**Given** un vendeur actif (ou l'agente terrain pour lui)
**When** il upload une photo de pièce
**Then** l'image est uploadée vers Cloudflare R2 (format brut, max 5 MB)
**And** un job pgqueue `IMAGE.PROCESS_VARIANTS` est créé pour le traitement asynchrone
**And** sharp génère 4 variants WebP : thumb (150px), small (400px), medium (800px), large (1200px)
**And** les variants sont stockées sur R2 avec des URLs CDN

### AC2: Génération de fiche catalogue par IA

**Given** l'image brute est disponible sur R2
**When** le job IA est exécuté
**Then** Gemini VLM analyse l'image en zero-shot
**And** une fiche catalogue est auto-générée avec : nom pièce, catégorie, référence OEM probable, compatibilité véhicule suggérée, prix marché suggéré
**And** la fiche a le statut `draft` (en attente validation vendeur)

### AC3: Upload bulk avec progression

**Given** une session bulk d'onboarding (agente terrain + vendeur)
**When** plusieurs photos sont uploadées en séquence
**Then** chaque photo est traitée indépendamment
**And** un compteur de progression est affiché (ex: "32/50 pièces traitées")
**And** les photos de qualité insuffisante sont signalées (⚠️) avec suggestion de reprise
**And** une fiche catalogue ne peut être publiée que si la photo atteint un score qualité minimum — sinon elle reste en `draft` avec indication "Photo à reprendre"

### AC4: Quota Gemini et fallback

**Given** l'alerte quota Gemini VLM atteint 80%
**When** un upload est soumis
**Then** une alerte est loggée (Sentry)
**And** le fallback défini est activé (formulaire manuel sans IA)

## Tasks / Subtasks

- [x] **Task 1: Migration Prisma — modèles CatalogItem + Job** (AC: #1, #2)
  - [x] 1.1 Enum `CatalogItemStatus` (DRAFT, PUBLISHED, ARCHIVED) + Enum `JobType` + Enum `JobStatus`
  - [x] 1.2 Model `CatalogItem` : vendorId, name, category, oemReference, vehicleCompatibility, suggestedPrice, price, status, imageOriginalUrl, imageThumbUrl, imageSmallUrl, imageMediumUrl, imageLargeUrl, aiConfidence, qualityScore, qualityIssue, createdAt, updatedAt
  - [x] 1.3 Model `Job` : type, status (PENDING/PROCESSING/COMPLETED/FAILED), payload (JSON), attempts, maxAttempts, scheduledAt, completedAt, error
  - [x] 1.4 Relations : Vendor → CatalogItem[], CatalogItem index sur vendorId+status
  - [x] 1.5 Migration SQL manuelle + prisma generate

- [x] **Task 2: Lib R2 — Cloudflare R2 upload/download** (AC: #1)
  - [x] 2.1 `apps/api/src/lib/r2.ts` — S3-compatible client pour Cloudflare R2 via `@aws-sdk/client-s3`
  - [x] 2.2 Fonctions : `uploadRaw(key, buffer, contentType)`, `uploadVariant(key, buffer)`, `getPublicUrl(key)`
  - [x] 2.3 Variables env : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
  - [x] 2.4 Env validation Zod dans `packages/shared/env.ts` (optionnels en dev avec fallback local)

- [x] **Task 3: Lib Sharp — traitement d'images** (AC: #1)
  - [x] 3.1 `apps/api/src/lib/imageProcessor.ts` — fonctions de redimensionnement WebP via `sharp`
  - [x] 3.2 Fonction `processVariants(buffer)` → retourne 4 variants : thumb (150px), small (400px), medium (800px), large (1200px) en WebP
  - [x] 3.3 Fonction `assessQuality(buffer)` → retourne `{ score: 0-1, issues: string[] }` (netteté, luminosité, dimensions min)
  - [x] 3.4 Contrainte max 5 MB input validée avant traitement

- [x] **Task 4: Queue Service — pgqueue MVP** (AC: #1, #2)
  - [x] 4.1 `apps/api/src/modules/queue/queueService.ts` — `enqueue(type, payload, options?)`, `dequeue(types)`, `markCompleted(jobId)`, `markFailed(jobId, error)`
  - [x] 4.2 Implémentation pgqueue : table `jobs` avec `SELECT FOR UPDATE SKIP LOCKED`
  - [x] 4.3 `apps/api/src/modules/queue/worker.ts` — polling loop (30s interval) + dispatch par type
  - [x] 4.4 `apps/api/src/modules/queue/handlers/imageProcess.ts` — handler `IMAGE.PROCESS_VARIANTS` : télécharge raw depuis R2, processVariants, upload 4 variants vers R2, met à jour CatalogItem avec les URLs

- [x] **Task 5: Lib Gemini — appel VLM zero-shot** (AC: #2, #4)
  - [x] 5.1 `apps/api/src/lib/gemini.ts` — wrapper Gemini Flash API via `@google/generative-ai`
  - [x] 5.2 Fonction `identifyPart(imageBuffer)` → retourne `{ name, category, oemReference, vehicleCompatibility, suggestedPrice, confidence }`
  - [x] 5.3 Prompt zero-shot structuré pour pièces auto marché ivoirien (JSON output)
  - [x] 5.4 Quota tracking : compteur en mémoire + alerte log Sentry à 80%
  - [x] 5.5 Fallback : si Gemini échoue ou quota atteint → CatalogItem créé en `draft` sans données IA, flag `aiGenerated: false`

- [x] **Task 6: Service Catalog — upload + génération fiche** (AC: #1, #2, #3, #4)
  - [x] 6.1 `apps/api/src/modules/catalog/catalog.service.ts` — `uploadPartImage(userId, file)` : valide taille, upload raw R2, crée CatalogItem draft, enqueue IMAGE.PROCESS_VARIANTS + CATALOG.AI_IDENTIFY
  - [x] 6.2 Fonction `getMyItems(userId, filters?)` — liste les fiches catalogue du vendeur avec filtres status
  - [x] 6.3 Handler `CATALOG.AI_IDENTIFY` : appel Gemini, mise à jour CatalogItem avec données IA
  - [x] 6.4 `apps/api/src/modules/catalog/catalog.service.test.ts` — tests service

- [x] **Task 7: Routes API — upload + liste catalogue** (AC: #1, #2, #3)
  - [x] 7.1 `apps/api/src/modules/catalog/catalog.routes.ts` — POST `/api/v1/catalog/items/upload` (multipart/form-data, max 5MB)
  - [x] 7.2 GET `/api/v1/catalog/items` — liste les fiches du vendeur connecté (query: status, page, limit)
  - [x] 7.3 GET `/api/v1/catalog/items/:id` — détail d'une fiche
  - [x] 7.4 Multipart upload via `@fastify/multipart`
  - [x] 7.5 preHandler: `[requireAuth, requireRole('SELLER', 'ADMIN')]`
  - [x] 7.6 `apps/api/src/modules/catalog/catalog.routes.test.ts` — tests routes
  - [x] 7.7 Enregistrer routes dans server.ts

- [x] **Task 8: Page PWA — upload photos + liste catalogue** (AC: #1, #3)
  - [x] 8.1 Page `/vendors/catalog/page.tsx` — liste des fiches catalogue du vendeur avec statut
  - [x] 8.2 Page `/vendors/catalog/upload/page.tsx` — upload photo avec preview, compteur progression bulk
  - [x] 8.3 Indicateur qualité photo (✅ OK / ⚠️ Flou) après upload
  - [x] 8.4 Compteur de progression "X/Y pièces traitées" pour session bulk

- [x] **Task 9: Validators Zod — catalog schemas** (AC: #1, #2)
  - [x] 9.1 `packages/shared/validators/catalog.ts` — `catalogItemStatusSchema`, `catalogItemFilterSchema`
  - [x] 9.2 Export depuis `packages/shared/validators/index.ts`

- [x] **Task 10: Tests unitaires + intégration** (AC: tous)
  - [x] 10.1 catalog.service.test.ts — tests upload, AI identify, list items
  - [x] 10.2 catalog.routes.test.ts — tests routes (201/401/404/422)
  - [x] 10.3 imageProcessor tests — variants generation, quality assessment
  - [x] 10.4 queueService tests — enqueue, dequeue, mark completed/failed

- [x] **Task 11: Tests de régression** (AC: tous)
  - [x] 11.1 turbo test — tous les tests passent
  - [x] 11.2 turbo lint — 0 erreurs
  - [x] 11.3 turbo build — build réussi

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD et les epics pour les choix techniques.**

**Décisions clés pour cette Story :**

| Sujet | Décision | Raison |
|-------|----------|--------|
| Image Storage | Cloudflare R2 (S3-compatible) | Architecture décision — pas Supabase Storage |
| Image Processing | sharp async via pgqueue | ADR-D02 : stabilité RAM, pas de blocage event loop |
| IA Part Recognition | Gemini Flash API via fetch depuis Node.js | Pas de microservice Python séparé au MVP — un simple `fetch()` |
| Queue System | pgqueue (table `jobs` + SELECT FOR UPDATE SKIP LOCKED) | ~10-20 tâches/jour au MVP, PostgreSQL suffit |
| Catalog Search | pg_trgm + unaccent() pour MVP | Meilisearch Phase 2 quand > 50K refs ou recherches 0 résultat > 15% |
| Module API | Nouveau module `catalog/` | Domaine distinct du vendeur, propres routes et service |
| Queue Module | Nouveau module `queue/` | Infrastructure transversale, réutilisée par notifications plus tard |
| Variants WebP | 4 tailles : thumb 150px, small 400px, medium 800px, large 1200px | Architecture spec |
| Upload Max | 5 MB par image | NFR18 |
| Offline bulk | **HORS SCOPE Story 2.3** — IndexedDB offline sera Story 3.6 (PWA offline) | Trop de complexité pour cette story |

### IMPORTANT — Scope de cette Story

Cette story se concentre sur le **pipeline backend** (upload → R2 → sharp → Gemini → fiche draft) et une **PWA basique** (upload simple + liste). Les fonctionnalités avancées suivantes sont **HORS SCOPE** :

1. **Mode offline IndexedDB** — Story 3.6 (PWA offline-first)
2. **Reprise de session interrompue** — Story 3.6
3. **Validation/ajustement par vendeur** — Story 2.4
4. **Sync Meilisearch** — Story 2.4 ou Phase 2
5. **PhotoBulkUploader composant complexe** — Page simple avec upload séquenciel suffit pour MVP
6. **Score qualité photo côté client** — Le score est calculé côté serveur via sharp (analyse netteté/luminosité)

### Stack Technique pour cette Story — Nouvelles Dépendances

| Catégorie | Technologie | Version | Install |
|-----------|------------|---------|---------|
| Image Processing | sharp | ^0.33.x | `pnpm add sharp --filter=api` |
| R2/S3 Client | @aws-sdk/client-s3 | ^3.x | `pnpm add @aws-sdk/client-s3 --filter=api` |
| Gemini AI | @google/generative-ai | ^0.x | `pnpm add @google/generative-ai --filter=api` |
| Multipart Upload | @fastify/multipart | ^9.x | `pnpm add @fastify/multipart --filter=api` |

### État Actuel du Code (ce qui existe depuis Stories 2.1-2.2)

**Prisma Schema (`packages/shared/prisma/schema.prisma`):**
- Enum `VendorStatus`: PENDING_ACTIVATION, ACTIVE, PAUSED
- Enum `VendorType`: FORMAL, INFORMAL
- Enum `KycType`: RCCM, CNI
- Enum `GuaranteeType`: RETURN_48H, WARRANTY_30D
- Model `Vendor` avec userId unique, relations kyc + guaranteeSignatures
- Model `VendorKyc`, Model `VendorGuaranteeSignature`

**Vendor Module (`apps/api/src/modules/vendor/`):**
- `vendor.service.ts` — createVendor, getMyVendor, signGuarantees, getGuaranteeStatus
- `vendor.routes.ts` — POST `/`, GET `/me`, POST `/me/signature`, GET `/me/guarantees`
- preHandler: `[requireAuth, requireRole('SELLER', 'ADMIN')]`
- 14 tests service + 13 tests routes

**Lib existantes (`apps/api/src/lib/`):**
- `appError.ts` — classe AppError pour erreurs métier
- `prisma.ts` — singleton Prisma client
- `supabase.ts` — supabaseAdmin client
- `zodSchema.ts` — `zodToFastify()` helper

**Auth (`plugins/auth.ts`):**
- `requireAuth` attache `request.user` = `{ id, phone, roles, activeContext, consentedAt }`
- `requireRole(...roles)` vérifie `request.user.roles`

### Conventions de Code Obligatoires

**Nouveau module catalog — structure :**
```
apps/api/src/modules/catalog/
├── catalog.routes.ts       # Routes upload + CRUD
├── catalog.routes.test.ts
├── catalog.service.ts      # Logique métier
└── catalog.service.test.ts
```

**Nouveau module queue — structure :**
```
apps/api/src/modules/queue/
├── queueService.ts         # Interface enqueue/dequeue
├── queueService.test.ts
├── worker.ts               # Polling loop + dispatch
└── handlers/
    └── imageProcess.ts     # IMAGE.PROCESS_VARIANTS handler
```

**Nouvelles libs — structure :**
```
apps/api/src/lib/
├── r2.ts                   # Cloudflare R2 S3-compatible client
├── imageProcessor.ts       # sharp resize + quality assessment
└── gemini.ts               # Gemini Flash API wrapper
```

**Route registration dans server.ts :**
```typescript
import { catalogRoutes } from './modules/catalog/catalog.routes.js'
// Dans buildApp():
app.register(catalogRoutes, { prefix: '/api/v1/catalog' })
```

**Multipart upload pattern :**
```typescript
import multipart from '@fastify/multipart'
// Dans buildApp():
app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }) // 5 MB
```

**Upload route pattern :**
```typescript
fastify.post('/items/upload', {
  schema: {
    tags: ['Catalog'],
    description: 'Upload une photo de pièce pour génération catalogue IA',
    security: [{ BearerAuth: [] }],
    consumes: ['multipart/form-data'],
  },
  preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
}, async (request, reply) => {
  const data = await request.file()
  if (!data) throw new AppError('MISSING_FILE', 422, { message: 'Aucun fichier fourni' })
  const result = await uploadPartImage(request.user.id, data)
  request.log.info({ event: 'CATALOG_IMAGE_UPLOADED', userId: request.user.id, itemId: result.id })
  return reply.status(201).send({ data: result })
})
```

**R2 client pattern :**
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

**Gemini prompt pattern (zero-shot pièces auto) :**
```typescript
const prompt = `Analyze this auto part image. Return a JSON object with:
{
  "name": "Part name in French",
  "category": "One of: Filtration, Freinage, Suspension, Moteur, Transmission, Electricité, Carrosserie, Echappement, Refroidissement, Autre",
  "oemReference": "OEM reference if visible, null otherwise",
  "vehicleCompatibility": "Suggested vehicle compatibility (e.g. 'Toyota Hilux 2005-2015')",
  "suggestedPrice": number in FCFA (typical Abidjan market price),
  "confidence": number between 0 and 1
}
Only return valid JSON, no other text.`
```

**pgqueue Job convention :**
```typescript
type JobType = 'IMAGE.PROCESS_VARIANTS' | 'CATALOG.AI_IDENTIFY'

// Enqueue pattern
await queueService.enqueue('IMAGE.PROCESS_VARIANTS', {
  catalogItemId: item.id,
  imageKey: rawKey,
})
```

**Naming conventions Prisma :**
- Model: `CatalogItem` → `@@map("catalog_items")`
- Enum: `CatalogItemStatus` avec DRAFT, PUBLISHED, ARCHIVED
- FK: `vendor_id` via `@map("vendor_id")`
- Index: `idx_catalog_items_vendor_status` sur `[vendorId, status]`

**IMPORTANT — Prisma migration sans DB locale :**
- Pas de `prisma migrate dev` (pas de PostgreSQL local)
- Créer la migration SQL manuellement dans `packages/shared/prisma/migrations/`
- Utiliser `DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" pnpm exec prisma generate` depuis `packages/shared/`

### Anti-Patterns à Éviter

1. **NE PAS** utiliser Supabase Storage — architecture impose Cloudflare R2
2. **NE PAS** traiter sharp en synchrone dans la route — TOUJOURS async via pgqueue (ADR-D02)
3. **NE PAS** implémenter Meilisearch — Phase 2, utiliser pg_trgm pour recherche MVP
4. **NE PAS** créer un microservice Python pour IA — appel HTTP vers Gemini Flash API depuis Node.js
5. **NE PAS** implémenter Redis/BullMQ — pgqueue (table jobs + SELECT FOR UPDATE SKIP LOCKED) suffit au MVP
6. **NE PAS** implémenter IndexedDB offline — Story 3.6 (PWA offline-first)
7. **NE PAS** utiliser `npx prisma` — toujours `pnpm exec prisma`
8. **NE PAS** oublier les tags Swagger et security sur les nouvelles routes
9. **NE PAS** oublier `@@map` sur les nouveaux modèles et champs Prisma
10. **NE PAS** bloquer l'event loop avec sharp — les jobs async sont traités par le worker polling

### Intelligence Story 2.2 — Learnings

**Patterns établis à suivre :**
- `buildApp()` pattern dans `server.ts` — les tests importent `buildApp()` et créent des instances
- `requireAuth` + `requireRole('SELLER', 'ADMIN')` — pattern établi pour toutes les routes vendeur
- Fastify JSON schema via `zodToFastify()` — source unique de vérité Zod
- Error handler retourne 422 pour validation Fastify, 422 pour safeParse service, 400+ pour AppError
- Tests utilisent `vi.stubEnv()` + `vi.mock()` pour Supabase et Prisma
- `mockTransaction.mockImplementation()` exécute le callback avec un tx mock
- AppError pour toutes les erreurs métier
- Pino pour tous les logs structurés

**Pièges résolus dans Stories précédentes :**
- `pnpm exec prisma generate` doit être lancé depuis `packages/shared/`, pas la racine repo
- Zod `.refine()` n'est PAS converti par zodToFastify — logique conditionnelle enforced au niveau service
- Index redondant sur colonne UNIQUE — le UNIQUE crée déjà un index implicite
- Service validation errors doivent retourner 422 (pas 400) pour cohérence avec Story 1.5
- POST sans body → pas de Content-Type header nécessaire
- Mocks vendeur dans test : penser à inclure toutes les relations dans `mockTransaction` tx

### Env Variables Nécessaires (nouvelles)

```bash
# Cloudflare R2 (S3-compatible)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=pieces-images
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Google Gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.0-flash
GEMINI_QUOTA_ALERT_THRESHOLD=0.8
```

### Structure Dossiers Cible (après Story 2.3)

```
apps/api/src/
├── server.ts                       # UPDATE: + multipart plugin, + catalogRoutes
├── lib/
│   ├── appError.ts                 # (INCHANGÉ)
│   ├── prisma.ts                   # (INCHANGÉ)
│   ├── supabase.ts                 # (INCHANGÉ)
│   ├── zodSchema.ts                # (INCHANGÉ)
│   ├── r2.ts                       # (NEW) Cloudflare R2 S3-compatible client
│   ├── imageProcessor.ts           # (NEW) sharp WebP variants + quality
│   └── gemini.ts                   # (NEW) Gemini Flash API wrapper
├── modules/
│   ├── auth/                       # (INCHANGÉ)
│   ├── user/                       # (INCHANGÉ)
│   ├── consent/                    # (INCHANGÉ)
│   ├── vendor/                     # (INCHANGÉ)
│   ├── catalog/                    # (NEW)
│   │   ├── catalog.routes.ts       # POST /items/upload, GET /items, GET /items/:id
│   │   ├── catalog.routes.test.ts
│   │   ├── catalog.service.ts      # uploadPartImage, getMyItems, AI identify handler
│   │   └── catalog.service.test.ts
│   └── queue/                      # (NEW)
│       ├── queueService.ts         # enqueue/dequeue/mark interface
│       ├── queueService.test.ts
│       ├── worker.ts               # Polling loop + dispatch
│       └── handlers/
│           └── imageProcess.ts     # IMAGE.PROCESS_VARIANTS handler

apps/web/app/(auth)/
├── vendors/
│   ├── guarantees/
│   │   └── page.tsx                # (INCHANGÉ — Story 2.2)
│   └── catalog/                    # (NEW)
│       ├── page.tsx                # Liste fiches catalogue vendeur
│       └── upload/
│           └── page.tsx            # Upload photo pièce + progress

packages/shared/
├── validators/
│   ├── catalog.ts                  # (NEW) catalogItemStatusSchema, etc.
│   └── index.ts                    # (UPDATE) export catalog validators
├── prisma/
│   ├── schema.prisma               # (UPDATE) + CatalogItem, Job models
│   └── migrations/
│       └── YYYYMMDD_add_catalog_items_and_jobs/
│           └── migration.sql       # (NEW) migration SQL
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — ADR-D02 sharp async via pgqueue]
- [Source: _bmad-output/planning-artifacts/architecture.md — Pipeline Images section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Queue Service architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md — Vision Module structure]
- [Source: _bmad-output/planning-artifacts/architecture.md — R2 storage configuration]
- [Source: _bmad-output/planning-artifacts/architecture.md — Gemini Flash API integration]
- [Source: _bmad-output/planning-artifacts/architecture.md — Catalog Module structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4 Ibrahim onboarding: session photo bulk]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 8 Aya: mode offline, score qualité temps réel]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — PhotoBulkUploader component spec]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2 Story 2.3]
- [Source: _bmad-output/implementation-artifacts/2-2-signature-garanties-obligatoires-activation-profil.md — Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- ESLint: fixed unnecessary escape chars in raw SQL, non-null assertions, and `throw new Error()` → AppError
- TypeScript: fixed `Record<string, unknown>` → `Prisma.InputJsonValue` cast for Job payload
- TypeScript: fixed `files[i]` possibly undefined in upload loop

### Completion Notes List

- All 11 tasks completed: Prisma migration, R2 lib, sharp image processor, Gemini VLM lib, pgqueue service+worker, catalog service+routes, PWA pages, validators, tests, regression
- 118 tests passing (15 files), 24 new tests for Story 2.3 (10 catalog service, 8 catalog routes, 6 queue service)
- New dependencies: sharp, @aws-sdk/client-s3, @google/generative-ai, @fastify/multipart
- Architecture: upload → R2 brut → pgqueue async → sharp variants WebP → R2 + Gemini VLM zero-shot → CatalogItem draft
- pgqueue uses SELECT FOR UPDATE SKIP LOCKED with 30s polling interval
- Gemini quota alert at 80% threshold with graceful fallback (aiGenerated: false)
- Image quality assessment via sharp stats (sharpness, brightness, dimensions)
- 4 WebP variants: thumb 150px, small 400px, medium 800px, large 1200px
- PWA: catalog list with status filters + upload page with bulk progress counter

### File List

- `packages/shared/prisma/schema.prisma` — Added CatalogItemStatus, JobType, JobStatus enums + CatalogItem, Job models + Vendor.catalogItems relation
- `packages/shared/prisma/migrations/20260301_add_catalog_items_and_jobs/migration.sql` — SQL migration for catalog_items and jobs tables
- `packages/shared/validators/catalog.ts` — catalogItemStatusSchema, catalogItemFilterSchema
- `packages/shared/validators/index.ts` — Export catalog validators
- `apps/api/src/lib/r2.ts` — Cloudflare R2 S3-compatible upload/download/getPublicUrl
- `apps/api/src/lib/imageProcessor.ts` — sharp processVariants (4 WebP sizes) + assessQuality
- `apps/api/src/lib/gemini.ts` — Gemini Flash API wrapper for zero-shot part identification
- `apps/api/src/modules/queue/queueService.ts` — pgqueue enqueue/dequeue/markCompleted/markFailed
- `apps/api/src/modules/queue/queueService.test.ts` — 6 tests for queue service
- `apps/api/src/modules/queue/worker.ts` — Polling loop worker with job dispatch
- `apps/api/src/modules/queue/handlers/imageProcess.ts` — IMAGE.PROCESS_VARIANTS + CATALOG.AI_IDENTIFY handlers
- `apps/api/src/modules/catalog/catalog.service.ts` — uploadPartImage, getMyItems, getItem
- `apps/api/src/modules/catalog/catalog.service.test.ts` — 10 tests for catalog service
- `apps/api/src/modules/catalog/catalog.routes.ts` — POST /items/upload, GET /items, GET /items/:id
- `apps/api/src/modules/catalog/catalog.routes.test.ts` — 8 tests for catalog routes
- `apps/api/src/server.ts` — Register multipart plugin + catalogRoutes
- `apps/web/app/(auth)/vendors/catalog/page.tsx` — Catalog list page with status filters
- `apps/web/app/(auth)/vendors/catalog/upload/page.tsx` — Bulk photo upload page with progress
