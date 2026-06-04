# CRO Bible — Pièces

**Public** : un·e nouveau·elle Chief Revenue Officer qui prend la responsabilité de **tout le revenu de Pièces** demain matin.
**Objectif** : 0 → machine à revenus prévisible, croissante et défendable en une journée de lecture. Tout ce qu'il faut pour transformer le marché décrit par le CEO en **chiffre d'affaires encaissé**, optimiser chaque levier de monétisation, et faire de Pièces une entreprise dont le revenu se prévoit au franc près.

> **Avant de toucher quoi que ce soit** : lis [`CEO_BIBLE.md`](CEO_BIBLE.md) (la thèse, le marché, les 5 mouvements), [`CTO_BIBLE.md`](CTO_BIBLE.md) (ce que la machine peut instrumenter et facturer), [`DESIGN.md`](../DESIGN.md) (les règles produit non négociables), puis ce document. Le CRO vit à l'intersection des trois : **le CEO fixe le cap, le CTO construit l'instrument, le CRO encaisse**.

> **Règle d'or du poste** : le CRO ne possède pas une fonction (vente, ou pricing, ou succès client). Le CRO possède **un nombre** — le revenu net récurrent et transactionnel — et tout ce qui le fait monter ou descendre. Si ça touche au revenu, c'est ton problème, même si l'équipe est ailleurs.

---

## 1. Le mandat en 90 secondes

Pièces a trois moteurs de revenu, pas un :

1. **Le transactionnel** (commission marketplace) — volatil, à fort volume, dépend du flux mécanicien→propriétaire→vendeur. C'est le **GMV × take rate**.
2. **Le récurrent** (abonnements Flotte Pro / Pro +) — prévisible, à forte marge, defendable. C'est le **MRR/ARR**.
3. **Le service & conformité** (facturation FNE-CI, prestations, data) — petit aujourd'hui, levier d'acquisition et de rétention demain, centre de profit à terme.

**Le job du CRO** : faire croître les trois simultanément sans les opposer, en déplaçant progressivement le centre de gravité du **transactionnel volatil** vers le **récurrent prévisible**. Une entreprise qui vaut cher se mesure à la part de revenu récurrent, à la rétention nette (NRR) et à la prévisibilité du forecast — pas au GMV brut.

**La cible** (alignée CEO Bible) : à 36 mois, **3 à 5 Mds F de revenu net/an**, dont **≥ 50% récurrent**, NRR > 115%, forecast trimestriel tenu à ±10%, et un coût d'acquisition amorti en < 9 mois sur tous les segments.

**Les trois erreurs qui tuent un CRO ici** :
- Acheter du GMV non rentable pour gonfler un chiffre de vanité.
- Vendre du Flotte Pro + sans que l'ops puisse tenir le SLA 4h (churn explosif).
- Brader la facture FNE-CI ou les abonnements en early-stage et ne jamais réussir à remonter les prix.

---

## 2. L'architecture de revenu — où l'argent entre, précisément

### 2.1 Les quatre flux et leur mécanique d'encaissement

| Flux | Déclencheur d'encaissement | Qui paie | Quand | Marge brute cible |
|---|---|---|---|---|
| **Commission marketplace** | Release de l'escrow à la livraison confirmée | Le vendeur (prélevée sur le montant reversé) | À chaque transaction `CONFIRMED → COMPLETED` | 80–90% |
| **Abonnement Flotte Pro** | Prélèvement Mobile Money / virement mensuel | La flotte (entreprise) | Mensuel, terme à échoir | 70–80% |
| **Abonnement Flotte Pro +** | Idem + premium SLA | La flotte (entreprise) | Mensuel, terme à échoir | 60–70% |
| **Service FNE-CI / data / prestations** | Forfait ou à l'usage | Flotte hors abonnement, corporate, tiers (assureurs) | Mensuel ou ponctuel | 50–70% |

