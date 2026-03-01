# Architecture — API Backend (apps/api)

**Généré le :** 2026-03-01
**Type :** Backend Fastify
**Langage :** TypeScript
**Framework :** Fastify 5.3 + Prisma 6.x

---

## Vue d'ensemble

L'API Pièces est un serveur Fastify modulaire qui implémente une architecture en couches :

```
Routes (thin controllers) → Services (logique métier) → Prisma (accès données)
```

Chaque module métier suit la convention `{module}.routes.ts` + `{module}.service.ts` + tests correspondants.

---

## Point d'entrée et bootstrap

**Fichier :** `src/server.ts`

La fonction `buildApp()` crée l'instance Fastify et enregistre tout dans cet ordre :

1. **Plugins globaux** (helmet, cors, rateLimit, swagger, auth, multipart, errorHandler)
2. **Routes par module** (15 modules montés sous `/api/v1/*`)
3. **Démarrage conditionnel** (`start()` appelé uniquement si `NODE_ENV !== 'test'`)

Configuration :
- Validation d'environnement au démarrage (`apiEnvSchema.parse()`)
- Logger Pino avec redaction PII (`authorization`, `phone`, `email`)
- Port par défaut : 3001

---

## Plugins

| Plugin | Fichier | Rôle |
|--------|---------|------|
| Helmet | `plugins/helmet.ts` | Headers de sécurité HTTP |
| CORS | `plugins/cors.ts` | Cross-origin resource sharing |
| Rate Limit | `plugins/rateLimit.ts` | Limitation de débit |
| Swagger | `plugins/swagger.ts` | Documentation API auto-générée |
| Auth | `plugins/auth.ts` | Authentification + RBAC |
| Error Handler | `plugins/errorHandler.ts` | Gestion centralisée des erreurs |

### Plugin Auth (détail)

- **`requireAuth`** — preHandler : extrait Bearer token → vérifie via Supabase → upsert utilisateur Prisma → décore `request.user`
- **`requireConsent`** — preHandler : vérifie que l'utilisateur a accepté les CGU (`consentedAt`)
- **`requireRole(...roles)`** — factory de preHandler : vérifie que l'utilisateur possède au moins un des rôles spécifiés
- Auto-contexte : si un utilisateur n'a qu'un rôle et pas d'`activeContext`, il est défini automatiquement
- Rôle par défaut à la création : `MECHANIC`

### Error Handler (détail)

Hiérarchie de traitement :
1. `AppError` → utilise `code`, `statusCode`, `details` directement
2. Erreurs de validation Fastify (400) → remappées en **422** avec `details[]` structuré
3. Erreurs Fastify sub-500 → transmises telles quelles
4. Tout autre → **500** générique sans fuite d'informations internes

---

## Modules

### Structure d'un module

```
modules/{domain}/
├── {domain}.routes.ts          # Endpoints HTTP (thin controller)
├── {domain}.routes.test.ts     # Tests d'intégration routes
├── {domain}.service.ts         # Logique métier
└── {domain}.service.test.ts    # Tests unitaires service
```

### Liste des modules

| Module | Préfixe route | Responsabilité |
|--------|---------------|----------------|
| **auth** | `/api/v1/auth` | OTP SMS, vérification, session |
| **user** | `/api/v1/users` | Profil, rôles multiples, contexte actif |
| **consent** | `/api/v1/users/me/consent` | Consentement ARTCI, demande suppression données |
| **vendor** | `/api/v1/vendors` | Onboarding vendeur, KYC, garanties, zones livraison |
| **catalog** | `/api/v1/catalog` | CRUD catalogue, pipeline images IA |
| **browse** | `/api/v1/browse` | Navigation catalogue, recherche, décodage VIN |
| **vehicle** | `/api/v1/vehicles` | Profils véhicules utilisateur |
| **order** | `/api/v1/orders` | Commandes tripartites, machine à états |
| **payment** | `/api/v1/payments` | Séquestre, CinetPay webhook |
| **delivery** | `/api/v1/deliveries` | Assignation, suivi GPS, COD, SLA |
| **review** | `/api/v1/reviews` | Évaluations vendeur/livreur, litiges |
| **notification** | `/api/v1/notifications` | Multi-canal (WhatsApp, SMS, Push) |
| **whatsapp** | `/api/v1/whatsapp` | Webhook Meta, bot identification |
| **vision** | `/api/v1/vision` | Identification pièce par photo (Gemini) |
| **admin** | `/api/v1/admin` | Dashboard, gestion utilisateurs/commandes |
| **queue** | (interne) | File de jobs background (images) |

---

## Librairies internes (`src/lib/`)

| Fichier | Rôle |
|---------|------|
| `appError.ts` | Classe `AppError` (code, statusCode, details) |
| `zodSchema.ts` | `zodToFastify()` — convertit Zod → JSON Schema OpenAPI 3 |
| `prisma.ts` | Singleton Prisma Client |
| `supabase.ts` | Client Supabase Admin (service role) |
| `gemini.ts` | Client Google Generative AI |
| `imageProcessor.ts` | Pipeline Sharp (thumbnail, small, medium, large) |
| `r2.ts` | Client Cloudflare R2 (upload S3-compatible) |
| `cinetpay.ts` | Client CinetPay (initiation paiement, vérification) |

---

## Patterns architecturaux

### 1. Validation unique (Single Source of Truth)

Les schémas Zod dans `packages/shared/validators/` servent de source unique :
- Validation runtime côté API via `zodToFastify()`
- Validation côté client (même schéma importé)
- Documentation Swagger auto-générée

### 2. Machine à états déclarative

`order.stateMachine.ts` définit les transitions de statut comme une table adjacente :
```
DRAFT → PENDING_PAYMENT → PAID → VENDOR_CONFIRMED → DISPATCHED →
IN_TRANSIT → DELIVERED → CONFIRMED → COMPLETED
```
Avec `CANCELLED` comme état terminal accessible depuis les étapes précoces.

### 3. Event sourcing (audit trail)

Chaque transition de commande crée un `OrderEvent` immuable :
`{ fromStatus, toStatus, actor, note, createdAt }`

### 4. Séquestre de paiement

Cycle de vie : `HELD → RELEASED` (vendeur payé) ou `HELD → REFUNDED` (annulation).
Gardes pour prévenir double release/refund.

### 5. RBAC composable

```typescript
preHandler: [requireAuth, requireRole('ADMIN')]
preHandler: [requireAuth, requireConsent]
```

### 6. Réponse API uniformisée

```typescript
{ data: T }                    // Succès
{ error: { code, message, statusCode, details? } }  // Erreur
```

---

## Tests

- **Framework :** Vitest 3.2
- **Pattern :** `buildApp()` factory pour tests d'intégration (instance Fastify isolée)
- **Mocking :** `vi.mock()` pour Prisma, Supabase, services externes
- **Total :** ~250 tests API (sur 303 total projet)

### Leçon critique

`vi.clearAllMocks()` ne vide PAS la queue `mockResolvedValueOnce`. Utiliser `mockReset()` sur chaque mock dans `beforeEach` pour éviter la pollution inter-tests.

---

## Déploiement

- **CI :** GitHub Actions (lint → test → build)
- **Déploiement :** Fly.io via `flyctl deploy`
- **Trigger :** Push sur `main` touchant `apps/api/**` ou `packages/shared/**`
- **Build :** esbuild (bundling en un seul fichier `dist/server.js`)
