# Architecture — Web Frontend (apps/web)

**Généré le :** 2026-03-01
**Type :** Web PWA
**Framework :** Next.js 15.3 (App Router) + React 19
**CSS :** Tailwind CSS 4.1
**PWA :** Serwist 9.5

---

## Vue d'ensemble

Le frontend Pièces est une Progressive Web App (PWA) mobile-first ciblant les mécaniciens, propriétaires et vendeurs en Côte d'Ivoire. C'est un client léger — toute la logique métier réside dans l'API backend, accessible via un proxy de réécriture Next.js.

---

## Configuration

### Next.js (`next.config.ts`)

- **PWA :** Plugin Serwist compile `app/sw.ts` → `public/sw.js` (désactivé en dev)
- **Monorepo :** Transpile le package `shared` pour import direct
- **Proxy API :** Toutes les requêtes `/api/:path*` réécrites vers `NEXT_PUBLIC_API_URL` (défaut : `http://localhost:3001`)

### Middleware (`middleware.ts`)

- Intercepte toutes les requêtes (sauf assets statiques et `/api`)
- Crée un client Supabase SSR, vérifie l'utilisateur authentifié
- Redirige vers `/login` si non authentifié
- Chemins publics : `/login`, `/`

---

## Structure des routes (App Router)

```
app/
├── layout.tsx                   # Layout racine (lang="fr", metadata PWA)
├── page.tsx                     # Landing page publique
├── globals.css                  # Styles globaux Tailwind
├── sw.ts                        # Source du Service Worker
└── (auth)/                      # Route group protégé
    ├── layout.tsx               # Layout auth (nav bar + consent gate)
    ├── consent-modal.tsx        # Modal consentement ARTCI
    ├── login/
    │   ├── page.tsx             # Saisie numéro +225
    │   └── otp/page.tsx         # Vérification OTP 6 chiffres
    ├── browse/
    │   ├── page.tsx             # Recherche + grille marques
    │   ├── photo/page.tsx       # Identification par photo
    │   ├── vehicles/page.tsx    # Profils véhicules
    │   ├── vin/page.tsx         # Décodage VIN
    │   └── [brand]/
    │       ├── page.tsx         # Modèles d'une marque
    │       └── [model]/
    │           ├── page.tsx     # Années d'un modèle
    │           └── [year]/page.tsx  # Pièces disponibles
    ├── choose/
    │   └── [shareToken]/page.tsx    # Choix propriétaire (lien partagé)
    ├── vendors/
    │   ├── catalog/
    │   │   ├── page.tsx         # Liste catalogue
    │   │   ├── upload/page.tsx  # Upload photos
    │   │   └── [id]/page.tsx    # Détail pièce
    │   ├── dashboard/page.tsx   # Dashboard vendeur
    │   ├── delivery-zones/page.tsx  # Config zones livraison
    │   └── guarantees/page.tsx  # Signatures garanties
    ├── rider/
    │   ├── page.tsx             # Dashboard livreur
    │   └── delivery/[deliveryId]/page.tsx  # Détail mission
    ├── orders/page.tsx          # Historique commandes
    ├── onboarding/new/page.tsx  # Onboarding vendeur
    ├── profile/
    │   ├── page.tsx             # Profil utilisateur
    │   └── data/page.tsx        # Données personnelles
    └── admin/page.tsx           # Dashboard admin
```

---

## Patterns architecturaux

### 1. Authentification Supabase SSR

- **Middleware** : `createServerClient` avec synchronisation cookies request/response
- **Composants client** : `createBrowserClient` via `useRef` singleton pattern
- **Flux** : Phone OTP → Supabase Auth → Bearer token → API backend

### 2. Consent Gate (conformité ARTCI)

- Le layout `(auth)` vérifie le consentement utilisateur au montage
- Si pas de `consentedAt`, affiche un modal bloquant (`consent-modal.tsx`)
- POST vers `/api/v1/users/me/consent` avec `{ accepted: true }`

### 3. Navigation mobile-first

- Barre de navigation fixe en bas (Home, Orders, Profile)
- Touch targets ≥ 48px
- `env(safe-area-inset-bottom)` pour les encoches iPhone
- Layout centré avec `min-h-dvh`

### 4. Service Worker PWA

- Precaching des assets statiques via `__SW_MANIFEST` (injecté au build)
- Runtime caching via les stratégies par défaut Serwist/Next.js
- `skipWaiting: true` + `clientsClaim: true` pour activation immédiate
- Navigation preload activé

### 5. Proxy API transparent

Le frontend ne fait jamais d'appels directs au backend. Toutes les requêtes `/api/*` passent par la réécriture Next.js, ce qui :
- Évite les problèmes CORS en production
- Centralise la configuration de l'URL backend
- Permet le SSR d'interagir avec la même API

---

## Utilitaires (`lib/`)

| Fichier | Rôle |
|---------|------|
| `supabase.ts` | Factory `createBrowserClient` pour composants client |
| `supabase-middleware.ts` | Factory `createServerClient` pour middleware Edge |
| `role-labels.ts` | Labels français des rôles pour l'affichage UI |

---

## PWA Manifest (`public/manifest.json`)

- Nom : "Pièces"
- Affichage : standalone
- Couleur thème : `#1976D2` (Material Design blue)
- Icônes : 192x192 et 512x512

---

## Tests

- **Framework :** Vitest 3.2
- **Fichiers de test :** 4 (`page.test.tsx`, `login/page.test.tsx`, `profile/page.test.tsx`, `profile/data/page.test.tsx`)
- **Pattern :** Tests de rendu basiques des composants page

---

## Notes techniques

### Inconsistances identifiées (dette technique)

1. **Récupération de tokens :** Certaines pages utilisent `supabase.auth.getSession()`, d'autres `localStorage.getItem('access_token')` — à unifier
2. **Styles :** Browse et vendor pages utilisent Tailwind, orders et admin pages utilisent des styles inline — à harmoniser
3. **Composants UI :** Le dossier `components/ui/` est vide — pas de bibliothèque de composants réutilisables formalisée
