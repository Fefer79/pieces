# Logistique as a Service — `logistique.pieces.ci`

> Spec produit / technique. **Phase 1 livrée** (moteur d'arbitrage + matrice dans la demande de
> pièce) ; phases 2 à 4 à faire.
> Contexte déclencheur : GoCab (flotte Bestune B70 2024–2025) — FAW/Bestune ne tient pas de
> stock et fabrique à la commande, ce qui transforme chaque panne en immobilisation longue.

## 1. La thèse

Aujourd'hui une flotte arbitre à l'aveugle entre « attendre la pièce » et « payer plus vite ».
Personne ne chiffre le troisième terme, qui est presque toujours le plus gros : **le revenu perdu
pendant que le véhicule est à l'arrêt**.

Le service ne vend pas du transport. Il vend **la décision** : pour cette pièce, sur ce véhicule,
dans cette flotte, quelle option minimise le coût total ? Le transport n'est qu'un des postes.

```
Coût total d'une option = prix pièce
                        + frais logistique (fret + douane + livraison locale)
                        + (délai en jours × coût d'immobilisation journalier du véhicule)
                        + risque × pénalité (rupture de mission, contrat client perdu)
```

Le coût d'immobilisation est **paramétré par flotte et par catégorie de véhicule** (revenu
net/jour), pas deviné. Pour une flotte VTC il est déjà mesuré dans Pièces via les relevés
chauffeurs (`DriverDailyRecord.revenue - fuelCost - otherExpenses`) : on a la donnée réelle, pas
une hypothèse. C'est notre avantage défendable — un transitaire ne peut pas la calculer, un fleet
manager n'a pas le temps.

### Calibration GoCab (chiffres client, réunion de cadrage)

| Catégorie | Modèles | Recette nette attendue (F/jour) | **Coût d'immobilisation retenu** | Usure / fréquence maintenance | Coût énergétique (F/jour) |
|-----------|---------|-------------------------------|-------------------------------|------------------------------|--------------------------|
| Économique thermique | Suzuki Alto, Toyota Starlet | 23 000 – 28 000 | **23 000** | très élevée (mensuelle) | ~35 000 – 40 000 |
| Premium thermique | Bestune T55, **B70** | 30 000 – 35 000 | **30 000** | élevée (électronique + mécanique) | ~40 000 |
| Premium électrique | Bestune NAT, E03 | 38 000 – 42 000 | **38 000** | modérée (pneumatiques, trains roulants) | **~8 000** |

Le parc GoCab est **à dominante électrique et converge vers le tout-électrique** : la catégorie EV
est donc le cas de référence, pas un cas marginal. Dépense pièces associée : **~720 000 F/véh/an**
en électrique contre ~1,3 M F en thermique.

Convention retenue : on prend systématiquement la **borne basse** de la fourchette client. Une
matrice qui reste vraie avec l'hypothèse la plus défavorable n'est pas contestable en réunion.

Trois conséquences immédiates :

1. **Un B70 à l'arrêt coûte 30 000 F par jour, soit 900 000 F par mois.** Le prix de la pièce
   devient un détail : sur les fourchettes de prix pièces observées, l'arbitrage est décidé par le
   délai dans plus de 90 % des cas.
2. **Le maritime réactif est mathématiquement exclu** sur un véhicule en service : 45 j × 30 000 =
   **1 350 000 F** d'immobilisation. Aucune économie de fret ne compense. Le maritime n'a de sens
   qu'en anticipé (§5) — c'est la démonstration, pas une opinion.
3. **Les électriques (NAT, E03) sont la priorité d'anticipation** : coût d'immobilisation le plus
   élevé du parc (38 000 F/j) et pièces spécifiques encore plus rares que le thermique.

**Lecture de la « recette nette »** (levée par la note post-rencontre, cf.
[gocab-analyse-rencontre.md](gocab-analyse-rencontre.md)) : l'énergie est portée par le chauffeur,
pas par l'opérateur. L'électrique économise ~32 000 F/jour d'énergie (8 000 contre ~40 000) mais la
recette nette de l'opérateur ne progresse que de ~8 000 F/jour — le gain va majoritairement au
chauffeur, dont il augmente la capacité de remboursement. **La recette nette est donc bien le
versement encaissé par la flotte : c'est la bonne base du coût d'immobilisation.**

