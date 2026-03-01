# Story 1.4: Consentement ARTCI & Droits sur les Données Personnelles

Status: done

## Story

As a utilisateur,
I want donner mon consentement explicite au traitement de mes données personnelles lors de ma première utilisation, et pouvoir exercer mes droits d'accès, de rectification et de suppression,
So that mes données soient protégées conformément à la loi ivoirienne n°2013-450.

## Acceptance Criteria (BDD)

### AC1: Modal consentement ARTCI à la première connexion (PWA)

**Given** un utilisateur authentifié accède à la PWA pour la première fois (pas de consentement en DB)
**When** la page se charge
**Then** une modal bloquante de consentement ARTCI s'affiche
**And** la modal explique quelles données sont collectées (téléphone, localisation GPS, historique transactions, photos)
**And** l'utilisateur doit accepter explicitement avant de pouvoir utiliser la plateforme
**And** le consentement est horodaté et stocké en base (`consentedAt` timestamp)
**And** la modal n'apparaît plus aux connexions suivantes

### AC2: API consentement

**Given** un utilisateur authentifié qui n'a pas encore consenti
**When** il envoie `POST /api/v1/users/me/consent` avec `{ accepted: true }`
**Then** le consentement est enregistré en DB avec horodatage
**And** la réponse retourne `{ data: { consentedAt: "2026-03-01T..." } }`
**And** si `accepted: false` → 400 `CONSENT_MUST_ACCEPT`

### AC3: API accès aux données personnelles

**Given** un utilisateur authentifié
**When** il envoie `GET /api/v1/users/me/data`
**Then** la réponse retourne toutes ses données personnelles stockées : `{ data: { phone, roles, activeContext, consentedAt, createdAt } }`
**And** le format respecte la convention camelCase JSON

### AC4: API demande de suppression de données

**Given** un utilisateur authentifié
**When** il envoie `POST /api/v1/users/me/data/deletion-request`
**Then** une demande de suppression est créée avec statut `PENDING`
**And** la réponse retourne `{ data: { id, status: "PENDING", requestedAt } }`
**And** les données soumises à rétention légale (12 mois min) ne sont pas supprimées immédiatement
**And** l'action est loggée via Pino

### AC5: Page "Mes données" dans le profil

**Given** un utilisateur authentifié accède à la section "Mes données" depuis la page profil
**When** la page s'affiche
**Then** il peut voir toutes ses données personnelles stockées
**And** un bouton "Demander la suppression" est visible
**And** la date de consentement est affichée
**And** la page est mobile-first (360px), boutons 48px minimum

## Tasks / Subtasks

