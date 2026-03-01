# Architecture d'intégration — Pièces

**Généré le :** 2026-03-01

---

## Vue d'ensemble

Le monorepo Pièces contient 3 parties qui communiquent comme suit :

```
┌─────────────────────┐         ┌──────────────────────┐
│   apps/web          │  HTTP   │   apps/api           │
│   (Next.js PWA)     │────────►│   (Fastify)          │
│                     │  /api/* │                      │
│   Port: 3000        │  proxy  │   Port: 3001         │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                                  ┌────────┴────────┐
                                  │                 │
                            ┌─────▼─────┐    ┌─────▼─────┐
                            │ Supabase  │    │ PostgreSQL│
                            │ Auth      │    │ (Prisma)  │
                            └───────────┘    └───────────┘
                                  │
┌─────────────────────┐           │
│ packages/shared     │◄──────────┘
│ (Types, Validators, │  importé par
│  Constants, Prisma) │  api + web
└─────────────────────┘
```

---

## Points d'intégration

### 1. Web → API (HTTP via Proxy)

| Aspect | Détail |
|--------|--------|
| **Protocole** | HTTP/REST |
| **Mécanisme** | Next.js rewrites (`/api/:path*` → `NEXT_PUBLIC_API_URL`) |
| **Format** | JSON |
| **Auth** | Bearer token (Supabase JWT) dans header `Authorization` |
| **Erreurs** | `{ error: { code, message, statusCode } }` |

Le frontend ne fait **jamais** d'appels directs au backend. Toutes les requêtes passent par le proxy Next.js, ce qui :
- Élimine les problèmes CORS en production
- Permet aux cookies Supabase SSR de transiter correctement
- Centralise la configuration de l'URL backend

### 2. API → Supabase Auth (HTTP)

| Aspect | Détail |
|--------|--------|
| **Protocole** | HTTP/REST (Supabase JS SDK) |
| **Utilisation** | Vérification Bearer token via `supabase.auth.getUser(token)` |
| **Clé** | `SUPABASE_SERVICE_ROLE_KEY` (rôle admin) |
| **Flux** | Token reçu → Supabase vérifie → Retourne user ID/metadata |

### 3. Web → Supabase Auth (HTTP)

| Aspect | Détail |
|--------|--------|
| **Protocole** | HTTP (Supabase SSR SDK) |
| **Utilisation** | `signInWithOtp`, `verifyOtp`, `getUser`, `getSession` |
| **Clé** | `SUPABASE_ANON_KEY` (clé publique) |
| **Stockage** | Cookies HTTP-only (SSR) |

### 4. API → PostgreSQL (Prisma ORM)

| Aspect | Détail |
|--------|--------|
| **Protocole** | PostgreSQL wire protocol |
| **ORM** | Prisma Client (généré depuis schema.prisma) |
| **URL** | `DATABASE_URL` (connection string) |
| **Hébergement** | Supabase (PostgreSQL managé) |

### 5. API → Services externes

| Service | Protocole | Usage |
|---------|-----------|-------|
| **Google Gemini** | HTTP REST | Identification pièces par photo IA |
| **Cloudflare R2** | S3 API (HTTP) | Stockage images (4 variantes) |
| **CinetPay** | HTTP REST | Initiation paiement mobile money |
| **WhatsApp Business** | Graph API (HTTP) | Envoi messages, templates |
| **Meta Webhooks** | HTTP POST + HMAC | Réception messages WhatsApp |

### 6. Shared → API + Web (import TypeScript)

| Aspect | Détail |
|--------|--------|
| **Mécanisme** | `"shared": "workspace:*"` dans package.json |
| **Transpilation** | `transpilePackages: ['shared']` dans next.config.ts |
| **Exports** | Types API, 20+ validators Zod, constantes métier, schéma Prisma |

Le package `shared` assure la cohérence des types et validations entre frontend et backend :
- Les **mêmes schémas Zod** valident côté client et côté serveur
- Les **mêmes types** (`ApiResponse`, `Role`, etc.) sont utilisés partout
- Les **mêmes constantes** (communes, marques, catégories) alimentent les deux apps

---

## Flux de données principaux

### Flux de commande tripartite

```
Mécanicien (Web)                    Propriétaire (Web)
     │                                     │
     ▼                                     │
POST /orders                               │
  → createOrder()                          │
  → génère shareToken                      │
  → status: DRAFT                          │
     │                                     │
     ├─────── partage lien ──────────────►│
     │         (WhatsApp/SMS)              │
     │                                     ▼
     │                              GET /orders/share/:token
     │                                (guest, pas d'auth)
     │                                     │
     │                                     ▼
     │                              POST /orders/:id/pay
     │                                → selectPaymentMethod()
     │                                → status: PAID
     │                                     │
     │                                     ▼
     │                              CinetPay webhook
     │                                → releaseEscrow()
     │
Vendeur (Web)
     │
     ▼
POST /orders/:id/confirm
  → vendorConfirm()
  → status: VENDOR_CONFIRMED
     │
     ▼
Admin assigne rider
POST /deliveries/:id/assign
     │
Rider (Web)
     │
     ▼
POST /deliveries/:id/pickup → in-transit → deliver → confirm
  → GPS tracking en temps réel
  → COD collection si applicable
```

### Flux d'identification par photo

```
Utilisateur (Web/WhatsApp)
     │
     ▼
Upload photo
     │
     ├──► API: POST /vision/identify
     │         └──► Gemini AI → { name, category, confidence }
     │
     └──► WhatsApp: POST /whatsapp/webhook (image)
               └──► parseIncomingMessage()
               └──► AI identification
               └──► sendWhatsAppMessage(résultat)
```

---

## Sécurité inter-composants

| Frontière | Mécanisme |
|-----------|-----------|
| Web → API | Bearer JWT via proxy (jamais exposé au navigateur directement) |
| API → Supabase | Service Role Key (clé secrète serveur uniquement) |
| WhatsApp → API | HMAC SHA-256 signature vérification |
| CinetPay → API | Webhook signature + validation orderId |
| Web Middleware | Cookie-based Supabase SSR auth |
| API Auth Plugin | Token verification → Prisma user upsert → RBAC |

---

## Dépendances partagées

| Dépendance | apps/api | apps/web | packages/shared |
|------------|----------|----------|-----------------|
| TypeScript | 5.8 | 5.8 | 5.8 |
| Zod | 3.25 | — | 3.25 |
| Vitest | 3.2 | 3.2 | 3.2 |
| @supabase/* | 2.98 | 2.98 + SSR | — |
| Prisma | via shared | — | 6.x |
| ESLint | 10.x | 9.x | 10.x |
