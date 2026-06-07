# CEO Bible — Pièces

**Public** : un·e nouveau·elle CEO qui reprend Pièces demain matin.
**Objectif** : 0 → vision claire + plan d'action 24 mois en une journée de lecture. Tout ce qu'il faut pour servir le marché, imposer Pièces comme **référence absolue** de la pièce détachée à Abidjan, et **dominer la verticale VTC** avant d'étendre à BTP, logistique, et au reste de la sous-région.

> **Avant de toucher quoi que ce soit** : lis ce document en entier, puis [`CTO_BIBLE.md`](CTO_BIBLE.md) (ce que la machine sait faire) et [`DESIGN.md`](../DESIGN.md) (les règles non-négociables côté produit). Les trois sont load-bearing.

---

## 1. La thèse en 90 secondes

Le marché ivoirien de la pièce auto est **massif, fragmenté, opaque, et 100% informel**. À Adjamé, Yopougon, Marcory, Koumassi, des milliers de vendeurs vendent des pièces neuves, d'occasion importées (Japon, Dubai), ré-usinées et aftermarket — sans catalogue, sans prix affichés, sans garantie, sans facture, sans traçabilité. Le mécanicien perd 2 à 4 heures par pièce à faire le tour des cantines. Le propriétaire paie 30 à 60% trop cher parce qu'il ne sait pas. Le gestionnaire de flotte VTC perd **30 000 à 50 000 FCFA par jour et par véhicule immobilisé**.

**Pièces résout les trois douleurs avec un seul produit** :
1. **Marketplace tripartite** (mécanicien identifie → propriétaire paie → vendeur livre) avec **escrow Mobile Money**, garantie, traçabilité.
2. **Fleet Suite B2B** (Flotte Pro / Pro +) qui transforme l'achat de pièces en **pilotage de coût total de possession** pour les flottes VTC, BTP, logistique.
3. **Programme Liaison** qui digitalise les vendeurs informels sans qu'ils aient besoin d'un smartphone — **agents terrain qui sont notre douve concurrentielle**.

**La fenêtre d'opportunité est maintenant**. Aucun acteur n'a tenu la combinaison « marketplace + flotte + onboarding terrain » à Abidjan. Les pure-players e-commerce (Jumia, Glovo Auto) ont échoué sur la pièce détachée parce qu'ils ne comprennent ni le mécanicien, ni le vendeur d'Adjamé. Les gestionnaires de flotte (Yango, Treepz, Heetch sur leur partie VTC, ainsi que les BTP et transporteurs) bricolent sur Excel ou ne pilotent pas. **Celui qui prend le marché VTC en 18 mois prend le marché national en 36.**

**Notre objectif** : 5 000 véhicules VTC sous abonnement Flotte Pro / Pro + d'ici fin 2027, 25 000 transactions marketplace / mois, et la position de **standard de fait** pour la facturation normalisée DGI sur la pièce auto.

---

## 2. Le marché — taille, structure, dynamique

### 2.1 Taille du marché (estimations internes, à raffiner avec la DGI et le MTI)

| Segment | Volume | Dépense moyenne pièces/an | Marché annuel (FCFA) |
|---|---|---|---|
| Parc particulier Abidjan | ~600 000 véhicules | 180 000 F | ~108 Mds F |
| VTC Abidjan (Yango, Heetch, Treepz, indépendants) | ~25 000 véhicules | 450 000 F | ~11 Mds F |
| Taxis communaux (orange / woro-woro) | ~18 000 véhicules | 350 000 F | ~6 Mds F |
| Transport collectif (gbaka, minicars) | ~12 000 véhicules | 600 000 F | ~7 Mds F |
| BTP / engins légers Abidjan | ~8 000 véhicules | 1 200 000 F | ~10 Mds F |
| Flottes corporate (banques, telco, distrib.) | ~15 000 véhicules | 350 000 F | ~5 Mds F |
| **Total Abidjan adressable** | **~678 000 véhicules** | | **~147 Mds F/an** |

