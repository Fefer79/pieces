# Story 3.1: Navigation Catalogue Visuelle

Status: ready-for-dev

## Story

As a mécanicien ou propriétaire,
I want naviguer dans le catalogue par marque → modèle → année → catégorie depuis la PWA,
So that je puisse trouver une pièce visuellement sans saisir de texte.

## Acceptance Criteria (BDD)

### AC1: Grille de marques

**Given** l'utilisateur accède à l'écran catalogue public
**When** la page se charge
**Then** une grille de marques auto populaires en CI est affichée (Toyota, Peugeot, Renault, Hyundai, Kia, etc.)

### AC2: Navigation drill-down

**Given** l'utilisateur sélectionne une marque
**When** il tape sur le logo
**Then** les modèles de cette marque sont affichés
**And** en sélectionnant un modèle, les années disponibles sont affichées
**And** en sélectionnant une année, les catégories de pièces sont affichées
**And** les pièces disponibles dans cette catégorie sont listées avec photo, prix et vendeur

### AC3: API publique catalogue

**Given** un client (PWA ou bot)
**When** il appelle les endpoints de navigation
**Then** GET /browse/brands, /browse/brands/:brand/models, etc. retournent les données de référence
**And** GET /browse/parts retourne les pièces filtrées par marque/modèle/année/catégorie

### AC4: Recherche texte basique (pg_trgm)

**Given** l'utilisateur saisit du texte dans la barre de recherche
**When** il tape au moins 3 caractères
**Then** PostgreSQL pg_trgm + unaccent retourne les résultats pertinents
**And** une table search_synonyms corrige les fautes courantes ("uile"→"huile", "frain"→"frein")

> Note: MeiliSearch sera ajouté en Phase 2 (> 50K refs). MVP utilise PostgreSQL pg_trgm.

## Tasks / Subtasks

- [ ] **Task 1: Données de référence véhicules** (AC: #1, #2)
  - [ ] 1.1 Créer `packages/shared/constants/vehicles.ts` — marques + modèles + années populaires CI
  - [ ] 1.2 Créer `packages/shared/constants/categories.ts` — catégories de pièces auto

- [ ] **Task 2: Migration Prisma — table search_synonyms** (AC: #4)
  - [ ] 2.1 Model SearchSynonym (typo → correction)
  - [ ] 2.2 Migration SQL + seed données initiales (~30 entrées)

- [ ] **Task 3: API browse — endpoints publics navigation** (AC: #1, #2, #3)
  - [ ] 3.1 Module `browse` : routes + service
  - [ ] 3.2 GET /browse/brands — liste des marques
  - [ ] 3.3 GET /browse/brands/:brand/models — modèles d'une marque
  - [ ] 3.4 GET /browse/parts?brand=&model=&year=&category= — pièces filtrées (publiées, en stock, zone vendeur)

- [ ] **Task 4: API search — recherche texte pg_trgm** (AC: #4)
  - [ ] 4.1 Service `searchParts(query, filters)` — pg_trgm + unaccent + synonymes
  - [ ] 4.2 Route GET /catalog/search?q=&brand=&category=
  - [ ] 4.3 Résultats incluent : photo, nom, prix, vendeur (shopName), catégorie, compatibilité

- [ ] **Task 5: Pages PWA navigation** (AC: #1, #2)
  - [ ] 5.1 `/browse` — grille marques + barre de recherche
  - [ ] 5.2 `/browse/[brand]` — modèles de la marque
  - [ ] 5.3 `/browse/[brand]/[model]` — années
  - [ ] 5.4 `/browse/[brand]/[model]/[year]` — catégories + pièces

- [ ] **Task 6: Tests** (AC: all)
  - [ ] 6.1 Tests service browse + search
  - [ ] 6.2 Tests routes browse + search

- [ ] **Task 7: Régression** (AC: all)
  - [ ] 7.1 lint + test + build

## Dev Notes

- Architecture: PostgreSQL pg_trgm MVP, pas MeiliSearch (Phase 2 si > 50K refs)
- Données véhicules : fichier statique (pas de table DB) — suffisant pour MVP avec ~20 marques
- Endpoints browse sont PUBLICS (pas de requireAuth) — le catalogue est visible sans connexion
- Filtrage par zone vendeur : les résultats ne montrent que les vendeurs dont `deliveryZones` inclut la commune de l'acheteur (optionnel pour MVP, filtrage côté service)
- pg_trgm nécessite l'extension PostgreSQL `pg_trgm` — activation via migration
- Pièces visibles : status=PUBLISHED, inStock=true, vendor.status=ACTIVE

### Project Structure Notes

- `packages/shared/constants/vehicles.ts` — données de référence véhicules
- `packages/shared/constants/categories.ts` — catégories pièces
- `packages/shared/prisma/schema.prisma` — SearchSynonym model
- `apps/api/src/modules/browse/` — nouveau module
- `apps/api/src/modules/catalog/catalog.search.ts` — service recherche
- `apps/web/app/(auth)/browse/` — pages PWA navigation

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic3-Story3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#PM-02-PhoneticSearch]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

### File List
