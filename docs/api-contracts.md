# Contrats API — Pièces

**Généré le :** 2026-03-01
**Base URL :** `/api/v1`
**Format :** JSON
**Authentification :** Bearer token (Supabase JWT)

---

## Convention de réponse

### Succès
```json
{ "data": <T> }
```

### Erreur
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Description lisible",
    "statusCode": 400,
    "details": { ... }
  }
}
```

### Pagination
```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

---

## Auth (`/api/v1/auth`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/request-otp` | — | Envoie un OTP par SMS au numéro +225 |
| POST | `/verify-otp` | — | Vérifie le code OTP 6 chiffres |
| POST | `/logout` | Bearer | Déconnexion |

**Schémas :** `phoneSchema` (+225 + 01/05/07 + 8 chiffres), `otpSchema` (6 chiffres)

---

## Users (`/api/v1/users`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/me` | Bearer | Profil utilisateur courant |
| PATCH | `/me/context` | Bearer | Changer le rôle actif |
| PATCH | `/me/roles` | Bearer + ADMIN | Modifier les rôles d'un utilisateur |
| POST | `/me/consent` | Bearer | Accepter les CGU (consentement ARTCI) |
| POST | `/me/data-deletion` | Bearer | Demander la suppression des données |
| GET | `/me/data-deletion` | Bearer | Statut de la demande de suppression |

---

## Vendors (`/api/v1/vendors`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/` | Bearer | Créer un profil vendeur (onboarding) |
| GET | `/me` | Bearer + SELLER | Mon profil vendeur |
| GET | `/me/dashboard` | Bearer + SELLER | Stats dashboard vendeur |
| POST | `/me/kyc` | Bearer + SELLER | Soumettre document KYC |
| POST | `/me/guarantees` | Bearer + SELLER | Signer une garantie |
| PUT | `/me/delivery-zones` | Bearer + SELLER | Configurer zones de livraison |
| POST | `/me/activate` | Bearer + ADMIN | Activer un vendeur |

**Règle métier :** FORMAL → KYC type RCCM obligatoire, INFORMAL → CNI obligatoire

---

## Catalog (`/api/v1/catalog`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | Bearer + SELLER | Liste du catalogue du vendeur |
| POST | `/upload` | Bearer + SELLER | Upload image(s) → pipeline IA |
| GET | `/:id` | Bearer + SELLER | Détail d'un item catalogue |
| PATCH | `/:id` | Bearer + SELLER | Modifier un item (nom, prix, etc.) |
| PATCH | `/:id/stock` | Bearer + SELLER | Toggle inStock |
| POST | `/:id/publish` | Bearer + SELLER | Publier un item |

**Pipeline images :** Upload → Sharp (4 variantes) → R2 storage → Gemini IA (identification + prix suggéré)

---

## Browse (`/api/v1/browse`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/brands` | — | Liste des marques |
| GET | `/brands/:brand/models` | — | Modèles d'une marque |
| GET | `/search` | — | Recherche textuelle (`?q=...`) |
| POST | `/identify` | Bearer | Identification pièce par photo (IA) |
| POST | `/vin/decode` | Bearer | Décodage VIN 17 caractères |

---

## Vehicles (`/api/v1/vehicles`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | Bearer | Mes véhicules enregistrés |
| POST | `/` | Bearer | Ajouter un véhicule |
| DELETE | `/:id` | Bearer | Supprimer un véhicule |

---

## Orders (`/api/v1/orders`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/` | Bearer | Créer une commande (mécanicien) |
| GET | `/` | Bearer | Mes commandes |
| GET | `/history` | Bearer | Historique paginé |
| GET | `/:orderId` | Bearer | Détail commande |
| GET | `/share/:shareToken` | — | Commande via lien partagé (propriétaire) |
| POST | `/:orderId/pay` | — | Sélection méthode de paiement |
| POST | `/:orderId/confirm` | Bearer | Confirmation vendeur |
| POST | `/:orderId/cancel` | — | Annulation commande |

**Machine à états :** DRAFT → PENDING_PAYMENT → PAID → VENDOR_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → CONFIRMED → COMPLETED

**Règle COD :** Maximum 75 000 FCFA pour paiement à la livraison

---

## Payments (`/api/v1/payments`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/initiate` | Bearer | Initier un paiement CinetPay |
| POST | `/webhook` | — | Webhook CinetPay (notification paiement) |
| GET | `/escrow/:orderId` | Bearer | Statut séquestre |

---

## Deliveries (`/api/v1/deliveries`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/:orderId/assign` | Bearer + ADMIN | Assigner un rider |
| GET | `/mine` | Bearer + RIDER | Mes livraisons |
| GET | `/:id` | Bearer | Détail livraison |
| POST | `/:id/pickup` | Bearer + RIDER | Signaler enlèvement |
| POST | `/:id/in-transit` | Bearer + RIDER | Signaler en transit |
| POST | `/:id/deliver` | Bearer + RIDER | Signaler livraison |
| POST | `/:id/confirm` | Bearer | Confirmer réception (acheteur) |
| POST | `/:id/location` | Bearer + RIDER | Mettre à jour position GPS |
| POST | `/:id/client-absent` | Bearer + RIDER | Protocole client absent |
| POST | `/:id/cod-collect` | Bearer + RIDER | Collecte paiement COD |

---

## Reviews (`/api/v1/reviews`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/seller` | Bearer | Évaluer un vendeur (1-5) |
| GET | `/seller/:vendorId` | — | Avis sur un vendeur + note moyenne |
| POST | `/delivery` | Bearer | Évaluer une livraison (1-5) |
| GET | `/delivery/:riderId` | — | Avis sur un livreur + note moyenne |
| POST | `/disputes` | Bearer | Ouvrir un litige |
| GET | `/disputes/order/:orderId` | Bearer | Litiges d'une commande |
| POST | `/disputes/:disputeId/resolve` | Bearer + ADMIN | Résoudre un litige |

**Ownership checks :** L'initiateur de la commande peut seul laisser un avis ou ouvrir un litige.

---

## Notifications (`/api/v1/notifications`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/preferences` | Bearer | Mes préférences notification |
| PUT | `/preferences` | Bearer | Modifier mes préférences |
| POST | `/send` | Bearer + ADMIN | Envoyer une notification |

**Canaux :** WhatsApp (actif), SMS (stub), Push PWA (stub)

---

## WhatsApp (`/api/v1/whatsapp`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/webhook` | — | Vérification webhook Meta (challenge) |
| POST | `/webhook` | HMAC | Messages entrants (texte, image, commandes) |

**Commandes bot :** `aide`, `help`, `recherche [terme]`, envoi photo → identification IA

---

## Vision (`/api/v1/vision`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/identify` | Bearer | Identifier une pièce par photo (Gemini IA) |

---

## Admin (`/api/v1/admin`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/dashboard` | Bearer + ADMIN | Statistiques plateforme |
| GET | `/users` | Bearer + ADMIN | Liste utilisateurs paginée |
| GET | `/orders` | Bearer + ADMIN | Liste commandes paginée |
| GET | `/vendors` | Bearer + ADMIN | Liste vendeurs paginée |
