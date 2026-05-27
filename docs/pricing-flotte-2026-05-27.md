# Étude de pricing — Packaging Pro Flotte à 3 niveaux
Document interne · Statut : étude pré-décisionnelle · Auteur : Pièces, équipe produit · Date : mai 2026

## Contexte et erreur conceptuelle à éviter
Le modèle initialement envisagé reposait sur un gratuit très large (dashboard, import CSV, stock tampon, comparateur, garantie, retours, centres de maintenance, plans d'entretien) et un payant minimal (quelques notifications WhatsApp, support prioritaire, PDF historique, revue trimestrielle). Aucune entreprise rationnelle n'aurait payé 100 000 F/mois (flotte de 20) pour ça. Le gratuit cannibalisait l'abonnement.
L'erreur conceptuelle : placer la gestion en gratuit et l'information en payant. C'est l'inverse qu'il faut faire. Les flottes veulent bien payer pour comprendre où part leur argent (intelligence) — beaucoup moins pour recevoir une notification de plus. La présente étude inverse ce découpage.

## Trois leviers structurent la conception
Coût marginal véhicule très faible. Chaque véhicule ajouté à une flotte génère peu de coûts incrémentaux pour Pièces, alors que les clients attribuent une réelle valeur à la gestion centralisée multi-véhicules. Le pricing par véhicule capte cette valeur sans coût Pièces correspondant.
L'urgence est sous-monétisable par la seule commission marketplace. Un véhicule immobilisé coûte 30 000 à 50 000 FCFA par jour à un transporteur ou un taxi. Les frais de livraison standard ne capturent pas cette valeur — il faut un produit dédié.
La récurrence est essentielle. Sans abonnement, Pièces est exposé à la saisonnalité et aux décisions d'achat ponctuelles. Une assise récurrente lisse les revenus et autorise les investissements long terme.

## Principe directeur — trois promesses, le 3 inclut le 2

Trois niveaux, trois promesses. Le Plan Continuité est désormais une **extension du Pro Flotte** : prendre Continuité, c'est prendre Pro Flotte plus la couche urgence/SLA. Le gratuit reste indépendant.

| Niveau | Promesse client | Économie Pièces |
|---|---|---|
| Gratuit « Pièces.ci » | Achetez mieux. La marketplace, la confiance, la transaction sécurisée. | Commission fournisseur (5-10 %). |
| Étage 1 « Pro Flotte » | Pilotez votre flotte. Analytique, prévention, automatisation, conformité fiscale. | Abonnement par véhicule. Revenu récurrent prévisible. |
| Étage 2 « Plan Continuité » = Pro Flotte + urgence | Tout Pro Flotte + ne perdez plus une journée. SLA monétisé, assistance dédiée. | Pro Flotte par véhicule + forfait flotte 10 000 F/mois pour la couche urgence. |

Continuité inclut systématiquement Pro Flotte. On ne peut pas prendre Continuité sans Pro Flotte — l'urgence n'a de sens que sur une flotte déjà pilotée (alertes prédictives, stock tampon, fiches véhicule). Le bundling est volontaire à ce niveau ; pour le reste, le client garde la liberté de rester en gratuit ou de monter en Pro Flotte sans Continuité.

## Packaging détaillé
## Gratuit — « Pièces.ci »
Objectif : acquisition large, confiance marketplace, monétisation via commission fournisseur uniquement.
- Catalogue compatibilité véhicule (fitments structurés)
- Comparateur multi-fournisseurs sur le prix uniquement (pas le scoring qualité)
- Garantie pièce intermédiée + workflow retours structuré — indispensables à la confiance marketplace
- 1 centre de maintenance déclaré
- 2 utilisateurs maximum
- Fiche véhicule basique + historique brut des commandes
- Export CSV des commandes

## Étage 1 — « Pièces Pro Flotte » · 5 000 F / véhicule / mois
Objectif : monétiser la valeur réelle livrée aux flottes structurées via récurrence prévisible.

### Intelligence flotte (le cœur de l'offre)
- Véhicules et utilisateurs illimités, rôles fins (gestionnaire, mécanicien, comptable)
- Tableau de bord flotte multi-véhicules
- Détection automatique des véhicules « gouffres » (coût > 1,5× la moyenne flotte similaire) — killer feature
- Fiche véhicule enrichie : coût cumulé, YTD, vs flotte similaire, graphique 12 mois
- Comparateur enrichi : scoring qualité fournisseur sur 100, garantie comparée
- Reporting avancé : coût/km, par catégorie, mois/mois, exports CSV flotte

### Automatisation
- Alertes prédictives multi-canal (WhatsApp / SMS / email)
- Stock tampon avec réapprovisionnement automatique
- Centres de maintenance multiples + rattachement véhicule  centre
- Jour de livraison hebdomadaire défini par centre

### Facturation & conformité fiscale (nouveau)
- **Factures normalisées DGI** — émission conforme au standard de facturation normalisée de la Direction Générale des Impôts (numéro de validation, QR code, mentions obligatoires) sur toutes les commandes effectuées via la plateforme.
- **Facture mensuelle consolidée** — un PDF unique récapitulant toutes les commandes du mois (vendeur, véhicule, centre, TVA détachée), prêt à transmettre au comptable. Fin des liasses à reconstituer.
- **Module optimisation fiscale** — ventilation automatique des dépenses par catégorie déductible (pièces de rechange, entretien, réparation), calcul de la TVA récupérable, export FEC compatible logiciel comptable. Pour les flottes sous régime du réel, économie d'impôt typique : 1 à 2 % du budget pièces annuel.

### Service
- PDF historique véhicule signé Pièces (argument revente)
- Support prioritaire première réponse < 4 h ouvrées
- Revue trimestrielle de flotte (30 min) avec Liaison Pièces

## Étage 2 — « Plan Continuité » · Pro Flotte + 10 000 F / mois forfaitaire flotte
Objectif : vendre de l'assurance opérationnelle **en sus** du pilotage Pro Flotte. Le Plan Continuité inclut systématiquement toutes les fonctionnalités de Pro Flotte (intelligence flotte, automatisation, facturation normalisée, service) et y ajoute la couche urgence ci-dessous.

Tarification : abonnement Pro Flotte par véhicule (5 000 F dégressif) **+** forfait flotte Plan Continuité 10 000 F/mois. Exemple flotte 20 véhicules : 100 000 F (Pro Flotte) + 10 000 F (Continuité) = 110 000 F/mois.

Couche urgence ajoutée :
- Abidjan : livraison 3 h chrono, 5 livraisons express incluses, +1 500 F au-delà
- Hors Abidjan : livraison J+1 garantie (vs J+2/J+3 standard), 2 livraisons J+1 incluses
- SLA monétisé : remboursement intégral + 5 000 F de crédit en cas de breach
- Pickup prioritaire chez le vendeur en 30 min
- Ligne WhatsApp dédiée 6 h – 22 h, 7 j / 7
- Concierge dépannage : un appel, Pièces trouve et achemine la pièce

## Pourquoi ce découpage fonctionne
#### Stock tampon en gratuit, mais manuel.
Le client voit la valeur du concept en self-service, comprend la mécanique. Quand il veut l'auto-replenishment (« ne plus jamais y penser »), il monte en Pro Flotte. Le stock tampon passe de « cadeau qui dilue le payant
» à « appât qui pousse vers le payant ».
#### Comparateur sur le prix en gratuit, scoring qualité en payant.
La marketplace fonctionne avec le seul prix — c'est la commission qui paye Pièces. Mais la décision intelligente (qualité × prix × délai × scoring fournisseur) devient un argument fort pour Pro Flotte.
#### Détection des outliers « coût élevé » en payant.
C'est le killer feature avec le témoignage chiffré le plus fort (« 3 Hilux, 4 M FCFA d'économie projetée »). Le placer en payant est non-négociable : sinon la brochure vend un service gratuit.
#### Garantie pièce et workflow retours en gratuit.
Indispensables à la confiance marketplace. Les paywaller bloquerait l'adoption — personne ne commande la première fois s'il ne se sent pas protégé.
#### Plan Continuité élargi hors Abidjan, et adossé à Pro Flotte.
Le marché potentiel triple sans coût marginal significatif. Transporteurs interurbains et BTP en région deviennent adressables. Le forfait à 10 000 F reste tenable car la majorité des clients n'utiliseront l'urgence que rarement. Le fait que Continuité **inclue** Pro Flotte aligne l'incitatif client (qui n'aurait pas de raison de prendre Continuité sans la couche pilotage en dessous) et stabilise l'ARPU de Pièces (Continuité = ARPU Pro Flotte + 10 000 F, jamais moins).

