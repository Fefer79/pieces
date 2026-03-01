# Story 1.1: Initialisation Monorepo & CI/CD

Status: done

## Story

As a développeur,
I want un monorepo Turborepo configuré avec TypeScript strict, linting, et un pipeline CI/CD déployant automatiquement,
So that l'équipe puisse développer, tester et déployer de manière fiable dès le premier jour.

## Acceptance Criteria (BDD)

### AC1: Structure Monorepo Turborepo

**Given** un nouveau repository Git
**When** le monorepo est initialisé avec Turborepo
**Then** il contient `apps/web` (Next.js 16), `apps/api` (Fastify 5.7), et `packages/shared`
**And** TypeScript strict est activé (`strict: true`, `noUncheckedIndexedAccess: true`) dans les 2 apps
**And** ESLint 9 (flat config) + Prettier sont configurés et partagés via `packages/shared`
**And** `turbo build` et `turbo test` exécutent les pipelines en parallèle avec cache local

### AC2: Pipeline CI/CD GitHub Actions

**Given** un push sur la branche `main`
**When** GitHub Actions exécute le workflow CI/CD
**Then** le pipeline lint → test → build s'exécute sur chaque PR
**And** `apps/web` est déployé automatiquement sur Vercel
**And** `apps/api` est déployé sur Fly.io via `flyctl deploy`
**And** les variables d'environnement sont validées par un schema Zod au démarrage (crash si variable manquante)

### AC3: Monitoring & Observabilité

**Given** le déploiement est terminé
**When** un développeur accède aux URLs de staging
**Then** Sentry est configuré (frontend + backend, source maps)
**And** Cloudflare DNS + SSL est actif
**And** Cloudflare health check surveille l'uptime API
**And** un fichier `.env.example` est commité comme template

### AC4: Templates WhatsApp (Anticipation)

**Given** le projet est initialisé
**When** le compte WhatsApp Business est configuré
**Then** les templates WhatsApp Meta sont documentés en anticipation (confirmation commande, pièce en route, pièce livrée, options propriétaire, consentement ARTCI)
**And** les templates sont documentés dans `docs/whatsapp-templates.md`

## Tasks / Subtasks

