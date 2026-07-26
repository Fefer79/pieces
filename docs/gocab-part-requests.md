# GoCab — Demandes de pièces (PartRequest)

Ce document décrit le module ajouté dans Pièces pour répondre au besoin de Moulaye / GoCab : un workflow de demande de pièces rapide, transparent et traçable.

## Vue d’ensemble

Le module `PartRequest` permet au **mécanicien** de la flotte (ou à un owner / manager) de demander une pièce depuis l’atelier, et à un **manager** (ou owner) de valider, choisir une option de sourcing et convertir la demande en commande Pièces.

**Règle centrale — séparation des rôles :**

- La demande vient de l’atelier : le `MECHANIC` diagnostique la panne et saisit la demande. `OWNER` et `MANAGER` peuvent également en créer une (petite flotte, urgence, saisie à la place de l’atelier).
- Le chauffeur ne demande pas de pièce : il signale le problème au mécanicien (hors application, ou via l’espace chauffeur pour les relevés / incidents). Aucune route ni écran chauffeur ne crée de demande. Un `ACCOUNTANT` non plus : lecture seule.
- Toute demande passe par le chemin d’approbation : `SUBMITTED` → `APPROVED`/`REJECTED` par un `OWNER` ou `MANAGER`, puis conversion en commande. Un mécanicien ne peut jamais approuver sa propre demande ni convertir en commande.

### Flow

1. **Mécanicien** (ou owner / manager) : ouvre `/enterprise/requests/new`, sélectionne le véhicule de la flotte, décrit la pièce (nom, catégorie, référence OEM, diagnostic), choisit l’urgence et la source préférée.
2. **Soumission** : l’envoi crée la demande en `DRAFT` puis la passe immédiatement en `SUBMITTED`. Le manager la voit dans sa file (notification via l’interface ; WhatsApp/SMS peut être branché plus tard).
3. **Manager** : dans `/enterprise/requests`, il voit la file d’attente. Au clic, il accède au détail (`/enterprise/requests/[id]`) avec photos, véhicule, description, historique.
4. **Approbation** : le manager approuve ou refuse. S’il approuve, il choisit une option de sourcing :
   - **Local** : 24–48 h, prix catalogue, livraison STANDARD.
   - **Avion** : 3–5 jours, prix majoré, livraison EXPRESS.
   - **Cargo** : 45 jours, prix catalogue, commande groupée, livraison STANDARD.
5. **Conversion** : le manager renseigne le `catalogItemId` de la pièce choisie et clique sur « Convertir en commande ». La demande passe en `CONVERTED` et est liée à l’`Order` créée.
6. **Traçabilité** : chaque changement de statut est enregistré dans `PartRequestEvent` avec l’acteur, l’horodatage et une note.

## Modèles de données

### `PartRequest`

| Champ | Description |
|-------|-------------|
| `enterpriseId` | Flotte concernée |
| `vehicleId` | Véhicule concerné |
| `driverId` | Chauffeur concerné par le véhicule (optionnel, informatif — il n’est pas l’auteur) |
| `createdByUserId` | Auteur de la demande (mécanicien, owner ou manager) |
| `status` | `DRAFT`, `SUBMITTED`, `REVIEWING`, `APPROVED`, `REJECTED`, `CONVERTED`, `CANCELLED` |
| `partName` | Nom de la pièce demandée |
| `category` | Catégorie (optionnel) |
| `oemReference` | Référence OEM (optionnel) |
| `description` | Description / symptôme |
| `urgency` | `LOW`, `NORMAL`, `HIGH`, `CRITICAL` |
| `preferredSource` | `LOCAL`, `AIR`, `CARGO`, `ANY` |
| `maxBudget` | Budget maximum (optionnel) |
| `approvedByUserId` | Manager ayant approuvé |
| `orderId` | Commande liée après conversion |

### `PartRequestPhoto`

Photos associées à la demande. Stocke l’URL originale et une miniature (`thumbUrl`).

### `PartRequestEvent`

Journal d’audit : `fromStatus`, `toStatus`, `actorUserId`, `note`, `createdAt`.

## Routes API

Toutes les routes sont scopées sous `/api/v1/enterprises/:enterpriseId/part-requests` :

