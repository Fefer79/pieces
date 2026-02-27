# Rapport de Recherche Domaine — Pièces

**Projet :** Pièces — Marketplace de pièces détachées automobiles (neuves & occasion)
**Marché cible :** Côte d'Ivoire, puis Afrique de l'Ouest (CEDEAO)
**Date :** 27 février 2026

---

## 1. Industrie des Pièces Détachées Automobiles en Afrique

### 1.1 Structure de l'industrie globale

L'aftermarket automobile mondial est un écosystème de **400+ Mds USD** structuré en trois segments :
- **Pièces OEM** (Original Equipment Manufacturer) — vendues par les constructeurs/concessionnaires
- **Pièces aftermarket** — fabriquées par des tiers, compatibles avec les véhicules
- **Pièces d'occasion** — récupérées de véhicules en fin de vie (casses automobiles)

En Afrique, la répartition est radicalement différente des marchés développés :
- **Pièces d'occasion importées** : 40-50% du marché (casses européennes)
- **Pièces aftermarket (Chine/Inde/Turquie)** : 30-40%
- **Pièces OEM** : 10-15% (uniquement via concessionnaires)
- **Pièces refabriquées localement** : 5-10%

### 1.2 Tendances mondiales de l'aftermarket

| Tendance | Impact sur l'Afrique |
|---|---|
| Digitalisation (e-commerce auto parts) | Retard massif — <1% des transactions sont digitales en Afrique de l'Ouest |
| Données véhicule connecté (OBD-II) | Non applicable — parc trop ancien |
| Impression 3D de pièces | Émergent, pas encore viable en Afrique |
| Consolidation des distributeurs | Pas encore commencé en Afrique francophone |
| IA et search visuel | **Opportunité majeure** — résout le problème des références manquantes |
| Marketplaces B2B spécialisées | Quelques tentatives (Garage/YC) mais aucune n'a tenu |

### 1.3 Digitalisation : Afrique vs reste du monde

| Indicateur | Europe/USA | Afrique de l'Ouest |
|---|---|---|
| % ventes en ligne pièces auto | 15-25% | <1% |
| Catalogues digitaux vendeurs | Standard | Quasi inexistants |
| Recherche par référence/VIN | Généralisée | Impossible (pas de références) |
| Avis et notation vendeurs | Généralisés | Inexistants |
| Livraison express | Standard (24-48h) | Non structurée |

---

## 2. Chaîne d'Approvisionnement

### 2.1 Circuit d'importation des pièces en CI

#### Depuis l'Europe (pièces d'occasion)

```
CASSE AUTO EUROPE              CONTAINER              PORT ABIDJAN           GROSSISTE ADJAMÉ
(France, Belgique,              maritime              (San-Pédro)            (distribution locale)
 Pays-Bas, Allemagne)           4-6 semaines
       │                            │                      │                    │
       ├── Achat en lot ───────────►│                      │                    │
       │   (1 container =           ├── Transit ──────────►│                    │
       │    500-2000 pièces)        │                      ├── Dédouanement ──►│
       │   Prix: 3-15€/pièce       │                      │   (15-25% taxes)   │
       │                            │                      │                    │
```

- **Hub principaux** : Lyon, Bruxelles, Rotterdam, Hambourg
- **Mode** : conteneur maritime 20 pieds ou 40 pieds
- **Délai** : 4-8 semaines (achat + transit + dédouanement)
- **Financement** : L'importateur avance 100% du capital → risque de stock
- **Tri** : L'importateur achète souvent en lot sans connaître le détail

#### Depuis l'Asie (pièces neuves aftermarket)

```
FABRICANT CHINE/INDE           CONTAINER              PORT ABIDJAN           DISTRIBUTION
(Canton, Guangzhou,             maritime              (dédouanement)          (Adjamé, provinces)
 Delhi, Istanbul)               6-10 semaines
```

- **Origines** : Chine (Canton, Guangzhou) pour 60-70%, Inde, Turquie
- **Types** : Filtres, plaquettes, suspensions, embrayages, éclairage
- **Qualité** : Très variable — de l'excellent au dangereux
- **Croissance** : +15-20%/an, portée par les véhicules chinois (Changan, BYD)

### 2.2 Rôle des casses automobiles européennes

Les casses européennes sont le **premier fournisseur** de pièces d'occasion pour l'Afrique de l'Ouest :
- Réglementation européenne sur le recyclage automobile → flux constant de pièces
- Les importateurs ivoiriens se déplacent physiquement en France/Belgique pour acheter
- Certains opèrent via des courtiers intermédiaires
- Aucune plateforme digitale ne connecte efficacement les casses européennes aux importateurs africains

