# Design System — Pièces.ci

> Source de vérité unique pour toute décision visuelle. Avant toute modification UI (couleur, police, espacement, composant), lire ce document. Ne pas dévier sans accord explicite du propriétaire produit.
>
> **Implémentation réelle :** les tokens vivent dans `apps/web/app/globals.css` (bloc Tailwind v4 `@theme`). Les polices sont chargées dans `apps/web/app/layout.tsx`. Le système documentaire (PDF/DOCX) vit dans `docs/_template/`. Ce fichier décrit ce qui est **réellement codé** — toute section marquée _(proposé)_ n'est pas encore implémentée.

## Product Context
- **What this is:** Marketplace de pièces détachées automobiles en Côte d'Ivoire — neuves, occasions importées, ré-usinées.
- **USP:** La transparence. Fin des marges cachées des intermédiaires — chaque annonce affiche le détail du prix (vendeur / livraison / frais plateforme), chaque pièce affiche sa condition de façon proéminente.
- **Who it's for:** Mécaniciens (trouvent la pièce), propriétaires véhicule (approuvent/paient), vendeurs formels et informels de CI, livreurs (riders), entreprises (flotte), administrateurs Pièces.ci.
- **Roles:** MECHANIC (default), OWNER, SELLER, RIDER, ADMIN, ENTERPRISE.
- **Locale:** Français · FCFA · +225 (Côte d'Ivoire).
- **Project type:** PWA mobile-first + back-office desktop multi-rôles (Next.js 15, React 19, Tailwind v4, Serwist PWA).

## Aesthetic Direction
- **Direction:** Utilitaire épuré + chaleur ouest-africaine subtile. Référentiels: Backmarket (reconditionné transparent) × Doctolib (confiance service). Éviter Jumia (criard promo), éviter fintech SaaS générique.
- **Decoration:** Minimale. Typo + espace + accent orange font tout. Pas de dégradés décoratifs, pas de blobs, pas de shadows excessifs. Bordures subtiles préférées aux ombres.
- **Mood:** Sérieux (on parle d'argent et de pièces techniques), chaleureux (ouest-africain sans cliché), transparent (tout est explicite).
- **Tone:** Direct, concret, en français local naturel. Pas corporate, pas hype.

## Typography

Stack à trois familles, **partagée entre l'app web et les documents PDF/DOCX** (cohérence de marque pixel ↔ papier).

| Rôle | Famille | Token CSS (web) | Chargement |
|---|---|---|---|
| Display / Hero / Titres | **Gloock** | `--font-display` | `<link>` Google Fonts dans `<head>` (`layout.tsx`) |
| Body + UI + forms | **Instrument Sans** | `--font-body` → `var(--font-instrument)` | `next/font/google` (variable, subset `latin`, `display: swap`) |
| Data / prix / mono | **DM Mono** | `--font-mono` → `var(--font-dm-mono)` | `next/font/google` (weight `400`, subset `latin`, `display: swap`) |

**Stacks réelles (`globals.css`) :**
```css
--font-display: 'Gloock', ui-serif, Georgia, serif;
--font-body:    var(--font-instrument), ui-sans-serif, system-ui, sans-serif;
--font-mono:    var(--font-dm-mono), ui-monospace, 'SFMono-Regular', monospace;
```

**Détails d'implémentation à connaître :**
- **Gloock** n'est *pas* chargé via `next/font` — c'est un `<link rel="stylesheet">` explicite dans le `<head>` du root layout (`family=Gloock&display=swap`). Une seule graisse (400) existe pour Gloock chez Google Fonts.
- **Instrument Sans** est une police *variable* : `next/font` charge toute la plage de graisses (400→700) sans qu'on liste les poids. Utiliser `font-medium`/`font-semibold`/`font-bold` librement.
- **DM Mono** n'est *pas* variable : seul le poids `400` est chargé. Ne pas compter sur `font-medium`/`font-bold` en mono — ils retomberont sur 400.
- `next/font` expose les polices via les variables CSS `--font-instrument` et `--font-dm-mono`, appliquées sur `<body>` (`${instrumentSans.variable} ${dmMono.variable}`). Les tokens `--font-body`/`--font-mono` les référencent.

**Utilities (Tailwind v4) :**
- `font-display` — utility custom déclarée dans `globals.css` (`@utility font-display`) → applique Gloock.
- `tabular` — utility custom (`@utility tabular`) → `font-variant-numeric: tabular-nums`. **Obligatoire sur tout prix FCFA.**
- `font-body` / `font-mono` — générées par Tailwind depuis les tokens `--font-*`.
- `h1, h2, h3` reçoivent Gloock + `letter-spacing: -0.01em` + `line-height: 1.12` via `@layer base` (pas besoin de classe explicite).

**Scale (px) :** 12 · 14 · 16 (base) · 18 · 20 · 24 · 32 · 40 · 56

**Règles :**
- Tout prix en FCFA → `font-mono tabular`.
- Tout H1/H2/H3 → Gloock (automatique via `@layer base`, ou `font-display` ailleurs).
- Labels UI uppercase → `font-mono text-[11px] tracking-[0.1em] font-medium` (note : DM Mono restant en 400).

## Color

**Approach :** Restrained. Un accent orange, navy structurel, neutres chauds off-white, plus couleurs sémantiques pour conditions / statuts / mobile money. Tous les hex ci-dessous sont **les valeurs exactes du bloc `@theme`** de `globals.css` — utiliser les utilities Tailwind (`bg-ink`, `text-accent`, `bg-neuf-bg`…), jamais des hex en dur dans les composants.

### Core
| Role | Token (`--color-*`) | Hex | Usage |
|---|---|---|---|
| Primary ink | `ink` | `#00113A` | Texte principal, logo, dark buttons |
| Primary interactive | `ink-2` | `#002366` | Buttons primary, links, focus rings |
| Brand accent | `accent` | `#FF6B00` | CTA principal, highlights, promos, carrousel dots, `themeColor` PWA |
| Accent hover | `accent-hover` | `#E65F00` | Hover du CTA accent |
| Surface | `surface` | `#FAFAF9` | Background page (off-white chaud, pas blanc pur) |
| Card | `card` | `#FFFFFF` | Background cards, tables, inputs |
| Border | `border` | `#E8E8E8` | Divisions subtiles |
| Border strong | `border-strong` | `#D4D4D2` | Inputs, boutons secondaires |
| Muted | `muted` | `#6B6B6B` | Texte secondaire |
| Muted 2 | `muted-2` | `#9B9B98` | Placeholders, disabled |

### Conditions (CRITICAL — first-class UI, jamais enterré)
| Condition | Token bg / fg | BG | FG |
|---|---|---|---|
| Neuf | `neuf-bg` / `neuf-fg` | `#E6F2EC` | `#1E6F4C` |
| Occasion importée | `occasion-bg` / `occasion-fg` | `#E4ECF5` | `#2D5A8A` |
| Ré-usiné | `reusine-bg` / `reusine-fg` | `#FFF0E0` | `#B85200` |
| Aftermarket | `aftermarket-bg` / `aftermarket-fg` | `#F3EAF7` | `#6B3E8F` |
| OEM | `oem-bg` / `oem-fg` | `rgba(0,35,102,0.08)` | `#002366` |

**Règle absolue :** chaque carte produit, ligne de commande, fiche, et ligne de tableau admin montre la condition en chip coloré. Jamais en texte gris enterré. → voir composant `apps/web/components/ui/chip.tsx`.

### Statuts
| Statut | Token bg / fg | BG | FG |
|---|---|---|---|
| Success (Actif, Payé, Livré, Vérifié) | `success-bg` / `success-fg` | `#E6F2EC` | `#1E6F4C` |
| Warning (En revue, En attente, Rupture proche) | `warn-bg` / `warn-fg` | `#FBF1DC` | `#8A5A00` |
| Error (Litige, Rupture, Échec paiement) | `error-bg` / `error-fg` | `#FBE8E5` | `#B42318` |

### Mobile money (brand-accurate)
| Method | Token | Color | Usage |
|---|---|---|---|
| Orange Money | `om` | `#FF6600` | Logo pill, selection highlight |
| MTN Money | `mtn` | `#FFCC00` (texte: ink) | Logo pill |
| Wave | `wave` | `#00BFFF` | Logo pill |
| COD (espèces) | `cod` | `#4B4B4B` | Logo pill |

### Shadows
Bordure d'abord, ombres légères teintées navy. Deux tokens seulement :
```css
--shadow-sm: 0 1px 2px rgba(0,17,58,0.05);
--shadow-md: 0 4px 14px rgba(0,17,58,0.06), 0 1px 2px rgba(0,17,58,0.04);
```

### Dark mode _(proposé — non implémenté)_
Pas de tokens dark dans `globals.css` à ce jour. Quand on l'ajoutera : redesign des surfaces (pas inversion), saturation réduite 10-20%, `surface ≈ #0A0F1C`, `card ≈ #141A2B`, `ink ≈ #F0F2F8`, `accent` inchangé. À piloter via `prefers-color-scheme` + toggle manuel.

## Spacing
- **Base unit :** 4px (échelle Tailwind par défaut — pas de tokens d'espacement custom dans `@theme`).
- **Density :** Confortable (aéré moderne, type Vinted/Backmarket — pas dense Leboncoin).
- **Scale (px) :** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
- **Section padding vertical :** 56px desktop, 40px mobile.
- **Container max-width :** 1280px desktop.
- **Safe-area-inset-bottom** pour PWA sur notch devices.

## Layout
- **Approach :** Hybride.
  - **Grid-disciplined** pour catalogue, listings, admin, commandes, rider, vendeur. Prévisibilité.
  - **Editorial** pour home `/browse` (hero carrousel + onglets recherche + cascade véhicule + bandes produits).
- **Grid catalogue :**
  - Desktop : 4 colonnes (`repeat(4, 1fr)`, gap 20px).
  - Tablet : 3 colonnes.
  - Mobile : 2 colonnes.
- **AppShell :** sidebar desktop (`lg:block`) + bottom nav mobile (`lg:hidden`). 5 items nav : Accueil · Chercher · Commandes · Conseil · Profil.
- **Border radius (tokens `--radius-*`) :**
  - `sm: 6px` — chips, inputs, petits boutons (`rounded-sm`)
  - `md: 10px` — cards, boutons, modals (`rounded-md`)
  - `lg: 16px` — hero carrousel, grosses zones (`rounded-lg`)
  - `rounded-full` (9999px, utility Tailwind native — pas un token custom) — avatars, pills, chips

## Motion
- **Approach :** Intentional (ni minimal-statique, ni expressif-ludique).
- **Durations :** micro 100ms, short 200ms (standard), medium 350ms (page transitions), long 550ms (carrousel slide).
- **Easings :**
  - enter : `cubic-bezier(.22,.61,.36,1)` (ease-out prononcé)
  - move : `ease-in-out`
  - exit : `ease-in`
- **Patterns :**
  - Carrousel auto-advance 5s, pause on hover.
  - Product card hover : `translateY(-2px)` + `shadow-md`.
  - Button active : `scale(0.98)` pour feedback tactile.
  - Skeleton loaders pour listings (pas spinners).
  - Fade-in 200ms pour images chargées.

## Component Rules

### Chips condition (RISK #1 — first-class)
Implémenté dans `apps/web/components/ui/chip.tsx`. Variantes : `neuf · occasion · reusine · aftermarket · oem · plain · status-ok · status-warn · status-err`, mappées aux tokens couleur (`bg-neuf-bg text-neuf-fg`, etc.).
- Toujours colorés, jamais gris (sauf `plain` = surface/muted/border).
- `rounded-full`, padding `px-2.5 py-1`, texte 11.5px, `font-semibold`, uppercase, `tracking-[0.04em]`.
- Dot indicateur 6×6px en `bg-current`.
- Helpers exportés : `<ConditionChip>` (NEW→Neuf / USED→Occasion importée / REFURBISHED→Ré-usiné) et `<PartSourceChip>` (OEM / AFTERMARKET / COMPATIBLE→`plain`).
- Présents sur : catalogue, fiche produit, commande, admin, historique.

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
- Prix en `font-mono tabular` 17px en bas de card.
- Hover : `translateY(-2px)` + `shadow-md`.

### Prix FCFA
- **Toujours** `tabular` (`font-variant-numeric: tabular-nums`).
- **Toujours** séparateur milliers en espace insécable (`4 500` pas `4500`).
- Locale : `toLocaleString('fr-FR')` produit U+00A0 (NBSP) entre milliers — OK, mais pour les tests : utiliser regex, pas `toContain` (voir CLAUDE.md).

### Décomposition de prix (RISK #2 — transparence)
Obligatoire sur : `/choose/[shareToken]` (flux paiement propriétaire), fiche produit catalogue (avant commander), récap admin.

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

### Cascade véhicule (Marque → Modèle → Année → Motorisation)
- 4 steps horizontaux desktop, 2×2 mobile.
- States : `pending` (gris), `active` (border ink-2 + halo), `done` (background `neuf-bg` + check).

### Parcours d'accueil `/browse` (2 cartes)
Structure en entonnoir, deux cartes empilées sous le carrousel promo :
- **Carte 1 — « 1. Identifiez votre véhicule »** : 3 sous-onglets `Mon véhicule` (gauche, actif par défaut → sélecteur de type + cascade) · `Code VIN` · `WhatsApp`. Onglet actif : background ink-2, texte blanc (grille 3-col).
- **Carte 2 — « 2. Trouvez votre pièce »** : barre de recherche à prédictions (nom **ou** réf. OEM, restreinte au véhicule) + bouton Photo IA. Résultats sous la barre.
- **« Parcourir par catégorie »** (`CategoryCarousel`) : rendu **sous les cartes, uniquement après sélection d'un véhicule** ; tuiles scopées au véhicule (`/search?brand=&model=&year=&category=`). Plus affiché en permanence sous le carrousel.

### Payment methods (mobile money)
- Cards 2×2.
- Logo pill (44×44, brand color via token `om`/`mtn`/`wave`/`cod`).
- Radio à droite.
- Selected : border ink-2 2px + background ink-2/4%.

### OTP
- Grid 6 cells (ou 8 pour email).
- Cell 2px border, aspect-square.
- State `filled` (border ink-2 + bg light) / `active` (border accent + halo orange).
- Auto-advance + paste support.

### Rider delivery card
- Header gradient navy, COD montant en accent orange pill à droite.
- 2 blocs adresses côte-à-côte (pickup border navy, livraison border orange).
- Actions bar bas : primary CTA + appels + maps.

### Admin tables
- Header : background surface, uppercase 11px font-mono.
- Rows hover : background surface.
- Cellule prix : `text-align: right` + `font-mono tabular`.
- Chips conditions inline dans cellule Condition.

## Document & Print Design (PDF / DOCX)

Système documentaire de marque dans `docs/_template/` — manuels, brochures commerciales, offres grands comptes, bibles internes. Tout PDF mène avec le logo Pièces et réutilise **les mêmes polices et couleurs que pieces.ci** (cohérence pixel ↔ papier). Détails opérationnels : `docs/_template/README.md`.

### Pipeline
- **Markdown → DOCX** : Pandoc (≥ 3), style par défaut (pas de logo, pas de Google Fonts — destiné à l'édition collaborative).
- **Markdown → HTML → PDF** : Pandoc embarque `style.css` + `header.html.tpl`, puis Chrome headless rend le PDF (charge les Google Fonts au moment de l'impression). Le PDF est le livrable de production.
- Génération : `bash docs/_template/build.sh [slug…]` (sans argument = reconstruit tous les documents enregistrés).
- Requiert Pandoc ≥ 3 et Google Chrome (path macOS par défaut, surchargeable via `CHROME=`).

### Tokens print (`docs/_template/style.css`)
Mêmes familles que le web ; valeurs en **points (pt)** pour l'impression A4.

| Élément | Police | Taille | Couleur |
|---|---|---|---|
| Page | — | A4, marges 22mm haut/bas · 18mm gauche/droite (1ʳᵉ page : 14mm haut) | — |
| Body (`p, ul, ol`) | Instrument Sans | 10.5pt, line-height 1.55, espacement 6pt | `#1a1a1a` |
| `h1` | Gloock | 26pt, line-height 1.15 | `#00113a` |
| `h2` | Gloock | 17pt, margin-top 22pt | `#00113a` |
| `h3` | Instrument Sans 600 | 12.5pt | `#00113a` |
| `h4` | Instrument Sans 600 | 11pt | `#1a1a1a` |
| Logo (`.pieces-doc-header .logo`) | Gloock (SVG) | 36pt, point orange `#ff6b00` | `#00113a` |
| Méta header / footer page | DM Mono | header 8.5pt uppercase · footer 9pt centré | — |
| `code` inline | DM Mono | 9.5pt, bg `#f4f4f4`, radius 3px | `#00113a` |
| `pre` (bloc) | DM Mono | 9pt, bg `#f8f8f6`, border-left 3px accent | `#00113a` |
| `blockquote` | Instrument Sans italic | bg `#fff9f4`, border-left 3px accent `#FF6B00` | `#444` |
| `table` | Instrument Sans | 9.5pt ; header navy `#00113a` texte blanc gras ; lignes paires `#fafafa` | — |
| `a` | — | underline pointillé | `#00113a` |
| Footer centré italique | Instrument Sans | 9.5pt, border-top 1px `#eee` | `#888` |

### Header / logo (`docs/_template/header.html.tpl`)
Fragment HTML injecté en tête de chaque PDF : SVG « Pièces » en Gloock `#00113a` + point accent orange `#ff6b00`, et un bloc méta à droite peuplé via `{{CATEGORY}}` / `{{SUBTITLE}}` au build.

### Règle du point orange (convention de marque)
**Le point orange est le point final de « Pièces ».** Il se place sur la ligne de base, juste après le « s », comme la ponctuation d'un mot — jamais posé sur le « s » ni superposé aux lettres. Il reste solidaire du wordmark : on ne le recentre pas, on ne le déplace pas verticalement, on ne l'éloigne pas ; le wordmark et le point forment un bloc indissociable, mis à l'échelle ensemble.

Géométrie de référence (viewBox `0 0 196 80`) : texte `x=0 y=62`, Gloock `font-size=64`, `letter-spacing=-1` ; cercle `cx=186 cy=54 r=8`, `#ff6b00` (sur la ligne de base, après le « s »). Encre : `#00113a` (fond clair) ou `#ffffff` (fond sombre). Sources uniques :
- SVG web : `apps/web/public/logo-pieces-light.svg` · `logo-pieces-dark.svg`
- SVG header docs : `docs/_template/header.html.tpl`
- PNG haute résolution (transparent, 3920×1600) : `apps/web/public/logo-pieces-light.png` · `logo-pieces-dark.png` (copies dans `docs/_template/`)

### Ajouter un document
1. Écrire le markdown dans `docs/mon-doc.md`.
2. Ajouter une entrée au tableau `DOCS` de `build.sh` : `"mon-doc|Catégorie|Sous-titre · v1.0 · Mai 2026"`.
3. `bash docs/_template/build.sh mon-doc`.

> **État actuel :** le tableau `DOCS` compte **25** documents (12 manuels deep-dive, 9 brochures/offres commerciales, 3 bibles `CTO/CEO/CRO`). Le `README.md` du template ne fixe plus de nombre en dur (« every document registered in the `DOCS` array ») pour ne pas se périmer à chaque ajout.

## Accessibility
- WCAG AA minimum. Navy `#002366` sur blanc = AA large + AAA body. Orange `#FF6B00` sur blanc = AA large uniquement — **ne jamais l'utiliser pour texte body sur fond clair** ; uniquement comme background button + fg blanc.
- Focus visible : `box-shadow: 0 0 0 3px rgba(0,35,102,0.08)` + `border-color: var(--color-ink-2)`.
- Touch targets minimum 44×44px mobile (48 préféré pour bottom nav).
- Labels forms toujours explicites (pas de placeholder-only).
- Dark mode : respectera `prefers-color-scheme` + toggle quand implémenté.

## Redesign 2026-06 — direction validée _(proposé, non encore codé)_

> Refonte décidée par l'owner (« repenser tout le design »). **Marque inchangée** : navy `#00113A` + orange `#FF6B00`, Gloock / Instrument Sans / DM Mono, chips condition, décompo prix. On refond **composition, hiérarchie, densité** — pas l'identité. Maquettes haute-fidélité dans le projet Claude Design « Pieces: Côte d'Ivoire marketplace » (3 fichiers : *Parcours acheteur* · *Back-office* · *Onboarding/Rider/Flotte*). La piste « 3 directions radicales » (Atelier / Marché / Reçu) a été explorée puis **écartée**.

**Principes de composition :**
- Plus d'air ; **bordures subtiles plutôt qu'ombres lourdes** ; surfaces off-white.
- Tout prix FCFA en **DM Mono tabular** ; labels/eyebrows en mono uppercase.
- Le **navy structure** (barre utilitaire, sidebars, en-têtes de modules, footer) ; l'**orange reste rare** (CTA principal + accents seulement).

**Composant signature « Reçu » (transparence).** Le bloc décompo prix devient un composant récurrent à **en-tête navy** (eyebrow mono + titre Gloock), lignes avec **points de conduite (dotted leaders)**, total en DM Mono, sceau séquestre vert (`neuf-bg`/`neuf-fg`). Présent sur : carrousel d'accueil, fiche produit, `/choose`. Matérialise l'USP transparence à chaque moment d'achat.

**Accueil `/browse`.** Carrousel promo affiché **à la 1ʳᵉ visite uniquement**, puis masqué (flag `hasSeenIntro` en localStorage) pour laisser la recherche/entonnoir en tête aux visites suivantes. L'entonnoir 2 cartes (Identifiez le véhicule → Trouvez la pièce) reste le cœur.

**Back-office (desktop dense).** Shell commun = **sidebar navy contextualisée par rôle** (logo, bloc contexte rôle/entité, nav, user) + topbar (titre + actions) + **cartes-stats DM Mono** + **tables denses** (chips condition/statut inline, prix alignés à droite `tabular` + `nowrap`). Décliné pour vendeur, admin, flotte. Le **rider reste mobile** (terrain : carte course COD, legs retrait→livraison).

**Onboarding (mobile-first PWA).** OTP 6 cellules (filled navy / active halo orange) ; **choix de rôle** en cartes (Mécanicien · Propriétaire · Vendeur · Livreur · Entreprise).

**Vitrine flotte.pieces.ci.** Hero + 3 tiers `FLEET_PLANS` (Gratuit / Flotte Pro 5 000 F / Flotte Pro+ 10 000 F par véh./mois, essai 30 j). Aucun langage SLA/pénalité ; livraison = bénéfice service.

## Decisions Log
| Date | Decision | Rationale |
|---|---|---|
| 2026-04-19 | Design system v1 écrit | Créé par /design-consultation après audit codebase existant. Évolution de la stack en place (navy+orange+Gloock+Instrument Sans+DM Mono), pas remplacement. |
| 2026-04-19 | Chips conditions = first-class UI | RISK 1 : matérialise l'USP « choix informé » vs concurrents qui enterrent la condition. |
| 2026-04-19 | Décomposition prix explicite obligatoire | RISK 2 : matérialise l'USP « transparence, fin des marges cachées intermédiaires ». |
| 2026-04-19 | Carrousel promo home /browse 3-slides | Demande user explicite. 3 par défaut : Transparence · Promo · Conseil IA. |
| 2026-04-19 | Mobile money = brand colors accurate | Orange Money orange, MTN jaune, Wave bleu. Reconnaissance instantanée = conversion. |
| 2026-05-29 | DESIGN.md réaligné sur le code réel | Réécriture après audit de `globals.css` (`@theme`), `layout.tsx` et `chip.tsx`. Corrections : Gloock chargé via `<link>` (pas next/font), DM Mono limité au poids 400, Instrument Sans variable. Dark mode marqué _(proposé)_ car non implémenté. Tokens documentés par nom utility. |
| 2026-05-29 | Système documentaire intégré au design system | Section « Document & Print Design » ajoutée à partir de `docs/_template/` (style.css print, header SVG, pipeline Pandoc+Chrome). Mêmes polices/couleurs que le web. Écart relevé : README dit 14 docs, réalité = 25. |
| 2026-05-29 | `/browse` réorganisé en 2 cartes (entonnoir) | Demande owner. Carte 1 « Identifiez votre véhicule » (Mon véhicule · VIN · WhatsApp, Mon véhicule à gauche) puis Carte 2 « Trouvez votre pièce » (recherche à prédictions + Photo IA). « Parcourir par catégorie » déplacé sous les cartes, conditionné à la sélection d'un véhicule (tuiles scopées). Remplace l'ancienne barre 4-onglets Photo·VIN·Véhicule·WhatsApp. |
| 2026-06-21 | Redesign « évolution forte » validé (mockups) | Owner : « repenser tout le design ». Marque conservée ; refonte composition/hiérarchie/densité. 3 fichiers de maquettes dans Claude Design. Piste « 3 directions radicales » écartée. → voir section « Redesign 2026-06 ». _(proposé)_ |
| 2026-06-21 | Décompo prix → composant signature « Reçu » | En-tête navy + dotted leaders + total DM Mono + sceau séquestre vert. Répété carrousel / fiche produit / `/choose`. Renforce l'USP transparence partout. _(proposé)_ |
| 2026-06-21 | Carrousel `/browse` = 1ʳᵉ visite seulement | Masqué après le 1ᵉʳ passage via flag localStorage `hasSeenIntro` ; la recherche/entonnoir prend la tête ensuite. Demande owner. _(proposé)_ |
| 2026-06-21 | Back-office = shell desktop dense ; rider mobile | Sidebar navy contextualisée par rôle + tables denses pour vendeur/admin/flotte. Rider reste terrain (mobile). Choix owner « desktop dense ». _(proposé)_ |
</content>
</invoke>
