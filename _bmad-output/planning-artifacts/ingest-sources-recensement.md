# Recensement des sources pièces auto CI — Phase 0

> Livrable Phase 0 du plan d'intégration ingest. Sert d'entrée pour la conception des scrapers (Phase 3) et de la carto concurrence (Phase 4).
> Date : 2026-05-27

## 1. Sites online CI — vue d'ensemble

| # | Nom | URL | Type | Scrapabilité | Prix affichés | Sélecteur véhicule | Volume estimé | Priorité ingest |
|---|---|---|---|---|---|---|---|---|
| 1 | **3H Autoparts** | https://3hautoparts.com | E-commerce structuré (WooCommerce) | ★★★★★ | Oui FCFA | Par marque (12 marques) | ~10 000 réfs | **P1** |
| 2 | **MAPA-CI** | https://mapa.ci | Catalogue structuré | ★★★★ | Partiel (à confirmer) | Hiérarchie système → pièce → marque véh | ~5 000 réfs | **P1** |
| 3 | **Jumia CI auto** | https://jumia.ci/voiture-pieces-rechange | Marketplace mainstream | ★★★ (anti-bot) | Oui FCFA | Filtre marque véhicule | Inconnu (>1000) | **P1** |
| 4 | **CoinAfrique CI** | https://ci.coinafrique.com/categorie/accessoires-et-pieces-detachees | Petites annonces | ★★★★ | Mixte (souvent "prix sur demande") | Filtres marque/modèle | ~500+ annonces | **P1** |
| 5 | **Jiji CI** | https://jiji.co.ci/car-parts-and-accessories | Petites annonces | ★★★ (anti-bot Akamai) | Oui FCFA | 12+ marques en filtre | ~127 visibles | **P2** |
| 6 | **EasyPieces** | https://easypieces.ci | Service à devis (pas catalogue) | ★ | Sur devis | Formulaire véhicule | N/A (workflow manuel) | **P3** (concurrence offline) |
| 7 | **Lakasse** | https://lakasse.com | Plateforme | À auditer | À auditer | À auditer | Inconnu | **P2** |
| 8 | **Planète Auto** | https://planeteauto.ci/piecesderechange.html | Vitrine garage Cocody | ★★ | Non | Non | Vitrine | **P3** |
| 9 | **Ivoirelite** | https://ivoirelite.net/9-pieces-auto | E-commerce | À auditer | À confirmer | À auditer | Inconnu | **P2** |
| 10 | **General Auto Parts** | https://general-ci.com | Distributeur (300k réfs annoncées) | À auditer | À auditer | À auditer | **~300 000 réfs** ⚠ | **P1** |
| 11 | **SAM (Service Auto Méca)** | https://s-automeca.com | Distributeur auto+camions | À auditer | À auditer | À auditer | Inconnu | **P2** |
| 12 | **OkaCars** | https://okacars.com | Annonces véhicules + pièces | ★★★ | Variable | Marque/modèle voiture | Inconnu | **P3** |
| 13 | **Locanto CI** | https://locanto.ci/Pieces-accessoires-auto/906/ | Petites annonces | ★★★ | Mixte | Limité | Faible | **P3** |
| 14 | **Jumia Deals (ex-Vendito)** | https://deals.jumia.ci/abidjan/pieces-accessoires | Petites annonces | ★★★ | Mixte | Limité | Modéré | **P2** |
| 15 | **Annuaire CI** | https://annuaireci.com | Annuaire pro | ★★★★ | Pas de prix | Catégorie | Centaines d'entrées | **P1** (pour Chantier 3) |
| 16 | **cotedivoireauto.net** | https://cotedivoireauto.net/nos-services/pieces-detachees-... | Annuaire pro auto | ★★★ | Pas de prix | Catégorie | Modéré | **P2** (Chantier 3) |
| 17 | **Lescassesdabidjan** | http://lescassesdabidjan.com | Annuaire casses auto | Down au 2026-05-27 | — | — | — | **P3** |

