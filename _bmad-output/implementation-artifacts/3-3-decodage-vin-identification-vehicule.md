# Story 3.3: Décodage VIN & Identification Véhicule

Status: ready-for-dev

## Story

As a mécanicien,
I want saisir un VIN pour identifier précisément le véhicule,
So that les résultats de recherche soient filtrés par compatibilité exacte.

## Acceptance Criteria (BDD)

### AC1: Décodage VIN via API NHTSA

**Given** l'utilisateur saisit un VIN de 17 caractères
**When** il soumet le VIN
**Then** le service NHTSA VPIC est appelé
**And** le véhicule est identifié : marque, modèle, année

### AC2: Fallback VIN non reconnu

**Given** le VIN n'est pas reconnu
**When** le décodage échoue
**Then** un message explicite est affiché
**And** un fallback vers navigation manuelle est proposé

## Tasks / Subtasks

- [ ] Task 1: VIN validator + service (NHTSA VPIC API call)
- [ ] Task 2: Route POST /browse/vin-decode
- [ ] Task 3: PWA VIN input page /browse/vin
- [ ] Task 4: Tests
- [ ] Task 5: Régression

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6
