# Manuel d'utilisation — Vendeur Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Accès et connexion](#1-accès-et-connexion)
2. [Consentement ARTCI](#2-consentement-artci)
3. [Inscription vendeur (onboarding KYC)](#3-inscription-vendeur-onboarding-kyc)
4. [Signature des garanties et activation](#4-signature-des-garanties-et-activation)
5. [Tableau de bord vendeur](#5-tableau-de-bord-vendeur)
6. [Gestion du catalogue](#6-gestion-du-catalogue)
7. [Zones de livraison](#7-zones-de-livraison)
8. [Gestion des commandes](#8-gestion-des-commandes)
9. [Suivi des livraisons](#9-suivi-des-livraisons)
10. [Paiements et escrow](#10-paiements-et-escrow)
11. [Avis clients et réputation](#11-avis-clients-et-réputation)
12. [Litiges](#12-litiges)
13. [Notifications](#13-notifications)
14. [Profil et gestion du compte](#14-profil-et-gestion-du-compte)
15. [Cycle de vie complet d'une commande](#15-cycle-de-vie-complet-dune-commande)
16. [Référence rapide des endpoints](#16-référence-rapide-des-endpoints)
17. [FAQ vendeur](#17-faq-vendeur)

---

## 1. Accès et connexion

### Comment se connecter

La connexion se fait exclusivement par **numéro de téléphone ivoirien** et code OTP par SMS.

**Étapes :**

1. Ouvrir l'application Pièces sur votre navigateur mobile ou ordinateur
2. Saisir votre numéro au format **+225** suivi de 10 chiffres (ex : +2250700000000)
   - Les préfixes acceptés sont : **01**, **05**, **07**
3. Appuyer sur **"Recevoir le code"**
4. Entrer le **code à 6 chiffres** reçu par SMS
   - 6 cases individuelles s'affichent, le curseur avance automatiquement
   - Vous pouvez coller le code (copier-coller) : il se répartit automatiquement
   - La vérification se lance dès que les 6 chiffres sont saisis
5. Si le code n'arrive pas, le bouton **"Renvoyer"** apparaît après 60 secondes d'attente

### Sécurité

- **Aucun mot de passe** n'est nécessaire — l'authentification repose sur votre numéro de téléphone
- La session est gérée par cookies sécurisés (HTTP-only, SSR)
- Un token JWT Supabase est généré à chaque connexion

---

## 2. Consentement ARTCI

Lors de votre **première connexion**, un écran de consentement apparaît et bloque l'accès à l'application tant qu'il n'est pas accepté.

### Ce qui est affiché

- Référence à la **loi n°2013-450** relative à la protection des données personnelles en Côte d'Ivoire (ARTCI)
- Liste des données collectées :
  - Numéro de téléphone
  - Historique des transactions
  - Photos de pièces

### Action requise

- Appuyer sur **"J'accepte"** — il n'y a pas de bouton de refus
- Sans consentement, aucune page de l'application n'est accessible
- La date de consentement est enregistrée et consultable dans votre profil

---

## 3. Inscription vendeur (onboarding KYC)

L'inscription vendeur se fait via la page **`/onboarding/new`**. Elle peut être assistée par un agent terrain.

### Formulaire d'inscription

| Champ | Description | Règles |
|-------|-------------|--------|
| **Nom de la boutique** | Nom commercial de votre point de vente | 2 à 100 caractères, obligatoire |
| **Nom du contact** | Votre nom complet | 2 à 100 caractères, obligatoire |
| **Téléphone vendeur** | Numéro de contact professionnel | Format +225, préfixe 01/05/07, obligatoire |
| **Type de vendeur** | Choix entre deux catégories | Obligatoire |
| **Numéro du document KYC** | Identifiant officiel | 5 à 50 caractères, obligatoire |

### Types de vendeur

| Type | Description | Document KYC requis |
|------|-------------|---------------------|
| **FORMEL** | Commerce enregistré au registre du commerce | **Numéro RCCM** (Registre du Commerce et du Crédit Mobilier) |
| **INFORMEL** | Vendeur sur marché sans structure formelle | **Numéro CNI** (Carte Nationale d'Identité) ou carte de résident |

**Règle importante :** Le type de document KYC doit correspondre au type de vendeur :
- Vendeur FORMEL → obligatoirement RCCM
- Vendeur INFORMEL → obligatoirement CNI

Toute incohérence sera rejetée avec l'erreur : *"Le type KYC doit correspondre au type vendeur"*.

### Visibilité des documents

- Le **RCCM** est un document public — il sera marqué comme `isPublic: true`
- La **CNI** est un document privé — elle reste confidentielle (`isPublic: false`)

### Après l'inscription

- Votre profil vendeur est créé avec le statut **PENDING_ACTIVATION** (en attente d'activation)
- Vous ne pouvez **pas encore** publier de pièces ni recevoir de commandes
- Vous êtes redirigé vers votre profil pour procéder à la signature des garanties

---

## 4. Signature des garanties et activation

Avant de pouvoir vendre sur Pièces, vous devez signer deux garanties obligatoires qui protègent les acheteurs.

### Les deux garanties

| Garantie | Engagement |
|----------|-----------|
| **RETURN_48H** — Garantie retour pièce incorrecte | Reprise sous 48 heures, remboursement intégral si la pièce ne correspond pas |
| **WARRANTY_30D** — Garantie pièces d'occasion | Fonctionnement minimum garanti pendant 30 jours |

### Comment signer

1. Accéder à la page **Garanties** (`/vendors/guarantees`)
2. Lire les deux engagements affichés sous forme de cartes
3. Appuyer sur **"Signer les garanties et activer mon profil"**
4. Les deux garanties sont signées simultanément avec horodatage

### Résultat

- Votre statut passe de **PENDING_ACTIVATION** → **ACTIVE**
- Vous pouvez maintenant ajouter des pièces à votre catalogue
- La date de signature est affichée sur chaque garantie (format JJ/MM/AAAA)
- Les garanties signées apparaissent en vert avec la mention *"Signée le..."*

### Si vous refusez

- Un bouton **"Refuser"** est disponible — il vous ramène à votre profil
- Votre profil restera **inactif** : vous ne pourrez pas recevoir de commandes
- Vous pourrez revenir signer les garanties à tout moment

---

## 5. Tableau de bord vendeur

Le tableau de bord (`/vendors/dashboard`) est votre page d'accueil en tant que vendeur. Il affiche un résumé de votre activité.

### Indicateurs affichés

| Indicateur | Couleur | Description |
|-----------|---------|-------------|
| **Publiées** | Bleu | Nombre de fiches publiées et visibles des acheteurs |
| **Brouillons** | Ambre/Orange | Fiches en cours de préparation (non visibles) |
| **Épuisées** | Rouge | Fiches publiées mais marquées en rupture de stock |
| **Archivées** | Gris | Fiches retirées du catalogue |

Ces 4 indicateurs sont présentés en grille 2×2.

### Accès rapide

Le tableau de bord propose 3 raccourcis :

- **"Mon catalogue →"** — Accès direct à la liste de vos pièces
- **"Zones de livraison (N commune(s)) →"** — Configuration de vos zones de couverture
- **"Garanties →"** — Consultation de vos garanties signées

### Section "Commandes & paiements"

Cette section est affichée avec la mention **"Bientôt disponible"** — elle sera activée dans une prochaine mise à jour.

---

## 6. Gestion du catalogue

La gestion du catalogue est le cœur de votre activité sur Pièces. Le processus est assisté par **intelligence artificielle** : vous prenez une photo, l'IA identifie la pièce, et vous validez.

### 6.1 Ajouter une pièce (upload photo)

**Page :** `/vendors/catalog/upload`

**Prérequis :** Votre profil vendeur doit être **ACTIVE** (garanties signées).

**Étapes :**

1. Appuyer sur **"+ Ajouter"** depuis la liste du catalogue
2. Prendre une photo ou sélectionner une image depuis votre galerie
   - Sur mobile, la **caméra arrière** s'ouvre par défaut
   - Formats acceptés : **JPEG, PNG, WebP**
   - Taille maximale : **5 Mo** par photo
3. Vous pouvez sélectionner **plusieurs photos** en une fois
4. Les photos sont envoyées séquentiellement avec une barre de progression
5. Pour chaque photo uploadée :
   - L'image est stockée sur le cloud (Cloudflare R2)
   - Une **fiche brouillon** (DRAFT) est créée
   - L'IA (Google Gemini) analyse la photo en arrière-plan

**Ce que fait l'IA automatiquement :**

| Champ identifié | Exemple |
|-----------------|---------|
| Nom de la pièce | "Filtre à huile" |
| Catégorie | "Filtration" |
| Référence OEM | "90915-YZZD4" |
| Compatibilité véhicule | "Toyota Hilux 2005-2015" |
| Prix suggéré | 15 000 FCFA |
| Score de confiance | 0.85 (85%) |

**Traitement des images :**

4 variantes WebP sont générées automatiquement :
- **Miniature** (thumb) — pour les listes
- **Petite** (small) — pour les aperçus
- **Moyenne** (medium) — pour la page détail
- **Grande** (large) — pour le zoom

Un **score de qualité** photo est calculé. Si la photo est de mauvaise qualité, un avertissement s'affiche.

### 6.2 Consulter et modifier une fiche

**Page :** `/vendors/catalog/[id]`

Chaque fiche affiche l'image de la pièce et les informations identifiées par l'IA. Vous pouvez :

**Champs modifiables :**

| Champ | Description |
|-------|-------------|
| **Nom de la pièce** | Corrigez si l'IA s'est trompée |
| **Catégorie** | Parmi les 15 catégories (Freinage, Filtration, Suspension, etc.) |
| **Référence OEM** | Référence fabricant (optionnel) |
| **Compatibilité véhicule** | Marque, modèle, années (optionnel) |
| **Prix (FCFA)** | Votre prix de vente — le prix suggéré par l'IA est affiché en indication |

**Actions disponibles :**

| Action | Condition | Effet |
|--------|-----------|-------|
| **Enregistrer les modifications** | Toujours disponible | Sauvegarde les champs modifiés |
| **Publier la fiche** | Statut = DRAFT + prix défini | Passe la fiche en PUBLISHED (visible des acheteurs) |
| **Marquer épuisée** | Statut = PUBLISHED + en stock | Met `inStock = false` |
| **Remettre en stock** | Statut = PUBLISHED + épuisée | Remet `inStock = true` |

**Badges visuels :**

| Badge | Couleur | Signification |
|-------|---------|---------------|
| DRAFT | Jaune | Brouillon, non visible |
| PUBLISHED | Vert | Publié, visible |
| ARCHIVED | Gris | Archivé |
| Épuisée | Rouge | Publié mais en rupture |
| Alerte prix | Ambre | Détection de variation anormale |
| ⚠️ Qualité | — | Problème de qualité photo |

### 6.3 Liste du catalogue

**Page :** `/vendors/catalog`

La liste affiche toutes vos fiches avec des filtres :

- **Tous** — Toutes les fiches
- **Brouillon** — En attente de publication
- **Publié** — Visibles des acheteurs
- **Archivé** — Retirées

Chaque ligne affiche :
- Miniature 64×64 px (ou placeholder)
- Nom (ou *"En cours d'identification..."* si l'IA travaille encore)
- Catégorie
- Badge de statut
- Badge "Épuisée" si applicable
- Icône 🚨 si alerte prix
- Icône ⚠️ si problème de qualité photo
- Prix vendeur ou prix IA suggéré (libellé "suggéré")

**Pagination :** Affichage "Page X / Y — N pièces"

### 6.4 Les 15 catégories de pièces

| # | Catégorie |
|---|-----------|
| 1 | Freinage |
| 2 | Filtration |
| 3 | Suspension |
| 4 | Embrayage |
| 5 | Distribution |
| 6 | Allumage |
| 7 | Éclairage |
| 8 | Refroidissement |
| 9 | Échappement |
| 10 | Direction |
| 11 | Transmission |
| 12 | Carrosserie |
| 13 | Électrique |
| 14 | Moteur |
| 15 | Accessoires |

### 6.5 Protection anti-fraude (bait-and-switch)

Le système surveille les variations de prix suspectes. Si vous modifiez le prix d'une fiche **publiée** de plus de **50 %** en moins d'**une heure**, un drapeau d'alerte est levé :

- L'icône 🚨 apparaît sur la fiche
- L'événement est journalisé avec les prix ancien/nouveau et le pourcentage de variation
- Les administrateurs peuvent consulter ces alertes

---

## 7. Zones de livraison

**Page :** `/vendors/delivery-zones`

Vous devez configurer les communes d'Abidjan que vous acceptez de desservir.

### Les 13 communes du District d'Abidjan

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

### Comment configurer

1. Cocher les communes où vous acceptez la livraison
2. Utilisez **"Tout Abidjan"** pour sélectionner/désélectionner toutes les communes en un clic
3. Appuyer sur **"Enregistrer (N commune(s))"**
4. Le message *"Zones mises à jour avec succès."* s'affiche pendant 3 secondes

**Règle :** Au moins une commune doit être sélectionnée.

Le nombre de communes configurées apparaît sur votre tableau de bord.

---

## 8. Gestion des commandes

### Réception d'une commande

Lorsqu'un mécanicien passe commande avec une ou plusieurs de vos pièces :

1. Vous recevez une **notification WhatsApp** :
   > *"Nouvelle commande {ID} : {N} pièce(s). Confirmez dans les 45 minutes."*

2. La commande est au statut **PAID** (payée par le propriétaire du véhicule)

### Confirmer une commande

**Délai recommandé : 45 minutes** après réception de la notification.

Pour confirmer :
- Accéder à la commande via son identifiant
- La commande passe au statut **VENDOR_CONFIRMED**
- La date de confirmation est enregistrée (`vendorConfirmedAt`)
- Un événement *"Confirmé par le vendeur"* est ajouté à l'historique

### Détail d'une commande

Chaque commande affiche :

| Information | Description |
|-------------|-------------|
| **ID** | Identifiant unique (8 premiers caractères affichés) |
| **Statut** | État actuel de la commande |
| **Articles** | Liste des pièces commandées chez vous |
| **Prix unitaire** | Prix figé au moment de la commande (snapshot) |
| **Montant total** | Somme des articles + frais de livraison + main d'œuvre |
| **Méthode de paiement** | Orange Money, MTN MoMo, Wave ou COD |
| **Historique** | Journal complet de tous les événements (horodaté) |

### Informations par article

| Champ | Description |
|-------|-------------|
| `vendorShopName` | Nom de votre boutique |
| `name` | Nom de la pièce |
| `category` | Catégorie |
| `priceSnapshot` | Prix au moment de la commande |
| `quantity` | Quantité (par défaut 1) |
| `imageThumbUrl` | Miniature de la pièce |

---

## 9. Suivi des livraisons

Après votre confirmation, un administrateur crée une livraison et assigne un livreur.

### Statuts de livraison

| Statut | Description |
|--------|-------------|
| **PENDING_ASSIGNMENT** | En attente d'assignation d'un livreur |
| **ASSIGNED** | Livreur assigné |
| **PICKUP_IN_PROGRESS** | Livreur en route vers votre boutique pour récupérer la pièce |
| **IN_TRANSIT** | Pièce en cours de livraison vers le client |
| **DELIVERED** | Livraison effectuée |

### Modes de livraison

| Mode | Description |
|------|-------------|
| **EXPRESS** | Livraison rapide |
| **STANDARD** | Livraison standard |

### Suivi en temps réel

La livraison peut être suivie via les coordonnées GPS du livreur (`riderLat`, `riderLng`) qui sont mises à jour en temps réel.

### Cas du client absent

Si le client est absent à la livraison, le drapeau `clientAbsent` est activé. Le livreur suit le protocole de gestion du client absent.

### Paiement à la livraison (COD)

Si la commande est en **COD** (paiement à la livraison), le livreur collecte le montant en espèces. Le montant maximum autorisé en COD est de **75 000 FCFA**.

---

## 10. Paiements et escrow

### Système d'escrow (séquestre)

Pour protéger acheteurs et vendeurs, les paiements sont gérés via un système d'escrow :

```
Paiement acheteur
       │
       ▼
   ┌─────────┐
   │  HELD   │ ← Fonds en séquestre
   └────┬────┘
        │
   ┌────┴────────────────┐
   │                     │
   ▼                     ▼
┌──────────┐      ┌───────────┐
│ RELEASED │      │ REFUNDED  │
│ (vendeur)│      │ (acheteur)│
└──────────┘      └───────────┘
```

| Statut | Signification |
|--------|--------------|
| **HELD** | Paiement reçu, fonds retenus en séquestre |
| **RELEASED** | Fonds libérés en votre faveur après livraison réussie |
| **REFUNDED** | Fonds remboursés à l'acheteur (en cas de litige) |

### Quand les fonds sont-ils libérés ?

- **Automatiquement** : 48 heures après la livraison confirmée, si aucun litige n'est ouvert
- **Manuellement** : Par un administrateur en cas de résolution de litige en votre faveur

### Méthodes de paiement acceptées

| Méthode | Type |
|---------|------|
| **Orange Money** | Mobile money |
| **MTN MoMo** | Mobile money |
| **Wave** | Mobile money |
| **COD** | Paiement à la livraison (max 75 000 FCFA) |

### Consulter le statut escrow

Vous pouvez vérifier le statut du paiement d'une commande : montant, statut (HELD/RELEASED/REFUNDED), dates de libération ou remboursement.

---

## 11. Avis clients et réputation

### Qui peut laisser un avis ?

Seul l'**acheteur** (initiateur de la commande) peut évaluer un vendeur, et uniquement si la commande est au statut **DELIVERED**, **CONFIRMED** ou **COMPLETED**.

### Format des avis

| Champ | Règle |
|-------|-------|
| **Note** | De 1 à 5 étoiles |
| **Commentaire** | Jusqu'à 1 000 caractères (optionnel) |

### Consulter vos avis

Les avis sont **publics**. N'importe qui peut consulter vos avis via votre profil vendeur :

- Liste des 50 avis les plus récents
- **Note moyenne** calculée (arrondie à 1 décimale)
- **Nombre total** d'avis

### Impact sur votre activité

Une bonne réputation augmente la confiance des acheteurs. Les avis sont visibles par les mécaniciens lorsqu'ils parcourent le catalogue.

---

## 12. Litiges

### Ouverture d'un litige

Un litige peut être ouvert par l'**acheteur** (initiateur de la commande). En tant que vendeur, vous ne pouvez **pas** ouvrir de litige directement.

### Résolution

Les litiges sont résolus par un **administrateur** qui tranche en faveur de l'une des parties :

| Résolution | Effet |
|-----------|-------|
| **RESOLVED_BUYER** | En faveur de l'acheteur → remboursement (escrow → REFUNDED) |
| **RESOLVED_SELLER** | En faveur du vendeur → fonds libérés (escrow → RELEASED) |

### Statuts d'un litige

| Statut | Description |
|--------|-------------|
| **OPEN** | Litige ouvert par l'acheteur |
| **UNDER_REVIEW** | En cours d'examen par l'administrateur |
| **RESOLVED_BUYER** | Résolu en faveur de l'acheteur |
| **RESOLVED_SELLER** | Résolu en faveur du vendeur |
| **CLOSED** | Litige clôturé |

---

## 13. Notifications

### Notifications automatiques

| Événement | Message | Canal |
|-----------|---------|-------|
| **Nouvelle commande** | "Nouvelle commande {ID} : {N} pièce(s). Confirmez dans les 45 minutes." | WhatsApp |
| **Stock critique** | "Stock critique : "{nom}" est en rupture. Mettez à jour votre catalogue." | WhatsApp |

### Préférences de notification

Vous pouvez configurer vos canaux de notification :

| Canal | Statut | Par défaut |
|-------|--------|-----------|
| **WhatsApp** | Actif | ✅ Activé |
| **SMS** | Non disponible | ❌ Désactivé |
| **Push** | Non disponible | ❌ Désactivé |

Pour modifier vos préférences : accédez aux paramètres de notification via votre profil.

---

## 14. Profil et gestion du compte

### Page profil

**Page :** `/profile`

Votre profil affiche :
- **Numéro de téléphone** (masqué : +225 07 ** ** XX XX)
- **Rôles** : Vendeur (affiché en bleu si actif), plus d'autres rôles si vous en avez
- **Contexte actif** : Le rôle actuellement sélectionné

### Changement de contexte

Si vous avez plusieurs rôles (ex : Vendeur + Mécanicien), vous pouvez basculer entre eux :
- Un bouton par rôle non actif est affiché
- Le changement est immédiat et met à jour l'interface

### Les 6 rôles du système

| Rôle système | Libellé français |
|-------------|-----------------|
| MECHANIC | Mécanicien |
| OWNER | Propriétaire |
| SELLER | **Vendeur** |
| RIDER | Livreur |
| ADMIN | Administrateur |
| ENTERPRISE | Entreprise |

### Données personnelles

**Page :** `/profile/data`

Conformément à la réglementation ARTCI, vous pouvez consulter :
- Votre numéro de téléphone (non masqué)
- Vos rôles
- Votre contexte actif
- La date de consentement
- La date de création du compte

### Suppression des données

Vous pouvez demander la **suppression de vos données personnelles** en appuyant sur *"Demander la suppression de mes données"*. La demande est enregistrée et traitée par l'équipe.

### Déconnexion

Le bouton **"Se déconnecter"** termine votre session et vous redirige vers la page de connexion.

---

## 15. Cycle de vie complet d'une commande

Voici le parcours complet d'une commande du point de vue du vendeur :

```
ÉTAPE 1 : Création par le mécanicien
┌──────────┐
│  DRAFT   │ Le mécanicien sélectionne vos pièces et crée un panier
└────┬─────┘
     │ Lien partagé au propriétaire (WhatsApp/SMS)
     ▼
ÉTAPE 2 : Paiement par le propriétaire
┌──────────────────┐
│ PENDING_PAYMENT  │ Le propriétaire choisit sa méthode de paiement
└────┬─────────────┘
     │ Paiement mobile money confirmé (ou COD sélectionné)
     ▼
ÉTAPE 3 : Commande payée
┌──────┐
│ PAID │ ← 🔔 Vous recevez la notification WhatsApp
└──┬───┘
   │ ⏱️ SLA : Confirmez dans les 45 minutes
   ▼
ÉTAPE 4 : Votre confirmation  ★ VOTRE ACTION ★
┌────────────────────┐
│ VENDOR_CONFIRMED   │ Vous confirmez la disponibilité des pièces
└────┬───────────────┘
     │ L'admin crée la livraison et assigne un livreur
     ▼
ÉTAPE 5 : Expédition
┌────────────┐
│ DISPATCHED │ Le livreur est en route vers votre boutique
└────┬───────┘
     │ Collecte effectuée
     ▼
ÉTAPE 6 : En transit
┌────────────┐
│ IN_TRANSIT │ Le livreur transporte la pièce vers le client
└────┬───────┘
     │ Livraison effectuée
     ▼
ÉTAPE 7 : Livré
┌───────────┐
│ DELIVERED │ Le client a reçu la pièce
└────┬──────┘
     │ Confirmation par le client ou auto-confirmation (48h)
     ▼
ÉTAPE 8 : Confirmé puis complété
┌───────────┐     ┌───────────┐
│ CONFIRMED │ ──► │ COMPLETED │ → Fonds escrow libérés en votre faveur 💰
└───────────┘     └───────────┘

❌ ANNULATION possible à tout moment avant DISPATCHED
┌───────────┐
│ CANCELLED │ → Fonds escrow remboursés à l'acheteur
└───────────┘
```

### Résumé de vos actions dans le cycle

| Étape | Votre action | Délai |
|-------|-------------|-------|
| Commande reçue (PAID) | **Confirmer la commande** | 45 minutes |
| Livreur arrive (PICKUP_IN_PROGRESS) | **Préparer les pièces** pour la collecte | — |

---

## 16. Référence rapide des endpoints

### Endpoints vendeur

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/vendors` | Créer profil vendeur (onboarding) |
| GET | `/api/v1/vendors/me` | Consulter mon profil vendeur |
| POST | `/api/v1/vendors/me/signature` | Signer les garanties |
| GET | `/api/v1/vendors/me/guarantees` | Voir le statut des garanties |
| GET | `/api/v1/vendors/me/delivery-zones` | Consulter mes zones |
| PUT | `/api/v1/vendors/me/delivery-zones` | Modifier mes zones |
| GET | `/api/v1/vendors/me/dashboard` | Tableau de bord |

### Endpoints catalogue

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/catalog/items/upload` | Uploader une photo de pièce |
| GET | `/api/v1/catalog/items` | Lister mes pièces |
| GET | `/api/v1/catalog/items/:id` | Détail d'une pièce |
| PATCH | `/api/v1/catalog/items/:id` | Modifier une fiche |
| POST | `/api/v1/catalog/items/:id/publish` | Publier une fiche |
| PATCH | `/api/v1/catalog/items/:id/stock` | Changer le statut de stock |

### Endpoints commandes et paiements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/orders/:id/confirm` | Confirmer une commande |
| GET | `/api/v1/orders/:id` | Détail d'une commande |
| GET | `/api/v1/orders/:id/escrow` | Statut du paiement escrow |
| GET | `/api/v1/deliveries/order/:id` | Suivi de la livraison |

### Endpoints profil

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/reviews/vendor/:id` | Mes avis clients |
| GET | `/api/v1/notifications/preferences` | Mes préférences de notification |
| PUT | `/api/v1/notifications/preferences` | Modifier mes notifications |

### Codes d'erreur fréquents

| Code | HTTP | Signification |
|------|------|--------------|
| `VENDOR_NOT_FOUND` | 404 | Profil vendeur introuvable |
| `VENDOR_ALREADY_EXISTS` | 409 | Un profil vendeur existe déjà |
| `VENDOR_ALREADY_ACTIVE` | 409 | Les garanties sont déjà signées |
| `VENDOR_INVALID_STATUS` | 422 | Action incompatible avec le statut actuel |
| `VENDOR_INVALID_DATA` | 422 | Incohérence type vendeur / type KYC |
| `VENDOR_NOT_ACTIVE` | 403 | Profil non activé (garanties non signées) |
| `CATALOG_ITEM_NOT_FOUND` | 404 | Fiche introuvable ou non autorisée |
| `CATALOG_ITEM_NOT_DRAFT` | 422 | Seuls les brouillons peuvent être publiés |
| `CATALOG_ITEM_NOT_PUBLISHED` | 422 | Le stock ne peut être changé que sur les fiches publiées |
| `CATALOG_PRICE_REQUIRED` | 422 | Un prix est requis pour publier |
| `FILE_TOO_LARGE` | 422 | L'image dépasse 5 Mo |
| `INVALID_FILE_TYPE` | 422 | Format d'image non accepté |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Rôle insuffisant pour cette action |

---

## 17. FAQ vendeur

### Q1 : Comment devenir vendeur sur Pièces ?

Contactez un agent terrain Pièces ou accédez directement à la page d'inscription (`/onboarding/new`). Remplissez le formulaire KYC avec votre document d'identité (CNI pour les vendeurs informels, RCCM pour les commerces enregistrés), puis signez les deux garanties obligatoires pour activer votre profil.

### Q2 : Pourquoi dois-je signer des garanties ?

Les garanties protègent les acheteurs et renforcent la confiance dans la plateforme. La **garantie retour 48h** assure le remboursement si la pièce ne correspond pas. La **garantie 30 jours** garantit le fonctionnement minimum de la pièce d'occasion.

### Q3 : Comment l'IA identifie-t-elle mes pièces ?

Lorsque vous prenez une photo, notre intelligence artificielle (Google Gemini) analyse l'image pour identifier le nom, la catégorie, la référence OEM, la compatibilité véhicule et proposer un prix. Vous pouvez corriger ou compléter toutes ces informations avant de publier.

### Q4 : Que faire si l'IA se trompe ?

L'IA affiche un score de confiance. Si l'identification est incorrecte, corrigez simplement les champs sur la page de détail de la fiche avant de publier. L'IA apprend de vos corrections.

### Q5 : Pourquoi ma fiche affiche une alerte prix 🚨 ?

Le système détecte les variations de prix suspectes. Si vous changez le prix d'une fiche publiée de plus de 50 % en moins d'une heure, une alerte est déclenchée. Cela protège les acheteurs contre les pratiques de *bait-and-switch*.

### Q6 : Combien de temps ai-je pour confirmer une commande ?

Vous disposez de **45 minutes** après réception de la notification pour confirmer une commande. Au-delà, la commande risque d'être annulée.

### Q7 : Quand vais-je recevoir mon paiement ?

Les fonds sont retenus en escrow (séquestre) jusqu'à la livraison. Ils sont libérés automatiquement **48 heures** après la livraison confirmée, sauf si un litige est ouvert. En cas de litige résolu en votre faveur, les fonds sont libérés par l'administrateur.

### Q8 : Puis-je vendre en dehors d'Abidjan ?

Actuellement, Pièces couvre uniquement les **13 communes du District d'Abidjan**. La couverture géographique sera étendue dans les prochaines versions.

### Q9 : Que se passe-t-il si un client ouvre un litige ?

L'acheteur peut ouvrir un litige. Un administrateur examine la situation et tranche en votre faveur (fonds libérés) ou en faveur de l'acheteur (remboursement). Vous ne pouvez pas ouvrir de litige vous-même.

### Q10 : Comment améliorer ma note vendeur ?

- Confirmez vos commandes rapidement (dans les 45 minutes)
- Décrivez vos pièces avec précision
- Assurez-vous que les pièces correspondent à la description
- Maintenez votre stock à jour
- Respectez les garanties signées (retour 48h, fonctionnement 30j)

---

*Document généré le 2026-03-01 — Pièces v1.0*