### Légende scrapabilité
- ★★★★★ : structure HTML stable, pas d'anti-bot, slug propres → scraper Cheerio simple
- ★★★★ : structure stable mais URL paramétrées → Playwright recommandé
- ★★★ : anti-bot léger (Cloudflare/Akamai) → Playwright + stealth + rate limit agressif
- ★★ : vitrine sans catalogue exploitable
- ★ : workflow à devis, pas de données structurées

---

## 2. Top 3 sites prioritaires — détail technique

### 2.1 — 3H Autoparts (P1, démarrer ici)

- **Tech** : WooCommerce (WordPress). URL produit : `/produit/{slug}/`, URL catégorie : `/categorie-produit/produits-libre-service/{cat}/`.
- **Marques véhicules** : Toyota, Peugeot, Renault, Nissan, Honda, BMW, Suzuki, Kia, Ford, Hyundai, Mazda, Mercedes.
- **Catégories pièces** : 11 macro-catégories (freinage, moteur, suspension, batteries, additifs, ampoules, huiles, etc.).
- **Marques pièces** : Bosch, Cargo, SKF, Valeo, KYB, Bardahl.
- **Exemple prix** : Bougie Bosch FGR7DQP → 7 650 FCFA.
- **Contact** : +225 2721 59 99 99, WhatsApp +225 0767 89 34 59.
- **Boutiques physiques** : Cocody Angré 8ᵉ tranche + Marcory Zone 4 (01 BP 7354 ABIDJAN 01).
- **Stratégie ingest** : crawl sitemap WooCommerce (`/wp-sitemap-posts-product-1.xml` probable) → parser fiches produit (titre, prix, catégorie, marque). Compat véhicule à inférer depuis titre.

### 2.2 — MAPA-CI (P1)

- **Société** : Mike Anthonio Pièces Auto, SARL créée 1996. HQ Treichville av.8 rue 24, succursale Adjamé (face gare STIF, carrefour Renault).
- **Partenaires officiels** : ATC Comafrique (Nissan), Bosch, CFAO Motor (Mitsubishi, Toyota), SETACI, Africauto (Kia, Hyundai). → **source de référence pour pièces OEM matchées au parc CI**.
- **Catégories** : 7 systèmes (clim/chauffage, électrique, freinage, filtration, moteur, direction/suspension, échappement).
- **URL** : `mapa.ci/fr/magasin/{categorie}/{sous-cat}/{produit}_i{id}` — exemple : `disque-d-embrayage-suzuki_i12563`.
- **Contact** : 27 21 24 30 89 / 05 06 13 56 57. Ouvert lun–sam 8h–17h30.
- **Stratégie ingest** : crawl par catégorie, l'ID `_i12345` final permet la dédup. Prix à confirmer par échantillon manuel (non visible en page liste).

### 2.3 — General Auto Parts (P1, à auditer en priorité)

- **Volume annoncé** : 300 000 références — **plus gros catalogue théorique CI**.
- **À auditer** : site `general-ci.com` — structure, prix exposés ou login, sélecteur véhicule, catégorisation.
- **Si exploitable** : devient la **source maîtresse** pour le catalogue pièces (Chantier 2).

---

## 3. Distributeurs constructeur (catalogue OEM officiel)

Pas du e-commerce mais sources d'autorité pour le **mapping marque→modèles présents en CI** :

| Distributeur | Marques importées | Usage pour pieces.ci |
|---|---|---|
| **CFAO Motors CI** | Toyota, Peugeot, Citroën, Mitsubishi, Mercedes (depuis 2021), Suzuki, Yamaha, JCB, Bridgestone, Hino, King Long, Fuso | Liste exhaustive modèles importés officiellement → filtre parc CI pour Chantier 1 |
| **Tractafric Motors CI** (TMC) | BMW, Mini, Hyundai, Ford, Mazda, Chery, JAC, FAW, Mercedes-Benz Trucks | Idem |
| **ATC Comafrique** | Nissan | Idem |
| **Africauto** (sous TMC) | Hyundai, Ford, Mazda | Idem |

