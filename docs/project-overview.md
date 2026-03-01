# Pièces — Vue d'ensemble du projet

**Généré le :** 2026-03-01
**Type de dépôt :** Monorepo (Turborepo + pnpm workspaces)
**Langage principal :** TypeScript
**Architecture :** Monorepo tripartite (API backend + PWA frontend + package partagé)

---

## Résumé exécutif

**Pièces** est une marketplace de pièces automobiles d'occasion ciblant la Côte d'Ivoire (Abidjan). La plateforme connecte trois acteurs principaux :

- **Mécaniciens** — initient les commandes pour le compte de propriétaires de véhicules
- **Vendeurs** — gèrent leurs catalogues de pièces, prix et zones de livraison
- **Livreurs (Riders)** — assurent la livraison avec suivi GPS en temps réel

Le système supporte un flux de commande tripartite unique : le mécanicien commande, le propriétaire paie (via un lien partagé), le vendeur confirme et expédie. Les paiements sont sécurisés via un système de séquestre (escrow).

### Caractéristiques clés

- Authentification OTP par SMS (numéros ivoiriens +225)
- Catalogue vendeur avec identification IA des pièces (Google Gemini)
- Pipeline d'images multi-résolution (Sharp + Cloudflare R2)
- Machine à états de commande avec audit trail complet
- Paiement mobile money (Orange Money, MTN MoMo, Wave) + Cash on Delivery
- Livraison avec suivi GPS temps réel et protocole client absent
- Bot WhatsApp pour identification et commande
- Système d'évaluation et de litiges
- Notifications multi-canal (WhatsApp, SMS, Push PWA)
- Conformité ARTCI (loi ivoirienne sur les données personnelles)
- PWA offline-first avec Service Worker

---

## Stack technique

| Catégorie | Technologie | Version |
|-----------|-------------|---------|
| **Runtime** | Node.js | 22.x |
| **Langage** | TypeScript | 5.8 |
| **Monorepo** | Turborepo + pnpm | 2.6 / 10.30 |
| **API Framework** | Fastify | 5.3 |
| **ORM** | Prisma | 6.x |
| **Base de données** | PostgreSQL | (Supabase) |
| **Authentification** | Supabase Auth | 2.98 |
| **Validation** | Zod | 3.25 |
| **Frontend** | Next.js (App Router) | 15.3 |
| **UI** | React | 19.1 |
| **CSS** | Tailwind CSS | 4.1 |
| **PWA** | Serwist (Workbox) | 9.5 |
| **IA** | Google Generative AI (Gemini) | 0.24 |
| **Images** | Sharp | 0.34 |
| **Stockage** | Cloudflare R2 (AWS SDK S3) | — |
| **Paiement** | CinetPay | — |
| **Messagerie** | WhatsApp Business API | v18.0 |
| **Tests** | Vitest | 3.2 |
| **Lint** | ESLint | 10.x |
| **CI/CD** | GitHub Actions | — |
| **Déploiement API** | Fly.io | — |
| **Bundler API** | esbuild | 0.25 |
| **Logging** | Pino | 9.6 |

---

## Structure du dépôt

```
pieces/                          # Racine monorepo
├── apps/
│   ├── api/                     # Backend Fastify (Part: backend)
│   └── web/                     # Frontend Next.js PWA (Part: web)
├── packages/
│   └── shared/                  # Types, validators, constantes, Prisma (Part: library)
├── docs/                        # Documentation projet (générée)
├── _bmad-output/                # Artefacts BMAD (PRD, architecture, epics, rétros)
├── .github/workflows/           # CI/CD GitHub Actions
├── turbo.json                   # Configuration Turborepo
├── pnpm-workspace.yaml          # Workspaces pnpm
└── package.json                 # Scripts racine (dev, build, test, lint)
```

---

## Parties du projet

### 1. API Backend (`apps/api`)

- **Type :** Backend (Fastify + Prisma)
- **Point d'entrée :** `src/server.ts`
- **Architecture :** Modulaire par domaine métier (15 modules)
- **Pattern :** Routes (thin controller) → Services (logique métier) → Prisma (données)
- **Tests :** 303 tests (36 fichiers), tous passants

### 2. Web Frontend (`apps/web`)

- **Type :** Web (Next.js App Router + PWA)
- **Point d'entrée :** `app/layout.tsx`
- **Architecture :** App Router avec route groups `(auth)` pour les pages protégées
- **Pattern :** Server/Client Components, Supabase SSR auth, bottom tab navigation mobile
- **Pages :** 31 pages (login, browse, vendors, rider, orders, admin, profile)

### 3. Package partagé (`packages/shared`)

- **Type :** Library
- **Exports :** Types API, 20+ validators Zod, constantes métier, schéma Prisma
- **Prisma :** 16 modèles, 15 enums, 13 migrations
- **Constantes :** 13 communes d'Abidjan, 12 marques auto (54 modèles), 15 catégories de pièces

---

## Documentation liée

- [Architecture détaillée](./architecture-api.md)
- [Architecture Web](./architecture-web.md)
- [Modèles de données](./data-models.md)
- [Contrats API](./api-contracts.md)
- [Arbre source annoté](./source-tree-analysis.md)
- [Guide de développement](./development-guide.md)
- [Architecture d'intégration](./integration-architecture.md)

---

## Métriques du projet

| Métrique | Valeur |
|----------|--------|
| Epics livrés | 9/9 (100%) |
| Stories livrées | 45/45 (100%) |
| Tests passants | 303 (36 fichiers) |
| Erreurs lint | 0 |
| Erreurs build | 0 |
| Code reviews | 1 globale (11 HIGH + 6 MEDIUM → tous résolus) |
| Modèles Prisma | 16 |
| Migrations | 13 |
| Modules API | 15 |
| Pages PWA | 31 |