Corollaire commercial : l'offre pièces EV se vend à l'opérateur sur la **disponibilité**, jamais sur
l'économie de carburant — qui ne lui revient pas.

**Positionnement public** : « Nous chiffrons l'attente. » Le partenaire transitaire n'est jamais
nommé côté client : Pièces est l'opérateur de bout en bout, l'exécution est sous-traitée.

## 2. La matrice d'arbitrage

Sortie du moteur pour une demande de pièce donnée — 3 à 5 lignes comparées, toujours la même
grille, jamais un prix nu :

Exemple : amortisseur avant, **Bestune B70 2024**, immobilisation **30 000 F/jour** (§ calibration).
Seuls les prix pièce et fret sont des placeholders ; la colonne immobilisation est réelle.

| Option | Délai | Prix pièce | Logistique | Immobilisation | **Coût total** | Dispo |
|--------|-------|-----------|-----------|---------------|---------------|-------|
| Pré-positionné (stock Pièces) | 4 h | 47 000 | 2 000 | 6 000 | **55 000** | ✅ 2 en stock |
| Stock local Abidjan | 48 h | 45 000 | 2 000 | 2 j × 30 000 = 60 000 | **107 000** | ✅ vérifié |
| Aérien express (3 j) | 3 j | 32 000 | 28 000 | 90 000 | **150 000** | ✅ usine |
| Aérien économique (7 j) | 7 j | 32 000 | 14 000 | 210 000 | **256 000** | ✅ usine |
| Maritime groupé (45 j) | 45 j | 32 000 | 3 500 | 1 350 000 | **1 385 500** | ✅ usine |

La pièce la moins chère (32 000 F par maritime) est l'option la plus coûteuse du tableau, **42 fois**
la plus chère. C'est toute la démonstration en une ligne, et c'est ce qui doit être à l'écran quand
un manager arbitre.

Trois enseignements que la matrice rend évidents et qui sont notre argument commercial :

1. Le maritime n'est **jamais** rentable en réactif sur un véhicule productif. Il n'est rentable
   qu'en **anticipé** (§5) — d'où le service de pré-positionnement.
2. L'aérien cher est souvent moins cher que le local « pas cher mais indisponible ».
3. La ligne qui gagne presque toujours est celle du stock anticipé. La matrice vend le §5.

Seuil de bascule utile en argumentaire : à 30 000 F/jour, **un jour gagné vaut 30 000 F de fret**.
Toute option qui raccourcit le délai d'un jour pour moins de 30 000 F est rentable, quel que soit
le prix de la pièce. C'est la règle que le manager doit retenir en sortant de la démo.

**Règle d'affichage** (cohérente avec DESIGN.md — pas de frais cachés) : chaque colonne est
détaillée au clic ; le coût d'immobilisation affiche la formule et le paramètre de la flotte.

## 3. Codification poids / volume des pièces

Le devis logistique ne peut pas attendre que le client pèse sa pièce. On code un référentiel de
familles avec fourchettes, et on facture au **poids taxable**.

- Aérien : `poids_taxable = max(poids_réel, L×l×h cm / 6000)`
- LCL maritime : `max(poids_réel_t, volume_m³)` — 1 m³ ≈ 1 t
- Groupage local : poids réel + classe d'encombrement

### Table de départ (à affiner avec les premiers envois réels)