**Action** : Phase 2 (catalogue véhicules) doit pondérer les modèles par "présent dans réseau officiel CI" = priorité haute → enrichissement OEM via partsouq.

---

## 4. Cartographie offline — gros vendeurs Abidjan

### 4.1 — Zones de concentration

| Zone | Type | Notes |
|---|---|---|
| **Adjamé Roxy / Forum / Stif** | Marché historique pièces auto neuves + occasion | Densité maximale, prix négociables, qualité variable (cf article Automobile.ci sur pièces défectueuses non contrôlées) |
| **Abobo** | Casses auto + pièces occasion importées | Souvent couplé à Adjamé dans le réseau d'approvisionnement |
| **Treichville av.8 rue 24** | Distributeurs structurés (MAPA-CI HQ) | Plus B2B |
| **Marcory Zone 4 / Zone 4A** | Magasins enseigne (3H Autoparts, etc.) | Clientèle haut de gamme |
| **Cocody Angré / Riviera 2** | Concessions + magasins enseigne | Planète Auto, 3H Autoparts succursale |
| **Yopougon — Carrefour Siporex / autoroute nord** | Mécaniciens + vente pièces (Auto Mecanic CI, Stephen Pièces Auto face Uniwax) | Clientèle locale |
| **Koumassi** | Casses (Abidjan Casse Auto «A.C.A.» Lot 1130 Ilot 84) | Pièces occasion |
| **2 Plateaux Agban** | Établissement 2KDL — toutes marques | Magasin moyen |

### 4.2 — Liste initiale 20 acteurs à fichiers (à enrichir Phase 4)

Acteurs identifiés à ce stade (manque téléphone/adresse précise pour la moitié — à compléter via Google Maps API + visite/appel) :

1. 3H Autoparts (Cocody Angré 8ᵉ + Marcory Z4) — ★★★★★
2. MAPA-CI (Treichville + Adjamé Stif) — ★★★★★
3. General Auto Parts — ★★★★★ (à localiser)
4. SAM Service Auto Méca — ★★★★ (à localiser)
5. CFAO Motors CI — Quick Service pièces — ★★★★★
6. Tractafric Motors CI — Quick Service pièces — ★★★★★
7. Africauto (Hyundai/Ford/Mazda) — ★★★★
8. Lakasse — ★★★ (online + show-room ?)
9. EasyPieces — ★★★ (Abidjan, modèle devis)
10. Planète Auto (Riviera 2) — ★★★
11. Auto Mecanic CI (Yopougon Siporex) — ★★★
12. Stephen Pièces Auto (Yopougon, face Uniwax) — ★★★
13. Établissement 2KDL (2 Plateaux Agban) — ★★★
14. Établissement A.R (référencé Assonvon Motors) — ★★
15. Top Auto — ★★
16. Abidjan Casse Auto «A.C.A.» (Koumassi) — ★★ (occasion)
17. Cacomiaf (mentionné comme concessionnaire approvisionnant Adjamé) — ★★★
18. SETACI (partenaire MAPA) — ★★★
19. Casse Voiture Map (référencé Mapcarta) — ★★
20. **Adjamé Roxy bloc** : ~50 micro-vendeurs à regrouper en cluster — ★★ (cluster, pas individuel)

★ = importance estimée pour pieces.ci (gamme, volume, structure).

### 4.3 — Méthode pour compléter (Phase 4)

1. Google Places API "auto parts store" lat=5.345 lng=-4.024 radius=30000 → ~200 POI bruts
2. Filtrer rating ≥ 4 ET reviews ≥ 20 → ~50 candidats
3. Enrichir manuellement : téléphone, WhatsApp, gamme, taille estimée (S/M/L)
4. Stockage : table `CompetitorVendor` (cf plan technique)

---

## 5. Risques juridiques par source (à valider avant scraping)