### 2.3 Circuit des pièces d'occasion locales

En complément de l'import, un marché de pièces récupérées localement existe :
- Véhicules accidentés dépecés par des ferrailleurs
- Pièces démontées lors de réparations (échange standard)
- Marché très informel, aucune traçabilité
- Qualité imprévisible

### 2.4 Pièces refabriquées vs originales vs contrefaites

| Type | Prix relatif | Qualité | Disponibilité CI | Risque |
|---|---|---|---|---|
| OEM (constructeur) | 100% | Excellente | Faible (concessionnaires) | Très faible |
| Aftermarket qualité | 40-70% | Bonne à excellente | Moyenne | Faible |
| Occasion importée | 20-50% | Variable | Élevée | Moyen |
| Aftermarket bas de gamme | 15-30% | Médiocre | Élevée | Élevé |
| Refabriquée locale | 10-25% | Très variable | Moyenne | Élevé |
| **Contrefaçon** | 20-40% | Dangereuse | **Élevée** | **Très élevé** |

**Problème de contrefaçon :** Les pièces contrefaites représentent un risque majeur. Elles sont vendues avec des emballages imitant les marques originales, à des prix proches des pièces authentiques. Le consommateur n'a **aucun moyen de distinguer** une pièce authentique d'une contrefaçon.

### 2.5 Logistique et douanes

- **Droits de douane** : 15-25% sur les pièces auto importées (variable selon le type)
- **TVA** : 18% en CI
- **Procédure** : Pré-inspection obligatoire, certificat de conformité requis
- **Délai de dédouanement** : 3-10 jours ouvrés
- **Les pièces contrefaites sont interdites à l'importation** (loi ivoirienne)