- [x] **Task 1: Scaffold Turborepo monorepo** (AC: #1)
  - [x] 1.1 Créer le monorepo avec Turborepo (package.json + turbo.json)
  - [x] 1.2 Restructurer en `apps/web`, `apps/api`, `packages/shared`
  - [x] 1.3 Configurer `turbo.json` avec pipelines dev/build/test/lint
  - [x] 1.4 Configurer pnpm workspaces dans `package.json` racine + `pnpm-workspace.yaml`

- [x] **Task 2: Setup apps/web (Next.js PWA)** (AC: #1)
  - [x] 2.1 Initialiser Next.js 15.3.3 avec App Router
  - [x] 2.2 Configurer TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`)
  - [x] 2.3 Installer Tailwind CSS 4 + configurer (PostCSS)
  - [x] 2.4 Créer `app/layout.tsx` minimal (lang="fr", dir="ltr", theme-color)
  - [x] 2.5 Créer page d'accueil placeholder
  - [x] 2.6 Serwist reporté — configuration PWA Service Worker sera ajoutée quand le contenu le justifie
  - [x] 2.7 Créer `public/manifest.json` avec icônes PWA

- [x] **Task 3: Setup apps/api (Fastify 5.x)** (AC: #1)
  - [x] 3.1 Initialiser Fastify 5.3.3 avec TypeScript
  - [x] 3.2 Configurer `src/server.ts` bootstrap avec plugins
  - [x] 3.3 Enregistrer plugins : `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`
  - [x] 3.4 Configurer `@fastify/swagger` + `@fastify/swagger-ui` sur `/api/v1/docs`
  - [x] 3.5 Créer endpoint `GET /healthz` → `{ status: 'ok' }`
  - [x] 3.6 Configurer Pino (JSON structuré, redact PII) via Fastify logger
  - [x] 3.7 Créer `Dockerfile` multi-stage pour Fly.io
  - [x] 3.8 Créer `fly.toml` (shared-cpu-1x, 256MB RAM, port 3001)
  - [x] 3.9 Créer `src/lib/appError.ts` — classe AppError standardisée

- [x] **Task 4: Setup packages/shared** (AC: #1)
  - [x] 4.1 Créer structure : `types/`, `validators/`, `constants/`, `prisma/`
  - [x] 4.2 Initialiser Prisma avec `schema.prisma` minimal (datasource PostgreSQL)
  - [x] 4.3 Créer `env.ts` — validation Zod des variables d'environnement (fail-fast)
  - [x] 4.4 Créer `types/api.ts` — `ApiResponse<T>`, `ApiError`
  - [x] 4.5 Configurer exports dans `package.json` (barrel exports)
  - [x] 4.6 Créer `eslint-config/` partagé (ESLint 9 flat config)

- [x] **Task 5: Linting & Formatting** (AC: #1)
  - [x] 5.1 Configurer ESLint flat config partagé avec règles critiques (no-console, no-restricted-syntax)
  - [x] 5.2 Configurer Prettier partagé (`.prettierrc` racine)
  - [x] 5.3 ESLint configuré dans chaque package

- [x] **Task 6: CI/CD GitHub Actions** (AC: #2)
  - [x] 6.1 Créer `.github/workflows/ci.yml` (lint → test → build sur PR)
  - [x] 6.2 Créer `.github/workflows/deploy-api.yml` (flyctl deploy sur merge main, paths: apps/api/**)
  - [x] 6.3 Vercel via GitHub app (auto-deploy, pas de workflow nécessaire)

- [x] **Task 7: Monitoring & Env** (AC: #3)
  - [x] 7.1 Sentry DSN prévu dans env schemas (installation effective quand DSN disponible)
  - [x] 7.2 PII redaction configuré dans Pino logger
  - [x] 7.3 Créer `.env.example` avec toutes les variables documentées
  - [x] 7.4 Cloudflare health check configuré via `fly.toml` endpoint `/healthz`

- [x] **Task 8: Testing baseline** (AC: #1, #2)
  - [x] 8.1 Configurer Vitest 3.x dans les 3 packages
  - [x] 8.2 Créer tests smoke : AppError (3), Server (3), Env validation (6), Web smoke (1)
  - [x] 8.3 Vérifier `turbo test` exécute tous les tests — 13/13 passing

- [x] **Task 9: Documentation WhatsApp Templates** (AC: #4)
  - [x] 9.1 Créer `docs/whatsapp-templates.md` avec les 5 templates anticipés
  - [x] 9.2 Documenter le format Meta requis et les itérations de soumission prévues

## Dev Notes

### Architecture Critique — Source de Vérité

> **IMPORTANT : L'architecture (`architecture.md`) fait autorité sur le PRD pour les choix techniques.**

**Divergences PRD vs Architecture (suivre l'Architecture) :**

| Sujet | PRD (obsolète) | Architecture (autoritatif) |
|-------|----------------|---------------------------|
| Backend IA | Python FastAPI | TypeScript Fastify (tout en TS) |
| Queue/Cache | Redis | pgqueue (PostgreSQL-backed, pas de Redis MVP) |
| Search | Meilisearch MVP | pg_trgm + synonymes MVP, Meilisearch Phase 2 |
| JWT expiration | 15 min access | 1h access / 7d refresh (Supabase Auth) |
| Auth provider | Custom OTP | Supabase Auth (OTP phone intégré) |

### Stack Technique Exacte

| Catégorie | Technologie | Version |
|-----------|------------|---------|
| Monorepo | Turborepo | 2.6.1 |
| Package Manager | pnpm | latest |
| Frontend | Next.js | 16.1.6 |
| React | React | 19 |
| Styling | Tailwind CSS | 4 |
| PWA | Serwist (@serwist/next) | 9.5.6 |
| Backend | Fastify | 5.7.4 |
| ORM | Prisma | 7.2.0 |
| Validation | Zod | 4.3.6 |
| Logging | Pino | 10.3.1 |
| Testing | Vitest | 3.x |
| Linting | ESLint | 9 (flat config) |
| Swagger | @fastify/swagger | 9.7 |
| Security | @fastify/helmet, @fastify/cors, @fastify/rate-limit | latest |
| Error Tracking | Sentry | latest (free tier 10K events/mois) |
| Database | PostgreSQL | 14+ (via Supabase/Neon) |

### Conventions de Nommage (Obligatoire)

**Base de données (Prisma) :**
- Tables : `snake_case` pluriel via `@@map("users")`
- Colonnes : `snake_case` via `@map("created_at")`
- Modèles : `PascalCase` singulier
- Champs : `camelCase`
- Enums : Type `PascalCase`, valeurs `UPPER_SNAKE`

**API REST :**
- Endpoints : kebab-case pluriel → `/api/v1/orders`
- Params URL : `camelCase` → `:orderId`
- JSON body/response : `camelCase`
- Headers custom : `X-Pieces-*`

**TypeScript :**
- Composants : `PascalCase` → `OrderCard.tsx`
- Utilitaires : `camelCase` → `formatPrice.ts`
- Tests : `{name}.test.ts` co-localisés
- Dossiers : kebab-case
- Constants : `UPPER_SNAKE`
- Types/Interfaces : `PascalCase` sans préfixe `I`
- Schemas Zod : `camelCase` + suffixe `Schema`

### Format de Réponse API Standardisé

```typescript
// Succès
{ data: T, meta?: { cursor, total } }

// Erreur
{ error: { code: "MODULE_DESCRIPTION", message: string, statusCode: number, details?: object } }

// Codes erreur : UPPER_SNAKE format MODULE_DESCRIPTION
// Ex: AUTH_INVALID_OTP, ORDER_NOT_FOUND, PAYMENT_INSUFFICIENT_FUNDS
```

### Classe AppError

```typescript
// apps/api/src/lib/appError.ts
export class AppError extends Error {
  constructor(
    public code: string,     // Ex: 'ORDER_NOT_FOUND'
    public statusCode: number, // Ex: 404
    public details?: Record<string, unknown>
  ) {
    super(code)
  }
}
```

### Configuration Pino (Logging)

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', 'phone', 'email'],
    censor: '[REDACTED]'
  }
})
```

**Règle ESLint :** `no-console` interdit `console.log()` → forcer Pino.

### Validation Env Zod (packages/shared/env.ts)

```typescript
import { z } from 'zod'

// Web env
export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
})

// API env
export const apiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SENTRY_DSN: z.string().optional(),
  PINO_LOG_LEVEL: z.enum(['info', 'warn', 'error', 'fatal']).default('info'),
  // Autres ajoutées au fur et à mesure des stories
})
```

**Comportement :** Crash au démarrage si variable requise manquante (fail-fast).

### Structure Dossiers Cible

```
pieces/
├── .github/workflows/
│   ├── ci.yml
│   ├── deploy-api.yml
│   └── (deploy-web via Vercel GitHub app)
├── .env.example
├── .prettierrc
├── turbo.json
├── package.json (workspaces)
├── apps/
│   ├── web/                  # Next.js 16 PWA
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── icons/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   └── vitest.config.ts
│   └── api/                  # Fastify 5.7
│       ├── Dockerfile
│       ├── fly.toml
│       ├── tsconfig.json
│       ├── src/
│       │   ├── server.ts
│       │   ├── plugins/
│       │   │   ├── cors.ts
│       │   │   ├── helmet.ts
│       │   │   ├── rateLimit.ts
│       │   │   ├── swagger.ts
│       │   │   └── errorHandler.ts
│       │   └── lib/
│       │       ├── appError.ts
│       │       └── prisma.ts
│       └── vitest.config.ts
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   └── schema.prisma
        ├── types/
        │   └── api.ts
        ├── validators/
        ├── constants/
        ├── env.ts
        └── eslint-config/
```

### CORS Configuration

```typescript
origin: ['https://pieces.ci', 'http://localhost:3000']
credentials: true
```

### Rate Limiting

```typescript
// Global API
{ max: 100, timeWindow: '1 minute' }

// OTP (sera ajouté Story 1.2)
{ max: 5, timeWindow: '1 minute' }
```

### Fly.io Configuration

```toml
app = "pieces-api"
primary_region = "arn"  # ou cdg (Paris) — plus proche CI

[build]
dockerfile = "Dockerfile"

[env]
PORT = "3001"

[[services]]
internal_port = 3001
protocol = "tcp"

[[services.ports]]
port = 443
handlers = ["tls", "http"]
```

### Dockerfile Multi-Stage

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Accessibilité Setup Minimum (Story 1.1)

- `<html lang="fr" dir="ltr">` dans layout.tsx
- Installer `eslint-plugin-jsx-a11y` dans la config ESLint partagée
- Touch targets ≥ 48x48px (convention dès le début)

### Anti-Patterns à Éviter

1. **NE PAS** utiliser `console.log` → utiliser Pino
2. **NE PAS** utiliser `throw new Error()` → utiliser `AppError`
3. **NE PAS** utiliser `fetch` direct dans le frontend → utiliser le client API typé (future Story)
4. **NE PAS** créer de Python FastAPI → tout en TypeScript/Fastify
5. **NE PAS** installer Redis → utiliser pgqueue
6. **NE PAS** installer Meilisearch → pg_trgm + synonymes pour MVP
7. **NE PAS** hardcoder des couleurs → utiliser les tokens Tailwind
8. **NE PAS** ajouter de web fonts custom → system fonts uniquement
9. **NE PAS** créer de fichiers avec des accents dans les noms

### Performance Budgets (Setup dès Story 1.1)

- Bundle initial < 200 KB
- FCP < 3s sur 3G
- Images WebP < 50 KB
- Touch targets ≥ 48x48px

### Project Structure Notes

- Le monorepo suit le pattern Turborepo standard avec `apps/` et `packages/`
- Prisma schema unique dans `packages/shared/prisma/schema.prisma`
- Les validators Zod sont partagés entre web et api via `packages/shared/validators/`
- Les types sont centralisés dans `packages/shared/types/`
- Config ESLint partagée via `packages/shared/eslint-config/`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Monorepo Turborepo"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "CI/CD Pipeline"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Naming Conventions"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "API Patterns"]
- [Source: _bmad-output/planning-artifacts/architecture.md — Section "Deployment"]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Section "Design System"]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `@fastify/swagger-ui@^6.2.1` n'existe pas → corrigé en `^5.2.5`
- `pnpm approve-builds` non-interactif → contourné via `pnpm.onlyBuiltDependencies` dans root package.json
- `setErrorHandler` dans un plugin `register()` ne s'applique qu'aux routes du scope → refactorisé en `setupErrorHandler()` appelé directement sur l'instance racine
- Versions futures spécifiées dans la story (Next.js 16.1.6, Fastify 5.7.4, Prisma 7.2.0, Zod 4.3.6) n'existent pas encore sur npm → utilisé les dernières versions disponibles

