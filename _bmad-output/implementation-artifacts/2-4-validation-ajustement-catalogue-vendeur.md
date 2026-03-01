# Story 2.4: Validation et Ajustement Catalogue Vendeur

Status: done

## Story

As a vendeur,
I want valider, ajuster les prix et confirmer le stock de mes fiches catalogue générées par IA,
So that mon catalogue reflète exactement mon stock réel avec mes prix.

## Acceptance Criteria (BDD)

### AC1: Affichage et édition des fiches draft

**Given** un vendeur a des fiches catalogue en statut `DRAFT`
**When** il accède à son interface catalogue
**Then** chaque fiche affiche : photo, nom IA, catégorie IA, référence OEM suggérée, compatibilité, prix suggéré
**And** tous les champs sont éditables (nom, catégorie, oemReference, vehicleCompatibility, price)

### AC2: Publication d'une fiche — prix obligatoire

**Given** le vendeur modifie le prix d'une fiche draft
**When** il valide le changement
**Then** le prix est mis à jour
**And** la fiche passe de `DRAFT` à `PUBLISHED`
**And** la pièce est immédiatement visible dans les résultats de recherche
**And** la publication est refusée si aucun prix n'est défini (champ obligatoire pour publier)

### AC3: Gestion du stock — en stock / épuisée

**Given** le vendeur veut mettre à jour son stock
**When** il marque une pièce comme "épuisée" (toggle inStock)
**Then** le changement est reflété instantanément
**And** les pièces épuisées (`inStock: false`) n'apparaissent plus dans les résultats de recherche

### AC4: Détection bait-and-switch — alerte prix suspect

**Given** le vendeur modifie le prix d'une fiche publiée
**When** la variation dépasse 50% (hausse ou baisse) en moins d'1 heure
**Then** une alerte est loggée (`PRICE_ALERT_BAIT_SWITCH` event) pour revue admin
**And** la fiche reste publiée mais le changement est flaggé (`priceAlertFlag: true`)

## Tasks / Subtasks

