# Analyse de la rencontre Moulaye / GoCab — extraction opérationnelle

> Source : note stratégique post-rencontre (écosystème VTC + après-vente CI).
> Objet de ce document : extraire ce qui est **utilisable** — chiffres à intégrer au produit,
> contradictions à lever, décisions à prendre. Le rapport source est un document de marché ;
> ceci en est la traduction produit.

## 1. Chiffres à retenir

| Donnée | Valeur | Usage produit | Confiance |
|--------|--------|--------------|-----------|
| Recette nette / jour / véhicule | 23 000 (éco) · 30 000 (premium ICE) · 38 000 (EV) | coût d'immobilisation, moteur d'arbitrage | déclaré client |
| Coût énergétique / jour | ~40 000 (thermique) · **~8 000 (électrique)** | ROI électrification, argumentaire chauffeur | déclaré client |
| Kilométrage journalier | 250–300 km/jour | loi d'usure, plan d'anticipation | déclaré |
| Vidange | toutes les 4–6 semaines — **thermique uniquement, nulle en électrique** | rappel d'entretien, panier anticipé | déclaré |
| Pneumatiques | remplacement tous les 2 mois | panier anticipé (rotation la plus forte) | déclaré |
| Budget pièces d'une flotte | **60 M F/mois pour 1 000 véhicules** = 60 000 F/véh/mois = **720 000 F/véh/an** — moyenne d'un parc **à dominante électrique** | dimensionnement du marché, ROI | déclaré |
| Dépense pièces **électrique** | ~720 000 F/véh/an | ROI et devis GoCab | déclaré |
| Dépense pièces **thermique** (essence/diesel) | ~1,3 M F/véh/an | ROI parc thermique, marché général | étude marché |
| Taux d'immobilisation | **10–15 % du parc simultanément** | l'argument central (cf. §3) | déclaré |
| Prime de fiabilité acceptée | **+10 % à +50 %** au-dessus du prix marché si dispo immédiate | politique de prix | déclaré |
| Délai d'attente subi | jusqu'à **3 mois** (ex. un phare) | preuve du problème | déclaré |
| Transit maritime | 45 j + semaines d'attente de groupage conteneur | matrice logistique | structurel |
| Parc Yango Abidjan | ~25 000 véhicules, ~70 % de part de marché | taille du marché adressable | presse |
| Financement GoCab | jusqu'à 45 M USD | capacité de paiement du client | presse |
| Sabotage GPS | jusqu'à **30 %** du parc « aveugle », pot-de-vin ~40 000 F, préjudice ~50 M F | architecture anti-fraude (§4) | déclaré |
| Coût d'accès TecDoc | ~2 000 USD | build vs buy du référentiel (§5) | à vérifier |

## 2. Le calcul qui doit ouvrir la prochaine réunion

Sur une flotte de 1 000 véhicules, avec les chiffres du client. Le parc GoCab étant à dominante
électrique, la recette nette de référence est celle des EV — **38 000 F/jour** :

```
Budget pièces                : 60 000 000 F / mois
Véhicules immobilisés (10 %) : 100 × 38 000 F × 30 j = 114 000 000 F / mois de revenu perdu
Véhicules immobilisés (15 %) : 150 × 38 000 F × 30 j = 171 000 000 F / mois
```

**L'immobilisation coûte 1,9 à 2,85 fois le budget pièces entier.** Chaque point de taux
d'immobilisation gagné vaut **11,4 M F/mois**, soit 137 M F/an. Une flotte qui négocie 10 % de
remise sur les pièces (6 M F/mois) se bat pour la moitié de ce que rapporte **un seul point**
d'immobilisation.

Le paradoxe qui achève la démonstration : en s'électrifiant, GoCab a **divisé par deux sa dépense
pièces** et **augmenté de 27 % le coût d'une journée d'arrêt** (38 000 contre 30 000 F). Le levier
« négocier les pièces » s'est rétréci pendant que le levier « ne pas être à l'arrêt » grossissait.

C'est le seul slide nécessaire. Il justifie à lui seul la prime de +10 à +50 %, la logistique
aérienne, et le stock pré-positionné.

## 3. Les cinq vérités structurantes

1. **Le paradigme de l'hôpital.** Véhicule en panne = urgence, élasticité-prix quasi nulle. Le
   marché local se livre une guerre des prix alors que le client demande de la **fiabilité**, pas
   du discount. Conséquence directe : ne jamais positionner Pièces sur le prix. Notre concurrent
   n'est pas le vendeur moins cher, c'est le délai.
