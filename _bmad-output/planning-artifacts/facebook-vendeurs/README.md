# Recensement — Vendeurs de pièces auto sur Facebook (Côte d'Ivoire)

> Veille concurrence / prospection. Source : **Facebook Ad Library** (`facebook.com/ads/library`), pays = Côte d'Ivoire, statut = annonces actives, tri par impressions.
> Capturé le **2026-05-29**. Mots-clés balayés : `pièces auto`, `pièces détachées`, `auto parts`, `casse auto`, `accessoires auto`, `moteur occasion`, `pièces toyota`, `amortisseur`, `embrayage`, `boîte de vitesse`, `pièces hyundai`, `pièces mercedes`, `pare-brise`, `pièces changan`, `pièces byd`, `haval`, `pièces voiture chinoise`.

## Méthode

- Données extraites du **texte des annonces actives** dans l'Ad Library (outil public officiel de transparence Meta) — pas de scraping du Marketplace ni des groupes (CGU Meta + anti-bot).
- Chaque vendeur a un **permalien Ad Library** (`?id=<LibraryID>`) : cliquer ouvre l'annonce exacte avec son visuel, toujours à jour. C'est volontairement préféré à un screenshot figé (plus fiable, traçable, vivant).
- Contacts (téléphone / WhatsApp), marques, types de pièces et localisation proviennent directement du texte des annonces. Quand le numéro WhatsApp est derrière un bouton CTA et non écrit, c'est noté.
- Données brutes machine-exploitables : [`vendeurs-facebook.csv`](./vendeurs-facebook.csv).

## Résumé

- **29 vendeurs ivoiriens de pièces auto** + **5 spécialistes vitrage/pare-brise** + **8 acteurs accessoires/tuning** + **4 import/export** régionaux/internationaux + **2 signaux marché** (≈ 48 acteurs au total).
- Couverture marques forte sur : **allemandes premium** (BMW/Mercedes/Audi/Mini), **coréennes** (Kia/Hyundai), **japonaises** (Toyota/Honda/Nissan/Mitsubishi/Suzuki), **anglaises** (Land/Range Rover, Jaguar), et une niche émergente **voitures chinoises** (Haval/BYD/Changan/Great Wall).
- Zones les plus représentées : **Yopougon, Cocody/Angré, Marcory/Zone 4, Koumassi, Abobo, Treichville, 2 Plateaux**.
- 2 acteurs déjà dans notre pipeline de scraping web : **3H Autoparts** et **Global Auto**.

### Insight — le trou de marché « pièces voitures chinoises »
Sur Facebook, le segment chinois est **saturé d'exportateurs de véhicules** (grossistes Chine→CI : KK Used Cars, cyt, CNcars, Charlie Yu, Ilana…) et de **concessionnaires** (PANDA AUTO — concession marques chinoises à Cocody : Changan, Jetour, Chery, Geely, Haval, Tank…). En face, les **pièces** pour ces véhicules ne sont servies que par une poignée : **Dav Pièces, SMS-Société, KAB, Unipièces, Z-tech, Melhem** (boîtes auto). Une vague de véhicules chinois arrive → **demande de pièces qui explose, offre encore mince**. Segment prioritaire pour la marketplace.

## Short-list onboarding priorisée

Critères : (a) **segment chinois** = trou de marché, (b) **volume pub / notoriété**, (c) **crédibilité** (ancienneté, agrément), (d) **WhatsApp confirmé**.

**🔴 Tier 1 — à contacter en premier**
1. **Dav Pièces détachées** — chinoises Haval/BYD/Changan — 05 84 07 09 18
2. **Unipièces** — chinoises + premium certifié — 05 03 77 50 40
3. **SMS-Société Multi services** — Great Wall/Haval — 05 66 22 77 91
4. **KAB service automobile** — chinoises + japonaises — 05 06 84 08 70
5. **Melhem Auto Service** — boîtes auto (incl. chinoises) — 07 49 48 13 13
6. **Kalou Pièces Auto** — très gros annonceur, toutes marques — 07 01 75 62 76
7. **Auto détachées toute marques** — neuf & casse, toutes marques — 07 06 27 27 49
8. **WEHBE AZ AUTO PARTS** — Kia/Hyundai, 40 ans — 07 69 21 20 21
9. **Esm pièces auto** — multimarques premium, gros volume — 07 17 15 77 02
10. **JAPKO pièces auto** — japonais/coréen, 1,2K abonnés — 07 18 44 44 48