**À connaître par cœur** : le revenu marketplace n'est **reconnu** qu'au release escrow (état `COMPLETED` de la state machine — voir CTO Bible, `order.stateMachine.ts`). Une commande `PAID` mais non livrée n'est **pas** du revenu : c'est du GMV en transit. Ne jamais forecaster sur du GMV non livré.

### 2.2 La formule maîtresse du revenu

```
Revenu net Pièces
  = (GMV livré × take rate effective)                    ← transactionnel
  + (Véhicules actifs × ARPU abonnement)                 ← récurrent
  + (Factures FNE-CI hors-abo + prestations + data)      ← service
```

Décompose chaque terme jusqu'au levier actionnable :

- **GMV livré** = commandes livrées/jour × panier moyen × jours.
- **Take rate effective** = commission affichée − (remises + impayés + fraude + rétro-commissions Liaison).
- **Véhicules actifs** = véhicules signés × (1 − churn) + expansion (upsell Pro → Pro +).
- **ARPU abonnement** = mix Pro (5 000 F) / Pro + (10 000 F) × taux de recouvrement réel.

**Chaque levier de ce développement est un projet CRO**. Si tu ne sais pas lequel bouger ce trimestre, tu n'as pas de plan.

### 2.3 Les fuites de revenu (revenue leakage) — la chasse permanente

Le revenu ne se perd pas qu'en haut du funnel. Audit mensuel obligatoire sur :

- **Take rate erodée** : remises commerciales non gouvernées, commissions Liaison qui grignotent la marge, exonérations « one-shot » devenues permanentes.
- **Impayés abonnement** : prélèvements Mobile Money échoués non relancés → MRR fantôme. Toute facture impayée > 15 jours sort du MRR reconnu.
- **GMV qui fuit hors-plateforme** : mécanicien et vendeur qui se recontactent en direct après une première mise en relation (le « leakage WhatsApp »). C'est la fuite n°1 d'une marketplace. Mesure-la, combats-la (cf. §6.4).
- **Downgrade silencieux** : flotte qui réduit son nombre de véhicules abonnés sans churner formellement.
- **Sous-facturation FNE-CI** : factures émises gratuitement « pour rendre service » qui ne remontent jamais en tarif.

---

## 3. Stratégie de monétisation — la doctrine

### 3.1 Principe directeur : capter la valeur là où elle est ressentie

Le CEO Bible le dit (§2.3) : **les flottes paient pour l'intelligence (savoir où part l'argent) et le SLA (ne pas perdre une journée), pas pour des notifications.** Le pricing doit suivre la valeur perçue, jamais le coût de la feature.

- **Mécanicien / propriétaire** : sensibles au prix et à la confiance. On monétise par **commission invisible** (intégrée, jamais un surcoût affiché au-dessus du prix vendeur) + breakdown transparent qui justifie la valeur (cf. DESIGN.md, breakdown obligatoire). On ne facture **jamais** d'abonnement au mécanicien en phase d'acquisition.
- **Flotte** : sensible au coût total et à l'immobilisation. On monétise par **abonnement par véhicule** indexé sur la valeur du pilotage et du SLA, pas sur l'usage marketplace.
- **Corporate / BTP** : sensible à la conformité fiscale et à la disponibilité. On monétise par **abonnement premium + service FNE-CI** vendu comme récupération de TVA, donc **ROI-positif côté client** dès le premier mois.

### 3.2 La règle de monétisation segmentée

| Segment | Levier principal | Levier secondaire | Ce qu'on NE facture jamais |
|---|---|---|---|
| Mécanicien indépendant | Commission marketplace | — | Abonnement, frais d'inscription |
| Propriétaire particulier | Commission (incluse au prix) | Livraison express ponctuelle | Frais cachés (interdit DESIGN.md) |
| Flotte VTC | Abonnement Pro/Pro + | Commission sur pièces hors-stock | Frais de mise en service > 1 mois d'abo |
| BTP / corporate | Abonnement Pro + | FNE-CI + data + prestations | Rien gratuitement de façon permanente |
| Vendeur Adjamé | Commission (prélevée au release) | Mise en avant catalogue (plus tard) | Abonnement vendeur tant qu'on construit l'offre |