#### Facturation normalisée et optimisation fiscale en Pro Flotte.
Killer feature côté DAF/comptable. La facturation normalisée DGI est obligatoire pour les entreprises au régime du réel ; sans plateforme, chaque fournisseur émet sa propre facture (qualité variable, conformité incertaine). Pièces consolide et garantit la conformité. L'argument déplace la décision d'achat de l'atelier vers la direction financière — celle qui signe l'abonnement.
#### Pas de freemium plafonné par véhicules.
Le freemium « 3 véhicules gratuits puis payant » a été écarté : il pénalise précisément le segment initial (taxis 5 véhicules, petits VTC). La gating doit porter sur les fonctionnalités, pas sur la taille.

## Leviers de conversion
Le packaging ne suffit pas. Cinq leviers comportementaux et commerciaux sont à intégrer dès le lancement pour maximiser la conversion gratuit  Pro Flotte.
#### Essai 30 jours sur Pro Flotte avec activation automatique.
À l'inscription, toutes les features Pro Flotte sont activées 30 jours, sans carte bancaire. À J-7, alerte commerciale : « Vous avez identifié 2 véhicules outliers, économie projetée 800 000 F/an. Conserver Pro Flotte ? » La conversion devient une perte d'acquis, pas un achat — biais comportemental documenté (aversion à la perte).
#### Pricing dégressif par paliers.
1-20 véhicules : 5 000 F/v. 21-50 : 4 000 F/v. 51-100 : 3 000 F/v. 100+ : tarif négocié. Neutralise l'objection des grosses flottes (« c'est 1 M F/mois pour 200 véhicules, négocions »), préserve la marge sur les petites où chaque véhicule mérite son tarif plein.
#### Paiement annuel = 2 mois offerts (16,7 % de remise).
Cash up-front, churn réduit, prévisibilité revenue. Plus engageant qu'un trimestriel à remise faible (5-8 %). Cible : services administratifs et flottes structurées avec process budgétaire annuel.
#### Garantie ROI à 3 mois.