**🟠 Tier 2 — vendeurs solides & spécialistes** : IKGOD, Kama, Sky Auto, SMS BMW-Mercedes, Ade (Honda), Emmason, TSF (carrosserie), Pro Catalyseur (échappement), Profleet (batteries+moteurs), Cartex, Soum, David, Mk, toure, Noor, Auto One, + **3H Autoparts** & **Global Auto** (déjà dans le pipeline de scraping).

**🟡 Tier 3 — vitrage & accessoires** : les 5 du segment vitrage + les 8 accessoires/tuning.

**🔵 Sourcing / veille (pas onboarding direct)** : Z-tech, Export trade, Universelle Import Export, Xinruida ; signaux Toyota CI & Kul Digital.

## Vendeurs locaux (Côte d'Ivoire)

| Vendeur | Marques / spécialité | Types de pièces | Contact | Localisation | Annonce |
|---|---|---|---|---|---|
| **3H Autoparts** | BOSCH (revendeur agréé) + multimarques | Pièces BOSCH authentiques, pièces générales | +225 07 67 89 34 59 | Angré 8e Tranche ; Marcory Zone 4 | [Ad](https://www.facebook.com/ads/library/?id=1128626452725294) |
| **Global Auto** | Mitsubishi (origine) | Amortisseurs, plaquettes, feux, évaporateurs, boîtiers papillon | WhatsApp 0150500011 | Abidjan (global-auto.online) | [Ad](https://www.facebook.com/ads/library/?id=1643039233267845) |
| **Esm pièces auto** | Mercedes, BMW, Suzuki, Hyundai, Kia, Mitsubishi, Range Rover | Frein, amortisseurs, filtres, bougies, pare-chocs, feux, courroies (occ. & neuf) | WhatsApp +225 07 17 15 77 02 | Côte d'Ivoire (livraison) | [Ad](https://www.facebook.com/ads/library/?id=1745794686399721) |
| **JAPKO pieces auto** | Japonais & Coréen | Pièces japonaises/coréennes | WhatsApp 07 18 44 44 48 · [page FB](https://www.facebook.com/100063807512913/) | Treichville Av. 8 rue 25 (Chez Ali Abdallah) | [Ad](https://www.facebook.com/ads/library/?id=644309498754551) |
| **Ade Pieces Auto** | Honda | Pièces Honda neuves/certifiées | WhatsApp 07 07 82 89 27 · [page FB](https://www.facebook.com/adepiecesauto) | Koumassi Remblais ; Abatta | [Ad](https://www.facebook.com/ads/library/?id=25492564870347379) |
| **TSF SARL** | KIA & Hyundai (carrosserie) | Pare-chocs, phares, feux, calandres, rétroviseurs, ailes, capots | 07 09 74 44 37 / 01 01 68 90 40 | Yopougon Sablé (pharmacie les Oliviers) | [Ad](https://www.facebook.com/ads/library/?id=2083792775893644) |
| **Kalou Pièces Auto** (kalouba pièce) | Toutes marques (Mazda, Toyota, Hyundai, Honda, Peugeot, Suzuki, Renault, Nissan, Isuzu, Mitsubishi, Kia, GMC, Mercedes…) | Pièces détachées toutes marques | +225 07 01 75 62 76 / 05 56 87 20 10 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=1327167269119540) |
| **SMS Pièces Auto Bmw-mercedes** | BMW, Mercedes, Mini Cooper | Pièces d'origine + entretien/réparation | 07 78 57 56 35 / 07 07 57 70 57 | Yopougon (Carrefour Sipim) | [Ad](https://www.facebook.com/ads/library/?id=1286741479765546) |
| **IKGOD Global Pièces Auto** | Land/Range Rover, Jaguar, Chevrolet, Kia, Hyundai, Suzuki | Large gamme (gros & détail) | 05 54 45 33 33 · [page FB](https://www.facebook.com/61561546539599) | Côte d'Ivoire (livraison) | [Ad](https://www.facebook.com/ads/library/?id=1950934745553407) |
| **Profleet Ci** | BOSCH batteries, toutes marques | Batteries 45→225AH (AGM & SLI), VL & PL + **moteurs & boîtes** (neuf/occasion) | 07 99 55 55 75 | Abidjan – Zone 4 | [Ad](https://www.facebook.com/ads/library/?id=2036728650596790) |
| **Noor Auto Design** | Multimarques (carrosserie) | Tôlerie, peinture, remplacement pièces | +225 05 96 89 04 24 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=2141619696628754) |
| **Pro catalyseur** | Multimarques (échappement) | Catalyseurs, pots, silencieux, sonde lambda, collecteurs | 0160125088 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=946325744984030) |
| **Cartex Center** | Multimarques | Pièces détachées (large gamme) | 01 41 86 84 49 | Cocody Angré (100m commissariat 22e) | [Ad](https://www.facebook.com/ads/library/?id=2262976750897707) |
| **Dav Pièces détachées** | Voitures chinoises (Haval, BYD, Changan) | Mécanique & tôlerie sur référence | WhatsApp +225 05 84 07 09 18 | Abidjan (livraison 10 j) | [Ad](https://www.facebook.com/ads/library/?id=863053572795265) |
| **Sky Auto** | Multimarques (origine) | Moteurs, pompes essence, boîtes vitesses, amortisseurs, pare-chocs, phares | 0707344432 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=1917786628940788) |
| **Kama pièces auto** | Mercedes, BMW, Range Rover, Audi, Golf | Moteur, suspension, freinage, vidange, accessoires | 05 05 28 74 60 / 07 88 63 07 40 | 2 Plateaux Bleu Marine | [Ad](https://www.facebook.com/ads/library/?id=842462165566503) |
| **Soum auto** | Toutes marques | Pièces neuves & d'origine | 0759336942 / 0504037890 | Abobo N'dotre | [Ad](https://www.facebook.com/ads/library/?id=910846268640379) |
| **SMS-Société Multi services** | Great Wall, Haval (chinoises) | Pièces détachées | 0566227791 / 0778990313 | Yopougon (pharmacie Tereza) | [Ad](https://www.facebook.com/ads/library/?id=1641715776908278) |
| **Auto détachées toute marques** | Toutes marques (neuf & casse) | Pièces neuves & de casse ; mécaniciens sur site | 0706272749 / 0173277518 | Abidjan (livraison CI + extérieur) | [Ad](https://www.facebook.com/ads/library/?id=943504001545340) |
| **SOLUXECAR** | Multimarques (centre auto) | Lavage/detailing, carrosserie, mécanique + commande express pièces | 05 05 19 57 52 / 05 56 48 60 76 | M'badon (face UIPA) | [Ad](https://www.facebook.com/ads/library/?id=844709444875236) |
| **KAB service automobile** | Chinoises + japonaises (Suzuki, Haval, Changan, Toyota) | Demi-moteur, pare-chocs, phares, feux, ailes, coffre, support moteur | WhatsApp 05 06 84 08 70 | Abidjan (livraison) | [Ad](https://www.facebook.com/ads/library/?id=1528567052259651) |
| **Emmason pièce auto** | Suzuki, Toyota, Mitsubishi, Mazda | Pièces détachées (japonaises) | WhatsApp 05 08 91 87 91 · [page FB](https://www.facebook.com/61561749957193) | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=3742701852545898) |
| **Mk pièce auto** | Toutes marques | Pièces mécaniques + accessoires | WhatsApp 0789886981 (Mr Koné) | Abidjan (livraison CI) | [Ad](https://www.facebook.com/ads/library/?id=2433009287178474) |
| **toure service automobile** | Multimarques | Pièces détachées + autoradios Android (hybride) | 05 66 46 01 46 | Côte d'Ivoire | [Ad](https://www.facebook.com/ads/library/?id=1512329516960419) |
| **WEHBE AZ AUTO PARTS** | Kia & Hyundai (spécialiste, 40 ans) | Pièces neuves & importées | 07 69 21 20 21 | Abidjan – Zone 4 | [Ad](https://www.facebook.com/ads/library/?id=2295449964321083) |
| **Unipièces** | Multimarques + **chinoises** (Changan, Jetour, MG) ; pièces certifiées premium | Moteur, entretien, pièces certifiées | 05 03 77 50 40 | Zone 4 / Marcory (Imm. H&A) | [Ad](https://www.facebook.com/ads/library/?id=1304412025232196) |
| **David auto parts** | Toutes marques | Pièces auto toutes marques | WhatsApp 0586403841 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=2896356267392080) |
| **Auto One Abidjan** | Multimarques (boutique auto) | Profil à préciser (boutique auto Angré) | WhatsApp 0170060606 | Angré | [Ad](https://www.facebook.com/ads/library/?id=1730883321413005) |
| **Melhem Auto Service** | Toutes marques (incl. Haval, Changan) | **Spécialiste boîtes automatiques** (vente + réparation) | WhatsApp 0749481313 | Rivièra Palmeraie | [Ad](https://www.facebook.com/ads/library/?id=1759365545231286) |

## Segment vitrage / pare-brise (vente + pose à domicile)

Niche cohérente trouvée via `pare-brise` (en filtrant les nombreux dropshippers « kit réparation fissure »).

| Acteur | Offre | Contact | Localisation | Annonce |
|---|---|---|---|---|
| **CAR GLASS CI** | Remplacement pare-brise à domicile | 07 89 24 45 24 | Abobo (Pharmacie Providence) | [Ad](https://www.facebook.com/ads/library/?id=981638704231215) |
| **Impérial Pare-brise** | Vente gros/détail + pose : pare-brise, carreaux portières, lunette arrière, toutes marques | 0715512476 / 0505095423 | Abobo Banco | [Ad](https://www.facebook.com/ads/library/?id=1232347428796537) |
| **King's Auto Glass** | Vente gros/détail + pose, toutes marques | 07 78 08 15 40 / WhatsApp 0171556104 | Yopougon (garage CIE, face Bon Prix) | [Ad](https://www.facebook.com/ads/library/?id=1850372412605908) |
| **Pare Brise Express CI** | Remplacement à domicile | WhatsApp 07 04 00 79 91 | Abidjan (Cocody) | [Ad](https://www.facebook.com/ads/library/?id=1138697141661387) |
| **AUTO Pare-brise** | Remplacement pare-brise/vitres à domicile | 05 56 56 57 85 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=2034972087901786) |

## Segment accessoires / multimédia / tuning (adjacent — pas pièces mécaniques)

Trouvés via `accessoires auto`. Segment distinct (déco, autoradio Android, tuning) mais utile à connaître.

| Acteur | Spécialité | Contact | Localisation | Annonce |
|---|---|---|---|---|
| **CHIC AUTO STORE** | Tuning/carrosserie sport (BMW E46) : lames, becquets, diffuseurs, calandres, pare-chocs M-Tech, bas de caisse, embouts échappement | WhatsApp 0787056582 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=1187869786721391) |
| **Moné accessoires** | Autoradios écrans Android/CarPlay, alarmes, appui-têtes écrans | 0704915309 / 0789048169 | 2 Plateaux (rue K54) | [Ad](https://www.facebook.com/ads/library/?id=2482760902163301) |
| **Roi des écrans** | Autoradios écrans Android, caméra de recul | 0574450550 | Angré (nouveau CHU) | [Ad](https://www.facebook.com/ads/library/?id=1764791617830529) |
| **Accessoires Auto FR** | Housses de sièges, garde-boue | WhatsApp 0769159403 | Angré Oscars (rue 120) | [Ad](https://www.facebook.com/ads/library/?id=1449427963225364) |
| **Auto Afrika** / Business Booster | Habillages sièges cuir, tapis de sol | 0545174206 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=990803596981139) |
| **Auto STYLE** | Tapis de sol toutes marques | 0556954533 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=3899492897011570) |
| **BoomStore** | Tapis, marchepieds, protections, déco | via page FB | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=948080681406949) |
| **ci pièces** | Outillage mécanique | 0708389934 / 0151527831 | Abidjan | [Ad](https://www.facebook.com/ads/library/?id=988656073849181) |

## Acteurs import/export internationaux (hors périmètre vendeurs locaux)

| Acteur | Profil | Contact | Annonce |
|---|---|---|---|
| **Export trade of auto parts** | Grossiste import (Mercedes/BMW/Audi/Land Rover/Porsche), fourniture directe garages | WhatsApp (CTA) | [Ad](https://www.facebook.com/ads/library/?id=1203887401684802) |
| **Universelle Import Export** (Balora Hamidou) | Broker import Chine/Corée/Japon (véhicules, pièces, engins) | +226 75 24 74 73 / +86 151 12124415 | [Ad](https://www.facebook.com/ads/library/?id=1458903348782829) |
| **Xinruida Auto Export** | Export véhicules d'occasion chinois (pas pièces) | WhatsApp (CTA) | [Ad](https://www.facebook.com/ads/library/?id=2060855771501238) |
| **Z-tech_Auto** | Pièces d'origine premium (Mercedes, Jaguar, Range Rover, Toyota, BMW, Lexus, Porsche…) : moteurs, boîtes, suspension, crémaillères. Basé Burkina, livre CI/Mali/Gabon/Congo | +226 62 18 12 15 / 76 20 77 56 ; WhatsApp +1 514-604-2651 | [Ad](https://www.facebook.com/ads/library/?id=962028199790922) |

## Signaux marché (pas des vendeurs — utiles pour la stratégie)

| Acteur | Signal | Annonce |
|---|---|---|
| **Toyota Côte d'Ivoire** | Canal officiel OEM (CFAO) — campagne « Pièces d'Origine » anti-contrefaçon. Confirme la sensibilité du marché à l'authenticité des pièces. | [Ad](https://www.facebook.com/ads/library/?id=1068017456402336) |
| **Kul Digital** | Vend un **SaaS de gestion de stock pour boutiques de pièces auto** (kuldigital.com). Indique un besoin réel de digitalisation chez ces vendeurs — exactement la douleur que la marketplace adresse. | [Ad](https://www.facebook.com/ads/library/?id=961660940198548) |

## Limites & pistes pour aller plus loin

- Couvre **6 mots-clés** et les **annonces actives** seulement.
  - `auto parts` (anglais) = surtout e-commerçants internationaux (ex. Bevinsee) ciblant la CI, peu de local → écarté.
  - `casse auto` = très bruité (promos « prix cassé », série « DRIFTE le mécanicien ») → 1 seul nouveau (CAR GLASS CI).
  - `moteur occasion` = idem, saturé de bruit → rien d'exploitable de nouveau.
- **Recherches par marque/organe faites** (`pièces toyota/hyundai/mercedes`, `amortisseur`, `embrayage`, `boîte de vitesse`, `pare-brise`). Apprentissages :
  - `pièces toyota` / `pièces hyundai` / `embrayage` → productifs (WEHBE, Unipièces, KAB, Emmason, Mk, David, Z-tech…).
  - `pièces mercedes` / `pièces bmw` → **0 nouveau** : re-sortent les multi-marques déjà recensés (Esm, SMS, Kama, Z-tech).
  - `pare-brise` → tout un segment **vitrage** (5 acteurs), noyé dans des dropshippers « kit réparation fissure ».
  - `amortisseur` / `boîte de vitesse` → faible signal (gadgets, concessionnaires, dramas).
- **Rendements décroissants atteints** sur les mots-clés génériques et marques courantes (chinoises incluses : `changan`, `byd`, `haval`, `voiture chinoise` faits).
- **Numéros WhatsApp derrière CTA : enrichis via les pages FB des annonceurs** (le lien du bouton CTA n'est pas exposé dans l'Ad Library ; la section *Contact/Intro* de la page publie le n°). Récupérés ainsi : JAPKO (07 18 44 44 48), Ade (07 07 82 89 27), Emmason (05 08 91 87 91). IKGOD ne publie pas de n° sur sa page → n° du texte conservé. Méthode : ouvrir l'annonce `?id=<LibraryID>` → l'URL redirige avec `view_all_page_id=<pageId>` → `facebook.com/<pageId>/about`.
- Le numéro WhatsApp exact derrière un bouton CTA (ex. JAPKO, Ade, IKGOD) n'est pas toujours dans le texte — récupérable en ouvrant l'annonce / la page (étape d'enrichissement).
- Screenshots figés non joints (l'extension les stocke en sandbox non déplaçable vers le repo) — les **permaliens Ad Library** jouent ce rôle, en mieux. Si tu veux malgré tout un dossier d'images, je peux les capturer et te les afficher dans le fil un par un.
