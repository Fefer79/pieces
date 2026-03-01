# Arbre source annoté — Pièces

**Généré le :** 2026-03-01

---

## Structure racine

```
pieces/                                    # Monorepo Turborepo + pnpm
├── .env.example                           # Template variables d'environnement
├── .github/
│   └── workflows/
│       ├── ci.yml                         # CI: lint → test → build
│       └── deploy-api.yml                 # Déploiement API sur Fly.io
├── turbo.json                             # Configuration Turborepo
├── pnpm-workspace.yaml                    # Workspaces: apps/*, packages/*
├── package.json                           # Scripts racine (dev, build, test, lint)
├── pnpm-lock.yaml                         # Lockfile
│
├── apps/
│   ├── api/                               # ═══ BACKEND FASTIFY ═══
│   └── web/                               # ═══ FRONTEND NEXT.JS PWA ═══
│
├── packages/
│   └── shared/                            # ═══ PACKAGE PARTAGÉ ═══
│
├── docs/                                  # Documentation générée
├── doc/                                   # Recherches (.docx)
└── _bmad-output/                          # Artefacts BMAD (PRD, architecture, epics)
```

---

## API Backend (`apps/api/`)

```
apps/api/
├── package.json                           # Fastify 5.3, Prisma, Zod, Sharp, AWS SDK
├── tsconfig.json                          # TypeScript config
├── esbuild.config.js                      # Bundler → dist/server.js
│
└── src/
    ├── server.ts                          # ★ ENTRY POINT — buildApp() + start()
    ├── server.test.ts                     # Test santé serveur
    │
    ├── lib/                               # ── Utilitaires transversaux ──
    │   ├── appError.ts                    # Classe AppError (code, statusCode, details)
    │   ├── appError.test.ts
    │   ├── zodSchema.ts                   # zodToFastify() — Zod → JSON Schema OpenAPI
    │   ├── zodSchema.test.ts
    │   ├── prisma.ts                      # Singleton Prisma Client
    │   ├── supabase.ts                    # Client Supabase Admin
    │   ├── gemini.ts                      # Client Google Generative AI
    │   ├── imageProcessor.ts              # Pipeline Sharp (thumb/small/medium/large)
    │   ├── r2.ts                          # Client Cloudflare R2 (S3)
    │   └── cinetpay.ts                    # Client CinetPay (paiement mobile)
    │
    ├── plugins/                           # ── Plugins Fastify globaux ──
    │   ├── auth.ts                        # requireAuth, requireConsent, requireRole
    │   ├── auth.test.ts
    │   ├── cors.ts                        # CORS config
    │   ├── helmet.ts                      # Security headers
    │   ├── rateLimit.ts                   # Rate limiting
    │   ├── swagger.ts                     # Auto-documentation Swagger UI
    │   └── errorHandler.ts                # Gestion centralisée erreurs → 422/500
    │
    └── modules/                           # ── Modules métier ──
        ├── auth/                          # OTP SMS, vérification
        │   ├── auth.routes.ts
        │   ├── auth.routes.test.ts
        │   ├── auth.service.ts
        │   └── auth.service.test.ts
        │
        ├── user/                          # Profil, rôles, contexte
        │   ├── user.routes.ts
        │   ├── user.routes.test.ts
        │   ├── user.service.ts
        │   └── user.service.test.ts
        │
        ├── consent/                       # Consentement ARTCI, suppression données
        │   └── ... (même pattern)
        │
        ├── vendor/                        # Onboarding, KYC, garanties, zones
        │   └── ...
        │
        ├── catalog/                       # CRUD catalogue, pipeline IA
        │   └── ...
        │
        ├── browse/                        # Navigation, recherche, VIN
        │   └── ...
        │
        ├── vehicle/                       # Profils véhicules utilisateur
        │   └── ...
        │
        ├── order/                         # Commandes tripartites
        │   ├── order.routes.ts
        │   ├── order.routes.test.ts
        │   ├── order.service.ts
        │   ├── order.service.test.ts
        │   ├── order.stateMachine.ts      # ★ Machine à états déclarative
        │   └── order.stateMachine.test.ts
        │
        ├── payment/                       # Séquestre, CinetPay
        │   └── ...
        │
        ├── delivery/                      # Livraison, GPS, COD, SLA
        │   └── ...
        │
        ├── review/                        # Évaluations, litiges
        │   └── ...
        │
        ├── notification/                  # Multi-canal (WhatsApp/SMS/Push)
        │   └── ...
        │
        ├── whatsapp/                      # Webhook Meta, bot
        │   └── ...
        │
        ├── vision/                        # Identification photo IA (Gemini)
        │   └── ...
        │
        ├── admin/                         # Dashboard, gestion plateforme
        │   └── ...
        │
        └── queue/                         # Jobs background
            ├── queueService.ts
            ├── queueService.test.ts
            ├── worker.ts
            └── handlers/
                └── imageProcess.ts        # Handler pipeline images
```

---

## Web Frontend (`apps/web/`)

