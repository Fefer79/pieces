# Pièces — Index de documentation projet

**Généré le :** 2026-03-01
**Scan :** Deep Scan (initial)
**Workflow :** document-project v1.2.0

---

## Vue d'ensemble

- **Nom :** Pièces
- **Type :** Monorepo (Turborepo + pnpm workspaces) avec 3 parties
- **Langage principal :** TypeScript
- **Architecture :** API backend (Fastify) + PWA frontend (Next.js) + package partagé
- **Cible :** Marketplace pièces auto d'occasion — Côte d'Ivoire (Abidjan)
- **Devise :** FCFA
- **Langue UI :** Français

---

## Référence rapide

### API Backend (`apps/api`)

- **Type :** Backend
- **Stack :** Fastify 5.3 + Prisma 6 + Zod 3.25
- **Racine :** `apps/api/`
- **Entry point :** `src/server.ts`
- **Port :** 3001
- **Modules :** 15 modules métier
- **Tests :** ~250 tests

### Web Frontend (`apps/web`)

- **Type :** Web PWA
- **Stack :** Next.js 15.3 + React 19 + Tailwind 4 + Serwist
- **Racine :** `apps/web/`
- **Entry point :** `app/layout.tsx`
- **Port :** 3000
- **Pages :** 31 pages App Router
- **Tests :** ~10 tests

### Package partagé (`packages/shared`)

- **Type :** Library
- **Exports :** Types, 20+ validators Zod, constantes, Prisma schema
- **Modèles DB :** 16 modèles, 15 enums, 13 migrations
- **Tests :** ~40 tests

---

## Documentation générée

### Architecture et conception

