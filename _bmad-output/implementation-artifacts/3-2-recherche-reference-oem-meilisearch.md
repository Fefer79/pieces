# Story 3.2: Recherche par Référence OEM & Meilisearch

Status: done

## Story

As a mécanicien avancé,
I want rechercher une pièce par son numéro de référence OEM,
So that je puisse trouver exactement la pièce que je connais en quelques secondes.

## Acceptance Criteria (BDD)

### AC1: Recherche OEM et texte libre

**Given** l'utilisateur saisit une référence OEM ou du texte libre
**When** il tape au moins 2 caractères
**Then** la recherche retourne les résultats via PostgreSQL pg_trgm + unaccent + synonymes
**And** les résultats affichent : photo, nom, référence OEM, compatibilité, prix, vendeur

> Implémenté dans Story 3.1 via GET /browse/search

### AC2: Résultats triés et scrollables

**Given** la recherche retourne des résultats
**When** ils sont affichés
**Then** les résultats sont paginés (20 par page)
**And** chaque carte affiche le prix en gros caractères

> Implémenté dans Story 3.1

### AC3: Fallback PostgreSQL (MeiliSearch Phase 2)

**Given** le MVP utilise PostgreSQL pg_trgm
**When** le catalogue dépasse 50K références
**Then** MeiliSearch sera ajouté avec circuit breaker (fallback PostgreSQL)

> Note: MeiliSearch prévu Phase 2. L'infrastructure PostgreSQL est en place.

### AC4: Zéro Impasse — alternatives quand aucun résultat

**Given** la recherche ne retourne aucun résultat
**When** les résultats sont vides
**Then** des alternatives sont proposées : "Naviguez par marque" et "Essayez par photo" (Story 3.5)

> Implémenté dans browse/page.tsx

## Tasks / Subtasks

- [x] **Task 1: Search infrastructure** — Implémenté dans Story 3.1
- [x] **Task 2: OEM reference search** — Inclus dans le champ OR du service searchParts
- [x] **Task 3: Empty state alternatives** — PWA browse page affiche les alternatives
- [x] **Task 4: Synonym correction** — 30 entrées initiales dans search_synonyms

## Dev Notes

- Recherche OEM intégrée dans le service `searchParts` de Story 3.1
- Le champ `oemReference` est inclus dans la clause OR de recherche
- MeiliSearch circuit breaker sera ajouté quand le seuil de 50K refs est atteint

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic3-Story3.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#PM-02]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Fonctionnalité déjà couverte par Story 3.1 (browse/search service + PWA)
- 185 tests passent

### File List

- Same as Story 3.1 (browse module, search service)
