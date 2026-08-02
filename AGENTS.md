# AGENTS.md — Pièces.ci

> Ce fichier est destiné aux agents de codage IA. Il résume l’architecture, les conventions et les commandes nécessaires pour travailler sereinement dans ce dépôt. Lisez aussi `CLAUDE.md` (guide de code) et `DESIGN.md` (système de design) avant toute modification.

---

## 1. Vue d’ensemble du projet

**Pièces** est une marketplace de pièces automobiles neuves, d’occasion importée et ré-usinées, opérée en Côte d’Ivoire (locale : français, devise : FCFA, téléphone : `+225XXXXXXXXXX`).

Stack de base :

- **Gestionnaire de paquets** : pnpm 10.x (`packageManager: pnpm@10.30.3`)
- **Runtime** : Node.js 22
- **Monorepo** : pnpm workspaces + Turborepo
- **Langage** : TypeScript 5.8, ESM strict, `noUncheckedIndexedAccess`, `moduleResolution: bundler`

Le dépôt est organisé en applications et packages partagés.

---

## 2. Structure du monorepo

```
.
├── apps/
│   ├── api/        # Back-end Fastify 5.3 (API REST /api/v1/*)
│   ├── web/        # Front-end Next.js 15 App Router (PWA)
│   └── ingest/     # Pipelines ETL/scraping (CLI, non un service web)
├── packages/
│   └── shared/     # Prisma, Zod, types, constants, env schemas, ESLint config
├── docs/           # Documentation produit + templates de documents print/PDF
├── _bmad/          # Système BMAD (gestion de stories)
├── _bmad-output/   # Artefacts d’implémentation BMAD
├── package.json    # Scripts racine (turbo)
├── pnpm-workspace.yaml
├── turbo.json
└── render.yaml     # Déploiement Render de l’API
```

---

## 3. Stack technique par application

### `apps/api` — API Fastify

- **Framework** : Fastify 5.3 (`fastify`)
- **ORM** : Prisma 6.x (client et migrations dans `packages/shared`)
- **Auth** : Supabase Auth + token Pièces natif HS256 pour le login WhatsApp reverse-OTP
- **Validation** : Zod, converti en JSON Schema Fastify/OpenAPI via `zod-to-json-schema`
- **Stockage images** : Cloudflare R2 via AWS SDK S3 (`sharp` pour les variants)
- **IA** : Google Gemini (identification de pièces par photo) et Anthropic Claude (enrichissement terrain)
- **WhatsApp** : Meta Cloud API (par défaut) ou Baileys auto-hébergé (option `WHATSAPP_PROVIDER=baileys`)
- **Files d’attente** : file d’attente Prisma-backed avec worker interne (`modules/queue/worker.ts`)
- **Tests** : Vitest 3.2

### `apps/web` — Front-end Next.js

- **Framework** : Next.js 15.3 App Router, React 19
- **Styling** : Tailwind CSS 4 (`@theme` dans `app/globals.css`)
- **PWA** : Serwist 9.x (source `app/sw.ts`, génère `public/sw.js`)
- **Auth** : Supabase SSR (`@supabase/ssr`)
- **Déploiement** : Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`)
- **Charts / cartes** : Chart.js + react-chartjs-2, Leaflet
- **Tests** : Vitest 3.2 (config `vitest.config.ts`)

### `apps/ingest` — ETL / scrapers

- **Type** : CLI exécuté à la demande, pas un service web
- **Parsing HTML** : `cheerio`
- **Rate-limiting** : `p-queue`
- **Base de données** : même PostgreSQL via `@prisma/client`
- **Utilise** : `shared/constants` pour parser les compatibilités véhicules depuis les titres produits

### `packages/shared` — Package partagé

- **Prisma** : `packages/shared/prisma/schema.prisma` (~55 migrations, seed non fonctionnel actuellement `db:seed` pointe vers `prisma/seed.ts` qui n’existe pas)
- **Exports** : `shared`, `shared/types`, `shared/validators`, `shared/constants`, `shared/contracts`, `shared/env`, `shared/eslint-config`
- **Variables d’environnement** : `webEnvSchema` et `apiEnvSchema` dans `env.ts`

---

## 4. Commandes de build et de test

Toutes les commandes s’exécutent depuis la racine du dépôt.

### Racine (via Turbo)

```bash
# Développement (toutes les apps en watch)
pnpm dev

