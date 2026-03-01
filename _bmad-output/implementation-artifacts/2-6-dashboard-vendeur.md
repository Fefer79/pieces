# Story 2.6: Dashboard Vendeur

Status: ready-for-dev

## Story

As a vendeur,
I want consulter un tableau de bord avec mes ventes, paiements et catalogue,
So que j'aie une visibilité complète sur mon activité commerciale sur Pièces.

## Acceptance Criteria (BDD)

### AC1: Résumé statistiques catalogue

**Given** un vendeur actif accède à son dashboard
**When** la page se charge
**Then** il voit un résumé : nombre de pièces publiées, en draft, épuisées

> Note: Les stats commandes/paiements (chiffre d'affaires, escrow) seront ajoutées dans Epic 4 quand les commandes existeront.

### AC2: Navigation rapide catalogue

**Given** le vendeur consulte son dashboard
**When** il accède à la section catalogue
**Then** il voit le nombre total de pièces publiées, en draft, et épuisées
**And** il peut accéder directement à la gestion de chaque fiche

### AC3: Liens utiles vendeur

**Given** le vendeur consulte son dashboard
**When** il accède à la page
**Then** il voit des liens vers : catalogue, zones de livraison, garanties

## Tasks / Subtasks

- [ ] **Task 1: API — endpoint stats vendeur** (AC: #1, #2)
  - [ ] 1.1 Service `getVendorDashboard(userId)` — retourne stats catalogue (published, draft, outOfStock counts)
  - [ ] 1.2 Route `GET /vendors/me/dashboard`

- [ ] **Task 2: Page PWA — /vendors/dashboard** (AC: #1, #2, #3)
  - [ ] 2.1 Affichage stats catalogue en cartes résumé
  - [ ] 2.2 Liens rapides vers catalogue, zones livraison, garanties
  - [ ] 2.3 Section "Commandes" en placeholder (à venir Epic 4)

- [ ] **Task 3: Tests unitaires** (AC: #1)
  - [ ] 3.1 Tests service: stats correctes, vendor not found
  - [ ] 3.2 Tests routes: 200/401/404

- [ ] **Task 4: Régression complète** (AC: all)
  - [ ] 4.1 lint + test + build

## Dev Notes

- Stats calculées via `prisma.catalogItem.count` avec filtres
- Pas de modèle Order/Payment encore — Epic 4
- Pattern existant: `requireAuth + requireRole('SELLER', 'ADMIN')`

### Project Structure Notes

- `apps/api/src/modules/vendor/vendor.service.ts` — nouvelle fonction
- `apps/api/src/modules/vendor/vendor.routes.ts` — nouvelle route
- `apps/web/app/(auth)/vendors/dashboard/page.tsx` — nouvelle page

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic2-Story2.6]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

### File List