2. **Le « zéro stock » institutionnel.** Les concessionnaires (CFAO, Socida) traitent le SAV comme
   un centre de coût et ne stockent pas. Le vide n'est pas comblé par l'informel, qui n'a ni le
   volume ni la traçabilité. Le vide est réel et durable.
3. **La contrainte chinoise est structurelle, pas conjoncturelle.** Les constructeurs (FAW/Bestune,
   Changan, Chery) sont mandatés sur l'export de véhicules complets ; les pièces sont produites
   **après paiement**, puis attendent un conteneur. 2–3 mois incompressibles. Aucune négociation
   ne résoudra ça — seul le pré-positionnement le contourne.
4. **L'asymétrie d'information est le vrai goulot.** Pas de VIN, pas de nomenclature, terminologie
   vernaculaire, mécaniciens parfois analphabètes. On démonte la pièce *avant* de savoir si elle
   existe — le véhicule est donc immobilisé avant même la commande. Erreur classique et coûteuse :
   commander pour un B70 **2024** ce qui correspond au restylage **2025** → conteneur entier
   inutilisable.
5. **La fraude est endémique et systémique.** Le sabotage GPS (30 % du parc, corruption des
   électriciens d'atelier) prouve que tout circuit de valeur non verrouillé sera détourné. Un
   service de pièces sera attaqué de la même façon : pièce neuve facturée, contrefaçon montée,
   pièce neuve revendue.

## 4. Ce que ça change pour Pièces — par chantier

### Déjà en place, à valoriser

- **Facturation normalisée + TVA 18 % + export FEC** (`invoice.service.ts`) : c'est une barrière
  à l'entrée majeure face à l'informel, pas un détail comptable. Une flotte B2B ne *peut pas*
  acheter sans facture — elle perd la récupération de TVA et ne peut pas justifier la charge.
  À mettre en avant en premier argument, avant le prix et avant le délai.
- **Identification par photo / IA** (module `enrichment`, Gemini) et **VIN** (module `vehicle`) :
  la brique du « TecDoc africain » existe déjà partiellement. Ce que le rapport décrit comme un
  pivot est, chez nous, une fonctionnalité à finir.
- **Chips de condition + décomposition de prix explicite** (DESIGN.md) : réponse directe au risque
  de contrefaçon et à l'asymétrie d'information.
- **Pas de promesse de délai contractuelle** dans les offres flotte (`fleet-plans.ts`) : le rapport
  qualifie de « suicidaire » le modèle qui promet des délais sans maîtriser le stock. Décision déjà
  prise et à **maintenir** — ne réintroduire ni SLA ni pénalité tant que le stock n'est pas nôtre.

### À construire

| Chantier | Déclencheur dans le rapport | Statut |
|----------|---------------------------|--------|
| Moteur de coût d'immobilisation + matrice d'arbitrage | 10–15 % de parc immobilisé | spec écrite → [logistique-as-a-service.md](logistique-as-a-service.md) |
| Millésime / restylage obligatoire à la commande | erreur B70 2024 vs 2025 | **à faire** — bloquant, cf. ci-dessous |
| Photo obligatoire pièce déposée + pièce montée | fraude atelier, contrefaçon | à faire (`PartRequestPhoto` existe déjà) |
| Panier d'anticipation (pneus, freins, filtration) | pneus /2 mois, vidange /mois | phase 3 de la spec logistique |
| Offre pièces EV (freins, trains roulants, pneus, HV) | électrification du parc | à cadrer |

**Le millésime est le chantier le plus rentable à court terme.** Une erreur de millésime = un
conteneur perdu. Notre référentiel véhicules ([[vehicles-data-curated]]) gère déjà la relation
moteur↔année ; il faut y ajouter la notion de **restylage / phase** (B70 2024 ≠ B70 2025) et rendre
le champ obligatoire sur toute demande de pièce carrosserie/optique/vitrage. Coût : faible.
Gain : évite l'incident qui détruit la confiance d'une flotte entière.

## 5. Les trois pivots proposés — évaluation

Le rapport propose trois pivots. Mon avis, dans l'ordre :

**Pivot 2 (commissionnaire logistique) + Pivot 3 (stock de gros) = le bon couple.** C'est déjà la
direction de la spec logistique : la matrice d'arbitrage vend le pré-positionnement, et le
pré-positionnement crée la récurrence. Les deux se renforcent — la matrice prouve au client que
le stock consigné est rationnel, et le stock rend nos délais réels au lieu d'être promis.

**Pivot 1 (SaaS pay-per-search) : écarté.** Décision prise — nous ne facturons pas la recherche.
Trois raisons :
- Facturer 1 000 F la requête à un mécanicien dans un marché où l'information circule gratuitement
  de bouche à oreille revient à taxer l'entrée de notre propre entonnoir.
- Vendre de l'information sans maîtriser l'exécution reproduit exactement le défaut qu'on nous
  reproche : on promet, un tiers exécute, on porte la déception.
- La donnée n'a de valeur qu'adossée à une transaction. Le référentiel se construit **en faisant**
  la logistique (poids réels, délais réels, taux de conformité vendeur), pas avant.

Le référentiel reste un actif — il se monétise **dans l'abonnement flotte**, jamais à l'acte.

### Modèle de revenus retenu

**Sortir de la marge à la pièce.** Sur un parc qui s'électrifie, l'assiette de marge par véhicule
se contracte de moitié (§6 bis) : un modèle assis sur le pourcentage pris à chaque pièce rétrécit
avec le marché qu'il sert. Trois piliers à la place :

1. **Abonnement flotte** — accès à la plateforme, référentiel, matrice d'arbitrage, alertes de
   disponibilité, facturation normalisée, intégration. Récurrent, indexé au véhicule
   (`fleet-plans.ts` : Gratuit / Flotte Pro / Flotte Pro +).
2. **Logistique** — marge sur le transport et le dédouanement, sur un service que le client ne sait
   pas exécuter et dont il connaît le prix de l'échec.
3. **Stock pré-positionné** — consigné par Pièces, facturé à la sortie. Marge la plus élevée,
   récurrence la plus forte, et seule façon de tenir un délai au lieu de le promettre.

La pièce reste vendue, mais elle cesse d'être le produit : elle devient le support d'un service
dont la valeur est le **temps d'immobilisation évité**.

**TecDoc à ~2 000 USD** : à vérifier (le tarif réel d'une licence TecAlliance est généralement bien
supérieur pour un usage commercial). Si c'est exact, c'est un achat immédiat — 1,3 M F pour
supprimer 80 % de notre travail de normalisation serait la meilleure dépense de l'année.

## 6. Contradictions et points à lever avec le client

1. ~~Contradiction budget pièces~~ — **résolue** : les deux chiffres sont vrais, ils ne décrivent
   pas le même véhicule. **~720 000 F/véh/an en électrique** (parc GoCab, à dominante EV) contre
   **~1,3 M F/véh/an en thermique** (essence/diesel, notre hypothèse marché). L'écart de 1,8× est
   l'effet mécanique de l'électrification, pas une erreur de mesure (cf. §6 bis).
   **Règle : le chiffrage suit la motorisation, jamais un chiffre unique de flotte.**
2. **« Recette nette » vs coût énergétique.** L'électrique consomme ~8 000 F/j contre ~40 000 F/j
   en thermique, soit 32 000 F/j d'écart — mais la recette nette n'augmente que de ~8 000 F/j entre
   premium thermique et premium EV. L'économie d'énergie va donc majoritairement **au chauffeur**
   (le rapport le dit : elle augmente sa capacité de remboursement), pas à l'opérateur.
   *Conséquence pour nous : le coût d'immobilisation de la flotte reste bien la recette nette
   (le versement), nos chiffres tiennent.* Mais l'argumentaire « pièces EV » doit viser
   l'opérateur sur la disponibilité, pas sur l'économie de carburant qui ne lui revient pas.
3. **10–15 % d'immobilisation** : sur quelle période, et quelle part est due aux pièces plutôt
   qu'à la main-d'œuvre, aux sinistres ou à l'administratif ? Notre promesse ne porte que sur la
   part « attente de pièce ». À faire préciser avant de s'engager sur un objectif chiffré.
4. **Prime de +10 à +50 %** : déclarée en réunion, jamais testée. À valider par une première
   transaction réelle avant d'en faire un pilier de pricing.

## 6 bis. L'électrification est la stratégie de GoCab, et elle est motivée par l'entretien

GoCab bascule vers un parc **exclusivement électrique**, et la raison invoquée n'est pas
l'écologie ni même le carburant : c'est **l'entretien**. Moins de pièces en mouvement, pas de
vidange ni de changement d'huile (là où un thermique y passe toutes les 4 à 6 semaines en usage
VTC), pas de filtres à huile, ni bougies, ni courroies, ni embrayage, ni échappement.