« Si à 3 mois Pro Flotte ne vous a pas fait économiser au moins l'équivalent de l'abonnement, vous repassez en gratuit et nous remboursons la dernière mensualité. » Plus engageant que money-back complet (qui coûte cher), lève l'objection rationnelle. Risque : 5-10 % des clients pourraient l'invoquer, à provisionner.
#### Calculateur ROI à l'inscription.
Saisir budget pièces annuel  économie projetée 20-30 %  coût Pro Flotte calculé selon paliers  ROI net affiché. Pour 20 véhicules à 8 M F/an : économie 1,6 M F – abonnement 1,2 M F = +400 000 F net. Transforme l'achat en évidence arithmétique.

## Modélisation revenu
Hypothèses : 100 % des flottes payantes prennent au moins Pro Flotte (sinon elles restent en gratuit, sans revenu abonnement). Plan Continuité = Pro Flotte + 10 000 F/mois forfait flotte, donc toute flotte Continuité contribue au revenu Pro Flotte. Taux d adoption Continuité : 50 % des flottes ≥ 10 véhicules, 30 % des flottes < 10. Revenus en plus de la commission marketplace existante.

## Par taille de flotte (pricing dégressif appliqué)

5 véhicules	5 000 F	25 000 F	3 000 F (30 %)	28 000 F	336 000 F

20 véhicules	5 000 F	100 000 F	5 000 F	105 000 F	1,26 M F

100 véhicules	3 000 F	300 000 F	5 000 F	305 000 F	3,66 M F

Note. Le pricing dégressif réduit le revenu unitaire sur les grosses flottes, mais ces flottes auraient de toute façon négocié. Mieux vaut un palier transparent et automatique qu'une négociation ad hoc qui sur-décote.

## Sur 50 flottes clientes (cible 12 mois)

