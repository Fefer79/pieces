# Story 2.2: Signature Garanties Obligatoires & Activation Profil

Status: done

## Story

As a vendeur,
I want signer les garanties obligatoires Pièces lors de mon activation,
So that mon profil soit activé et que les acheteurs sachent que je m'engage sur la qualité.

## Acceptance Criteria (BDD)

### AC1: Affichage des garanties obligatoires

**Given** un vendeur avec statut `PENDING_ACTIVATION` (créé via Story 2.1)
**When** il (ou l'agente terrain) accède à l'écran de signature `/vendors/me/guarantees`
**Then** les deux garanties sont affichées clairement :
- Garantie retour pièce incorrecte : reprise sous 48h, remboursement intégral
- Garantie pièces d'occasion : fonctionnement minimum 30 jours
**And** le nom de la boutique et le type vendeur sont rappelés en haut
**And** un bouton "Signer les garanties" est visible

### AC2: Signature et activation du profil

**Given** le vendeur accepte les deux garanties
**When** la signature est soumise via POST `/api/v1/vendors/me/signature`
**Then** un enregistrement `VendorGuaranteeSignature` est créé avec horodatage
**And** le statut vendeur passe de `PENDING_ACTIVATION` à `ACTIVE`
**And** un log structuré `VENDOR_ACTIVATED` est émis
**And** l'API retourne le vendeur avec son nouveau statut et la signature

### AC3: Refus de signature

**Given** le vendeur refuse de signer les garanties
**When** il quitte l'écran ou clique "Refuser"
**Then** le profil reste en `PENDING_ACTIVATION`
**And** il ne peut pas recevoir de commandes
**And** un message clair explique les conséquences du refus

### AC4: Vendeur déjà activé — idempotence

**Given** le vendeur a déjà un statut `ACTIVE`
**When** il tente de re-signer les garanties
**Then** l'API retourne 409 VENDOR_ALREADY_ACTIVE
**And** aucune nouvelle signature n'est créée

## Tasks / Subtasks

- [x] **Task 1: Migration Prisma — modèle VendorGuaranteeSignature** (AC: #2)
  - [x] 1.1 Modèle VendorGuaranteeSignature créé avec vendorId, guaranteeType, signedAt
  - [x] 1.2 Enum GuaranteeType ajouté (RETURN_48H, WARRANTY_30D)
  - [x] 1.3 Relation Vendor → VendorGuaranteeSignature (one-to-many) + unique constraint
  - [x] 1.4 Migration SQL manuelle + prisma generate réussi

- [x] **Task 2: Validators Zod — signature garanties** (AC: #2)
  - [x] 2.1 guaranteeTypeSchema dans packages/shared/validators/vendor.ts
  - [x] 2.2 Exporté depuis packages/shared/validators/index.ts

- [x] **Task 3: Service — signGuarantees + logique activation** (AC: #2, #3, #4)
  - [x] 3.1 signGuarantees() — vérifie statut PENDING_ACTIVATION, crée 2 signatures, active le profil
  - [x] 3.2 Transaction Prisma atomique : createMany + Vendor.update
  - [x] 3.3 Gestion 409 si déjà ACTIVE + 422 si statut invalide
  - [x] 3.4 Retourne vendor complet avec kyc + guaranteeSignatures

- [x] **Task 4: Routes API — POST /vendors/me/signature + GET /vendors/me/guarantees** (AC: #1, #2, #4)
  - [x] 4.1 POST /vendors/me/signature — signe les garanties et active le profil (201)
  - [x] 4.2 GET /vendors/me/guarantees — retourne le statut des garanties (signées ou non)
  - [x] 4.3 Tags Swagger, security, preHandler [requireAuth, requireRole('SELLER', 'ADMIN')]

- [x] **Task 5: Page PWA — écran signature garanties** (AC: #1, #3)
  - [x] 5.1 Page /vendors/guarantees/page.tsx avec affichage des 2 garanties
  - [x] 5.2 Boutons "Signer les garanties" et "Refuser"
  - [x] 5.3 Appel API POST /api/v1/vendors/me/signature + redirection vers /profile
  - [x] 5.4 Message de refus si le vendeur décline

- [x] **Task 6: Tests unitaires + intégration** (AC: tous)
  - [x] 6.1 vendor.service.test.ts — 7 tests signGuarantees + getGuaranteeStatus (activation, déjà actif, PAUSED, not found, signed/unsigned)
  - [x] 6.2 vendor.routes.test.ts — 6 tests POST /vendors/me/signature (201/409/404/401) + GET /vendors/me/guarantees (200/401)
  - [x] 6.3 Validator tests — guaranteeTypeSchema exporté et fonctionnel

- [x] **Task 7: Tests de régression** (AC: tous)
  - [x] 7.1 turbo test — 93 tests passent (12 fichiers)
  - [x] 7.2 turbo lint — 0 erreurs
  - [x] 7.3 turbo build — build réussi (/vendors/guarantees à 1.68 kB)

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD et les epics pour les choix techniques.**

**Décisions clés pour cette Story :**

| Sujet | Décision | Raison |
|-------|----------|--------|
| Module API | `modules/vendor/` (extension de Story 2.1) | Même domaine, ajouter service/routes au module existant |
| Modèle signature | `VendorGuaranteeSignature` avec enum `GuaranteeType` | Deux garanties distinctes, chacune horodatée séparément |
| Activation | PENDING_ACTIVATION → ACTIVE dans la même transaction | Atomicité : signatures + changement de statut |
| Pas de signature digitale graphique | Story 2.2 = acceptation par bouton (pas de canvas signature) | La signature digitale graphique sur tablette sera ajoutée ultérieurement si nécessaire |
| Idempotence | 409 si déjà ACTIVE | Éviter les signatures dupliquées |
| Pas de SLA 2h | Le timer d'activation < 2h est hors scope de cette story | L'activation est immédiate à la signature, le SLA 2h concerne le processus complet |

### IMPORTANT — Statut VendorStatus

L'enum `VendorStatus` existe déjà dans `schema.prisma` avec : `PENDING_ACTIVATION`, `ACTIVE`, `PAUSED`. Story 2.2 utilise la transition `PENDING_ACTIVATION → ACTIVE`. **NE PAS** modifier l'enum, il est déjà complet.

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

### État Actuel du Code (ce qui existe déjà depuis Story 2.1)

**Prisma Schema (`packages/shared/prisma/schema.prisma`):**
- Enum `VendorStatus`: PENDING_ACTIVATION, ACTIVE, PAUSED
- Enum `VendorType`: FORMAL, INFORMAL
- Enum `KycType`: RCCM, CNI
- Model `Vendor` avec userId unique, shopName, contactName, phone, vendorType, status, kyc relation
- Model `VendorKyc` avec vendorId unique, kycType, documentNumber, isPublic

**Vendor Module (`apps/api/src/modules/vendor/`):**
- `vendor.service.ts` — `createVendor(userId, body)`, `getMyVendor(userId)`
- `vendor.routes.ts` — POST `/` (créer vendeur), GET `/me` (profil vendeur)
- preHandler: `[requireAuth, requireRole('SELLER', 'ADMIN')]`
- 7 tests service + 6 tests routes = 13 tests

**Auth (`plugins/auth.ts`):**
- `requireAuth` attache `request.user` = `{ id, phone, roles, activeContext, consentedAt }`
- `requireRole(...roles)` vérifie `request.user.roles`

**Validators existants (`packages/shared/validators/vendor.ts`):**
- `vendorTypeSchema`, `kycTypeSchema`, `createVendorSchema`

**Pattern zodToFastify (`apps/api/src/lib/zodSchema.ts`):**
```typescript
export function zodToFastify(schema: ZodType) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' }) as Record<string, unknown>
  delete jsonSchema.$schema
  return jsonSchema
}
```

### Conventions de Code Obligatoires

**Extension module vendor — pattern à suivre :**
```typescript
// Ajout dans vendor.routes.ts
fastify.post(
  '/me/signature',
  {
    schema: {
      tags: ['Vendors'],
      description: 'Signer les garanties obligatoires et activer le profil vendeur',
      security: [{ BearerAuth: [] }],
    },
    preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
  },
  async (request, reply) => {
    const result = await signGuarantees(request.user.id)
    request.log.info({ event: 'VENDOR_ACTIVATED', userId: request.user.id, vendorId: result.id })
    return reply.status(201).send({ data: result })
  },
)
```

**Service pattern — signGuarantees :**
```typescript
export async function signGuarantees(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, status: true },
  })
  if (!vendor) throw new AppError('VENDOR_NOT_FOUND', 404)
  if (vendor.status === 'ACTIVE') throw new AppError('VENDOR_ALREADY_ACTIVE', 409)
  if (vendor.status !== 'PENDING_ACTIVATION') throw new AppError('VENDOR_INVALID_STATUS', 422)

  return prisma.$transaction(async (tx) => {
    // Create 2 guarantee signatures
    await tx.vendorGuaranteeSignature.createMany({
      data: [
        { vendorId: vendor.id, guaranteeType: 'RETURN_48H', signedAt: new Date() },
        { vendorId: vendor.id, guaranteeType: 'WARRANTY_30D', signedAt: new Date() },
      ],
    })

    // Activate vendor
    await tx.vendor.update({
      where: { id: vendor.id },
      data: { status: 'ACTIVE' },
    })

    return tx.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
      select: {
        id: true, shopName: true, contactName: true, phone: true,
        vendorType: true, status: true, createdAt: true,
        kyc: { select: { id: true, kycType: true, documentNumber: true, isPublic: true } },
        guaranteeSignatures: { select: { id: true, guaranteeType: true, signedAt: true } },
      },
    })
  })
}
```

**Naming conventions Prisma :**
- Model: `VendorGuaranteeSignature` → `@@map("vendor_guarantee_signatures")`
- Enum: `GuaranteeType` avec `RETURN_48H`, `WARRANTY_30D`
- FK: `vendor_id` via `@map("vendor_id")`

**Test pattern — extension des mocks existants :**
```typescript
// Ajouter aux mocks existants dans vendor.service.test.ts
const mockGuaranteeSignatureCreateMany = vi.fn()
// Dans mockTransaction tx:
vendorGuaranteeSignature: {
  createMany: (...args: unknown[]) => mockGuaranteeSignatureCreateMany(...args),
},
vendor: {
  // ... existing mocks
  update: (...args: unknown[]) => mockVendorUpdate(...args),
},
```

**IMPORTANT — Prisma migration sans DB locale :**
- Pas de `prisma migrate dev` (pas de PostgreSQL local)
- Créer la migration SQL manuellement dans `packages/shared/prisma/migrations/`
- Utiliser `DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" pnpm exec prisma generate` depuis `packages/shared/`

### Anti-Patterns à Éviter

1. **NE PAS** modifier l'enum `VendorStatus` — il contient déjà ACTIVE
2. **NE PAS** implémenter de signature graphique canvas — bouton d'acceptation suffit
3. **NE PAS** gérer le SLA 2h — l'activation est immédiate
4. **NE PAS** uploader des photos/documents — c'est Story 2.3
5. **NE PAS** utiliser `npx prisma` — toujours `pnpm exec prisma` (éviter Prisma 7.x global)
6. **NE PAS** créer de JSON schemas manuels — utiliser `zodToFastify(zodSchema)`
7. **NE PAS** oublier les tags Swagger et security sur les nouvelles routes
8. **NE PAS** oublier `@@map` sur les nouveaux modèles et champs Prisma

### Intelligence Story 2.1 — Learnings

**Patterns établis à suivre :**
- `buildApp()` pattern dans `server.ts` — les tests importent `buildApp()` et créent des instances
- `requireAuth` + `requireRole('SELLER', 'ADMIN')` — pattern établi pour toutes les routes vendeur
- Fastify JSON schema via `zodToFastify()` — source unique de vérité Zod
- Error handler retourne 422 pour validation Fastify, 422 pour safeParse service, 400+ pour AppError
- Tests utilisent `vi.stubEnv()` + `vi.mock()` pour Supabase et Prisma
- `mockTransaction.mockImplementation()` exécute le callback avec un tx mock
- `tx.vendor.findUniqueOrThrow()` pour retourner l'entité après création dans la transaction
- AppError pour toutes les erreurs métier
- Pino pour tous les logs structurés

**Pièges résolus dans Story 2.1 :**
- `pnpm exec prisma generate` doit être lancé depuis `packages/shared/`, pas la racine repo
- Zod `.refine()` n'est PAS converti par zodToFastify — la logique conditionnelle est enforced au niveau service via safeParse
- Index redondant sur colonne UNIQUE — le UNIQUE crée déjà un index implicite
- `turbo lint/build` ont besoin de `--filter=api --filter=web` pour inclure tous les packages
- Service validation errors doivent retourner 422 (pas 400) pour cohérence avec Story 1.5

### Structure Dossiers Cible (après Story 2.2)

```
apps/api/src/
├── server.ts                       # (INCHANGÉ)
├── modules/
│   ├── auth/                       # (INCHANGÉ)
│   ├── user/                       # (INCHANGÉ)
│   ├── consent/                    # (INCHANGÉ)
│   └── vendor/                     # (UPDATE)
│       ├── vendor.routes.ts        # UPDATE: + POST /me/signature, GET /me/guarantees
│       ├── vendor.routes.test.ts   # UPDATE: + tests signature
│       ├── vendor.service.ts       # UPDATE: + signGuarantees, getGuaranteeStatus
│       └── vendor.service.test.ts  # UPDATE: + tests signGuarantees

apps/web/app/(auth)/
├── onboarding/
│   └── new/
│       └── page.tsx                # (INCHANGÉ — Story 2.1)
├── vendors/
│   └── guarantees/
│       └── page.tsx                # (NEW) écran signature garanties

packages/shared/
├── validators/
│   ├── vendor.ts                   # (UPDATE) + signGuaranteesSchema
│   └── index.ts                    # (UPDATE) export nouveau schema
├── prisma/
│   ├── schema.prisma               # (UPDATE) + VendorGuaranteeSignature model
│   └── migrations/
│       └── YYYYMMDD_add_guarantee_signatures/
│           └── migration.sql       # (NEW) migration SQL
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Section "API Patterns"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Database Schemas"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Naming Conventions"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Onboarding Module"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4 Ibrahim: Signature garanties]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 8 Aya: Explication garanties + Signature tablette]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2 Story 2.2]
- [Source: _bmad-output/implementation-artifacts/2-1-onboarding-vendeur-kyc-agent-terrain.md — Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- No issues encountered — clean implementation

### Completion Notes List

- All 7 tasks completed: Prisma migration, Zod validator, service logic, API routes, PWA page, tests, regression
- 93 tests passing (12 files), 13 new tests for Story 2.2, lint clean, build clean
- Transaction pattern: createMany for 2 signatures + vendor.update to ACTIVE in single transaction
- Unique constraint (vendorId, guaranteeType) prevents duplicate signatures
- getGuaranteeStatus returns structured response with signed/unsigned status per guarantee
- PWA page loads guarantee status via GET, handles sign/refuse actions
- No body validation needed on POST /me/signature — guarantees are fixed (RETURN_48H + WARRANTY_30D)

### File List

- `packages/shared/prisma/schema.prisma` — Added GuaranteeType enum + VendorGuaranteeSignature model + Vendor relation
- `packages/shared/prisma/migrations/20260301_add_guarantee_signatures/migration.sql` — SQL migration for vendor_guarantee_signatures table
- `packages/shared/validators/vendor.ts` — Added guaranteeTypeSchema
- `packages/shared/validators/index.ts` — Export guaranteeTypeSchema
- `apps/api/src/modules/vendor/vendor.service.ts` — Added signGuarantees + getGuaranteeStatus functions
- `apps/api/src/modules/vendor/vendor.routes.ts` — Added POST /me/signature + GET /me/guarantees routes
- `apps/api/src/modules/vendor/vendor.service.test.ts` — Added 7 tests for signGuarantees + getGuaranteeStatus
- `apps/api/src/modules/vendor/vendor.routes.test.ts` — Added 6 tests for signature + guarantees routes
- `apps/web/app/(auth)/vendors/guarantees/page.tsx` — New PWA page for guarantee display + signature