```
apps/web/
├── package.json                           # Next.js 15, React 19, Tailwind 4, Serwist
├── next.config.ts                         # PWA + API proxy + transpile shared
├── middleware.ts                          # Auth middleware (Supabase SSR)
├── tsconfig.json
├── postcss.config.mjs                     # Tailwind CSS v4
├── vitest.config.ts
├── eslint.config.mjs
│
├── public/
│   ├── manifest.json                      # PWA manifest
│   ├── sw.js                              # Service Worker compilé
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── lib/
│   ├── supabase.ts                        # Factory createBrowserClient
│   ├── supabase-middleware.ts             # Factory createServerClient (Edge)
│   └── role-labels.ts                     # Labels rôles en français
│
└── app/
    ├── layout.tsx                         # ★ Root layout (lang="fr", metadata PWA)
    ├── page.tsx                           # Landing page publique
    ├── globals.css                        # Tailwind imports
    ├── sw.ts                              # Source Service Worker (Serwist)
    │
    └── (auth)/                            # ── Route group protégé ──
        ├── layout.tsx                     # Nav bar bottom + consent gate
        ├── consent-modal.tsx              # Modal consentement ARTCI
        │
        ├── login/
        │   ├── page.tsx                   # Saisie +225 phone
        │   └── otp/page.tsx              # Vérification OTP 6 digits
        │
        ├── browse/
        │   ├── page.tsx                   # Recherche + grille marques
        │   ├── photo/page.tsx            # ID par photo
        │   ├── vehicles/page.tsx         # Profils véhicules
        │   ├── vin/page.tsx              # Décodage VIN
        │   └── [brand]/
        │       ├── page.tsx              # Modèles
        │       └── [model]/
        │           ├── page.tsx          # Années
        │           └── [year]/page.tsx   # Pièces disponibles
        │
        ├── choose/
        │   └── [shareToken]/page.tsx     # Choix propriétaire (guest)
        │
        ├── vendors/
        │   ├── catalog/
        │   │   ├── page.tsx              # Liste catalogue
        │   │   ├── upload/page.tsx       # Upload images
        │   │   └── [id]/page.tsx         # Détail item
        │   ├── dashboard/page.tsx        # Dashboard vendeur
        │   ├── delivery-zones/page.tsx   # Zones livraison
        │   └── guarantees/page.tsx       # Garanties
        │
        ├── rider/
        │   ├── page.tsx                  # Dashboard livreur
        │   └── delivery/
        │       └── [deliveryId]/page.tsx # Détail mission
        │
        ├── orders/page.tsx              # Historique commandes
        ├── onboarding/new/page.tsx      # Onboarding vendeur
        ├── profile/
        │   ├── page.tsx                 # Profil
        │   └── data/page.tsx            # Données personnelles
        └── admin/page.tsx               # Dashboard admin
```

---

## Package partagé (`packages/shared/`)

```
packages/shared/
├── package.json                           # Exports: types, validators, constants, env
├── index.ts                               # ★ Barrel re-export principal
├── env.ts                                 # Schemas Zod env (webEnvSchema, apiEnvSchema)
├── env.test.ts
├── tsconfig.json
├── vitest.config.ts
│
├── types/
│   ├── index.ts                           # Re-exports
│   ├── api.ts                             # ApiResponse<T>, ApiError
│   └── roles.ts                           # Role enum + RolePermissions
│
├── validators/
│   ├── index.ts                           # Re-exports (20+ schemas)
│   ├── auth.ts                            # phoneSchema, otpSchema
│   ├── user.ts                            # switchContextSchema, updateRolesSchema
│   ├── consent.ts                         # consentSchema, deletionRequestSchema
│   ├── vendor.ts                          # createVendorSchema, kycType, guaranteeType
│   ├── catalog.ts                         # catalogItemFilterSchema, updateCatalogItemSchema
│   ├── browse.ts                          # vinDecodeSchema, createVehicleSchema
│   ├── order.ts                           # createOrderSchema, confirmOrderSchema
│   ├── review.ts                          # createSellerReviewSchema, openDisputeSchema
│   └── notification.ts                    # updatePreferencesSchema, sendNotificationSchema
│
├── constants/
│   ├── index.ts                           # Re-exports
│   ├── categories.ts                      # 15 catégories pièces auto (FR)
│   ├── vehicles.ts                        # 12 marques, 54 modèles, années
│   └── communes.ts                        # 13 communes Abidjan
│
└── prisma/
    ├── schema.prisma                      # ★ 16 modèles, 15 enums
    └── migrations/                        # 13 migrations (2026-03-01)
        ├── 20260301_init_user_model/
        ├── 20260301_add_vendor_and_kyc/
        ├── 20260301_add_user_vehicles/
        ├── 20260301_add_vendor_delivery_zones/
        ├── 20260301_add_catalog_items_and_jobs/
        ├── 20260301_add_catalog_stock_price_fields/
        ├── 20260301_add_orders_and_payments/
        ├── 20260301_add_deliveries/
        ├── 20260301_add_reviews_and_disputes/
        ├── 20260301_add_guarantee_signatures/
        ├── 20260301_add_consent_and_deletion_request/
        ├── 20260301_add_notification_preferences/
        └── 20260301_add_search_synonyms_pg_trgm/
```
