# Manuel d'utilisation — Livreur Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Accès et connexion](#1-accès-et-connexion)
2. [Consentement ARTCI](#2-consentement-artci)
3. [Navigation dans l'application](#3-navigation-dans-lapplication)
4. [Tableau de bord livreur](#4-tableau-de-bord-livreur)
5. [Recevoir une assignation](#5-recevoir-une-assignation)
6. [Effectuer une livraison pas à pas](#6-effectuer-une-livraison-pas-à-pas)
7. [Gérer le paiement à la livraison (COD)](#7-gérer-le-paiement-à-la-livraison-cod)
8. [Signaler un client absent](#8-signaler-un-client-absent)
9. [Mise à jour de la position GPS](#9-mise-à-jour-de-la-position-gps)
10. [Historique des livraisons](#10-historique-des-livraisons)
11. [Avis clients sur vos livraisons](#11-avis-clients-sur-vos-livraisons)
12. [Notifications](#12-notifications)
13. [Profil et gestion du compte](#13-profil-et-gestion-du-compte)
14. [Cycle de vie complet d'une livraison](#14-cycle-de-vie-complet-dune-livraison)
15. [Zone de couverture](#15-zone-de-couverture)
16. [Modes de livraison](#16-modes-de-livraison)
17. [Référence rapide des endpoints](#17-référence-rapide-des-endpoints)
18. [FAQ livreur](#18-faq-livreur)

---

## 1. Accès et connexion

### Votre rôle sur Pièces

En tant que livreur, vous êtes responsable de :
- Récupérer les pièces chez les vendeurs
- Les livrer aux clients (mécaniciens ou propriétaires de véhicules)
- Collecter le paiement en espèces pour les commandes COD (Cash on Delivery)
- Mettre à jour votre position GPS en temps réel
- Signaler les situations exceptionnelles (client absent)

Le rôle **LIVREUR** (RIDER) est attribué par un administrateur. Il ne s'obtient pas automatiquement à l'inscription.

### Comment se connecter

La connexion se fait par **numéro de téléphone ivoirien** et code OTP par SMS.

**Étapes :**

1. Ouvrir l'application Pièces sur votre navigateur mobile
2. Saisir votre numéro au format **+225** suivi de 10 chiffres (ex : +2250700000000)
   - Préfixes acceptés : **01**, **05**, **07**
3. Appuyer sur **"Recevoir le code"**
4. Entrer le **code à 6 chiffres** reçu par SMS
   - 6 cases s'affichent, le curseur avance automatiquement
   - Vous pouvez coller le code directement
   - La vérification se lance dès le 6e chiffre saisi
5. Si le code n'arrive pas, le bouton **"Renvoyer"** apparaît après 60 secondes

### Activer le contexte Livreur

Si vous avez plusieurs rôles (ex : Livreur + Mécanicien), vous devez basculer vers le contexte **Livreur** :

1. Aller sur l'onglet **"Profil"** dans la navigation
2. Dans la section des rôles, appuyer sur **"Passer en Livreur"**
3. Naviguer vers `/rider` pour accéder à votre tableau de bord

---

## 2. Consentement ARTCI

Lors de votre **première connexion**, un écran de consentement bloque l'accès à l'application.

### Ce qui est affiché

- Référence à la **loi n°2013-450** relative à la protection des données personnelles en Côte d'Ivoire (ARTCI)
- Données collectées :
  - Numéro de téléphone (identification)
  - Historique de transactions (suivi commandes)
  - Photos de pièces (identification par IA)

### Action requise

- Appuyer sur **"J'accepte"**
- Sans consentement, aucune page n'est accessible
- La date de consentement est enregistrée dans votre profil

---

## 3. Navigation dans l'application

### Barre de navigation

L'application affiche une barre de navigation fixe en bas de l'écran avec 3 onglets :

| Onglet | Page | Description |
|--------|------|-------------|
| **Accueil** | `/` | Page d'accueil générale |
| **Commandes** | `/orders` | Historique des commandes (vue acheteur) |
| **Profil** | `/profile` | Votre compte et paramètres |

### Accéder au tableau de bord livreur

Votre tableau de bord livreur est accessible à l'adresse **`/rider`**. Naviguez-y directement depuis votre navigateur après vous être connecté.

---

## 4. Tableau de bord livreur

**Page :** `/rider`

Le tableau de bord est votre page centrale. Il affiche toutes vos livraisons, divisées en deux sections.

### Section 1 : Livraisons en cours

Les livraisons actives (tous les statuts sauf DELIVERED et CONFIRMED) sont affichées en cartes bleues cliquables.

Chaque carte affiche :

| Information | Description |
|-------------|-------------|
| **Statut** | Badge en bleu avec le libellé français |
| **Mode** | Badge EXPRESS ou STANDARD |
| **Articles** | Noms des pièces à livrer |
| **Montant COD** | Montant à collecter en espèces (affiché en vert, gros caractères) |

**Appuyez sur une carte** pour accéder à la page de détail et effectuer les actions de livraison.

### Section 2 : Historique

Les 10 dernières livraisons terminées (DELIVERED ou CONFIRMED) sont affichées sous la section active, avec :
- Statut
- Montant total de la commande
- Noms des pièces livrées

### Libellés des statuts

| Statut système | Libellé français |
|---------------|-----------------|
| ASSIGNED | Assignée |
| PICKUP_IN_PROGRESS | Ramassage |
| IN_TRANSIT | En route |
| DELIVERED | Livrée |
| CONFIRMED | Confirmée |

---

## 5. Recevoir une assignation

### Comment ça fonctionne

1. Un **administrateur** crée une livraison pour une commande confirmée par le vendeur
2. L'administrateur vous **assigne** la livraison
3. Vous recevez une **notification WhatsApp** :

> *"Nouvelle livraison {ID} assignée. Récupérez à : {adresse de collecte}"*

4. La livraison apparaît dans votre tableau de bord au statut **ASSIGNED** (Assignée)

### Informations fournies

Lors de l'assignation, vous recevez :

| Information | Description |
|-------------|-------------|
| **Adresse de ramassage** | Adresse de la boutique du vendeur |
| **Coordonnées GPS ramassage** | Latitude et longitude du point de collecte |
| **Adresse de livraison** | Adresse de livraison au client |
| **Coordonnées GPS livraison** | Latitude et longitude de la destination |
| **Mode** | EXPRESS (rapide) ou STANDARD |
| **Montant COD** | Montant à collecter en espèces (si applicable) |
| **Articles** | Liste des pièces à transporter |

---

## 6. Effectuer une livraison pas à pas

La livraison suit une **machine à états** stricte. Chaque étape doit être validée dans l'ordre.

### Page de détail

**Page :** `/rider/delivery/[deliveryId]`

La page de détail affiche :

- **En-tête bleu** : statut actuel et mode de livraison
- **Bloc RAMASSAGE** : adresse de collecte chez le vendeur
- **Bloc LIVRAISON** : adresse de livraison au client
- **Bloc COD** (si applicable) : montant à collecter en gros caractères verts
- **Boutons d'action** : adaptés au statut actuel

### Étape 1 : Démarrer le ramassage

**Statut requis :** ASSIGNED (Assignée)

**Action :** Appuyez sur **"Démarrer le ramassage"**

**Résultat :** Le statut passe à **PICKUP_IN_PROGRESS** (Ramassage)

Cela signifie que vous êtes en route vers la boutique du vendeur pour récupérer la pièce.

### Étape 2 : Pièce récupérée — En route

**Statut requis :** PICKUP_IN_PROGRESS (Ramassage)

**Action :** Appuyez sur **"Pièce récupérée — En route"**

**Résultat :**
- Le statut passe à **IN_TRANSIT** (En route)
- L'heure de collecte (`pickedUpAt`) est enregistrée automatiquement

Cela signifie que vous avez récupéré la pièce chez le vendeur et que vous êtes en route vers le client.

### Étape 3 : Confirmer la livraison

**Statut requis :** IN_TRANSIT (En route)

**Action :** Appuyez sur **"Confirmer la livraison"**

**Résultat :**
- Le statut passe à **DELIVERED** (Livrée)
- L'heure de livraison (`deliveredAt`) est enregistrée automatiquement
- Un message de confirmation s'affiche : *"Livraison confirmée"*

### Résumé des transitions

```
ASSIGNED
    │
    │  "Démarrer le ramassage"
    ▼
PICKUP_IN_PROGRESS
    │
    │  "Pièce récupérée — En route"
    │  → enregistre pickedUpAt
    ▼
IN_TRANSIT
    │
    ├─── "Confirmer la livraison"
    │    → enregistre deliveredAt
    ▼
DELIVERED ✅
```

### Règles importantes

- **Ordre strict** : Vous ne pouvez pas sauter d'étape (ex : passer de ASSIGNED directement à IN_TRANSIT)
- **Propriété** : Seul le livreur assigné à la livraison peut effectuer les actions
- **Irréversibilité** : Chaque transition est définitive — vous ne pouvez pas revenir en arrière

---

## 7. Gérer le paiement à la livraison (COD)

### Qu'est-ce que le COD ?

COD signifie **Cash on Delivery** (paiement à la livraison). Pour certaines commandes, le client paie en espèces au moment de la livraison au lieu de payer par mobile money.

### Conditions du COD

| Règle | Valeur |
|-------|--------|
| Montant maximum | **75 000 FCFA** |
| Méthode | Espèces uniquement |

### Comment reconnaître une livraison COD

Sur votre tableau de bord et sur la page de détail, le montant COD est affiché :
- En **gros caractères verts**
- Avec le libellé **"COD: X FCFA"** sur le tableau de bord
- Avec le libellé **"Montant à collecter (COD)"** sur la page de détail

### Procédure COD

1. Livrez la pièce au client
2. **Collectez le montant en espèces** affiché à l'écran
3. Confirmez la livraison via le bouton **"Confirmer la livraison"**

### Si le montant COD est 0 ou absent

La commande a été payée par mobile money (Orange Money, MTN MoMo, Wave). Vous n'avez **rien à collecter** — livrez simplement la pièce.

---

## 8. Signaler un client absent

### Quand utiliser cette fonction

Si vous arrivez à l'adresse de livraison et que le client n'est pas présent, vous pouvez signaler son absence.

### Comment faire

**Statut requis :** IN_TRANSIT (En route)

**Action :** Appuyez sur **"Client absent"**

### Ce qui se passe

- Le drapeau `clientAbsent` est activé sur la livraison
- Le statut de la livraison **ne change pas** — vous restez en IN_TRANSIT
- L'information est enregistrée et visible par l'administrateur
- Vous pourrez tenter une nouvelle livraison ultérieurement

### Important

- Cette action peut être effectuée **à tout moment** tant que vous êtes le livreur assigné
- Signaler un client absent **ne termine pas** la livraison
- Vous devrez toujours confirmer la livraison finale via **"Confirmer la livraison"**

---

## 9. Mise à jour de la position GPS

### Fonctionnement

Vous pouvez envoyer vos coordonnées GPS en temps réel pour permettre au client et à l'administrateur de suivre votre progression.

### Données envoyées

| Champ | Description |
|-------|-------------|
| `riderLat` | Votre latitude actuelle |
| `riderLng` | Votre longitude actuelle |

### Quand mettre à jour

La mise à jour GPS peut être envoyée **à tout moment** tant que vous êtes le livreur assigné, quel que soit le statut de la livraison (ASSIGNED, PICKUP_IN_PROGRESS, IN_TRANSIT, DELIVERED).

### Qui peut voir ma position ?

- Le **client** (mécanicien ou propriétaire) via le suivi de livraison
- L'**administrateur** de la plateforme

---

## 10. Historique des livraisons

### Où consulter l'historique

Sur votre tableau de bord (`/rider`), la section **"Historique"** affiche vos 10 dernières livraisons terminées.

### Informations affichées

| Information | Description |
|-------------|-------------|
| **Statut** | Livrée ou Confirmée |
| **Montant** | Montant total de la commande en FCFA |
| **Articles** | Noms des pièces livrées |

### Livraisons terminées

Une livraison est considérée terminée lorsqu'elle atteint le statut :
- **DELIVERED** — Livrée (vous avez confirmé la livraison)
- **CONFIRMED** — Confirmée (le client a confirmé la réception)

---

## 11. Avis clients sur vos livraisons

### Qui peut vous évaluer ?

Seul l'**initiateur de la commande** (le mécanicien qui a créé la commande) peut évaluer votre livraison.

### Conditions

- La livraison doit être au statut **DELIVERED** ou **CONFIRMED**
- Un seul avis par livraison

### Format des avis

| Champ | Règle |
|-------|-------|
| **Note** | 1 à 5 étoiles |
| **Commentaire** | Jusqu'à 1 000 caractères (optionnel) |

### Consulter vos avis

Vos avis sont **publics**. N'importe qui peut les consulter via l'endpoint `/api/v1/reviews/rider/:riderId` :

- Liste des 50 avis les plus récents
- **Note moyenne** (arrondie à 1 décimale)
- **Nombre total** d'avis

### Impact sur votre activité

Une bonne note renforce la confiance des clients et des administrateurs. Les administrateurs peuvent consulter vos avis pour décider des assignations futures.

---

## 12. Notifications

### Notification d'assignation

Lorsqu'un administrateur vous assigne une livraison, vous recevez une notification WhatsApp :

> *"Nouvelle livraison {ID sur 8 caractères} assignée. Récupérez à : {adresse de ramassage}"*

### Préférences de notification

| Canal | Statut | Par défaut |
|-------|--------|-----------|
| **WhatsApp** | Actif | ✅ Activé |
| **SMS** | Non disponible | ❌ Désactivé |
| **Push** | Non disponible | ❌ Désactivé |

Vous pouvez modifier vos préférences de notification à tout moment via les paramètres.

---

## 13. Profil et gestion du compte

### Page profil

**Page :** `/profile`

Votre profil affiche :
- **Numéro de téléphone** (masqué : +225 07 ** ** XX XX)
- **Rôles** : Livreur affiché en bleu si actif
- **Contexte actif** : Le rôle actuellement sélectionné

### Changement de contexte

Si vous avez plusieurs rôles, basculez entre eux via le bouton de changement de contexte. Le changement est immédiat.

### Données personnelles

**Page :** `/profile/data`

Conformément à la loi ARTCI, vous pouvez :
- Consulter votre numéro de téléphone (non masqué)
- Voir vos rôles et contexte actif
- Voir la date de consentement et de création du compte
- **Demander la suppression** de vos données personnelles

### Déconnexion

Le bouton **"Se déconnecter"** termine votre session.

---

## 14. Cycle de vie complet d'une livraison

Voici le parcours complet d'une livraison du point de vue du livreur :

```
PRÉPARATION (par l'administrateur)
┌──────────────────────┐
│ PENDING_ASSIGNMENT   │ L'admin crée la livraison pour une commande confirmée
└────┬─────────────────┘
     │ L'admin vous assigne
     │ 🔔 Vous recevez la notification WhatsApp
     ▼
ÉTAPE 1 : Assignation
┌────────────┐
│  ASSIGNED  │ La livraison apparaît dans votre tableau de bord
└────┬───────┘
     │ ★ Vous appuyez sur "Démarrer le ramassage"
     ▼
ÉTAPE 2 : Ramassage
┌──────────────────────┐
│ PICKUP_IN_PROGRESS   │ Vous êtes en route vers la boutique du vendeur
└────┬─────────────────┘
     │ Vous récupérez la pièce chez le vendeur
     │ ★ Vous appuyez sur "Pièce récupérée — En route"
     │ → pickedUpAt enregistré
     ▼
ÉTAPE 3 : En transit
┌────────────┐
│ IN_TRANSIT │ Vous transportez la pièce vers le client
└────┬───────┘
     │
     ├─── ★ "Confirmer la livraison" (client présent)
     │    → deliveredAt enregistré
     │
     ├─── ★ "Client absent" (client pas là)
     │    → clientAbsent = true (statut inchangé)
     │    → tentez à nouveau plus tard
     │
     ▼
ÉTAPE 4 : Livré
┌───────────┐
│ DELIVERED │ ✅ Mission accomplie
└────┬──────┘
     │ Le client confirme la réception (ou auto-confirmation 48h)
     ▼
┌───────────┐
│ CONFIRMED │ Fonds escrow libérés au vendeur 💰
└───────────┘
```

### Résumé de vos actions

| Étape | Votre action | Bouton |
|-------|-------------|--------|
| Assignation reçue | Consultez les détails | Appuyez sur la carte |
| En route vers vendeur | Signalez votre départ | "Démarrer le ramassage" |
| Pièce récupérée | Signalez la collecte | "Pièce récupérée — En route" |
| Client présent | Confirmez la livraison | "Confirmer la livraison" |
| Client absent | Signalez l'absence | "Client absent" |
| Livraison COD | Collectez les espèces | Avant de confirmer |

---

## 15. Zone de couverture

### Les 13 communes du District d'Abidjan

Pièces couvre actuellement les 13 communes d'Abidjan :

| # | Commune |
|---|---------|
| 1 | Abobo |
| 2 | Adjamé |
| 3 | Anyama |
| 4 | Attécoubé |
| 5 | Bingerville |
| 6 | Cocody |
| 7 | Koumassi |
| 8 | Marcory |
| 9 | Plateau |
| 10 | Port-Bouët |
| 11 | Songon |
| 12 | Treichville |
| 13 | Yopougon |

Les vendeurs configurent leurs propres zones de livraison parmi ces communes. Vos livraisons seront toujours à l'intérieur de cette zone géographique.

---

## 16. Modes de livraison

| Mode | Description | Quand l'utiliser |
|------|-------------|-----------------|
| **EXPRESS** | Livraison rapide, prioritaire | Commandes urgentes |
| **STANDARD** | Livraison normale | Commandes classiques |

Le mode est défini par l'administrateur lors de la création de la livraison. Il est affiché sous forme de badge sur votre tableau de bord et sur la page de détail.

---

## 17. Référence rapide des endpoints

### Endpoints livreur (authentifié)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/deliveries/mine` | Lister mes livraisons |
| POST | `/api/v1/deliveries/:id/pickup` | Démarrer le ramassage |
| POST | `/api/v1/deliveries/:id/transit` | Pièce récupérée, en route |
| POST | `/api/v1/deliveries/:id/deliver` | Confirmer la livraison |
| POST | `/api/v1/deliveries/:id/client-absent` | Signaler client absent |
| POST | `/api/v1/deliveries/:id/location` | Mettre à jour position GPS |

### Endpoints publics

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/deliveries/order/:orderId` | Suivi d'une livraison par commande |
| GET | `/api/v1/reviews/rider/:riderId` | Consulter mes avis (public) |

### Endpoints profil (authentifié)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/users/me` | Mon profil |
| PATCH | `/api/v1/users/me/context` | Changer de rôle actif |
| GET | `/api/v1/users/me/data` | Mes données personnelles |
| POST | `/api/v1/users/me/data/deletion-request` | Demander suppression |
| GET | `/api/v1/notifications/preferences` | Mes préférences de notification |
| PUT | `/api/v1/notifications/preferences` | Modifier mes notifications |

### Codes d'erreur fréquents

| Code | HTTP | Signification |
|------|------|--------------|
| `DELIVERY_NOT_FOUND` | 404 | Livraison introuvable ou non assignée à vous |
| `DELIVERY_INVALID_STATUS` | 400 | Action incompatible avec le statut actuel |
| `DELIVERY_ALREADY_ASSIGNED` | 400 | Livraison déjà assignée à un livreur |
| `AUTH_MISSING_TOKEN` | 401 | Token d'authentification manquant |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Rôle insuffisant pour cette action |
| `CONSENT_REQUIRED` | 403 | Consentement ARTCI non donné |

---

## 18. FAQ livreur

### Q1 : Comment devenir livreur sur Pièces ?

Le rôle Livreur est attribué par un **administrateur**. Contactez l'équipe Pièces pour demander l'activation de votre rôle Livreur. Votre compte doit d'abord être créé (connexion par téléphone), puis l'administrateur ajoute le rôle RIDER à votre profil.

### Q2 : Comment accéder à mon tableau de bord livreur ?

Naviguez vers **`/rider`** dans votre navigateur. Assurez-vous que votre contexte actif est bien **Livreur** (vérifiable sur la page Profil).

### Q3 : Puis-je refuser une livraison assignée ?

Le système ne prévoit pas de fonction de refus. Si vous ne pouvez pas effectuer une livraison, contactez l'administrateur qui pourra la réassigner.

### Q4 : Que faire si le client est absent ?

Appuyez sur **"Client absent"** sur la page de détail de la livraison. Le drapeau est enregistré et l'administrateur en est informé. Vous restez en statut IN_TRANSIT et pourrez retenter la livraison ultérieurement.

### Q5 : Comment collecter le paiement COD ?

Le montant à collecter est affiché en gros caractères verts sur la page de détail. Collectez le montant exact en **espèces** avant de confirmer la livraison. Le montant maximum autorisé en COD est de **75 000 FCFA**.

### Q6 : Puis-je voir ma position sur une carte ?

La fonctionnalité de carte n'est pas encore disponible dans l'application. Vous pouvez copier l'adresse affichée et l'utiliser dans Google Maps ou toute autre application de navigation.

### Q7 : Comment sont calculés mes avis ?

Les mécaniciens (initiateurs de commande) peuvent vous évaluer de 1 à 5 étoiles après livraison. Votre note moyenne est calculée automatiquement et arrondie à 1 décimale. Les avis sont publics et visibles par tous.

### Q8 : Que se passe-t-il si je me trompe de bouton ?

Les transitions sont **irréversibles**. Si vous confirmez une livraison par erreur, contactez l'administrateur. Vérifiez toujours le bouton avant d'appuyer.

### Q9 : Puis-je avoir d'autres rôles en plus de Livreur ?

Oui. Vous pouvez avoir plusieurs rôles (ex : Livreur + Mécanicien). Utilisez le changement de contexte sur la page Profil pour basculer entre vos rôles.

### Q10 : Comment être prévenu d'une nouvelle livraison ?

Vous recevez une **notification WhatsApp** à chaque nouvelle assignation, avec l'adresse de collecte. Assurez-vous que WhatsApp est activé dans vos préférences de notification (activé par défaut).

### Q11 : Quelle zone géographique est couverte ?

Actuellement, Pièces couvre les **13 communes du District d'Abidjan**. Toutes vos livraisons seront dans cette zone géographique.

### Q12 : Comment fonctionne le suivi GPS ?

Votre position GPS (latitude, longitude) peut être envoyée à la plateforme pour que les clients et l'administrateur suivent votre progression en temps réel. La mise à jour se fait via l'endpoint `/api/v1/deliveries/:id/location`.

---

*Document généré le 2026-03-01 — Pièces v1.0*