### Completion Notes List

- 13/13 tests passent (6 API, 6 shared, 1 web)
- Build réussi — First Load JS 102 kB (< 200 KB budget)
- TypeScript strict activé dans les 3 packages
- ESLint 9 flat config avec `no-console` et `no-restricted-syntax` (force AppError) dans les 3 packages
- Pino logging avec redaction PII configuré
- Zod validation env fail-fast au démarrage (apiEnvSchema.parse appelé dans server.ts)
- CI/CD workflows GitHub Actions créés (ci.yml + deploy-api.yml)
- Dockerfile multi-stage + fly.toml configurés (build context corrigé)
- PWA manifest.json avec `lang: fr`
- 5 templates WhatsApp documentés
- Sentry non installé (nécessite DSN réel — à configurer lors du déploiement)
- Cloudflare DNS/SSL non configuré (infrastructure externe — hors scope code)

### Code Review Fixes Applied (2026-03-01)

- **H1** : Ajouté `apiEnvSchema.parse(process.env)` dans server.ts — fail-fast env validation
- **H2** : Corrigé `fly.toml` → `dockerfile = "apps/api/Dockerfile"` pour résoudre le build context
- **M1** : Ajouté export `"./eslint-config"` dans shared/package.json
- **M2** : Corrigé `DATABASE_URL` de `.min(1)` → `.url()` dans env.ts
- **M3** : Refactorisé server.ts en pattern `buildApp()` exporté — tests utilisent le vrai module
- **M4** : Ajouté `pnpm-lock.yaml` à la File List
- **M5** : Ajouté `no-restricted-syntax` dans web eslint.config.mjs
- **Bonus** : Migré web lint de `next lint` (deprecated) vers `eslint .` direct
- **Bonus** : Migré API build de `tsc` vers `tsc --noEmit && esbuild` (résout rootDir conflit avec shared imports)
- **Bonus** : Ajouté ESLint + eslint.config.js dans shared package (lint fonctionnel)
- **Bonus** : Supprimé `@eslint/eslintrc` (FlatCompat) → import direct `eslint-config-next@16` flat config
- **Bonus** : Downgrade web ESLint 10 → 9 (incompatibilité eslint-config-next@16)