| Source | robots.txt à vérifier | CGU scraping | Rate limit reco |
|---|---|---|---|
| 3H Autoparts | À vérifier | E-commerce standard → toléré si raisonnable | 1 req/2s |
| MAPA-CI | À vérifier | Idem | 1 req/2s |
| Jumia CI | **Strict** — anti-bot Akamai | CGU interdisent scraping | 1 req/5s + Playwright stealth, ou éviter |
| Jiji CI | Strict | CGU interdisent | Idem |
| CoinAfrique | À vérifier | Modéré | 1 req/3s |
| Annuaire CI / cotedivoireauto | Annuaires publics | Généralement OK | 1 req/2s |

**Reco** : v1 = uniquement sources P1 où CGU n'interdit pas explicitement (3H, MAPA, annuaires). Jumia/Jiji en v2 si vraiment nécessaire, avec budget juridique.

---

## 6. Sortie Phase 0 — décisions actées (mise à jour 2026-05-27, post-audit)

### 6.1 — Audits décisifs (changements vs. recensement initial)

**General Auto Parts → downgrade P1 → P3 source data, reste P1 acteur offline.**
Audit du site `general-ci.com` : Webflow vitrine, **aucun catalogue navigable, aucun prix exposé, aucun sélecteur véhicule**. Les "300 000 références" annoncées n'existent qu'en stock physique. Spécialisé poids lourds (Ford, Iveco, MAN, Mercedes-Benz, Sinotruck, Nissan, Renault, Scania). Adresse réelle : Treichville (5.2822, -3.9796) — pas Bingerville comme indiqué sur le site (Bingerville Fekessé = entrepôt secondaire). Téléphone vérifié OSM : **+225-21.24.14.04**. → Inscrit en table `CompetitorVendor`, pas dans le pipeline scraping.

**Jumia CI → upgrade : scrapable en v1 sans Playwright stealth.**
Audit `jumia.ci/voiture-pieces-rechange/` : **397 résultats seulement** (pas des milliers), 30+ marques en filtres latéraux, URLs produits propres `/[brand]-[name]-[id].html`, **aucun anti-bot Akamai détecté, pas de CAPTCHA, simples tokens de session**. → Fetch HTTP classique + Cheerio suffit. Promu **P1**. CGU à confirmer juridiquement avant exécution mais techniquement faisable sans investissement Playwright.

**OSM Overpass → remplace Google Places pour Chantier 4 (carto offline).**
Requête bbox Abidjan exécutée (cf `data/abidjan-osm-2026-05-27.json` joint) : **1 125 POI auto** (287 `car_parts`, 750 `car_repair`, 88 `car`), dont 645 nommés. Couverture excellente géographiquement, **mais seulement 24 POI avec téléphone** (gros gap). Concentrations confirmées :

| Zone | Total POI | car_parts | car_repair |
|---|---|---|---|
| Yopougon | 328 | 82 | 240 |
| Adjamé Roxy/Forum | 315 | 81 | 228 |
| Abobo | 240 | 62 | 177 |
| Koumassi | 161 | 53 | 104 |
| Treichville | 128 | 25 | 57 |
| Cocody Angré/Riviera | 75 | 20 | 45 |
| Marcory Zone 4 | 16 | 7 | 6 |

**Acteurs structurés identifiés via OSM (nouveaux vs. recensement initial)** : Société Gedis-Lub (Zone 4c, +225-21.35.44.86), Ramco (+225-21.35.64.30), Nabilco (+225-21.35.09.09), SAMCO Auto Parts (+225-21.35.14.44 / +225-07.07.54.18), SKF Le Roulement Ivoirien SA (Treichville), Établissement Fakhreddine, Wakim, Cacomiaf (5.3011, -4.0111 — Marcory, partenaire MAPA confirmé), SAPCO SARL, STETS Spare parts, TRADCO, Parts autority, Karyn's Group, Sylla Logistique, KMPA, Bosch (Treichville + Cocody), Techniflex, HMK, Rimco, Top Auto (Cocody).

→ La liste des "20 acteurs offline" devient **liste de 50+ enseignes nommées** + ~600 micro-vendeurs Adjamé/Yopougon/Abobo non nommés (clusters).

### 6.2 — Décisions actées