# Build de toutes les apps
pnpm build

# Tests de toutes les apps
pnpm test

# Lint de toutes les apps
pnpm lint

# Formatage Prettier
pnpm format
```

### Applications spécifiques

```bash
# API seule
pnpm -F api dev
pnpm -F api build
pnpm -F api test
pnpm -F api lint

# Web seul
pnpm -F web dev
pnpm -F web build
pnpm -F web test
pnpm -F web lint

# Preview / déploiement Cloudflare (web)
pnpm -F web preview
pnpm -F web deploy

# Ingest
pnpm -F ingest ingest --source=<source> [--dry-run|--commit] [--limit=N]
pnpm -F ingest test
```

### Base de données (Prisma dans `packages/shared`)

```bash
pnpm -F shared db:generate   # Générer le client Prisma
pnpm -F shared db:migrate   # Créer / appliquer des migrations en dev
pnpm -F shared db:deploy   # Appliquer les migrations en production
pnpm -F shared db:push      # Synchroniser rapidement le schéma (prototypage)
```

Le script `start` de l’API exécute `pnpm -F shared run db:deploy` avant de démarrer le serveur, ce qui applique les migrations automatiquement à chaque déploiement Render.

---

## 5. Variables d’environnement

Copier `.env.example` en `.env.local` et renseigner les valeurs. Les schémas Zod dans `packages/shared/env.ts` valident les variables au démarrage de l’API et du web.

### Web (`webEnvSchema`)

- `NEXT_PUBLIC_API_URL` — URL de l’API (ex. `http://localhost:3001` en dev)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` (clé publique, protégée par RLS côté Supabase)
- `NEXT_PUBLIC_SENTRY_DSN` (optionnel)

### API (`apiEnvSchema`)

**Obligatoires**

- `DATABASE_URL` — PostgreSQL
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Optionnelles / avec valeurs par défaut**

- `PORT` (défaut `3001`)
- `PINO_LOG_LEVEL` (défaut `info`)
- `WHATSAPP_PROVIDER` (`cloud` | `baileys`, défaut `cloud`)
- `ENRICHMENT_PASS1_MODEL` (défaut `claude-haiku-4-5`)
- `ENRICHMENT_PASS2_MODEL` (défaut `claude-sonnet-4-6`)
- `SENTRY_DSN`, `AUTH_SESSION_SECRET`, `WHATSAPP_BUSINESS_NUMBER`, `BAILEYS_AUTH_DIR`, `BAILEYS_PAIRING_PHONE`, `ANTHROPIC_API_KEY`