| Mix de flottes | Pro Flotte mensuel | Pro Flotte annuel |
|---|---|---|
| 50 flottes × 10 véhicules moyen (5 000 F/v) | 2,5 M F | 30 M F |
| 30 × 5 v + 15 × 20 v + 5 × 50 v (paliers appliqués) | 1,9 M F | 22,8 M F |
| 50 flottes × 20 véhicules moyen (5 000 F/v) | 5 M F | 60 M F |
| 30 × 10 v + 15 × 30 v + 5 × 80 v (paliers appliqués) | 4,5 M F | 54 M F |

Plan Continuité ajoute typiquement 5–10 % de ce chiffre.

## Comparaison référence marché

| Service | Prix typique | Couvre |
|---|---|---|
| Pièces Pro Flotte | 5 000 F/v/mo (~7,5 €) | Plateforme + alertes + reporting + auto-replenish |
| Samsara (USA) | 35–45 $/v/mo | Tracking GPS + maintenance |
| Geotab (Afrique) | 25–30 $/v/mo | Tracking GPS |
| Pneuhage (France) | 8–15 €/v/mo | Maintenance pneus seule |
| Excel + WhatsApp | 0 F (mais 2-3 h/sem admin) | Statu quo |

Notre prix est 3-5× moins cher que les concurrents internationaux sans tracking GPS — qui est un marché séparé en Côte d'Ivoire. Positionnement défendable.

## Économie du Plan Continuité
## Coût unitaire d'une livraison express (Abidjan)

Rider priorité (vs standard)	+1 500

Risque SLA breach (probabilité × pénalité)	+200

## Coût unitaire d'une livraison J+1 hors Abidjan

Surcoût logistique inter-villes (vs J+2/J+3 standard)	+1 200

Total coût marginal Pièces par livraison J+1 hors Abidjan	~1 500 F

## Scénarios mensuels par client Plan Continuité

| Usage mensuel | Revenue | Coût Pièces | Marge |
|---|---|---|---|
| 0 livraison | 10 000 F | 0 F | +10 000 F |
| 3 livraisons express (dans forfait) | 10 000 F | 6 600 F | +3 400 F |
| 5 livraisons express (max forfait) | 10 000 F | 11 000 F | 1 000 F |
| 8 livraisons (3 supp. × 1 500) | 14 500 F | 17 600 F | 3 100 F |
| 15 livraisons (10 supp. × 1 500) | 25 000 F | 33 000 F | 8 000 F |

Conclusion : le forfait à 5 livraisons incluses commence à perdre de l'argent au-delà de 5 livraisons réelles. Plusieurs réponses possibles :
- Augmenter le prix supplément à 2 500 F (équilibrer au coût + petite marge). Mais réduit l'attractivité du forfait.
- Réduire le forfait inclus à 3 livraisons, garder le supplément à 1 500 F.
- Accepter cette perte sur les gros consommateurs comme coût d'acquisition — un client qui utilise 15 livraisons/mo paie aussi 200 000 F de Pro Flotte (s'il a 50 véhicules), donc la perte de 8 000 F est négligeable.
Recommandation : option (c) sur les flottes  20 véhicules (cross-subsidization par Pro Flotte), option (b) sur les petites flottes. Concrètement : forfait identique pour tous, monitoring de l'usage, escalade commerciale sur les flottes en dépassement systématique pour les passer en formule « à la consommation » (suppression forfait, prix par livraison négocié).

## Coût d'un breach SLA

Remboursement frais (~2 500 F) + 5 000 F de crédit = ~7 500 F par breach. Pour rester rentable, le taux de breach doit rester < 8 % des livraisons express. Tenable si on dimensionne bien le réseau livreurs sur les heures critiques (8 h – 10 h, 14 h – 17 h).

## Risques et atténuations

