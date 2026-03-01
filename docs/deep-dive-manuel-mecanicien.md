# Manuel d'utilisation — Mécanicien Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Accès et connexion](#1-accès-et-connexion)
2. [Consentement ARTCI](#2-consentement-artci)
3. [Navigation dans l'application](#3-navigation-dans-lapplication)
4. [Rechercher une pièce](#4-rechercher-une-pièce)
5. [Identifier une pièce par photo (IA)](#5-identifier-une-pièce-par-photo-ia)
6. [Décoder un numéro VIN](#6-décoder-un-numéro-vin)
7. [Gérer mon garage de véhicules](#7-gérer-mon-garage-de-véhicules)
8. [Créer une commande](#8-créer-une-commande)
9. [Partager la commande avec le propriétaire](#9-partager-la-commande-avec-le-propriétaire)
10. [Suivi des commandes](#10-suivi-des-commandes)
11. [Suivi des livraisons](#11-suivi-des-livraisons)
12. [Paiements et escrow](#12-paiements-et-escrow)
13. [Évaluer un vendeur](#13-évaluer-un-vendeur)
14. [Évaluer une livraison](#14-évaluer-une-livraison)
15. [Ouvrir un litige](#15-ouvrir-un-litige)
16. [Notifications](#16-notifications)
17. [Profil et gestion du compte](#17-profil-et-gestion-du-compte)
18. [Le flux tripartite complet](#18-le-flux-tripartite-complet)
19. [Référence rapide des endpoints](#19-référence-rapide-des-endpoints)
20. [FAQ mécanicien](#20-faq-mécanicien)

---

## 1. Accès et connexion

### Votre rôle sur Pièces

En tant que mécanicien, vous êtes l'**utilisateur principal** de la plateforme. Votre rôle est de :
- Trouver les pièces dont vos clients ont besoin
- Créer des commandes pour vos clients
- Partager un lien de paiement avec le propriétaire du véhicule
- Suivre les livraisons et confirmer la réception

Chaque nouveau compte créé sur Pièces reçoit automatiquement le rôle **MÉCANICIEN** par défaut.

### Comment se connecter

La connexion se fait exclusivement par **numéro de téléphone ivoirien** et code OTP par SMS.

**Étapes :**

1. Ouvrir l'application Pièces sur votre navigateur mobile ou ordinateur
2. Saisir votre numéro au format **+225** suivi de 10 chiffres (ex : +2250700000000)
   - Préfixes acceptés : **01**, **05**, **07**
3. Appuyer sur **"Recevoir le code"**
4. Entrer le **code à 6 chiffres** reçu par SMS
   - 6 cases individuelles s'affichent, le curseur avance automatiquement
   - Vous pouvez coller le code directement (copier-coller depuis le SMS)
   - La vérification se lance automatiquement dès le 6e chiffre saisi
5. Si le code n'arrive pas, le bouton **"Renvoyer"** apparaît après 60 secondes

### Sécurité

- **Aucun mot de passe** n'est nécessaire
- La session est gérée par cookies sécurisés
- Un nouveau token est généré à chaque connexion

---

## 2. Consentement ARTCI

Lors de votre **première connexion**, un écran de consentement bloque l'accès à l'application.

### Ce qui est affiché

- Référence à la **loi n°2013-450** relative à la protection des données personnelles en Côte d'Ivoire (ARTCI)
- Données collectées :
  - Numéro de téléphone (identification)
  - Historique de transactions (suivi commandes)
  - Photos de pièces (identification par IA)
- Vos droits : consulter vos données et demander leur suppression à tout moment

### Action requise

- Appuyer sur **"J'accepte"** — pas de bouton de refus
- Sans consentement, aucune page n'est accessible
- La date de consentement est enregistrée dans votre profil

---

## 3. Navigation dans l'application

### Barre de navigation

L'application affiche une barre de navigation fixe en bas de l'écran avec 3 onglets :

| Onglet | Icône | Page | Description |
|--------|-------|------|-------------|
| **Accueil** | Maison | `/` | Page d'accueil |
| **Commandes** | Document | `/orders` | Historique de vos commandes |
| **Profil** | Personne | `/profile` | Votre compte et paramètres |

L'onglet actif est surligné en bleu (`#1976D2`).

### Accès aux fonctions de recherche

Depuis l'accueil, vous accédez aux différentes méthodes de recherche :

| Fonction | Page | Description |
|----------|------|-------------|
| Recherche par marque | `/browse` | Grille de marques → modèles → années → pièces |
| Recherche textuelle | `/browse` | Barre de recherche en haut de la page |
| Identification par photo | `/browse/photo` | IA identifie la pièce depuis une photo |
| Décodage VIN | `/browse/vin` | Identifier un véhicule par son numéro VIN |
| Mes véhicules | `/browse/vehicles` | Accès rapide aux véhicules enregistrés |

---

## 4. Rechercher une pièce

### 4.1 Recherche textuelle

**Page :** `/browse`

La barre de recherche en haut de la page permet une recherche libre par :
- **Nom** de la pièce (ex : "filtre à huile")
- **Référence OEM** (ex : "90915-YZZD4")
- **Catégorie** (ex : "freinage")
- **Compatibilité véhicule** (ex : "Toyota Hilux")

**Fonctionnement :**
- La recherche se déclenche automatiquement après 300 ms de saisie
- Minimum **2 caractères** requis
- Le système corrige automatiquement les **fautes de frappe** grâce à un dictionnaire de synonymes
- La requête corrigée est utilisée pour la recherche

**Résultats affichés :**
- Miniature de la pièce
- Nom de la pièce
- Catégorie et nom de la boutique du vendeur
- Prix en FCFA

### 4.2 Recherche par marque/modèle/année

**Pages :** `/browse` → `/browse/[marque]` → `/browse/[marque]/[modèle]` → `/browse/[marque]/[modèle]/[année]`

Un parcours guidé en 3 étapes :

**Étape 1 — Choisir la marque**

Grille de marques disponibles (3 colonnes). Les 12 marques les plus populaires en Côte d'Ivoire :

| Marque | Exemples de modèles |
|--------|-------------------|
| **Toyota** | Corolla, Hilux, RAV4, Camry, Yaris, Land Cruiser, Avensis |
| **Peugeot** | 206, 207, 208, 301, 308, 3008, Partner |
| **Renault** | Clio, Megane, Duster, Logan, Kangoo |
| **Hyundai** | Tucson, i10, i20, Accent, Santa Fe |
| **Kia** | Picanto, Rio, Sportage, Sorento, Cerato |
| **Nissan** | Almera, Qashqai, X-Trail, Patrol, Micra |
| **Mercedes** | Classe C, Classe E, Sprinter |
| **Volkswagen** | Golf, Polo, Tiguan, Transporter |
| **Ford** | Focus, Fiesta, Ranger, Transit |
| **Suzuki** | Swift, Grand Vitara, Alto |
| **Mitsubishi** | L200, Pajero, Outlander |
| **Honda** | Civic, CR-V, Fit |

**Étape 2 — Choisir le modèle**

Liste verticale des modèles pour la marque sélectionnée.

**Étape 3 — Choisir l'année**

Grille 4 colonnes des années disponibles (les plus récentes en premier).

**Étape 4 — Résultats**

Liste des pièces compatibles avec le véhicule sélectionné. Filtrage possible par catégorie via des **pilules horizontales** :

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

Chaque résultat affiche :
- Miniature (56×56 px)
- Nom de la pièce
- Catégorie
- Nom de la boutique du vendeur
- Prix en FCFA (gras)

**Seules les pièces publiées, en stock et de vendeurs actifs** sont affichées.

### 4.3 Pagination

Les résultats de recherche et de navigation sont paginés :
- Page par défaut : 1
- Limite par défaut : 20 résultats
- Limite maximale : 100 résultats
- Informations affichées : page actuelle, nombre total de pages, nombre total de résultats

---

## 5. Identifier une pièce par photo (IA)

**Page :** `/browse/photo`

Cette fonctionnalité utilise l'**intelligence artificielle Google Gemini** pour identifier une pièce à partir d'une simple photo.

### Comment faire

1. Appuyer sur la zone de capture photo (grande zone occupant 40% de l'écran)
2. **Sur mobile** : la caméra arrière s'ouvre directement
3. **Sur ordinateur** : sélectionnez un fichier image
4. L'IA analyse la photo (un spinner s'affiche avec la miniature)

### Conseils pour une bonne identification

- **Bonne lumière** — Éclairez bien la pièce
- **Pièce entière** — Cadrez la pièce complète
- **Fond uni** — Évitez les arrière-plans chargés

### Formats acceptés

| Format | Extension |
|--------|-----------|
| JPEG | .jpg, .jpeg |
| PNG | .png |
| WebP | .webp |

**Taille maximale :** 5 Mo par photo

### Les 3 résultats possibles

#### Résultat 1 : Identifié (confiance ≥ 70%)

Bandeau vert avec les informations identifiées :

| Information | Exemple |
|-------------|---------|
| Nom de la pièce | Filtre à huile |
| Catégorie | Filtration |
| Référence OEM | 90915-YZZD4 |
| Compatibilité | Toyota Hilux 2005-2015 |
| Prix suggéré | 15 000 FCFA |
| Confiance | 85% |

En dessous, une liste de **pièces correspondantes** dans le catalogue des vendeurs.

#### Résultat 2 : Désambiguïsation (confiance 30-70%)

Bandeau ambre : l'IA hésite entre plusieurs catégories.

- Grille 2 colonnes de **catégories candidates** (maximum 5)
- Appuyez sur la catégorie correcte pour affiner la recherche
- Le système cherche alors les pièces dans cette catégorie spécifique

#### Résultat 3 : Échec (confiance < 30%)

Bandeau ambre : l'IA n'a pas pu identifier la pièce.

- Lien vers la **recherche par marque** (`/browse`)
- Option de **réessayer** avec une meilleure photo

### Filtrage véhicule (optionnel)

Vous pouvez ajouter un filtre véhicule (marque, modèle, année) pour affiner les résultats de l'identification. Les pièces correspondantes seront filtrées par compatibilité.

---

## 6. Décoder un numéro VIN

**Page :** `/browse/vin`

Le VIN (Vehicle Identification Number) est un numéro unique de 17 caractères gravé sur chaque véhicule. Pièces peut le décoder pour identifier automatiquement le véhicule.

### Comment faire

1. Saisir les 17 caractères du VIN
   - Le champ convertit automatiquement en **majuscules**
   - Les caractères invalides (I, O, Q) sont filtrés automatiquement
   - Un compteur affiche le nombre de caractères saisis (ex : "14/17 caractères")
2. Le bouton **"Décoder"** s'active quand 17 caractères sont saisis
3. Le système interroge la base **NHTSA VPIC** (National Highway Traffic Safety Administration)

### Résultats

**Décodage réussi :** Bandeau vert avec les informations du véhicule :
- Marque
- Modèle
- Année
- Bouton **"Chercher des pièces pour ce véhicule →"** → navigation vers `/browse/[marque]/[modèle]/[année]`

**Décodage échoué :** Bandeau ambre avec un lien vers la recherche par marque classique.

### Où trouver le VIN ?

Le VIN se trouve généralement :
- Sur une plaque métallique visible à travers le pare-brise côté conducteur
- Sur le montant de la portière conducteur
- Sur la carte grise du véhicule

---

## 7. Gérer mon garage de véhicules

**Page :** `/browse/vehicles`

Le garage vous permet de sauvegarder les véhicules de vos clients réguliers pour un accès rapide.

### Limite

**Maximum 5 véhicules** enregistrés. Au-delà, vous devez supprimer un véhicule pour en ajouter un nouveau.

### Ajouter un véhicule

Remplissez le formulaire :

| Champ | Type | Règles |
|-------|------|--------|
| **Marque** | Texte | Obligatoire, minimum 1 caractère |
| **Modèle** | Texte | Obligatoire, minimum 1 caractère |
| **Année** | Nombre | 1980 à année courante + 1 |
| **VIN** | Texte | Optionnel, exactement 17 caractères si renseigné |

Le VIN est automatiquement converti en majuscules et les caractères invalides sont filtrés.

### Actions par véhicule

| Action | Description |
|--------|-------------|
| **"Chercher"** | Lance la recherche de pièces pour ce véhicule (`/browse/[marque]/[modèle]/[année]`) |
| **"Supprimer"** | Retire le véhicule de votre garage |

### Sécurité

Chaque véhicule est lié à votre compte. Vous ne pouvez voir et supprimer que **vos propres** véhicules.

---

## 8. Créer une commande

### Le processus de commande

En tant que mécanicien, vous créez des commandes pour vos clients. Voici comment :

1. **Trouvez les pièces** via la recherche (texte, marque, photo ou VIN)
2. **Sélectionnez les articles** à commander
3. La commande est créée avec les informations suivantes :

| Champ | Description |
|-------|-------------|
| **Articles** | Liste des pièces sélectionnées (1 minimum) |
| **Prix snapshot** | Le prix de chaque pièce est **figé au moment de la commande** |
| **Téléphone propriétaire** | Numéro du propriétaire du véhicule (optionnel, format +225) |
| **Main d'œuvre** | Vos frais de main d'œuvre en FCFA (optionnel) |

### Règles de validation

- Au moins **1 article** requis
- Les articles doivent être **publiés** et **en stock**
- Le prix est capturé au moment de la création (protection contre les changements de prix)
- Un **shareToken** unique est généré automatiquement pour le partage

### Statut initial

La commande est créée au statut **DRAFT** (brouillon). Un événement *"Commande créée"* est enregistré dans l'historique.

---

## 9. Partager la commande avec le propriétaire

### Le flux tripartite

Pièces utilise un modèle **tripartite** unique :

```
MÉCANICIEN                  PROPRIÉTAIRE               VENDEUR
(trouve la pièce)           (paie la commande)         (confirme et prépare)
     │                            │                          │
     ▼                            │                          │
Crée la commande                  │                          │
     │                            │                          │
     ├── Partage le lien ────────►│                          │
     │   (WhatsApp/SMS)           │                          │
     │                            ▼                          │
     │                    Ouvre le lien                       │
     │                    Voit les pièces                    │
     │                    + main d'œuvre                     │
     │                    Choisit le paiement                │
     │                    Paie                               │
     │                            │                          │
     │                            ├── Notification ─────────►│
     │                            │                          │
     │                            │                    Confirme (45 min)
     │                            │                          │
     │◄─── Livraison ────────────►│                          │
```

### Le lien de partage

Format : `https://pieces.ci/choose/[shareToken]`

Ce lien permet au propriétaire du véhicule de :
- Voir la liste des pièces sélectionnées par le mécanicien
- Voir le détail des prix (pièces + main d'œuvre + livraison)
- Choisir sa méthode de paiement
- Payer directement

### Ce que voit le propriétaire

La page affiche le message : **"Votre mécanicien a trouvé ces pièces pour vous"**

| Ligne | Description |
|-------|-------------|
| Liste des pièces | Nom, vendeur, catégorie, prix unitaire |
| Sous-total pièces | Somme des prix des pièces |
| Main d'œuvre | Vos frais de main d'œuvre (si > 0 FCFA) |
| Livraison | Frais de livraison (ou "Gratuit") |
| **Total** | Montant total en FCFA (gras) |

### Méthodes de paiement disponibles

| Méthode | Type | Condition |
|---------|------|-----------|
| **Orange Money** | Mobile money | Toujours disponible |
| **MTN MoMo** | Mobile money | Toujours disponible |
| **Wave** | Mobile money | Toujours disponible |
| **Cash à la livraison** | COD | Uniquement si total ≤ 75 000 FCFA |

Le propriétaire peut également **annuler** la commande depuis cette page.

---

## 10. Suivi des commandes

**Page :** `/orders`

### Historique des commandes

L'onglet **"Commandes"** dans la navigation affiche toutes vos commandes avec :

- **Identifiant** : 8 premiers caractères de l'ID
- **Date** : Format date français (fr-CI)
- **Articles** : Nom × quantité — prix en FCFA
- **Total** : Montant total en gras
- **Statut** : Badge coloré
- **Livraison** : Statut de livraison si disponible

### Les 10 statuts d'une commande

| Statut | Libellé français | Couleur | Description |
|--------|-----------------|---------|-------------|
| `DRAFT` | Brouillon | Orange | Commande créée, en attente de paiement |
| `PENDING_PAYMENT` | En attente de paiement | Orange | Paiement mobile money initié |
| `PAID` | Payée | Orange | Paiement reçu, en attente de confirmation vendeur |
| `VENDOR_CONFIRMED` | Confirmée vendeur | Orange | Vendeur a confirmé la disponibilité |
| `DISPATCHED` | Expédiée | Orange | Livreur en route vers le vendeur |
| `IN_TRANSIT` | En transit | Orange | Pièce en cours de livraison |
| `DELIVERED` | Livrée | Orange | Pièce livrée au client |
| `CONFIRMED` | Confirmée | Orange | Réception confirmée |
| `COMPLETED` | Terminée | Vert | Commande terminée, fonds libérés |
| `CANCELLED` | Annulée | Rouge | Commande annulée |

### Annulation

Vous pouvez annuler une commande tant qu'elle n'a pas été expédiée. Les statuts permettant l'annulation :
- **DRAFT** — Brouillon
- **PENDING_PAYMENT** — En attente de paiement
- **PAID** — Payée
- **VENDOR_CONFIRMED** — Confirmée par le vendeur

Une fois au statut **DISPATCHED** ou au-delà, l'annulation n'est plus possible.

### Pagination

- Boutons **"Précédent"** et **"Suivant"**
- Indicateur de page : Page X / Y

---

## 11. Suivi des livraisons

### Consulter la livraison d'une commande

Vous pouvez suivre la livraison de chaque commande. L'endpoint est **public** (pas besoin d'authentification).

### Statuts de livraison

| Statut | Description |
|--------|-------------|
| **PENDING_ASSIGNMENT** | En attente d'assignation d'un livreur |
| **ASSIGNED** | Livreur assigné par l'administrateur |
| **PICKUP_IN_PROGRESS** | Livreur en route vers la boutique du vendeur |
| **IN_TRANSIT** | Pièce en cours de livraison vers vous/le client |
| **DELIVERED** | Pièce livrée |

### Modes de livraison

| Mode | Description |
|------|-------------|
| **EXPRESS** | Livraison rapide |
| **STANDARD** | Livraison standard |

### Suivi GPS en temps réel

Les coordonnées GPS du livreur (`riderLat`, `riderLng`) sont mises à jour en temps réel pendant la livraison.

### Informations de livraison

| Champ | Description |
|-------|-------------|
| Adresse de collecte | Adresse de la boutique du vendeur |
| Adresse de livraison | Adresse de livraison au client |
| Mode | EXPRESS ou STANDARD |
| Montant COD | Montant à collecter en espèces (si paiement à la livraison) |
| Client absent | Indicateur si le client est absent à la livraison |

---

## 12. Paiements et escrow

### Comment fonctionne le paiement

Le paiement est effectué par le **propriétaire du véhicule**, pas par le mécanicien. Le système d'escrow (séquestre) protège les deux parties :

```
Propriétaire paie
       │
       ▼
   ┌─────────┐
   │  HELD   │ ← Fonds retenus en séquestre
   └────┬────┘
        │
   ┌────┴────────────────┐
   │                     │
   ▼                     ▼
┌──────────┐      ┌───────────┐
│ RELEASED │      │ REFUNDED  │
│ (vendeur)│      │ (proprio) │
└──────────┘      └───────────┘
```

| Statut | Signification |
|--------|--------------|
| **HELD** | Paiement reçu, fonds en séquestre |
| **RELEASED** | Fonds libérés au vendeur après livraison réussie |
| **REFUNDED** | Fonds remboursés au propriétaire (litige) |

### Libération automatique

Les fonds sont libérés automatiquement **48 heures** après la livraison confirmée, sauf si un litige est ouvert.

### Paiement COD (Cash on Delivery)

Pour les commandes en **COD** (paiement à la livraison) :
- Montant maximum : **75 000 FCFA**
- Le statut passe directement à **PAID** sans escrow
- Le livreur collecte le montant en espèces à la livraison

### Vérifier le statut escrow

Vous pouvez consulter le statut du paiement de chaque commande : montant, statut (HELD/RELEASED/REFUNDED), dates.

---

## 13. Évaluer un vendeur

Après réception d'une commande, vous pouvez évaluer le vendeur.

### Conditions

- Vous devez être l'**initiateur** de la commande (le mécanicien qui l'a créée)
- La commande doit être au statut **DELIVERED**, **CONFIRMED** ou **COMPLETED**
- Un seul avis par commande et par vendeur

### Format de l'évaluation

| Champ | Règle |
|-------|-------|
| **Note** | 1 à 5 étoiles (obligatoire) |
| **Commentaire** | Jusqu'à 1 000 caractères (optionnel) |

### Consulter les avis d'un vendeur

Les avis sont **publics**. Pour chaque vendeur, vous pouvez voir :
- Les 50 avis les plus récents
- La **note moyenne** (arrondie à 1 décimale)
- Le **nombre total** d'avis

---

## 14. Évaluer une livraison

Vous pouvez également évaluer le service de livraison (le livreur).

### Conditions

- Vous devez être l'initiateur de la commande
- La livraison doit être au statut **DELIVERED** ou **CONFIRMED**
- Un seul avis par livraison

### Format

| Champ | Règle |
|-------|-------|
| **Note** | 1 à 5 étoiles (obligatoire) |
| **Commentaire** | Jusqu'à 1 000 caractères (optionnel) |

### Consulter les avis d'un livreur

Comme pour les vendeurs, les avis des livreurs sont **publics** : liste, note moyenne, total.

---

## 15. Ouvrir un litige

Si vous rencontrez un problème avec une commande, vous pouvez ouvrir un litige.

### Qui peut ouvrir un litige ?

Seul l'**initiateur de la commande** (vous, le mécanicien) peut ouvrir un litige.

### Comment ouvrir un litige

| Champ | Règle |
|-------|-------|
| **Commande** | L'identifiant de la commande concernée |
| **Raison** | Description du problème, 5 à 2 000 caractères |

### Cycle de vie d'un litige

| Statut | Description |
|--------|-------------|
| **OPEN** | Litige ouvert |
| **UNDER_REVIEW** | En cours d'examen par l'administrateur |
| **RESOLVED_BUYER** | Résolu en votre faveur → remboursement |
| **RESOLVED_SELLER** | Résolu en faveur du vendeur → fonds libérés |
| **CLOSED** | Litige clôturé |

### Suivi des litiges

Vous pouvez consulter tous les litiges associés à vos commandes. Seuls l'initiateur de la commande et les administrateurs ont accès aux détails.

---

## 16. Notifications

### Notifications automatiques

Vous recevez des notifications WhatsApp à chaque changement de statut de vos commandes :

| Statut atteint | Message reçu |
|----------------|-------------|
| **PAID** | Notification de paiement confirmé |
| **VENDOR_CONFIRMED** | Le vendeur a confirmé la commande |
| **DISPATCHED** | La commande a été expédiée |
| **DELIVERED** | La commande a été livrée |
| **CANCELLED** | La commande a été annulée |

Les statuts **DRAFT** et **PENDING_PAYMENT** ne déclenchent pas de notification.

### Préférences de notification

| Canal | Statut | Par défaut |
|-------|--------|-----------|
| **WhatsApp** | Actif | ✅ Activé |
| **SMS** | Non disponible | ❌ Désactivé |
| **Push** | Non disponible | ❌ Désactivé |

Vous pouvez modifier vos préférences à tout moment.

---

## 17. Profil et gestion du compte

### Page profil

**Page :** `/profile`

Votre profil affiche :
- **Numéro de téléphone** (masqué : +225 07 ** ** XX XX)
- **Rôles** : Mécanicien affiché en bleu si actif
- **Contexte actif** : Le rôle actuellement sélectionné

### Changement de contexte

Si vous avez plusieurs rôles (ex : Mécanicien + Propriétaire), vous pouvez basculer entre eux via un bouton dédié. Le changement est immédiat.

### Les 6 rôles du système

| Rôle | Libellé |
|------|---------|
| MECHANIC | **Mécanicien** (votre rôle par défaut) |
| OWNER | Propriétaire |
| SELLER | Vendeur |
| RIDER | Livreur |
| ADMIN | Administrateur |
| ENTERPRISE | Entreprise |

### Données personnelles

**Page :** `/profile/data`

Conformément à la loi ARTCI, vous pouvez consulter :
- Votre numéro de téléphone (non masqué)
- Vos rôles
- Votre contexte actif
- La date de consentement
- La date de création du compte

### Suppression des données

Bouton **"Demander la suppression de mes données"** — la demande est enregistrée et traitée par l'équipe Pièces. Une fois envoyée, un message de confirmation s'affiche.

### Déconnexion

Le bouton **"Se déconnecter"** termine votre session et vous redirige vers la page de connexion.

---

## 18. Le flux tripartite complet

Voici le parcours complet d'une commande du point de vue du mécanicien :

```
ÉTAPE 1 : Vous trouvez les pièces
┌─────────────────────────────────────────────────┐
│  Recherche : texte / marque / photo IA / VIN    │
│  → Liste de pièces disponibles chez les vendeurs│
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
ÉTAPE 2 : Vous créez la commande  ★ VOTRE ACTION ★
┌──────────┐
│  DRAFT   │ Sélection des pièces + main d'œuvre + tél. propriétaire
└────┬─────┘
     │ Vous partagez le lien /choose/{shareToken}
     │ via WhatsApp ou SMS au propriétaire
     ▼
ÉTAPE 3 : Le propriétaire paie
┌──────────────────┐
│ PENDING_PAYMENT  │ Le propriétaire choisit Orange Money / MTN / Wave / COD
└────┬─────────────┘
     │ Paiement confirmé (webhook CinetPay ou COD direct)
     ▼
ÉTAPE 4 : Paiement reçu
┌──────┐
│ PAID │ Fonds en escrow — Le vendeur est notifié
└──┬───┘
   │ Le vendeur confirme sous 45 minutes
   ▼
ÉTAPE 5 : Vendeur confirme
┌────────────────────┐
│ VENDOR_CONFIRMED   │ Les pièces sont prêtes
└────┬───────────────┘
     │ L'admin crée la livraison et assigne un livreur
     ▼
ÉTAPE 6 : Expédition
┌────────────┐
│ DISPATCHED │ Le livreur va chercher les pièces chez le vendeur
└────┬───────┘
     │
     ▼
ÉTAPE 7 : En transit
┌────────────┐
│ IN_TRANSIT │ Le livreur vous apporte les pièces (suivi GPS)
└────┬───────┘
     │
     ▼
ÉTAPE 8 : Livré
┌───────────┐
│ DELIVERED │ Vous recevez les pièces
└────┬──────┘
     │ Vous pouvez évaluer le vendeur et le livreur
     │ Confirmation automatique après 48h si pas de litige
     ▼
ÉTAPE 9 : Confirmé et complété
┌───────────┐     ┌───────────┐
│ CONFIRMED │ ──► │ COMPLETED │ Fonds libérés au vendeur 💰
└───────────┘     └───────────┘

❌ ANNULATION possible de DRAFT à VENDOR_CONFIRMED
┌───────────┐
│ CANCELLED │ Fonds remboursés au propriétaire
└───────────┘
```

### Résumé de vos actions

| Moment | Votre action |
|--------|-------------|
| Recherche | Trouver les pièces (texte, marque, photo, VIN) |
| Commande | Créer la commande avec les pièces sélectionnées |
| Partage | Envoyer le lien de paiement au propriétaire |
| Réception | Recevoir et vérifier les pièces livrées |
| Évaluation | Évaluer le vendeur et le livreur |
| Litige | Ouvrir un litige si problème |

---

## 19. Référence rapide des endpoints

### Recherche et navigation (publics, sans authentification)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/browse/brands` | Liste des marques |
| GET | `/api/v1/browse/brands/:brand/models` | Modèles d'une marque |
| GET | `/api/v1/browse/brands/:brand/models/:model/years` | Années d'un modèle |
| GET | `/api/v1/browse/categories` | Liste des 15 catégories |
| GET | `/api/v1/browse/parts` | Filtrer les pièces (brand, model, year, category) |
| GET | `/api/v1/browse/search` | Recherche textuelle (min 2 caractères) |
| POST | `/api/v1/browse/vin-decode` | Décoder un numéro VIN |

### Identification par photo (public)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/vision/identify` | Identifier une pièce par photo (IA) |
| POST | `/api/v1/vision/disambiguate` | Affiner après désambiguïsation |

### Garage de véhicules (authentifié)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/users/me/vehicles` | Lister mes véhicules |
| POST | `/api/v1/users/me/vehicles` | Ajouter un véhicule (max 5) |
| DELETE | `/api/v1/users/me/vehicles/:id` | Supprimer un véhicule |

### Commandes (authentifié)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/orders` | Créer une commande |
| GET | `/api/v1/orders` | Lister mes commandes |
| GET | `/api/v1/orders/history` | Historique paginé |
| GET | `/api/v1/orders/:id` | Détail d'une commande |
| GET | `/api/v1/orders/share/:token` | Commande via lien de partage (public) |
| POST | `/api/v1/orders/:id/pay` | Choisir méthode de paiement (public) |
| POST | `/api/v1/orders/:id/cancel` | Annuler une commande (public) |

### Livraisons et paiements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/deliveries/order/:orderId` | Suivi livraison (public) |
| GET | `/api/v1/orders/:id/escrow` | Statut escrow (authentifié) |

### Évaluations et litiges (authentifié)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/reviews/seller` | Évaluer un vendeur |
| POST | `/api/v1/reviews/delivery` | Évaluer un livreur |
| GET | `/api/v1/reviews/vendor/:id` | Avis d'un vendeur (public) |
| GET | `/api/v1/reviews/rider/:id` | Avis d'un livreur (public) |
| POST | `/api/v1/reviews/disputes` | Ouvrir un litige |
| GET | `/api/v1/reviews/disputes/order/:id` | Litiges d'une commande |

### Profil et notifications (authentifié)

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
| `AUTH_MISSING_TOKEN` | 401 | Token d'authentification manquant |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Rôle insuffisant |
| `CONSENT_REQUIRED` | 403 | Consentement ARTCI non donné |
| `ORDER_NO_VALID_ITEMS` | 400 | Aucun article valide dans la commande |
| `ORDER_COD_LIMIT` | 400 | Montant COD dépasse 75 000 FCFA |
| `ORDER_INVALID_STATUS` | 400 | Action incompatible avec le statut |
| `ORDER_CANNOT_CANCEL` | 400 | Annulation impossible (déjà expédié) |
| `ORDER_INVALID_TRANSITION` | 409 | Transition de statut invalide |
| `ORDER_NOT_FOUND` | 404 | Commande introuvable |
| `VEHICLE_LIMIT_REACHED` | 400 | Maximum 5 véhicules atteint |
| `VEHICLE_NOT_FOUND` | 404 | Véhicule introuvable |
| `BRAND_NOT_FOUND` | 404 | Marque inconnue |
| `MODEL_NOT_FOUND` | 404 | Modèle inconnu |
| `REVIEW_NOT_ORDER_BUYER` | 403 | Seul l'initiateur peut évaluer |
| `REVIEW_ORDER_NOT_COMPLETED` | 400 | Commande non terminée |
| `REVIEW_INVALID_RATING` | 400 | Note invalide (doit être 1-5) |
| `DISPUTE_NOT_ORDER_PARTY` | 403 | Non autorisé à voir/créer ce litige |
| `ESCROW_NOT_FOUND` | 404 | Transaction escrow introuvable |
| `FILE_TOO_LARGE` | 422 | Photo dépasse 5 Mo |
| `INVALID_FILE_TYPE` | 422 | Format photo non accepté |

---

## 20. FAQ mécanicien

### Q1 : Comment devenir mécanicien sur Pièces ?

Aucune inscription spéciale n'est requise. Il suffit de **vous connecter avec votre numéro de téléphone**. Chaque nouveau compte reçoit automatiquement le rôle Mécanicien.

### Q2 : Comment trouver la bonne pièce ?

Vous avez 4 méthodes :
1. **Recherche textuelle** — tapez le nom, la référence OEM ou la catégorie
2. **Navigation par marque** — sélectionnez marque → modèle → année
3. **Photo IA** — prenez une photo, l'IA identifie la pièce
4. **VIN** — décodez le numéro VIN du véhicule pour identifier la marque/modèle/année

### Q3 : Qui paie la commande ?

C'est le **propriétaire du véhicule** qui paie, pas vous. Vous créez la commande et partagez un lien de paiement via WhatsApp ou SMS. Le propriétaire choisit son moyen de paiement (Orange Money, MTN MoMo, Wave ou espèces à la livraison).

### Q4 : Comment partager la commande avec le propriétaire ?

Après avoir créé la commande, vous recevez un lien de la forme `/choose/{shareToken}`. Envoyez ce lien au propriétaire par WhatsApp, SMS ou tout autre moyen. Le propriétaire voit les pièces, les prix et peut payer directement.

### Q5 : Puis-je ajouter mes frais de main d'œuvre ?

Oui. Lors de la création de la commande, vous pouvez ajouter un montant de **main d'œuvre** en FCFA. Ce montant apparaît comme ligne séparée sur la facture du propriétaire.

### Q6 : Le prix peut-il changer après ma commande ?

Non. Le **prix est figé** (snapshot) au moment de la création de la commande. Même si le vendeur modifie son prix après, votre commande garde le prix initial.

### Q7 : Puis-je annuler une commande ?

Oui, tant qu'elle n'a pas été **expédiée** (statut DISPATCHED). Vous pouvez annuler aux statuts : DRAFT, PENDING_PAYMENT, PAID, VENDOR_CONFIRMED.

### Q8 : Que faire si la pièce reçue ne correspond pas ?

Ouvrez un **litige** via l'application. Décrivez le problème (5 à 2 000 caractères). Un administrateur examinera votre demande et tranchera. Si le litige est résolu en votre faveur, les fonds sont remboursés au propriétaire.

### Q9 : Comment fonctionne l'identification par photo ?

Prenez une photo claire de la pièce (bonne lumière, fond uni, pièce entière). L'IA Google Gemini analyse l'image et retourne :
- Si confiance ≥ 70% : identification directe avec pièces correspondantes
- Si confiance 30-70% : choix entre catégories candidates
- Si confiance < 30% : échec, utilisez la recherche manuelle

### Q10 : Combien de véhicules puis-je sauvegarder ?

Maximum **5 véhicules** dans votre garage. Pour en ajouter un nouveau au-delà de cette limite, supprimez d'abord un véhicule existant.

### Q11 : Le propriétaire doit-il avoir un compte Pièces pour payer ?

Oui. Le lien de paiement nécessite une **connexion** sur Pièces. Le propriétaire devra créer un compte (connexion par téléphone + OTP) s'il n'en a pas encore.

### Q12 : Quand les fonds sont-ils libérés au vendeur ?

Les fonds sont libérés automatiquement **48 heures** après la livraison confirmée. Si un litige est ouvert pendant ce délai, les fonds restent en séquestre jusqu'à la résolution.

---

*Document généré le 2026-03-01 — Pièces v1.0*