- `GET /:enterpriseId/part-requests` — liste (filtres : `status`, `urgency`, `vehicleId`)
- `POST /:enterpriseId/part-requests` — créer une demande
- `GET /:enterpriseId/part-requests/:id` — détail
- `PATCH /:enterpriseId/part-requests/:id` — modifier une demande en `DRAFT`
- `POST /:enterpriseId/part-requests/:id/submit` — soumettre
- `POST /:enterpriseId/part-requests/:id/approve` — approuver
- `POST /:enterpriseId/part-requests/:id/reject` — refuser
- `POST /:enterpriseId/part-requests/:id/cancel` — annuler
- `POST /:enterpriseId/part-requests/:id/convert-to-order` — convertir en commande
- `POST /:enterpriseId/part-requests/:id/photos` — ajouter une photo

Rôle minimum par route :

| Route | Rôles autorisés |
|-------|-----------------|
| `GET` (liste, détail) | tout membre de l’entreprise (`OWNER`, `MANAGER`, `MECHANIC`, `ACCOUNTANT`) |
| `POST` (créer), `PATCH`, `submit`, `photos`, `cancel` | `MECHANIC`, `OWNER`, `MANAGER` |
| `approve`, `reject`, `convert-to-order` | `OWNER`, `MANAGER` |

Il n’existe **aucune route chauffeur** de demande de pièce : l’espace `/driver` reste dédié aux relevés quotidiens.

## Pages web

| Page | Rôle | Description |
|------|------|-------------|
| `/enterprise/requests/new` | Mécanicien, Owner, Manager | Formulaire de demande de pièce (création + soumission) |
| `/enterprise/requests` | Tout membre | File d’attente des demandes de la flotte |
| `/enterprise/requests/[requestId]` | Manager | Détail, approbation / refus, sourcing, conversion |

## Anti-fraude

- Chaque demande est liée à un véhicule et à un utilisateur.
- Les photos sont immuables et horodatées.
- Les transitions de statut sont loguées (`PartRequestEvent`).
- Aucune dépense sans approbation : la conversion en commande exige le passage par `APPROVED`, réservé à `OWNER` / `MANAGER`.
- Un mécanicien ne peut pas approuver sa propre demande. Un owner/manager qui saisit lui-même une demande peut en revanche l’approuver : c’est assumé (il est déjà le porteur du budget), et la double signature reste visible via `createdByUserId` / `approvedByUserId`.
- Un chauffeur ne peut pas déclencher de dépense : il n’a aucun accès en écriture au module.

## Limites et évolutions possibles

- **IA / VIN** : le MVP ne décode pas le VIN ni ne reconnaît la pièce par photo. Ces fonctionnalités peuvent être branchées via le module `enrichment` existant.
- **Notifications** : pas d’envoi WhatsApp/SMS automatique dans le MVP ; l’emplacement est prêt (alerte manager à la soumission, retour mécanicien à l’approbation/refus).
- **Sourcing cargo** : le mode `CARGO` est mappé sur `STANDARD` côté commande (pas de mode dédié dans la grille de livraison actuelle). À terminer si un mode `CARGO` est ajouté à `DeliveryMode`.
- **Pièces hors catalogue** : la conversion exige un `catalogItemId` existant. Pour du sourcing concierge, il faudra créer un `CatalogItem` placeholder `isExternal`.

## Tests

Test unitaire du service : `apps/api/src/modules/enterprise/partRequest.service.test.ts`.

Commande :

```bash
pnpm -F api vitest run src/modules/enterprise/partRequest.service.test.ts
```

## Références

- `packages/shared/prisma/schema.prisma` — modèles `PartRequest`, `PartRequestPhoto`, `PartRequestEvent`
- `apps/api/src/modules/enterprise/partRequest.service.ts` — logique métier
- `apps/api/src/modules/enterprise/enterprise.routes.ts` — routes API
- `apps/web/app/enterprise/requests/new/page.tsx` — formulaire mécanicien
- `apps/web/app/enterprise/requests/page.tsx` — file d’attente
- `apps/web/app/enterprise/requests/[requestId]/page.tsx` — détail + sourcing