*Source : [Douanes ivoiriennes](https://www.douanes.ci/professionnel/marchandises-prohibeesinterdites)*

---

## 3. Écosystème des Mécaniciens

### 3.1 Profil type du mécanicien ivoirien

| Caractéristique | Détail |
|---|---|
| Formation | Apprentissage informel (3-5 ans chez un maître) — très peu de formation formelle |
| Âge moyen | 25-45 ans |
| Revenu journalier | 5 000 - 30 000 FCFA (selon activité et saison) |
| Lieu de travail | 56% travaillent sur le domaine public (trottoirs, terrains vagues) |
| Équipement | Outils basiques, pas de diagnostic électronique |
| Smartphone | Oui (quasi systématique), Android bas de gamme |
| App principale | WhatsApp (communication avec clients et fournisseurs) |
| Nombre estimé (Abidjan) | 5 000 - 10 000+ |

*Sources : [Revue RASP](https://www.revue-rasp.org/index.php/rasp/article/view/194), [DALOGÉO — Korhogo](https://www.revuegeo-univdaloa.net/fr/publication/les-activites-mecaniques-dengins-roulants-et-la-reduction-du-chomage-dans-la-ville-de)*

### 3.2 Relation mécanicien-client

La relation mécanicien-propriétaire est au **cœur** de l'écosystème pièces auto en CI :

**Modèle dominant (90% des cas) :**
1. Le propriétaire amène son véhicule chez le mécanicien
2. Le mécanicien diagnostique et identifie les pièces nécessaires
3. Le mécanicien va acheter les pièces au marché (Adjamé) — ou envoie un apprenti
4. Le mécanicien **inclut sa marge sur les pièces** dans le devis global (pièces + main d'œuvre confondues)
5. Le propriétaire paie un montant global sans connaître le prix réel des pièces

**Problème structurel :**
- Le propriétaire ne connaît jamais le vrai prix des pièces
- Les marges mécanicien sur les pièces vont de **50% à 200%+**
- Le mécanicien honnête est pénalisé car le client ne peut pas le distinguer du malhonnête
- La confiance repose sur la relation personnelle, pas sur la transparence

### 3.3 Rôle du mécanicien comme prescripteur

**Insight crucial du brainstorming :** Le mécanicien est un **prescripteur**, pas un acheteur final. C'est lui qui :
- Diagnostique la panne
- Identifie la pièce nécessaire
- Choisit le vendeur et la qualité
- Recommande neuf vs occasion

**Implication pour Pièces :** Ne pas contourner le mécanicien mais **l'intégrer comme prescripteur formalisé** via le workflow tripartite (mécanicien identifie → propriétaire paie → Pièces livre au garage).

### 3.4 Pratiques actuelles d'approvisionnement

| Méthode | Fréquence | Temps | Coût pour le mécanicien |
|---|---|---|---|
| Visite physique Adjamé | Quotidienne | 2-4h aller-retour | Transport + temps perdu |
| Appel téléphonique vendeur habituel | Fréquente | 30 min | Limité aux vendeurs connus |
| WhatsApp (photo de la pièce) | Émergente | Variable | Nouveau mais non structuré |
| Commande en ligne | Quasi inexistante | — | — |

---

## 4. Paiement et Fintech en CI

### 4.1 Paysage mobile money

| Service | Opérateur | Utilisateurs actifs CI | Part de marché estimée |
|---|---|---|---|
| Orange Money | Orange CI | ~15M comptes | ~40-45% |
| MTN MoMo | MTN CI | ~10M comptes | ~25-30% |
| Wave | Wave (fintech) | ~5-8M comptes | ~15-20% (forte croissance) |
| Moov Money | Moov Africa | ~3-5M comptes | ~10% |

**Statistiques clés :**
- **86%** de la population utilise le mobile money (2022)
- Croissance la plus rapide d'Afrique (avec le Ghana) en 2023 — +12 points vs Afrique de l'Est
- Orange Money : **160 Mds €** de transactions en 2024 (tous pays)
- Wave : **20M+** d'utilisateurs actifs mensuels (tous pays, mi-2025)

*Sources : [MTN](https://www.mtn.com/mobile-money-the-quiet-revolution-reshaping-africas-economy/), [TriplePundit](https://triplepundit.com/2025/wave-mobile-money-cote-divoire/), [The Africa Report](https://www.theafricareport.com/306159/cote-divoire-wave-ups-the-game-to-vie-with-mtn-orange-moov/)*

### 4.2 Pénétration bancaire vs mobile money

| Indicateur | Valeur |
|---|---|
| Taux de bancarisation | ~20-25% |
| Taux utilisation mobile money | ~86% |
| Transactions 100% cash | En déclin mais encore ~30-40% du commerce |

**Wave** a été un game-changer en CI : zéro frais sur les transferts personne-à-personne, ce qui a forcé Orange et MTN à réduire leurs frais. L'adoption a explosé.

### 4.3 Habitudes de paiement pour les pièces auto

| Montant transaction | Mode de paiement dominant | Pourquoi |
|---|---|---|
| < 25 000 FCFA | Cash (80-90%) | Habitude, pas de besoin de traçabilité |
| 25 000 - 100 000 FCFA | Cash ou mobile money (50/50) | Mobile money émerge pour les montants moyens |
| > 100 000 FCFA | Mixte (cash + mobile money) | Le propriétaire veut sécuriser la transaction |
| > 500 000 FCFA (entreprises) | Virement/chèque | Comptabilité formelle |

**Implication pour Pièces :**
- Cash-on-delivery indispensable pour les petits montants
- Mobile money (escrow) pour les montants moyens à élevés
- Prépaiement pour les comptes entreprise

### 4.4 Solutions de micro-crédit existantes

| Solution | Type | Pertinence pour Pièces |
|---|---|---|
| Wave Credit | Micro-prêts intégrés | Partenariat potentiel pour "répare maintenant, paie plus tard" |
| Orange Bank CI | Banque mobile | Crédit revolving pour PME |
| Djamo | Néo-banque | Cible jeunes urbains, carte virtuelle |
| LendTech locale | Micro-finance | Prêts aux artisans/PME |

---

## 5. Infrastructure Numérique

### 5.1 Pénétration smartphone

| Indicateur | Valeur | Source |
|---|---|---|
| Possession mobile (tout type) | 94%+ | [DataReportal](https://datareportal.com/digital-in-cote-divoire) |
| Smartphones (% des mobiles) | ~55-65% | Statista |
| Marques dominantes | Samsung, Tecno, Infinix, Itel | — |
| Prix moyen smartphone | 40 000 - 80 000 FCFA | — |
| OS dominant | Android (~95%) | — |
| Gamme | Entrée/milieu (1-3 Go RAM) | — |

### 5.2 Usage de WhatsApp

| Indicateur | Valeur |
|---|---|
| WhatsApp = 1ère app de messagerie | Oui (quasi universelle) |
| Pénétration parmi les possesseurs de smartphones | ~90%+ |
| Usage professionnel | Généralisé (artisans, commerçants, PME) |
| Groupes WhatsApp pour le commerce | Pratique courante |

**WhatsApp est l'infrastructure de communication principale en CI.** Les mécaniciens échangent déjà des photos de pièces via WhatsApp avec leurs clients et fournisseurs — le workflow Pièces s'inscrit dans un comportement existant.

*Source : [AskYazi — WhatsApp Usage Africa](https://www.askyazi.com/useful-data-sources-for-africa/whatsapp-usage-across-africa-key-statistics-insights-for-2025)*

### 5.3 Connectivité internet

| Indicateur | Valeur |
|---|---|
| Utilisateurs internet CI (début 2024) | 11,23 millions |
| Taux de pénétration internet | 38,4% (2024) → 41,2% (2025) |
| Couverture 3G | ~80% population urbaine |
| Couverture 4G | ~50-60% population urbaine |
| Coût data | Parmi les plus abordables d'Afrique (< 2% du revenu) |

**Implication pour Pièces :**
- PWA offline-first est **essentiel** (connexion instable)
- Compression d'images nécessaire (coût data)
- WhatsApp comme canal alternatif quand la PWA est inaccessible

*Sources : [DataReportal — Digital 2024 CI](https://datareportal.com/reports/digital-2024-cote-divoire), [Worlddata.info](https://www.worlddata.info/africa/ivory-coast/telecommunication.php)*

### 5.4 PWA adoption en Afrique de l'Ouest

Les PWA sont particulièrement adaptées au marché africain :
- Pas de téléchargement Play Store (économie de data et stockage)
- Fonctionnement en mode dégradé (offline/low bandwidth)
- Mises à jour transparentes
- **Jumia** utilise déjà une PWA pour certains marchés africains
- 67% des commandes Jumia CI en 2024 venaient de zones secondaires — preuve que le e-commerce fonctionne hors Abidjan

---

## 6. Cadre Réglementaire

### 6.1 Réglementation importation pièces auto

| Règle | Détail |
|---|---|
| Droits de douane | 15-25% selon le type de pièce |
| TVA | 18% |
| Pré-inspection | Obligatoire pour les importations |
| Certificat de conformité | Requis |
| Contrefaçon | **Interdite** à l'importation (loi douanière ivoirienne) |
| Marquage d'origine | Obligatoire — les produits sans indication d'origine sont prohibés |

*Source : [Douanes ivoiriennes](https://www.douanes.ci/professionnel/marchandises-prohibeesinterdites)*

### 6.2 Réglementation e-commerce

| Texte | Contenu |
|---|---|
| Loi n°2013-546 (transactions électroniques) | Cadre juridique du e-commerce en CI |
| Loi n°2013-450 (protection des données personnelles) | Equivalent local du RGPD |
| Stratégie nationale e-commerce | En cours d'élaboration — plan d'actions horizon 2028 |

**Environnement favorable :** Le gouvernement ivoirien encourage activement le e-commerce et la digitalisation de l'économie. Pas de barrière réglementaire spécifique à une marketplace de pièces auto.

### 6.3 Réglementation véhicules d'occasion

- Depuis 2018 : limitation progressive de l'âge des véhicules importés d'occasion
- Objectif : rajeunir le parc automobile
- **Effet indirect :** Augmente la demande de pièces pour les véhicules plus récents (moins de pièces d'occasion disponibles pour les modèles récents)

---

## 7. Modèles de Référence

### 7.1 Marketplaces pièces auto dans les marchés émergents

| Plateforme | Marché | Modèle | Leçons pour Pièces |
|---|---|---|---|
| **Garage (YC S22)** | Ghana/Nigeria | B2B wholesale → détaillants | **A pivoté** — difficulté à monétiser le B2B, unit economics fragiles sur la distribution physique |
| **Parts24** | Maroc | Multi-vendeurs, occasion | Fonctionne dans un marché plus structuré — le Maroc a un adressage, des références, etc. |
| **BuyParts24** | UAE | B2B distributeurs → garages | Modèle VIN-driven — difficile à transposer en Afrique (pas de données VIN) |
| **Partium** | Global (B2B) | IA visual search pour pièces industrielles | Technologie de référence — 350M+ pièces OEM dans leur catalogue |
| **Autodoc** | Europe | E-commerce pièces auto | Leader européen — recherche par véhicule, catalogue structuré |

### 7.2 Leçons de l'échec de Garage (YC S22)

L'échec de Garage est **le cas d'étude le plus pertinent** pour Pièces :
- **Ce qu'ils ont bien fait :** Identifié le marché ($25B aftermarket Afrique), approche B2B, financement YC
- **Pourquoi ils ont pivoté :**
  - Difficulté à construire un catalogue sans références standardisées
  - Unit economics fragiles sur la logistique physique (livrer des pièces est coûteux)
  - Résistance des retailers informels au changement
  - Modèle B2B wholesale = marges faibles, volume nécessaire énorme

**Ce que Pièces fait différemment :**
1. **IA photo** → résout le problème des références manquantes
2. **Modèle B2C2C** (pas seulement B2B) → accès au consommateur final via le workflow tripartite
3. **WhatsApp-first** → zéro friction d'adoption
4. **Revenus logistique** → capture de valeur à chaque transaction, pas seulement commission
5. **Focus CI francophone** → marché plus petit mais pas de concurrence

### 7.3 Success stories e-commerce en Afrique de l'Ouest

| Entreprise | Secteur | Leçon applicable |
|---|---|---|
| **Jumia** | E-commerce généraliste | Le COD et les points de retrait sont indispensables. 67% des commandes viennent hors capitales. |
| **Glovo/Yango** | Livraison à la demande | La flotte de moto-coursiers fonctionne à Abidjan. Infrastructure de livraison existante. |
| **Wave** | Mobile money | L'adoption explose quand on supprime les frais et simplifie l'UX. |
| **Twiga Foods** | Agri-tech (Kenya) | Agrégation de l'offre informelle + livraison structurée — modèle très similaire à Pièces |

### 7.4 Leçons clés pour Pièces

1. **Cash-on-delivery est non-négociable** au lancement (leçon Jumia)
2. **Les agents terrain sont essentiels** pour onboarder les vendeurs informels (leçon M-Pesa, Twiga)
3. **WhatsApp > App native** pour l'adoption initiale (leçon Wave, comportement local)
4. **Commencer petit et parfait** plutôt que large et médiocre (leçon Garage — ils ont essayé de scaler trop vite)
5. **La logistique est un centre de profit**, pas juste un coût (leçon Glovo)
6. **La data est la vraie moat** à long terme — qui achète quoi, à quel prix, où (leçon Afridigest)

---

## Sources Principales

- [Douanes ivoiriennes](https://www.douanes.ci/professionnel/marchandises-prohibeesinterdites)
- [Revue RASP — Garages automobiles Abidjan](https://www.revue-rasp.org/index.php/rasp/article/view/194)
- [BSTP — Cluster mécanique automobile](https://www.bstp-ci.net/presse-et-media/activites-a-venir/mise-en-place-dun-cluster-de-la-mecanique-automobile)
- [DALOGÉO — Mécaniciens Korhogo](https://www.revuegeo-univdaloa.net/fr/publication/les-activites-mecaniques-dengins-roulants-et-la-reduction-du-chomage-dans-la-ville-de)
- [DataReportal — Digital 2024 Côte d'Ivoire](https://datareportal.com/reports/digital-2024-cote-divoire)
- [AskYazi — WhatsApp Africa](https://www.askyazi.com/useful-data-sources-for-africa/whatsapp-usage-across-africa-key-statistics-insights-for-2025)
- [MTN — Mobile Money Revolution](https://www.mtn.com/mobile-money-the-quiet-revolution-reshaping-africas-economy/)
- [TriplePundit — Wave CI](https://triplepundit.com/2025/wave-mobile-money-cote-divoire/)
- [The Africa Report — Wave vs MTN/Orange](https://www.theafricareport.com/306159/cote-divoire-wave-ups-the-game-to-vie-with-mtn-orange-moov/)
- [Afridigest — Africa's Spare Parts Opportunity](https://afridigest.com/africas-spare-parts-opportunity/)
- [Future Africa — Spare Parts Opportunity](https://www.future.africa/news-insights/chaos-is-a-ladder-africas-messy-but-lucrative-spare-parts-opportunity)
- [YC — Garage/Rima AI](https://www.ycombinator.com/companies/rima-ai)
- [Partium — Visual Part Search](https://www.partium.io/visual-part-search)
- [CinetPay](https://cinetpay.com/)
- [FedaPay](https://docs.fedapay.com/)
- [Jumia Group — E-Commerce Rural CI](https://group.jumia.com/community-support/e-commerce-in-rural-areas-of-cote-d-ivoire)