- [Vue d'ensemble du projet](./project-overview.md) — Résumé exécutif, stack technique, métriques
- [Architecture API](./architecture-api.md) — Backend Fastify : modules, plugins, patterns
- [Architecture Web](./architecture-web.md) — Frontend Next.js PWA : routes, auth, patterns
- [Architecture d'intégration](./integration-architecture.md) — Communication inter-parties, flux de données

### Données et API

- [Modèles de données](./data-models.md) — Schéma Prisma : 16 modèles, relations, enums
- [Contrats API](./api-contracts.md) — Tous les endpoints REST avec méthodes, auth et schémas

### Développement

- [Arbre source annoté](./source-tree-analysis.md) — Structure complète du code avec annotations
- [Guide de développement](./development-guide.md) — Installation, commandes, tests, conventions, CI/CD

### Deep-Dive Documentation

Analyses détaillées exhaustives de zones spécifiques :

- [Manuel d'utilisation administrateur](./deep-dive-manuel-administrateur.md) — Guide complet pour les administrateurs de la plateforme (dashboard, utilisateurs, vendeurs, commandes, livraisons, litiges, notifications, paiements) — Généré 2026-03-01
- [Manuel d'utilisation vendeur](./deep-dive-manuel-vendeur.md) — Guide complet pour les vendeurs (onboarding KYC, garanties, catalogue IA, commandes, livraisons, escrow, avis, zones de livraison) — Généré 2026-03-01
- [Manuel d'utilisation mécanicien](./deep-dive-manuel-mecanicien.md) — Guide complet pour les mécaniciens (recherche, photo IA, VIN, garage, commande tripartite, livraison, évaluations, litiges) — Généré 2026-03-01
- [Manuel d'utilisation livreur](./deep-dive-manuel-livreur.md) — Guide complet pour les livreurs (assignations, ramassage, transit, livraison, COD, client absent, GPS, avis) — Généré 2026-03-01
- [Manuel d'utilisation propriétaire](./deep-dive-manuel-proprietaire.md) — Guide complet pour les propriétaires de véhicules (lien de paiement, mobile money, COD, escrow, suivi commande) — Généré 2026-03-01
- [Manuel d'utilisation entreprise](./deep-dive-manuel-entreprise.md) — Guide complet pour les gestionnaires de flotte (stub v1, vision Phase 2 : dashboard flotte, gestion membres tenant, workflow approbation, facturation consolidée) — Généré 2026-03-01
- [Manuel d'utilisation client](./deep-dive-manuel-client.md) — Guide complet pour les acheteurs particuliers (recherche texte/photo IA/VIN, garage, commande directe, paiement mobile/COD, escrow, livraison, évaluations, litiges) — Généré 2026-03-01
- [Manuel d'utilisation visiteur](./deep-dive-manuel-visiteur.md) — Guide complet pour les visiteurs non connectés (pages publiques, lien de paiement partagé, API publiques catalogue/photo IA/VIN, PWA, suivi livraison) — Généré 2026-03-01
- [Manuel technique bot WhatsApp](./deep-dive-manuel-bot-whatsapp.md) — Guide complet du bot WhatsApp (webhook Meta Cloud API, HMAC, commandes bot, 5 templates, notifications, multi-canal, intégration commandes/livraisons) — Généré 2026-03-01
- [Manuel technique paiement et escrow](./deep-dive-manuel-paiement-escrow.md) — Guide complet du système de paiement (CinetPay, Orange/MTN/Wave/COD, escrow HELD→RELEASED→REFUNDED, price snapshot, machine à états, auto-libération 48h) — Généré 2026-03-01
- [Manuel technique vision IA](./deep-dive-manuel-vision-ia.md) — Guide complet du système d'identification IA (Gemini 2.0 Flash, seuils de confiance, désambiguïsation, VIN decode NHTSA, synonymes recherche, traitement images Sharp/R2, navigation marque/modèle/année) — Généré 2026-03-01

---

## Documentation existante

### Artefacts de planification (`_bmad-output/planning-artifacts/`)

- [PRD](../_bmad-output/planning-artifacts/prd.md) — Product Requirements Document complet
- [Architecture décisionnelle](../_bmad-output/planning-artifacts/architecture.md) — Décisions techniques détaillées
- [Spécification UX](../_bmad-output/planning-artifacts/ux-design-specification.md) — Design et UX patterns
- [Epics et stories](../_bmad-output/planning-artifacts/epics.md) — Découpage en 9 epics, 45 stories
- [Rapport de readiness](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-01.md) — Validation pré-implémentation

### Recherche

- [Recherche domaine](../_bmad-output/planning-artifacts/domain-research-pieces-2026-02-27.md) — Contexte marché ivoirien
- [Recherche marché](../_bmad-output/planning-artifacts/market-research-pieces-2026-02-27.md) — Analyse concurrentielle
- [Recherche technique](../_bmad-output/planning-artifacts/technical-research-pieces-2026-02-27.md) — Choix technologiques

### Opérationnel

- [Templates WhatsApp](./whatsapp-templates.md) — Templates de messages WhatsApp Business

### Rétrospectives (`_bmad-output/implementation-artifacts/`)

- [Epic 1 — Fondation & Auth](../_bmad-output/implementation-artifacts/epic-1-retro-2026-03-01.md)
- [Epic 2 — Catalogue Vendeur](../_bmad-output/implementation-artifacts/epic-2-retro-2026-03-01.md)
- [Epic 3 — Recherche & Navigation](../_bmad-output/implementation-artifacts/epic-3-retro-2026-03-01.md)
- [Epic 4 — Commande & Paiement](../_bmad-output/implementation-artifacts/epic-4-retro-2026-03-01.md)
- [Epic 5 — Livraison](../_bmad-output/implementation-artifacts/epic-5-retro-2026-03-01.md)
- [Epic 6 — Bot WhatsApp](../_bmad-output/implementation-artifacts/epic-6-retro-2026-03-01.md)
- [Epic 7 — Évaluations & Litiges](../_bmad-output/implementation-artifacts/epic-7-retro-2026-03-01.md)
- [Epic 8 — Notifications](../_bmad-output/implementation-artifacts/epic-8-retro-2026-03-01.md)
- [Epic 9 — Admin & Enterprise](../_bmad-output/implementation-artifacts/epic-9-retro-2026-03-01.md)

---

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone <repo-url> && cd pieces
pnpm install

# 2. Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials

# 3. Migrer la base de données
cd packages/shared && pnpm db:migrate && cd ../..

# 4. Lancer en développement
pnpm dev
# API → http://localhost:3001
# Web → http://localhost:3000
```

---

## Pour les développements futurs

Lors de la planification de nouvelles fonctionnalités :

- **Feature API uniquement** → Référencer [Architecture API](./architecture-api.md) + [Contrats API](./api-contracts.md)
- **Feature UI uniquement** → Référencer [Architecture Web](./architecture-web.md)
- **Feature full-stack** → Référencer les deux architectures + [Intégration](./integration-architecture.md)
- **Nouveau modèle de données** → Référencer [Modèles de données](./data-models.md)
- **PRD brownfield** → Pointer vers ce fichier `index.md` comme contexte projet