### 3.3 Déplacer le centre de gravité (la thèse financière du CRO)

```
An 1 :  transactionnel 60% | récurrent 30% | service 10%
An 2 :  transactionnel 50% | récurrent 42% | service 8%
An 3 :  transactionnel 40% | récurrent 50% | service 10%
```

Chaque trimestre, la part de récurrent doit monter. C'est ce qui transforme un GMV joli mais volatil en une entreprise valorisable sur un multiple d'ARR. **Le CRO est jugé sur cette transition autant que sur le chiffre absolu.**

---

## 4. Pricing — le laboratoire

### 4.1 Architecture de prix actuelle (référence)

- **Commission marketplace** : 5 à 10% côté vendeur, prélevée à l'escrow release. Le floor de commission Liaison reste **server-side**, jamais affiché comme recommandation UI (voir `memory/feedback-liaison-commission.md` — règle load-bearing : on observe ce que les vendeurs acceptent, on ne suggère pas de prix).
- **Flotte Pro** : 5 000 F / véhicule / mois.
- **Flotte Pro +** : 10 000 F / véhicule / mois (SLA 4h, urgence, support dédié).
- **Pricing grand compte** : dégressif par volume (voir `pricing-flotte-2026-05-27.md`, `offre-vtc-6000-vehicules-2026-05.md`, `offre-btp-800-vehicules-2026-05.md`).

### 4.1bis La donnée prix concurrent (nouveau, 2026-05-29)

Depuis le 2026-05-29, le catalogue intègre **3 780 références prix de global-auto.online** (mises à jour via le scraper ingest, vendor « Global Auto », visibles publiquement). C'est notre **premier jeu de données prix concurrent live et structuré** — exploite-le :

- **Benchmark de take rate** : sur les références où on a un prix concurrent en face, mesurer notre prix vendeur effectif vs le leur → ajuster la commission par catégorie sans casser la compétitivité.
- **Détection de leakage prix** : alerter quand une de nos lignes est significativement au-dessus du concurrent sur la même pièce (risque de désintermédiation, cf. §6.4).
- **Argument de vente flotte** : « voici l'écart de prix moyen vs le marché en ligne sur votre panier réel ».
- Refresh périodique du scraper = la donnée reste fraîche (chantier ingest §3 CTO Bible).

### 4.2 Les sept leviers de pricing à tester

