# Manuel d'utilisation — Entreprise / Gestionnaire de flotte Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Votre rôle sur Pièces](#1-votre-rôle-sur-pièces)
2. [Persona cible : Adjoua, gestionnaire de flotte](#2-persona-cible--adjoua-gestionnaire-de-flotte)
3. [État actuel de l'implémentation (v1)](#3-état-actuel-de-limplémentation-v1)
4. [Accès et connexion](#4-accès-et-connexion)
5. [Consentement ARTCI](#5-consentement-artci)
6. [Le rôle ENTERPRISE dans le système](#6-le-rôle-enterprise-dans-le-système)
7. [Endpoint API disponible](#7-endpoint-api-disponible)
8. [Fonctionnalités actuelles en v1](#8-fonctionnalités-actuelles-en-v1)
9. [Vision Phase 2 : Dashboard flotte](#9-vision-phase-2--dashboard-flotte)
10. [Vision Phase 2 : Gestion des membres (tenant)](#10-vision-phase-2--gestion-des-membres-tenant)
11. [Vision Phase 2 : Workflow d'approbation](#11-vision-phase-2--workflow-dapprobation)
12. [Vision Phase 2 : Facturation consolidée](#12-vision-phase-2--facturation-consolidée)
13. [Vision Phase 2 : Benchmark flotte](#13-vision-phase-2--benchmark-flotte)
14. [Architecture technique prévue](#14-architecture-technique-prévue)
15. [Exigences fonctionnelles (PRD)](#15-exigences-fonctionnelles-prd)
16. [FAQ entreprise](#16-faq-entreprise)

---

## 1. Votre rôle sur Pièces

En tant qu'**entreprise** ou **gestionnaire de flotte**, vous représentez une organisation qui possède plusieurs véhicules et emploie un ou plusieurs mécaniciens. Votre objectif est de **centraliser et optimiser** l'approvisionnement en pièces détachées pour l'ensemble de votre flotte.

Le rôle ENTERPRISE vous permet de :

- **Superviser** les commandes passées par vos mécaniciens
- **Consolider** les dépenses par véhicule et par mécanicien
- **Gérer** les membres de votre espace entreprise (tenant)
- **Suivre** l'historique des pannes et des réparations de votre flotte

**Note importante :** En v1, le rôle ENTERPRISE est une **structure préparatoire** (stub). Les fonctionnalités complètes de gestion de flotte sont planifiées pour la **Phase 2** de la plateforme.

---

## 2. Persona cible : Adjoua, gestionnaire de flotte

La persona de référence pour le rôle Enterprise est **Adjoua** :

- **Profil :** 38 ans, directrice logistique d'une société de distribution
- **Flotte :** 23 véhicules
- **Mécaniciens :** 3 mécaniciens salariés
- **Besoin principal :** Visibilité complète sur les dépenses pièces par véhicule et par mécanicien
- **Objectif :** Réduire les temps d'immobilisation et optimiser les coûts de maintenance

### Journey type d'Adjoua

```
ADJOUA (Enterprise)          SES MÉCANICIENS          VENDEURS PIÈCES

Supervise la flotte          Recherchent les pièces    Ont les pièces
de 23 véhicules              sur le catalogue          en stock
       │                            │                       │
       │                            ▼                       │
       │                    Créent les commandes            │
       │                    pour les véhicules              │
       │                    de la flotte                    │
       │                            │                       │
       ▼                            │                       │
Dashboard consolidé ◄──────────────┤                       │
Voit toutes les                     │                       │
commandes en cours                  │                       │
       │                            │                       │
       │                    Commande livrée ◄──────────────┤
       │                            │                       │
       ▼                            ▼                       │
Rapport mensuel             Pièces installées         Paiement reçu
Dépenses par véhicule       sur les véhicules
```

---

## 3. État actuel de l'implémentation (v1)

### Ce qui est implémenté

| Composant | État | Détail |
|-----------|------|--------|
| Rôle ENTERPRISE dans le schéma Prisma | Implémenté | Enum `Role` inclut `ENTERPRISE` |
| Rôle ENTERPRISE dans les types TypeScript | Implémenté | `packages/shared/types/roles.ts` |
| Label UI "Entreprise" | Implémenté | `apps/web/lib/role-labels.ts` |
| Endpoint `GET /admin/enterprise/members` | Implémenté (stub) | Retourne `{ members: [], total: 0 }` |
| Middleware `requireRole('ENTERPRISE')` | Implémenté | Protège l'endpoint entreprise |
| Tests unitaires | Implémentés | 2 tests dans `admin.service.test.ts` |

### Ce qui est planifié (Phase 2)

| Fonctionnalité | Priorité | Référence PRD |
|----------------|----------|---------------|
| Dashboard flotte multi-véhicules | Haute | FR28 |
| Gestion des membres (tenant) | Haute | FR32 |
| Contrainte un tenant par utilisateur | Haute | FR33 |
| Workflow d'approbation commandes | Moyenne | Phase 2 |
| Facturation mensuelle consolidée | Moyenne | Phase 2 |
| Benchmark flotte | Basse | Phase 2 |

---

## 4. Accès et connexion

### 4.1 Inscription

L'inscription Enterprise suit le même flux que les autres rôles :

1. Accédez à la page d'inscription sur `pieces.ci`
2. Renseignez vos informations (nom, téléphone, email)
3. Vérifiez votre numéro de téléphone par OTP (code SMS)
4. Acceptez le consentement ARTCI (obligatoire)

**Attribution du rôle :** Le rôle ENTERPRISE est attribué par un administrateur de la plateforme. Après votre inscription initiale (rôle MECHANIC par défaut), contactez le support Pièces pour demander l'activation du rôle Enterprise.

### 4.2 Connexion

- **Méthode :** Connexion par numéro de téléphone + OTP (Supabase Auth)
- **Session :** Token JWT avec rôle ENTERPRISE inclus
- **Sécurité :** Toutes les requêtes API nécessitent un token Bearer valide

---

## 5. Consentement ARTCI

Conformément à la **Loi n°2013-450** relative à la protection des données à caractère personnel en Côte d'Ivoire, vous devez donner votre consentement explicite avant d'utiliser la plateforme.

### Ce que vous acceptez

- Collecte de vos données personnelles (nom, téléphone, email)
- Traitement des données de votre entreprise et de votre flotte
- Utilisation de la géolocalisation pour la livraison
- Partage limité avec les vendeurs et livreurs pour l'exécution des commandes

### Vos droits

- **Accès :** Consulter toutes vos données à tout moment
- **Rectification :** Corriger vos informations
- **Suppression :** Demander l'effacement de vos données
- **Opposition :** Refuser certains traitements (sauf obligations légales)

Le consentement est enregistré avec horodatage et adresse IP. Il est révocable à tout moment via les paramètres de votre compte.

---

## 6. Le rôle ENTERPRISE dans le système

### 6.1 Schéma de données

Le rôle ENTERPRISE est défini dans le schéma Prisma partagé :

```
enum Role {
  MECHANIC
  OWNER
  SELLER
  RIDER
  ADMIN
  ENTERPRISE    ← Votre rôle
}
```

Un utilisateur avec le rôle ENTERPRISE a accès à :
- Toutes les fonctionnalités de base de la plateforme (comme MECHANIC)
- L'endpoint dédié `/admin/enterprise/members` (stub en v1)

### 6.2 Multi-rôle

Le système Pièces supporte le **multi-rôle**. Un compte Enterprise peut également avoir d'autres rôles :
- `ENTERPRISE` + `MECHANIC` : Gérer la flotte ET passer des commandes directement
- `ENTERPRISE` + `OWNER` : Gérer la flotte ET payer des commandes

### 6.3 Label d'interface

Dans l'interface web, le rôle s'affiche comme **"Entreprise"** (français).

---

## 7. Endpoint API disponible

### GET /admin/enterprise/members

**Description :** Récupère la liste des membres de l'espace entreprise.

| Paramètre | Valeur |
|-----------|--------|
| URL | `GET /admin/enterprise/members` |
| Auth | Bearer Token (JWT) |
| Rôle requis | `ENTERPRISE` |
| Réponse v1 | `{ members: [], total: 0 }` |

**Comportement actuel (v1) :**

```json
{
  "members": [],
  "total": 0
}
```

L'endpoint vérifie que l'utilisateur authentifié possède bien le rôle ENTERPRISE. Si ce n'est pas le cas, une erreur 403 (Forbidden) est retournée.

**Tests existants :**
- `returns empty for non-enterprise user` — Vérifie le rejet pour un utilisateur sans rôle ENTERPRISE
- `returns empty placeholder for enterprise user` — Vérifie le retour stub pour un utilisateur ENTERPRISE

---

## 8. Fonctionnalités actuelles en v1

En v1, un utilisateur Enterprise peut utiliser la plateforme comme n'importe quel autre utilisateur :

### 8.1 Recherche de pièces

- Recherche textuelle dans le catalogue
- Recherche par marque et modèle de véhicule
- Identification par photo (IA Google Gemini)
- Décodage VIN pour identification précise

### 8.2 Commandes

- Passer des commandes comme mécanicien (si multi-rôle)
- Payer des commandes comme propriétaire (si multi-rôle)
- Consulter l'historique des commandes personnelles

### 8.3 Profil

- Modifier ses informations personnelles
- Gérer ses préférences de notification
- Consulter ses rôles actifs

**Limitation v1 :** Il n'y a pas encore de fonctionnalité spécifique Enterprise au-delà du stub endpoint. Les commandes et paiements restent individuels, sans consolidation par entreprise.

---

## 9. Vision Phase 2 : Dashboard flotte

Le dashboard flotte est la fonctionnalité phare planifiée pour la Phase 2. Référence PRD : **FR28**.

### 9.1 Vue d'ensemble flotte

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD FLOTTE — Société ABC Distribution                │
│                                                             │
│  Véhicules: 23    Mécaniciens: 3    Commandes ce mois: 47  │
│  Dépenses mois: 2.450.000 FCFA     Budget: 3.000.000 FCFA  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VÉHICULES        │  DÉPENSES PAR VÉHICULE                 │
│  ─────────        │  ──────────────────────                 │
│  🟢 AB-1234-CI   │  ████████░░ 320.000 F                   │
│  🟢 AB-5678-CI   │  ██████░░░░ 245.000 F                   │
│  🟡 AB-9012-CI   │  ████████████ 480.000 F  ← En panne    │
│  🟢 AB-3456-CI   │  ██░░░░░░░░ 85.000 F                    │
│  ...              │  ...                                    │
│                                                             │
│  COMMANDES EN COURS: 3                                      │
│  ─ Filtre à huile pour AB-1234-CI — En transit              │
│  ─ Plaquettes frein pour AB-9012-CI — Confirmée             │
│  ─ Alternateur pour AB-5678-CI — En attente paiement        │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Fonctionnalités prévues

- **Vue par véhicule :** Historique complet des pièces commandées, coûts cumulés, fréquence de pannes
- **Vue par mécanicien :** Commandes passées par chaque mécanicien, volumes, délais
- **Alertes :** Véhicule avec dépenses anormales, panne récurrente, budget dépassé
- **Export :** Téléchargement des rapports en format PDF/CSV
- **Tracking GPS :** Suivi en temps réel des livraisons avec ETA dynamique

### 9.3 SLA et alertes proactives

D'après le journey d'Adjoua dans le PRD :
- Alerte automatique en cas de dépassement SLA livraison (avant que le client ne contacte le support)
- Remboursement SLA automatique : retard Express → livraison Standard offerte sur la prochaine commande
- Notification proactive : "Retard constaté — Votre prochaine livraison Standard offerte."

---

## 10. Vision Phase 2 : Gestion des membres (tenant)

Références PRD : **FR32** et **FR33**.

### 10.1 Architecture tenant

L'architecture prévue est un modèle **multi-tenant** :

```
Structure : tenant (entreprise) → members (comptes individuels avec rôles)

ENTREPRISE ABC DISTRIBUTION
├── Adjoua (Admin Enterprise) — Rôle: ENTERPRISE
├── Konan (Mécanicien 1) — Rôle: MECHANIC, membre du tenant
├── Yao (Mécanicien 2) — Rôle: MECHANIC, membre du tenant
└── Koffi (Mécanicien 3) — Rôle: MECHANIC, membre du tenant
```

### 10.2 Gestion des invitations

- **FR32 :** Un admin Enterprise peut inviter des membres dans son espace tenant et leur assigner des rôles internes
- Invitation par numéro de téléphone ou email
- Rôles internes : Administrateur, Mécanicien, Superviseur, Comptable
- Acceptation/refus de l'invitation par le membre invité

### 10.3 Contrainte d'appartenance

- **FR33 :** Un compte utilisateur peut appartenir à **au plus un tenant Enterprise** simultanément (v1)
- Changement de tenant possible après désinscription du précédent
- Un mécanicien indépendant peut rejoindre une entreprise sans perdre son historique

---

## 11. Vision Phase 2 : Workflow d'approbation

### 11.1 Approbation des commandes

Pour les flottes, un workflow d'approbation permet de contrôler les dépenses :

```
MÉCANICIEN                    SUPERVISEUR               ADMIN ENTERPRISE
                              (Approbateur)             (Adjoua)

Identifie la pièce                 │                         │
Crée la demande ──────────────────►│                         │
                                   │                         │
                          Examine le devis                   │
                          Approuve / Refuse                  │
                                   │                         │
                                   ├── Si > seuil ──────────►│
                                   │                    Approbation finale
                                   │                         │
Commande confirmée ◄──────────────┘◄────────────────────────┘
```

### 11.2 Règles d'approbation

- **Seuil automatique :** Commandes sous un certain montant (ex: 50.000 FCFA) validées automatiquement
- **Approbation simple :** Commandes entre 50.000 et 200.000 FCFA — approbation superviseur
- **Double approbation :** Commandes > 200.000 FCFA — superviseur + admin enterprise

---

## 12. Vision Phase 2 : Facturation consolidée

### 12.1 Facturation mensuelle

Au lieu de payer chaque commande individuellement, les entreprises pourront opter pour une **facturation mensuelle consolidée** :

- Relevé mensuel regroupant toutes les commandes de la flotte
- Ventilation par véhicule et par mécanicien
- Paiement par virement bancaire ou mobile money
- Délai de paiement configurable (30/60 jours)

### 12.2 Structure de la facture

```
FACTURE MENSUELLE — Mars 2026
Entreprise : ABC Distribution
Tenant ID : tenant-abc-123

RÉSUMÉ
──────
Total commandes : 47
Total pièces : 2.150.000 FCFA
Total livraisons : 300.000 FCFA
Total HT : 2.450.000 FCFA

DÉTAIL PAR VÉHICULE
───────────────────
AB-1234-CI : 5 commandes — 320.000 FCFA
AB-5678-CI : 3 commandes — 245.000 FCFA
AB-9012-CI : 8 commandes — 480.000 FCFA
... (23 véhicules)

DÉTAIL PAR MÉCANICIEN
─────────────────────
Konan : 18 commandes — 890.000 FCFA
Yao : 15 commandes — 780.000 FCFA
Koffi : 14 commandes — 780.000 FCFA
```

---

## 13. Vision Phase 2 : Benchmark flotte

### 13.1 Comparaisons et analyses

Le benchmark flotte permettra de comparer les performances :

- **Inter-véhicules :** Coût de maintenance moyen par véhicule, fréquence de pannes
- **Inter-mécaniciens :** Nombre de commandes, délai moyen de réparation, coût moyen
- **Temporel :** Évolution des dépenses mois par mois, tendances saisonnières
- **Passeport véhicule :** Historique complet des pannes et réparations pour chaque véhicule

### 13.2 Indicateurs clés (KPIs)

| KPI | Description | Objectif |
|-----|-------------|----------|
| Coût moyen par véhicule/mois | Dépenses pièces + main d'œuvre | Réduire de 15% |
| Taux d'immobilisation | Jours sans utilisation / mois | < 5% |
| Délai moyen de réparation | De la panne à la remise en service | < 48h |
| Taux de pièces retournées | Pièces non conformes / total | < 3% |
| Budget restant | Budget mensuel — dépenses | Toujours positif |

---

## 14. Architecture technique prévue

### 14.1 Modèles de données (Phase 2)

Les nouveaux modèles Prisma prévus pour supporter l'espace Enterprise :

```
model Enterprise {
  id          String   @id @default(cuid())
  name        String
  siret       String?  // RCCM en Côte d'Ivoire
  address     String?
  phone       String
  email       String?
  ownerId     String   // L'admin principal (Adjoua)
  owner       User     @relation(fields: [ownerId])
  members     EnterpriseMember[]
  vehicles    Vehicle[]
  budgetLimit Int?     // Budget mensuel en FCFA
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model EnterpriseMember {
  id           String     @id @default(cuid())
  enterpriseId String
  enterprise   Enterprise @relation(fields: [enterpriseId])
  userId       String
  user         User       @relation(fields: [userId])
  role         String     // ADMIN, SUPERVISOR, MECHANIC, ACCOUNTANT
  invitedAt    DateTime   @default(now())
  acceptedAt   DateTime?
  status       String     // PENDING, ACTIVE, REVOKED
}

model Vehicle {
  id           String     @id @default(cuid())
  enterpriseId String
  enterprise   Enterprise @relation(fields: [enterpriseId])
  plate        String     // Immatriculation
  brand        String
  model        String
  year         Int?
  vin          String?
  status       String     // ACTIVE, MAINTENANCE, RETIRED
}
```

### 14.2 Nouveaux endpoints API prévus

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/enterprise` | Créer un espace entreprise |
| GET | `/enterprise/:id` | Détails de l'entreprise |
| PUT | `/enterprise/:id` | Modifier l'entreprise |
| POST | `/enterprise/:id/members` | Inviter un membre |
| DELETE | `/enterprise/:id/members/:memberId` | Révoquer un membre |
| GET | `/enterprise/:id/vehicles` | Liste des véhicules |
| POST | `/enterprise/:id/vehicles` | Ajouter un véhicule |
| GET | `/enterprise/:id/dashboard` | Dashboard consolidé |
| GET | `/enterprise/:id/invoices` | Factures mensuelles |
| GET | `/enterprise/:id/reports` | Rapports et benchmark |

---

## 15. Exigences fonctionnelles (PRD)

Les exigences fonctionnelles du PRD liées au rôle Enterprise :

### FR28 — Dashboard flotte

> Le gestionnaire de flotte Enterprise peut visualiser les commandes et dépenses consolidées par véhicule et par mécanicien.

- **Priorité :** Phase 2
- **Critères d'acceptation :**
  - Vue consolidée des commandes par véhicule
  - Vue consolidée des dépenses par mécanicien
  - Filtres par période, véhicule, mécanicien
  - Export des données

### FR32 — Gestion des membres tenant

> Un admin Enterprise peut inviter des membres dans son espace tenant et leur assigner des rôles internes.

- **Priorité :** Phase 2
- **Critères d'acceptation :**
  - Invitation par téléphone ou email
  - Attribution de rôles internes (admin, superviseur, mécanicien, comptable)
  - Acceptation/refus par le membre invité
  - Révocation possible par l'admin

### FR33 — Contrainte tenant unique

> Un compte utilisateur peut appartenir à au plus un tenant Enterprise simultanément (v1).

- **Priorité :** Phase 2 (contrainte)
- **Critères d'acceptation :**
  - Vérification à l'invitation : rejet si déjà membre d'un tenant
  - Possibilité de quitter un tenant pour en rejoindre un autre
  - Historique personnel conservé lors du changement

---

## 16. FAQ entreprise

### Q : Comment obtenir le rôle Enterprise ?

**R :** En v1, le rôle ENTERPRISE est attribué manuellement par un administrateur Pièces. Inscrivez-vous normalement puis contactez le support pour demander l'activation. L'objectif au lancement est de signer **5 entreprises avec flotte**.

### Q : Puis-je utiliser Pièces comme une entreprise dès maintenant ?

**R :** Oui. Vos mécaniciens peuvent utiliser Pièces individuellement dès aujourd'hui. Le rôle Enterprise en v1 est une structure préparatoire — vos commandes seront passées de manière individuelle par chaque mécanicien. La consolidation au niveau flotte arrivera en Phase 2.

### Q : Quand les fonctionnalités Enterprise complètes seront-elles disponibles ?

**R :** Le dashboard flotte, la gestion des membres et la facturation consolidée sont planifiés pour la **Phase 2** de Pièces. Aucune date précise n'a été communiquée.

### Q : Mes mécaniciens perdront-ils leur historique en rejoignant mon entreprise ?

**R :** Non. Lorsqu'un mécanicien rejoint votre espace Enterprise en Phase 2, son historique personnel de commandes est conservé. Seules les nouvelles commandes seront visibles dans le dashboard flotte.

### Q : Y a-t-il un nombre maximum de véhicules ou de membres ?

**R :** Aucune limite technique n'est prévue en Phase 2. La tarification pourra varier selon la taille de la flotte (nombre de véhicules et de membres actifs).

### Q : Le paiement groupé est-il disponible ?

**R :** Pas en v1. Chaque commande est payée individuellement (Orange Money, MTN, Wave ou espèces). La facturation mensuelle consolidée est prévue pour la Phase 2.

### Q : Comment fonctionne l'escrow pour les entreprises ?

**R :** En v1, le système escrow fonctionne de la même manière que pour les autres utilisateurs : les fonds sont bloqués (HELD) jusqu'à la livraison, puis libérés automatiquement après 48h. En Phase 2, un processus de vérification supplémentaire sera ajouté pour les commandes à approbation.

### Q : Que se passe-t-il en cas de litige sur une commande de la flotte ?

**R :** En v1, les litiges sont gérés individuellement par le mécanicien qui a passé la commande. En Phase 2, l'admin Enterprise pourra suivre et intervenir dans les litiges concernant les commandes de sa flotte.

---

## Référence rapide

| Élément | Détail |
|---------|--------|
| Rôle système | `ENTERPRISE` |
| Label UI | "Entreprise" |
| Endpoint v1 | `GET /admin/enterprise/members` |
| Réponse v1 | `{ members: [], total: 0 }` |
| Auth | Bearer Token JWT + `requireRole('ENTERPRISE')` |
| Phase actuelle | v1 — Stub préparatoire |
| Phase cible | Phase 2 — Dashboard flotte complet |
| PRD références | FR28, FR32, FR33 |
| Persona | Adjoua, 38 ans, 23 véhicules, 3 mécaniciens |
| Objectif lancement | 5 entreprises signées |
