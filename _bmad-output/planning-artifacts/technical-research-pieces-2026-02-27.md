# Recherche Technique -- Pieces Marketplace

**Projet :** Pieces -- Marketplace de pieces detachees automobiles (neuves & occasion) en Cote d'Ivoire
**Date :** 2026-02-27
**Version :** 1.0

---

## Table des Matieres

1. [IA de Reconnaissance de Pieces Automobiles](#1-ia-de-reconnaissance-de-pieces-automobiles)
2. [Architecture PWA](#2-architecture-pwa)
3. [WhatsApp Business API](#3-whatsapp-business-api)
4. [Solutions de Paiement Mobile en CI](#4-solutions-de-paiement-mobile-en-ci)
5. [Stack Technique Recommande](#5-stack-technique-recommande)
6. [Logistique et Tracking](#6-logistique-et-tracking)
7. [Scalabilite et Securite](#7-scalabilite-et-securite)
8. [Synthese et Recommandations Finales](#8-synthese-et-recommandations-finales)

---

## 1. IA de Reconnaissance de Pieces Automobiles

### 1.1 Etat de l'Art en Computer Vision pour Pieces Auto

La reconnaissance visuelle de pieces automobiles est un domaine en pleine maturation. Les approches actuelles reposent sur plusieurs architectures de deep learning :

**Architectures dominantes (2025-2026) :**

| Architecture | Description | Precision typique | Cas d'usage |
|---|---|---|---|
| **Vision Transformers (ViT)** | Modeles base sur l'attention, pre-entraines sur de grands corpus d'images | 85-95% (top-5) | Classification de pieces |
| **YOLO v8/v9** | Detection d'objets en temps reel | 80-92% mAP | Detection multi-pieces sur une image |
| **EfficientNet v2** | CNN optimise pour le rapport precision/calcul | 82-90% | Classification sur mobile |
| **CLIP (OpenAI)** | Modele multimodal texte-image | 75-88% zero-shot | Recherche par description textuelle |
| **DINOv2 (Meta)** | Vision foundation model, auto-supervise | 88-94% apres fine-tuning | Similarite visuelle entre pieces |
| **Florence-2 (Microsoft)** | Modele vision-langage polyvalent | 85-92% | Description + classification combinees |

**Tendance cle :** Les **Vision-Language Models (VLM)** comme GPT-4o Vision, Claude Vision (Anthropic), et Gemini Pro Vision permettent desormais une identification "zero-shot" de pieces auto avec une precision raisonnable (70-80%) sans entrainement specifique. Pour Pieces, cela permet un **MVP rapide** avant de fine-tuner un modele specialise.

### 1.2 APIs et Services Existants

#### Services generiques de vision par ordinateur

| Service | Points forts | Limites pour Pieces | Prix (estimation) |
|---|---|---|---|
| **Google Cloud Vision API** | Labels, detection d'objets, OCR, recherche similaire | Pas specialise auto, labels generiques ("metal part", "engine") | 1,50 $/1000 images (label detection) |
| **AWS Rekognition** | Custom Labels permet fine-tuning, detection d'objets | Necessite entrainement custom, latence reseau depuis CI | 1,00 $/1000 images (label detection), Custom Labels a 4 $/heure d'entrainement |
| **Azure Computer Vision (v4)** | Florence foundation model, tres precis, OCR excellent | Cout eleve pour volume, pas specialise auto | 1,00 $/1000 transactions (analyse image) |
| **Clarifai** | Marketplace de modeles pre-entraines, custom training facile | Communaute plus petite, moins de modeles auto | Plan gratuit 1000 ops/mois, puis 1,20 $/1000 |
| **Roboflow** | Plateforme complete : annotation, entrainement, deploiement | Necessite de creer son propre dataset | Gratuit (public), 249 $/mois (business) |

#### APIs specialisees automobile

| Service | Specialite | Integration | Prix |
|---|---|---|---|
| **Partium** | Reconnaissance de pieces industrielles et auto, recherche visuelle | API REST, SDK mobile | Sur devis (enterprise), estime 0,05-0,20 EUR/requete |
| **Tractable** | Estimation dommages auto par IA (assurance) | API pour assureurs | Enterprise uniquement |
| **Anyline** | OCR specialise (VIN, plaques, compteurs) | SDK mobile iOS/Android | Sur devis |
| **Google Lens / Visual Search** | Recherche visuelle grand public | Pas d'API directe exploitable | N/A |

#### APIs de modeles multimodaux (LLM Vision)

| Service | Capacite | Prix | Recommandation |
|---|---|---|---|
| **OpenAI GPT-4o** | Identification de pieces par photo avec description textuelle precise | 2,50 $/1M tokens input (image), 10 $/1M output | Excellent pour MVP, ~0,01 $/image |
| **Anthropic Claude Sonnet** | Analyse d'image detaillee, bon raisonnement contextuel | 3 $/1M tokens input, 15 $/1M output | Bon pour validation croisee |
| **Google Gemini 2.0 Flash** | Rapide, multimodal, bon rapport qualite/prix | 0,10 $/1M tokens input, 0,40 $/1M output | Le plus economique pour volume |
| **Google Gemini 2.5 Pro** | Tres precis, raisonnement avance | 1,25 $/1M tokens input, 10 $/1M output | Pour cas complexes |

**Recommandation pour le MVP :** Utiliser **Gemini 2.0 Flash** pour l'identification initiale (cout tres bas, ~0,001 $/image) avec fallback sur **GPT-4o** pour les cas ambigus. Cette approche en cascade optimise cout et precision.

### 1.3 Datasets Disponibles

#### Datasets publics

| Dataset | Taille | Contenu | Licence |
|---|---|---|---|
| **Stanford Cars Dataset** | 16 185 images | 196 classes de vehicules (pas de pieces) | Recherche |
| **CompCars** | 136 726 images | Vehicules complets, vues multiples | Recherche |
| **PASCAL VOC / COCO** | 330K+ images | Categories generiques (dont "car") | Open |
| **Roboflow Universe - Auto Parts** | Varies (10K-50K par projet) | Projets communautaires de detection de pieces auto | Varies |
| **Kaggle Auto Parts** | Plusieurs datasets, 5K-30K images | Pieces isolees, categories limitees | Open |
| **iFixit** | 100K+ images | Guides de reparation avec photos de pieces | CC BY-NC-SA |

#### Datasets proprietaires / a construire

Pour Pieces, **aucun dataset public existant ne couvre adequatement le marche ivoirien** (pieces usagees, marques asiatiques type Changan, conditions d'eclairage terrain). Il faudra :

1. **Dataset synthetique initial :** Generer des images via des rendus 3D de pieces CAD (disponibles sur GrabCAD, Thingiverse) avec augmentation de donnees (rotation, eclairage, bruit)
2. **Dataset terrain :** Collecte systematique lors de l'onboarding des 10 premiers vendeurs (objectif : 500-1000 images par categorie de piece)
3. **Active learning :** Chaque photo envoyee par les utilisateurs (avec validation humaine) enrichit le dataset

**Estimation :** 10 000-20 000 images annotees necessaires pour un modele de classification fiable sur les 50 categories de pieces les plus courantes.

### 1.4 Approche Recommandee : Fine-tuning vs From Scratch

| Approche | Avantages | Inconvenients | Cout estime |
|---|---|---|---|
| **Zero-shot VLM (MVP)** | Deploiement immediat, pas de dataset requis, precision acceptable | Cout par requete eleve a l'echelle, pas de controle fin | 0-500 $/mois pour les premiers 50K requetes |
| **Fine-tuning modele existant** | Meilleure precision (+10-15%), controle du modele, cout inference reduit | Necessite 10K+ images annotees, 2-4 semaines de travail | 2 000-5 000 $ (GPU cloud) + temps annotation |
| **From scratch** | Controle total, optimisation maximale | 6-12 mois, equipe ML dediee, 100K+ images necessaires | 50 000-200 000 $ |

**Strategie recommandee en 3 phases :**

```
Phase 1 (MVP, Mois 1-3)
  └─ VLM zero-shot (Gemini Flash / GPT-4o)
  └─ Prompt engineering specialise pieces auto
  └─ Precision attendue : 70-80% (top-3)
  └─ Fallback : intervention humaine via WhatsApp

Phase 2 (Post-lancement, Mois 4-8)
  └─ Fine-tuning EfficientNet v2 ou ViT sur dataset collecte
  └─ 15 000+ images du terrain ivoirien
  └─ Precision attendue : 85-90% (top-3)
  └─ Modele embarque sur edge (TensorFlow Lite)

Phase 3 (Scale, Mois 9+)
  └─ Modele hybride : classification locale + VLM pour cas ambigus
  └─ CLIP fine-tune pour recherche visuelle dans le catalogue
  └─ Precision attendue : 90-95% (top-5)
```

### 1.5 Precision Attendue et Limitations

**Facteurs de complexite specifiques au marche ivoirien :**

- **Pieces usagees :** Corrosion, deformation, graisse rendent l'identification plus difficile
- **Eclairage terrain :** Photos prises en atelier, parfois sombres ou surexposees
- **Pieces generiques :** Beaucoup de pieces "no-brand" ou copies sans marquage
- **Qualite camera :** Appareils Android bas de gamme (2-5 MP camera frontale)
- **Marques chinoises :** Changan, BYD, JAC ont moins de references visuelles dans les datasets

**Precision realiste estimee :**

| Scenario | Top-1 | Top-3 | Top-5 |
|---|---|---|---|
| Phase 1 (VLM zero-shot) | 45-55% | 65-75% | 75-85% |
| Phase 2 (Fine-tune) | 65-75% | 80-88% | 88-93% |
| Phase 3 (Hybride) | 75-85% | 88-93% | 92-96% |

**Strategie de mitigation :** Toujours presenter les resultats en **top-3 ou top-5** avec images de reference. L'utilisateur selectionne la bonne piece parmi les propositions. Un bouton "Aucune de ces pieces" declenche une assistance humaine.

### 1.6 Solutions Existantes de Reconnaissance de Pieces

| Solution | Description | Marche | Technologie |
|---|---|---|---|
| **Partium** (Allemagne) | Recherche visuelle de pieces industrielles et auto | Europe, B2B | IA proprietaire, API REST |
| **PartsPal** (divers) | Identification de pieces auto par photo | USA/Global | Computer vision + catalogue OEM |
| **Anyline** (Autriche) | Scan VIN, plaques, lecture de references | Global | OCR mobile |
| **Tractable** (UK) | Estimation dommages vehicule post-accident | Assurance | Deep learning |
| **Autodata / TecDoc** | Base de donnees de references croisees pieces auto | Global OEM | Catalogue + API, pas d'IA visuelle |
| **PartsAvatar** (Canada) | E-commerce pieces avec recherche visuelle | Amerique du Nord | IA proprietary |
| **CCC Intelligent Solutions** (USA) | IA pour reparation auto et estimation | USA, assurance | ML + base de donnees OEM |

**Note importante :** Aucune solution existante ne cible le marche africain ou les pieces d'occasion importees. C'est un avantage competitif pour Pieces -- il n'y a pas de concurrent direct en IA de reconnaissance de pieces dans ce contexte.

---

## 2. Architecture PWA

### 2.1 Meilleures Pratiques PWA pour Marches Africains

Le marche ivoirien presente des contraintes specifiques qui orientent fortement l'architecture :

**Contraintes terrain :**
- **Connectivite :** 3G predominant (65-70% du trafic mobile), 4G en croissance a Abidjan (~30%), coupures frequentes
- **Bande passante :** 0,5-2 Mbps en moyenne, pics a 5-10 Mbps en 4G
- **Appareils :** 80%+ Android, majorite de smartphones a 30 000-80 000 FCFA (50-130 EUR), 2-4 Go RAM, 16-32 Go stockage
- **Cout data :** ~500 FCFA/Go chez Orange CI, ~300 FCFA/Go chez MTN -- chaque Mo compte
- **Navigateur :** Chrome domine (85%+), suivi de Samsung Internet et Opera Mini

**Principes architecturaux :**

1. **Offline-First :** L'application doit etre fonctionnelle sans connexion pour les actions de consultation
2. **Low-Data Mode :** Images compressees, lazy loading agressif, pas de video auto-play
3. **Sub-3s First Load :** Budget performance < 200 Ko pour le premier chargement HTML+CSS+JS critique
4. **App Shell Architecture :** Interface de base cachee localement, seul le contenu dynamique est telecharge
5. **Background Sync :** Les actions offline (ajout panier, commande) sont synchronisees des que la connexion revient

### 2.2 Frameworks Recommandes

| Framework | Score PWA | SSR/SSG | Taille bundle | Ecosysteme | Recommandation |
|---|---|---|---|---|---|
| **Next.js 15** (React) | Excellent | SSR + SSG + ISR | ~85 Ko (gzipped, base) | Enorme, Vercel natif | **Recommande** -- ecosysteme riche, SSR crucial pour SEO et performance |
| **Nuxt 3** (Vue) | Excellent | SSR + SSG + ISR | ~55 Ko (gzipped, base) | Bon, communaute active | **Alternative solide** -- plus leger que Next.js, Vue plus simple a apprendre |
| **SvelteKit** (Svelte) | Excellent | SSR + SSG | ~15-25 Ko (gzipped, base) | Plus petit mais en croissance | **Meilleur pour performance** -- bundle minimal, ideal pour bas de gamme |
| **Remix** (React) | Bon | SSR natif | ~70 Ko (gzipped, base) | En croissance | Bon pour formulaires complexes |
| **Astro** | Bon | SSG + Islands | ~0 Ko JS par defaut | En croissance rapide | Ideal pour pages statiques (catalogue) |

**Recommandation principale : Next.js 15 (App Router)**

Justification :
- **Server Components :** Reduisent drastiquement le JS envoye au client
- **Image Optimization :** Le composant `<Image>` de Next.js optimise automatiquement les images (WebP, AVIF, responsive)
- **ISR (Incremental Static Regeneration) :** Les pages catalogue sont pre-generees et mises a jour incrementalement
- **API Routes :** Backend leger integre pour les endpoints simples
- **Deploiement Vercel/Cloudflare :** Edge functions proches de l'Afrique
- **Ecosysteme React :** Recrutement plus facile, plus de bibliotheques disponibles

**Alternative preferee si performance critique : SvelteKit**
- Bundle 3-5x plus petit que React
- Compilation -- pas de Virtual DOM
- Ideal pour les appareils a 2 Go de RAM

### 2.3 Performance sur Appareils Android Bas de Gamme

**Benchmark de reference :** Samsung Galaxy A03 (2 Go RAM, Mediatek MT6739, 30 000 FCFA)

| Metrique | Cible | Comment l'atteindre |
|---|---|---|
| **First Contentful Paint** | < 1,5s (3G) | App Shell cache, CSS critique inline, pas de render-blocking JS |
| **Largest Contentful Paint** | < 2,5s (3G) | Images optimisees (WebP, < 50 Ko), lazy loading |
| **Time to Interactive** | < 3,5s (3G) | Code splitting agressif, tree shaking, prefetch predictif |
| **Cumulative Layout Shift** | < 0,1 | Dimensions d'images reservees, font-display: swap |
| **Total Transfer Size** | < 500 Ko | Premier chargement, hors cache |
| **JS Bundle (initial)** | < 150 Ko (gzipped) | Code splitting par route, dynamic imports |

**Strategies specifiques :**

```
1. Images adaptatives :
   - Thumbnails catalogue : 100x100, WebP, < 5 Ko
   - Images produit : 400x400, WebP, < 30 Ko
   - Plein ecran : 800x800, WebP, < 80 Ko
   - Utiliser <picture> avec srcset pour servir la bonne taille

2. Compression :
   - Brotli en priorite (navigateurs modernes)
   - Gzip en fallback
   - Compression cote CDN (Cloudflare auto)

3. Prefetching intelligent :
   - Prefetch des pages probables (ex: resultats apres recherche)
   - Pas de prefetch sur connexion lente (navigator.connection.effectiveType)

4. Skeleton screens :
   - Afficher la structure de la page immediatement
   - Remplir avec les donnees au fur et a mesure
```

### 2.4 Strategie de Cache et Mode Offline

**Architecture de cache a 3 niveaux :**

```
Niveau 1 : Cache statique (Service Worker - Cache First)
├── App Shell (HTML, CSS, JS de base)
├── Polices (subset latin + caracteres francais)
├── Icones et logos
├── Pages critiques pre-cachees (accueil, recherche, profil)
└── Duree : indefinie (versionnee par build hash)

Niveau 2 : Cache dynamique (Service Worker - Stale While Revalidate)
├── Resultats de recherche recents
├── Fiches produit consultees
├── Images produit (LRU cache, max 100 Mo)
├── Profil vehicule de l'utilisateur
└── Duree : 24h, revalidation en arriere-plan

Niveau 3 : Donnees offline (IndexedDB via idb ou Dexie.js)
├── Panier en cours
├── Commandes en attente de sync
├── Historique de recherche
├── Vehicules sauvegardes
├── Messages en attente (file d'attente offline)
└── Duree : persistante, sync au retour de connexion
```

**Bibliotheque recommandee :** **Workbox** (Google) pour la gestion des Service Workers -- simplifie enormement les strategies de cache.

**Gestion offline des actions critiques :**

```javascript
// Pseudo-code : Background Sync pour commandes offline
// Utilise Background Sync API + Workbox

registerRoute(
  '/api/orders',
  new NetworkOnly({
    plugins: [new BackgroundSyncPlugin('orderQueue', {
      maxRetentionTime: 24 * 60 // Retry pendant 24h
    })]
  }),
  'POST'
);
```

### 2.5 Service Workers -- Configuration Detaillee

**Fichier sw.js -- Strategie recommandee :**

| Ressource | Strategie | Justification |
|---|---|---|
| App Shell (HTML) | Cache First, Network Fallback | Affichage instantane |
| CSS/JS bundles | Cache First (versionnee) | Immutable apres build |
| API catalogue | Stale While Revalidate | Donnees fraiches, fallback cache |
| API recherche | Network First, Cache Fallback | Priorite aux resultats frais |
| Images produit | Cache First, expiration 7j | Economie de bande passante |
| API commandes | Network Only + Background Sync | Coherence transactionnelle |

**Fonctionnalites offline prioritaires pour Pieces :**

1. **Consultation du catalogue :** Les dernieres pages visitees sont disponibles offline
2. **Recherche dans le cache :** Recherche locale parmi les produits deja consultes
3. **Panier persistant :** Le panier est conserve en IndexedDB
4. **File d'attente de commandes :** La commande est enregistree offline et envoyee au retour de la connexion
5. **Notification de statut :** Bandeau "Vous etes hors ligne -- les actions seront synchronisees automatiquement"

**Push Notifications :**
- Utiliser l'API Web Push avec le serveur de push Firebase Cloud Messaging (FCM)
- Notifications pour : livraison en cours, piece disponible, prix baisse, reponse vendeur
- Obtenir la permission de maniere contextuelle (pas au premier chargement)

---

## 3. WhatsApp Business API

### 3.1 WhatsApp Business Platform / Cloud API

WhatsApp propose deux modes d'acces a son API Business :

| Aspect | Cloud API (Meta-hebergee) | On-Premises API |
|---|---|---|
| **Hebergement** | Serveurs Meta | Propres serveurs |
| **Setup** | Minutes (via Meta Business Suite) | Jours/semaines |
| **Cout infra** | 0 $ | Serveur dedie requis |
| **Limites** | Standard Meta | Plus flexibles |
| **Recommandation** | **Oui -- pour Pieces** | Non pour un MVP |

**Recommandation :** Utiliser la **Cloud API** via un BSP (Business Solution Provider) pour simplifier l'integration.

### 3.2 Capacites de la Plateforme

#### Types de messages disponibles

| Type | Description | Cas d'usage Pieces |
|---|---|---|
| **Text** | Message texte simple | Notifications, confirmations |
| **Image** | Image + legende | Resultats de recherche pieces, photos produit |
| **Document** | PDF, factures | Factures, recus de commande |
| **Video** | Video courte | Guides d'installation |
| **Location** | Coordonnees GPS | Position du livreur |
| **Contact** | Fiche contact | Coordonnees vendeur |
| **Interactive - Buttons** | Jusqu'a 3 boutons (reply buttons) | "Commander / Voir plus / Autre piece" |
| **Interactive - List** | Menu deroulant jusqu'a 10 items | Liste de pieces trouvees |
| **Interactive - CTA** | Bouton URL ou telephone | "Voir sur Pieces" (lien PWA) |
| **Product / Catalog** | Produits WhatsApp Commerce | Catalogue pieces dans WhatsApp |
| **Flows** | Formulaires interactifs | Enregistrement vehicule, commande |
| **Template** | Messages pre-approuves | Notifications proactives |

#### WhatsApp Flows (essentiel pour Pieces)

WhatsApp Flows permet de creer des formulaires interactifs directement dans WhatsApp :

- **Cas d'usage Pieces :**
  - Formulaire d'inscription vehicule (marque > modele > annee)
  - Formulaire de commande (quantite, adresse, mode paiement)
  - Feedback post-livraison (note, commentaire)
  - Inscription nouveau vendeur

- **Limites :**
  - Maximum 10 ecrans par Flow
  - Types d'input : texte, nombre, date, dropdown, checkbox, radio
  - Pas d'upload de fichier dans un Flow (mais possible hors Flow)
  - Validation cote serveur via endpoint webhook

### 3.3 Pricing WhatsApp Business API

**Modele de tarification (en vigueur depuis 2025) :**

WhatsApp a simplifie son pricing en 2025. Le modele actuel :

| Categorie de conversation | Description | Cout estime (Afrique, hors Nigeria) |
|---|---|---|
| **Utility** | Notifications transactionnelles (confirmation commande, suivi livraison) | ~0,008 $ / conversation |
| **Authentication** | OTP, verification | ~0,009 $ / conversation |
| **Marketing** | Messages promotionnels, offres | ~0,023 $ / conversation |
| **Service** | Reponse a un message initie par l'utilisateur | **Gratuit** (1000 conversations/mois) puis ~0,005 $ |

**Points cles :**

- Une **conversation** = fenetre de 24h depuis le premier message
- Les **conversations initiees par l'utilisateur** (service) ont un quota gratuit de **1000/mois**
- Les **messages interactifs** (boutons, listes, flows) ne coutent pas plus cher
- Les **medias** (images, documents) sont inclus dans le cout de la conversation
- **Pas de cout par message individuel** dans une conversation ouverte

**Estimation de cout mensuel pour Pieces :**

| Scenario | Volume | Cout estime |
|---|---|---|
| Lancement (100 utilisateurs actifs) | ~500 conversations service + 200 utility + 100 marketing | ~15-25 $/mois |
| Croissance (1000 utilisateurs actifs) | ~5000 service + 2000 utility + 1000 marketing | ~80-130 $/mois |
| Scale (10 000 utilisateurs actifs) | ~50 000 service + 20 000 utility + 10 000 marketing | ~650-900 $/mois |

### 3.4 Limitations Importantes

| Limitation | Detail | Mitigation |
|---|---|---|
| **Rate limits** | 80 messages/seconde (Cloud API), extensible sur demande | File d'attente cote serveur (Redis/BullMQ) |
| **Templates** | Doivent etre approuves par Meta (24-48h) | Soumettre les templates en avance, avoir des alternatives |
| **Fenetre 24h** | Impossible d'envoyer hors template apres 24h sans message client | Utiliser des templates utility pour re-engager |
| **Catalogue** | Max 500 produits dans le catalogue WhatsApp | Pas de probleme pour le debut, utiliser la PWA pour le catalogue complet |
| **Qualite** | Score de qualite du numero (affecte delivrabilite) | Eviter le spam, cibler les messages marketing |
| **Media** | Images max 5 Mo, documents max 100 Mo | Compresser les images avant envoi |
| **Un seul numero** | Un numero WhatsApp = un compte Business API | Possibilite d'ajouter des numeros supplementaires |

### 3.5 Integration Chatbot / IA

**Architecture recommandee pour le bot WhatsApp Pieces :**

```
Utilisateur WhatsApp
        │
        ▼
  [Webhook Meta Cloud API]
        │
        ▼
  [Serveur Backend Pieces]
        │
        ├─── Message texte ──── [NLP / Intent Detection]
        │                              │
        │                    ┌─────────┼─────────┐
        │                    ▼         ▼         ▼
        │               Recherche   Commande   Support
        │                piece      suivi     humain
        │
        ├─── Image ────────── [IA Vision]
        │                        │
        │                   Identification
        │                   piece auto
        │                        │
        │                   Resultats avec
        │                   boutons interactifs
        │
        └─── Location ─────── [Tracking livraison]
```

**Stack NLP/Chatbot recommande :**

- **Dialogflow CX** (Google) : NLU robuste, integration WhatsApp native, support francais
- **Alternative :** Rasa Open Source (auto-heberge, plus de controle, gratuit) ou BotPress (open source, interface visuelle)
- **LLM pour conversations complexes :** GPT-4o ou Claude via API pour les questions hors script

### 3.6 Providers Tiers (BSP)

| Provider | Avantages | Inconvenients | Prix |
|---|---|---|---|
| **Meta Cloud API (direct)** | Gratuit (hors conversations), controle total | Integration technique a faire soi-meme | Pas de surcout BSP |
| **Twilio** | Ecosysteme complet (SMS, Voice, WhatsApp), documentation excellente | Majoration ~30-50% sur les couts Meta, support US-centrique | 0,005 $/msg + cout Meta |
| **360dialog** | BSP officiel WhatsApp, pas de majoration, interface simple | Moins de features que Twilio | 0 $ de majoration, abonnement 49 EUR/mois |
| **Bird (ex-MessageBird)** | Multi-canal (WhatsApp, SMS, Email), Flow Builder visuel | Interface parfois complexe | 0,005 $/msg + cout Meta |
| **Infobip** | Presente en Afrique, support local | Pricing opaque | Sur devis |
| **Gupshup** | Specialise chatbot WhatsApp, auto-opt-in | Moins connu en Afrique | 0,001 $/msg + cout Meta |
| **WATI** | Interface no-code pour WhatsApp Business, CRM integre | Limites technique pour integ custom | A partir de 49 $/mois |

**Recommandation :**

- **MVP :** **360dialog** -- pas de majoration sur les couts Meta, interface simple, BSP officiel
- **Scale :** **Meta Cloud API directe** + infrastructure propre -- elimine toute dependance BSP
- **Alternative economique :** **Gupshup** pour le chatbot, cout tres bas par message

### 3.7 WhatsApp Flows -- Detail Technique

WhatsApp Flows est particulierement pertinent pour Pieces :

**Flow 1 : Enregistrement vehicule**
```
Ecran 1 : Marque (dropdown : Toyota, Mazda, Kia, Nissan, etc.)
Ecran 2 : Modele (filtre dynamique selon marque)
Ecran 3 : Annee (dropdown 1990-2026)
Ecran 4 : Motorisation (optionnel)
Ecran 5 : Confirmation + photo vehicule (optionnel)
```

**Flow 2 : Commande rapide**
```
Ecran 1 : Recapitulatif piece (image + prix + vendeur)
Ecran 2 : Adresse de livraison (texte libre ou GPS)
Ecran 3 : Mode de paiement (Orange Money / MTN MoMo / Wave / Cash)
Ecran 4 : Confirmation finale
```

**Implementation :** Les Flows sont definis en JSON et envoyes au serveur Meta. Le backend recoit les reponses via webhook et peut declencher des actions (creation commande, etc.).

---

## 4. Solutions de Paiement Mobile en CI

### 4.1 Paysage du Mobile Money en Cote d'Ivoire

La Cote d'Ivoire est l'un des marches mobile money les plus dynamiques d'Afrique de l'Ouest :

- **Taux de penetration mobile money :** ~85% des adultes
- **Operateurs principaux :** Orange Money (~50% PDM), MTN MoMo (~30%), Wave (~15% et en forte croissance), Moov Money (~5%)
- **Volume transactions :** Plus de 50 milliards FCFA/jour (toutes plateformes confondues)

### 4.2 APIs des Operateurs

#### Orange Money API (Orange CI)

| Aspect | Detail |
|---|---|
| **Type d'API** | REST API (Orange Money Web Payment) |
| **Fonctionnalites** | Paiement marchand, transferts, solde |
| **Sandbox** | Oui, environnement de test disponible |
| **Frais** | 1-3% selon volume et negociation |
| **Documentation** | developer.orange.com |
| **Delai d'integration** | 2-4 semaines (validation KYC marchande requise) |
| **Particularite** | Necessite un compte marchand Orange CI |

#### MTN MoMo API (via MTN Open API)

| Aspect | Detail |
|---|---|
| **Type d'API** | REST API (MoMo Open API) |
| **Fonctionnalites** | Collections (paiement entrant), Disbursements (paiement sortant), Remittances |
| **Sandbox** | Oui, sandbox.momodeveloper.mtn.com |
| **Frais** | 1-2% selon volume |
| **Documentation** | momodeveloper.mtn.com |
| **Delai d'integration** | 2-3 semaines |
| **Particularite** | API unifiee pour tous les pays MTN |

#### Wave API

| Aspect | Detail |
|---|---|
| **Type d'API** | REST API (Wave Business API) |
| **Fonctionnalites** | Paiement marchand, transferts business |
| **Sandbox** | Limite, acces sur demande |
| **Frais** | 1% fixe (Wave est tres competitif) |
| **Documentation** | Acces sur demande (partenariat) |
| **Delai d'integration** | 3-6 semaines (processus de validation plus long) |
| **Particularite** | Frais les plus bas du marche, croissance tres rapide en CI |

### 4.3 Agregateurs de Paiement

Les agregateurs permettent d'integrer tous les moyens de paiement via une seule API :

| Agregateur | Moyens de paiement CI | Frais | Points forts | Points faibles |
|---|---|---|---|---|
| **CinetPay** | Orange Money, MTN MoMo, Wave, Moov, Visa/MC | 2-3,5% + 100 FCFA | **Leader en CI**, integration rapide, SDK multi-plateforme, support local | Frais un peu eleves |
| **FedaPay** | Orange Money, MTN MoMo, Wave, Moov | 1,5-3% | Moins cher que CinetPay, API propre | Moins de documentation, plus petit |
| **PayDunya** | Orange Money, MTN MoMo, Wave, Visa/MC | 2-3,5% | Multi-pays UEMOA, bon SDK | Service client variable |
| **Flutterwave** | Orange Money, MTN MoMo, Visa/MC | 1,4% local + 3,8% intl | Enorme (pan-africain), multi-devises, dashboard avance | Moins specialise CI, support loin |
| **Paystack** (Stripe) | Visa/MC, mobile money limite en CI | 1,5% local + 3,9% intl | Excellent produit, backend de Stripe | Couverture mobile money limitee en CI |
| **NotchPay** | Orange Money, MTN MoMo, Wave | 1,5-2,5% | Startup agile, API moderne, pricing transparent | Plus jeune, moins de track record |

**Recommandation :**

```
MVP :          CinetPay (leader CI, tous les moyens de paiement, integration rapide)
Alternative :  FedaPay (moins cher, API propre)
Scale :        CinetPay + Flutterwave (redondance, paiements internationaux)
```

### 4.4 Integration Escrow / Sequestre

L'escrow est critique pour Pieces (F12 -- Paiement Garanti Vendeur) :

**Option 1 : Escrow interne via CinetPay**
- CinetPay offre la fonctionnalite **"Marketplace"** / Split Payment
- L'acheteur paie CinetPay, le montant est retenu, et libere au vendeur apres confirmation de livraison
- Commission CinetPay prelevee a la liberation
- **Implementation :** API `/v2/payment/marketplace` avec parametres de split

**Option 2 : Escrow custom (propre a Pieces)**
```
Flux :
1. Acheteur paie → fonds credites sur compte marchand Pieces (CinetPay)
2. Commande en statut "Payee, en attente de livraison"
3. Livraison confirmee (livreur + acheteur)
4. Backend Pieces declenche transfert vers vendeur via API CinetPay Disbursement
5. Commission Pieces retenue au passage

Avantages :
- Controle total du timing de liberation
- Gestion des litiges (remboursement partiel, annulation)
- Historique complet des transactions

Inconvenients :
- Necessite licence de paiement ou partenariat regulateur
- Fonds immobilises sur le compte Pieces (tresorerie)
- Responsabilite legale accrue
```

**Option 3 : Partenariat avec un etablissement financier local**
- Partenariat avec une banque (ex: Societe Generale CI, Ecobank) ou fintech (Djamo)
- Le compte escrow est detenu par la banque
- Pieces envoie les instructions de liberation
- **Avantage :** Conformite reglementaire garantie
- **Inconvenient :** Processus de mise en place long (2-3 mois)

**Recommandation :** Commencer avec **CinetPay Marketplace (split payment)** pour le MVP, puis migrer vers un **escrow bancaire** quand les volumes le justifient.

### 4.5 Cash on Delivery (COD) -- Gestion Technique

Le COD est indispensable en CI (majorite des transactions e-commerce) :

**Architecture COD :**

```
1. Commande placee (statut : "En attente de livraison COD")
2. Piece preparee par le vendeur
3. Coursier recupere la piece
4. Coursier livre et collecte le paiement (cash ou mobile money sur place)
5. Confirmation via app coursier (photo du recu ou code de confirmation)
6. Fonds reverses au vendeur (moins commission Pieces + frais livraison)
```

**Gestion technique du COD :**

| Aspect | Solution |
|---|---|
| **Confirmation de livraison** | Code OTP a 4 chiffres communique a l'acheteur, saisi par le coursier |
| **Collecte cash par coursier** | Montant exact affiche dans l'app coursier, reconciliation quotidienne |
| **Plafond COD** | Limiter a 50 000-75 000 FCFA (au-dela, exiger un prepaiement) |
| **Risque de fraude coursier** | GPS tracking + confirmation bilaterale (acheteur + coursier) |
| **Risque de refus** | Frais d'annulation (1000-2000 FCFA) apres preparation, historique client |
| **Reconciliation** | Dashboard temps reel des sommes collectees par coursier, depot quotidien |

---

## 5. Stack Technique Recommande

### 5.1 Vue d'Ensemble de l'Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                             │
│                                                          │
│   ┌──────────┐   ┌──────────────┐   ┌───────────────┐  │
│   │   PWA    │   │ WhatsApp Bot │   │ App Coursier  │  │
│   │ Next.js  │   │  (Webhook)   │   │   (React      │  │
│   │   15     │   │              │   │    Native /   │  │
│   │          │   │              │   │    Expo)      │  │
│   └────┬─────┘   └──────┬───────┘   └──────┬────────┘  │
│        │                │                    │           │
└────────┼────────────────┼────────────────────┼───────────┘
         │                │                    │
         ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                           │
│              (Cloudflare / Kong / Traefik)               │
└─────────────────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│   Backend    │ │  Service IA  │ │  Service         │
│   Principal  │ │  Vision      │ │  Notifications   │
│              │ │              │ │                   │
│  Node.js /  │ │  Python /    │ │  Node.js /       │
│  Fastify    │ │  FastAPI     │ │  BullMQ          │
│              │ │              │ │                   │
│  - Auth     │ │  - Image     │ │  - WhatsApp      │
│  - Catalogue│ │    analysis  │ │  - Push notif    │
│  - Commandes│ │  - VLM API   │ │  - SMS OTP       │
│  - Paiement │ │  - Modele    │ │  - Email         │
│  - Users    │ │    local     │ │                   │
└──────┬───────┘ └──────┬───────┘ └──────────────────┘
       │                │
       ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    DONNEES                                │
│                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ PostgreSQL │ │  Redis     │ │   Meilisearch      │   │
│  │ (principal)│ │ (cache,    │ │   (recherche       │   │
│  │            │ │  sessions, │ │    catalogue)      │   │
│  │            │ │  queues)   │ │                    │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│                                                          │
│  ┌────────────┐ ┌────────────────────────────────────┐   │
│  │ S3 / R2   │ │   Cloudflare CDN                    │   │
│  │ (images)  │ │   (assets, images optimisees)       │   │
│  └────────────┘ └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Backend

| Option | Avantages | Inconvenients | Recommandation |
|---|---|---|---|
| **Node.js + Fastify** | Performant, ecosysteme NPM enorme, TypeScript natif, meme langage front/back | Single-threaded (mitigable avec clustering), moins bon pour CPU-intensive | **Recommande pour le backend principal** |
| **Node.js + Express** | Tres populaire, enorme communaute | Plus lent que Fastify, middleware lourd | Alternative si equipe connait Express |
| **Node.js + NestJS** | Architecture structuree (modules, DI), TypeScript first | Courbe d'apprentissage, overhead | Bon pour equipe plus grande |
| **Python + FastAPI** | Excellent pour IA/ML, async natif, documentation auto (OpenAPI) | Ecosysteme web moins riche que Node, deploiement Python plus complexe | **Recommande pour le service IA** |
| **Go** | Ultra-performant, binaire unique, faible empreinte memoire | Ecosysteme plus petit, courbe d'apprentissage | Excellent pour microservices specifiques (tracking temps reel) |
| **Elixir/Phoenix** | Concurrence massive (WebSockets), tolerant aux pannes | Recrutement difficile, ecosysteme petit | Overkill pour le MVP |

**Recommandation :**

```
Backend principal :  Node.js + Fastify + TypeScript
                     → API REST + WebSocket pour temps reel
                     → ORM : Prisma (type-safe, migrations, excellent DX)
                     → Validation : Zod (schemas partages avec le frontend)

Service IA :         Python + FastAPI
                     → Integration OpenAI/Gemini/Claude APIs
                     → Inference locale future avec PyTorch/ONNX
                     → Traitement d'images avec Pillow/OpenCV

Queue / Workers :    BullMQ (Redis)
                     → Traitement async des images
                     → Envoi de notifications
                     → Synchronisation paiements
```

### 5.3 Base de Donnees

| Option | Avantages | Inconvenients | Verdict |
|---|---|---|---|
| **PostgreSQL** | Relationnel robuste, JSONB pour flexibilite, extensions (PostGIS pour geo), gratuit, ecosysteme mature | Scaling horizontal plus complexe | **Choix principal** |
| **MongoDB** | Schema flexible, scaling horizontal facile, bon pour catalogues varies | Pas de transactions fortes, jointures limitees, couts Atlas eleves | Pas necessaire si PostgreSQL bien utilise |
| **Hybride (PG + Mongo)** | Le meilleur des deux mondes | Complexite operationnelle doublee | Overkill pour le MVP |

**Recommandation : PostgreSQL uniquement**

Justification :
- **JSONB** permet la flexibilite schema-less quand necessaire (attributs de pieces variables)
- **PostGIS** pour les requetes geospatiales (livraison, proximite)
- **Full-text search** integre (en complement de Meilisearch)
- **Prisma** comme ORM offre un excellent DX avec PostgreSQL
- **Supabase** ou **Neon** pour le managed hosting (serverless PostgreSQL)

**Schema principal (simplifie) :**

```sql
-- Tables principales
users (id, phone, name, role, created_at)
vehicles (id, user_id, brand, model, year, engine)
parts (id, seller_id, name, category, brand_compat, price, condition, images[])
orders (id, buyer_id, seller_id, part_id, status, payment_method, amount)
deliveries (id, order_id, rider_id, status, pickup_location, delivery_location)
reviews (id, order_id, reviewer_id, rating, comment)
conversations (id, user_id, channel, messages JSONB[])
```

### 5.4 Moteur de Recherche

| Option | Latence | Facilite | Fonctionnalites | Hebergement | Prix |
|---|---|---|---|---|---|
| **Meilisearch** | < 50ms | Tres facile | Typo-tolerant, facettes, filtres, tri, geo-search | Self-hosted ou Meilisearch Cloud | Open source / Cloud a partir de 30 $/mois |
| **Typesense** | < 50ms | Facile | Similaire a Meilisearch, clustering integre | Self-hosted ou Typesense Cloud | Open source / Cloud a partir de 30 $/mois |
| **Elasticsearch** | < 100ms | Complexe | Tres puissant, aggregations avancees | Self-hosted ou Elastic Cloud | Lourd (2 Go+ RAM) / Cloud a partir de 95 $/mois |
| **Algolia** | < 20ms | Tres facile | SaaS, widgets UI, analytics | Cloud uniquement | 1 $/1000 requetes, peut couter cher a l'echelle |
| **PostgreSQL FTS** | < 200ms | Integre | Basique, pas de typo-tolerance native | Deja en place | Gratuit |

**Recommandation : Meilisearch**

Justification :
- **Typo-tolerant :** Crucial quand les utilisateurs ecrivent "filltre a uile" au lieu de "filtre a huile"
- **Instantane :** Resultats en < 50ms meme sur 100K+ documents
- **Facettes :** Filtres par marque, annee, condition (neuf/occasion), prix
- **Geo-search :** Trouver les vendeurs les plus proches
- **Leger :** Tourne sur 512 Mo de RAM pour < 100K documents
- **Open source :** Auto-heberge sans cout de licence
- **SDK JavaScript/Python :** Integration triviale

**Configuration recommandee pour le catalogue pieces :**

```json
{
  "searchableAttributes": ["name", "category", "brand_compat", "oem_reference"],
  "filterableAttributes": ["category", "brand_compat", "condition", "price", "seller_city"],
  "sortableAttributes": ["price", "created_at", "relevancy"],
  "typoTolerance": { "enabled": true, "minWordSizeForTypos": { "oneTypo": 4, "twoTypos": 8 } }
}
```

### 5.5 Stockage d'Images

| Option | CDN integre | Transformation | Prix | Recommandation |
|---|---|---|---|---|
| **Cloudflare R2** | Oui (Cloudflare CDN) | Via Workers | 0,015 $/Go/mois, **0 $ egress** | **Recommande** -- zero frais de sortie |
| **AWS S3 + CloudFront** | Oui (CloudFront) | Via Lambda@Edge | 0,023 $/Go/mois + egress | Standard mais couteux en egress |
| **Cloudinary** | Oui | Transformations avancees (resize, crop, format, AI) | 25 credits gratuits, puis ~89 $/mois | **Recommande pour transformations d'images** |
| **Imgix** | Oui | Transformations avancees | A partir de 100 $/mois | Cher mais tres puissant |
| **Supabase Storage** | Via Supabase CDN | Via fonctions Edge | 25 Go gratuit, puis 0,021 $/Go | Bon si deja sur Supabase |

**Recommandation :**

```
Stockage primaire :    Cloudflare R2 (zero egress, CDN mondial integre)
Transformations :      Cloudflare Images ou Workers (resize, WebP, AVIF)
Alternative premium :  Cloudinary (si budget permet, 89$/mois)
                       → Transformations a la volee (resize, compression, format)
                       → Upload widget pour vendeurs
                       → AI-based quality assessment
```

**Pipeline d'images pour Pieces :**

```
Upload vendeur (photo brute, 2-10 Mo)
    │
    ▼
[Cloudflare Worker / API Pieces]
    │
    ├── Compression (quality 80%, max 1 Mo)
    ├── Conversion WebP + AVIF
    ├── Generation de variantes :
    │     ├── thumbnail : 150x150
    │     ├── card :      400x300
    │     ├── detail :    800x600
    │     └── full :      1200x900
    ├── Stockage R2 (toutes variantes)
    ├── Envoi a l'IA pour identification (async)
    └── URL CDN retournee au client
```

### 5.6 Hebergement -- Options Adaptees au Marche Africain

**Critere principal : latence depuis Abidjan (Cote d'Ivoire)**

| Provider | Region la plus proche | Latence estimee depuis Abidjan | Prix (estimation MVP) |
|---|---|---|---|
| **Cloudflare Workers** | Edge mondial (+ de 300 PoP, dont Lagos, Johannesburg) | **< 30ms** (edge) | Workers gratuit jusqu'a 100K req/jour, puis 5 $/mois |
| **Vercel** | Edge mondial | **< 50ms** (edge) | Gratuit (hobby), Pro a 20 $/mois/membre |
| **AWS (eu-west-3 Paris)** | Paris, France | ~80-120ms | EC2 t3.medium ~30 $/mois |
| **AWS (af-south-1 Cape Town)** | Le Cap, Afrique du Sud | ~100-150ms | EC2 t3.medium ~35 $/mois |
| **Google Cloud (europe-west1)** | Belgique | ~80-120ms | e2-medium ~25 $/mois |
| **Hetzner** | Falkenstein/Helsinki | ~100-130ms | VPS 4 Go RAM ~5 EUR/mois |
| **DigitalOcean** | Amsterdam/London | ~80-120ms | Droplet 4 Go RAM ~24 $/mois |
| **Fly.io** | Amsterdam + peut deployer pres de l'Afrique | ~60-100ms | Machines a partir de 2 $/mois |
| **Railway** | US/EU | ~120-150ms | A partir de 5 $/mois |

**Recommandation d'hebergement :**

```
Frontend (PWA Next.js) :
    → Vercel (deployment automatique, edge CDN, image optimization)
    → Alternative : Cloudflare Pages

Backend API (Fastify) :
    → Fly.io (deploiement pres de l'Europe, pricing competitif)
    → Alternative : Railway ou Render pour la simplicite

Service IA (FastAPI) :
    → Fly.io ou Google Cloud Run (scaling auto, pay-per-use)
    → GPU optionnel futur : Lambda Labs ou Vast.ai

Base de donnees (PostgreSQL) :
    → Supabase (gratuit jusqu'a 500 Mo, managed, auth integree)
    → Alternative : Neon (serverless PostgreSQL, gratuit 0.5 Go)
    → Scale : AWS RDS ou PlanetScale

Redis :
    → Upstash (serverless, gratuit 10K commandes/jour)
    → Alternative : Redis Cloud (gratuit 30 Mo)

Meilisearch :
    → Meilisearch Cloud (a partir de 30 $/mois)
    → Alternative : Auto-heberge sur Fly.io/Hetzner

Stockage images :
    → Cloudflare R2 (zero egress)

CDN :
    → Cloudflare (gratuit, PoP en Afrique)
```

**Estimation du cout d'hebergement mensuel :**

| Phase | Composants | Cout estime |
|---|---|---|
| **MVP** (0-1000 users) | Vercel Pro + Fly.io + Supabase Free + Upstash Free + R2 | 30-80 $/mois |
| **Croissance** (1K-10K users) | Vercel Pro + Fly.io (2 machines) + Supabase Pro + Meilisearch Cloud + R2 | 150-300 $/mois |
| **Scale** (10K-100K users) | Vercel Enterprise + Fly.io (cluster) + Supabase Scale + Meilisearch + R2 | 500-1500 $/mois |

### 5.7 CI/CD et Infrastructure

**Pipeline CI/CD recommande :**

```
GitHub (repository)
    │
    ├── Push sur branche feature
    │       │
    │       ▼
    │   GitHub Actions :
    │       ├── Lint (ESLint + Prettier)
    │       ├── Type check (TypeScript)
    │       ├── Tests unitaires (Vitest)
    │       ├── Tests integration (Playwright)
    │       └── Build + Preview deploy (Vercel)
    │
    ├── Merge sur main
    │       │
    │       ▼
    │   GitHub Actions :
    │       ├── Tous les checks ci-dessus
    │       ├── Tests E2E (Playwright)
    │       ├── Deploy staging (Vercel + Fly.io staging)
    │       └── Smoke tests auto
    │
    └── Tag release
            │
            ▼
        GitHub Actions :
            ├── Deploy production (Vercel + Fly.io prod)
            ├── Migration DB (Prisma migrate)
            ├── Invalidation cache CDN
            └── Notification Slack/Discord
```

**Outils recommandes :**

| Outil | Usage | Prix |
|---|---|---|
| **GitHub Actions** | CI/CD | 2000 min/mois gratuit |
| **Turborepo** | Monorepo management | Gratuit (open source) |
| **Docker** | Containerisation backend | Gratuit |
| **Sentry** | Error tracking + performance monitoring | Gratuit (5K events/mois), puis 26 $/mois |
| **PostHog** | Analytics produit (auto-heberge) | Gratuit (self-hosted), Cloud 0 $ pour 1M events |
| **Grafana + Prometheus** | Monitoring infrastructure | Gratuit (self-hosted) |
| **Better Stack (Logtail)** | Logs centralises | Gratuit 1 Go/mois |

---

## 6. Logistique et Tracking

### 6.1 Solutions de Gestion de Flotte de Livreurs

Pour le reseau de moto-coursiers Pieces Riders (F33) :

| Solution | Type | Fonctionnalites | Prix | Recommandation |
|---|---|---|---|---|
| **Custom (in-house)** | Developpement propre | Controle total, adapte au contexte | Cout dev initial | **Recommande pour le MVP** -- plus simple qu'il n'y parait |
| **Onfleet** | SaaS | Route optimization, tracking, analytics | A partir de 500 $/mois | Trop cher pour le MVP |
| **Tookan (Jungleworks)** | SaaS | Attribution auto, tracking, notifications | A partir de 79 $/mois | Bon rapport qualite/prix |
| **Shipday** | SaaS | Simple, integrations, tracking | Gratuit jusqu'a 30 livraisons/jour | **Bon pour demarrer** |
| **GetSwift** | SaaS | Route optimization, tracking | A partir de 0,29 $/livraison | Pay-per-delivery interessant |

**Recommandation : Developpement custom minimal pour le MVP**

Justification :
- Les SaaS de livraison sont concus pour des marches avec adressage formel
- Le contexte ivoirien (pas d'adresses postales standard) necessite une adaptation
- Un systeme custom basique peut etre developpe en 2-3 sprints

**Architecture minimale du systeme de livraison :**

```
App Coursier (React Native / Expo)
├── Login (OTP WhatsApp)
├── Liste des courses disponibles
├── Accepter une course
├── Navigation vers point de collecte
├── Confirmation de collecte (scan/photo)
├── Navigation vers point de livraison
├── Confirmation de livraison (code OTP + photo)
├── Collecte paiement COD (si applicable)
└── Historique + gains

Backend
├── Attribution de courses (algorithme proximite)
├── Tracking GPS temps reel (WebSocket)
├── Calcul des frais de livraison (distance)
├── Notification acheteur (suivi en temps reel)
└── Reconciliation financiere quotidienne
```

### 6.2 APIs de Geolocalisation

| Solution | Couverture Afrique | Prix | Offline | Recommandation |
|---|---|---|---|---|
| **Google Maps Platform** | Bonne a Abidjan, limitee ailleurs | 7 $/1000 requetes (Directions), 200 $ credit gratuit/mois | Non | Bon pour geocoding et directions |
| **OpenStreetMap (OSM)** | Variable, bonne communaute CI | Gratuit | Oui (tuiles telechargeables) | **Recommande comme base** |
| **Mapbox** | Donnees OSM + satellite, bonne | 50K requetes gratuites/mois, puis 5 $/1000 | Oui (SDK offline) | **Recommande pour l'app coursier** |
| **HERE Maps** | Bonne en Afrique | 250K transactions gratuites/mois | Oui | Alternative solide |
| **Leaflet + OSM** | OSM | Gratuit (open source) | Avec plugin | Pour la PWA (leger, pas de SDK lourd) |
| **what3words** | Mondial (adressage par 3 mots) | 3 000 req/mois gratuites | Non | Excellent pour le probleme d'adressage |

**Recommandation multi-couche :**

```
PWA (Pieces web) :
    → Leaflet.js + tuiles OSM (gratuit, leger, < 40 Ko)
    → Alternative : Mapbox GL JS (plus beau, SDK 200 Ko)

App Coursier :
    → Mapbox Navigation SDK (directions turn-by-turn, mode offline)
    → Alternative : Google Maps SDK (meilleur routing a Abidjan)

Backend (calcul distances/ETA) :
    → OSRM self-hosted (Open Source Routing Machine)
    → Gratuit, tres rapide, basee sur OSM
    → Alternative : Google Directions API (plus precis mais payant)

Geocoding (adresse → coordonnees) :
    → Nominatim (OSM, gratuit, self-hosted)
    → Google Geocoding API en fallback (meilleur en CI)
```

### 6.3 Algorithme d'Attribution de Courses

**Algorithme recommande pour Pieces Riders :**

```
Attribution de course — Algorithme en 3 etapes :

Etape 1 : Filtrage
    → Coursiers disponibles (statut = "en ligne", pas de course en cours)
    → Coursiers dans un rayon de X km du point de collecte (configurable, defaut 5 km)
    → Coursiers avec capacite suffisante (taille/poids piece)

Etape 2 : Scoring
    Pour chaque coursier eligible :
    score = w1 * (1/distance_km)           // Proximite (poids : 0.4)
           + w2 * rating_coursier          // Reputation (poids : 0.2)
           + w3 * (1/temps_inactif_min)    // Temps d'attente (poids : 0.2)
           + w4 * taux_acceptation         // Fiabilite (poids : 0.2)

Etape 3 : Proposition sequentielle
    → Proposer au coursier avec le meilleur score
    → Timeout de 60 secondes pour accepter
    → Si refus/timeout → proposer au suivant
    → Apres 3 refus → elargir le rayon de recherche
    → Apres 5 refus → notification admin + proposition a tous
```

**Calcul des frais de livraison :**

```
Formule :
frais_livraison = base_fixe + (distance_km * tarif_km)

Ou :
    base_fixe = 1 000 FCFA (couvre la prise en charge)
    tarif_km  = 200 FCFA/km
    minimum   = 1 500 FCFA
    maximum   = 5 000 FCFA (au-dela, livraison a negocier)

Exemples :
    3 km  → 1 000 + 600  = 1 600 FCFA
    7 km  → 1 000 + 1 400 = 2 400 FCFA
    15 km → 1 000 + 3 000 = 4 000 FCFA

Surge pricing (optionnel, phase 2) :
    Heures de pointe (7h-9h, 17h-19h) : multiplicateur x1.3
    Nuit (21h-6h) : multiplicateur x1.5
    Pluie/conditions speciales : multiplicateur x1.5
```

### 6.4 Gestion des Adresses Sans Adressage Formel

C'est un defi majeur en Cote d'Ivoire. Solutions :

| Approche | Description | Precision | Implementation |
|---|---|---|---|
| **GPS pin drop** | L'utilisateur place un pin sur la carte | Tres precise | Standard, interface carte dans la PWA |
| **what3words** | 3 mots = localisation a 3m pres (ex: "moteur.soleil.cafe") | 3m | API what3words (3000 req/mois gratuit) |
| **Google Plus Codes** | Code alphanumerique (ex: "9FQ5+3M Abidjan") | ~14m | Gratuit, integre a Google Maps |
| **Points de repere** | "A cote du maquis chez Tonton, carrefour Palmeraie" | Variable | Champ texte libre + GPS |
| **Adresses favorites** | L'utilisateur sauvegarde ses lieux frequents | Precise (apres setup) | Stockage en profil utilisateur |
| **Partage WhatsApp Live Location** | Le client partage sa position en temps reel | Tres precise | Integre a WhatsApp, exploitable via l'API |

**Recommandation pour Pieces :**

```
Approche hybride :
1. GPS pin drop comme methode principale (dans la PWA et via WhatsApp location)
2. Plus Codes comme identifiant textuel partage (gratuit, pas de dependance API)
3. Champ "description" libre pour les reperes locaux
4. Adresses favorites pour les livraisons repetees (garages, entreprises)
5. WhatsApp Live Location pour le coursier en approche

Format d'adresse Pieces :
{
  "coordinates": { "lat": 5.3364, "lng": -4.0267 },
  "plus_code": "9FQ5+3M",
  "commune": "Cocody",
  "quartier": "Angré",
  "description": "Garage Kofi, en face de la pharmacie du carrefour",
  "saved_name": "Mon garage" // optionnel
}
```

---

## 7. Scalabilite et Securite

### 7.1 Architecture : Microservices vs Monolithe pour le MVP

| Approche | Avantages | Inconvenients | Verdict |
|---|---|---|---|
| **Monolithe modulaire** | Simple a developper, deployer, debugger. Une seule codebase. Pas de latence inter-services. | Plus difficile a scaler independamment. Risque de couplage si mal structure. | **Recommande pour le MVP** |
| **Microservices** | Scaling independant, equipes autonomes, technologies heterogenes | Complexite operationnelle massive, latence reseau, debugging distribue | Premature pour < 10 devs |
| **Monolithe modulaire → microservices graduels** | Le meilleur des deux mondes. Commence simple, extrait les services quand necessaire. | Necessite une bonne architecture initiale (bounded contexts) | **Approche recommandee a long terme** |

**Architecture recommandee : Monolithe modulaire avec extraction progressive**

```
Phase 1 (MVP) : Monolithe modulaire
┌─────────────────────────────────────────┐
│           Backend Pieces (Fastify)      │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  Module   │ │  Module   │ │ Module  │ │
│  │  Auth     │ │ Catalogue │ │ Orders  │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  Module   │ │  Module   │ │ Module  │ │
│  │ Payments  │ │ Delivery  │ │WhatsApp │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐                           │
│  │  Module   │                           │
│  │    IA     │  ← Seul candidat a        │
│  └──────────┘    extraction immediate    │
└─────────────────────────────────────────┘

Phase 2 (Scale) : Extraction du service IA
┌──────────────────────┐   ┌────────────────────┐
│   Backend Pieces      │   │  Service IA (Python)│
│   (Fastify, Node.js) │◄──│  FastAPI            │
│                       │   │  GPU optionnel      │
└──────────────────────┘   └────────────────────┘

Phase 3 (Growth) : Extraction progressive
┌────────────┐ ┌────────────┐ ┌────────────┐
│  Service    │ │  Service    │ │  Service    │
│  Auth       │ │  Catalogue  │ │  Orders     │
└────────────┘ └────────────┘ └────────────┘
┌────────────┐ ┌────────────┐ ┌────────────┐
│  Service    │ │  Service    │ │  Service    │
│  Payments   │ │  Delivery   │ │  WhatsApp   │
└────────────┘ └────────────┘ └────────────┘
```

**Regle d'extraction :** Ne pas extraire un service tant qu'il n'y a pas un **besoin technique concret** (scaling independant, technologie differente, equipe dediee).

### 7.2 Authentification

**Strategie d'authentification adaptee au marche ivoirien :**

| Methode | Avantage | Inconvenient | Usage |
|---|---|---|---|
| **OTP par WhatsApp** | Gratuit (conversation service), canal prefere | Necessite WhatsApp installe | **Methode principale** |
| **OTP par SMS** | Universel, fonctionne sans data | Cout (5-15 FCFA/SMS via Twilio/Infobip) | Fallback si pas de WhatsApp |
| **Phone number auth (Firebase)** | Simple, SDK complet | Depend de Google, cout SMS | Alternative |
| **Email + mot de passe** | Standard | Beaucoup d'utilisateurs n'ont pas d'email | Optionnel (entreprises) |
| **Social login (Google, Facebook)** | Facile pour l'utilisateur | Depend de la connexion | Optionnel |

**Implementation recommandee :**

```
Flux d'authentification Pieces :

1. L'utilisateur entre son numero de telephone
2. Pieces envoie un OTP a 6 chiffres via WhatsApp (gratuit)
3. Si WhatsApp echoue → fallback SMS (Twilio/Infobip)
4. L'utilisateur saisit l'OTP
5. Le backend verifie l'OTP et cree/retrouve le compte
6. Un JWT (access token, 15 min) + refresh token (30 jours) sont emis
7. Le refresh token est stocke en HTTP-only cookie (PWA) ou secure storage (app)

Stack technique :
- Supabase Auth (integre, supporte phone auth)
  OU
- Custom auth avec Fastify + jsonwebtoken + rate limiting
```

**Rate limiting anti-abus :**
- Maximum 3 tentatives OTP par numero par heure
- Maximum 10 OTP par IP par heure
- Blocage temporaire (1h) apres 5 echecs consecutifs
- Captcha (hCaptcha) apres 2 echecs

### 7.3 Protection Contre la Fraude

**Risques identifies et mitigations :**

| Risque | Description | Mitigation |
|---|---|---|
| **Faux comptes vendeurs** | Vendeur cree un compte, liste des pieces fictives, collecte le paiement sans livrer | KYC vendeur obligatoire (CNI + photo selfie + verification manuelle), escrow systematique |
| **Fraude COD** | Acheteur commande et refuse a la livraison | Historique client, limitation COD a 50K FCFA, frais d'annulation, blocage apres 3 refus |
| **Vol par coursier** | Le coursier part avec la piece ou le cash | GPS tracking continu, photos collecte/livraison, caution coursier, assurance |
| **Fausses evaluations** | Vendeur gonfle ses notes avec de faux comptes | Seuls les acheteurs avec commande confirmee peuvent noter, detection patterns (ML) |
| **Manipulation des prix** | Vendeur affiche prix bas puis augmente apres commande | Prix figes a la commande, alerte si prix modifie > 20% |
| **Phishing** | Faux bot WhatsApp Pieces | Numero verifie (badge vert WhatsApp Business), education utilisateur |
| **Abus promotions** | Utilisateur exploite les promos avec multi-comptes | Fingerprinting appareil, limite 1 promo/numero, detection patterns |

**Outils anti-fraude recommandes :**

| Outil | Usage | Prix |
|---|---|---|
| **Sardine AI** | Device fingerprinting, detection fraude paiement | Sur devis |
| **Shield (ex-Fingerprint)** | Identification appareil, detection multi-comptes | Gratuit 20K API/mois |
| **Custom rules engine** | Regles metier specifiques (seuils, patterns) | Dev interne |
| **Sumsub** | KYC/KYB verification identite | A partir de 0,50 $/verification |

**Score de confiance Pieces :**

```
Pour chaque transaction, calculer un score de risque :

score_risque = f(
    age_compte,           // Nouveau compte = plus risque
    historique_achats,    // Commandes reussies precedentes
    montant_commande,     // Montant eleve = plus risque
    mode_paiement,        // COD = plus risque que prepaiement
    heure_commande,       // Nuit = plus risque
    distance_livraison,   // Longue distance = plus risque
    device_fingerprint    // Nouvel appareil = plus risque
)

Actions selon le score :
    0-30 (faible)   → Commande automatique
    30-60 (moyen)   → Verification supplementaire (SMS confirmation)
    60-80 (eleve)   → Prepaiement obligatoire (pas de COD)
    80-100 (critique) → Commande bloquee, verification manuelle
```

### 7.4 Protection des Donnees et Reglementation

#### Cadre juridique en Cote d'Ivoire

La Cote d'Ivoire dispose d'un cadre juridique pour la protection des donnees personnelles :

| Texte | Description |
|---|---|
| **Loi n 2013-450 du 19 juin 2013** | Relative a la protection des donnees a caractere personnel |
| **ARTCI** | Autorite de Regulation des Telecommunications de Cote d'Ivoire -- organe de controle |
| **Decret n 2014-106** | Modalites d'application de la loi sur les donnees personnelles |
| **Convention de Malabo (2014)** | Convention de l'Union Africaine sur la cybersecurite et la protection des donnees |

**Obligations principales :**

1. **Declaration a l'ARTCI :** Toute base de donnees contenant des donnees personnelles doit etre declaree
2. **Consentement :** Consentement explicite requis pour la collecte et le traitement
3. **Droit d'acces et de rectification :** Les utilisateurs peuvent demander acces a leurs donnees
4. **Droit de suppression :** Les utilisateurs peuvent demander la suppression de leurs donnees
5. **Securite :** Mesures techniques et organisationnelles appropriees requises
6. **Transfert transfrontalier :** Autorise uniquement vers des pays offrant un niveau de protection adequat

**Implementation technique de la conformite :**

```
1. Consentement :
   - Ecran de consentement explicite a l'inscription
   - Granularite : consentement separe pour notifications marketing
   - Horodatage et enregistrement du consentement

2. Donnees minimales collectees :
   - Telephone (obligatoire, identifiant unique)
   - Nom (optionnel pour acheteur, obligatoire pour vendeur)
   - Vehicule(s) (optionnel)
   - Adresse de livraison (temporaire, pour la commande uniquement)
   - CNI (vendeurs uniquement, pour KYC)

3. Chiffrement :
   - En transit : TLS 1.3 obligatoire partout
   - Au repos : AES-256 pour les donnees sensibles (CNI, tokens paiement)
   - Cles : Gestion via Vault (HashiCorp) ou AWS KMS

4. Retention des donnees :
   - Donnees de compte : duree de vie du compte + 1 an
   - Historique commandes : 5 ans (obligation comptable)
   - Logs techniques : 90 jours
   - Images CNI vendeur : duree du partenariat + 6 mois

5. Suppression de compte :
   - Endpoint API /account/delete
   - Anonymisation des donnees transactionnelles (pas suppression)
   - Suppression des donnees personnelles sous 30 jours

6. Audit :
   - Logs d'acces aux donnees sensibles
   - Revue trimestrielle des permissions
   - Tests de penetration annuels
```

**Conformite RGPD (si des utilisateurs europeens) :**
- Si Pieces traite des donnees de residents europeens (ex: diaspora ivoirienne), le RGPD s'applique
- Les mesures ci-dessus couvrent deja la majorite des exigences RGPD
- Ajouter : DPO (Delegue a la Protection des Donnees), registre des traitements, DPIA

---

## 8. Synthese et Recommandations Finales

### 8.1 Stack Technique Recommande -- Resume

| Composant | Technologie | Justification |
|---|---|---|
| **Frontend PWA** | Next.js 15 (App Router) + TypeScript | SSR, performance, ecosysteme React |
| **Backend API** | Node.js + Fastify + TypeScript + Prisma | Performance, DX, meme langage que le front |
| **Service IA** | Python + FastAPI | Ecosysteme ML, integration APIs VLM |
| **Base de donnees** | PostgreSQL (Supabase ou Neon) | Relationnel + JSONB + PostGIS |
| **Cache / Queue** | Redis (Upstash) + BullMQ | Sessions, cache, jobs async |
| **Recherche** | Meilisearch | Typo-tolerant, rapide, leger |
| **Stockage images** | Cloudflare R2 + Workers | Zero egress, CDN mondial |
| **Auth** | OTP WhatsApp + SMS fallback | Adapte au marche, gratuit via WhatsApp |
| **Paiement** | CinetPay (agregateur) | Leader CI, tous les moyens de paiement |
| **WhatsApp** | Meta Cloud API via 360dialog | Pas de surcout BSP, fiable |
| **Maps** | Leaflet + OSM (PWA), Mapbox (coursier) | Leger, offline-capable |
| **Hebergement** | Vercel (front) + Fly.io (back) + Cloudflare | Edge, proche Afrique, cout optimal |
| **CI/CD** | GitHub Actions + Turborepo | Gratuit, integration GitHub native |
| **Monitoring** | Sentry + PostHog + Better Stack | Erreurs, analytics, logs |
| **IA Vision (MVP)** | Gemini 2.0 Flash + GPT-4o fallback | Cout minimal, precision acceptable |
| **IA Vision (Scale)** | Modele fine-tune (EfficientNet v2 / ViT) | Precision optimale, cout inference bas |

### 8.2 Estimation Budget Technique Mensuel

| Phase | Hebergement | APIs IA | WhatsApp | Paiement (hors commissions) | Total |
|---|---|---|---|---|---|
| **MVP** (0-1K users) | 50-80 $ | 20-50 $ | 15-25 $ | 0 $ (CinetPay gratuit) | **85-155 $/mois** |
| **Croissance** (1K-10K) | 150-300 $ | 100-300 $ | 80-130 $ | 0 $ | **330-730 $/mois** |
| **Scale** (10K-100K) | 500-1500 $ | 500-2000 $ | 650-900 $ | ~50 $ | **1 700-4 450 $/mois** |

### 8.3 Risques Techniques et Mitigations

| Risque | Probabilite | Impact | Mitigation |
|---|---|---|---|
| **Precision IA insuffisante** | Moyenne | Eleve | MVP avec top-3 + fallback humain, fine-tuning progressif |
| **Connectivite instable CI** | Elevee | Moyen | Architecture offline-first, background sync, cache agressif |
| **Adoption vendeurs faible** | Moyenne | Critique | Catalogue auto-genere par IA (F13), onboarding terrain |
| **Fraude COD** | Elevee | Moyen | Plafond COD, score de confiance, historique client |
| **Cout WhatsApp a l'echelle** | Faible | Moyen | Conversations service gratuites (1000/mois), rediriger vers PWA |
| **Changement API WhatsApp** | Faible | Eleve | Abstraction du canal de communication, multi-canal |
| **Latence reseau CI** | Moyenne | Moyen | CDN Cloudflare, edge computing, optimisation des assets |
| **Disponibilite paiement mobile** | Faible | Moyen | Multi-agregateur (CinetPay + Flutterwave), fallback COD |

### 8.4 Timeline Technique Suggeree

```
Mois 1-2 : Fondations
├── Setup monorepo (Turborepo + Next.js + Fastify)
├── Auth (OTP WhatsApp/SMS)
├── Schema DB + Prisma
├── Catalogue basique (CRUD pieces)
├── Meilisearch integration
├── Upload images (R2)
└── CI/CD (GitHub Actions → Vercel + Fly.io)

Mois 2-3 : Coeur du produit
├── IA Vision integration (Gemini Flash API)
├── Recherche par photo (PWA + WhatsApp)
├── Bot WhatsApp basique (webhook + reponses)
├── Profil vehicule
├── Paiement CinetPay (Orange Money, MTN MoMo, Wave)
└── PWA offline-first (Service Worker, cache)

Mois 3-4 : Transactions & Livraison
├── Flux de commande complet
├── Escrow / paiement garanti vendeur
├── COD (Cash on Delivery)
├── App coursier basique (Expo)
├── Tracking livraison (GPS + notifications)
├── WhatsApp Flows (inscription vehicule, commande)
└── Workflow tripartite (F09)

Mois 4-5 : Qualite & Lancement
├── Dashboard vendeur
├── Dashboard mecanicien basique
├── Systeme de notation/avis
├── Tests E2E (Playwright)
├── Optimisation performance (Lighthouse > 90)
├── Onboarding 10 vendeurs pilotes
├── Onboarding 50 mecaniciens pilotes
└── Lancement beta Abidjan
```

### 8.5 Points de Decision Clefs

1. **Next.js vs SvelteKit :** Si l'equipe front est petite (1-2 devs) et la performance est critique, SvelteKit est superieur. Si l'equipe est plus grande ou veut un ecosysteme plus mature, Next.js est le choix sur.

2. **Supabase vs Custom backend :** Supabase accelere enormement le MVP (auth, DB, storage, realtime integres). Mais verrouille partiellement sur leur plateforme. Pour un controle total des le depart, Fastify + Prisma + services manages separement.

3. **360dialog vs Meta Cloud API direct :** Commencer avec 360dialog pour la simplicite, migrer vers l'API directe Meta quand l'equipe a la capacite de gerer l'infra webhook.

4. **Meilisearch auto-heberge vs Cloud :** Auto-heberge sur Fly.io (~7 $/mois) vs Meilisearch Cloud (~30 $/mois). L'auto-heberge est moins cher mais necessite de gerer la maintenance.

5. **App coursier : React Native/Expo vs Flutter vs PWA :** Expo est recommande (meme ecosysteme JavaScript/TypeScript que le reste du stack). Flutter si l'equipe mobile est separee. PWA possible mais limitee pour le GPS en arriere-plan.

---

## Sources et References

### IA et Computer Vision
- Partium (partium.io) -- Plateforme de reconnaissance visuelle de pieces industrielles
- Google Cloud Vision API (cloud.google.com/vision)
- AWS Rekognition Custom Labels (aws.amazon.com/rekognition)
- Roboflow Universe (universe.roboflow.com) -- Datasets de detection de pieces auto
- OpenAI GPT-4o Vision API (platform.openai.com)
- Google Gemini API (ai.google.dev)
- YOLO documentation (docs.ultralytics.com)
- DINOv2 (Meta AI) -- github.com/facebookresearch/dinov2

### PWA et Frontend
- Next.js documentation (nextjs.org/docs)
- web.dev/progressive-web-apps -- Guide PWA de Google
- Workbox documentation (developer.chrome.com/docs/workbox)
- SvelteKit documentation (kit.svelte.dev)

### WhatsApp Business
- WhatsApp Business Platform documentation (developers.facebook.com/docs/whatsapp)
- WhatsApp Flows documentation (developers.facebook.com/docs/whatsapp/flows)
- WhatsApp Pricing (developers.facebook.com/docs/whatsapp/pricing)
- 360dialog (360dialog.com)
- Gupshup (gupshup.io)

### Paiement Mobile en Cote d'Ivoire
- CinetPay documentation (cinetpay.com/documentation)
- Orange Money API (developer.orange.com)
- MTN MoMo API (momodeveloper.mtn.com)
- Wave Business (wave.com/business)
- Flutterwave (flutterwave.com)
- FedaPay (fedapay.com)
- PayDunya (paydunya.com)

### Infrastructure et Hebergement
- Cloudflare R2 (developers.cloudflare.com/r2)
- Fly.io documentation (fly.io/docs)
- Vercel documentation (vercel.com/docs)
- Supabase documentation (supabase.com/docs)
- Meilisearch documentation (meilisearch.com/docs)
- Upstash Redis (upstash.com)

### Geolocalisation et Logistique
- OpenStreetMap (openstreetmap.org)
- Mapbox documentation (docs.mapbox.com)
- OSRM -- Open Source Routing Machine (project-osrm.org)
- what3words API (developer.what3words.com)
- Google Plus Codes (plus.codes)

### Reglementation Cote d'Ivoire
- Loi n 2013-450 du 19 juin 2013 relative a la protection des donnees personnelles (CI)
- ARTCI -- Autorite de Regulation des Telecommunications de Cote d'Ivoire (artci.ci)
- Convention de Malabo (Union Africaine, 2014) -- Cybersecurite et protection des donnees

---

*Ce document est un livrable de recherche technique pour le projet Pieces. Il doit etre mis a jour regulierement au fur et a mesure de l'evolution du projet et des technologies.*