- [x] **Task 1: Migration Prisma — champs inStock + priceUpdatedAt + priceAlertFlag** (AC: #2, #3, #4)
  - [x]1.1 Ajouter champ `inStock` Boolean @default(true) @map("in_stock") sur CatalogItem
  - [x]1.2 Ajouter champ `priceUpdatedAt` DateTime? @map("price_updated_at") sur CatalogItem
  - [x]1.3 Ajouter champ `priceAlertFlag` Boolean @default(false) @map("price_alert_flag") sur CatalogItem
  - [x]1.4 Migration SQL manuelle + prisma generate

- [x] **Task 2: Service catalog — updateItem, publishItem, toggleStock** (AC: #1, #2, #3, #4)
  - [x]2.1 `updateItem(userId, itemId, data)` — PATCH partiel : name, category, oemReference, vehicleCompatibility, price. Validation vendeur owner. Si price modifié : met à jour priceUpdatedAt + détection bait-and-switch (AC4)
  - [x]2.2 `publishItem(userId, itemId)` — Transition DRAFT → PUBLISHED. Refuse si price est null. Met status à PUBLISHED
  - [x]2.3 `toggleStock(userId, itemId)` — Toggle inStock true/false. Uniquement sur fiches PUBLISHED
  - [x]2.4 Détection bait-and-switch dans updateItem : si fiche PUBLISHED + prix existant + variation > 50% + priceUpdatedAt < 1h → logger event + flag

- [x] **Task 3: Routes API — PATCH /items/:id, POST /items/:id/publish, PATCH /items/:id/stock** (AC: #1, #2, #3)
  - [x]3.1 PATCH `/items/:id` — mise à jour partielle, retourne item mis à jour. Validation Zod body + params UUID
  - [x]3.2 POST `/items/:id/publish` — publication de fiche draft. Retourne 200 ou 422 (prix manquant)
  - [x]3.3 PATCH `/items/:id/stock` — toggle inStock. Body: `{ inStock: boolean }`
  - [x]3.4 Toutes routes avec preHandler: `[requireAuth, requireRole('SELLER', 'ADMIN')]`
  - [x]3.5 Params UUID validation via `catalogItemParamsSchema` (déjà existant)

- [x] **Task 4: Validators Zod — update + publish + stock schemas** (AC: #1, #2, #3)
  - [x]4.1 `updateCatalogItemSchema` — z.object partiel : name, category, oemReference, vehicleCompatibility, price (tous optionaux)
  - [x]4.2 `toggleStockSchema` — z.object: inStock boolean requis
  - [x]4.3 Export depuis validators/index.ts

- [x] **Task 5: Page PWA — édition fiche catalogue (détail + formulaire)** (AC: #1, #2, #3, #4)
  - [x]5.1 Page `/vendors/catalog/[id]/page.tsx` — détail fiche avec formulaire d'édition inline
  - [x]5.2 Affichage photo (imageMediumUrl), champs éditables pré-remplis avec données IA
  - [x]5.3 Bouton "Publier" (désactivé si prix vide, visible uniquement si DRAFT)
  - [x]5.4 Toggle stock "En stock / Épuisée" (visible uniquement si PUBLISHED)
  - [x]5.5 Badge prix suggéré IA si suggestedPrice existe et price est null
  - [x]5.6 Indicateur alerte prix si priceAlertFlag === true

- [x] **Task 6: Mise à jour page liste catalogue** (AC: #1, #3)
  - [x]6.1 Ajouter badge "Épuisée" sur les items avec inStock === false dans la liste
  - [x]6.2 Indicateur d'alerte prix sur les items flaggés

- [x] **Task 7: Tests unitaires + intégration** (AC: tous)
  - [x]7.1 catalog.service.test.ts — tests updateItem (success, vendor not found, item not found, partial update)
  - [x]7.2 catalog.service.test.ts — tests publishItem (success, no price → 422, already published)
  - [x]7.3 catalog.service.test.ts — tests toggleStock (success, not published → 422)
  - [x]7.4 catalog.service.test.ts — test bait-and-switch detection (>50% in <1h)
  - [x]7.5 catalog.routes.test.ts — tests routes PATCH, POST publish, PATCH stock (200/401/404/422)
  - [x]7.6 Tests régression existants : 119 tests doivent toujours passer

- [x] **Task 8: Tests de régression** (AC: tous)
  - [x]8.1 turbo test — tous les tests passent
  - [x]8.2 turbo lint — 0 erreurs
  - [x]8.3 turbo build — build réussi

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD et les epics pour les choix techniques.**

**Décisions clés pour cette Story :**

| Sujet | Décision | Raison |
|-------|----------|--------|
| Search Indexing | **PAS de Meilisearch** — pg_trgm Phase 2 | Architecture : Meilisearch quand > 50K refs ou 0-result > 15% |
| PATCH Semantics | Champs absents = non modifié | Convention REST Story 1.5 |
| Prix | Entiers FCFA (int) | Convention architecture — pas de float |
| Bait-and-switch | Log event + flag en base | Pas de blocage, revue admin async |
| Stock toggle | Champ `inStock` Boolean | Distinct du status DRAFT/PUBLISHED/ARCHIVED |
| Forms PWA | Pas de React Hook Form au MVP | Pages simples, state React suffit (pattern établi Stories 2.1-2.3) |

### IMPORTANT — Scope de cette Story

Cette story se concentre sur **l'édition et la publication côté vendeur**. Les fonctionnalités suivantes sont **HORS SCOPE** :

1. **Meilisearch sync** — Phase 2, les acheteurs ne recherchent pas encore (Epic 3)
2. **Recherche texte pg_trgm** — Story 3.2 (recherche référence OEM)
3. **Mode offline** — Story 3.6 (PWA offline-first)
4. **Dashboard vendeur complet** — Story 2.6
5. **Archivage (soft delete)** — Sera ajouté si besoin, hors scope MVP

### État Actuel du Code (ce qui existe depuis Story 2.3)

**CatalogItem model (Prisma) — champs existants :**
- id, vendorId, name, category, oemReference, vehicleCompatibility
- suggestedPrice (IA), price (vendeur), status (DRAFT/PUBLISHED/ARCHIVED)
- imageOriginalUrl, imageThumbUrl, imageSmallUrl, imageMediumUrl, imageLargeUrl
- aiConfidence, aiGenerated, qualityScore, qualityIssue
- createdAt, updatedAt

**Catalog module existant (`apps/api/src/modules/catalog/`) :**
- `catalog.service.ts` — uploadPartImage, getMyItems, getItem
- `catalog.routes.ts` — POST /items/upload, GET /items, GET /items/:id
- `catalog.routes.test.ts` — 9 tests routes (dont 422 UUID validation)
- `catalog.service.test.ts` — 10 tests service

**Validators existants (`packages/shared/validators/catalog.ts`) :**
- `catalogItemStatusSchema` — z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
- `catalogItemFilterSchema` — status?, page?, limit?
- `catalogItemParamsSchema` — z.object({ id: z.string().uuid() })

**PWA pages existantes :**
- `/vendors/catalog/page.tsx` — liste fiches avec filtres status, badge qualité, prix
- `/vendors/catalog/upload/page.tsx` — upload bulk avec progression

**Queue infrastructure existante :**
- queueService.ts, worker.ts, handlers/imageProcess.ts
- Job types: IMAGE_PROCESS_VARIANTS, CATALOG_AI_IDENTIFY

### Conventions de Code Obligatoires

**Ajout de routes au module catalog existant :**
```typescript
// Dans catalog.routes.ts, ajouter aux routes existantes :
fastify.patch('/items/:id', { ... }, async (request, reply) => { ... })
fastify.post('/items/:id/publish', { ... }, async (request, reply) => { ... })
fastify.patch('/items/:id/stock', { ... }, async (request, reply) => { ... })
```

**Service pattern — ajout dans catalog.service.ts :**
```typescript
export async function updateItem(userId: string, itemId: string, data: UpdateCatalogItemData) { ... }
export async function publishItem(userId: string, itemId: string) { ... }
export async function toggleStock(userId: string, itemId: string, inStock: boolean) { ... }
```

**PATCH body pattern :**
```typescript
const updateCatalogItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  oemReference: z.string().max(100).optional().nullable(),
  vehicleCompatibility: z.string().max(200).optional().nullable(),
  price: z.number().int().min(0).optional(),
})
```

**Bait-and-switch detection pattern :**
```typescript
// In updateItem service function:
if (item.status === 'PUBLISHED' && data.price !== undefined && item.price !== null) {
  const variation = Math.abs(data.price - item.price) / item.price
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (variation > 0.5 && item.priceUpdatedAt && item.priceUpdatedAt > hourAgo) {
    logger.warn({ event: 'PRICE_ALERT_BAIT_SWITCH', itemId, oldPrice: item.price, newPrice: data.price, variation })
    // Flag the item
    updateData.priceAlertFlag = true
  }
}
```

**Prisma migration sans DB locale :**
- Créer SQL manuellement dans `packages/shared/prisma/migrations/20260301_add_catalog_stock_price_fields/migration.sql`
- `DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" pnpm exec prisma generate` depuis `packages/shared/`

**Route params validation — réutiliser le schema existant :**
```typescript
import { catalogItemParamsSchema } from 'shared/validators'
// params: zodToFastify(catalogItemParamsSchema)  — déjà fait sur GET /items/:id
```

**PWA page pattern (détail fiche) — nouvelle page dynamique :**
```
apps/web/app/(auth)/vendors/catalog/[id]/page.tsx
```

### Anti-Patterns à Éviter

1. **NE PAS** implémenter Meilisearch — Phase 2, hors scope
2. **NE PAS** bloquer la publication si qualité photo basse — le vendeur décide
3. **NE PAS** utiliser React Hook Form — le pattern React state est établi dans les pages existantes
4. **NE PAS** créer de nouveaux fichiers service/routes — ajouter aux fichiers catalog existants
5. **NE PAS** oublier le `preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')]` sur les nouvelles routes
6. **NE PAS** permettre toggleStock sur une fiche DRAFT — uniquement PUBLISHED
7. **NE PAS** bloquer le prix en cas d'alerte bait-and-switch — juste logger + flag
8. **NE PAS** oublier params UUID validation sur les nouvelles routes
9. **NE PAS** utiliser `npx prisma` — toujours `pnpm exec prisma`
10. **NE PAS** oublier `@@map` sur les nouveaux champs Prisma

### Intelligence Story 2.3 — Learnings

**Patterns établis à suivre :**
- `catalog.service.ts` pattern : lookup vendor → validate ownership → perform action → return result
- `catalog.routes.ts` pattern : zodToFastify pour query/params schemas, manual cast pour body
- PWA pages : `useRef<SupabaseClient>` pour singleton, `getAccessToken()` callback, `fetch()` avec Bearer
- Tests routes : `buildApp()` + `app.inject()`, `mockAuthUser()` helper
- Tests service : `vi.mock('../../lib/prisma.js')` avec mocks granulaires par model
- `catalogItemParamsSchema` avec UUID validation retourne 422 pour IDs invalides
- `$transaction` wrapping pour opérations multi-step atomiques (fix code review 2.3)
- 119 tests existants — régression totale obligatoire

**Code review Story 2.3 — corrections appliquées :**
- M1: dequeue() wrappé dans `$transaction` pour éviter race condition
- S1: UUID validation sur params `:id` → 422 pour IDs invalides
- C1: GoogleGenerativeAI singleton module-level

### Env Variables

Aucune nouvelle variable d'environnement requise pour cette story.

### Structure Dossiers Cible (après Story 2.4)

```
apps/api/src/modules/catalog/
├── catalog.routes.ts       # UPDATE: + PATCH /items/:id, POST /items/:id/publish, PATCH /items/:id/stock
├── catalog.routes.test.ts  # UPDATE: + tests nouvelles routes
├── catalog.service.ts      # UPDATE: + updateItem, publishItem, toggleStock
└── catalog.service.test.ts # UPDATE: + tests nouvelles fonctions

packages/shared/
├── validators/
│   ├── catalog.ts          # UPDATE: + updateCatalogItemSchema, toggleStockSchema
│   └── index.ts            # UPDATE: + exports
├── prisma/
│   ├── schema.prisma       # UPDATE: + inStock, priceUpdatedAt, priceAlertFlag sur CatalogItem
│   └── migrations/
│       └── 20260301_add_catalog_stock_price_fields/
│           └── migration.sql  # NEW

apps/web/app/(auth)/vendors/
├── catalog/
│   ├── page.tsx            # UPDATE: + badge épuisée, indicateur alerte prix
│   ├── [id]/
│   │   └── page.tsx        # NEW: détail + formulaire édition + publier + toggle stock
│   └── upload/
│       └── page.tsx        # INCHANGÉ
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2 Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — PATCH semantics, REST conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md — Meilisearch Phase 2 decision]
- [Source: _bmad-output/planning-artifacts/architecture.md — pg_trgm search MVP]
- [Source: _bmad-output/planning-artifacts/architecture.md — Money type FCFA integers]
- [Source: _bmad-output/planning-artifacts/architecture.md — Mode Pause vendeur / stock toggle]
- [Source: _bmad-output/planning-artifacts/architecture.md — Validation timing layers]
- [Source: _bmad-output/implementation-artifacts/2-3-pipeline-images-generation-catalogue-ia.md — Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- No lint or build errors encountered during implementation

### Completion Notes List

- All 8 tasks completed: Prisma migration (3 new fields), service functions (updateItem, publishItem, toggleStock), 3 new API routes, Zod validators, PWA detail/edit page, catalog list badges, 17 new tests
- 136 tests passing (15 files), 17 new tests for Story 2.4 (9 catalog service, 8 catalog routes)
- Bait-and-switch detection: >50% price variation in <1h on published items → log + priceAlertFlag
- Publication guard: price is mandatory to publish (DRAFT → PUBLISHED)
- Stock toggle: inStock boolean, only on PUBLISHED items
- PWA detail page: full edit form with save, publish, toggle stock actions
- Catalog list updated with "Épuisée" badge and price alert indicator

### File List

- `packages/shared/prisma/schema.prisma` — Added inStock, priceUpdatedAt, priceAlertFlag fields to CatalogItem
- `packages/shared/prisma/migrations/20260301_add_catalog_stock_price_fields/migration.sql` — SQL migration for new columns
- `packages/shared/validators/catalog.ts` — Added updateCatalogItemSchema, toggleStockSchema
- `packages/shared/validators/index.ts` — Export new validators
- `apps/api/src/modules/catalog/catalog.service.ts` — Added updateItem, publishItem, toggleStock functions + bait-and-switch detection
- `apps/api/src/modules/catalog/catalog.service.test.ts` — Added 9 new tests (updateItem, publishItem, toggleStock, bait-and-switch)
- `apps/api/src/modules/catalog/catalog.routes.ts` — Added PATCH /items/:id, POST /items/:id/publish, PATCH /items/:id/stock
- `apps/api/src/modules/catalog/catalog.routes.test.ts` — Added 8 new tests for new routes
- `apps/web/app/(auth)/vendors/catalog/[id]/page.tsx` — NEW: Detail page with edit form, publish, toggle stock
- `apps/web/app/(auth)/vendors/catalog/page.tsx` — Updated: added Épuisée badge and price alert indicator
