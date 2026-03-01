# Manuel d'utilisation — Administrateur Pièces

**Version :** 1.0
**Date :** 2026-03-01
**Plateforme :** Pièces — Marketplace pièces auto d'occasion (Côte d'Ivoire)

---

## Table des matières

1. [Accès et connexion](#1-accès-et-connexion)
2. [Tableau de bord administrateur](#2-tableau-de-bord-administrateur)
3. [Gestion des utilisateurs](#3-gestion-des-utilisateurs)
4. [Gestion des vendeurs](#4-gestion-des-vendeurs)
5. [Gestion des commandes](#5-gestion-des-commandes)
6. [Gestion des livraisons](#6-gestion-des-livraisons)
7. [Gestion des litiges](#7-gestion-des-litiges)
8. [Notifications](#8-notifications)
9. [Cycle de vie d'une commande](#9-cycle-de-vie-dune-commande)
10. [Système de paiement et séquestre](#10-système-de-paiement-et-séquestre)
11. [Référence API rapide](#11-référence-api-rapide)
12. [FAQ et dépannage](#12-faq-et-dépannage)

---

## 1. Accès et connexion

### Prérequis

- Disposer d'un compte Pièces avec le **rôle ADMIN** attribué
- Un numéro de téléphone ivoirien (+225) enregistré dans le système

### Se connecter

1. Ouvrir l'application Pièces sur votre navigateur mobile ou desktop
2. Sur la page de connexion, saisir votre numéro de téléphone au format `+225 XX XX XX XX XX`
   - Préfixes acceptés : `01` (MTN), `05` (Moov), `07` (Orange)
3. Cliquer sur **Envoyer le code**
4. Saisir le **code OTP à 6 chiffres** reçu par SMS
5. Le système vérifie automatiquement le code et vous connecte

### Consentement aux données personnelles

Lors de votre première connexion, un modal de consentement s'affiche :

- **Données collectées :** numéro de téléphone, historique des transactions, photos de pièces
- **Droits :** consultation de vos données, demande de suppression
- **Base légale :** Loi ivoirienne n°2013-450 relative à la protection des données à caractère personnel

Vous devez accepter les conditions pour accéder à la plateforme.

### Navigation

La barre de navigation en bas de l'écran propose 3 onglets :
- **Accueil** — Page d'accueil
- **Commandes** — Historique des commandes
- **Profil** — Votre profil et paramètres

Pour accéder au **tableau de bord admin**, naviguez vers `/admin` dans la barre d'adresse.

---

## 2. Tableau de bord administrateur

**URL :** `/admin`

Le tableau de bord affiche **6 indicateurs clés** en temps réel :

| Indicateur | Description | Couleur |
|------------|-------------|---------|
| **Utilisateurs** | Nombre total d'utilisateurs inscrits | Bleu |
| **Vendeurs** | Nombre total de profils vendeur créés | Vert |
| **Commandes** | Nombre total de commandes créées | Orange |
| **Commandes actives** | Commandes ni terminées ni annulées | Rouge |
| **Litiges** | Nombre total de litiges ouverts | Violet |
| **Litiges ouverts** | Litiges en attente de résolution | Rouge foncé |

### Actions rapides

Trois boutons d'accès rapide sont disponibles :

- **Gérer les utilisateurs** → Liste paginée de tous les utilisateurs
- **Voir les commandes** → Liste paginée de toutes les commandes
- **Voir les vendeurs** → Liste paginée de tous les vendeurs

### Accès restreint

Si vous n'avez pas le rôle ADMIN, le message **"Accès réservé aux administrateurs"** s'affiche à la place du tableau de bord.

---

## 3. Gestion des utilisateurs

### Consulter la liste des utilisateurs

**API :** `GET /api/v1/admin/users?page=1&limit=50`

La liste affiche pour chaque utilisateur :
- **Téléphone** — Numéro +225
- **Rôles** — Liste des rôles attribués (MECHANIC, OWNER, SELLER, RIDER, ADMIN, ENTERPRISE)
- **Contexte actif** — Le rôle actuellement actif
- **Date d'inscription** — Date de création du compte

La liste est paginée par défaut (50 utilisateurs par page).

### Modifier les rôles d'un utilisateur

**API :** `PATCH /api/v1/users/:userId/roles`

**Corps de la requête :**
```json
{
  "roles": ["MECHANIC", "SELLER"]
}
```

**Rôles disponibles :**

| Rôle | Description |
|------|-------------|
| `MECHANIC` | Mécanicien — peut créer des commandes pour le compte de propriétaires |
| `OWNER` | Propriétaire de véhicule — peut payer des commandes |
| `SELLER` | Vendeur de pièces — gère un catalogue et reçoit des commandes |
| `RIDER` | Livreur — effectue les livraisons |
| `ADMIN` | Administrateur — accès complet à la plateforme |
| `ENTERPRISE` | Entreprise — gestion de flotte de mécaniciens |

**Règles :**
- Un utilisateur doit avoir **au moins 1 rôle**
- Si le contexte actif actuel est retiré des rôles, le système bascule automatiquement sur le premier rôle de la nouvelle liste
- L'attribution du rôle ADMIN donne un accès complet — **à utiliser avec précaution**
- L'opération est journalisée (`ADMIN_UPDATE_ROLES` dans les logs)

---

## 4. Gestion des vendeurs

### Consulter la liste des vendeurs

**API :** `GET /api/v1/admin/vendors?page=1&limit=50`

Chaque vendeur affiche :
- **Nom de la boutique**
- **Nom du contact**
- **Téléphone**
- **Type** — FORMAL (entreprise déclarée) ou INFORMAL (vendeur individuel)
- **Statut** — PENDING_ACTIVATION, ACTIVE, ou PAUSED
- **Type KYC** — RCCM (registre commerce) ou CNI (carte nationale d'identité)

### Statuts vendeur

| Statut | Signification |
|--------|---------------|
| `PENDING_ACTIVATION` | Profil créé, en attente de signature des garanties |
| `ACTIVE` | Profil actif, peut publier et recevoir des commandes |
| `PAUSED` | Profil suspendu temporairement |

### Processus d'onboarding vendeur

1. **Création du profil** — Le vendeur (ou un agent terrain) soumet ses informations et son document KYC
   - Vendeur **FORMEL** → Document RCCM obligatoire
   - Vendeur **INFORMEL** → CNI obligatoire
2. **Signature des garanties** — Le vendeur signe deux garanties obligatoires :
   - **RETURN_48H** — Reprise sous 48h si pièce incorrecte, remboursement intégral
   - **WARRANTY_30D** — Garantie fonctionnement minimum 30 jours
3. **Activation automatique** — Une fois les deux garanties signées, le statut passe à `ACTIVE`

### Interventions admin sur les vendeurs

En tant qu'admin, vous pouvez :
- **Consulter tous les profils vendeurs** et leurs documents KYC
- **Créer un profil vendeur** pour le compte d'un utilisateur (via l'API avec le rôle ADMIN)
- **Gérer les zones de livraison** d'un vendeur

> **Note :** L'activation se fait automatiquement par signature des garanties. Il n'existe pas actuellement de bouton d'activation/désactivation manuelle dans l'interface admin.

---

## 5. Gestion des commandes

### Consulter les commandes

**API :** `GET /api/v1/admin/orders?page=1&limit=50&status=PAID`

La liste affiche :
- **ID de commande** (UUID tronqué)
- **Statut actuel** (avec badge de couleur)
- **Montant total** (en FCFA)
- **Articles commandés** (nom, quantité, prix)
- **Méthode de paiement**
- **Dates clés** (création, paiement, confirmation vendeur, annulation)

### Filtrage par statut

Vous pouvez filtrer les commandes par statut en ajoutant le paramètre `?status=` :

| Statut | Description |
|--------|-------------|
| `DRAFT` | Brouillon — commande créée, pas encore payée |
| `PENDING_PAYMENT` | En attente de paiement mobile money |
| `PAID` | Payée — en attente de confirmation vendeur |
| `VENDOR_CONFIRMED` | Confirmée par le vendeur |
| `DISPATCHED` | Expédiée — livreur assigné |
| `IN_TRANSIT` | En cours de livraison |
| `DELIVERED` | Livrée — en attente de confirmation acheteur |
| `CONFIRMED` | Réception confirmée par l'acheteur |
| `COMPLETED` | Terminée — fonds libérés au vendeur |
| `CANCELLED` | Annulée |

### Points d'attention

- **Commandes PAID sans confirmation vendeur** → Si plus de 45 minutes, contacter le vendeur ou annuler
- **Commandes DELIVERED sans confirmation** → Auto-complétées après 48h (libération fonds)
- **Limite COD :** Le paiement à la livraison est limité à **75 000 FCFA** maximum

---

## 6. Gestion des livraisons

### Créer une livraison

**API :** `POST /api/v1/deliveries`

Lorsqu'une commande est confirmée par le vendeur (`VENDOR_CONFIRMED`), l'admin crée une livraison :

```json
{
  "orderId": "uuid-de-la-commande",
  "pickupAddress": "Adresse du vendeur, Cocody",
  "pickupLat": 5.3364,
  "pickupLng": -3.9628,
  "deliveryAddress": "Adresse du client, Yopougon",
  "deliveryLat": 5.3411,
  "deliveryLng": -4.0682,
  "mode": "STANDARD",
  "codAmount": 15000
}
```

**Modes de livraison :**
- `STANDARD` — Livraison normale
- `EXPRESS` — Livraison prioritaire

### Consulter les livraisons en attente

**API :** `GET /api/v1/deliveries/pending`

Affiche toutes les livraisons avec le statut `PENDING_ASSIGNMENT` (en attente d'un rider).

### Assigner un rider

**API :** `POST /api/v1/deliveries/:deliveryId/assign`

```json
{
  "riderId": "uuid-du-rider"
}
```

**Règles :**
- La livraison doit être au statut `PENDING_ASSIGNMENT`
- Le rider doit avoir le rôle `RIDER`
- Une fois assigné, le statut passe à `ASSIGNED`

### Cycle de vie d'une livraison

```
PENDING_ASSIGNMENT → ASSIGNED → PICKUP_IN_PROGRESS → IN_TRANSIT → DELIVERED → CONFIRMED
```

| Statut | Qui agit | Description |
|--------|----------|-------------|
| `PENDING_ASSIGNMENT` | Admin | Livraison créée, en attente d'un rider |
| `ASSIGNED` | Admin | Rider assigné |
| `PICKUP_IN_PROGRESS` | Rider | Le rider est en route vers le vendeur |
| `IN_TRANSIT` | Rider | Le rider a récupéré la pièce, en route vers le client |
| `DELIVERED` | Rider | Le rider a livré la pièce |
| `CONFIRMED` | Client | Le client confirme la réception |
| `RETURNED` | Rider | Retour de la pièce (client absent, litige) |

### Protocole client absent

Si le client est absent à la livraison, le rider peut signaler l'absence via `POST /deliveries/:id/client-absent`. Le champ `clientAbsent` est mis à `true` sur la livraison.

**Procédure recommandée :**
1. Le rider tente de livrer
2. Si client absent, le rider signale via l'application
3. L'admin est notifié
4. Contacter le client par téléphone
5. Reprogrammer la livraison ou procéder au retour

### Suivi GPS

Les riders mettent à jour leur position GPS en temps réel via `POST /deliveries/:id/location`. Les coordonnées `riderLat` et `riderLng` sont stockées et consultables.

### Collecte COD (Cash on Delivery)

Si la commande est en paiement à la livraison, le rider collecte le montant en espèces ou mobile money auprès du client. Le montant COD est indiqué dans le champ `codAmount` de la livraison.

---

## 7. Gestion des litiges

### Consulter les litiges

Les litiges sont ouverts par les acheteurs (mécaniciens) via l'application. Seul l'initiateur de la commande peut ouvrir un litige.

**API :** `GET /api/v1/reviews/disputes/order/:orderId`

Chaque litige contient :
- **Raison** — Description du problème (5 à 2000 caractères)
- **Preuves** — Liste d'URLs de photos/documents
- **Statut** — OPEN, UNDER_REVIEW, RESOLVED_BUYER, RESOLVED_SELLER, CLOSED
- **Date d'ouverture**

### Résoudre un litige

**API :** `POST /api/v1/reviews/disputes/:disputeId/resolve`

**Corps de la requête :**
```json
{
  "resolution": "Après examen des preuves, la pièce envoyée ne correspond pas à la commande. Remboursement intégral accordé à l'acheteur.",
  "inFavorOf": "buyer"
}
```

**Paramètre `inFavorOf` :**

| Valeur | Effet |
|--------|-------|
| `buyer` | Résolution en faveur de l'acheteur → statut `RESOLVED_BUYER` |
| `seller` | Résolution en faveur du vendeur → statut `RESOLVED_SELLER` |

**Bonnes pratiques pour la résolution de litiges :**

1. **Examiner les preuves** fournies par l'acheteur (photos, descriptions)
2. **Contacter le vendeur** pour obtenir sa version
3. **Vérifier l'historique** de la commande (événements, transitions de statut)
4. **Rédiger une résolution claire** expliquant la décision et les raisons
5. **Choisir la partie favorisée** (buyer ou seller)

**Conséquences de la résolution :**
- **En faveur de l'acheteur** → Initier un remboursement via le système de séquestre
- **En faveur du vendeur** → Libérer les fonds séquestrés au vendeur

### Statuts des litiges

| Statut | Description |
|--------|-------------|
| `OPEN` | Litige ouvert, en attente de traitement |
| `UNDER_REVIEW` | En cours d'examen (réservé pour usage futur) |
| `RESOLVED_BUYER` | Résolu en faveur de l'acheteur |
| `RESOLVED_SELLER` | Résolu en faveur du vendeur |
| `CLOSED` | Fermé (réservé pour usage futur) |

---

## 8. Notifications

### Envoyer une notification

**API :** `POST /api/v1/notifications/send`

**Corps de la requête :**
```json
{
  "to": "+2250700000000",
  "channel": "whatsapp",
  "message": "Votre commande a été traitée. Merci de votre confiance."
}
```

**Canaux disponibles :**

| Canal | Statut | Description |
|-------|--------|-------------|
| `whatsapp` | Actif | Envoi via WhatsApp Business API |
| `sms` | Stub (non configuré) | Envoi par SMS — intégration future |
| `push` | Stub (non configuré) | Notification push PWA — intégration future |

### Notifications automatiques prédéfinies

Le système envoie automatiquement des notifications WhatsApp lors de certains événements :

| Événement | Destinataire | Message |
|-----------|--------------|---------|
| Commande payée (`PAID`) | Propriétaire | "Votre commande est confirmée. Le vendeur prépare votre pièce." |
| Vendeur confirme (`VENDOR_CONFIRMED`) | Propriétaire | "Le vendeur a confirmé votre commande. Livraison en préparation." |
| Expédition (`DISPATCHED`) | Propriétaire | "Votre commande a été expédiée! Un livreur est en route." |
| Livraison (`DELIVERED`) | Propriétaire | "Votre commande a été livrée. Confirmez la réception." |
| Annulation (`CANCELLED`) | Propriétaire | "Votre commande a été annulée." |
| Nouvelle commande | Vendeur | "Nouvelle commande : X pièce(s). Confirmez dans les 45 minutes." |
| Stock critique | Vendeur | "Stock critique : [pièce] est en rupture." |
| Assignation livraison | Rider | "Nouvelle livraison assignée. Récupérez à : [adresse]" |

### Préférences de notification des utilisateurs

Chaque utilisateur peut configurer ses préférences de notification :
- **WhatsApp** — activé par défaut
- **SMS** — désactivé par défaut
- **Push PWA** — désactivé par défaut

Les préférences sont gérées via `GET/PUT /api/v1/notifications/preferences`.

---

## 9. Cycle de vie d'une commande

### Flux complet

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  MÉCANICIEN crée la commande                                     │
│  └─► DRAFT                                                       │
│       │                                                          │
│       ├──► PROPRIÉTAIRE choisit le paiement                      │
│       │    ├──► Mobile Money → PENDING_PAYMENT → PAID            │
│       │    └──► COD (≤75k FCFA) → PAID directement              │
│       │                                                          │
│       └──► ANNULATION possible (acheteur)                        │
│                                                                  │
│  VENDEUR confirme dans les 45 min                                │
│  └─► VENDOR_CONFIRMED                                            │
│       │                                                          │
│       └──► ANNULATION possible (acheteur)                        │
│                                                                  │
│  ADMIN crée la livraison + assigne un rider                      │
│  └─► DISPATCHED                                                  │
│       │                                                          │
│  RIDER récupère la pièce                                         │
│  └─► IN_TRANSIT                                                  │
│       │                                                          │
│  RIDER livre                                                     │
│  └─► DELIVERED                                                   │
│       │                                                          │
│       ├──► CLIENT confirme réception → CONFIRMED → COMPLETED     │
│       └──► Auto-complétée après 48h → COMPLETED                  │
│                                                                  │
│  COMPLETED = fonds libérés au vendeur                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Transitions de statut autorisées

| De | Vers | Qui |
|----|------|-----|
| DRAFT | PENDING_PAYMENT | Système (mobile money) |
| DRAFT | PAID | Système (COD) |
| DRAFT | CANCELLED | Acheteur |
| PENDING_PAYMENT | PAID | Système (webhook CinetPay) |
| PENDING_PAYMENT | CANCELLED | Acheteur |
| PAID | VENDOR_CONFIRMED | Vendeur |
| PAID | CANCELLED | Acheteur |
| VENDOR_CONFIRMED | DISPATCHED | Admin |
| VENDOR_CONFIRMED | CANCELLED | Acheteur |
| DISPATCHED | IN_TRANSIT | Rider |
| IN_TRANSIT | DELIVERED | Rider |
| DELIVERED | CONFIRMED | Client |
| DELIVERED | COMPLETED | Système (48h auto) |
| CONFIRMED | COMPLETED | Système |

### Points d'intervention de l'admin

1. **Surveiller les commandes `PAID` sans confirmation vendeur** → Relancer le vendeur après 30 min
2. **Créer la livraison** quand la commande passe à `VENDOR_CONFIRMED`
3. **Assigner un rider** pour la livraison
4. **Gérer les annulations** si la livraison est déjà en cours (statut > VENDOR_CONFIRMED = annulation impossible)
5. **Résoudre les litiges** ouverts par les acheteurs

---

## 10. Système de paiement et séquestre

### Méthodes de paiement

| Méthode | Code | Description |
|---------|------|-------------|
| Orange Money | `ORANGE_MONEY` | Paiement mobile via Orange |
| MTN Mobile Money | `MTN_MOMO` | Paiement mobile via MTN |
| Wave | `WAVE` | Paiement mobile via Wave |
| Paiement à la livraison | `COD` | Espèces ou mobile money à la livraison (max 75 000 FCFA) |

### Séquestre (Escrow)

Le système de séquestre protège les deux parties :

1. **Création** — Quand le paiement est confirmé (webhook CinetPay), un séquestre est créé au statut `HELD`
2. **Libération** — Quand la commande est `COMPLETED`, les fonds sont libérés au vendeur (`RELEASED`)
3. **Remboursement** — En cas d'annulation ou de litige en faveur de l'acheteur, les fonds sont remboursés (`REFUNDED`)

**Statuts du séquestre :**

| Statut | Description |
|--------|-------------|
| `HELD` | Fonds en séquestre — commande en cours |
| `RELEASED` | Fonds libérés au vendeur — commande terminée |
| `REFUNDED` | Fonds remboursés à l'acheteur — annulation/litige |

**Gardes de sécurité :**
- Un séquestre ne peut être libéré **ou** remboursé qu'une seule fois
- Toute tentative de double opération retourne une erreur `ESCROW_ALREADY_PROCESSED`

### Consulter un séquestre

**API :** `GET /api/v1/payments/orders/:orderId/escrow`

---

## 11. Référence API rapide

### Endpoints réservés à l'admin

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/admin/dashboard` | Statistiques plateforme |
| GET | `/api/v1/admin/users?page=&limit=` | Liste utilisateurs |
| GET | `/api/v1/admin/orders?page=&limit=&status=` | Liste commandes |
| GET | `/api/v1/admin/vendors?page=&limit=` | Liste vendeurs |
| PATCH | `/api/v1/users/:userId/roles` | Modifier rôles utilisateur |
| POST | `/api/v1/deliveries` | Créer une livraison |
| GET | `/api/v1/deliveries/pending` | Livraisons en attente |
| POST | `/api/v1/deliveries/:id/assign` | Assigner un rider |
| POST | `/api/v1/reviews/disputes/:id/resolve` | Résoudre un litige |
| POST | `/api/v1/notifications/send` | Envoyer une notification |

### En-têtes requis

```
Authorization: Bearer <votre-token-jwt>
Content-Type: application/json
```

### Format de réponse

**Succès :**
```json
{
  "data": { ... }
}
```

**Erreur :**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Description en français",
    "statusCode": 400
  }
}
```

### Codes d'erreur courants

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_MISSING_TOKEN` | 401 | Token Bearer manquant |
| `AUTH_INVALID_TOKEN` | 401 | Token expiré ou invalide |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Rôle ADMIN requis |
| `ORDER_NOT_FOUND` | 404 | Commande introuvable |
| `ORDER_INVALID_TRANSITION` | 409 | Transition de statut invalide |
| `DELIVERY_NOT_FOUND` | 404 | Livraison introuvable |
| `DELIVERY_ALREADY_ASSIGNED` | 400 | Livraison déjà assignée à un rider |
| `ESCROW_NOT_FOUND` | 404 | Séquestre introuvable |
| `ESCROW_ALREADY_PROCESSED` | 400 | Séquestre déjà libéré/remboursé |
| `VENDOR_NOT_FOUND` | 404 | Profil vendeur introuvable |

---

## 12. FAQ et dépannage

### Q : Je ne vois pas le tableau de bord admin

**R :** Vérifiez que votre compte possède le rôle `ADMIN`. Contactez un autre administrateur pour qu'il vous attribue le rôle via `PATCH /api/v1/users/:userId/roles`.

### Q : Un vendeur ne peut pas publier ses pièces

**R :** Vérifiez que :
1. Le profil vendeur est au statut `ACTIVE` (pas `PENDING_ACTIVATION`)
2. Les deux garanties (RETURN_48H et WARRANTY_30D) ont été signées
3. Le document KYC a été soumis

### Q : Une commande est bloquée au statut PAID

**R :** Le vendeur n'a pas encore confirmé. Procédure :
1. Vérifier depuis combien de temps la commande est en `PAID`
2. Si > 45 minutes, contacter le vendeur par téléphone ou WhatsApp
3. Si le vendeur ne répond pas, envisager l'annulation et le remboursement

### Q : Comment annuler une commande en cours de livraison ?

**R :** Les commandes au statut `DISPATCHED`, `IN_TRANSIT` ou `DELIVERED` **ne peuvent pas être annulées** automatiquement. Le cycle de vie interdit cette transition. Si nécessaire :
1. Contacter le rider pour arrêter la livraison
2. Signaler un litige
3. Résoudre le litige en faveur de l'acheteur pour déclencher le remboursement

### Q : Comment rembourser un client ?

**R :** Le remboursement se fait via le système de séquestre :
1. Ouvrir un litige (ou en recevoir un de l'acheteur)
2. Résoudre le litige avec `inFavorOf: "buyer"`
3. Le statut du séquestre passera de `HELD` à `REFUNDED`

> **Note :** Le remboursement effectif sur le compte mobile money du client nécessite actuellement une intervention manuelle via le back-office CinetPay.

### Q : Un rider signale "client absent"

**R :** Voir la section [Protocole client absent](#protocole-client-absent). Contacter le client, reprogrammer la livraison ou procéder au retour de la pièce.

### Q : Comment ajouter un nouveau rider ?

**R :**
1. Le rider se connecte avec son numéro de téléphone (compte créé automatiquement avec le rôle MECHANIC par défaut)
2. L'admin modifie ses rôles pour ajouter `RIDER` : `PATCH /api/v1/users/:userId/roles` avec `{ "roles": ["MECHANIC", "RIDER"] }`
3. Le rider peut maintenant voir ses livraisons dans l'onglet `/rider`

### Q : Comment surveiller les performances des riders ?

**R :** Consultez les évaluations des riders via `GET /api/v1/reviews/rider/:riderId`. La note moyenne et le nombre d'avis sont calculés automatiquement.

---

*Manuel généré le 2026-03-01 — Pièces v0.1.0*
*Pour toute question technique, consultez la [documentation technique](./index.md).*