Conséquence chiffrée : **~720 000 F/véh/an en électrique contre ~1,3 M F/véh/an en thermique**,
soit **–45 % de dépense pièces**. C'est un fait à intégrer partout, y compris quand il nous
dérange.

### Ce que ça déplace dans notre modèle

**La mauvaise nouvelle, dite franchement** : sur un parc qui s'électrifie, notre assiette de marge
sur les pièces se contracte de moitié par véhicule. Un modèle assis sur la marge à la pièce se
rétrécit avec le marché qu'il sert.

**La bonne, et elle est plus grande** : les trois quarts de ce que l'électrification supprime sont
précisément les pièces **banalisées, disponibles partout, à faible marge** (filtres, huile,
bougies, courroies). Ce qui reste est **rare, spécifique, et immobilise le véhicule** — et c'est
sur celles-là que nous créons de la valeur. Ajouté au fait que l'EV est la catégorie au coût
d'immobilisation le plus élevé du parc (38 000 F/jour), le rapport de force se déplace vers nous :

| | Thermique | Électrique |
|---|---|---|
| Dépense pièces / an | ~1,3 M F | ~720 k F |
| Part de pièces banalisées (faible marge) | élevée | faible |
| Rareté des pièces restantes | moyenne | **élevée** (spécifiques constructeur) |
| Coût d'immobilisation / jour | 30 000 F | **38 000 F** |
| Valeur d'un service de disponibilité | forte | **maximale** |