| Famille | Poids (kg) | Volume (dm³) | Classe |
|---------|-----------|-------------|--------|
| Filtres (huile, air, habitacle) | 0,2–1,5 | 1–6 | S |
| Plaquettes de frein (jeu) | 1,5–4 | 2–4 | S |
| Disques de frein (paire) | 8–14 | 8–14 | M dense |
| Amortisseur (unité) | 3–6 | 10–18 | M |
| Alternateur / démarreur | 3–8 | 6–12 | M dense |
| Kit embrayage | 8–14 | 12–20 | M dense |
| Radiateur / condenseur | 5–10 | 40–70 | **L volumineux** |
| Phare / optique | 2–5 | 25–45 | **L volumineux** |
| Pare-chocs | 5–9 | 150–250 | **XL volumétrique** |
| Capot / aile / portière | 10–20 | 120–300 | **XL volumétrique** |
| Pare-brise | 12–20 | 60–100 | XL fragile |
| Batterie | 14–22 | 12–18 | M dense (**restriction aérien**) |
| Pneu | 8–14 | 60–90 | L volumineux |
| Boîte de vitesses | 45–90 | 90–150 | XL lourd |
| Moteur complet | 120–250 | 250–400 | XL lourd |

Champs dérivés qui pilotent tout le reste : `chargeableWeightKg`, `isVolumetric` (le volume
commande le prix, pas le poids), `hazmat` (batteries, airbags, amortisseurs à gaz → interdits ou
surtaxés en aérien), `fragile`, `oversize`.

**Confiance de l'estimation** — trois niveaux, affichés au client :
`MEASURED` (pesé sur un envoi précédent) > `CATALOG` (fiche fournisseur) > `FAMILY` (fourchette).
Chaque envoi réel réalimente le référentiel : la marge d'erreur se resserre avec le volume.
C'est un actif qui se construit tout seul.

## 4. Parcours de cotation

Calqué sur ce que fait myCEVA (maritime instantané, aérien sous 1 h) mais **inversé côté client** :
on ne demande jamais à un mécanicien de saisir des dimensions.

1. **T+0 — estimation instantanée.** Depuis la demande de pièce (`PartRequest`), le moteur produit
   la matrice avec la fourchette famille. Affichage : « estimation, ± 20 % » — jamais un prix ferme
   présenté comme ferme.
2. **T+1 h à 2 h — devis ferme.** Le back-office confirme le poids/volume réel auprès du
   fournisseur et déclenche la cotation transitaire. Le client reçoit une notification (WhatsApp)
   avec les options fermes, valables 48 h.
3. **Décision.** Le manager choisit dans la matrice → conversion en commande Pièces
   (flux `PartRequest` existant : `APPROVED` → `convert-to-order`).
4. **Exécution & suivi.** Étapes de transport visibles au même endroit que la commande :
   `SOURCING → COLLECTED → IN_TRANSIT → CUSTOMS → LOCAL_DELIVERY → DELIVERED`.

Sur les familles standard et déjà expédiées (`MEASURED`), l'étape 2 disparaît : le devis est
instantané et ferme. Objectif à 12 mois : 70 % des demandes cotées fermes en instantané.

## 5. Pré-positionnement (le vrai produit pour GoCab)

Le cas Bestune est le cas d'école : pas de stock usine + fabrication à la commande = tout achat
réactif est un achat aérien ou une immobilisation de plusieurs semaines. La seule sortie est
d'acheter **avant** la panne, par maritime, les pièces dont on sait qu'elles tomberont.

Panier d'anticipation = pièces où :

```
P(panne sur l'horizon) × (coût_réactif − coût_anticipé) > coût_de_portage
avec coût_de_portage = prix × taux_immobilisation_capital × durée + risque_obsolescence
```

Ordre de grandeur GoCab : un B70 immobilisé 45 jours en attente d'une pièce usine coûte
**1 350 000 F**, soit près du **double du budget pièces annuel du véhicule** (720 000 F/an sur un
parc électrique, chiffre GoCab). Un Bestune NAT électrique dans la même situation coûte
45 × 38 000 = **1 710 000 F**, soit **2,4 fois** sa dépense pièces annuelle. **Une seule**
immobilisation longue par véhicule et par an coûte plus cher que tout ce qu'il consomme en pièces
sur l'année. Le stock anticipé n'est pas une optimisation, c'est la condition de rentabilité.