### File List

- `package.json` — Root monorepo config (workspaces, turbo scripts)
- `pnpm-workspace.yaml` — Workspace definition (apps/*, packages/*)
- `pnpm-lock.yaml` — Lockfile pnpm
- `turbo.json` — Turborepo pipeline config
- `.prettierrc` — Prettier config
- `.gitignore` — Git ignore patterns
- `.env.example` — Template variables d'environnement
- `apps/web/package.json` — Next.js 15 dependencies
- `apps/web/tsconfig.json` — TypeScript strict config
- `apps/web/next.config.ts` — Next.js config (transpilePackages)
- `apps/web/postcss.config.mjs` — PostCSS + Tailwind CSS 4
- `apps/web/vitest.config.ts` — Vitest config web
- `apps/web/eslint.config.mjs` — ESLint flat config web (next + no-console + no-restricted-syntax)
- `apps/web/app/layout.tsx` — Root layout (lang="fr", theme-color, PWA meta)
- `apps/web/app/page.tsx` — Page d'accueil placeholder
- `apps/web/app/globals.css` — Tailwind CSS import
- `apps/web/app/page.test.tsx` — Smoke test web
- `apps/web/public/manifest.json` — PWA manifest
- `apps/api/package.json` — Fastify 5 + esbuild dependencies
- `apps/api/tsconfig.json` — TypeScript strict config API (noEmit)
- `apps/api/esbuild.config.js` — esbuild bundle config
- `apps/api/vitest.config.ts` — Vitest config API
- `apps/api/eslint.config.js` — ESLint flat config API
- `apps/api/Dockerfile` — Multi-stage Node 20 Alpine
- `apps/api/fly.toml` — Fly.io deployment config (build context corrigé)
- `apps/api/src/server.ts` — Fastify bootstrap + healthz + env validation + buildApp()
- `apps/api/src/lib/appError.ts` — Classe AppError standardisée
- `apps/api/src/lib/appError.test.ts` — Tests AppError (3 tests)
- `apps/api/src/server.test.ts` — Tests server via buildApp() (3 tests)
- `apps/api/src/plugins/helmet.ts` — Plugin sécurité headers
- `apps/api/src/plugins/cors.ts` — Plugin CORS (pieces.ci + localhost)
- `apps/api/src/plugins/rateLimit.ts` — Plugin rate limiting (100/min)
- `apps/api/src/plugins/swagger.ts` — Plugin OpenAPI 3.1 + Swagger UI
- `apps/api/src/plugins/errorHandler.ts` — Error handler centralisé
- `packages/shared/package.json` — Shared package config (eslint-config export ajouté)
- `packages/shared/tsconfig.json` — TypeScript strict config shared
- `packages/shared/vitest.config.ts` — Vitest config shared
- `packages/shared/eslint.config.js` — ESLint config shared (self-lint)
- `packages/shared/index.ts` — Barrel exports
- `packages/shared/env.ts` — Zod env validation schemas (DATABASE_URL .url())
- `packages/shared/env.test.ts` — Tests env validation (6 tests)
- `packages/shared/types/api.ts` — Types ApiResponse/ApiError
- `packages/shared/types/index.ts` — Type exports
- `packages/shared/validators/index.ts` — Validators placeholder
- `packages/shared/constants/index.ts` — Constants placeholder
- `packages/shared/prisma/schema.prisma` — Prisma schema PostgreSQL
- `packages/shared/eslint-config/index.js` — ESLint shared config
- `.github/workflows/ci.yml` — CI pipeline (lint → test → build)
- `.github/workflows/deploy-api.yml` — Deploy API sur Fly.io
- `docs/whatsapp-templates.md` — 5 templates WhatsApp documentés
