# Guide de développement — Pièces

**Généré le :** 2026-03-01

---

## Prérequis

| Outil | Version | Installation |
|-------|---------|-------------|
| Node.js | 22.x | `nvm install 22` |
| pnpm | 10.30+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | Via Supabase (cloud) ou local |

---

## Installation

```bash
# Cloner le dépôt
git clone <repo-url>
cd pieces

# Installer les dépendances
pnpm install

# Copier les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials Supabase et DB
```

---

## Variables d'environnement

### Web (`apps/web`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL de l'API backend | `http://localhost:3001` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clé anonyme Supabase | `eyJ...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optionnel) | — |

### API (`apps/api`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/pieces` |
| `SUPABASE_URL` | URL du projet Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase | `eyJ...` |
| `PORT` | Port du serveur | `3001` |
| `PINO_LOG_LEVEL` | Niveau de log | `info` |
| `SENTRY_DSN` | Sentry DSN (optionnel) | — |

### Services externes (optionnels)

| Variable | Service |
|----------|---------|
| `GEMINI_API_KEY` | Google Generative AI |
| `CINETPAY_API_KEY` | CinetPay (paiement) |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business API |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business API |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification |
| `WHATSAPP_APP_SECRET` | HMAC signature |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Cloudflare R2 storage |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Cloudflare R2 storage |

---

## Commandes de développement

### Racine (Turborepo)

```bash
pnpm dev          # Démarre tous les apps en parallèle (API + Web)
pnpm build        # Build tous les packages
pnpm test         # Lance tous les tests
pnpm lint         # Lint tous les packages
pnpm format       # Prettier sur tout le projet
```

### API (`apps/api`)

```bash
cd apps/api
pnpm dev          # tsx watch src/server.ts (hot reload)
pnpm build        # tsc --noEmit + esbuild → dist/server.js
pnpm start        # node dist/server.js (production)
pnpm test         # vitest run
pnpm lint         # eslint src
```

### Web (`apps/web`)

```bash
cd apps/web
pnpm dev          # next dev --turbopack
pnpm build        # next build (avec compilation SW)
pnpm start        # next start
pnpm test         # vitest run
pnpm lint         # eslint .
```

### Base de données (`packages/shared`)

```bash
cd packages/shared
pnpm db:generate  # prisma generate (regénérer le client)
pnpm db:migrate   # prisma migrate dev (appliquer migrations)
pnpm db:push      # prisma db push (sync schema sans migration)
pnpm db:seed      # tsx prisma/seed.ts
```

---

## Architecture de test

### Framework : Vitest 3.2

**Pattern API (tests d'intégration) :**
```typescript
import { buildApp } from '../../server'

function mockAuth(role = 'MECHANIC') {
  // Configure les mocks Supabase + Prisma pour simuler l'auth
  return { authorization: `Bearer test-token-${role}` }
}

describe('Module Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // IMPORTANT: utiliser mockReset() sur chaque mock contrôlable
    mockPrismaMethod.mockReset()
  })

  it('returns 200', async () => {
    mockPrismaMethod.mockResolvedValueOnce(mockData)
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/resource',
      headers: mockAuth()
    })
    expect(response.statusCode).toBe(200)
  })
})
```

**Répartition des tests :**

| Package | Fichiers | Tests approx. |
|---------|----------|---------------|
| apps/api | 32 fichiers | ~250 tests |
| apps/web | 4 fichiers | ~10 tests |
| packages/shared | 1 fichier | ~40 tests |
| **Total** | **36 fichiers** | **303 tests** |

### Pièges connus

1. **`vi.clearAllMocks()` ≠ `vi.resetAllMocks()`** — `clearAllMocks` ne vide PAS la queue `mockResolvedValueOnce`. Utiliser `mockReset()` explicitement.
2. **Fastify lifecycle** — La validation de schéma (step 6) s'exécute AVANT `preHandler` (step 7). Un test 422 qui appelle `mockAuth()` laisse des mocks non consommés.
3. **`fp()` obligatoire** — Les plugins Fastify globaux doivent être wrappés avec `fastify-plugin` pour partager le contexte.
4. **`addContentTypeParser` leak** — Ne jamais enregistrer un content type parser dans un plugin, il affecte TOUTES les routes.

---

## Conventions de code

### Structure module API

```
modules/{domain}/
├── {domain}.routes.ts          # Thin controller (routes HTTP)
├── {domain}.routes.test.ts     # Tests d'intégration
├── {domain}.service.ts         # Logique métier
└── {domain}.service.test.ts    # Tests unitaires
```

### Validation

- Schémas Zod dans `packages/shared/validators/`
- Conversion Fastify via `zodToFastify()` dans la route
- Source unique de vérité : la même schema sert pour validation, Swagger et types

### Erreurs

```typescript
throw new AppError('ERROR_CODE', 400, { details })
```

Messages en français pour les erreurs utilisateur.

### Réponses API

```typescript
reply.send({ data: result })
```

Toujours envelopper dans `{ data: ... }`.

---

## CI/CD

### GitHub Actions (`ci.yml`)

```
Push/PR sur main → lint → test → build (séquentiel)
```

- Node.js 22 + pnpm
- `pnpm install --frozen-lockfile`
- Les 3 jobs sont parallèles (lint, test), build attend lint+test

### Déploiement API (`deploy-api.yml`)

```
Push sur main (paths: apps/api/**, packages/shared/**) → Fly.io
```

- `flyctl deploy --config apps/api/fly.toml`
- Secret : `FLY_API_TOKEN`

---

## Monorepo

### Workspace pnpm

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Dépendances internes

- `apps/api` → `"shared": "workspace:*"`
- `apps/web` → `"shared": "workspace:*"`

### Turborepo

- `dev` : cache désactivé, persistent
- `build` : outputs `dist/**`, `.next/**`, dépend de `^build`
- `test` : cache désactivé
- `lint` : cache désactivé