À l'échelle du parc, avec 10–15 % de véhicules immobilisés simultanément sur 1 000 véhicules
électriques : **114 à 171 M F/mois de revenu perdu contre 60 M F/mois de budget pièces**.
L'immobilisation coûte 1,9 à 2,85 fois l'achat de pièces. Un point d'immobilisation gagné vaut
11,4 M F/mois — le double de ce que rapporterait 10 % de remise sur les pièces.

Entrées disponibles ou constructibles :
- parc homogène (GoCab : B70 2024/2025 → un seul référentiel de pièces couvre presque tout le parc) ;
- historique des `PartRequest` + entretiens + kilométrage (`Vehicle.mileage`) → loi de consommation
  par pièce et par tranche de km ;
- usage VTC intensif : 8 000–12 000 km/mois par véhicule, donc l'usure est prévisible et rapide
  (freins, amortisseurs, filtration, embrayage) — le contraire d'un parc de particuliers.

Sortie : un **plan d'approvisionnement trimestriel** — liste, quantités, mode maritime groupé,
coût, et surtout **jours d'immobilisation évités × coût journalier de la catégorie**. C'est le seul
chiffre que le client retient : « ce plan vous évite 42 jours d'arrêt, soit 1 260 000 F ».

Priorisation du panier par catégorie, dérivée de la calibration : électriques (38 000 F/j) avant
premium thermique (30 000 F/j) avant économique (23 000 F/j) — mais l'économique a la fréquence de
maintenance la plus élevée (vidange toutes les 4–6 semaines), donc le volume compense. Le classement
final se fait sur `fréquence × coût_journalier`, pas sur l'un des deux seuls.

**Le panier électrique est différent, pas plus petit en valeur.** GoCab s'électrifie précisément
pour l'entretien : pas de vidange, ni filtre à huile, bougie, courroie, embrayage, échappement —
d'où ~720 000 F/véh/an contre ~1,3 M F en thermique. Mais ce qui disparaît est la partie
**banalisée et disponible partout** ; ce qui reste est rare et immobilisant :

- **Pneumatiques** — consommation *supérieure* au thermique (surpoids batterie 300–500 kg + couple
  instantané). Déjà remplacés tous les 2 mois. Première ligne du panier, toutes catégories.
- **Trains roulants / suspension** — usure accélérée par la masse : amortisseurs, rotules,
  silentblocs, roulements.
- **Freinage** — consommation en forte baisse (freinage régénératif), mais surveiller la
  **corrosion des disques par sous-utilisation**, panne typique de l'EV urbain encore inconnue du
  marché local.
- **Spécifique EV** — filtre d'habitacle, refroidissement de batterie, composants HV (chargeur
  embarqué, onduleur, câblage) : chers, sans marché de la casse, délai usine, donc candidats
  prioritaires au pré-positionnement.

Panier EV = **moins de références, chacune plus critique**. C'est le profil qui justifie le stock
consigné, et il pousse notre monétisation vers l'abonnement et la logistique plutôt que vers la
marge à la pièce (analyse complète : [gocab-analyse-rencontre.md](gocab-analyse-rencontre.md) §6 bis).

