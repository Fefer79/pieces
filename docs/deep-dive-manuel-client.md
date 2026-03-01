# Manuel d'utilisation — Client / Acheteur particulier Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Votre rôle sur Pièces](#1-votre-rôle-sur-pièces)
2. [Inscription et connexion](#2-inscription-et-connexion)
3. [Consentement ARTCI](#3-consentement-artci)
4. [Les 4 façons de trouver une pièce](#4-les-4-façons-de-trouver-une-pièce)
5. [Recherche textuelle](#5-recherche-textuelle)
6. [Navigation par marque / modèle / année](#6-navigation-par-marque--modèle--année)
7. [Identification par photo (IA)](#7-identification-par-photo-ia)
8. [Décodage VIN](#8-décodage-vin)
9. [Gérer votre garage (mes véhicules)](#9-gérer-votre-garage-mes-véhicules)
10. [Consulter les résultats de recherche](#10-consulter-les-résultats-de-recherche)
11. [Passer une commande](#11-passer-une-commande)
12. [Choisir une méthode de paiement](#12-choisir-une-méthode-de-paiement)
13. [Payer la commande](#13-payer-la-commande)
14. [Protection escrow (séquestre)](#14-protection-escrow-séquestre)
15. [Suivi de la commande](#15-suivi-de-la-commande)
16. [Livraison](#16-livraison)
17. [Confirmer la réception](#17-confirmer-la-réception)
18. [Évaluer le vendeur](#18-évaluer-le-vendeur)
19. [Évaluer la livraison](#19-évaluer-la-livraison)
20. [Ouvrir un litige](#20-ouvrir-un-litige)
21. [Historique des commandes](#21-historique-des-commandes)
22. [Profil et préférences](#22-profil-et-préférences)
23. [Notifications](#23-notifications)
24. [Cycle de vie complet de votre commande](#24-cycle-de-vie-complet-de-votre-commande)
25. [Référence rapide](#25-référence-rapide)
26. [FAQ client](#26-faq-client)

---

## 1. Votre rôle sur Pièces

En tant que **client particulier** (acheteur individuel), vous pouvez utiliser Pièces pour trouver et acheter des pièces auto d'occasion directement auprès de vendeurs vérifiés à Abidjan.

### Deux façons d'acheter sur Pièces

**1. Achat direct (vous cherchez vous-même) :**

```
VOUS (Client)                           VENDEUR

Recherchez la pièce                     A les pièces
dans le catalogue                       en stock
       │                                    │
       ▼                                    │
Trouvez la bonne pièce                     │
au bon prix                                │
       │                                    │
       ▼                                    │
Passez la commande                         │
       │                                    │
       ├──── Notification ─────────────────►│
       │                                    │
       │                           Confirme (45 min max)
       │                                    │
       │◄──── Livraison par coursier ──────┤
       │                                    │
  Recevez la pièce                   Reçoit le paiement
```

**2. Via votre mécanicien (flux tripartite) :**

```
VOTRE MÉCANICIEN              VOUS (Client)              VENDEUR

Trouve les pièces              Reçoit le lien             A les pièces
dans le catalogue              par WhatsApp/SMS           en stock
       │                            │                         │
       ├──── Envoie le lien ───────►│                         │
       │                            │                         │
       │                    ★ Ouvre le lien ★                  │
       │                    Voit les détails                   │
       │                    + les prix                        │
       │                            │                         │
       │                    ★ Paie ★                           │
       │                            │                         │
       │◄──── Livraison ───────────┤◄────────────────────────┤
       │                            │                         │
  Reçoit les pièces          Commande terminée          Reçoit le paiement
```

**Vous n'êtes pas obligé de passer par un mécanicien.** Si vous connaissez la pièce dont vous avez besoin, vous pouvez la trouver et la commander vous-même.

---

## 2. Inscription et connexion

### 2.1 Créer votre compte

1. Accédez à **pieces.ci** depuis votre téléphone
2. Appuyez sur **"S'inscrire"**
3. Entrez votre **numéro de téléphone** ivoirien
4. Recevez un **code OTP** par SMS
5. Saisissez le code pour vérifier votre numéro
6. Renseignez votre **nom** et **email** (optionnel)
7. Acceptez le **consentement ARTCI** (obligatoire)

**Rôle par défaut :** Votre compte est créé avec le rôle MECHANIC, qui donne accès à toutes les fonctionnalités d'achat : recherche, commande, paiement, évaluations.

### 2.2 Se connecter

1. Entrez votre numéro de téléphone
2. Recevez un code OTP par SMS
3. Saisissez le code — vous êtes connecté

**Pas de mot de passe à retenir.** Chaque connexion utilise un code OTP unique envoyé par SMS.

### 2.3 Session

- Votre session est maintenue par un **token JWT**
- La session reste active tant que vous utilisez l'application
- En cas d'inactivité prolongée, reconnectez-vous avec un nouveau code OTP

---

## 3. Consentement ARTCI

Conformément à la **Loi n°2013-450** relative à la protection des données à caractère personnel en Côte d'Ivoire, vous devez donner votre consentement avant d'utiliser Pièces.

### Ce que vous acceptez

- Collecte de vos données personnelles (nom, téléphone, email)
- Géolocalisation pour la livraison
- Partage limité avec vendeurs et livreurs pour exécuter vos commandes

### Vos droits

| Droit | Description |
|-------|-------------|
| Accès | Consulter toutes vos données à tout moment |
| Rectification | Corriger vos informations |
| Suppression | Demander l'effacement de vos données |
| Opposition | Refuser certains traitements |

Le consentement est enregistré avec **horodatage et adresse IP**. Il est révocable à tout moment via les paramètres de votre compte.

---

## 4. Les 4 façons de trouver une pièce

Pièces vous offre **quatre méthodes** pour trouver la bonne pièce :

```
┌─────────────────────────────────────────────────────────────┐
│                    TROUVER UNE PIÈCE                        │
│                                                             │
│  🔍 Recherche texte    │  🚗 Marque / Modèle / Année       │
│  Tapez le nom de       │  Parcourez le catalogue            │
│  la pièce              │  par véhicule                      │
│                        │                                    │
│  📷 Photo IA           │  🔢 Code VIN                       │
│  Prenez en photo       │  Entrez le VIN de                  │
│  la pièce usagée       │  votre véhicule                    │
└─────────────────────────────────────────────────────────────┘
```

Chaque méthode vous amène aux **mêmes résultats** : une liste de pièces disponibles chez les vendeurs vérifiés d'Abidjan.

---

## 5. Recherche textuelle

### Comment ça marche

1. Accédez à la page **Parcourir** (`/browse`)
2. Tapez au moins **2 caractères** dans la barre de recherche
3. Les résultats s'affichent en temps réel

### Ce qui est recherché

La recherche couvre simultanément :
- **Nom de la pièce** (ex: "alternateur", "filtre à huile")
- **Catégorie** (ex: "freinage", "moteur")
- **Référence OEM** (ex: "04152-YZZA1")
- **Compatibilité véhicule** (ex: "Toyota Corolla")

### Gestion des fautes de frappe

Le système utilise des **synonymes de recherche** pour corriger les erreurs courantes et proposer des résultats pertinents même en cas de faute de frappe.

### Endpoint API

```
GET /api/v1/browse/search?q={votre recherche}
```

---

## 6. Navigation par marque / modèle / année

### Parcours en 3 étapes

Cette méthode est idéale si vous connaissez votre véhicule mais pas le nom exact de la pièce.

**Étape 1 — Choisir la marque :**
```
/browse → Liste des marques disponibles
Toyota, Nissan, Peugeot, Renault, Mercedes, BMW...
```

**Étape 2 — Choisir le modèle :**
```
/browse/Toyota → Liste des modèles
Corolla, Hilux, Camry, RAV4, Land Cruiser...
```

**Étape 3 — Choisir l'année :**
```
/browse/Toyota/Corolla → Liste des années
2015, 2016, 2017, 2018, 2019, 2020...
```

**Résultat :** Toutes les pièces compatibles avec votre véhicule s'affichent.

### Filtrer par catégorie

Sur la page des résultats, vous pouvez **filtrer par catégorie** :
- Moteur
- Freinage
- Suspension
- Éclairage
- Carrosserie
- Transmission
- Électricité
- etc.

### Endpoints API

```
GET /api/v1/browse/brands
GET /api/v1/browse/brands/{brand}/models
GET /api/v1/browse/brands/{brand}/models/{model}/years
GET /api/v1/browse/parts?brand={brand}&model={model}&year={year}&category={category}
```

---

## 7. Identification par photo (IA)

### La fonctionnalité phare de Pièces

Vous avez une pièce usagée et vous ne connaissez pas son nom ? Prenez-la en photo et l'**intelligence artificielle** l'identifie pour vous.

### Comment ça marche

1. Accédez à **Parcourir > Photo** (`/browse/photo`)
2. **Prenez une photo** de la pièce (ou choisissez depuis votre galerie)
3. L'IA analyse l'image (Google Gemini Vision)
4. Recevez le résultat en quelques secondes

### Formats acceptés

| Format | Taille max |
|--------|-----------|
| JPG | 5 Mo |
| PNG | 5 Mo |
| WebP | 5 Mo |

### Les 3 niveaux de confiance

**Confiance haute (≥ 70%) — Identifié :**
```
✅ "Alternateur Toyota Corolla"
   Catégorie : Électricité
   Référence OEM : 27060-0T010
   Confiance : 85%

   → Voici les pièces correspondantes dans le catalogue
```

**Confiance moyenne (30-70%) — Désambiguïsation :**
```
🟡 "Nous avons identifié plusieurs possibilités :"
   1. Alternateur
   2. Démarreur
   3. Compresseur de climatisation
   4. Pompe de direction assistée

   → Sélectionnez la bonne catégorie
```

**Confiance basse (< 30%) — Échec :**
```
❌ "Nous n'avons pas pu identifier cette pièce"
   → Essayez avec une autre photo
   → Ou utilisez la recherche textuelle
```

### Conseils pour une bonne photo

- Placez la pièce sur un **fond neutre** (table, sol propre)
- Assurez un **bon éclairage** (lumière naturelle de préférence)
- Cadrez la **pièce entière** dans la photo
- Évitez les reflets et les ombres marquées

### Endpoints API

```
POST /api/v1/vision/identify        — Envoi de la photo
POST /api/v1/vision/disambiguate    — Sélection de catégorie
```

---

## 8. Décodage VIN

### Qu'est-ce que le VIN ?

Le **VIN** (Vehicle Identification Number) est un code unique de **17 caractères** gravé sur votre véhicule. Il identifie précisément la marque, le modèle et l'année.

### Où trouver le VIN ?

- **Plaque sur le tableau de bord** (visible depuis l'extérieur, côté conducteur)
- **Montant de la porte conducteur** (étiquette)
- **Carte grise** du véhicule

### Comment utiliser le décodage VIN

1. Accédez à **Parcourir > VIN** (`/browse/vin`)
2. Entrez les **17 caractères** du VIN
3. Le système décode automatiquement : marque, modèle, année
4. Vous êtes redirigé vers les **pièces compatibles** avec votre véhicule

### Fournisseur

Le décodage utilise la base de données **NHTSA VPIC** (National Highway Traffic Safety Administration, USA).

**Note :** Les véhicules importés d'Europe ou d'Asie peuvent ne pas être reconnus par cette base. Dans ce cas, utilisez la navigation par marque/modèle/année.

### Endpoint API

```
POST /api/v1/browse/vin-decode
```

---

## 9. Gérer votre garage (mes véhicules)

### Sauvegarder vos véhicules

Enregistrez jusqu'à **5 véhicules** dans votre garage pour retrouver rapidement les pièces compatibles.

### Ajouter un véhicule

1. Accédez à **Parcourir > Mes véhicules** (`/browse/vehicles`)
2. Appuyez sur **"Ajouter un véhicule"**
3. Renseignez :
   - **Marque** (obligatoire)
   - **Modèle** (obligatoire)
   - **Année** (obligatoire)
   - **VIN** (optionnel)
4. Le véhicule apparaît dans votre garage

### Recherche rapide depuis le garage

Chaque véhicule sauvegardé affiche un bouton **"Trouver des pièces"** qui vous amène directement aux résultats filtrés pour ce véhicule.

### Limite

| Élément | Limite |
|---------|--------|
| Nombre maximum de véhicules | 5 |

### Endpoints API

```
GET    /api/v1/users/me/vehicles          — Lister vos véhicules
POST   /api/v1/users/me/vehicles          — Ajouter un véhicule
DELETE /api/v1/users/me/vehicles/{id}     — Supprimer un véhicule
```

---

## 10. Consulter les résultats de recherche

Quelle que soit la méthode de recherche utilisée, les résultats s'affichent sous forme de **liste** avec pour chaque pièce :

### Informations affichées

| Information | Exemple |
|-------------|---------|
| Nom de la pièce | Alternateur Toyota Corolla 2017 |
| Catégorie | Électricité |
| Prix | 45 000 FCFA |
| Image miniature | Photo de la pièce |
| Nom de la boutique | Auto Parts Abidjan |
| Référence OEM | 27060-0T010 (si disponible) |
| Compatibilité | Toyota Corolla 2015-2020 |

### Filtres disponibles

Sur la page de résultats par véhicule, vous pouvez filtrer par **catégorie** pour affiner les résultats.

### Garanties vendeur

Tous les vendeurs actifs sur Pièces ont signé deux garanties obligatoires :
- **RETURN_48H** : Retour possible dans les 48 heures si la pièce ne convient pas
- **WARRANTY_30D** : Garantie de fonctionnement pendant 30 jours

---

## 11. Passer une commande

### Créer une commande

1. Trouvez la pièce souhaitée dans les résultats de recherche
2. Sélectionnez la pièce
3. La commande est créée en statut **DRAFT** (brouillon)

### Contenu de la commande

| Élément | Description |
|---------|-------------|
| Pièce(s) | Nom, image, quantité |
| Prix unitaire | Verrouillé au moment de la commande (snapshot) |
| Frais de livraison | Calculés selon la zone |
| Total | Somme de tous les éléments |

### Verrouillage des prix

**Important :** Les prix sont **verrouillés** (snapshot) au moment où vous créez la commande. Même si le vendeur modifie son prix après, votre commande garde le prix initial.

### Endpoint API

```
POST /api/v1/orders/
Body: {
  items: [{ catalogItemId: "..." }]
}
```

---

## 12. Choisir une méthode de paiement

### 4 méthodes disponibles

| Méthode | Type | Condition |
|---------|------|-----------|
| **Orange Money** | Mobile Money | Aucune |
| **MTN MoMo** | Mobile Money | Aucune |
| **Wave** | Mobile Money | Aucune |
| **Espèces (COD)** | Paiement à la livraison | Total ≤ 75 000 FCFA |

### Paiement à la livraison (COD)

Le paiement en espèces à la livraison est limité à **75 000 FCFA maximum**. Au-delà de ce montant, vous devez utiliser l'une des méthodes de paiement mobile.

### Comment choisir

1. Après avoir créé votre commande, accédez à la **page de paiement**
2. Les méthodes disponibles s'affichent (COD grisé si total > 75 000 FCFA)
3. Sélectionnez votre méthode préférée
4. Confirmez le paiement

---

## 13. Payer la commande

### Paiement Mobile Money (Orange, MTN, Wave)

1. Sélectionnez la méthode de paiement mobile
2. Vous êtes redirigé vers l'interface **CinetPay**
3. Confirmez le paiement sur votre téléphone
4. Le paiement est validé automatiquement par webhook
5. La commande passe en statut **PENDING_PAYMENT** puis **PAID**

### Paiement en espèces (COD)

1. Sélectionnez **"Espèces à la livraison"**
2. La commande passe directement en statut **PAID** (engagement COD)
3. Préparez le montant exact pour le livreur
4. Payez le livreur à la réception de la pièce

### Identifiant de transaction

Chaque paiement génère un identifiant unique au format :
```
pieces_{orderId}_{timestamp}
```

### Endpoint API

```
POST /api/v1/orders/{orderId}/pay
```

---

## 14. Protection escrow (séquestre)

### Comment ça protège votre argent

Le système **escrow** (séquestre) de Pièces retient votre paiement jusqu'à la livraison :

```
VOUS PAYEZ                    ESCROW                      VENDEUR
                              (Séquestre)

Paiement envoyé ──────────► Fonds BLOQUÉS
                              (status: HELD)
                                    │
                              Livraison effectuée
                                    │
                              48h de vérification
                                    │
                              Fonds LIBÉRÉS ──────────────► Paiement reçu
                              (status: RELEASED)
```

### Les 3 états de l'escrow

| État | Signification |
|------|---------------|
| **HELD** | Vos fonds sont bloqués en attente de livraison |
| **RELEASED** | Fonds libérés au vendeur après livraison confirmée |
| **REFUNDED** | Fonds remboursés en cas d'annulation ou litige en votre faveur |

### Libération automatique

Les fonds sont **automatiquement libérés** au vendeur **48 heures après la livraison**, sauf si vous ouvrez un litige.

### Consulter l'état de l'escrow

```
GET /api/v1/payments/orders/{orderId}/escrow
```

---

## 15. Suivi de la commande

### Page de suivi

Accédez à vos commandes via l'onglet **"Commandes"** dans la barre de navigation en bas de l'écran.

### États de la commande

| État | Signification | Action requise |
|------|---------------|----------------|
| **DRAFT** | Commande en brouillon | Choisir le paiement |
| **PENDING_PAYMENT** | En attente du paiement mobile | Confirmer le paiement |
| **PAID** | Payé, en attente vendeur | Patienter |
| **VENDOR_CONFIRMED** | Le vendeur a confirmé | Patienter |
| **DISPATCHED** | Livreur assigné | Patienter |
| **IN_TRANSIT** | En cours de livraison | Préparer la réception |
| **DELIVERED** | Livré | Vérifier et confirmer |
| **CONFIRMED** | Vous avez confirmé la réception | Rien — terminé |
| **COMPLETED** | Auto-confirmé après 48h | Rien — terminé |

### Suivi de la livraison

Une fois la commande en transit, vous pouvez suivre l'état de la livraison :

```
GET /api/v1/deliveries/order/{orderId}
```

Cet endpoint est **public** (pas d'authentification requise) — vous pouvez partager le lien de suivi.

---

## 16. Livraison

### Comment ça fonctionne

1. Le vendeur confirme votre commande (SLA : 45 minutes max)
2. Un **livreur** est assigné à votre commande
3. Le livreur **récupère** la pièce chez le vendeur
4. Le livreur **livre** à l'adresse indiquée

### États de la livraison

```
ASSIGNED ─► PICKUP_IN_PROGRESS ─► IN_TRANSIT ─► DELIVERED ─► CONFIRMED
                                                     │
                                                     └─► COMPLETED (auto 48h)
```

### Client absent

Si vous n'êtes pas présent lors de la livraison :
- Le livreur marque **"Client absent"**
- Vous recevez une notification
- Une nouvelle tentative de livraison est organisée

### Zones de livraison

Les vendeurs configurent leurs zones de livraison parmi les **13 communes d'Abidjan** :
- Abobo, Adjamé, Anyama, Attécoubé, Bingerville, Cocody
- Koumassi, Marcory, Plateau, Port-Bouët, Songon, Treichville, Yopougon

**Note :** La disponibilité de la livraison dépend de la zone couverte par chaque vendeur.

---

## 17. Confirmer la réception

### Confirmation manuelle

Après réception de votre pièce :

1. Vérifiez que la pièce correspond à votre commande
2. Vérifiez l'état de la pièce (aucun dommage, fonctionnelle)
3. Confirmez la réception dans l'application

### Confirmation automatique

Si vous ne confirmez pas manuellement, la commande est **automatiquement confirmée après 48 heures**. Après la confirmation :
- Les fonds escrow sont **libérés** au vendeur
- Vous pouvez toujours évaluer le vendeur et le livreur

**Important :** Si la pièce ne correspond pas ou est défectueuse, **ouvrez un litige AVANT les 48 heures** pour bloquer la libération des fonds.

---

## 18. Évaluer le vendeur

### Quand pouvez-vous évaluer ?

Après que la commande atteint le statut **DELIVERED**, **CONFIRMED** ou **COMPLETED**.

### Comment évaluer

1. Accédez à votre commande dans l'historique
2. Appuyez sur **"Évaluer le vendeur"**
3. Donnez une note de **1 à 5 étoiles**
4. Ajoutez un **commentaire** (optionnel)

### Ce qui est évalué

- Conformité de la pièce à la description
- Qualité de la pièce
- Rapidité de confirmation (SLA 45 min)
- Communication

### Consulter les avis

Les avis sont **publics** et visibles par tous :

```
GET /api/v1/reviews/vendor/{vendorId}
```

Retourne la **note moyenne** et la liste des avis.

### Endpoint API

```
POST /api/v1/reviews/seller
Body: {
  orderId: "...",
  rating: 4,
  comment: "Pièce conforme, bon état"
}
```

---

## 19. Évaluer la livraison

### Quand pouvez-vous évaluer ?

Après que la livraison atteint le statut **DELIVERED** ou **CONFIRMED**.

### Comment évaluer

1. Accédez à votre commande dans l'historique
2. Appuyez sur **"Évaluer la livraison"**
3. Donnez une note de **1 à 5 étoiles**
4. Ajoutez un **commentaire** (optionnel)

### Ce qui est évalué

- Rapidité de livraison
- Soin de la pièce pendant le transport
- Politesse et professionnalisme du livreur
- Respect du créneau de livraison

### Consulter les avis livreur

```
GET /api/v1/reviews/rider/{riderId}
```

### Endpoint API

```
POST /api/v1/reviews/delivery
Body: {
  deliveryId: "...",
  rating: 5,
  comment: "Livraison rapide et soignée"
}
```

---

## 20. Ouvrir un litige

### Quand ouvrir un litige ?

- La pièce reçue **ne correspond pas** à la commande
- La pièce est **défectueuse** ou **endommagée**
- La pièce n'a **jamais été livrée** malgré le statut "livré"
- Le vendeur a fourni une **pièce différente** de celle commandée

### Comment ouvrir un litige

1. Accédez à votre commande
2. Appuyez sur **"Signaler un problème"**
3. Décrivez le problème en détail
4. Le litige est ouvert en statut **OPEN**

### Processus de résolution

```
OPEN ──► UNDER_REVIEW ──► RESOLVED_BUYER (remboursement)
                       └──► RESOLVED_SELLER (paiement maintenu)
                       └──► CLOSED
```

Un **administrateur Pièces** examine le litige et rend une décision :
- **RESOLVED_BUYER** : Vous recevez un remboursement via l'escrow
- **RESOLVED_SELLER** : Le paiement est maintenu au vendeur

### Délai important

**Ouvrez votre litige dans les 48 heures suivant la livraison.** Après ce délai, les fonds escrow sont automatiquement libérés au vendeur.

### Endpoint API

```
POST /api/v1/reviews/disputes
Body: {
  orderId: "...",
  reason: "Pièce non conforme à la description"
}
```

---

## 21. Historique des commandes

### Accéder à l'historique

Appuyez sur l'onglet **"Commandes"** (`/orders`) dans la barre de navigation.

### Informations affichées

Pour chaque commande :

| Information | Détail |
|-------------|--------|
| Numéro de commande | Identifiant unique |
| Date | Date de création |
| Statut | État actuel (PAID, IN_TRANSIT, DELIVERED...) |
| Pièces | Liste des articles commandés |
| Montant total | Prix total en FCFA |
| Vendeur | Nom de la boutique |
| Livraison | État de la livraison |

### Pagination

L'historique est **paginé** pour un chargement rapide, même avec un grand nombre de commandes.

---

## 22. Profil et préférences

### Accéder à votre profil

Appuyez sur l'onglet **"Profil"** (`/profile`) dans la barre de navigation.

### Informations modifiables

| Champ | Modifiable |
|-------|-----------|
| Nom | Oui |
| Téléphone | Non (identifiant du compte) |
| Email | Oui |
| Rôle actif | Oui (si multi-rôle) |

### Changement de contexte

Si votre compte possède plusieurs rôles (ex: MECHANIC + SELLER), vous pouvez **basculer** entre les différentes vues :

```
PATCH /api/v1/users/me/context
Body: { activeContext: "MECHANIC" }
```

---

## 23. Notifications

### Canaux de notification

| Canal | Activé par défaut | Configurable |
|-------|-------------------|-------------|
| WhatsApp | Oui | Oui |
| SMS | Non | Oui |
| Push (PWA) | Non | Oui |

### Types de notifications reçues

| Événement | Notification |
|-----------|-------------|
| Commande confirmée par le vendeur | "Votre commande a été confirmée" |
| Livreur assigné | "Un livreur a été assigné à votre commande" |
| Livraison en cours | "Votre commande est en route" |
| Livraison effectuée | "Votre commande a été livrée" |
| Commande terminée | "Commande terminée — évaluez votre expérience" |
| Litige mis à jour | "Votre litige a été traité" |

### Gérer vos préférences

```
GET /api/v1/notifications/preferences
PUT /api/v1/notifications/preferences
Body: { whatsapp: true, sms: false, push: true }
```

---

## 24. Cycle de vie complet de votre commande

### Parcours complet de A à Z

```
1. RECHERCHE                          Vous trouvez la pièce
   (texte / marque / photo / VIN)     dans le catalogue
              │
              ▼
2. COMMANDE (DRAFT)                   Commande créée,
   Prix verrouillé (snapshot)         prix figé
              │
              ▼
3. PAIEMENT                           Orange Money / MTN /
   (PENDING_PAYMENT → PAID)           Wave / Espèces (≤75K)
              │
              ▼
4. ESCROW (HELD)                      Vos fonds sont
   Argent en séquestre                protégés
              │
              ▼
5. CONFIRMATION VENDEUR               Le vendeur confirme
   (VENDOR_CONFIRMED)                 sous 45 min max
              │
              ▼
6. EXPÉDITION                         Livreur assigné
   (DISPATCHED)                       ramassage chez vendeur
              │
              ▼
7. LIVRAISON                          Livreur en route
   (IN_TRANSIT → DELIVERED)           vers vous
              │
              ▼
8. VÉRIFICATION                       Vous vérifiez
   (Vous avez 48h)                    la pièce
              │
              ├─── Tout OK ──────► 9. CONFIRMATION
              │                       (CONFIRMED/COMPLETED)
              │                       Escrow → RELEASED
              │
              └─── Problème ──────► 10. LITIGE (OPEN)
                                       Escrow bloqué
                                       Admin examine
                                       → REFUNDED ou RELEASED
```

---

## 25. Référence rapide

### Navigation

| Page | URL | Description |
|------|-----|-------------|
| Accueil | `/` | Page d'accueil |
| Parcourir | `/browse` | Recherche textuelle |
| Par véhicule | `/browse/{marque}/{modèle}/{année}` | Navigation hiérarchique |
| Photo IA | `/browse/photo` | Identification par photo |
| VIN | `/browse/vin` | Décodage VIN |
| Mes véhicules | `/browse/vehicles` | Garage (max 5) |
| Commandes | `/orders` | Historique commandes |
| Profil | `/profile` | Informations compte |

### Limites et seuils

| Élément | Valeur |
|---------|--------|
| COD maximum | 75 000 FCFA |
| Véhicules sauvegardés | 5 maximum |
| Taille photo IA | 5 Mo maximum |
| Formats photo | JPG, PNG, WebP |
| Caractères recherche min | 2 |
| SLA confirmation vendeur | 45 minutes |
| Auto-confirmation livraison | 48 heures |
| Évaluation | 1 à 5 étoiles |
| Garantie retour | 48 heures (RETURN_48H) |
| Garantie fonctionnement | 30 jours (WARRANTY_30D) |

### Méthodes de paiement

| Méthode | Type | Limite |
|---------|------|--------|
| Orange Money | Mobile Money | Aucune |
| MTN MoMo | Mobile Money | Aucune |
| Wave | Mobile Money | Aucune |
| Espèces (COD) | À la livraison | ≤ 75 000 FCFA |

---

## 26. FAQ client

### Q : Dois-je passer par un mécanicien pour acheter une pièce ?

**R :** Non. Vous pouvez rechercher, commander et payer directement sur Pièces. Le passage par un mécanicien (flux tripartite) est optionnel — il est utile si vous ne connaissez pas la pièce exacte dont vous avez besoin.

### Q : Comment savoir si la pièce est compatible avec mon véhicule ?

**R :** Utilisez la navigation par **marque / modèle / année** ou le **décodage VIN** pour voir uniquement les pièces compatibles. Vous pouvez aussi prendre une **photo** de la pièce usagée pour que l'IA l'identifie.

### Q : Les pièces sont-elles garanties ?

**R :** Oui. Tous les vendeurs sur Pièces ont signé deux garanties obligatoires :
- **RETURN_48H** : Retour gratuit sous 48h si la pièce ne convient pas
- **WARRANTY_30D** : Garantie de fonctionnement 30 jours

### Q : Mon argent est-il protégé ?

**R :** Oui. Le système **escrow** bloque votre argent jusqu'à ce que vous confirmiez la réception de la pièce. Si un problème survient, vous pouvez ouvrir un litige et être remboursé.

### Q : Puis-je payer en espèces ?

**R :** Oui, pour les commandes de **75 000 FCFA ou moins**. Vous payez directement au livreur à la réception. Au-delà de ce montant, utilisez Orange Money, MTN MoMo ou Wave.

### Q : Combien coûte la livraison ?

**R :** Les frais de livraison sont calculés selon la zone de livraison et s'affichent avant que vous ne confirmiez votre paiement. Les prix sont transparents — pas de frais cachés.

### Q : Que faire si la pièce reçue ne correspond pas ?

**R :** Ouvrez un **litige** dans les 48 heures suivant la livraison. Un administrateur Pièces examinera votre cas. Si le litige est résolu en votre faveur, vous êtes remboursé via le système escrow. Vous pouvez aussi exercer votre droit de retour sous 48h (garantie RETURN_48H).

### Q : Puis-je annuler une commande ?

**R :** Vous pouvez annuler une commande tant qu'elle est en statut **DRAFT** ou **PENDING_PAYMENT**. Une fois que le vendeur a confirmé, l'annulation n'est plus possible — vous devrez attendre la livraison et ouvrir un litige si nécessaire.

### Q : L'application fonctionne-t-elle hors connexion ?

**R :** Pièces est une **PWA** (Progressive Web App) installable sur votre téléphone. Certaines fonctionnalités sont disponibles hors ligne, mais la recherche et les commandes nécessitent une connexion internet.

### Q : Dans quelles zones la livraison est-elle disponible ?

**R :** La livraison est disponible dans les **13 communes d'Abidjan** : Abobo, Adjamé, Anyama, Attécoubé, Bingerville, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Songon, Treichville et Yopougon. La couverture dépend des zones configurées par chaque vendeur.

### Q : Puis-je contacter le vendeur directement ?

**R :** Non, les échanges passent par la plateforme Pièces pour garantir la traçabilité et la protection de votre achat. Les notifications WhatsApp vous tiennent informé de l'avancement de votre commande.

### Q : Comment installer l'application sur mon téléphone ?

**R :** Pièces est une PWA. Ouvrez **pieces.ci** dans votre navigateur (Chrome recommandé), puis appuyez sur **"Ajouter à l'écran d'accueil"** lorsque le navigateur vous le propose. L'application s'installe comme une app native.