| Risque | Probabilité | Impact | Atténuation |
|---|---|---|---|
| Adoption Pro Flotte plus lente | Moyenne | Élevé | Lancement bêta avec 5 flottes pilotes. Itérer le packaging avant |
| que prévu |  |  | marketing large. Essai 30 jours auto-activé pour réduire la |
|  |  |  | friction. |
| Gratuit jugé suffisant — pas de | Moyenne | Élevé | Calculateur ROI à l'inscription. Mise en avant explicite de la |
| montée en Pro Flotte |  |  | détection des véhicules outliers. Essai 30 jours pour démontrer |
|  |  |  | la valeur en situation réelle. |
| Garantie ROI 3 mois invoquée | Faible | Moyen | Provision 5-10 % de la mensualité encaissée. Suivi des cas pour |
| à grande échelle |  |  | comprendre les motifs (mauvais onboarding ? Mauvaise cible |
|  |  |  | ?). |
| Sur-utilisation Plan Continuité | Faible | Moyen | Monitoring usage + escalade commerciale pour passage en |
| (clients à 15+ livraisons/mo) |  |  | formule « à la consommation ». |
| SLA 3 h Abidjan non tenable | Moyenne | Élevé | Liste explicite des communes couvertes (carte SLA). |
| selon zone |  |  | Communes hors zone restent en standard. Dimensionnement |
|  |  |  | réseau livreurs. |
| SLA J+1 hors Abidjan non | Moyenne | Moyen | Démarrer sur 4 villes seulement (San-Pédro, Bouaké, |
| tenable |  |  | Yamoussoukro, Korhogo). Étendre progressivement après |
|  |  |  | validation opérationnelle. |
| Confusion abonnement / | Élevée | Moyen | Documentation très claire : abonnement = service plateforme, |
| commission marketplace |  |  | commission = par vente. Facturation séparée. |
| Pricing dégressif érode la | Élevée | Faible | Volontaire — mieux vaut un palier transparent qu'une |
| marge sur grosses flottes |  |  | négociation ad hoc qui sur-décote. Mécanisme préserve la |
|  |  |  | relation. |
| Stock tampon vu comme « déjà payé »  refus Pro Flotte | Faible | Moyen | Discours commercial : stock tampon manuel = gestion de stock interne, auto-replenish = service Pièces qui automatise. |

- Plan de mise en marché recommandé
## Phase 1 — Validation pricing (Semaines 1-2)
- Présenter le packaging à 5 prospects qualifiés (flottes 5-50 véhicules).
- Tester trois variantes : Pro Flotte seul / Pro Flotte + Plan Continuité / variations de prix Pro Flotte (4 000
/ 5 000 / 6 000 F).
- Identifier le killer feature de Pro Flotte aux yeux des prospects (hypothèse : détection véhicules outliers).
- Recueillir : prix accepté/refusé, features valorisées, freins exprimés.
- Décision Go/No-Go : si au moins 2 prospects sur 5 signent une lettre d'intention, lancer Phase 2.

## Phase 2 — Bêta payante (Semaines 3-8)
- Inscrire 5 flottes pilotes au tarif validé.
- Implémenter la facturation et l'activation des features Pro Flotte (cf. § technique).
- Mise en place du calculateur ROI à l'inscription.
- Activation automatique de l'essai 30 jours pour tous les nouveaux inscrits.
- Monitoring quotidien des SLA Plan Continuité.
- Itération à mi-parcours (S5) sur les features sous-utilisées.

## Phase 3 — Lancement commercial (Semaines 9+)
- Publication de la grille tarifaire sur pieces.ci/entreprises.
- Communication WhatsApp + emailing à la base prospect.
- Programme de parrainage : 1 mois Pro Flotte offert pour chaque flotte recommandée qui s'abonne.
- Extension Plan Continuité à 4 villes hors Abidjan après stabilisation Abidjan.
- Bilan à 6 mois : ajustement paliers tarifaires si nécessaire selon mix client réel.

## Prochaines décisions à arrêter
Pricing exact Pro Flotte. 5 000 F/véhicule confirmé ? Tester 4 000 F et 6 000 F lors des entretiens prospect.
Paliers du pricing dégressif. 20 / 50 / 100 véhicules confirmés ? Ou plutôt 25 / 75 / 150 ?
Frontière features gratuit vs Pro Flotte. La liste §3 est un point de départ. Affiner avec les feedbacks. Question ouverte : le scoring qualité fournisseur basique pourrait-il rester en gratuit pour renforcer la confiance marketplace ?
Zone couverte par le SLA 3 h Abidjan. Carte explicite à produire : Plateau, Cocody, Marcory, Treichville, Yopougon, Abobo en routine ; Bingerville, Anyama, Songon en standard.
Villes couvertes par le SLA J+1 hors Abidjan. Démarrage proposé : San-Pédro, Bouaké, Yamoussoukro, Korhogo. Extension progressive selon performance.
Cycle de facturation. Mensuel d'avance par défaut, annuel avec 16,7 % (2 mois offerts). Trimestriel à étudier (remise intermédiaire 5-8 %).
Modes de paiement entreprise. Mobile Money Pro suffisant jusqu'à 5-20 véhicules. Virement bancaire requis au-delà. CinetPay supporte les deux.

