# Équipe à Constituer — Pièces

**Date :** 2026-02-28
**Contexte :** Document de référence pour la constitution de l'équipe technique Phase 1 MVP

---

## Situation de départ

Équipe technique actuelle : **inexistante**
Pré-condition absolue au développement : recruter le dev fullstack lead en priorité.

---

## Configuration Recommandée — 3 devs (Phase 1 MVP)

| # | Rôle | Compétences requises | Priorité | Coût estimé CI |
|---|------|---------------------|----------|---------------|
| 1 | **Dev fullstack lead** | Next.js 15, Node.js/Fastify, PostgreSQL, Redis, CinetPay API, WhatsApp Cloud API | 🔴 Critique — recruter en premier | 600–900k FCFA/mois |
| 2 | **Dev IA / backend Python** | Python, FastAPI, Gemini API (VLM zero-shot), OCR (Tesseract / Google Vision), Meilisearch | 🔴 Critique | 500–800k FCFA/mois |
| 3 | **Dev frontend / mobile** | Next.js PWA, UI mobile-first, App Rider (même stack PWA) | 🟡 Important | 400–600k FCFA/mois |
| 4 | **Designer UI/UX** | Figma, design mobile, design system | 🟢 Contractuel 1–2 mois | 200–350k FCFA/mois |

**Total mensuel estimé (3 devs + designer contractuel) :** 1,7M – 2,65M FCFA/mois

---

## Configuration Minimum Absolu — 2 devs (risqué)

| # | Rôle | Compétences requises | Risque |
|---|------|---------------------|--------|
| 1 | **Dev fullstack senior** | Next.js + Fastify + PostgreSQL + Redis + CinetPay + WhatsApp | Aucune redondance |
| 2 | **Dev IA/backend** | Python + FastAPI + Gemini VLM + OCR + Meilisearch | Aucune redondance |

**Timeline avec 2 devs :** 8–10 mois jusqu'au pilote (vs 5–6 mois avec 3 devs)
**Risque :** un arrêt maladie ou une démission bloque tout le projet.

---

## Rôles Non-Techniques (Phase 1)

| Rôle | Mission | Timing |
|------|---------|--------|
| **Agente(s) terrain** (1–2) | Onboarding vendeurs Adjamé, tablette Pièces, collecte photos catalogue | Dès M3 (avant pilote) |
| **Coordinateur dispatch** (1) | Dispatching coursiers par WhatsApp interne, suivi livraisons Phase 1 | Dès M4 (pilote) |
| **Agent support / arbitrage** (1) | Litiges pièces incorrectes, appels bilatéraux, décisions écrites sous 24h — compétence technique automobile requise | Dès M4 (pilote) |

---

## Options de Sourcing

| Option | Délai de recrutement | Coût | Recommandation |
|--------|---------------------|------|----------------|
| **Co-fondateur technique** | Variable (réseau) | Equity | ⭐ Meilleur choix long terme — engagement, ownership, pas de turnover |
| **Freelances CI / AOF** (LinkedIn, communautés dev Abidjan) | 3–6 semaines | Modéré | Bon équilibre coût / proximité marché |
| **Freelances internationaux** (Toptal, Arc.dev, Upwork) | 2–4 semaines | Élevé (USD) | Phase 1 si budget disponible |
| **Agence tech Abidjan** (DIGITALL, Intek, etc.) | 1–2 semaines | Élevé, forfait | Risque transfert de connaissance en fin de contrat |
| **Programme incubateur** (Orange Ventures, Partech Africa, YC) | 2–4 mois | Equity | Accès réseau talent + capital + mentors |

---

## Séquence de Constitution Recommandée

```
Mois 1 — Semaine 1–2 :
  → Lancer la recherche du dev fullstack lead (LinkedIn CI + réseau)
  → Déposer dossier ARTCI (action non-bloquante, délai 60 jours)

Mois 1 — Semaine 3–4 :
  → Entretiens + sélection dev fullstack lead
  → Le lead participe au recrutement des profils suivants

Mois 2 :
  → Recruter dev IA/Python
  → Recruter dev frontend/mobile
  → Contractualiser designer UI/UX (mission 6 semaines)

Mois 2–4 :
  → Développement core (WhatsApp bot + PWA + paiement + RBAC)

Mois 3 :
  → Recruter agentes terrain (2)
  → Former agentes terrain sur l'outil tablette

Mois 4 :
  → Pilote fermé : 10 vendeurs / 50 mécaniciens / 5 Enterprise
  → Coordinateur dispatch + agent support en poste

Mois 5–6 :
  → Corrections post-pilote
  → Lancement public Abidjan
```

---

## Profil Prioritaire à Recruter en Premier : Dev Fullstack Lead

**Ce profil doit savoir :**
- Next.js 15 (App Router, Server Components, PWA)
- Node.js avec Fastify (API REST, middleware, webhooks)
- PostgreSQL (requêtes complexes, migrations, Row-Level Security)
- Redis (cache, queues)
- Intégrations API tierces (CinetPay, WhatsApp Cloud API)
- Déploiement cloud (VPS ou AWS/GCP — configuration complète)

**Ce profil doit idéalement avoir :**
- Expérience sur un produit marketplace ou fintech
- Expérience de recrutement et leadership technique (il va encadrer les 2 autres devs)
- Connaissance du marché tech Abidjan / AOF (atout majeur)

**Où le trouver :**
- LinkedIn CI — mots-clés : "Next.js Abidjan", "fullstack Côte d'Ivoire"
- Communautés : GDG Abidjan, Dev CI (Facebook/WhatsApp), Afrobytes network
- Réseau personnel fondateur
- Simplon Côte d'Ivoire (alumni)
- Freelance platforms : Upwork (profils AOF), CcHub network

---

## Budget Total Phase 1 (6 mois)

| Poste | Estimation |
|-------|-----------|
| 3 devs × 6 mois | 9M – 16M FCFA |
| Designer contractuel × 2 mois | 400k – 700k FCFA |
| 2 agentes terrain × 3 mois | 900k – 1,5M FCFA |
| Coordinateur dispatch × 2 mois | 300k – 500k FCFA |
| Agent support × 2 mois | 300k – 500k FCFA |
| **Total équipe Phase 1** | **~11M – 19M FCFA** |

*Hors infrastructure cloud, licences API (WhatsApp, Gemini, CinetPay), et frais légaux (ARTCI, structure juridique).*
