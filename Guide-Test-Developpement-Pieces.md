# Guide de Test en Développement — Pièces Marketplace

**Version :** 1.0
**Date :** 1er mars 2026
**Projet :** Pièces — Marketplace de pièces automobiles d'occasion (Côte d'Ivoire)

---

## Table des matières

1. [Prérequis et Installation](#1-prérequis-et-installation)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Base de données (Prisma + Supabase)](#3-base-de-données)
4. [Authentification OTP par SMS](#4-authentification-otp-par-sms)
5. [API Swagger — Explorer tous les endpoints](#5-api-swagger)
6. [PWA — Tester l'application web mobile](#6-pwa)
7. [Bot WhatsApp — Configuration Meta](#7-bot-whatsapp)
8. [Paiement CinetPay — Mode Sandbox](#8-paiement-cinetpay)
9. [Vision IA — Identification de pièces par photo](#9-vision-ia-gemini)
10. [Stockage d'images — Cloudflare R2](#10-stockage-images-r2)
11. [Notifications multi-canal](#11-notifications)
12. [Tests automatisés](#12-tests-automatisés)
13. [Résumé des variables d'environnement](#13-variables-denvironnement)

---

## 1. Prérequis et Installation

### Outils requis

| Outil | Version | Installation |
|-------|---------|-------------|
| Node.js | 22+ | https://nodejs.org |
| pnpm | 10.30+ | `npm install -g pnpm` |
| ngrok | dernière | https://ngrok.com/download |
| Git | dernière | Pré-installé sur macOS |

### Installation du projet

```bash
# Cloner le dépôt
git clone <repo-url> pieces
cd pieces

# Installer les dépendances
pnpm install

# Générer le client Prisma
pnpm --filter shared exec prisma generate
```

---

## 2. Démarrage rapide

### Fichiers d'environnement

Deux fichiers `.env` sont nécessaires :

**`apps/api/.env`** — Configuration de l'API Fastify :
```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PINO_LOG_LEVEL=info
PORT=3001
```

**`apps/web/.env.local`** — Configuration du frontend Next.js :
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### Lancer les serveurs

```bash
# Démarrer API + Web en parallèle
pnpm dev

# API : http://localhost:3001
# Web : http://localhost:3000
# Swagger : http://localhost:3001/api/v1/docs
# Health check : http://localhost:3001/healthz
```

### Vérification rapide

1. Ouvrir http://localhost:3001/healthz → doit retourner `{ "status": "ok" }`
2. Ouvrir http://localhost:3001/api/v1/docs → interface Swagger UI
3. Ouvrir http://localhost:3000 → page d'accueil Pièces

---

## 3. Base de données

### Architecture

- **Provider :** PostgreSQL hébergé sur Supabase
- **ORM :** Prisma 6.19
- **Schéma :** `packages/shared/prisma/schema.prisma`

### Commandes Prisma

```bash
# Appliquer les migrations en dev
pnpm --filter shared exec prisma migrate dev

# Créer une nouvelle migration
pnpm --filter shared exec prisma migrate dev --name nom_migration

# Ouvrir Prisma Studio (interface graphique pour explorer la DB)
pnpm --filter shared exec prisma studio
# → Ouvre http://localhost:5555
```

### Prisma Studio

Prisma Studio permet d'explorer et modifier les données directement dans le navigateur. C'est l'outil idéal pour :
- Créer des utilisateurs de test avec différents rôles
- Inspecter les commandes et leur statut
- Vérifier les données de catalogue
- Déboguer les relations entre entités

### Modèles principaux

| Modèle | Description |
|--------|------------|
| `User` | Utilisateurs avec rôles (MECHANIC, OWNER, SELLER, RIDER, ADMIN, ENTERPRISE) |
| `Vendor` | Profil vendeur avec KYC et garanties |
| `CatalogItem` | Pièces du catalogue avec images, prix, compatibilité véhicule |
| `Order` | Commandes avec 10 statuts (DRAFT → COMPLETED) |
| `Delivery` | Livraisons avec suivi GPS |
| `Dispute` | Litiges avec preuves et arbitrage |

---

## 4. Authentification OTP par SMS

### Fonctionnement

L'authentification utilise Supabase Auth avec OTP (One-Time Password) par SMS :

1. L'utilisateur entre son numéro de téléphone (format +225...)
2. Supabase envoie un code OTP par SMS
3. L'utilisateur entre le code → reçoit un JWT
4. Le JWT est envoyé dans chaque requête API : `Authorization: Bearer <jwt>`

### Configuration Supabase pour le développement

1. Aller sur https://supabase.com/dashboard → votre projet
2. **Authentication → Providers → Phone** : vérifier que le provider SMS est activé
3. **Authentication → URL Configuration** : ajouter `http://localhost:3000` dans les Redirect URLs

### Tester sans SMS réel

**Option A — Supabase Test OTP (recommandé) :**

1. Dashboard Supabase → Authentication → Phone
2. Activer "Enable test phone numbers"
3. Ajouter un numéro test : `+2250700000001` avec OTP fixe `123456`
4. Utiliser ce numéro dans l'app → le code `123456` fonctionne toujours

**Option B — Logs Supabase :**

1. Dashboard → Logs → Auth
2. Envoyer un OTP via l'app
3. Le code apparaît dans les logs (en mode dev uniquement)

### Tester via l'API directement

```bash
# 1. Demander un OTP
curl -X POST https://<project-ref>.supabase.co/auth/v1/otp \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000001"}'

# 2. Vérifier l'OTP
curl -X POST https://<project-ref>.supabase.co/auth/v1/verify \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250700000001", "token": "123456", "type": "sms"}'

# → Retourne un access_token JWT à utiliser dans les requêtes API
```

---

## 5. API Swagger

### Accès

Ouvrir **http://localhost:3001/api/v1/docs** dans le navigateur.

L'interface Swagger UI permet de :
- Voir tous les endpoints de l'API
- Tester les requêtes directement depuis le navigateur
- Voir les schémas de requête/réponse

### Authentification dans Swagger

1. Obtenir un JWT via l'authentification OTP (voir section 4)
2. Cliquer sur le bouton **"Authorize"** en haut à droite de Swagger UI
3. Entrer : `Bearer <votre_jwt>`
4. Tous les endpoints protégés sont maintenant accessibles

### Endpoints principaux

| Préfixe | Module | Description |
|---------|--------|------------|
| `/api/v1/auth` | Auth | Inscription, connexion OTP |
| `/api/v1/users` | Users | Profils, rôles, véhicules, consentement |
| `/api/v1/vendors` | Vendors | Onboarding vendeur, KYC |
| `/api/v1/catalog` | Catalogue | CRUD pièces, images |
| `/api/v1/browse` | Navigation | Recherche, filtres, catalogue public |
| `/api/v1/vision/identify` | Vision IA | Identification par photo |
| `/api/v1/orders` | Commandes | Création, suivi, annulation |
| `/api/v1/deliveries` | Livraison | Missions rider, suivi GPS |
| `/api/v1/reviews` | Évaluations | Notes et avis |
| `/api/v1/notifications` | Notifications | Préférences, envoi |
| `/api/v1/admin` | Admin | Gestion cross-tenant |
| `/api/v1/whatsapp` | WhatsApp | Webhook Meta |

### Rate Limiting

L'API limite à **100 requêtes par minute par IP**. En développement, cela ne devrait pas poser de problème.

---

## 6. PWA — Tester l'application web mobile

### Mode développement (sans Service Worker)

En `NODE_ENV=development`, le Service Worker (Serwist) est **désactivé**. L'app fonctionne comme une app web classique :

```bash
pnpm dev
# Ouvrir http://localhost:3000
```

Pour tester sur mobile depuis le même réseau Wi-Fi :
```bash
# Trouver votre IP locale
ifconfig | grep "inet " | grep -v 127.0.0.1
# → Ex: 192.168.1.42

# Ouvrir sur le téléphone : http://192.168.1.42:3000
```

### Mode production (avec Service Worker + Offline)

Pour tester le comportement PWA complet (installation, offline, cache) :

```bash
# Build en mode production
pnpm --filter web build

# Démarrer en mode production
pnpm --filter web start
# → http://localhost:3000 avec Service Worker actif
```

### Tester le comportement offline

1. Ouvrir l'app en mode production dans Chrome
2. DevTools → Application → Service Workers → vérifier que `sw.js` est installé
3. DevTools → Network → cocher "Offline"
4. Naviguer dans l'app → les pages cachées doivent fonctionner
5. Essayer une action (commande) → doit être mise en file d'attente

### Installation PWA

1. Ouvrir l'app en mode production
2. Chrome → menu ⋮ → "Installer l'application" (ou bannière automatique)
3. L'app s'ouvre comme une app native

### HTTPS pour PWA (requis pour le Service Worker sur mobile)

Le Service Worker nécessite HTTPS (sauf `localhost`). Pour tester sur mobile :

```bash
# Option 1 : ngrok (HTTPS automatique)
ngrok http 3000
# → Utiliser l'URL https://<id>.ngrok.io sur le téléphone

# Option 2 : mkcert (certificat local)
brew install mkcert
mkcert -install
mkcert localhost 192.168.1.42
# Configurer Next.js avec le certificat généré
```

---

## 7. Bot WhatsApp — Configuration Meta

### Prérequis

1. Un compte **Meta for Developers** : https://developers.facebook.com
2. Une **app Facebook** configurée avec le produit "WhatsApp"
3. **ngrok** installé pour exposer l'API locale

### Étape 1 : Configurer l'app Meta

1. Aller sur https://developers.facebook.com → Mes apps → Créer une app
2. Choisir "Business" → ajouter le produit "WhatsApp"
3. Dans WhatsApp → Getting Started :
   - Noter le **Phone Number ID** (numéro test fourni par Meta)
   - Noter le **Temporary Access Token** (valable 24h)

### Étape 2 : Exposer l'API locale avec ngrok

```bash
# Dans un terminal séparé
ngrok http 3001

# Copier l'URL HTTPS, ex: https://abc123.ngrok-free.app
```

### Étape 3 : Configurer le webhook Meta

1. WhatsApp → Configuration → Webhook
2. **Callback URL :** `https://<ngrok-id>.ngrok-free.app/api/v1/whatsapp/webhook`
3. **Verify Token :** `pieces-verify-token` (valeur par défaut, configurable via `WHATSAPP_VERIFY_TOKEN`)
4. Cliquer "Vérifier et enregistrer"
5. S'abonner aux champs : `messages`

### Étape 4 : Variables d'environnement

Ajouter dans `apps/api/.env` :

```env
WHATSAPP_TOKEN=<temporary_access_token_from_meta>
WHATSAPP_PHONE_ID=<phone_number_id_from_meta>
WHATSAPP_VERIFY_TOKEN=pieces-verify-token
# WHATSAPP_APP_SECRET= (optionnel en dev — si absent, la vérification HMAC est désactivée)
```

Redémarrer l'API : `pnpm --filter api dev`

### Étape 5 : Tester

1. Ouvrir WhatsApp sur votre téléphone
2. Envoyer un message au **numéro test Meta** affiché dans le dashboard
3. Commandes disponibles :
   - Envoyer du texte → recherche de pièces par mot-clé
   - Envoyer une photo de pièce → identification IA
   - `commander` → démarrer un flow de commande
4. Vérifier les logs API dans le terminal

### Notes importantes

- Le **token temporaire Meta expire après 24h** — le renouveler régulièrement
- Sans `WHATSAPP_APP_SECRET`, la vérification HMAC des webhooks est désactivée (OK en dev)
- Les sessions WhatsApp sont stockées en mémoire (Map) avec TTL de 5 minutes
- Seuil de commande : **25 000 FCFA** — au-delà, un lien web est envoyé au lieu d'une commande automatique

---

## 8. Paiement CinetPay — Mode Sandbox

### Mode Stub (sans compte CinetPay)

Si `CINETPAY_API_KEY` et `CINETPAY_SITE_ID` ne sont pas définis, le système fonctionne en **mode stub** :
- `initializePayment()` retourne un faux `transaction_id` avec `status: 'pending'`
- Aucun appel externe n'est fait
- Parfait pour tester le flow de commande sans paiement réel

### Avec un compte CinetPay Sandbox

1. Créer un compte sur https://cinetpay.com
2. Dashboard → Paramètres → Mode Test / Sandbox
3. Récupérer :
   - **API Key** (clé de test)
   - **Site ID** (identifiant du site)

4. Ajouter dans `apps/api/.env` :

```env
CINETPAY_API_KEY=<api_key_sandbox>
CINETPAY_SITE_ID=<site_id_sandbox>
NEXT_PUBLIC_URL=http://localhost:3000
API_URL=https://<ngrok-id>.ngrok-free.app
```

**Important :** `API_URL` doit être l'URL ngrok pour que CinetPay puisse envoyer le webhook de confirmation.

### Webhook CinetPay

- **Endpoint :** `POST /api/v1/webhooks/cinetpay`
- **Payload attendu :** `{ cpm_trans_id, cpm_trans_status, cpm_amount, cpm_site_id }`
- Quand `cpm_trans_status === 'ACCEPTED'` → crée un enregistrement escrow en DB

### Canaux de paiement

| Mode | Canal CinetPay |
|------|---------------|
| Orange Money | `ORANGE_CI` |
| MTN MoMo | `MTN_CI` |
| Autres | `ALL` |

### Tester le flow complet

1. Créer une commande via Swagger ou l'app web
2. Initier le paiement → redirigé vers la page CinetPay sandbox
3. Utiliser les cartes/numéros test fournis par CinetPay
4. Après paiement → webhook reçu → escrow créé → commande passe en `PAID`

---

## 9. Vision IA — Identification de pièces (Gemini)

### Prérequis

1. Aller sur https://aistudio.google.com/apikey
2. Créer une clé API (gratuite — quota de 60 requêtes/minute sur le tier gratuit)
3. Ajouter dans `apps/api/.env` :

```env
GEMINI_API_KEY=<votre_cle_api>
# GEMINI_MODEL=gemini-2.0-flash  (défaut, pas besoin de changer)
```

### Sans clé Gemini

Si `GEMINI_API_KEY` n'est pas défini, les endpoints Vision retournent `null` sans crash. Le système fonctionne mais sans identification IA.

### Tester via Swagger

```bash
# Identification par photo
curl -X POST http://localhost:3001/api/v1/vision/identify \
  -H "Authorization: Bearer <jwt>" \
  -F "file=@photo_piece.jpg"

# Avec filtre véhicule (améliore la précision)
curl -X POST "http://localhost:3001/api/v1/vision/identify?brand=Toyota&model=Corolla&year=2015" \
  -H "Authorization: Bearer <jwt>" \
  -F "file=@photo_piece.jpg"

# Désambiguïsation
curl -X POST http://localhost:3001/api/v1/vision/disambiguate \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"category": "Filtration", "brand": "Toyota"}'
```

### Niveaux de confiance

| Score | Résultat |
|-------|---------|
| ≥ 0.7 | Haute confiance — retourne les pièces correspondantes du catalogue |
| 0.3 – 0.69 | Faible confiance — retourne des catégories candidates pour désambiguïsation |
| < 0.3 | Échec — impossible d'identifier la pièce |

### Formats d'image acceptés

- JPEG, PNG, WebP
- Taille maximale : 5 Mo
- Résolution minimale recommandée : 300×300 px

---

## 10. Stockage d'images — Cloudflare R2

### Mode développement (sans R2)

Sans les variables R2, le système peut fonctionner partiellement :
- Les URLs d'images seront vides dans les CatalogItems
- Le pipeline d'images (génération de variantes) ne fonctionnera pas

### Avec Cloudflare R2

1. Créer un compte Cloudflare : https://dash.cloudflare.com
2. R2 → Créer un bucket nommé `pieces-images`
3. R2 → Gérer les clés API R2 → Créer un token d'API
4. Configurer un domaine personnalisé ou activer l'accès public R2

5. Ajouter dans `apps/api/.env` :

```env
R2_ACCOUNT_ID=<cloudflare_account_id>
R2_ACCESS_KEY_ID=<r2_access_key>
R2_SECRET_ACCESS_KEY=<r2_secret_key>
R2_BUCKET_NAME=pieces-images
R2_PUBLIC_URL=https://images.pieces.ci
```

### Pipeline d'images

Quand une image est uploadée, Sharp génère 4 variantes WebP :

| Variante | Largeur | Usage |
|----------|---------|-------|
| `thumb` | 150 px | Listes, grilles |
| `small` | 400 px | Cards, aperçus |
| `medium` | 800 px | Page produit mobile |
| `large` | 1200 px | Page produit desktop |

### Contrôle qualité automatique

L'image originale est vérifiée :
- Résolution minimum : 300×300 px
- Netteté (écart-type) > 20
- Luminosité entre 30 et 240

---

## 11. Notifications multi-canal

### Architecture

Le système de notifications supporte 3 canaux :
- **WhatsApp** (via Meta Cloud API)
- **SMS** (via Supabase / provider tiers)
- **Push** (via Service Worker PWA)

### Préférences utilisateur

Chaque utilisateur peut configurer ses préférences via :
- `PUT /api/v1/notifications/preferences`
- Body : `{ "whatsapp": true, "sms": true, "push": false }`

### Types de notifications

| Événement | Destinataire | Description |
|-----------|-------------|------------|
| Nouvelle commande | Vendeur | Notification de commande à confirmer |
| Commande confirmée | Mécanicien + Propriétaire | Confirmation + détails |
| Livraison assignée | Rider | Nouvelle mission de livraison |
| Stock critique | Vendeur | Alerte quand stock < seuil |
| SLA breach J+1 | Admin | Appel proactif si délai dépassé |

### Tester en développement

Les notifications en dev sont loggées dans la console Pino (pas d'envoi réel sauf si WhatsApp et les providers sont configurés).

---

## 12. Tests automatisés

### Lancer tous les tests

```bash
# Tous les tests du monorepo
pnpm test

# Tests d'un seul package
pnpm --filter api test
pnpm --filter web test

# Un seul fichier de test
pnpm --filter api exec vitest run src/modules/whatsapp/whatsapp.routes.test.ts

# Mode watch (re-exécute à chaque changement)
pnpm --filter api exec vitest src/modules/whatsapp/
```

### Statistiques

- **337+ tests** au total
- Framework : **Vitest**
- Pattern : `vi.mock()` + `buildApp()` pour les tests de routes Fastify
- Couverture : Tous les modules API + services

### Structure des tests

```
apps/api/src/modules/
  ├── auth/
  │   ├── auth.service.ts
  │   ├── auth.service.test.ts
  │   ├── auth.routes.ts
  │   └── auth.routes.test.ts
  ├── orders/
  │   ├── orders.service.ts
  │   ├── orders.service.test.ts
  │   ...
```

Chaque module a ses tests de **service** (logique métier) et de **routes** (HTTP handlers).

---

## 13. Variables d'environnement — Résumé complet

### `apps/api/.env` — API Fastify

| Variable | Requis | Description | Défaut |
|----------|--------|------------|--------|
| `DATABASE_URL` | Oui | URL PostgreSQL Supabase | — |
| `SUPABASE_URL` | Oui | URL du projet Supabase | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Clé service role Supabase | — |
| `PORT` | Non | Port de l'API | `3001` |
| `PINO_LOG_LEVEL` | Non | Niveau de log | `info` |
| `SENTRY_DSN` | Non | DSN Sentry pour monitoring | — |
| `GEMINI_API_KEY` | Non* | Clé API Google AI Studio | — |
| `GEMINI_MODEL` | Non | Modèle Gemini | `gemini-2.0-flash` |
| `CINETPAY_API_KEY` | Non* | Clé API CinetPay | — |
| `CINETPAY_SITE_ID` | Non* | Site ID CinetPay | — |
| `WHATSAPP_TOKEN` | Non* | Token Meta Graph API | — |
| `WHATSAPP_PHONE_ID` | Non* | ID numéro WhatsApp Business | — |
| `WHATSAPP_VERIFY_TOKEN` | Non | Token vérification webhook | `pieces-verify-token` |
| `WHATSAPP_APP_SECRET` | Non | Secret HMAC Meta | — |
| `R2_ACCOUNT_ID` | Non* | ID compte Cloudflare | — |
| `R2_ACCESS_KEY_ID` | Non | Clé accès R2 | `''` |
| `R2_SECRET_ACCESS_KEY` | Non | Secret R2 | `''` |
| `R2_BUCKET_NAME` | Non | Nom du bucket | `pieces-images` |
| `R2_PUBLIC_URL` | Non | URL publique CDN | `''` |
| `NEXT_PUBLIC_URL` | Non | URL web publique (CinetPay) | `https://pieces.ci` |
| `API_URL` | Non | URL API publique (CinetPay) | `https://api.pieces.ci` |

*\* Requis pour activer la fonctionnalité correspondante, mais l'API démarre sans.*

### `apps/web/.env.local` — Frontend Next.js

| Variable | Requis | Description |
|----------|--------|------------|
| `NEXT_PUBLIC_API_URL` | Oui | URL de l'API (ex: `http://localhost:3001`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Oui | Clé anon Supabase |
| `NEXT_PUBLIC_SENTRY_DSN` | Non | DSN Sentry frontend |

---

## Checklist de démarrage

- [ ] `pnpm install` exécuté
- [ ] `apps/api/.env` créé avec DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- [ ] `apps/web/.env.local` créé avec NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY
- [ ] `pnpm --filter shared exec prisma generate` exécuté
- [ ] `pnpm --filter shared exec prisma migrate dev` exécuté
- [ ] `pnpm dev` lance l'API (:3001) et le Web (:3000)
- [ ] http://localhost:3001/healthz retourne `{ "status": "ok" }`
- [ ] http://localhost:3001/api/v1/docs affiche Swagger UI
- [ ] Numéro test OTP configuré dans Supabase (optionnel)
- [ ] `GEMINI_API_KEY` configurée pour l'identification IA (optionnel)
- [ ] `ngrok http 3001` lancé pour tester WhatsApp/CinetPay (optionnel)
- [ ] Variables WhatsApp configurées pour le bot (optionnel)
- [ ] Variables CinetPay configurées pour les paiements (optionnel)
- [ ] Variables R2 configurées pour les images (optionnel)
