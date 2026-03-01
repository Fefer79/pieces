# Story 2.5: Configuration Zones de Livraison Vendeur

Status: done

## Story

As a vendeur,
I want configurer les zones géographiques dans lesquelles j'accepte de livrer,
So that je ne reçoive que des commandes que je peux servir géographiquement.

## Acceptance Criteria (BDD)

### AC1: Sélection de communes de livraison

**Given** un vendeur actif accède à ses paramètres
**When** il configure ses zones de livraison
**Then** il peut sélectionner des communes/zones d'Abidjan (Yopougon, Cocody, Adjamé, Plateau, etc.)
**And** il peut choisir "Tout Abidjan" comme raccourci

### AC2: Filtrage résultats par zone vendeur

**Given** un acheteur recherche une pièce
**When** les résultats sont affichés
**Then** seuls les vendeurs couvrant la zone de livraison de l'acheteur apparaissent
**And** si un vendeur est proche (< 500m du garage), l'option "Retrait possible — 0 FCFA" est affichée

> Note: AC2 filtrage côté recherche sera implémenté dans Epic 3 (Recherche & Navigation). Story 2.5 se concentre sur le CRUD zones vendeur.

### AC3: Prise d'effet immédiate

**Given** un vendeur modifie ses zones
**When** il sauvegarde
**Then** le changement est effectif immédiatement pour les nouvelles recherches

## Tasks / Subtasks

- [x] **Task 1: Migration Prisma — champ deliveryZones sur Vendor** (AC: #1, #3)
  - [x] 1.1 Ajouter champ `deliveryZones String[] @default([]) @map("delivery_zones")` sur Vendor
  - [x] 1.2 Migration SQL manuelle + prisma generate

- [x] **Task 2: Constantes communes Abidjan** (AC: #1)
  - [x] 2.1 Créer `packages/shared/constants/communes.ts` avec la liste officielle des 13 communes d'Abidjan
  - [x] 2.2 Exporter depuis `packages/shared/constants/index.ts`

- [x] **Task 3: Validators Zod — deliveryZonesSchema** (AC: #1)
  - [x] 3.1 Créer `updateDeliveryZonesSchema` dans `packages/shared/validators/vendor.ts`
  - [x] 3.2 Valider que chaque zone est une commune valide
  - [x] 3.3 Exporter depuis index

- [x] **Task 4: Service vendeur — getDeliveryZones + updateDeliveryZones** (AC: #1, #3)
  - [x] 4.1 `getDeliveryZones(userId)` — retourne les zones configurées
  - [x] 4.2 `updateDeliveryZones(userId, zones[])` — met à jour les zones, "TOUT_ABIDJAN" raccourci = toutes les communes

- [x] **Task 5: Routes API — GET/PUT /vendors/me/delivery-zones** (AC: #1, #3)
  - [x] 5.1 GET retourne `{ zones: string[], allAbidjan: boolean }`
  - [x] 5.2 PUT accepte `{ zones: string[] }` et met à jour

- [x] **Task 6: Page PWA — /vendors/delivery-zones** (AC: #1)
  - [x] 6.1 Interface checkbox pour chaque commune + toggle "Tout Abidjan"
  - [x] 6.2 Sauvegarde avec feedback visuel
  - [x] 6.3 Lien depuis le profil vendeur

- [x] **Task 7: Tests unitaires service + routes** (AC: #1, #3)
  - [x] 7.1 Tests service: get zones, update zones, all abidjan shortcut, vendor not found
  - [x] 7.2 Tests routes: 200/401/404 sur GET et PUT

- [x] **Task 8: Régression complète** (AC: all)
  - [x] 8.1 `pnpm run lint` — 0 erreurs
  - [x] 8.2 `pnpm run test` — tous les tests passent
  - [x] 8.3 `pnpm -w run build` — build ok

## Dev Notes

- Modèle de données : `String[]` PostgreSQL array sur Vendor, pas de table séparée (communes = simples labels, pas d'entités)
- Les 13 communes d'Abidjan : Abobo, Adjamé, Anyama, Attécoubé, Bingerville, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Songon, Treichville, Yopougon
- "Tout Abidjan" = raccourci qui sélectionne les 13 communes
- Patterns existants : `requireAuth + requireRole('SELLER', 'ADMIN')`, `AppError`, `zodToFastify`
- Pas de PostGIS pour cette story — filtrage par commune (string matching), la proximité GPS viendra dans Epic 3

### Project Structure Notes

- `packages/shared/prisma/schema.prisma` — ajout champ sur Vendor
- `packages/shared/constants/communes.ts` — nouvelle constante partagée
- `packages/shared/validators/vendor.ts` — nouveau schema
- `apps/api/src/modules/vendor/vendor.service.ts` — 2 nouvelles fonctions
- `apps/api/src/modules/vendor/vendor.routes.ts` — 2 nouvelles routes
- `apps/web/app/(auth)/vendors/delivery-zones/page.tsx` — nouvelle page PWA

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic2-Story2.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#VendorModel]
- [Source: _bmad-output/planning-artifacts/prd.md#FR55]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 162 tests pass (148 API + 10 shared + 4 web)
- Lint clean, build clean
- Code review: PASS (1 LOW finding only)

### File List

- `packages/shared/prisma/schema.prisma` — added `deliveryZones` field on Vendor
- `packages/shared/prisma/migrations/20260301_add_vendor_delivery_zones/migration.sql`
- `packages/shared/constants/communes.ts` — 13 Abidjan communes constant
- `packages/shared/constants/index.ts` — updated exports
- `packages/shared/validators/vendor.ts` — added `updateDeliveryZonesSchema`
- `packages/shared/validators/index.ts` — updated exports
- `apps/api/src/modules/vendor/vendor.service.ts` — added `getDeliveryZones`, `updateDeliveryZones`
- `apps/api/src/modules/vendor/vendor.routes.ts` — added GET/PUT `/me/delivery-zones`
- `apps/api/src/modules/vendor/vendor.service.test.ts` — 5 new tests
- `apps/api/src/modules/vendor/vendor.routes.test.ts` — 7 new tests
- `apps/web/app/(auth)/vendors/delivery-zones/page.tsx` — PWA page
