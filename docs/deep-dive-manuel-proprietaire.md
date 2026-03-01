# Manuel d'utilisation — Propriétaire de véhicule Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mars 2026

---

## Table des matières

1. [Votre rôle sur Pièces](#1-votre-rôle-sur-pièces)
2. [Comment ça fonctionne : le flux tripartite](#2-comment-ça-fonctionne--le-flux-tripartite)
3. [Recevoir un lien de commande](#3-recevoir-un-lien-de-commande)
4. [Consulter le détail de la commande](#4-consulter-le-détail-de-la-commande)
5. [Choisir une méthode de paiement](#5-choisir-une-méthode-de-paiement)
6. [Payer la commande](#6-payer-la-commande)
7. [Annuler une commande](#7-annuler-une-commande)
8. [Suivre l'état de la commande](#8-suivre-létat-de-la-commande)
9. [Accès et connexion](#9-accès-et-connexion)
10. [Consentement ARTCI](#10-consentement-artci)
11. [Historique des commandes](#11-historique-des-commandes)
12. [Profil et gestion du compte](#12-profil-et-gestion-du-compte)
13. [Paiements et escrow](#13-paiements-et-escrow)
14. [Cycle de vie complet de votre commande](#14-cycle-de-vie-complet-de-votre-commande)
15. [Référence rapide](#15-référence-rapide)
16. [FAQ propriétaire](#16-faq-propriétaire)

---

## 1. Votre rôle sur Pièces

En tant que **propriétaire de véhicule**, vous êtes le **payeur** dans le flux tripartite de Pièces. Votre interaction avec la plateforme est simple et directe :

1. Votre mécanicien trouve les pièces dont votre véhicule a besoin
2. Il vous envoie un **lien de paiement** par WhatsApp ou SMS
3. Vous consultez le détail de la commande
4. Vous choisissez votre méthode de paiement et payez
5. Les pièces sont livrées à votre mécanicien

**Vous n'avez pas besoin de chercher les pièces vous-même** — votre mécanicien s'en charge. Votre rôle est de valider et payer la commande.

---

## 2. Comment ça fonctionne : le flux tripartite

Pièces fonctionne avec un modèle **tripartite** unique en Côte d'Ivoire :

```
VOTRE MÉCANICIEN              VOUS (Propriétaire)              LE VENDEUR

Trouve les pièces              Reçoit le lien                  A les pièces
dans le catalogue              par WhatsApp/SMS                en stock
       │                            │                              │
       ▼                            │                              │
Crée la commande                    │                              │
+ ajoute ses frais                  │                              │
de main d'œuvre                     │                              │
       │                            │                              │
       ├──── Envoie le lien ───────►│                              │
       │                            │                              │
       │                            ▼                              │
       │                    ★ Ouvre le lien ★                       │
       │                    Voit les pièces                        │
       │                    + les prix                             │
       │                    + la main d'œuvre                      │
       │                            │                              │
       │                    ★ Choisit le paiement ★                │
       │                    Orange Money / MTN /                   │
       │                    Wave / Espèces                         │
       │                            │                              │
       │                    ★ Paie ★                               │
       │                            │                              │
       │                            ├── Notification ─────────────►│
       │                            │                              │
       │                            │                    Confirme (45 min)
       │                            │                              │
       │◄─────── Livraison ─────────┤                              │
       │                            │                              │
  Reçoit les pièces          Commande terminée             Reçoit le paiement
```

### Ce que vous voyez

Le lien de commande affiche clairement :
- **"Votre mécanicien a trouvé ces pièces pour vous"**
- La liste détaillée des pièces avec les prix
- Les frais de main d'œuvre de votre mécanicien
- Les frais de livraison
- Le **montant total à payer**

---

## 3. Recevoir un lien de commande

### Comment ça arrive

Votre mécanicien vous envoie un lien par **WhatsApp**, **SMS** ou tout autre moyen de communication. Le lien ressemble à :

```
https://pieces.ci/choose/a1b2c3d4e5f6...
```

Ce lien est **unique et sécurisé** — il est généré spécifiquement pour votre commande grâce à un jeton de partage (`shareToken`) de 16 octets.

### Que faire

1. **Appuyez sur le lien** pour l'ouvrir dans votre navigateur
2. Si vous n'êtes pas connecté, vous serez redirigé vers la page de connexion
3. Connectez-vous avec votre numéro de téléphone (voir section [Accès et connexion](#9-accès-et-connexion))
4. La page de commande s'affiche avec tous les détails

---

## 4. Consulter le détail de la commande

### Informations affichées

La page de commande affiche :

#### Liste des pièces

Chaque pièce commandée est présentée avec :

| Information | Description |
|-------------|-------------|
| **Nom** | Nom de la pièce (ex : "Filtre à huile") |
| **Vendeur** | Nom de la boutique du vendeur |
| **Catégorie** | Type de pièce (ex : "Filtration") |
| **Prix** | Prix unitaire en FCFA (figé au moment de la commande) |
| **Quantité** | Nombre d'unités |
| **Photo** | Miniature de la pièce |

#### Récapitulatif des coûts

| Ligne | Description |
|-------|-------------|
| **Sous-total pièces** | Somme des prix de toutes les pièces |
| **Main d'œuvre** | Frais du mécanicien (si applicable, sinon masqué) |
| **Livraison** | Frais de livraison (ou "Gratuit" si offert) |
| **Total** | **Montant total à payer en FCFA** (affiché en gras) |

### Prix garantis

Les prix sont **figés** (snapshot) au moment où votre mécanicien crée la commande. Même si un vendeur modifie ses prix après, votre commande garde les prix initiaux.

---

## 5. Choisir une méthode de paiement

### Méthodes disponibles

Quatre méthodes de paiement sont proposées :

| Méthode | Type | Disponibilité |
|---------|------|--------------|
| **Orange Money** | Mobile money | Toujours disponible |
| **MTN MoMo** | Mobile money | Toujours disponible |
| **Wave** | Mobile money | Toujours disponible |
| **Cash à la livraison** | Espèces (COD) | Uniquement si le total ≤ **75 000 FCFA** |

### Comment choisir

1. Les méthodes de paiement s'affichent sous forme de **boutons radio**
2. Appuyez sur la méthode souhaitée pour la sélectionner
3. Le bouton de paiement s'active

### Restriction COD (Cash on Delivery)

Le paiement en espèces à la livraison n'est disponible que pour les commandes dont le montant total (pièces + main d'œuvre + livraison) ne dépasse pas **75 000 FCFA**. Au-delà, seul le paiement par mobile money est possible.

---

## 6. Payer la commande

### Paiement par mobile money

1. Sélectionnez **Orange Money**, **MTN MoMo** ou **Wave**
2. Appuyez sur le bouton **"Payer {montant} FCFA"**
3. La commande passe au statut **PENDING_PAYMENT** (en attente de paiement)
4. Suivez les instructions de votre opérateur mobile pour valider le paiement
5. Une fois le paiement confirmé par CinetPay (passerelle de paiement), la commande passe au statut **PAID**
6. Le vendeur est automatiquement notifié et dispose de 45 minutes pour confirmer

### Paiement en espèces (COD)

1. Sélectionnez **"Cash à la livraison"**
2. Appuyez sur le bouton de paiement
3. La commande passe directement au statut **PAID**
4. Vous paierez le montant en **espèces au livreur** lors de la livraison
5. Le vendeur est notifié immédiatement

### Après le paiement

Un bandeau vert s'affiche :

> *"Paiement confirmé — Le vendeur a 45 minutes pour confirmer la disponibilité des pièces"*

### Protection des fonds (escrow)

Votre paiement est **sécurisé** par un système d'escrow (séquestre). Les fonds ne sont libérés au vendeur qu'après la livraison réussie. En cas de problème, vous pouvez être remboursé (voir section [Paiements et escrow](#13-paiements-et-escrow)).

---

## 7. Annuler une commande

### Quand pouvez-vous annuler ?

Vous pouvez annuler la commande tant qu'elle n'a pas été **expédiée** :

| Statut | Annulation possible ? |
|--------|----------------------|
| **DRAFT** (Brouillon) | ✅ Oui |
| **PENDING_PAYMENT** (En attente) | ✅ Oui |
| **PAID** (Payée) | ✅ Oui |
| **VENDOR_CONFIRMED** (Confirmée) | ✅ Oui |
| **DISPATCHED** (Expédiée) | ❌ Non |
| **IN_TRANSIT** (En transit) | ❌ Non |
| **DELIVERED** (Livrée) | ❌ Non |

### Comment annuler

Un bouton d'annulation est disponible sur la page de commande pour les statuts éligibles. Appuyez dessus pour annuler.

### Après l'annulation

- Le statut passe à **CANCELLED** (Annulée)
- Un bandeau rouge s'affiche : *"Commande annulée"*
- Si vous aviez déjà payé par mobile money, les fonds en escrow sont **remboursés**

---

## 8. Suivre l'état de la commande

### Bandeaux de statut

Après le paiement, la page de commande affiche des bandeaux de statut qui se mettent à jour :

| Statut | Couleur | Message affiché |
|--------|---------|----------------|
| **PAID** | Vert | "Paiement confirmé — Le vendeur a 45 minutes pour confirmer" |
| **VENDOR_CONFIRMED** | Vert | "Commande confirmée par le vendeur — Préparation en cours. Un livreur sera assigné sous peu." |
| **DISPATCHED** | Bleu | "Livreur en route vers le vendeur" |
| **IN_TRANSIT** | Bleu | "Livraison en cours" |
| **DELIVERED** | Bleu | "Livré — en attente de confirmation" |
| **CONFIRMED** | Bleu | "Confirmée" |
| **COMPLETED** | Bleu | "Terminée" |
| **CANCELLED** | Rouge | "Commande annulée" |

### Suivi de la livraison

Une fois la commande expédiée, vous pouvez suivre la livraison en temps réel grâce aux coordonnées GPS du livreur.

---

## 9. Accès et connexion

### Créer un compte ou se connecter

Pour accéder au lien de commande, vous devez avoir un compte Pièces. La création est rapide et gratuite.

**Étapes :**

1. Appuyez sur le lien envoyé par votre mécanicien
2. Si vous n'êtes pas connecté, la page de connexion s'affiche
3. Saisissez votre numéro de téléphone au format **+225** (ex : +2250700000000)
   - Préfixes acceptés : **01**, **05**, **07**
4. Appuyez sur **"Recevoir le code"**
5. Entrez le **code à 6 chiffres** reçu par SMS
   - Les 6 cases se remplissent automatiquement
   - Vous pouvez coller le code
   - La vérification est automatique dès le 6e chiffre
6. Vous êtes connecté et redirigé vers la page de commande

### Pas de mot de passe

Aucun mot de passe n'est nécessaire. La connexion repose uniquement sur votre numéro de téléphone et le code SMS.

### Si le code n'arrive pas

Le bouton **"Renvoyer"** apparaît après **60 secondes**. Appuyez dessus pour recevoir un nouveau code.

---

## 10. Consentement ARTCI

Lors de votre **première connexion**, un écran de consentement s'affiche.

### Ce qui est expliqué

- Référence à la **loi n°2013-450** sur la protection des données en Côte d'Ivoire
- Données collectées :
  - Numéro de téléphone
  - Historique de transactions
  - Photos de pièces

### Ce que vous devez faire

- Appuyer sur **"J'accepte"**
- Cet écran n'apparaît qu'**une seule fois**
- Vous conservez le droit de consulter et supprimer vos données à tout moment

---

## 11. Historique des commandes

**Page :** `/orders` (onglet **"Commandes"** dans la navigation)

Si vous êtes connecté, vous pouvez consulter l'historique de vos commandes. Chaque commande affiche :

| Information | Description |
|-------------|-------------|
| **Identifiant** | 8 premiers caractères de l'ID |
| **Date** | Date de création (format français) |
| **Articles** | Nom × quantité — prix en FCFA |
| **Total** | Montant total en gras |
| **Statut** | Badge coloré (vert = terminée, rouge = annulée, orange = en cours) |
| **Livraison** | Statut de livraison si disponible |

La navigation entre les pages se fait via les boutons **"Précédent"** et **"Suivant"**.

---

## 12. Profil et gestion du compte

### Page profil

**Page :** `/profile` (onglet **"Profil"** dans la navigation)

- **Numéro de téléphone** : affiché en format masqué (+225 07 ** ** XX XX)
- **Rôles** : Propriétaire (affiché "Propriétaire" en bleu si actif)
- **Contexte actif** : Le rôle actuellement sélectionné

### Si vous avez plusieurs rôles

Si votre compte a plusieurs rôles (ex : Propriétaire + Mécanicien), vous pouvez basculer entre eux via un bouton de changement de contexte.

### Données personnelles

**Page :** `/profile/data`

Conformément à la loi ARTCI, vous pouvez :
- Consulter votre numéro de téléphone (non masqué)
- Voir vos rôles et contexte actif
- Voir la date de consentement
- Voir la date de création du compte
- **Demander la suppression** de vos données personnelles

### Déconnexion

Le bouton **"Se déconnecter"** termine votre session et vous redirige vers la page de connexion.

---

## 13. Paiements et escrow

### Le système d'escrow vous protège

Pour votre sécurité, Pièces utilise un système d'**escrow** (séquestre). Votre argent ne va pas directement au vendeur — il est retenu en séquestre jusqu'à la livraison réussie.

```
Vous payez
    │
    ▼
┌─────────┐
│  HELD   │ ← Vos fonds sont en séquestre (protégés)
└────┬────┘
     │
     │  Livraison réussie (+ 48h sans litige)
     │
     ├───────────────────────┐
     │                       │
     ▼                       ▼
┌──────────┐          ┌───────────┐
│ RELEASED │          │ REFUNDED  │
│(vendeur) │          │  (vous)   │
└──────────┘          └───────────┘
   Normal              En cas de
                       litige résolu
                       en votre faveur
```

### Quand les fonds sont-ils libérés au vendeur ?

| Situation | Résultat |
|-----------|---------|
| Livraison confirmée + 48h sans litige | Fonds **libérés** au vendeur |
| Litige résolu en faveur du vendeur | Fonds **libérés** au vendeur |
| Litige résolu en votre faveur | Fonds **remboursés** à vous |
| Commande annulée | Fonds **remboursés** à vous |

### Paiement COD (espèces à la livraison)

Pour les commandes en COD :
- Pas d'escrow — vous payez directement au livreur en espèces
- Montant maximum : **75 000 FCFA**
- Le livreur affiche le montant exact à collecter sur son application

---

## 14. Cycle de vie complet de votre commande

Voici tout ce qui se passe du moment où vous recevez le lien jusqu'à la fin :

```
ÉTAPE 1 : Vous recevez le lien de votre mécanicien
     │
     ▼
┌──────────┐
│  DRAFT   │ La commande est prête, en attente de votre paiement
└────┬─────┘
     │ ★ Vous choisissez le paiement et payez ★
     │
     ├─── Mobile money (Orange/MTN/Wave)
     │    │
     │    ▼
     │ ┌──────────────────┐
     │ │ PENDING_PAYMENT  │ En attente de confirmation de l'opérateur
     │ └────┬─────────────┘
     │      │ Paiement confirmé par CinetPay
     │      ▼
     │
     ├─── COD (espèces) → passe directement à PAID
     │
     ▼
┌──────┐
│ PAID │ 💰 Fonds en escrow — Vendeur notifié
└──┬───┘
   │ Le vendeur confirme sous 45 minutes
   ▼
┌────────────────────┐
│ VENDOR_CONFIRMED   │ Les pièces sont disponibles
└────┬───────────────┘
     │ Un livreur est assigné
     ▼
┌────────────┐
│ DISPATCHED │ Le livreur est en route vers le vendeur
└────┬───────┘
     │ Le livreur récupère les pièces
     ▼
┌────────────┐
│ IN_TRANSIT │ 🚗 Les pièces sont en route vers votre mécanicien
└────┬───────┘
     │ Livraison effectuée
     ▼
┌───────────┐
│ DELIVERED │ ✅ Pièces livrées
└────┬──────┘
     │ Confirmation (manuelle ou automatique après 48h)
     ▼
┌───────────┐     ┌───────────┐
│ CONFIRMED │ ──► │ COMPLETED │ Fonds libérés au vendeur
└───────────┘     └───────────┘

❌ ANNULATION (possible de DRAFT à VENDOR_CONFIRMED)
┌───────────┐
│ CANCELLED │ → Fonds remboursés si déjà payé
└───────────┘
```

### Résumé de vos actions

| Moment | Votre action |
|--------|-------------|
| Réception du lien | Ouvrir le lien et se connecter |
| Consultation | Vérifier les pièces et les prix |
| Paiement | Choisir la méthode et payer |
| Annulation (si besoin) | Annuler avant l'expédition |
| Après livraison | Rien — confirmation automatique après 48h |

---

## 15. Référence rapide

### Endpoints utilisés (pas d'authentification requise)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/orders/share/:shareToken` | Consulter la commande via le lien partagé |
| POST | `/api/v1/orders/:id/pay` | Choisir la méthode de paiement et payer |
| POST | `/api/v1/orders/:id/cancel` | Annuler la commande |
| GET | `/api/v1/deliveries/order/:orderId` | Suivre la livraison |

### Endpoints profil (authentification requise)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/users/me` | Mon profil |
| PATCH | `/api/v1/users/me/context` | Changer de rôle actif |
| GET | `/api/v1/users/me/data` | Mes données personnelles |
| POST | `/api/v1/users/me/data/deletion-request` | Demander suppression |
| GET | `/api/v1/orders/history` | Historique de mes commandes |

### Codes d'erreur fréquents

| Code | HTTP | Signification |
|------|------|--------------|
| `ORDER_NOT_FOUND` | 404 | Commande introuvable (lien invalide ou expiré) |
| `ORDER_INVALID_STATUS` | 400 | La commande n'est plus au statut requis pour cette action |
| `ORDER_COD_LIMIT` | 400 | Montant trop élevé pour le paiement en espèces (max 75 000 FCFA) |
| `ORDER_CANNOT_CANCEL` | 400 | Annulation impossible — la commande est déjà en livraison |

---

## 16. FAQ propriétaire

### Q1 : Dois-je créer un compte pour payer ?

Oui. Vous devez vous connecter avec votre numéro de téléphone pour accéder au lien de commande. La création du compte est rapide : il suffit de saisir votre numéro et le code SMS reçu.

### Q2 : Comment puis-je payer ?

Quatre options : **Orange Money**, **MTN MoMo**, **Wave** (mobile money), ou **espèces à la livraison** (uniquement pour les commandes de 75 000 FCFA ou moins).

### Q3 : Mon paiement est-il sécurisé ?

Oui. Vos fonds sont retenus en **escrow** (séquestre) et ne sont libérés au vendeur qu'après la livraison réussie. En cas de problème, vous pouvez être remboursé.

### Q4 : Puis-je annuler ma commande après avoir payé ?

Oui, tant que les pièces n'ont pas été **expédiées**. Vous pouvez annuler aux statuts : Brouillon, En attente de paiement, Payée, et Confirmée par le vendeur. Les fonds en escrow sont alors remboursés.

### Q5 : Comment savoir où en est ma commande ?

Rouvrez le même lien que votre mécanicien vous a envoyé. La page affiche en temps réel le statut actuel de la commande avec un bandeau coloré.

### Q6 : Qui choisit les pièces ?

Votre **mécanicien** choisit les pièces adaptées à votre véhicule dans le catalogue des vendeurs. Vous n'avez pas besoin de connaître les références techniques.

### Q7 : Qu'est-ce que la "main d'œuvre" sur la facture ?

Ce sont les frais facturés par votre mécanicien pour le travail de recherche et de montage des pièces. Ce montant est fixé par votre mécanicien.

### Q8 : Que se passe-t-il si le vendeur ne confirme pas ?

Le vendeur dispose de **45 minutes** pour confirmer la disponibilité des pièces après votre paiement. Si le vendeur ne confirme pas dans les temps, la commande peut être annulée et vos fonds remboursés.

### Q9 : Puis-je choisir le mode de livraison ?

Non. Le mode de livraison (EXPRESS ou STANDARD) est déterminé par l'administrateur de la plateforme. Vous n'avez pas à vous en préoccuper.

### Q10 : Les prix peuvent-ils changer après que j'ai vu la commande ?

Non. Les prix sont **figés** au moment de la création de la commande par votre mécanicien. Le montant affiché est le montant que vous paierez.

### Q11 : Comment demander un remboursement ?

Si la commande est annulée ou si un litige est résolu en votre faveur, le remboursement est automatique. Votre mécanicien (initiateur de la commande) peut ouvrir un litige en cas de problème avec les pièces reçues.

### Q12 : Puis-je contacter le vendeur directement ?

Non. La communication passe par votre mécanicien. Le vendeur interagit avec la plateforme, pas directement avec vous.

### Q13 : Quelle zone est couverte ?

Actuellement, Pièces couvre les **13 communes du District d'Abidjan** : Abobo, Adjamé, Anyama, Attécoubé, Bingerville, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Songon, Treichville, Yopougon.

---

*Document généré le 2026-03-01 — Pièces v1.0*