### Stockage / services externes

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` et `GEMINI_API_KEY` sont utilisés mais ne sont pas dans `apiEnvSchema` (ils sont lus directement dans les modules concernés). Ils sont nécessaires pour les uploads d’images et l’IA.

**Ne jamais commiter** `.env`, `.env.local`, `.env.*.local`, `.sentryclirc`, ni le dossier `.baileys-auth/`.

---

## 6. Style de code et conventions

- **Prettier** : pas de point-virgule, guillemets simples, virgules finales, `printWidth: 100`, `tabWidth: 2` (voir `.prettierrc`)
- **ESM** : tous les imports TypeScript utilisent des extensions `.js` (ex. `import { auth } from './plugins/auth.js'`)
- **Langue** : tout le texte UI est en français ; les variables et commentaires suivent le projet (majoritairement français, quelques termes techniques en anglais)
- **Import partagé** : utiliser `import { ... } from 'shared'`, `shared/validators`, `shared/constants`, etc.
- **Zod source de vérité** : les schémas vivent dans `packages/shared/validators/` et servent à la fois pour la validation runtime et les types TypeScript (`z.infer<typeof xxxSchema>`)
- **API** : séparation stricte entre `module.routes.ts` (routes Fastify) et `module.service.ts` (logique métier + Prisma). Les routes ne touchent jamais Prisma directement.
- **Plugins Fastify** : toujours utiliser le wrapper `fastify-plugin` (`fp()`) pour les plugins globaux
- **Erreurs** : utiliser `AppError` avec un code, un status HTTP et un message ; le gestionnaire d’erreur les transforme en JSON structuré (`{ error: { code, message, statusCode, details } }`)
- **Web** : les composants clients s’indiquent explicitement par `'use client'` en haut de fichier ; les `layout.tsx` des groupes `(auth)` et `(public)` gèrent les shells respectifs

---

## 7. Architecture et patterns clés

### API (`apps/api`)

- **Entrée** : `src/server.ts` exporte `buildApp()` (utilisé par les tests) et démarre le serveur en production (`start()`)
- **Plugins** : helmet, cors, rate-limit, swagger, auth, multipart (limite 5 Mo), error-handler
- **Routes** : toutes préfixées par `/api/v1/*` (ex. `/api/v1/orders`, `/api/v1/browse`)
- **Health check** : `GET /healthz`
- **Auth** : `requireAuth` lit le header `Authorization: Bearer <token>`, supporte le JWT Supabase et le token Pièces WhatsApp ; `requireRole(...)` et `requireConsent` pour les gardes
- **Machine à états** : les commandes (`Order`) utilisent `order.stateMachine.ts` avec `canTransition()` avant toute mise à jour DB
- **Content parsers** : les parsers de body sont enregistrés au niveau d’un plugin de route, intentionnellement scopés (ex. webhook WhatsApp HMAC avec raw body)
- **CRM interne** : module `crm` (préfixe `/api/v1/admin/crm`, guard `ADMIN`) — timeline 360° clients/vendeurs, interactions, tâches/relances, tags, segments calculés. Cible polymorphe `subject`/`subjectId` (`USER` → `users.id`, `VENDOR` → `vendors.id`, pas de FK DB). Relances WhatsApp via `notifyWhatsAppUser` (opt-out `NotificationPreference` respecté) ; rappel quotidien des tâches dues via le job `CRM_DUE_TASKS_SCAN` (7h)
- **ERP Stock & achats** : module `stock` (préfixe `/api/v1/admin/stock`, guard `ADMIN`) — emplacements (`StockLocation`), niveaux par fiche/emplacement (`StockLevel`, CUMP `cumpFcfa`, seuil bas), journal `StockMovement` (RECEPTION / SORTIE_COMMANDE / AJUSTEMENT / RESTITUTION), fournisseurs (`Supplier`) et bons de commande (`PurchaseOrder`, statuts BROUILLON → ENVOYEE → EN_TRANSIT → RECEPTION_PARTIELLE → RECEPTIONNEE / ANNULEE). Estimation coût rendu entrepôt via `LOGISTICS_MODES` + `CUSTOMS_DUTY_RATE` (`shared/constants/logistics`). Sorties décrémentées à la commande payée, restitution à l’annulation si payée (`order.service.ts`), décrément multi-emplacements = première location active par `createdAt`

### Web (`apps/web`)

- **App Router** : groupes `(auth)` (app authentifiée) et `(public)` (marketing/vitrine)
- **Redirection** : `/` redirige vers `/browse`
- **Middleware** : `middleware.ts` protège les routes, gère le sous-domaine `flotte.*` et redirige vers `/entreprises` si non authentifié
- **Proxy API** : `next.config.ts` réécrit `/api/:path*` vers `NEXT_PUBLIC_API_URL` (Render par défaut, local `http://127.0.0.1:3001` en dev)
- **PWA** : `public/manifest.json`, service worker Serwist, theme color `#002366`, background `#FAFAFA`
- **Espaces** : l’UI masque le vocabulaire RBAC. La source de vérité est `apps/web/lib/spaces.ts`. Les espaces sont Achat, Vendeur, Flotte, Livreur, Chauffeur, Liaison, Administration.
- **Vitrine flotte** : `app/(public)/entreprises/*` est servie sur le sous-domaine `flotte.pieces.ci`. Les plans flotte sont centralisés dans `apps/web/lib/fleet-plans.ts`.
- **CRM admin** : workbench `app/(auth)/admin/crm/` + bloc `components/crm/crm-section.tsx` monté sur les fiches clients/vendeurs ; appels via `lib/crm-api.ts` (`crmFetch`, union `{ ok, data } | { ok: false, message }`), helpers purs dans `lib/crm-utils.ts`
- **ERP Stock admin** : pages `app/(auth)/admin/stock/` (onglets Inventaire / Achats / Fournisseurs / Mouvements via `components/stock/stock-tabs.tsx`) ; appels via `lib/stock-api.ts`, helpers purs dans `lib/stock-utils.ts` ; colonnes/chips stock aussi sur `admin/parts`

### Base de données (`packages/shared`)

- PostgreSQL, schéma Prisma dans `prisma/schema.prisma`
- Modèles clés : `User`, `Vendor`, `CatalogItem`, `Order`, `OrderItem`, `Delivery`, `Dispute`, `EscrowTransaction`, `VehicleMake`, `VehicleModel`, `Enterprise`, `Driver`, `Job`, `CrmInteraction`, `CrmTask`, `CrmTag`, `StockLocation`, `StockLevel`, `StockMovement`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, etc.
- Enum `Role` : `BUYER`, `SELLER`, `RIDER`, `DRIVER`, `ADMIN`, `ENTERPRISE`, `LIAISON`
- Enum `PartCondition` : `NEW`, `USED`, `REFURBISHED`, `AFTERMARKET`, `OEM`
- Format téléphone : `+225XXXXXXXXXX`

---

## 8. Instructions de test

- **Framework** : Vitest 3.2
- **API** : utiliser `buildApp()` depuis `src/server.ts` et `app.inject()` pour les tests d’intégration sans binding de port
- **Mocks** : `vi.mock()` pour les services / Prisma / Supabase, puis importer les modules après les mocks
- **Variables d’env** : utiliser `vi.stubEnv()` pour les stubber dans les tests
- **Astuce locale** : `toLocaleString('fr-FR')` produit des espaces insécables (`U+00A0`) entre milliers ; utiliser des regex (ex. `toMatch(/4\u00a0500 FCFA/)`) plutôt que `toContain`
- **Exécution** :

```bash
# Tous les tests
pnpm test

# Tests d’un fichier API
pnpm -F api vitest run src/modules/whatsapp/whatsapp.service.test.ts

# Tests d’un module API
pnpm -F api vitest run src/modules/whatsapp/

# Tests web
pnpm -F web test
```

---

## 9. Considérations de sécurité

- **Validation env** : les variables d’environnement sont validées par Zod au démarrage de l’API (`apiEnvSchema.parse(process.env)`)
- **Logs** : Pino redige `req.headers.authorization`, `phone` et `email` (`[REDACTED]`)
- **Protection HTTP** : helmet, CORS, rate-limit (100 req/min par défaut, surcharges sur les routes sensibles)
- **Auth** : les routes protégées utilisent `requireAuth` ; les rôles via `requireRole(...)` ; le consentement via `requireConsent`
- **Uploads** : `@fastify/multipart` limite la taille des fichiers à 5 Mo
- **Webhooks WhatsApp** : vérification HMAC SHA-256 du raw body pour les webhooks entrants
- **Secrets** : ne jamais commiter `.env*`, `.sentryclirc`, `.baileys-auth/` ou toute clé API
- **Supabase** : la clé anonyme est publique par design ; la protection des données repose sur les Row Level Security (RLS) et le service role côté API uniquement
- **JWT Pièces** : signé avec `AUTH_SESSION_SECRET` (ou fallback sur la clé service Supabase si absent)

---

## 10. Déploiement et CI/CD

### CI GitHub Actions (`.github/workflows/ci.yml`)

Déclenché sur `push` et `pull_request` vers `main` :

1. `lint` — `pnpm turbo lint`
2. `test` — `pnpm turbo test`
3. `build` — `pnpm turbo build` (dépend de `lint` et `test`)

### Déploiement API (Render)

Fichier `render.yaml` :

- Service `pieces-api` sur Render, runtime Node, région Francfort
- `buildCommand` : `corepack enable && pnpm install --frozen-lockfile && pnpm -F shared db:generate && pnpm -F api build`
- `startCommand` : `pnpm -F api start` (applique `prisma migrate deploy` puis lance Node)
- Health check : `/healthz`
- Variables d’env sensibles (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) sont synchronisées depuis Render, pas codées en dur

### Déploiement Web (Cloudflare Workers)

Fichier `.github/workflows/deploy-web.yml` :

- Déclenché sur `push` vers `main` ou manuellement (`workflow_dispatch`)
- Installe les dépendances, puis dans `apps/web` : `pnpm run deploy`
- Utilise OpenNext + Wrangler
- Variables de build passées via `vars` / `secrets` GitHub : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CLOUDFLARE_API_TOKEN`
- `next.config.ts` contient des fallbacks hardcodés pour les variables `NEXT_PUBLIC_*` au cas où le build env ne serait pas transmis

### Ingest

Pas de déploiement automatique. Exécuter manuellement via `pnpm -F ingest ingest ...` sur une machine avec accès à la base de données.

---

## 11. Services externes utilisés

- **Supabase** : Auth OTP SMS, gestion des utilisateurs, PostgreSQL
- **Google Gemini 2.0 Flash** : identification de pièces par photo (seuils de confiance : ≥0.7 identifié, 0.3–0.7 ambigu, <0.3 échec)
- **Anthropic Claude** : enrichissement terrain (Agent Fiche Terrain)
- **CinetPay** : passerelle de paiement (modèle séquestre)
- **Cloudflare R2** : stockage d’images public (S3-compatible)
- **Meta WhatsApp Cloud API** : bot WhatsApp en mode cloud (webhooks)
- **Baileys** (optionnel) : socket WhatsApp auto-hébergé, gratuit
- **Sharp** : génération des variants d’images (thumb/small/medium/large)

---

## 12. Design system et documentation

- **Avant toute modification visuelle** : lire `DESIGN.md`. Les tokens Tailwind vivent dans `apps/web/app/globals.css` (`@theme`), les polices dans `apps/web/app/layout.tsx`.
- **Règles USP critiques** :
  - Les chips de condition (`Neuf`, `Occasion importée`, `Ré-usiné`, `Aftermarket`, `OEM`) doivent être visibles sur toutes les cartes, fiches, lignes de commande et tableaux admin. Composant : `apps/web/components/ui/chip.tsx`.
  - La décomposition du prix (vendeur / main-d’œuvre / livraison / frais plateforme / total) doit être explicite avant le bouton de paiement (`/choose/[shareToken]`, fiche produit, récap admin).
- **Documentation print/PDF** : templates dans `docs/_template/` ; génération via `bash docs/_template/build.sh [slug…]` (nécessite Pandoc ≥ 3 et Google Chrome). Voir `docs/_template/README.md`.
- **BMAD** : le projet utilise un système de stories BMAD. Les artefacts d’implémentation se trouvent dans `_bmad-output/implementation-artifacts/`.

---

## 13. Anti-patterns et pièges fréquents

- **Ne pas** importer Prisma directement dans les routes API (passer par le service).
- **Ne pas** oublier l’extension `.js` dans les imports TypeScript (sinon ESM échoue au build).
- **Ne pas** utiliser des valeurs hex en dur dans les composants : utiliser les utilities Tailwind (`bg-ink`, `text-accent`, etc.).
- **Ne pas** coder les textes en anglais dans l’UI ; le projet est en français.
- **Ne pas** modifier les prix/plans flotte en inline : utiliser `apps/web/lib/fleet-plans.ts`.
- **Attention** : les tests de formatage monétaire français doivent gérer l’espace insécable (`U+00A0`).
- **Ne pas** committer les fichiers de secrets ou les dossiers de session Baileys.

---

## 14. Références rapides

| Fichier | Rôle |
|---------|------|
| `CLAUDE.md` | Guide de code détaillé (à lire avant chaque modification) |
| `DESIGN.md` | Système de design (tokens, couleurs, typographie, composants) |
| `apps/api/src/server.ts` | Point d’entrée de l’API et enregistrement des routes |
| `apps/web/app/globals.css` | Tokens Tailwind v4 |
| `apps/web/lib/spaces.ts` | Source unique des « espaces » / rôles UI |
| `apps/web/lib/fleet-plans.ts` | Plans et tarifs flotte |
| `packages/shared/prisma/schema.prisma` | Schéma de base de données |
| `packages/shared/env.ts` | Schémas de validation des variables d’env |
| `packages/shared/validators/` | Schémas Zod partagés |
| `render.yaml` | Configuration de déploiement Render API |
| `.github/workflows/deploy-web.yml` | Pipeline de déploiement Cloudflare web |