**Conclusion de monétisation : sortir de la marge à la pièce.** Sur un parc électrique, la valeur
est dans l'abonnement flotte, la logistique, et le stock pré-positionné — pas dans le pourcentage
pris sur une vidange qui n'existe plus. Cela valide la direction de la spec logistique et
disqualifie définitivement un positionnement de revendeur.

### Profil d'usure spécifique EV — panier d'anticipation à revoir

L'électrique ne consomme pas moins de tout : il consomme **autre chose**.

- **Pneumatiques : consommation supérieure au thermique.** Batterie = surpoids (300–500 kg) et
  couple instantané. Déjà remplacés tous les 2 mois sur le parc GoCab — c'est la **première ligne**
  du panier d'anticipation, tous véhicules confondus.
- **Trains roulants et suspension : usure accélérée**, même cause (masse). Amortisseurs, rotules,
  silentblocs, roulements — le rapport le confirme (« usure modérée : pneumatiques, trains
  roulants »).
- **Freinage : consommation en forte baisse** grâce au freinage régénératif — mais surveiller la
  **corrosion des disques par sous-utilisation**, panne typique de l'EV urbain que le marché local
  ne connaît pas encore.
- **Spécifique EV** : filtre d'habitacle, liquide de refroidissement de batterie, composants HV
  (chargeur embarqué, onduleur, câblage) — rares, chers, sans marché de la casse, délai usine.
- **Disparaissent** : huile, filtres à huile, bougies, courroies, embrayage, échappement,
  démarreur, alternateur.

Le panier d'anticipation d'un parc EV est donc **plus court mais plus critique** : moins de
références, chacune plus rare et plus immobilisante. C'est exactement le profil qui justifie le
stock consigné.

## 7. Prochaines actions

- [ ] Faire confirmer par écrit : budget pièces mensuel, taux d'immobilisation et sa décomposition,
      recette nette par catégorie.
- [ ] Ajouter la notion de **millésime / phase de restylage** au référentiel véhicules et la rendre
      obligatoire sur les demandes de pièces sensibles.
- [ ] Coder la phase 1 de la spec logistique (moteur de coût total + matrice) avec une dépense
      pièces **indexée sur la motorisation** (720 k électrique / 1,3 M thermique) et 23/30/38 kF de
      recette nette.
- [ ] Ajouter la motorisation (ICE / EV / hybride) au modèle `Vehicle` si elle n'y est pas, et en
      faire un paramètre du calculateur ROI et du plan d'anticipation.
- [ ] Afficher les deux scénarios dans le calculateur ROI public (parc thermique vs parc
      électrique) — un prospect qui s'électrifie doit voir que notre valeur **augmente**.
- [ ] Cadrer l'offre pièces EV : pneus + trains roulants + composants HV, et corrosion de disques.
- [ ] Vérifier le coût réel d'une licence TecDoc/TecAlliance.

## Références

- [logistique-as-a-service.md](logistique-as-a-service.md) — matrice d'arbitrage et
  pré-positionnement (répond aux pivots 2 et 3)
- [gocab-part-requests.md](gocab-part-requests.md) — flux de demande de pièce mécanicien → manager
- `apps/api/src/modules/enterprise/invoice.service.ts` — facture normalisée, TVA, FEC
- `apps/api/src/modules/enrichment/` — identification IA (brique du référentiel)
