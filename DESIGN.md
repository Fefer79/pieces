# Design System — Pièces.ci

## Product Context
- **What this is:** Marketplace de pièces détachées automobiles en Côte d'Ivoire — neuves, occasions importées, ré-usinées.
- **USP:** La transparence. Fin des marges cachées des intermédiaires — chaque annonce affiche le détail du prix (vendeur / livraison / frais plateforme), chaque pièce affiche sa condition de façon proéminente.
- **Who it's for:** Mécaniciens (trouvent la pièce), propriétaires véhicule (approuvent/paient), vendeurs formels et informels de CI, livreurs (riders), entreprises (flotte), administrateurs Pièces.ci.
- **Roles:** MECHANIC (default), OWNER, SELLER, RIDER, ADMIN, ENTERPRISE.
- **Locale:** Français · FCFA · +225 (Côte d'Ivoire).
- **Project type:** PWA mobile-first + back-office desktop multi-rôles (Next.js 15, Tailwind v4).

## Aesthetic Direction
- **Direction:** Utilitaire épuré + chaleur ouest-africaine subtile. Référentiels: Backmarket (reconditionné transparent) × Doctolib (confiance service). Éviter Jumia (criard promo), éviter fintech SaaS générique.
- **Decoration:** Minimale. Typo + espace + accent orange font tout. Pas de dégradés décoratifs, pas de blobs, pas de shadows excessifs. Bordures subtiles préférées aux ombres.
- **Mood:** Sérieux (on parle d'argent et de pièces techniques), chaleureux (ouest-africain sans cliché), transparent (tout est explicite).
- **Tone:** Direct, concret, en français local naturel. Pas corporate, pas hype.

## Typography

Stack existante **à conserver** (elle est bonne et pas overused).

- **Display / Hero / Section headings:** `'Gloock', ui-serif, serif` — personnalité éditoriale, confiance. Utilisé pour logo, slides carrousel, titres de sections, H1/H2.
- **Body + UI + forms:** `'Instrument Sans', ui-sans-serif, system-ui, sans-serif` — excellent rendu français, neutre lisible.
- **Data / prix / monospace:** `'DM Mono', ui-monospace, monospace` — CRITIQUE: toujours avec `font-variant-numeric: tabular-nums` pour aligner les prix FCFA (nombres à 6+ chiffres).
- **Loading:** Google Fonts via `<link>` dans le root layout.
- **Scale:** 12 · 14 · 16 (base) · 18 · 20 · 24 · 32 · 40 · 56 px

**Utility classes (Tailwind v4 / CSS custom properties):**
```css
--font-display: 'Gloock', ui-serif, serif;
--font-body: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'DM Mono', ui-monospace, monospace;
```

**Règles:**
- Tout prix en FCFA → classe `font-mono tabular-nums`.
- Tout H1/H2 → `font-display`.
- Labels UI en uppercase → `font-mono text-[11px] tracking-[0.1em] font-medium`.

## Color

**Approach:** Restrained. Une couleur accent (orange existant), navy structurel, neutres chauds off-white, plus couleurs sémantiques pour conditions + statuts + mobile money.

### Core
| Role | Token | Hex | Usage |
|---|---|---|---|
| Primary ink | `--ink` | `#00113A` | Texte principal, logo, dark buttons |
| Primary interactive | `--ink-2` | `#002366` | Buttons primary, links, focus rings |
| Brand accent | `--accent` | `#FF6B00` | CTA principal, highlights, promos, carrousel dots |
| Accent hover | `--accent-hover` | `#E65F00` | Hover state du CTA accent |
| Surface | `--surface` | `#FAFAF9` | Background page (off-white chaud, pas blanc pur) |
| Card | `--card` | `#FFFFFF` | Background cards, tables, inputs |
| Border | `--border` | `#E8E8E8` | Divisions subtiles |
| Border strong | `--border-strong` | `#D4D4D2` | Inputs, boutons secondaires |
| Muted | `--muted` | `#6B6B6B` | Texte secondaire |
| Muted 2 | `--muted-2` | `#9B9B98` | Placeholders, disabled |

### Conditions (CRITICAL — first-class UI, pas enterré)
| Condition | BG | FG | Usage |
|---|---|---|---|
| Neuf | `#E6F2EC` | `#1E6F4C` | Pièce neuve, OEM, Aftermarket |
| Occasion importée | `#E4ECF5` | `#2D5A8A` | Pièce usagée importée (Allemagne, Dubaï, etc.) |
| Ré-usiné | `#FFF0E0` | `#B85200` | Pièce reconditionnée en atelier |
| Aftermarket | `#F3EAF7` | `#6B3E8F` | Non-OEM neuf |
| OEM | `rgba(0,35,102,0.08)` | `#002366` | Pièce d'origine constructeur |

**Règle absolue:** chaque carte produit, chaque ligne de commande, chaque fiche, chaque tableau admin montre la condition en chip coloré. Jamais en texte gris enterré.

### Statuts
| Statut | BG | FG |
|---|---|---|
| Success (Actif, Payé, Livré, Vérifié) | `#E6F2EC` | `#1E6F4C` |
| Warning (En revue, En attente, Rupture proche) | `#FBF1DC` | `#8A5A00` |
| Error (Litige, Rupture, Échec paiement) | `#FBE8E5` | `#B42318` |

### Mobile money (brand-accurate)
| Method | Color | Usage |
|---|---|---|
| Orange Money | `#FF6600` | Logo pill, selection highlight |
| MTN Money | `#FFCC00` (text: ink) | Logo pill |
| Wave | `#00BFFF` | Logo pill |
| COD (espèces) | `#4B4B4B` | Logo pill |

### Dark mode
Redesign surfaces (pas inverser). Saturation réduite 10-20%. `--surface: #0A0F1C`, `--card: #141A2B`, `--ink: #F0F2F8`, `--accent: #FF6B00` inchangé.

## Spacing
- **Base unit:** 4px.
- **Density:** Confortable (aéré moderne, type Vinted/Backmarket — pas dense Leboncoin).
- **Scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 px
- **Section padding vertical:** 56px desktop, 40px mobile.
- **Container max-width:** 1280px desktop.
- **Safe-area-inset-bottom** pour PWA sur notch devices (déjà en place).

## Layout
- **Approach:** Hybride.
  - **Grid-disciplined** pour catalogue, listings, admin, commandes, rider, vendeur. Prévisibilité.
  - **Editorial** pour home `/browse` (hero carrousel + onglets recherche + cascade véhicule + bandes produits).
- **Grid:**
  - Desktop catalogue: 4 colonnes (`repeat(4, 1fr)`, gap 20px).
  - Tablet: 3 colonnes.
  - Mobile: 2 colonnes.
- **AppShell existant conservé:** sidebar desktop (lg:block) + bottom nav mobile (lg:hidden). 5 items nav: Accueil · Chercher · Commandes · Conseil · Profil.
- **Border radius hiérarchique:**
  - `sm: 6px` — chips, inputs, petits boutons
  - `md: 10px` — cards, boutons, modals
  - `lg: 16px` — hero carrousel, grosses zones
  - `full: 9999px` — avatars, pills

## Motion
- **Approach:** Intentional (ni minimal-statique, ni expressif-ludique).
- **Durations:** micro 100ms, short 200ms (standard), medium 350ms (page transitions), long 550ms (carrousel slide).
- **Easings:**
  - enter: `cubic-bezier(.22,.61,.36,1)` (ease-out prononcé)
  - move: `ease-in-out`
  - exit: `ease-in`
- **Patterns:**
  - Carrousel auto-advance 5s, pause on hover.
  - Product card hover: `translateY(-2px)` + shadow-md.
  - Button active: `scale(0.98)` pour feedback tactile.
  - Skeleton loaders pour listings (pas spinners).
  - Fade-in 200ms pour images chargées.

## Component Rules

### Carrousel promo (home `/browse`)
- 3 slides par défaut : Transparence (navy), Promo active (orange), Conseil IA (cream).
- Dots cliquables en bas-gauche, 36×3px.
- Auto-advance 5s, reset sur interaction.
- Grid 1.15fr/0.85fr desktop, 1col mobile.
- Display font Gloock 52px/34px desktop/mobile.

### Product card
- Image 4:3 aspect-ratio, gradient placeholder si pas d'image.
- Chips condition en absolu top-left (1-2 chips max).
- Favori bouton en absolu top-right (cercle blanc, backdrop-blur).
- Prix en `font-mono tabular-nums 17px` en bas de card.
- Hover: `translateY(-2px)` + shadow.

### Prix FCFA
- **Toujours** `font-variant-numeric: tabular-nums`.
- **Toujours** séparateur milliers en espace insécable (`4 500` pas `4500`).
- Locale: `toLocaleString('fr-FR')` produit U+00A0 (NBSP) entre milliers — OK, mais pour les tests: utiliser regex, pas `toContain` (voir CLAUDE.md).

### Décomposition de prix (RISK #2 — transparence)
Obligatoire sur:
- `/choose/[shareToken]` (flux paiement propriétaire)
- Fiche produit catalogue (avant commander)
- Récap admin

Format :
```
Prix vendeur         65 000
Main-d'œuvre         15 000
Livraison (Cocody)    3 500
Frais plateforme      5 040
─────────────────────────
Total              131 040 FCFA

🛡️ Paiement sous séquestre. Aucune marge cachée.
```

### Chips condition (RISK #1 — first-class)
- Toujours colorés, jamais gris.
- Uppercase, 11.5px, font-weight 600, letter-spacing 0.04em.
- Dot indicateur `::before` de 6px.
- Présents sur: catalogue, fiche, commande, admin, historique.

### Cascade véhicule (Marque → Modèle → Année → Motorisation)
- 4 steps horizontaux desktop, 2×2 mobile.
- States: `pending` (gris), `active` (border ink-2 + halo), `done` (background neuf-bg + check).

### Onglets recherche `/browse`
- 4 onglets: Photo IA · VIN · Véhicule · WhatsApp.
- Active: background ink-2, texte blanc.
- Desktop: grille 4-col. Mobile: grille 2×2.

### Payment methods (mobile money)
- Cards 2×2.
- Logo pill (44×44, brand color).
- Radio à droite.
- Selected: border ink-2 2px + background ink-2/4%.

### OTP
- Grid 6 cells (ou 8 pour email).
- Cell 2px border, aspect-square.
- State `filled` (border ink-2 + bg light) / `active` (border accent + halo orange).
- Auto-advance + paste support.

### Rider delivery card
- Header gradient navy, COD montant en accent orange pill à droite.
- 2 blocs adresses côte-à-côte (pickup border navy, livraison border orange).
- Actions bar bas: primary CTA + appels + maps.

### Admin tables
- Header: background surface, uppercase 11px font-mono.
- Rows hover: background surface.
- Cellule prix: `text-align: right` + `font-mono tabular-nums`.
- Chips conditions inline dans cellule Condition.

## Accessibility
- WCAG AA minimum. Navy #002366 sur blanc = AA large + AAA body. Orange #FF6B00 sur blanc = AA large uniquement — **ne jamais l'utiliser pour texte body sur fond clair**; utiliser comme background button + fg blanc uniquement.
- Focus visible: `box-shadow: 0 0 0 3px rgba(0,35,102,0.08)` + `border-color: var(--ink-2)`.
- Touch targets minimum 44×44px mobile (48 préféré pour bottom nav).
- Dark mode respecte `prefers-color-scheme` + toggle manuel.
- Labels forms toujours explicites (pas de placeholder-only).

## Decisions Log
| Date | Decision | Rationale |
|---|---|---|
| 2026-04-19 | Design system v1 écrit | Créé par /design-consultation après audit codebase existant. Évolution de la stack en place (navy+orange+Gloock+Instrument Sans+DM Mono), pas remplacement. |
| 2026-04-19 | Chips conditions = first-class UI | RISK 1: matérialise l'USP "choix informé" vs concurrents qui enterrent la condition. |
| 2026-04-19 | Décomposition prix explicite obligatoire | RISK 2: matérialise l'USP "transparence, fin des marges cachées intermédiaires". |
| 2026-04-19 | Carrousel promo home /browse 3-slides | Demande user explicite. 3 par défaut: Transparence · Promo · Conseil IA. |
| 2026-04-19 | Mobile money = brand colors accurate | Orange Money orange, MTN jaune, Wave bleu. Reconnaissance instantanée = conversion. |