1. ✅ **Pipeline scraping P1 final** : 3H Autoparts, MAPA-CI, **Jumia CI** (ajouté), CoinAfrique, Annuaire CI. **General Auto Parts retiré**.
2. ✅ **Sources offline (CompetitorVendor)** : import direct depuis dump OSM `data/abidjan-osm-2026-05-27.json` → 645 enseignes nommées seed prête.
3. ⚠ **Enrichissement contacts** : OSM ne donne que 24 téléphones. Pour les top 50 enseignes structurées, utiliser Google Places API en one-shot (~10 USD de quota, 1 requête par enseigne avec `Place Details` pour téléphone + horaires + rating). **Décision : activer la clé Google Cloud quand on lancera Phase 4.**
4. ❌ **Jiji + EasyPieces écartés v1** confirmé.
5. ❌ **Playwright stealth pas nécessaire en v1** — aucune source P1 ne le justifie.
6. **Catalogue véhicules (Chantier 1)** inchangé : filtrer parc CI sur marques officielles CFAO + Tractafric + ATC = ~25 marques, ~150 modèles, ~600 motorisations.

### 6.3 — Plan technique mis à jour (impact sur les phases)

- **Phase 1** (scaffold + schémas Prisma) : inchangée
- **Phase 2** (catalogue véhicules NHTSA + Wikipedia) : inchangée
- **Phase 3** (scrapers concurrence) : passe de 3 sources à **4 sources** (3H, MAPA, Jumia, CoinAfrique). +1j d'effort estimé.
- **Phase 4** (carto offline) : **fortement accélérée** — OSM remplace 80% du travail manuel. Étapes : (a) import dump OSM en `CompetitorVendor` staging, (b) dédup + classification enseigne vs. micro-vendeur, (c) enrichissement Google Places sur top 50, (d) revue manuelle finale. **2j → 1j**.
- **Phase 5** (partsouq OEM) : inchangée.

---

## Sources

- [3H Autoparts](https://3hautoparts.com)
- [MAPA-CI](https://mapa.ci)
- [General Auto Parts](https://general-ci.com)
- [Service Auto Méca (SAM)](https://s-automeca.com)
- [Lakasse](https://lakasse.com)
- [EasyPieces](https://easypieces.ci)
- [Ivoirelite](https://ivoirelite.net/9-pieces-auto)
- [Planète Auto](https://planeteauto.ci)
- [CoinAfrique CI pièces](https://ci.coinafrique.com/categorie/accessoires-et-pieces-detachees)
- [Jumia CI pièces](https://jumia.ci/voiture-pieces-rechange/)
- [Jiji CI pièces](https://jiji.co.ci/car-parts-and-accessories)
- [Jumia Deals Abidjan pièces](https://deals.jumia.ci/abidjan/pieces-accessoires)
- [Locanto CI pièces](https://locanto.ci/Pieces-accessoires-auto/906/)
- [OkaCars](https://okacars.com)
- [Annuaire CI — automobiles accessoires](https://annuaireci.com/cote-divoire/fr-FR/category/abidjan-automotobateau--automobiles-accessoir/order-by-rating/3)
- [Côte d'Ivoire Auto — annuaire pro](https://cotedivoireauto.net/nos-services/pieces-detachees-249d66d5-b029-478b-9284-e517c91105bc)
- [CFAO Motors CI](http://www.cfao-automotive.com/fr/filiales/cfao-motors-cote-d-ivoire)
- [Tractafric Motors CI — pièces et services](http://www.tractafrictmc-ci.com/fr/page/root/location--services/40/pieces-et-services.html)
- [Article Automobile.ci — réseau pièces Abobo-Adjamé](http://www.automobile.ci/actualite/actu/item/réseau-de-pièces-détachées-d'abobo-adjamé-comment-des-pièces-défectueuses-échappent-aux-contrôles-de-l'etat.html)
- [Annuaire CI — 3H Autoparts](https://annuaireci.com/en/entreprises/3h-autoparts-abidjan-cote-divoire/)
- [Annuaire CI — MAPA-CI](https://annuaireci.com/entreprises/societe-mapa-mike-anthonio-pieces-auto-abidjan-cote-divoire/)