Ajoute San Pedro, Bouaké, Yamoussoukro, Korhogo → **marché national ~210 Mds F/an** sur la pièce détachée seule. La maintenance complète (pièces + main-d'œuvre) double ce chiffre.

**Notre TAM réaliste à 5 ans** : 15 à 20% du marché ivoirien intermédié par Pièces, soit **30 à 40 Mds F de GMV/an**. À une take rate combinée (commission + abonnement + facturation) de 9 à 12%, cela donne un revenu net Pièces de **3 à 5 Mds F/an** (~5 à 8 M USD).

### 2.2 Structure de l'offre — 5 catégories de vendeurs

1. **Cantines d'Adjamé / Yopougon** (~3 000 acteurs estimés). Vendeurs informels, sans stock système, paiement cash, pas de facture. Notre cible Liaison prioritaire.
2. **Importateurs grossistes** (~150 acteurs). Conteneurs Japon / Dubai / Belgique, capacité de stock, parfois RCCM. Cible Flotte Pro côté approvisionnement.
3. **Ré-usineurs / rectifieurs** (~80 acteurs). Vilebrequins, culasses, boîtes — savoir-faire rare et sous-valorisé. Premium pricing possible avec garantie Pièces.
4. **Concessionnaires officiels** (Toyota, Nissan, Hyundai, etc.). Pièces neuves OEM, prix élevés, garantie constructeur. Notre concurrent direct sur le segment haut, partenaire potentiel sur la couverture.
5. **Casses / démolisseurs** (~40 acteurs structurés). Pièces de récupération sur carcasses, prix attractif, volume limité.

### 2.3 Structure de la demande — 4 acheteurs types

| Persona | Volume | Sensibilité prix | Sensibilité urgence | Sensibilité confiance |
|---|---|---|---|---|
| Mécanicien indépendant | 70% des transactions | Très élevée | Élevée | Moyenne (réseau perso) |
| Propriétaire particulier | 60% du GMV | Élevée | Moyenne | Très élevée |
| Gestionnaire flotte VTC | 8 à 12% du GMV (croissance forte) | Moyenne | **Critique** | Élevée |
| Gestionnaire flotte BTP / corporate | 15 à 20% du GMV | Faible (priorité disponibilité) | Élevée | Critique (conformité fiscale) |

**Insight stratégique** : les flottes paient pour comprendre où part leur argent (intelligence) et pour ne pas perdre une journée (SLA), beaucoup moins pour des notifications de plus. Le pricing flotte capte la valeur, pas la fonctionnalité.

---

## 3. Concurrence — qui est là, qui ne l'est pas

### 3.1 Concurrents directs (marketplace pièces)

- **Aucun acteur structuré à l'échelle nationale**. Quelques pages Facebook (« Pièces Auto Abidjan »), groupes WhatsApp informels, et tentatives ponctuelles e-commerce qui n'ont pas tenu. Recensement à jour : ~48 acteurs Facebook dont 29 vendeurs pièces CI (`_bmad-output/planning-artifacts/facebook-vendeurs/`, 2026-05-29).
- **global-auto.online** : le seul concurrent avec un vrai catalogue web structuré (API publique). On en a **miroité l'intégralité dans notre catalogue** au 2026-05-29 (3 780 références prix + arbre véhicules complet) — non comme cession à l'adversaire, mais comme **veille prix permanente + couverture catalogue jour 1**. Stratégiquement : on connaît leurs prix en continu, eux pas les nôtres.
- **Jumia / Glovo / Yango Tech** : pas de catalogue pièces, pas d'expertise verticale. Ne sont pas une menace à court terme mais pourraient acquérir un acteur établi à 24-36 mois.

### 3.2 Concurrents indirects (flotte)

- **Excel + WhatsApp + carnet papier** : le concurrent réel sur 90% des flottes. Notre vrai job : prouver qu'on rend ce stack obsolète sans demander un changement de comportement brutal.
- **Yango Fleet, Bolt Fleet, Heetch Pro** : outils de gestion de course, pas de gestion de coût pièces. Partenariats potentiels (intégration API pour les conducteurs).
- **Logiciels de fleet management européens** (Fleetio, Geotab) : trop chers, trop génériques, pas localisés (pas de FCFA, pas de fournisseurs CI, pas de FNE-CI).

### 3.3 Concurrents sur le service additionnel

- **Garages enseigne** (Speedy, Norauto via partenariats) : concurrents sur la prestation main-d'œuvre, pas sur la pièce. Partenaires probables pour le réseau de centres agréés.
- **Concessionnaires officiels** : concurrents sur la garantie constructeur, mais hors de prix pour les véhicules de plus de 5 ans (90% du parc). On capture ce qu'ils ne servent pas.

### 3.4 Notre douve concurrentielle (durable)

1. **Le réseau Liaison** — agents terrain Adjamé/Yopougon. Reproductible en 12-18 mois par un copieur bien financé, donc **on doit en avoir 80 dans 12 mois**.
2. **La data fitments Côte d'Ivoire** — quelles pièces correspondent à quels véhicules locaux (Toyota Corolla 2008 importée Belgique vs 2012 importée Japon : pièces différentes). Sous-produit du flux IA Gemini + vérification mécanicien. **Cette base devient inattaquable à 100 000 transactions.**
3. **L'escrow Mobile Money + garantie Pièces** — confiance institutionnelle dans un marché 100% méfiance. Difficile à copier sans capital.
4. **La conformité FNE-CI native** — premier acteur à émettre des factures normalisées DGI sur la pièce. Verrou réglementaire fort pour les flottes corporate et BTP qui doivent justifier leur TVA.

---

## 4. Positionnement et proposition de valeur

### 4.1 Le pitch — une phrase par persona

- **Mécanicien** : « Identifie la pièce avec ton téléphone, je trouve le meilleur prix à Adjamé, je livre, tu touches ta commission. »
- **Propriétaire** : « Tu sais ce que tu paies, tu paies en Mobile Money, tu es garanti, tu reçois ta facture. »
- **Gestionnaire VTC** : « Tu vois où part chaque franc, on te livre en 4 heures quand un véhicule est immobilisé, et tes factures sortent prêtes pour le comptable. »
- **Vendeur Adjamé** : « Un agent vient chez toi, photographie ton stock, le publie en ligne. Tu reçois des clients via WhatsApp sans changer comment tu travailles. »
- **Liaison** : « Tu gagnes une commission sur chaque vente que tu déclenches pour les vendeurs que tu as onboardés. »

### 4.2 Positionnement marque

**Pièces n'est pas un site e-commerce. Pièces est l'infrastructure de confiance de la pièce auto en Côte d'Ivoire.**

Trois mots à graver dans toute communication :
- **Transparence** (prix affiché, condition de la pièce affichée — chip neuf/occasion/ré-usinée/aftermarket/OEM **non négociable**, breakdown des frais explicite avant paiement).
- **Vitesse** (SLA 4h Flotte Pro +, livraison standard J+1 à Abidjan).
- **Conformité** (escrow, garantie, facture normalisée DGI).

### 4.3 Les non-négociables produit (DESIGN.md)

- **Chips de condition partout** (Neuf, Occasion importée, Ré-usiné, Aftermarket, OEM) — couleur vive, jamais en gris.
- **Breakdown de prix explicite** (prix vendeur / main-d'œuvre / livraison / frais plateforme / total) avant le bouton payer.
- **Tout en français**, devise FCFA, téléphones `+225XXXXXXXXXX`.

Tout ce qui s'éloigne de ces règles trahit la promesse et doit être bloqué en review.

---

## 5. La stratégie en 5 mouvements (24 mois)

### Mouvement 1 — Verrouiller Adjamé / Yopougon (mois 0–6)

**Objectif** : 300 vendeurs onboardés, 80% du stock visible des cantines majeures.

**Comment** :
- Recruter et former **20 Liaisons** (commission 3 à 5% sur ventes générées + fixe modeste).
- Photographier et publier **30 000 pièces** dans le catalogue Pièces.
- Lancer une campagne mécanicien (WhatsApp groups, radio Adjamé) pour générer 200 commandes/jour à fin M6.

**KPI go/no-go** : 150+ commandes/jour à fin M3, 350+ à fin M6.

### Mouvement 2 — Prendre la verticale VTC (mois 3–12)

**Objectif** : 1 500 véhicules VTC sous Flotte Pro / Pro +.

**Comment** :
- **Partenariat Yango** (premier gros volume, ~12 000 conducteurs Abidjan). Offre pilote : 3 mois gratuits Flotte Pro pour 200 conducteurs, ROI mesuré, déploiement masse.
- **Partenariat Heetch + Treepz** en parallèle, modèle similaire.
- **Offre flottes indépendantes** (sociétés VTC propriétaires de 5 à 200 véhicules) : démarchage commercial direct, démo terrain, signature 12 mois.
- **Cas client phare** : sélectionner 3 flottes (50 / 200 / 500 véhicules), instrumenter à fond, publier les économies réalisées (objectif : -18 à -25% sur le budget pièces annuel).

**KPI go/no-go** : 500 véhicules sous abonnement à M9, 1 500 à M12, churn < 5%/mois.

### Mouvement 3 — Devenir le standard FNE-CI sur la pièce (mois 6–15)

**Objectif** : émettre 80% des factures normalisées sur la pièce détachée à Abidjan, devenir un interlocuteur officiel DGI.

**Comment** :
- Finaliser l'intégration FNE-CI (sprint produit dédié, voir CTO Bible).
- Rencontrer la DGI dès la mise en prod (briefing institutionnel, posture « partenaire de la formalisation »).
- Forcer la conformité comme **vente directe aux DAF** des flottes corporate et BTP (qui ont un problème TVA non récupérable aujourd'hui).
- Communication B2B forte : **« Vos chauffeurs achètent leurs pièces ailleurs en cash → vous perdez la TVA. Avec Pièces, vous récupérez 18% de votre budget pièces annuel. »**

**KPI go/no-go** : 5 000 factures FNE-CI émises à M12, 25 000 à M15.

### Mouvement 4 — Étendre au BTP, transport collectif, corporate (mois 12–18)

**Objectif** : +2 500 véhicules sous abonnement (au-delà du VTC).

**Comment** :
- Offre dédiée BTP (déjà cadrée — voir `brochure-btp-grand-compte`) : disponibilité critique, contrats SLA renforcés, pricing Pro + par défaut.
- Offre corporate (banques, telco, distribution) : argument fiscal et conformité prioritaire.
- Offre transport collectif (UNATRCI, syndicats gbaka) : pricing tier intermédiaire, paiement groupé syndical.

### Mouvement 5 — Sortir d'Abidjan, puis du pays (mois 18–24)

**Objectif** : présence opérationnelle à Bouaké, San Pedro, Yamoussoukro. Pilote Dakar ou Cotonou.

**Comment** :
- Reproduire le modèle Liaison sur Bouaké (4 agents, 100 vendeurs, 6 mois).
- Pilote sous-régional dans une ville où le modèle Mobile Money + parc auto similaire fonctionne (Dakar avec Wave et Orange Money, Cotonou via MTN MoMo).
- Recrutement d'un Country Manager Sénégal ou Bénin à M18.

**KPI go/no-go** : 600 véhicules abonnement hors Abidjan à M24, pilote pays #2 lancé.

---

## 6. Modèle économique — comment Pièces gagne de l'argent

### 6.1 Quatre flux de revenus

| Flux | Mécanique | Cible mature (an 3) |
|---|---|---|
| Commission marketplace | 5 à 10% côté vendeur, prélevée à l'escrow release | 45% du revenu |
| Abonnement Flotte Pro | 5 000 F / véhicule / mois | 35% du revenu |
| Abonnement Flotte Pro + | 10 000 F / véhicule / mois (SLA 4h, urgence) | 15% du revenu |
| Service facturation / conformité | Forfait FNE-CI pour flottes hors abonnement, prestations sur-mesure | 5% du revenu |

### 6.2 Unit economics — les chiffres à connaître par cœur

- **Panier moyen marketplace** (objectif an 1) : 32 000 F, take rate 8% → 2 560 F de revenu net Pièces.
- **CAC mécanicien** (objectif) : < 1 500 F (organique + Liaison).
- **CAC flotte VTC indépendante** : 25 000 à 60 000 F (commercial terrain + démo).
- **LTV Flotte Pro** (24 mois moyen, 5 000 F/véhicule/mois, churn 4%/mois) : ~85 000 F par véhicule.
- **Ratio LTV/CAC cible** : > 4 sur tous les segments dès M12.

### 6.3 Path to profitability

- M0–M6 : burn maximum (Liaison, commercial flotte, capex produit).
- M7–M12 : revenu net mensuel > 25 MF à M12, encore en burn.
- M13–M18 : break-even opérationnel Abidjan à M18 (objectif).
- M19–M24 : burn re-mobilisé pour expansion nationale / sous-régionale.

---

## 7. GTM — go-to-market opérationnel

### 7.1 Acquisition vendeurs (offre)

**Canal #1 — Liaison terrain (80% du sourcing)**.
- Recrutement local (jeunes 22-30 ans, smartphone, motivation commission).
- Formation initiale 3 jours (photo, app Liaison, posture, négociation commission vendeur).
- Quota : 15 vendeurs onboardés / mois et par Liaison à régime de croisière.
- Rémunération : fixe modeste (50 000 F/mois) + commission 3 à 5% sur ventes générées par leurs vendeurs onboardés. Plafond commissionable défini server-side, jamais affiché comme « recommandation » (voir `memory/feedback-liaison-commission.md`).

**Canal #2 — Partenariats associations**.
- UNATRCI, syndicats vendeurs Adjamé, chambres consulaires. Légitimité institutionnelle = porte ouverte sur les cantines historiques.

**Canal #3 — Bouche-à-oreille vendeur**.
- Programme de parrainage vendeur → vendeur (5 000 F par vendeur amené qui fait sa première vente).

### 7.2 Acquisition mécaniciens / particuliers (demande)

**Canal #1 — WhatsApp et groupes mécaniciens**.
- 200+ groupes WhatsApp mécaniciens identifiés. Animation par community managers (2 ETP à M6), contenu utile (tutos identification pièces), pas de spam.

**Canal #2 — Radio populaire et affichage Adjamé / Yopougon**.
- Radio Yopougon, Radio Treichville, panneaux affichage cantines. Message simple : « Pièces.ci — la pièce qu'il te faut, au juste prix, livrée. »

**Canal #3 — Bot WhatsApp officiel Pièces**.
- Point d'entrée n°1 pour mécaniciens et propriétaires non équipés. À pousser via QR code sur factures, packaging, communication.

**Canal #4 — Réseau Liaison** (les Liaisons recommandent Pièces aux mécaniciens qu'ils croisent en cantine).

### 7.3 Acquisition flottes (B2B)

**Canal #1 — Vente directe (account executive senior)**.
- 1 AE senior à M3, 3 AE à M9.
- ICP prioritaire (mois 3-9) : sociétés VTC indépendantes 20 à 200 véhicules, gérants joignables, douleur cash flow / immobilisation forte.
- Cycle de vente cible : 21 jours signature, pilote 30 jours, déploiement 60 jours.

**Canal #2 — Partenariats plateformes VTC**.
- Yango, Heetch, Treepz : offre intégrée pour les conducteurs partenaires. Modèle revenue share si nécessaire.

**Canal #3 — Réseaux DAF / experts-comptables**.
- L'argument FNE-CI / récupération TVA / optimisation fiscale ouvre les portes des cabinets comptables. Programme de prescription : 2 à 3% de commission sur abonnements générés.

**Canal #4 — Événements pro**.
- Salon Auto Abidjan, événements UNATRCI, déjeuners DAF. Présence physique = signal de sérieux pour le segment corporate.

---

## 8. Organisation cible — équipe à 12, 24 et 36 mois

### 8.1 Équipe M12 (~25 personnes)

| Pôle | ETP | Rôles clés |
|---|---|---|
| CEO / direction | 2 | CEO, Chief of Staff |
| Produit & Tech (CTO bible) | 6 | CTO, 3 ingés full-stack, 1 designer, 1 data |
| Commercial flotte | 5 | Head of Sales B2B, 3 AE seniors, 1 SDR |
| Liaison & Ops terrain | 8 | Head of Liaison, 2 superviseurs, ~25 Liaisons à temps partiel |
| Support & succès client | 3 | Head of Support, 2 agents (WhatsApp + appels) |
| Finance & légal | 1 | DAF mi-temps, conseil juridique externalisé |

### 8.2 Équipe M24 (~55 personnes)

Ajouts clés :
- Country Manager Bouaké, Country Manager sous-régional.
- VP Sales, VP Operations.
- Marketing director (acquisition demande + brand).
- Compliance officer (FNE-CI, DGI, autorité de protection des données).
- Doublement Liaison et commercial.

### 8.3 Premiers recrutements prioritaires (M0–M3)

1. **Head of Liaison** (l'arme stratégique — recrute soit un ancien ops Jumia/Glovo, soit un cadre commercial expérimenté Adjamé).
2. **Head of Sales B2B** (cycle long, profil senior FCFA / corporate Abidjan).
3. **Chief of Staff CEO** (exécution multi-fronts, reporting board, hiring).
4. **CTO confirmé** (voir CTO Bible pour le plan tech).

---

## 9. Financement — combien, quand, pour quoi

### 9.1 Hypothèse de levée

- **Seed étendu M0–M6** : 600 000 à 1 200 000 USD. Investisseurs cibles : VC pan-africains (Partech, Janngo, Ventures Platform, P1, AAIC) + family offices ivoiriens.
  - Affectation : 35% Liaison/ops terrain, 25% commercial B2B, 25% produit/tech, 15% runway.
- **Série A M15–M18** : 4 à 7 M USD si trajectoire VTC tenue (1 500+ véhicules à M12).
  - Affectation : expansion nationale et sous-régionale, BTP/corporate, FNE-CI scale.

### 9.2 Conditions de validation entre les deux tours

- 200+ commandes/jour à M6, 600+ à M9.
- 1 500 véhicules sous abonnement à M12.
- GMV mensuel > 250 MF à M12.
- Marge brute > 30% sur le revenu net à M12.
- Churn flotte < 5%/mois.

### 9.3 Alternatives non-equity

- **Revenue-based financing** local (banques ivoiriennes via lignes garanties Bpifrance / IFC) pour financer le besoin en fonds de roulement Liaison.
- **Subventions FCS / GIZ / Proparco** pour la formation Liaison (impact emploi jeunes, formalisation économie informelle).
- **Partenariats prêt-bailleurs** (Total, Vivo Energy, Yango) pour cofinancer l'acquisition flotte.

---

## 10. Risques majeurs et plans de contournement

| Risque | Probabilité | Impact | Plan |
|---|---|---|---|
| **Réplication du modèle Liaison par un acteur capitalisé** (Jumia auto, Yango Garage) | Moyenne | Élevé | Verrouillage 12 mois : exclusivité contractuelle avec 80% des vendeurs top Adjamé, données fitments propriétaires |
| **Régulation DGI hostile à un acteur privé sur la FNE-CI** | Faible | Élevé | Briefing institutionnel pré-lancement, posture partenariat, transparence totale, employer un ancien DGI comme conseiller |
| **Échec du SLA 4h Flotte Pro +** (livraison non tenable) | Élevée si non préparé | Élevé | Investissement réseau livreurs dédié, stock tampon partenaires, sandbagging du SLA promis vs SLA opérationnel |
| **Fraude vendeur / fausse pièce vendue OEM** | Élevée | Critique pour la marque | Garantie Pièces couvrant 100% du remplacement, fonds de garantie provisionné, ban vendeur immédiat sur 1 fraude avérée |
| **Risque change FCFA / euro** sur pièces importées | Moyenne | Moyen | Hedge naturel (revenus en FCFA, achats vendeurs en FCFA), monitoring trimestriel |
| **Dépendance Mobile Money** (panne CinetPay, panne Orange Money) | Faible mais ponctuelle | Élevé temporaire | Multi-PSP (Wave + CinetPay + Mobile Money direct), fallback COD documenté |
| **Sécurité Liaison terrain** (rackets, agressions, fraudes internes) | Moyenne | Moyen | Procédures de cash collection, équipement sécurité, ratio supervisor / Liaison < 1/10, contrôles inopinés |
| **Dépendance Supabase / Render / Cloudflare** (BSP fournisseurs étrangers) | Faible | Moyen | Audit annuel, plan B documenté côté CTO Bible, données sauvegardées hors fournisseur |
| **Burn supérieur au plan** | Moyenne | Élevé | Revue mensuelle cash, milestones de levée série A clairement définis, scénario downside avec runway 18 mois minimum |
| **Rotation équipe Liaison** (turnover élevé typique sur ces profils) | Élevée | Moyen | Plan de carrière interne (Liaison → superviseur → AE), bonus annuel sur ancienneté |

---

## 11. KPIs — le dashboard CEO

### 11.1 Vue hebdomadaire (lundi 9h)

- Commandes / jour, GMV / jour, panier moyen.
- Nouveaux vendeurs onboardés cette semaine, total actif.
- Véhicules sous abonnement (Pro / Pro +), MRR flotte.
- NPS mécanicien (sondage post-commande), NPS gestionnaire flotte (sondage mensuel).
- Cash en banque, runway projeté.

### 11.2 Vue mensuelle (board pack)

- GMV mensuel, take rate effective, revenu net.
- Pourcentage GMV via FNE-CI.
- CAC par segment, LTV, ratio LTV/CAC.
- Churn flotte, churn vendeur.
- Burn, runway, % progrès vs milestones Série A.
- SLA livraison tenu (% des livraisons sous engagement).
- Disputes ouvertes / résolues, taux de fraude.

### 11.3 Vue trimestrielle (revue stratégique)

- Part de marché estimée Abidjan (commandes marketplace / commandes parc estimé).
- Top 20 flottes acquises et perdues (qualitatif).
- Avancée mouvements 1-5 vs plan.
- Posture concurrentielle (cartographie réactualisée).
- Roadmap produit T+1 et T+2 validée avec CTO.

---

## 12. Gouvernance — comment décider

### 12.1 Rituels obligatoires

- **Lundi 9h — Standup direction** (CEO + CTO + Head of Liaison + Head of Sales B2B). 25 min, KPI semaine, blocages, décisions.
- **Vendredi 16h — Revue Liaison terrain** (Head of Liaison + 2 superviseurs). Onboarding semaine, incidents, ajustements quotas.
- **Mensuel — All-hands** (1h) + board pack envoyé à J-3.
- **Trimestriel — Off-site stratégique** (1.5 jour) revue mouvements 1-5, ajustement roadmap.

### 12.2 Cadre de décision (qui décide quoi)

- **Décisions produit P0** (changement de prix, suppression d'une feature, breaking change UX) : CEO + CTO + Designer, 48h.
- **Décisions GTM** (lancement campagne, ouverture ville, signature partenariat majeur) : CEO + Head of Sales + Head of Liaison.
- **Décisions tech** (architecture, dépendances majeures, deploy strategy) : CTO seul, info CEO. Voir CTO Bible.
- **Décisions cash > 5 MF** : CEO + DAF, signature double.
- **Décisions cash > 25 MF** : CEO + Board approval.

### 12.3 Board cible

- 5 sièges : 2 fondateurs, 2 investisseurs (1 lead Seed, 1 lead Série A à M18), 1 indépendant (profil ancien dirigeant marketplace Afrique ou ancien DGI / ministère Transports).

---

## 13. Marque, communication, image publique

### 13.1 Promesse de marque

> « Pièces : la pièce qu'il te faut, au juste prix, livrée et garantie. »

Décliné B2B : « Pièces — votre flotte, votre coût, votre contrôle. »

### 13.2 Identité visuelle

Voir `DESIGN.md`. Règles d'or : transparence (chips condition), clarté (breakdown), franc-parler en français ivoirien acceptable (pas trop institutionnel pour le canal mécanicien, plus sobre pour le B2B).

### 13.3 Relations presse et institutionnel

- Prises de parole CEO en français, posture **patriote économique** (formalisation, emplois Liaison, fiscalité juste). Cible : Fraternité Matin, Le Patriote, Jeune Afrique, Africa Business.
- Tribunes thématiques 2 fois par an (économie informelle, transition numérique des PME, formalisation).
- Adhésion CGECI, JCI Côte d'Ivoire, GAPI. Présence visible aux événements ministère Transports, ministère Commerce.

### 13.4 Crisis comms

- Charte de réponse incident (fraude vendeur médiatisée, panne plateforme, accident livreur). Templates pré-validés DAF + juridique.
- Porte-parole unique CEO sur les sujets majeurs.

---

## 14. Conformité et risques légaux

### 14.1 Statut juridique recommandé

- SARL ivoirienne (ou SA si levée Série A > 3 M USD avec actionnaires institutionnels).
- Holding sous-régionale envisageable à M24 pour expansion Sénégal / Bénin.

### 14.2 Obligations courantes à connaître

- **DGI** : déclarations TVA, IS, IRPP des salariés. FNE-CI sur transactions plateforme (cf. mouvement 3).
- **CNPS** : affiliation tous les salariés. Statut Liaison : prestataire ou salarié — à arbitrer avec juriste, impact significatif sur charges.
- **ARTCI** (Autorité Régulation Télécom) : traitement données personnelles, registre des traitements, DPO désigné.
- **Ministère Commerce** : RCCM, agrément éventuel marketplace (à vérifier).
- **Mobile Money** : partenariats agréés (CinetPay agréé, OM, MTN, Wave directs à étudier).

### 14.3 Contrats clés à industrialiser

- CGU mécanicien / propriétaire (validées avocat).
- Contrat vendeur (commission, garantie, exclusivité partielle).
- Contrat Liaison (prestataire indépendant + clause non-concurrence 6 mois).
- Contrat flotte abonnement (SLA, résiliation, clause de réversibilité données).
- Contrat partenaire plateforme VTC.

---

## 15. Roadmap produit — vue CEO (détails CTO Bible)

### 15.1 P0 (M0–M6) — fondations

- Stabilité plateforme, fitments véhicules CI précis, escrow + COD opérationnels.
- App Liaison v2 (mobile-first, offline-tolerant, photo + publish en 90 secondes).
- Dashboard flotte v1 (multi-véhicules, coût par véhicule, alertes).
- Bot WhatsApp officiel (onboarding mécanicien, recherche pièce, suivi commande).

### 15.2 P1 (M6–M12) — monétisation flotte

- Flotte Pro complet (intelligence flotte, automatisation, FNE-CI).
- Flotte Pro + (SLA 4h, urgence, support dédié).
- Module facturation consolidée mensuelle, export FEC.
- API publique flotte (Yango, Heetch, Treepz).

### 15.3 P2 (M12–M18) — différenciation

- Scoring qualité vendeur (production interne, base de données fitments propriétaire).
- Garantie pièce intermédiée scalable (process retours, fonds de garantie).
- Module entretien préventif intelligent (suggestions basées sur l'historique flotte).
- Marketplace main-d'œuvre (réseau garages affiliés) — à arbitrer M12 si focus pièces tient.

### 15.4 P3 (M18–M24) — expansion

- Multi-pays (devise + langue + paiement).
- Module financement crédit pièces flotte (partenariat banque / fintech).
- Place de marché données (rapports sectoriels payants pour assureurs, constructeurs).

---

## 16. Les 10 erreurs à ne pas commettre

1. **Diluer la promesse en couvrant pneus, lubrifiants, accessoires trop tôt**. Pièces de rechange uniquement jusqu'à M18.
2. **Acheter du GMV via coupons agressifs**. Marge brute négative qui ne paie jamais.
3. **Lancer Flotte Pro + sans capacité opérationnelle SLA 4h prouvée**. Promesse non tenue tue le segment B2B en 3 mois.
4. **Surfacturer la facture FNE-CI** au début. C'est un levier d'acquisition, pas un centre de profit immédiat.
5. **Salarier les Liaison trop vite**. Le modèle commission terrain doit faire ses preuves à 20+ Liaisons avant de salarier.
6. **Confondre marketplace e-commerce et marketplace B2B**. Les besoins UI, support, vente, SLA sont différents — équipes distinctes dès M9.
7. **Sous-investir en sécurité côté vendeur** (faux compte, fausse pièce). Une vague de fraude médiatisée tue la marque.
8. **Promettre une couverture nationale avant de tenir Abidjan**. Capital concentré, victoires concentrées.
9. **Sous-estimer la qualité du support WhatsApp** (en temps réel, français ivoirien). C'est notre canal #1, pas un coût à compresser.
10. **Négliger les relations institutionnelles** (DGI, ministère Transports, CGECI). Un acteur de cette taille a besoin d'alliés publics dès M3.

---

## 17. Les 10 victoires à viser dans les 18 prochains mois

1. **600 commandes/jour à M9** — preuve marketplace.
2. **1 500 véhicules sous abonnement à M12** — preuve B2B.
3. **3 cas clients VTC publiables** avec économies chiffrées (-20% budget pièces) — proof market.
4. **Premier contrat BTP grand compte signé** (300+ véhicules) à M12.
5. **Partenariat officiel Yango Côte d'Ivoire** annoncé à M9.
6. **FNE-CI en production** et premier accord cadre DGI à M12.
7. **Série A 4 à 7 M USD bouclée** à M18.
8. **Bouaké opérationnel** (4 Liaisons, 100 vendeurs, 30 véhicules abonnés) à M18.
9. **NPS > 50 mécanicien, > 35 flotte** à M12.
10. **Premier rapport sectoriel Pièces** (data fitments + tendances marché) publié, repris dans presse économique, à M15.

---

## 18. Conclusion — pourquoi ce sera Pièces

Le marché est gigantesque, fragmenté, mal servi. Personne ne combine simultanément la marketplace consommateur, la plateforme flotte B2B, et le réseau terrain Liaison. Personne n'a la conformité FNE-CI native. Personne n'a la base de données fitments Côte d'Ivoire qu'on construit transaction par transaction.

Ces trois éléments cumulés — **demande, offre, conformité** — forment un **monopole défendable à 36 mois** si l'exécution est tenue. La fenêtre se ferme dès qu'un acteur capitalisé pan-africain (Jumia, Yango Garage, un newcomer pétrolier-mobilité) tente la même combinaison. **Notre avance opérationnelle ne tiendra que si nous l'industrialisons maintenant.**

Le rôle du CEO :
- **Vendre l'histoire** (capital, talents, partenaires institutionnels).
- **Tenir l'équipe sur l'exécution des cinq mouvements** sans dispersion.
- **Garder la promesse produit non-négociable** (transparence, vitesse, conformité) même quand l'urgence pousse au shortcut.

Tout le reste — produit, ops, finance — est documenté ici, dans la CTO Bible, dans DESIGN.md, dans le plan d'affaires (`plan-affaires-pieces-2026-06`), et dans les brochures commerciales (`brochure-commerciale-pieces`, `brochure-commerciale-entreprises-2026-06-03`, `brochure-vtc-grand-compte-2026-06-03`, `brochure-btp-grand-compte-2026-05`, `offre-vtc-6000-vehicules-2026-06-03`, `offre-btp-800-vehicules-2026-05`).

**Lis-les. Puis exécute.**

---

*Pièces — la pièce qu'il te faut, au juste prix, livrée et garantie.*
*Document interne · Handover CEO · v1.0 · 28 mai 2026.*