Deux modèles commerciaux possibles, à trancher :
- **Stock consigné Pièces** : nous portons le stock, le client paie à la sortie (prix supérieur au
  maritime nu mais très inférieur à l'aérien). Le client n'immobilise pas de cash. Marge plus élevée.
- **Stock client** : la flotte achète et nous stockons/gérons. Moins de risque pour nous, moins de
  marge, plus dur à vendre.

Recommandation : consigné, sur les 20–30 références à rotation forte du parc B70, avec un
engagement de volume minimal — sinon nous portons seuls le risque d'obsolescence.

## 6. Modes de transport exposés au client

| Mode | Délai affiché | Base tarifaire | Cas d'usage |
|------|--------------|---------------|-------------|
| `LOCAL` | 24–48 h | grille commune existante (`computeDeliveryFee`) | pièce dispo Abidjan |
| `AIR_NOW` | 3 j | poids taxable × tarif zone + douane | véhicule productif à l'arrêt |
| `AIR_STANDARD` | 4–5 j | idem, tarif dégressif | arbitrage courant |
| `AIR_ECONOMY` | 7 j | idem, tarif éco | pièce chère, arrêt tolérable |
| `SEA_LCL` | 45 j | m³ / tonne + THC + douane | anticipation, pièces volumineuses |
| `SEA_FCL` | 45 j | conteneur | plan trimestriel de flotte |

Contrainte technique à lever : l'enum Prisma `DeliveryMode` ne connaît que `EXPRESS | STANDARD`,
et `computeDeliveryFee` est purement local (commune d'Abidjan × sous-total vendeur). L'international
est une **grille séparée** (poids/volume), pas une extension de la grille locale — ne pas les mélanger.

## 7. Modèle de données proposé

```prisma
model PartLogisticsProfile {   // référentiel poids/volume
  id               String  @id @default(uuid())
  family           String  // "BRAKE_PADS", "BUMPER", ...
  catalogItemId    String? // surcharge pour une référence précise
  weightKgMin      Float
  weightKgMax      Float
  volumeDm3Min     Float
  volumeDm3Max     Float
  confidence       LogisticsConfidence // MEASURED | CATALOG | FAMILY
  hazmat           Boolean @default(false)
  fragile          Boolean @default(false)
  airRestricted    Boolean @default(false)
  measurementCount Int     @default(0) // nb d'envois réels agrégés
}

model LogisticsQuote {
  id             String   @id @default(uuid())
  partRequestId  String?  // rattachement au flux flotte existant
  enterpriseId   String?
  status         QuoteStatus // ESTIMATED | FIRM | EXPIRED | ACCEPTED
  chargeableKg   Float
  volumeDm3      Float
  confidence     LogisticsConfidence
  downtimeCostPerDay Int   // snapshot du paramètre flotte au moment du devis
  expiresAt      DateTime?
  options        LogisticsQuoteOption[]
}

model LogisticsQuoteOption {
  id             String  @id @default(uuid())
  quoteId        String
  mode           LogisticsMode
  transitDays    Int
  partCost       Int
  freightCost    Int
  customsCost    Int
  lastMileCost   Int
  downtimeCost   Int     // transitDays × downtimeCostPerDay
  totalCost      Int     // le chiffre qui décide
  availability   String  // LOCAL_STOCK | FACTORY_ORDER | PRE_POSITIONED
  recommended    Boolean @default(false)
}

model FleetDowntimeParam {   // coût d'immobilisation, par flotte ET par catégorie
  id             String @id @default(uuid())
  enterpriseId   String
  category       VehicleEconomyCategory // ECONOMY_ICE | PREMIUM_ICE | PREMIUM_EV
  revenuePerDay  Int      // borne basse de la fourchette client
  energyCostPerDay Int?   // renseigné quand connu
  source         String   // DECLARED (réunion client) | COMPUTED (DriverDailyRecord) | MANUAL
  updatedAt      DateTime @updatedAt

  @@unique([enterpriseId, category])
}

model StockAnticipationPlan {  // §5
  id            String @id @default(uuid())
  enterpriseId  String
  periodStart   DateTime
  periodEnd     DateTime
  status        String  // DRAFT | PROPOSED | ACCEPTED | ORDERED
  lines         StockAnticipationLine[]
  avoidedDowntimeDays Float  // l'argument de vente
}
```

Le devis se greffe sur `PartRequest` : `preferredSource` (`LOCAL | AIR | CARGO | ANY`) devient
l'intention, `LogisticsQuote` devient la réponse chiffrée présentée au manager sur
`/enterprise/requests/[id]` avant approbation. **Le chemin d'approbation manager ne change pas** :
la matrice l'informe, elle ne décide pas à sa place.

## 8. Surfaces

| Surface | Public | Contenu |
|---------|--------|---------|
| `logistique.pieces.ci` (vitrine) | acquisition | promesse, 3 modes, calculateur d'immobilisation public |
| `logistique.pieces.ci/calculateur` | prospect | « combien vous coûte un véhicule à l'arrêt ? » → capture lead |
| `/enterprise/logistics/quotes` | flotte | mes devis, statut, historique |
| `/enterprise/requests/[id]` | manager | matrice d'arbitrage intégrée à la demande |
| `/enterprise/logistics/plan` | flotte | plan d'anticipation trimestriel |
| back-office admin | ops Pièces | saisie du devis ferme, poids réels, suivi transitaire |

Le sous-domaine se route comme `flotte.pieces.ci` (middleware → route group dédié).

## 9. Phasage

**Phase 1 — le calculateur. ✅ LIVRÉE.** Référentiel de 17 familles poids/volume, poids taxable
(aérien /6000, LCL 1 m³ = 1 t), grille de fret interne, coûts d'immobilisation par catégorie de
véhicule, moteur de matrice, route API et affichage dans la demande de pièce. Zéro intégration
transitaire.

- `packages/shared/constants/logistics.ts` — référentiel + moteur (`computeArbitrageMatrix`)
- `packages/shared/prisma/schema.prisma` — `VehicleEnergyType` (ICE/EV/HYBRID) sur `Vehicle`
- `apps/api/src/modules/enterprise/logistics.service.ts` — résolution catégorie + famille
- `POST /api/v1/enterprises/:id/part-requests/:requestId/logistics-matrix`
- `apps/web/components/logistics-matrix.tsx` — tableau détaillé, option recommandée, surcoût

Reste à calibrer avant démo client : la grille de fret et le taux de douane sont des ordres de
grandeur (`LOGISTICS_MODES`, `CUSTOMS_DUTY_RATE`) — une ligne à changer par tarif réel obtenu.

**Phase 2 — le devis ferme (4–6 semaines).** `LogisticsQuote`, back-office ops, notification
WhatsApp du devis sous 2 h, acceptation → commande. Le transitaire reste hors système (mail/portail).

**Phase 3 — anticipation.** Loi de consommation sur l'historique GoCab, plan trimestriel,
stock consigné.

**Phase 4 — intégration transitaire.** API/EDI, tracking automatique, cotation instantanée réelle.

Chaque phase est vendable seule. La phase 1 seule répond déjà au problème Bestune.

## 10. À trancher / à collecter

- ~~Coût d'immobilisation GoCab~~ — **obtenu** (réunion de cadrage, cf. §2) : 23 000 / 30 000 /
  38 000 F/jour selon catégorie, bornes basses retenues. Reste à faire confirmer par écrit, et à
  lever l'ambiguïté « recette nette vs coût énergétique ».
- ~~Coût énergétique des électriques~~ — **obtenu** : ~8 000 F/jour (contre ~40 000 F en
  thermique), porté par le chauffeur.
- **Décomposition du taux d'immobilisation** (10–15 % du parc) : quelle part est imputable à
  l'attente de pièce, par opposition à la main-d'œuvre, aux sinistres et à l'administratif ? Notre
  promesse ne porte que sur la première.
- **Prime de fiabilité +10 à +50 %** déclarée en réunion : à valider sur une transaction réelle
  avant d'en faire un pilier de pricing.
- **Grille tarifaire réelle** du partenaire (aérien FCFA/kg par tranche, LCL/m³, douane CI) —
  les valeurs de ce document sont des placeholders.
- **Modèle de stock** : consigné (recommandé) vs client.
- **Qui porte le risque douane** (droits, retards) — poste très volatil en CI, à cadrer dans les CGV.
- **Périmètre géo** : Abidjan seul en phase 1, ou intérieur du pays dès le départ ?
- **Restrictions aériennes** : batteries, airbags, amortisseurs à gaz — à valider famille par famille.

## Références

- `docs/gocab-part-requests.md` — flux de demande de pièce (mécanicien → manager)
- `packages/shared/constants/delivery-pricing.ts` — grille locale existante (`computeDeliveryFee`)
- `apps/web/lib/fleet-plans.ts` — paliers d'abonnement flotte
- Inspiration parcours : myCEVA (cotation maritime instantanée, aérienne sous 1 h ; niveaux de
  service aérien 24–48 h / 48–96 h / 96 h+)
