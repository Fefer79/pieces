# Manuel d'utilisation — Visiteur non connecté Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Qui est le visiteur non connecté ?](#1-qui-est-le-visiteur-non-connecté-)
2. [Pages accessibles sans compte](#2-pages-accessibles-sans-compte)
3. [Page d'accueil](#3-page-daccueil)
4. [Page de connexion / inscription](#4-page-de-connexion--inscription)
5. [Recevoir un lien de commande (flux propriétaire)](#5-recevoir-un-lien-de-commande-flux-propriétaire)
6. [Consulter une commande partagée](#6-consulter-une-commande-partagée)
7. [Payer une commande sans compte](#7-payer-une-commande-sans-compte)
8. [Annuler une commande partagée](#8-annuler-une-commande-partagée)
9. [Suivre une livraison](#9-suivre-une-livraison)
10. [Consulter les avis vendeurs](#10-consulter-les-avis-vendeurs)
11. [Consulter les avis livreurs](#11-consulter-les-avis-livreurs)
12. [API publiques : catalogue et recherche](#12-api-publiques--catalogue-et-recherche)
13. [API publique : identification photo IA](#13-api-publique--identification-photo-ia)
14. [API publique : décodage VIN](#14-api-publique--décodage-vin)
15. [PWA et installation](#15-pwa-et-installation)
16. [Architecture : pages publiques vs protégées](#16-architecture--pages-publiques-vs-protégées)
17. [Créer un compte](#17-créer-un-compte)
18. [Ce que vous ne pouvez PAS faire sans compte](#18-ce-que-vous-ne-pouvez-pas-faire-sans-compte)
19. [Référence rapide](#19-référence-rapide)
20. [FAQ visiteur](#20-faq-visiteur)

---

## 1. Qui est le visiteur non connecté ?

Le **visiteur non connecté** est toute personne qui accède à Pièces **sans avoir créé de compte ou sans être connecté**. Il existe deux profils principaux :

### Profil 1 : Le curieux

Quelqu'un qui découvre Pièces pour la première fois et souhaite comprendre la plateforme avant de s'inscrire.

### Profil 2 : Le propriétaire de véhicule

Un propriétaire de véhicule qui reçoit un **lien de paiement** de son mécanicien par WhatsApp ou SMS. Il n'a pas besoin de créer un compte pour payer.

```
VOTRE MÉCANICIEN                    VOUS (Visiteur)

Trouve les pièces                   Recevez un lien
sur Pièces                          par WhatsApp/SMS
       │                                 │
       ├──── Envoie le lien ────────────►│
       │                                 │
       │                         ★ Ouvrez le lien ★
       │                         Pas de compte nécessaire
       │                         Voyez les détails
       │                         Choisissez le paiement
       │                                 │
       │                         ★ Payez ★
       │                         Orange Money / MTN /
       │                         Wave / Espèces
       │                                 │
       │◄──── Livraison ───────────────  │
       │                                 │
  Reçoit les pièces              Commande terminée
```

**C'est la force de Pièces :** le propriétaire du véhicule peut payer **sans jamais créer de compte**.

---

## 2. Pages accessibles sans compte

Le middleware de l'application définit les chemins publics :

```
Pages publiques (aucune authentification requise) :
─────────────────────────────────────────────────
  /                    → Page d'accueil
  /login               → Page de connexion
  /login/otp           → Vérification du code OTP
  /choose/[shareToken] → Page de paiement partagée
```

**Toutes les autres pages** redirigent automatiquement vers `/login`.

---

## 3. Page d'accueil

### Ce que vous voyez

En accédant à **pieces.ci**, vous arrivez sur la page d'accueil :

```
┌─────────────────────────────────────┐
│                                     │
│             Pièces                  │
│                                     │
│   Marketplace pièces auto           │
│        — Côte d'Ivoire              │
│                                     │
│                                     │
│        [ Se connecter ]             │
│                                     │
└─────────────────────────────────────┘
```

La page d'accueil est une **page vitrine simple** avec :
- Le nom de la plateforme : **Pièces**
- Le descriptif : Marketplace pièces auto — Côte d'Ivoire
- Un bouton pour se connecter ou s'inscrire

### Note technique

La page d'accueil ne montre **pas de catalogue** ni de résultats de recherche. Pour parcourir le catalogue via l'interface, vous devez créer un compte (gratuit).

---

## 4. Page de connexion / inscription

### Accès

URL : `/login`

### Fonctionnement

La connexion et l'inscription utilisent le même flux :

```
Étape 1                    Étape 2                    Résultat
─────────                  ─────────                  ────────
Entrez votre               Recevez un code            Connecté !
numéro de téléphone        OTP par SMS                (ou compte créé
ivoirien                   et saisissez-le            automatiquement)
```

1. Entrez votre numéro de téléphone (format : +225 07 XX XX XX XX)
2. Appuyez sur **"Envoyer le code"**
3. Recevez un **code OTP à 6 chiffres** par SMS
4. Saisissez le code sur la page `/login/otp`
5. Si le numéro est nouveau → un compte est **créé automatiquement** (rôle MECHANIC)
6. Si le numéro existe déjà → vous êtes **connecté** à votre compte

### Protection anti-abus

| Mesure | Limite |
|--------|--------|
| OTP par minute par IP | 5 maximum |

### Endpoints API

```
POST /api/v1/auth/otp      — Envoyer le code OTP
Body: { "phone": "+2250700000000" }

POST /api/v1/auth/verify    — Vérifier le code OTP
Body: { "phone": "+2250700000000", "token": "123456" }
```

---

## 5. Recevoir un lien de commande (flux propriétaire)

### Le scénario typique

1. Votre mécanicien utilise Pièces pour trouver les pièces de votre véhicule
2. Il crée une commande avec les pièces nécessaires
3. Il génère un **lien de paiement** (shareToken)
4. Il vous envoie ce lien par **WhatsApp** ou **SMS**

### Le lien ressemble à :

```
https://pieces.ci/choose/abc123xyz789
```

### Ce qui se passe quand vous ouvrez le lien

- **Pas de redirection vers la page de connexion** — le lien est public
- Vous voyez directement le **détail de la commande**
- Vous pouvez **payer** ou **annuler** sans créer de compte

---

## 6. Consulter une commande partagée

### Page de choix de paiement

URL : `/choose/[shareToken]`

En ouvrant le lien partagé, vous voyez :

```
┌─────────────────────────────────────┐
│  COMMANDE #12345                    │
│  Statut : En attente de paiement   │
│                                     │
│  PIÈCES COMMANDÉES                  │
│  ─────────────────                  │
│  Alternateur Toyota Corolla 2017    │
│  Vendeur : Auto Parts Abidjan      │
│  Prix : 45 000 FCFA                │
│                                     │
│  Filtre à huile Toyota             │
│  Vendeur : Pièces Express          │
│  Prix : 8 500 FCFA                 │
│                                     │
│  MAIN D'ŒUVRE (mécanicien)          │
│  15 000 FCFA                        │
│                                     │
│  LIVRAISON                          │
│  5 000 FCFA                         │
│                                     │
│  ─────────────────────────────────  │
│  TOTAL : 73 500 FCFA               │
│                                     │
│  CHOISIR LE PAIEMENT :              │
│  ○ Orange Money                     │
│  ○ MTN MoMo                         │
│  ○ Wave                             │
│  ○ Espèces à la livraison          │
│                                     │
│  [ PAYER 73 500 FCFA ]              │
│                                     │
│  [ Annuler la commande ]            │
└─────────────────────────────────────┘
```

### Informations visibles

| Élément | Détail |
|---------|--------|
| Numéro de commande | Identifiant unique |
| Statut | État actuel (DRAFT, PAID, etc.) |
| Liste des pièces | Nom, vendeur, prix unitaire |
| Main d'œuvre | Frais du mécanicien (si ajoutés) |
| Livraison | Frais de livraison |
| Total | Montant total à payer |
| Méthodes de paiement | 4 options disponibles |

### États affichés selon le statut

| Statut | Ce que vous voyez |
|--------|-------------------|
| **DRAFT** | Formulaire de paiement + bouton "Payer" |
| **PENDING_PAYMENT** | En attente de confirmation du paiement mobile |
| **PAID** | "Payé — en attente de confirmation vendeur" |
| **VENDOR_CONFIRMED** | "Le vendeur prépare votre commande" |
| **DISPATCHED** | "Un livreur est en route" |
| **IN_TRANSIT** | "Livraison en cours" |
| **DELIVERED** | "Livré" |
| **CONFIRMED / COMPLETED** | "Commande terminée" |

### Endpoint API

```
GET /api/v1/orders/share/{shareToken}
→ Retourne le détail complet de la commande (AUCUNE AUTH REQUISE)
```

---

## 7. Payer une commande sans compte

### 4 méthodes de paiement disponibles

| Méthode | Type | Condition |
|---------|------|-----------|
| **Orange Money** | Mobile Money | Aucune |
| **MTN MoMo** | Mobile Money | Aucune |
| **Wave** | Mobile Money | Aucune |
| **Espèces (COD)** | À la livraison | Total ≤ 75 000 FCFA |

### Payer par Mobile Money

1. Sélectionnez Orange Money, MTN MoMo ou Wave
2. Vous êtes redirigé vers l'interface **CinetPay**
3. Confirmez le paiement depuis votre téléphone
4. Le paiement est validé automatiquement
5. La page se met à jour : statut **PAID**

### Payer en espèces (COD)

1. Sélectionnez **"Espèces à la livraison"** (disponible uniquement si total ≤ 75 000 FCFA)
2. La commande passe en statut **PAID** (engagement COD)
3. Préparez le montant exact
4. Payez le livreur à la réception des pièces

### Protection escrow

Que vous payiez par Mobile Money ou en espèces, vos fonds sont **protégés par le système escrow** :

```
Votre paiement ──► Fonds BLOQUÉS (HELD) ──► Livraison ──► Fonds LIBÉRÉS (RELEASED)
                                                │
                                          Si problème
                                                │
                                         ──► REMBOURSÉ (REFUNDED)
```

### Endpoint API

```
POST /api/v1/orders/{orderId}/pay
Body: { "paymentMethod": "ORANGE_MONEY" }
→ AUCUNE AUTHENTIFICATION REQUISE
```

---

## 8. Annuler une commande partagée

### Quand est-ce possible ?

Vous pouvez annuler une commande partagée tant qu'elle est en statut **DRAFT** (avant le paiement).

### Comment annuler

1. Ouvrez le lien de la commande
2. Appuyez sur **"Annuler la commande"**
3. La commande passe en statut **CANCELLED**

### Endpoint API

```
POST /api/v1/orders/{orderId}/cancel
→ AUCUNE AUTHENTIFICATION REQUISE
```

**Attention :** Une fois la commande payée et le vendeur ayant confirmé, l'annulation n'est plus possible via ce bouton. Il faudra ouvrir un litige (nécessite un compte).

---

## 9. Suivre une livraison

### Accès public au suivi

Le suivi de livraison est **accessible sans authentification**. Si vous connaissez l'identifiant de la commande, vous pouvez vérifier l'état de la livraison.

### Informations de suivi

| Information | Détail |
|-------------|--------|
| Statut livraison | ASSIGNED, PICKUP_IN_PROGRESS, IN_TRANSIT, DELIVERED |
| Position du livreur | Dernière position GPS connue |
| Historique | Horodatage de chaque étape |

### Endpoint API

```
GET /api/v1/deliveries/order/{orderId}
→ AUCUNE AUTHENTIFICATION REQUISE
→ Retourne le statut de livraison et les mises à jour de position
```

---

## 10. Consulter les avis vendeurs

### Accès public

Les avis sur les vendeurs sont **publics** et consultables sans compte.

### Informations disponibles

| Information | Détail |
|-------------|--------|
| Note moyenne | Moyenne des étoiles (1 à 5) |
| Nombre d'avis | Total des évaluations reçues |
| Liste des avis | Note + commentaire + date |

### Endpoint API

```
GET /api/v1/reviews/vendor/{vendorId}
→ AUCUNE AUTHENTIFICATION REQUISE
→ Retourne la note moyenne et la liste des avis
```

---

## 11. Consulter les avis livreurs

### Accès public

Les avis sur les livreurs sont également **publics**.

### Endpoint API

```
GET /api/v1/reviews/rider/{riderId}
→ AUCUNE AUTHENTIFICATION REQUISE
→ Retourne la note moyenne et la liste des avis
```

---

## 12. API publiques : catalogue et recherche

### Architecture importante

Les **pages web** de navigation du catalogue (`/browse`, `/browse/photo`, `/browse/vin`) nécessitent une connexion. Cependant, les **endpoints API** correspondants sont **entièrement publics**.

Cela signifie qu'un développeur ou une application tierce peut interroger le catalogue Pièces sans authentification.

### Endpoints catalogue publics

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/browse/brands` | Liste de toutes les marques disponibles |
| `GET /api/v1/browse/brands/{brand}/models` | Modèles pour une marque |
| `GET /api/v1/browse/brands/{brand}/models/{model}/years` | Années disponibles |
| `GET /api/v1/browse/categories` | Toutes les catégories de pièces |
| `GET /api/v1/browse/parts` | Parcourir les pièces avec filtres |
| `GET /api/v1/browse/search?q={terme}` | Recherche textuelle |

### Exemple : rechercher des pièces

```
GET /api/v1/browse/search?q=alternateur&category=Electricite&page=1&limit=20

Réponse :
{
  "items": [
    {
      "id": "...",
      "name": "Alternateur Toyota Corolla 2017",
      "category": "Electricité",
      "price": 45000,
      "currency": "XOF",
      "vendorShopName": "Auto Parts Abidjan",
      "thumbnail": "https://...",
      "oemReference": "27060-0T010",
      "vehicleCompatibility": "Toyota Corolla 2015-2020"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

### Exemple : parcourir par véhicule

```
GET /api/v1/browse/parts?brand=Toyota&model=Corolla&year=2017&category=Moteur

→ Retourne toutes les pièces moteur compatibles Toyota Corolla 2017
```

### Fonctionnalités de recherche

- Recherche **trigram** PostgreSQL (pg_trgm) pour la tolérance aux fautes de frappe
- **Synonymes** de recherche pour les termes courants
- Filtrage par catégorie
- Pagination (page + limit)
- Seules les pièces **publiées** (`status: PUBLISHED`) et **en stock** (`inStock: true`) de vendeurs **actifs** (`vendor.status: ACTIVE`) sont retournées

---

## 13. API publique : identification photo IA

### Identification de pièce par photo

L'endpoint d'identification par photo est **public** (aucune authentification requise).

**Note :** La page web `/browse/photo` nécessite une connexion, mais l'API elle-même est accessible sans compte.

### Comment utiliser l'API

```
POST /api/v1/vision/identify
Content-Type: multipart/form-data

Champs :
  image: [fichier JPG/PNG/WebP, max 5 Mo]

Réponse (confiance haute ≥ 70%) :
{
  "status": "identified",
  "confidence": 0.85,
  "partName": "Alternateur",
  "category": "Electricité",
  "oemReference": "27060-0T010",
  "suggestedPrice": 45000,
  "matchingParts": [...]
}

Réponse (confiance moyenne 30-70%) :
{
  "status": "disambiguation",
  "confidence": 0.52,
  "candidates": [
    { "category": "Alternateur" },
    { "category": "Démarreur" },
    { "category": "Compresseur clim" },
    { "category": "Pompe direction" }
  ]
}

Réponse (confiance basse < 30%) :
{
  "status": "failed",
  "confidence": 0.15,
  "message": "Identification impossible"
}
```

### Désambiguïsation

Si l'IA propose plusieurs catégories (status: disambiguation), l'utilisateur peut préciser :

```
POST /api/v1/vision/disambiguate
Body: { "category": "Alternateur", "brand": "Toyota" }
→ AUCUNE AUTHENTIFICATION REQUISE
```

---

## 14. API publique : décodage VIN

### Décoder un numéro VIN

L'endpoint de décodage VIN est **public**.

**Note :** La page web `/browse/vin` nécessite une connexion, mais l'API elle-même est accessible sans compte.

### Comment utiliser l'API

```
POST /api/v1/browse/vin-decode
Body: { "vin": "JTDKN3DU5A0123456" }

Réponse (succès) :
{
  "decoded": true,
  "make": "Toyota",
  "model": "Corolla",
  "year": 2017
}

Réponse (échec) :
{
  "decoded": false,
  "message": "VIN non reconnu"
}
```

### Fournisseur

Le décodage utilise l'API **NHTSA VPIC** (National Highway Traffic Safety Administration, USA).

**Limitation :** Les véhicules importés d'Europe ou d'Asie qui n'ont pas de VIN nord-américain peuvent ne pas être reconnus.

---

## 15. PWA et installation

### Qu'est-ce qu'une PWA ?

Pièces est une **Progressive Web App** (PWA), une application web qui peut s'installer sur votre téléphone comme une application native.

### Informations de l'application

| Propriété | Valeur |
|-----------|--------|
| Nom complet | Pièces — Marketplace Pièces Auto |
| Nom court | Pièces |
| URL de démarrage | `/` |
| Mode d'affichage | Standalone (comme une app native) |
| Couleur thème | #1976D2 (bleu) |

### Comment installer

1. Ouvrez **pieces.ci** dans votre navigateur (Chrome recommandé)
2. Le navigateur affiche une bannière : **"Ajouter à l'écran d'accueil"**
3. Appuyez sur **"Installer"** ou **"Ajouter"**
4. L'application apparaît sur votre écran d'accueil
5. Lancez-la comme n'importe quelle application

### Service Worker

Pièces utilise un **Service Worker** (Serwist) qui :
- Met en cache les fichiers de l'application pour un chargement rapide
- Permet un fonctionnement partiel hors ligne
- Active le préchargement de navigation pour des transitions fluides

### Installer sans compte

Vous pouvez installer la PWA **avant de créer un compte**. L'installation ne nécessite aucune authentification.

---

## 16. Architecture : pages publiques vs protégées

### Comment fonctionne la protection

Le middleware Next.js vérifie chaque requête :

```
Visiteur accède à une URL
        │
        ▼
URL dans PUBLIC_PATHS ?
( / , /login, /login/otp, /choose/[shareToken] )
        │
   ┌────┴────┐
   │ OUI     │ NON
   ▼         ▼
 Accès    Redirection
 autorisé  vers /login
```

### Pages publiques (interface web)

| Page | URL | Description |
|------|-----|-------------|
| Accueil | `/` | Page vitrine |
| Connexion | `/login` | Entrer numéro de téléphone |
| OTP | `/login/otp` | Vérifier le code SMS |
| Commande partagée | `/choose/{shareToken}` | Voir et payer une commande |

### Pages protégées (nécessitent un compte)

| Page | URL | Rôle minimum |
|------|-----|-------------|
| Parcourir | `/browse` | Connecté (MECHANIC) |
| Par véhicule | `/browse/{marque}/{modèle}` | Connecté |
| Photo IA | `/browse/photo` | Connecté |
| VIN | `/browse/vin` | Connecté |
| Mes véhicules | `/browse/vehicles` | Connecté |
| Commandes | `/orders` | Connecté |
| Profil | `/profile` | Connecté |
| Dashboard vendeur | `/vendors/dashboard` | SELLER |
| Catalogue vendeur | `/vendors/catalog` | SELLER |
| Livraisons | `/rider/delivery` | RIDER |

### Particularité architecturale

Les **API backend** sont plus ouvertes que les **pages frontend** :

| Fonctionnalité | Page web | API |
|----------------|----------|-----|
| Recherche catalogue | Connexion requise | Public |
| Navigation marque/modèle | Connexion requise | Public |
| Photo IA | Connexion requise | Public |
| Décodage VIN | Connexion requise | Public |
| Avis vendeurs | Connexion requise | Public |
| Suivi livraison | Connexion requise | Public |

Cette architecture permet les **intégrations tierces** et le flux de paiement par lien partagé, tout en encourageant la création de compte pour l'expérience complète via l'interface.

---

## 17. Créer un compte

### Pourquoi créer un compte ?

Pour accéder à l'**interface complète** de Pièces :

| Sans compte | Avec compte (gratuit) |
|-------------|----------------------|
| Page d'accueil uniquement | Catalogue complet |
| Paiement via lien partagé | Recherche texte / photo IA / VIN |
| API publiques | Garage (5 véhicules) |
| | Commandes directes |
| | Historique des commandes |
| | Évaluations vendeurs et livreurs |
| | Notifications WhatsApp/SMS/Push |
| | Litiges |

### Inscription gratuite en 2 minutes

1. Accédez à **pieces.ci/login**
2. Entrez votre numéro de téléphone
3. Recevez et saisissez le code OTP
4. **C'est tout — votre compte est créé !**

Le compte est **gratuit** et **instantané**. Aucun email, mot de passe, ou vérification d'identité n'est nécessaire pour commencer à utiliser Pièces.

### Rôle par défaut

Tout nouveau compte reçoit le rôle **MECHANIC**, qui donne accès à :
- Recherche et navigation dans le catalogue
- Commandes et paiements
- Garage (sauvegarde de véhicules)
- Évaluations et litiges

---

## 18. Ce que vous ne pouvez PAS faire sans compte

### Fonctionnalités nécessitant un compte

| Action | Rôle requis | Pourquoi |
|--------|-------------|----------|
| Parcourir le catalogue (interface) | Connecté | Middleware de l'application |
| Utiliser la recherche photo IA (interface) | Connecté | Middleware de l'application |
| Utiliser le décodage VIN (interface) | Connecté | Middleware de l'application |
| Créer une commande | MECHANIC | Traçabilité des transactions |
| Sauvegarder des véhicules | Connecté | Données liées au compte |
| Évaluer un vendeur | Connecté | Vérification de l'acheteur |
| Évaluer un livreur | Connecté | Vérification de l'acheteur |
| Ouvrir un litige | Connecté | Traçabilité et résolution |
| Voir l'historique des commandes | Connecté | Données personnelles |
| Gérer les notifications | Connecté | Préférences personnelles |

### Fonctionnalités vendeur (rôle SELLER requis)

| Action | Rôle requis |
|--------|-------------|
| Publier des pièces au catalogue | SELLER |
| Gérer le stock | SELLER |
| Configurer les zones de livraison | SELLER |
| Dashboard vendeur | SELLER |

---

## 19. Référence rapide

### Pages accessibles sans compte

| Page | URL | Description |
|------|-----|-------------|
| Accueil | `/` | Page vitrine Pièces |
| Connexion | `/login` | Entrer numéro de téléphone |
| OTP | `/login/otp` | Vérifier le code SMS |
| Commande partagée | `/choose/{token}` | Voir et payer une commande |

### API publiques (aucune authentification)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/browse/brands` | GET | Marques disponibles |
| `/api/v1/browse/brands/{brand}/models` | GET | Modèles d'une marque |
| `/api/v1/browse/brands/{brand}/models/{model}/years` | GET | Années disponibles |
| `/api/v1/browse/categories` | GET | Catégories de pièces |
| `/api/v1/browse/parts` | GET | Pièces avec filtres |
| `/api/v1/browse/search?q={terme}` | GET | Recherche textuelle |
| `/api/v1/browse/vin-decode` | POST | Décodage VIN |
| `/api/v1/vision/identify` | POST | Photo IA identification |
| `/api/v1/vision/disambiguate` | POST | Désambiguïsation IA |
| `/api/v1/orders/share/{shareToken}` | GET | Commande partagée |
| `/api/v1/orders/{orderId}/pay` | POST | Payer une commande |
| `/api/v1/orders/{orderId}/cancel` | POST | Annuler une commande |
| `/api/v1/deliveries/order/{orderId}` | GET | Suivi de livraison |
| `/api/v1/reviews/vendor/{vendorId}` | GET | Avis vendeur |
| `/api/v1/reviews/rider/{riderId}` | GET | Avis livreur |
| `/api/v1/auth/otp` | POST | Envoyer un code OTP |
| `/api/v1/auth/verify` | POST | Vérifier le code OTP |

### Limites visiteur

| Élément | Valeur |
|---------|--------|
| OTP par minute par IP | 5 maximum |
| COD maximum | 75 000 FCFA |
| Taille photo IA | 5 Mo maximum |
| Formats photo | JPG, PNG, WebP |
| VIN | 17 caractères exactement |

---

## 20. FAQ visiteur

### Q : Dois-je créer un compte pour acheter une pièce ?

**R :** Non, si votre mécanicien vous envoie un **lien de paiement**, vous pouvez payer directement sans compte. Cependant, si vous souhaitez chercher et commander des pièces vous-même, vous devez créer un compte gratuit.

### Q : Le lien de paiement est-il sécurisé ?

**R :** Oui. Le lien utilise un **token unique** (shareToken) impossible à deviner. De plus, votre paiement est protégé par le système **escrow** qui bloque les fonds jusqu'à la livraison.

### Q : Puis-je voir le catalogue sans créer de compte ?

**R :** L'interface web nécessite une connexion pour parcourir le catalogue. Cependant, les **API sont publiques** : un développeur peut interroger le catalogue sans authentification. Pour un utilisateur standard, l'inscription est gratuite et prend moins de 2 minutes.

### Q : Comment fonctionne le paiement sans compte ?

**R :** Vous recevez un lien de votre mécanicien. En l'ouvrant, vous voyez le détail de la commande et pouvez choisir parmi 4 méthodes de paiement : Orange Money, MTN MoMo, Wave ou espèces à la livraison (si total ≤ 75 000 FCFA).

### Q : Puis-je suivre ma livraison sans compte ?

**R :** Oui. Le suivi de livraison est accessible via l'API publique avec l'identifiant de votre commande. Votre mécanicien peut aussi vous partager les mises à jour.

### Q : Que se passe-t-il si la pièce est défectueuse ?

**R :** Si vous avez payé via un lien partagé sans compte, vous pouvez tout de même bénéficier de la garantie vendeur (**RETURN_48H** : retour sous 48h, **WARRANTY_30D** : garantie 30 jours). Pour ouvrir un litige formel dans l'application, vous devrez créer un compte. Contactez votre mécanicien ou le support Pièces en attendant.

### Q : Mes données sont-elles protégées sans compte ?

**R :** Oui. Pièces respecte la **Loi ARTCI n°2013-450**. Les paiements transitent par **CinetPay** (opérateur agréé). Aucune donnée de carte bancaire n'est stockée par Pièces. Le paiement par Mobile Money utilise votre propre application (Orange Money, MTN, Wave).

### Q : L'application fonctionne-t-elle sur mon téléphone ?

**R :** Pièces est une **PWA** compatible avec tous les smartphones modernes (Android et iOS). Elle fonctionne directement dans votre navigateur web (Chrome, Safari, Firefox). Vous pouvez aussi l'installer sur votre écran d'accueil sans passer par le Play Store ou l'App Store.

### Q : Pourquoi le catalogue n'est-il pas visible sur la page d'accueil ?

**R :** Pièces est conçu comme un **marketplace fermé** pour garantir la qualité des transactions. L'inscription gratuite permet de vérifier les utilisateurs et de protéger les acheteurs via le système escrow. Le flux de paiement par lien partagé est la solution pour les utilisateurs occasionnels qui ne souhaitent pas s'inscrire.

### Q : Comment contacter le support Pièces ?

**R :** Contactez le support via **WhatsApp** au numéro indiqué sur la page d'accueil, ou créez un compte pour accéder au système de litiges intégré.