1. **Take rate variable par catégorie de pièce** : marge plus élevée sur ré-usiné/OEM (valeur + garantie) que sur l'occasion importée bas prix. Teste 6% / 8% / 10% par segment.
2. **Take rate variable par condition** : la garantie Pièces vaut plus cher sur du neuf/OEM. Le chip condition (DESIGN.md) est aussi un signal de pricing.
3. **Dégressivité abonnement par paliers de flotte** : 1–9 véhicules plein tarif, 10–49 / 50–199 / 200+ dégressifs. Optimiser le point de bascule pour maximiser le revenu total, pas le prix unitaire.
4. **Engagement vs flexibilité** : remise pour engagement 12 mois (−15%) vs mensuel sans engagement (plein tarif). Vendre la prévisibilité.
5. **Bundling Pro + FNE-CI** : packager la conformité dans le Pro + plutôt que la facturer à part → augmente l'ARPU et la stickiness.
6. **Frais d'urgence à l'acte** : pour les non-abonnés, livraison express SLA 4h facturée à l'unité (porte d'entrée vers Pro +).
7. **Floor de panier** : commission minimale en valeur absolue sur les petits paniers (sinon les pièces à 3 000 F coûtent plus cher à servir qu'elles ne rapportent).

### 4.3 Gouvernance des remises (discount governance)

La remise est le levier le plus dilutif et le plus mal gouverné de toute organisation de revenu. Règles non négociables :

| Niveau de remise | Qui approuve | Contrepartie obligatoire |
|---|---|---|
| 0–10% | AE seul | Engagement 12 mois |
| 11–20% | Head of Sales | Engagement 12 mois + cas client publiable |
| 21–30% | CRO | Engagement 24 mois + volume garanti |
| > 30% | CRO + CEO | Décision stratégique documentée (logo, référence marché) |

- **Toute remise a une contrepartie.** Jamais de remise « pour signer ». Une remise sans contrepartie est une fuite de revenu permanente.
- **Les remises pilote sont temporaires et datées.** Un pilote « 3 mois gratuits » a une date de fin écrite dans le contrat et une bascule automatique au tarif plein. Le CRO traque la conversion pilote→payant comme un KPI dédié.
- **Pas de remise sur la commission marketplace en early-stage.** La take rate est l'actif le plus dur à remonter une fois baissé.

### 4.4 Méthode de test prix

- **Jamais de big-bang.** Tout changement de prix se teste sur une cohorte (nouvelle ville, nouveau segment, nouveaux clients) avant généralisation.
- **Grandfathering** : les clients existants gardent leur prix sur la durée de l'engagement en cours, montent au renouvellement. On ne casse pas la confiance pour gratter 5%.
- **Mesure** : pour chaque test, on mesure la take rate effective ET le taux de conversion ET le churn à 90 jours. Un prix qui monte la marge mais tue la conversion est un mauvais prix.

---

## 5. La machine de vente — playbooks par segment

### 5.1 Vente flotte VTC indépendante (le cœur du récurrent)

**ICP prioritaire** (mois 3–9, aligné CEO Bible) : sociétés VTC 20 à 200 véhicules, gérant joignable, douleur cash-flow/immobilisation forte.

**Cycle de vente cible** : 21 jours signature → pilote 30 jours → déploiement 60 jours.

**Les 5 étapes du playbook** :
1. **Qualification (BANT adapté)** : Budget (paie déjà des pièces, oui), Authority (le gérant décide), Need (combien de véhicules immobilisés/mois ?), Timeline (douleur actuelle ?). Disqualifier vite les < 10 véhicules sans douleur.
2. **Démo douleur** : ne pas démontrer des features. Montrer **leur** coût pièces actuel non piloté vs le dashboard Pièces. « Tu sais combien tu as dépensé en plaquettes ce trimestre ? Non. Nous oui. »
3. **Pilote instrumenté** : 30 jours, 100% des véhicules ou un sous-parc représentatif. Objectif : produire **la preuve chiffrée** (−18 à −25% budget pièces, X jours d'immobilisation évités).
4. **Business case de conversion** : à J+30, présenter le ROI réel mesuré. Le prix de l'abonnement doit être < 1/5 de l'économie démontrée.
5. **Signature + déploiement** : engagement 12 mois, onboarding ops cadré, premier prélèvement à J+30 de la signature.

**Objection killers** :
- « C'est cher » → « C'est 5 000 F/mois contre 30 000 à 50 000 F par jour de véhicule immobilisé. Un seul véhicule sauvé par mois, c'est rentabilisé 6 fois. »
- « J'ai déjà mon mécanicien » → « On ne remplace pas ton mécanicien, on lui trouve la pièce moins chère et plus vite, et tu vois enfin où part ton argent. »
- « Je verrai plus tard » → pilote gratuit 30 jours, ROI mesuré, zéro engagement avant la preuve.

### 5.2 Vente grand compte (VTC plateformes, BTP, corporate)

**Cycle long** : 3 à 6 mois. Profil AE senior, plusieurs interlocuteurs (gérant ops + DAF + parfois DG).

- **Le DAF est ton allié, pas ton obstacle.** L'argument FNE-CI / récupération TVA parle directement à lui : « Vos chauffeurs achètent en cash → vous perdez 18% de TVA non récupérable. Avec Pièces, vous la récupérez. » (CEO Bible §5, mouvement 3).
- **Documents existants** : `brochure-vtc-grand-compte-2026-05`, `brochure-btp-grand-compte-2026-05`, `offre-vtc-6000-vehicules-2026-05`, `offre-btp-800-vehicules-2026-05`. Les utiliser, ne pas réinventer.
- **Pricing** : Pro + par défaut sur BTP (disponibilité critique). Dégressif documenté. Toute dérogation passe la gouvernance remise (§4.3).
- **Closing** : pilote sur un sous-parc (50–100 véhicules), preuve, puis déploiement masse contractualisé par paliers.

### 5.3 Partenariats plateformes VTC (Yango, Heetch, Treepz)

Canal de volume, pas de marge unitaire. Modèle :
- Offre intégrée pour les conducteurs partenaires (API, voir CTO Bible).
- Revenue share si nécessaire pour débloquer le volume.
- **Attention** : un deal plateforme mal négocié peut diluer toute la take rate. Plancher de marge non négociable défini avant d'entrer en négociation.

### 5.4 Le rôle du réseau Liaison dans le revenu

Les Liaisons sourcent l'offre (vendeurs) mais sont aussi un **canal de demande** : ils recommandent Pièces aux mécaniciens qu'ils croisent. Leur commission (3–5% sur ventes générées, floor server-side) est un **coût d'acquisition variable** qui doit rester sous le seuil de marge. Le CRO arbitre en continu : commission Liaison vs take rate vs marge nette. Si la commission Liaison + remises dépasse la take rate, la transaction perd de l'argent.

---

## 6. Revenue Operations — la prévisibilité

### 6.1 Le funnel et ses taux de conversion

Instrumenter et suivre chaque étape, par segment :

```
Lead → Qualifié (SQL) → Démo → Pilote → Signé → Déployé → Payant récurrent
```

- Taux de conversion à chaque étape, en tendance.
- Vélocité (jours par étape).
- Valeur moyenne du contrat (ACV) par segment.
- **Pilote→Payant** : le KPI le plus important du B2B. Sous 60% = problème de qualification ou de preuve.

### 6.2 Forecasting — la discipline

- **Bottom-up** (somme des deals pondérés par probabilité) confronté au **top-down** (capacité × taux historiques).
- Catégories de pipeline : Commit / Best Case / Pipeline. Le Commit est sacré : un AE qui rate son Commit deux trimestres de suite est un problème de process, pas de chance.
- **Forecast tenu à ±10% au trimestre dès M9.** Avant ça, on construit l'historique. Un forecast non tenu détruit la crédibilité auprès du board et tue la planification cash.

### 6.3 Le CRM et la donnée de revenu

- **Source de vérité unique** sur le pipeline (un CRM, même léger — pas un Excel par AE). Sans ça, pas de forecast, pas de coaching, pas d'attribution.
- **Attribution** : savoir quel canal génère quel revenu à quel CAC. Liaison vs vente directe vs partenariat vs bouche-à-oreille. On réalloue le budget vers les canaux au meilleur LTV/CAC.
- Réconciliation mensuelle CRM ↔ facturation ↔ encaissement réel. Le revenu reconnu = le revenu encaissé, pas le revenu signé.

### 6.4 Combattre le leakage marketplace (disintermediation)

La fuite hors-plateforme est la menace existentielle d'une marketplace. Tactiques :
- **Garantie Pièces uniquement on-platform** : la pièce achetée hors-plateforme n'est pas garantie. La garantie est la raison de rester.
- **Escrow + facture FNE-CI on-platform** : le propriétaire et le DAF veulent la trace fiscale et la protection paiement.
- **Historique et pilotage flotte on-platform** : la valeur du dashboard disparaît si on achète à côté.
- **Mesure** : taux de ré-achat on-platform par mécanicien/flotte. Une chute signale du leakage à investiguer.

---

## 7. Rétention, churn et expansion — où se gagne la vraie valeur

### 7.1 La hiérarchie de la valeur revenue

> Acquérir un nouveau client coûte 5 à 7× plus cher que retenir un existant. Et **l'expansion (upsell/cross-sell) est le revenu le moins cher de tous.** Le CRO qui ne pilote que l'acquisition laisse l'argent le plus facile sur la table.

### 7.2 NRR — Net Revenue Retention, la métrique reine du récurrent

```
NRR = (MRR début + expansion − contraction − churn) / MRR début
```

- **Cible : NRR > 115%** à M18. Au-dessus de 100%, la base existante grandit toute seule même sans nouveau client.
- Leviers d'expansion : véhicules ajoutés à une flotte existante, upsell Pro → Pro +, attachement FNE-CI/data, montée du panier marketplace.
- Leviers anti-contraction : pilotage proactif des flottes qui réduisent leur parc, alertes sur baisse d'usage.

### 7.3 Le playbook anti-churn flotte

**Cible CEO Bible : churn flotte < 5%/mois.** Au-delà, le récurrent ne tient pas.

- **Onboarding = rétention.** Un client qui ne voit pas la valeur dans les 30 premiers jours churne. Le succès client commence à la signature, pas à la première réclamation.
- **Health score par compte** : usage du dashboard, nombre de commandes via plateforme, tickets support, paiements à l'heure. Un score qui baisse = intervention avant le churn, pas après.
- **Le SLA est le contrat moral.** Sur Pro +, un SLA 4h raté répété = churn garanti. Ne **jamais** vendre du Pro + là où l'ops ne suit pas (cf. les 10 erreurs CEO Bible).
- **QBR (Quarterly Business Review)** pour les comptes > 50 véhicules : présenter les économies réalisées, c'est la justification du renouvellement et l'ouverture de l'upsell.

### 7.4 Expansion marketplace

Côté transactionnel, « l'expansion » c'est :
- **Augmenter le panier moyen** (objectif an 1 : 32 000 F) : suggestions de pièces complémentaires, kits (plaquettes + disques).
- **Augmenter la fréquence** : entretien préventif suggéré sur l'historique (P2 roadmap CTO).
- **Augmenter le taux d'attachement** livraison express / garantie premium.

---

## 8. Unit economics — les chiffres à connaître par cœur

Repris et étendus du CEO Bible §6.2 (source de vérité partagée) :

| Métrique | Cible | Note CRO |
|---|---|---|
| Panier moyen marketplace (an 1) | 32 000 F | Lever via bundling + suggestions |
| Take rate effective | 8% (objectif) | Après remises/impayés/fraude/Liaison |
| Revenu net / transaction | ~2 560 F | À volume, c'est le moteur transactionnel |
| CAC mécanicien | < 1 500 F | Organique + Liaison |
| CAC flotte VTC indépendante | 25 000–60 000 F | Commercial terrain + démo |
| LTV Flotte Pro (24 mois) | ~85 000 F/véhicule | À 5 000 F/mois, churn 4% |
| Ratio LTV/CAC | > 4 sur tous segments dès M12 | En dessous de 3 = canal à revoir |
| Payback CAC | < 9 mois | Au-delà, le cash se tend |
| NRR | > 115% à M18 | La métrique de création de valeur |
| Marge brute sur revenu net | > 30% à M12 | Condition validation Série A |

**Le test de santé d'un canal** : LTV/CAC > 4 ET payback < 9 mois ET marge brute positive après commission Liaison/remises. Si les trois ne sont pas verts, on ne scale pas le canal — on le répare ou on l'arrête.

---

## 9. Organisation revenu — l'équipe à 12 et 24 mois

### 9.1 Périmètre CRO

Sous la responsabilité du CRO : **Sales (B2B), Revenue Operations, Customer Success, Pricing, Partnerships**. Le marketing d'acquisition (demande mécanicien/particulier) peut être partagé avec le CEO/marketing selon le découpage retenu, mais le CRO en possède le **résultat revenu**.

> Note de frontière : le réseau Liaison est opérationnellement sous le Head of Liaison (ops terrain, CEO Bible §8), mais le CRO co-pilote la **commission Liaison comme levier de coût d'acquisition** et le **flux de demande** qu'il génère. Frontière à clarifier explicitement dès la prise de poste.

### 9.2 Équipe revenu M12

| Pôle | ETP | Rôles clés |
|---|---|---|
| Direction revenu | 1 | CRO |
| Sales B2B | 5 | Head of Sales, 3 AE seniors, 1 SDR |
| Revenue Operations | 1 | RevOps lead (CRM, forecast, attribution, pricing analytics) |
| Customer Success | 2 | Head of CS + 1 CSM (rétention + expansion flotte) |

### 9.3 Équipe revenu M24

Ajouts : VP Sales, 2e CSM + CS manager, Pricing/RevOps analyst dédié, Partnerships manager (plateformes VTC + prescripteurs DAF/experts-comptables), SDR supplémentaires. Spécialisation par segment (VTC / BTP / corporate).

### 9.4 Plans de compensation — aligner l'argent sur le bon comportement

Le comp plan est le levier de management le plus puissant du CRO. Principes :

- **L'AE est payé sur le revenu net signé, pondéré par la qualité** : accélérateurs au-delà du quota, mais **clawback** si le client churne dans les 90 jours (anti-vente forcée).
- **Le CSM est payé sur la rétention nette (NRR) et l'expansion**, pas sur l'acquisition. C'est ce qui aligne le succès client sur la création de valeur.
- **Le SDR est payé sur les SQL qualifiés acceptés par les AE**, pas sur les leads bruts (anti-spam de pipeline).
- **Pas de commission sur les remises non gouvernées.** La commission se calcule sur le revenu net après remise, pour que l'AE ait intérêt à protéger le prix.
- **Bonus collectif RevOps/CS sur la tenue du forecast et le churn**, pour casser les silos.

---

## 10. KPIs — le dashboard CRO

### 10.1 Quotidien (revue rapide matin)

- GMV livré J-1, panier moyen, take rate effective du jour.
- Nouveaux abonnements signés / churns enregistrés.
- Prélèvements abonnement échoués (à relancer dans la journée).

### 10.2 Hebdomadaire (lundi, avant le standup direction)

- Pipeline par étape et par AE, vélocité, Commit du trimestre.
- MRR/ARR, net new MRR (new + expansion − contraction − churn).
- Conversion pilote→payant en cours.
- Health scores flotte en zone rouge → plan d'action.
- Take rate effective vs affichée (détection de leakage remise).

### 10.3 Mensuel (board pack revenu)

- Revenu net total, split transactionnel / récurrent / service (et la tendance du mix — cf. §3.3).
- ARR, NRR, churn brut et net, contraction.
- CAC par segment, LTV, ratio LTV/CAC, payback.
- Forecast vs réalisé (écart en %).
- % GMV via FNE-CI, ARPU abonnement, attachement upsell.
- Cohortes : rétention par cohorte de signature (la vérité sur la durabilité du revenu).

### 10.4 Trimestriel (revue stratégique revenu)

- Tenue du forecast (±10% cible).
- Évolution du mix de revenu vs plan (transition vers récurrent).
- Performance par canal d'acquisition (réallocation budget).
- Top deals gagnés / perdus, analyse des raisons de perte (win/loss).
- Roadmap pricing & packaging T+1.

---

## 11. Le plan de revenu — 90 jours, 12 mois, 24 mois

### 11.1 Les 90 premiers jours du CRO

**Semaines 1–4 — Diagnostiquer**
- Cartographier les 4 flux, mesurer la take rate effective réelle (pas affichée), le MRR réel (net des impayés), le churn réel.
- Auditer le leakage (remises, impayés, disintermediation, sous-facturation FNE-CI).
- Mettre une source de vérité unique sur le pipeline (CRM léger).

**Semaines 5–8 — Stabiliser**
- Instaurer la gouvernance des remises (§4.3) immédiatement — c'est la fuite la plus rapide à arrêter.
- Cadrer le playbook de vente flotte (§5.1) et le mesurer.
- Définir le health score flotte et lancer le suivi anti-churn.

**Semaines 9–12 — Construire la prévisibilité**
- Premier forecast bottom-up formalisé.
- Comp plans alignés (§9.4).
- Premier test de pricing sur une cohorte.
- Premier QBR avec les plus gros comptes flotte.

### 11.2 Objectifs revenu M12 (alignés CEO Bible)

- 600+ commandes/jour, panier moyen 32 000 F.
- 1 500 véhicules sous abonnement, churn < 5%/mois.
- GMV mensuel > 250 MF, marge brute > 30% sur revenu net.
- Forecast tenu à ±10% sur les deux derniers trimestres.
- Take rate effective ≥ 7,5% (après toutes fuites).

### 11.3 Objectifs revenu M24

- ≥ 4 200 véhicules sous abonnement (VTC + BTP + corporate).
- NRR > 115%.
- Part de récurrent ≥ 42% du revenu net.
- Au moins un contrat grand compte > 300 véhicules pleinement déployé et référençable.
- FNE-CI passé de levier d'acquisition à contributeur de marge mesurable.

---

## 12. Les 10 erreurs de revenu à ne jamais commettre

1. **Forecaster sur du GMV non livré.** Le revenu, c'est l'escrow released, pas la commande passée.
2. **Brader la take rate ou les abonnements en early-stage.** Le prix le plus dur à remonter est celui qu'on a baissé.
3. **Vendre du Pro + sans capacité SLA prouvée.** Churn garanti, marque abîmée.
4. **Laisser les remises sans gouvernance.** La fuite la plus silencieuse et la plus durable.
5. **Payer les AE sur le signé sans clawback.** Tu achètes du churn et de la vente forcée.
6. **Ignorer le leakage hors-plateforme.** C'est la mort lente de toute marketplace.
7. **Confondre acquisition et revenu.** L'expansion et la rétention sont le revenu le moins cher — les négliger, c'est laisser l'argent facile.
8. **Surfacturer la FNE-CI au début.** C'est un cheval de Troie d'acquisition fiscale, pas un centre de profit immédiat.
9. **Empiler des pilotes gratuits sans date de fin ni mesure de conversion.** Un pilote sans bascule contractuelle est une remise déguisée infinie.
10. **Piloter un seul flux.** Optimiser la commission en cassant le récurrent (ou l'inverse) détruit la valeur. Le CRO arbitre les trois ensemble.

---

## 13. Conclusion — pourquoi le CRO fait la différence

Le CEO a raison sur le marché : il est gigantesque, fragmenté, mal servi, et la fenêtre est ouverte. Le CTO peut construire l'instrument. Mais **un marché énorme et un bon produit ne font pas une entreprise** — c'est la machine de revenu qui les transforme en valeur.

Le travail du CRO est de rendre le revenu de Pièces **prévisible, croissant et défendable** :
- **Prévisible** par la discipline du forecast, du pipeline et de la donnée.
- **Croissant** par l'acquisition rentable, l'expansion et la rétention nette.
- **Défendable** par le déplacement vers le récurrent, le combat contre le leakage, et la gouvernance du prix.

À 36 mois, le succès se lit sur trois nombres : **revenu net (3–5 Mds F)**, **part de récurrent (≥ 50%)**, **NRR (> 115%)**. Si ces trois sont verts, Pièces n'est pas une marketplace prometteuse — c'est une entreprise qui se valorise.

Le reste — marché, produit, ops, finance — est dans la CEO Bible, la CTO Bible, DESIGN.md, et les brochures commerciales (`brochure-commerciale-pieces`, `brochure-commerciale-entreprises-2026-06-03`, `brochure-vtc-grand-compte-2026-05`, `brochure-btp-grand-compte-2026-05`, `offre-vtc-6000-vehicules-2026-05`, `offre-btp-800-vehicules-2026-05`, `pricing-flotte-2026-05-27`).

**Lis-les. Puis encaisse.**

---

*Pièces — la pièce qu'il te faut, au juste prix, livrée et garantie.*
*Document interne · Handover CRO · v1.0 · 28 mai 2026.*