- [x] **Task 1: Migration Prisma — modèle Consent** (AC: #1, #2)
  - [x] 1.1 Ajouter champ `consentedAt DateTime? @map("consented_at")` au modèle `User` dans `schema.prisma`
  - [x] 1.2 Créer modèle `DataDeletionRequest` : `id`, `userId`, `status` (PENDING/APPROVED/REJECTED), `requestedAt`, `processedAt`
  - [x] 1.3 Générer et appliquer la migration Prisma : `npx prisma migrate dev --name add-consent-and-deletion-request`
  - [x] 1.4 Régénérer le client Prisma

- [x] **Task 2: Validators Zod partagés** (AC: #2, #4)
  - [x] 2.1 Créer `packages/shared/validators/consent.ts` — `consentSchema` (`{ accepted: boolean }`), `deletionRequestSchema`
  - [x] 2.2 Exporter depuis `packages/shared/validators/index.ts`

- [x] **Task 3: Routes et service API consentement** (AC: #2, #3, #4)
  - [x] 3.1 Créer `apps/api/src/modules/consent/consent.service.ts` — `recordConsent(userId)`, `getUserData(userId)`, `requestDeletion(userId)`
  - [x] 3.2 Créer `apps/api/src/modules/consent/consent.routes.ts` — `POST /me/consent`, `GET /me/data`, `POST /me/data/deletion-request`
  - [x] 3.3 Enregistrer dans `server.ts` : `fastify.register(consentRoutes, { prefix: '/api/v1/users' })`
  - [x] 3.4 Ajouter Fastify JSON schema validation sur toutes les routes
  - [x] 3.5 Protéger toutes les routes avec `preHandler: [requireAuth]`
  - [x] 3.6 Logger les actions critiques via `request.log.info({ event: 'CONSENT_RECORDED' | 'DATA_DELETION_REQUESTED', userId })`

- [x] **Task 4: Middleware consentement requis** (AC: #1)
  - [x] 4.1 Créer fonction `requireConsent` dans `plugins/auth.ts` — vérifie `request.user.consentedAt` non null, sinon 403 `CONSENT_REQUIRED`
  - [x] 4.2 Ajouter `consentedAt` au select dans `requireAuth` Prisma upsert
  - [x] 4.3 Mettre à jour le type `FastifyRequest.user` pour inclure `consentedAt: string | null`

- [x] **Task 5: Modal consentement PWA** (AC: #1)
  - [x] 5.1 Créer composant `apps/web/app/(auth)/consent-modal.tsx` — modal bloquante avec texte ARTCI
  - [x] 5.2 Intégrer dans `apps/web/app/(auth)/layout.tsx` — vérifie si l'utilisateur a consenti, sinon affiche la modal
  - [x] 5.3 Appeler `POST /api/v1/users/me/consent` au clic "J'accepte"
  - [x] 5.4 Mobile-first 360px, bouton 48px, palette bleu #1976D2

- [x] **Task 6: Page "Mes données" dans le profil** (AC: #5, #3)
  - [x] 6.1 Créer `apps/web/app/(auth)/profile/data/page.tsx` — affichage données personnelles
  - [x] 6.2 Appeler `GET /api/v1/users/me/data` via fetch avec Bearer token
  - [x] 6.3 Bouton "Demander la suppression" → `POST /api/v1/users/me/data/deletion-request`
  - [x] 6.4 Lien depuis la page profil existante vers `/profile/data`

- [x] **Task 7: Tests unitaires + intégration** (AC: tous)
  - [x] 7.1 Créer `apps/api/src/modules/consent/consent.service.test.ts` — tests: recordConsent, getUserData, requestDeletion, double consent idempotent
  - [x] 7.2 Créer `apps/api/src/modules/consent/consent.routes.test.ts` — tests intégration: POST consent → 200, GET data → 200, POST deletion → 200, consent déjà donné → idempotent 200
  - [x] 7.3 Créer `apps/web/app/(auth)/profile/data/page.test.tsx` — smoke test

- [x] **Task 8: Tests de régression** (AC: tous)
  - [x] 8.1 Vérifier `turbo test` — tous les tests passent (anciens + nouveaux) ✅ 70 tests
  - [x] 8.2 Vérifier `turbo lint` — aucune erreur ✅
  - [x] 8.3 Vérifier `turbo build` — build réussi ✅

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD et les epics pour les choix techniques.**

**Décisions clés pour cette Story :**

| Sujet | Décision | Raison |
|-------|----------|--------|
| Stockage consentement | Champ `consentedAt` sur le modèle `User` | Pas de table séparée nécessaire — un seul consentement ARTCI par utilisateur |
| Demandes suppression | Table `DataDeletionRequest` séparée | Audit trail, traitement asynchrone, rétention légale 12 mois |
| WhatsApp consent | **Hors scope** — Story 1.4 prépare le service réutilisable, Epic 6 l'utilise | Le bot WhatsApp n'existe pas encore |
| Data rectification | **Simplification** — La rectification se fait via la page profil existante (phone est readonly via Supabase Auth) | Pas de formulaire de rectification séparé nécessaire en Phase 1 |
| Middleware consentement | `requireConsent` preHandler optionnel | Les routes consent elles-mêmes ne nécessitent pas le consentement (sinon boucle) |

### Stack Technique Exacte pour cette Story

| Catégorie | Technologie | Version |
|-----------|------------|---------|
| Auth | Supabase Auth + Prisma User sync | via `requireAuth` (Story 1.2) |
| ORM | Prisma | ^6.9.0 |
| Validation | Zod | ^3.25.23 |
| Backend | Fastify | ^5.7.4 |
| Frontend | Next.js | 15.x |
| Testing | Vitest | ^3.2.1 |

### Modèle de Données — Changements Requis

**Ajout au modèle `User` existant :**
```prisma
model User {
  // ... champs existants (id, supabaseId, phone, roles, activeContext, createdAt, updatedAt)
  consentedAt           DateTime?  @map("consented_at")
  dataDeletionRequests  DataDeletionRequest[]
}
```

**Nouveau modèle `DataDeletionRequest` :**
```prisma
enum DeletionRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model DataDeletionRequest {
  id          String                 @id @default(uuid())
  userId      String                 @map("user_id")
  user        User                   @relation(fields: [userId], references: [id])
  status      DeletionRequestStatus  @default(PENDING)
  requestedAt DateTime               @default(now()) @map("requested_at")
  processedAt DateTime?              @map("processed_at")

  @@map("data_deletion_requests")
  @@index([userId], name: "idx_data_deletion_requests_user")
}
```

### Flow Consentement

```
1. User se connecte (Story 1.2) → requireAuth upserts Prisma User
2. User accède à n'importe quelle page protégée
3. Layout (auth) vérifie `consentedAt` :
   - Si null → affiche ConsentModal (bloquante)
   - Si non-null → affiche la page normalement
4. User clique "J'accepte" → POST /api/v1/users/me/consent { accepted: true }
5. API met à jour User.consentedAt = new Date()
6. Modal disparaît, user accède à la plateforme
```

### Texte ARTCI pour la Modal

```
Conformément à la loi n°2013-450 relative à la protection des données
à caractère personnel en Côte d'Ivoire, nous vous informons que
Pièces.ci collecte et traite les données suivantes :

• Votre numéro de téléphone (identification)
• Votre historique de transactions (suivi commandes)
• Vos photos de pièces (identification pièces)

Ces données sont utilisées uniquement pour le fonctionnement de la
plateforme et ne sont jamais vendues à des tiers.

Vous pouvez à tout moment :
• Consulter vos données (section "Mes données")
• Demander la suppression de vos données

En acceptant, vous consentez au traitement de vos données tel que
décrit ci-dessus.
```

### Conventions de Code Obligatoires

**API Routes (architecture) :**
- Routes : `POST /api/v1/users/me/consent`, `GET /api/v1/users/me/data`, `POST /api/v1/users/me/data/deletion-request`
- Body JSON camelCase : `{ accepted: true }`
- Réponse : `{ data: { consentedAt } }` (succès) ou `{ error: { code, message, statusCode } }` (erreur)
- Codes erreur : `CONSENT_MUST_ACCEPT`, `CONSENT_REQUIRED`, `USER_NOT_FOUND`

**TypeScript (architecture) :**
- Nouveau module : `apps/api/src/modules/consent/`
- Fichiers : `consent.routes.ts`, `consent.service.ts`, `consent.service.test.ts`, `consent.routes.test.ts`
- Tests co-localisés dans le même dossier
- Utiliser `AppError` pour toutes les erreurs
- Logger via Pino (jamais `console.log`)

**UX (ux-design-specification) :**
- Modal bloquante = Dialog component (shadcn pattern)
- Bouton "J'accepte" = primaire bleu #1976D2, 48px hauteur
- Pas de bouton "Refuser" — l'utilisateur ne peut pas utiliser la plateforme sans consentement
- Texte lisible, 14px minimum
- Mobile-first 360px

### Anti-Patterns à Éviter

1. **NE PAS** stocker le consentement dans le JWT ou localStorage → Prisma DB uniquement
2. **NE PAS** utiliser `console.log` → utiliser Pino
3. **NE PAS** utiliser `throw new Error()` → utiliser `AppError`
4. **NE PAS** créer de schemas Zod locaux dans les routes → `packages/shared/validators/`
5. **NE PAS** oublier Fastify JSON schema sur les routes → body validation obligatoire
6. **NE PAS** oublier `preHandler: [requireAuth]` sur les routes protégées
7. **NE PAS** rendre les routes consent dépendantes de `requireConsent` (boucle infinie)
8. **NE PAS** oublier `fp()` pour les plugins Fastify qui doivent être globaux
9. **NE PAS** supprimer immédiatement les données → respecter rétention 12 mois (commandes/litiges)
10. **NE PAS** créer Supabase client à chaque action → useRef lazy pattern (leçon Story 1.3)

### Intelligence Stories 1.2 + 1.3 — Learnings

**Patterns établis à suivre :**
- `buildApp()` pattern dans `server.ts` — les tests importent `buildApp()` et créent des instances
- `requireAuth` fait un Prisma upsert et attache `{ id, phone, roles, activeContext }` à `request.user` → **ajouter `consentedAt` au select**
- `requireRole(...roles)` vérifie `request.user.roles`
- Fastify JSON schema obligatoire sur le body des routes (`schema: { body: ... }`)
- Rate limit plugin wrappé avec `fp()` pour scope global
- Error handler passe les erreurs avec statusCode < 500
- Tests utilisent `vi.stubEnv()` + `vi.mock()` pour Supabase et Prisma
- Next.js rewrite proxy dans `next.config.ts` pour API calls → URLs relatives `/api/v1/...`
- useRef lazy pattern pour Supabase client côté web
- Phone masking avec espaces format ivoirien
- safe-area-inset-bottom pour bottom nav iOS/Android

**Pièges résolus dans les stories précédentes :**
- `start()` appelé pendant import tests → guard `NODE_ENV !== 'test'`
- Fastify 5 `decorateRequest('user', null)` → `undefined as unknown`
- `useSearchParams()` → wrapper Suspense
- `config.rateLimit` route-level ne marchait pas car plugin pas wrappé `fp()`
- `useState(() => createClient())` casse le build SSR → useRef lazy pattern
- Rôles dupliqués entre types et validators → importer depuis `shared/types/roles.ts`

### Structure Dossiers Cible (après Story 1.4)

```
apps/api/src/
├── server.ts                       # buildApp() — ajouter consentRoutes
├── plugins/
│   ├── auth.ts                     # (UPDATE) ajouter consentedAt au select + requireConsent
│   └── ...
└── modules/
    ├── auth/                       # (existant)
    ├── user/                       # (existant)
    └── consent/                    # (NEW)
        ├── consent.routes.ts       # POST /me/consent, GET /me/data, POST /me/data/deletion-request
        ├── consent.routes.test.ts
        ├── consent.service.ts      # recordConsent, getUserData, requestDeletion
        └── consent.service.test.ts

apps/web/
└── app/
    ├── (auth)/
    │   ├── layout.tsx              # (UPDATE) intégrer vérification consent + modal
    │   ├── consent-modal.tsx       # (NEW) modal bloquante ARTCI
    │   └── profile/
    │       ├── page.tsx            # (UPDATE) ajouter lien "Mes données"
    │       └── data/               # (NEW)
    │           ├── page.tsx        # Page "Mes données"
    │           └── page.test.tsx   # Smoke test

packages/shared/
├── prisma/
│   └── schema.prisma              # (UPDATE) ajouter consentedAt + DataDeletionRequest
└── validators/
    ├── index.ts                   # (UPDATE) ajouter exports consent
    └── consent.ts                 # (NEW) consentSchema, deletionRequestSchema
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Section "API Boundaries"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Error Handling"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Naming Conventions"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Security"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Audit & Conformité"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Section "Modal/Dialog Patterns"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Section "Mobile-First"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Section "Accessibility"]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.4]
- [Source: _bmad-output/implementation-artifacts/1-3-profil-multi-roles-contexte-actif.md — Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Migration created manually (no local DB) at `packages/shared/prisma/migrations/20260301_add_consent_and_deletion_request/`
- Prisma client regenerated with fake DATABASE_URL for generation only

### Completion Notes List

- All 8 tasks completed successfully
- 75 tests pass (61 API + 4 web + 10 shared)
- Lint and build clean
- Consent modal integrated in auth layout with useRef lazy Supabase pattern
- `requireConsent` middleware created but not yet applied to any routes (ready for future stories)
- Profile `/me` endpoint now returns `consentedAt` field
- Existing test mocks updated to include `consentedAt` field

### Senior Developer Review

**7 findings (1 HIGH, 3 MEDIUM, 3 LOW) — 5 fixed, 2 LOW accepted:**

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | HIGH | `recordConsent` crashes with P2025 if user deleted | Added `findUnique` check before update |
| 2 | MEDIUM | `requireConsent` has zero tests | Added 3 unit tests (pass/fail/no-user) |
| 3 | MEDIUM | `ROLE_LABELS` duplicated in 2 files | Extracted to `apps/web/lib/role-labels.ts` |
| 4 | MEDIUM | Unlimited deletion requests (spam) | Added `findFirst` check for existing PENDING |
| 5 | LOW | `deletionRequestSchema` defined but unused | Accepted — kept for future use |
| 6 | LOW | Data page shows phone unmasked | Accepted — transparent data access right |
| 7 | LOW | Consent modal missing ARIA attributes | Fixed — added `role="dialog"`, `aria-modal`, `aria-labelledby` |

### File List

- `packages/shared/prisma/schema.prisma` — UPDATED: added consentedAt, DataDeletionRequest, DeletionRequestStatus
- `packages/shared/prisma/migrations/20260301_add_consent_and_deletion_request/migration.sql` — NEW
- `packages/shared/validators/consent.ts` — NEW: consentSchema, deletionRequestSchema
- `packages/shared/validators/index.ts` — UPDATED: export consent validators
- `apps/api/src/plugins/auth.ts` — UPDATED: consentedAt in select/types, requireConsent
- `apps/api/src/plugins/auth.test.ts` — UPDATED: consentedAt in mocks/assertions + requireConsent tests
- `apps/api/src/modules/consent/consent.service.ts` — NEW (with user-existence check + duplicate prevention)
- `apps/api/src/modules/consent/consent.service.test.ts` — NEW: 9 tests
- `apps/api/src/modules/consent/consent.routes.ts` — NEW
- `apps/api/src/modules/consent/consent.routes.test.ts` — NEW: 5 tests
- `apps/api/src/modules/user/user.service.ts` — UPDATED: consentedAt in getProfile select
- `apps/api/src/modules/user/user.routes.test.ts` — UPDATED: consentedAt in mockAuthUser
- `apps/api/src/server.ts` — UPDATED: register consentRoutes
- `apps/web/app/(auth)/consent-modal.tsx` — NEW: blocking ARTCI consent modal (with ARIA)
- `apps/web/app/(auth)/layout.tsx` — UPDATED: consent check + modal integration
- `apps/web/app/(auth)/profile/page.tsx` — UPDATED: Link to "Mes données", shared ROLE_LABELS
- `apps/web/app/(auth)/profile/data/page.tsx` — NEW: personal data page, shared ROLE_LABELS
- `apps/web/app/(auth)/profile/data/page.test.tsx` — NEW: smoke test
- `apps/web/lib/role-labels.ts` — NEW: shared role label dictionary