Mécanisme garantie ROI. Critère d'évaluation à formaliser : économie pièce mesurée comment ? Sur quel périmètre ? Document méthodologique à produire avant lancement.
TVA. Si l'entreprise est assujettie, factures avec TVA 18 % détachée — à clarifier avec le comptable Pièces.

## Impact technique
À dimensionner après validation pricing. À titre indicatif, le développement nécessitera :
- Modèle Prisma EnterpriseSubscription (tier PRO_FLOTTE / CONTINUITE, status, billingCycle, startedAt, currentPeriodEnd, trialEndsAt, etc.)
- Modèle EnterpriseSubscriptionEvent pour audit (activation, suspension, breach SLA, garantie ROI invoquée)
- Migration + endpoints CRUD admin et entreprise
- Page admin /admin/enterprises/[id]/subscription pour activer / suspendre / consulter historique
- Page entreprise /enterprise/billing pour s'abonner, voir l'historique, télécharger factures
- Calculateur ROI public sur /entreprises/calculateur-roi
- Intégration paiement récurrent CinetPay (déjà supporté par leur API)
- Cron mensuel pour facturer les abonnements actifs + reset compteur Plan Continuité
- Gate côté features Pro Flotte : hasActiveSubscription(enterprise, 'PRO_FLOTTE') sur les ~10 capacités listées
- Compteur Plan Continuité (expressDeliveriesUsedThisMonth, j1DeliveriesUsedThisMonth) + reset mensuel
- Endpoints + webhook SLA pour mesurer le respect des 3 h / J+1 et déclencher les remboursements automatiques
- Activation automatique de l'essai 30 jours à l'inscription entreprise
- Alerte commerciale automatique à J-7 de fin d'essai si features Pro Flotte ont été utilisées

Effort estimé : 4 semaines pour un MVP fonctionnel (1 dev backend + 1 dev front + 1 dev integ CinetPay).
+1 semaine vs estimation initiale en raison du calculateur ROI public, de la garantie ROI, et de l'activation automatique de l'essai.

## Recommandation finale

Conditions de lancement. Tester d'abord auprès de 5 prospects. Ajuster les features Pro Flotte selon les feedbacks. Ne pas coder l'infrastructure d'abonnement tant qu'au moins 2 prospects sur 5 ont signé une lettre d'intention au tarif validé.
Communication. Positionner publiquement comme « Pièces Pro Flotte » plutôt qu'abonnement — le mot abonnement crée une résistance immédiate en Côte d'Ivoire. « Pro Flotte » évoque l'évolution, pas la facture. Le mot « abonnement » est réservé à la documentation interne et aux conditions générales.

## Annexe — Modèles rejetés

Tout gratuit, financement par commission seule
Pas de récurrence, vulnérable à la saisonnalité, sous-monétise la valeur livrée. Modèle de départ par défaut, dépassé par la présente étude.

Per-order premium uniquement (pas de subscription)
Pas de récurrence ; les prospects préfèrent une dépense prévisible.

Freemium « 3 véhicules gratuits puis payant »
Punit les petites flottes (taxis, VTC) qui sont notre marché initial. Gating par fonctionnalité préférable à gating par taille.

Gratuit minimaliste (catalogue + commande seuls) + tout le reste payant
Cannibalise la marketplace en érigeant des barrières à la première transaction. Garantie et retours doivent rester gratuits pour la confiance.

Plan Continuité Abidjan seulement	Exclut une part importante du marché (interurbain, BTP en région). Élargissement
J+1 hors Abidjan ajoute du marché à coût marginal faible.

Document interne Pièces — étude pricing version 2 · mai 2026. Refonte intégrale du packaging par rapport à la version 1. À revoir après les premiers entretiens prospects et la phase bêta.
