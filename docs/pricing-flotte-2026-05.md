# Étude de pricing — Offres Flotte & Logistique Premium

**Statut :** Étude pré-décisionnelle
**Auteur :** Pièces — équipe produit
**Date :** Mai 2026
**Décision attendue :** Validation packaging + tarifs avant mise en marché

---

## 1. Contexte

Aujourd'hui, **toutes les fonctionnalités entreprise sont gratuites** : dashboard flotte, import CSV véhicules, gestion des membres, recherche, devis, plans d'entretien prédictifs, stocks tampon, centres de maintenance. Les revenus Pièces proviennent uniquement de la **commission par pièce vendue** (5–10 % typiques) et des frais de livraison.

Ce modèle a permis l'adoption rapide mais laisse trois leviers inexploités :

1. **Le coût marginal d'un véhicule ajouté est très faible pour Pièces** — chaque véhicule supplémentaire dans une flotte génère peu de coûts incrémentaux. Or les clients attribuent une vraie valeur à la gestion centralisée multi-véhicules.
2. **L'urgence est sous-monétisée** — un mécanicien en panne, c'est un véhicule immobilisé qui coûte 30 000 à 50 000 FCFA/jour à un transporteur ou taxi. Notre frais de livraison express actuel ne capture pas cette valeur.
3. **La récurrence manque** — sans abonnement, on est exposé à la saisonnalité et aux décisions d'achat ponctuelles.

L'objectif de cette étude : poser **deux étages tarifaires distincts**, mesurer leur impact revenu et opérationnel, et arrêter un packaging.

---

## 2. Packaging proposé (décision : deux étages distincts)

### Étage 1 — Abonnement Flotte

**5 000 FCFA par véhicule par mois**

Ce que la flotte obtient en plus du gratuit actuel :

| Avantage | Détail |
|---|---|
| **Alertes maintenance prédictive automatiques** | Notifications WhatsApp/SMS quand un véhicule approche du seuil km/temps d'une catégorie d'entretien |
| **Routage vers centres de maintenance partenaires** | Suggestion prioritaire du centre de maintenance attitré du véhicule (`MaintenanceCenter.homeCenterId`) |
| **Export PDF historique véhicule** | Document signé Pièces, utilisable à la revente — argument commercial fort pour les transporteurs |
| **Reporting avancé** | Coût/km, coût par catégorie, top 5 véhicules les plus coûteux, comparaison mois/mois |
| **Support prioritaire** | Première réponse < 4h en jours ouvrés |
| **Revue trimestrielle de flotte** | Une session de 30 min avec un Liaison Pièces pour analyser la flotte et identifier les optimisations |

Ce qui reste **gratuit** quel que soit le statut d'abonnement :
- Dashboard, import CSV, membres, recherche, devis, commandes
- Stocks tampon (= produit autonome, voir §3)
- Tout le reste

> **Pourquoi gratuit + abonnement plutôt que gating** : nous avons lancé l'offre entreprise il y a quelques mois en gratuit total. Punir les early adopters maintenant en bloquant des features risquerait de casser l'adoption en cours. Les features de l'abonnement sont **nouvelles** ou **améliorées** — pas un retrait du gratuit existant.

### Étage 2 — Logistique Premium "Express Abidjan"

**10 000 FCFA par mois (forfait flotte, indépendant du nombre de véhicules)**

Ce qui est inclus :

| Avantage | Détail |
|---|---|
| **Livraison 3h chrono à Abidjan** | Quand la pièce est en stock chez un vendeur partenaire dans Abidjan, livraison garantie sous 3 heures |
| **5 livraisons express incluses par mois** | Au-delà, 1 500 FCFA par livraison express supplémentaire |
| **SLA monétisé** | Si la promesse 3h est rompue (hors cas force majeure), remboursement intégral des frais de livraison + 5 000 FCFA de crédit sur le mois suivant |
| **Pickup prioritaire** | Le livreur Pièces vient chercher la pièce chez le vendeur dans les 30 min |
| **Numéro WhatsApp dédié** | Ligne directe pour les demandes urgentes, ouverte 6h–22h 7j/7 |

> **Pourquoi un cap (5 livraisons incluses) plutôt que de l'illimité ?** Une livraison express en Abidjan coûte ~2 000–3 000 FCFA à Pièces (rider priorité + dispatch). Sans cap, un client à 20 commandes express/mo nous ferait perdre de l'argent. Avec 5 incluses + 1 500 F au-delà, l'économie reste positive à toutes les volumétries.

> **Pourquoi pas dans l'abonnement véhicule ?** Le besoin d'urgence ne scale pas avec la taille de flotte (un transporteur de 100 camions peut avoir 0 panne ce mois-ci, un taxi de 5 véhicules peut en avoir 3). C'est un SLA qui se vend séparément.

### Récapitulatif

```
Gratuit (acquis pour tous)
├── Dashboard flotte
├── Import CSV véhicules
├── Membres & rôles
├── Recherche & devis
├── Commandes & escrow
├── Stocks tampon (à acheter à l'unité — voir §3)
├── Centres maintenance (référencement)
└── Plans d'entretien (calcul de base)

Étage 1 — Abonnement Flotte  → 5 000 F / véhicule / mois
├── Alertes prédictives automatiques
├── Routage centres partenaires
├── PDF historique
├── Reporting avancé
├── Support prioritaire 4h
└── Revue trimestrielle

Étage 2 — Express Abidjan  → 10 000 F / mois forfaitaire
├── Livraison 3h chrono
├── 5 livraisons express incluses
├── SLA monétisé (remboursement si breach)
├── Pickup prioritaire
└── Ligne WhatsApp dédiée 6h-22h
```

### Note sur les stocks tampon

Le produit **buffer stock** déjà livré reste **gratuit en self-service** et indépendant des deux abonnements. Le client définit ses SKU critiques, target qty, current qty, et auto-replenish. C'est un **outil de gestion stock**, pas un service. Si on monétise plus tard, ce sera au-dessus (par exemple : "buffer stock géré par Pièces" — on garantit le stock chez nous, c'est un autre produit).

---

## 3. Modélisation revenu

Hypothèses :
- Toutes les flottes prennent l'abonnement Étage 1
- 50 % des flottes ≥ 10 véhicules prennent aussi l'Étage 2 (Express Abidjan)
- 30 % des flottes < 10 véhicules prennent l'Étage 2
- Revenus en plus de la commission marketplace existante (qui continue)

### Par taille de flotte

| Flotte | Étage 1 (5000 F/v/mo) | Étage 2 typique | Revenu mensuel net | Revenu annuel |
|---|---|---|---|---|
| 5 véhicules | 25 000 F | 3 000 F (30 % × 10 000) | **28 000 F** | 336 000 F |
| 10 véhicules | 50 000 F | 5 000 F (50 % × 10 000) | **55 000 F** | 660 000 F |
| 20 véhicules | 100 000 F | 5 000 F | **105 000 F** | 1 260 000 F |
| 50 véhicules | 250 000 F | 5 000 F | **255 000 F** | 3 060 000 F |
| 100 véhicules | 500 000 F | 5 000 F | **505 000 F** | 6 060 000 F |
| 200 véhicules | 1 000 000 F | 5 000 F | **1 005 000 F** | 12 060 000 F |

> Note : Étage 2 plafonné à 10 000 F/flotte donc le ratio devient minime sur les grosses flottes — c'est volontaire (SLA est plus cher à servir sur grosses flottes en absolu, mais la marge à l'unité diminue).

### Sensibilité au taux d'adoption Étage 1

Sur 50 flottes clientes (cible 12 mois) :

| Mix de flottes | Étage 1 mensuel | Étage 1 annuel |
|---|---|---|
| 50 flottes × 10 véhicules moyen | 2 500 000 F | **30 M FCFA** |
| 30 flottes × 5 v + 15 flottes × 20 v + 5 flottes × 50 v | 2 000 000 F | **24 M FCFA** |
| 50 flottes × 20 véhicules moyen | 5 000 000 F | **60 M FCFA** |

L'Étage 2 ajoute typiquement 5–10 % de ce chiffre en plus.

### Comparaison référence marché

| Service | Prix typique | Pour |
|---|---|---|
| Pièces Étage 1 | **5 000 F/v/mo** | Plateforme + alertes + reporting |
| Samsara (USA) | 35–45 $/v/mo | Tracking GPS + maintenance |
| Geotab (Afrique) | 25–30 $/v/mo | Tracking |
| Pneuhage (France) | 8–15 €/v/mo | Maintenance pneus |
| Solution Excel + Whatsapp | 0 F (mais 2-3h/sem d'admin) | Statu quo |

Notre prix est **~3–5× moins cher que les concurrents internationaux** sans intégration GPS — positionnement clair sur le contexte ivoirien (où le tracking GPS est un autre marché). Le positionnement est défendable.

---

## 4. Économie de l'Étage 2 (Express Abidjan)

### Coût unitaire d'une livraison express Pièces

| Poste | Coût FCFA |
|---|---|
| Rider priorité (vs standard) | +1 500 |
| Dispatch / coordination | +500 |
| Risque SLA breach (probabilité × pénalité) | +200 |
| **Total coût marginal Pièces par livraison** | **~2 200 F** |

### Scénarios annuels par client Étage 2

| Usage mensuel | Revenue | Coût Pièces | Marge |
|---|---|---|---|
| 0 livraison express | 10 000 F | 0 F | **+10 000 F** |
| 3 livraisons (dans le forfait) | 10 000 F | 6 600 F | **+3 400 F** |
| 5 livraisons (max forfait) | 10 000 F | 11 000 F | **−1 000 F** |
| 8 livraisons (3 supplémentaires à 1 500) | 14 500 F | 17 600 F | **−3 100 F** |
| 15 livraisons (10 supp. à 1 500) | 25 000 F | 33 000 F | **−8 000 F** |

**Conclusion** : le forfait à 5 livraisons incluses **commence à perdre de l'argent au-delà de 5 livraisons réelles**. Plusieurs réponses possibles :
- (a) Augmenter le prix supplément à 2 500 F (équilibrer au coût + petite marge). Mais ça réduit l'attractivité du forfait.
- (b) Réduire le forfait inclus à 3 livraisons, garder le supplément à 1 500 F.
- (c) Accepter cette perte sur les gros consommateurs comme **coût d'acquisition** — un client qui utilise 15 livraisons/mo paie aussi 250 000 F d'Étage 1 (s'il a 50 véhicules), donc la perte de 8 000 F est négligeable.

**Recommandation** : option (c) sur les flottes ≥ 20 véhicules (cross-subsidization par l'Étage 1), option (b) sur les petites flottes. Concrètement : **forfait identique mais on monitore** l'usage et on contacte les flottes en dépassement systématique pour les passer en formule "à la consommation" (suppression forfait, prix par livraison négocié).

### Coût service "remboursement SLA breach"

Si on rompt l'engagement 3h chrono :
- Remboursement frais de livraison (~2 000–3 000 F par commande)
- 5 000 F de crédit sur abonnement mois suivant

**Coût total d'un breach ≈ 7 500 F**. Pour rester rentable, le taux de breach doit rester < 8 % des livraisons express. Possible si on dimensionne bien le réseau de livreurs sur les heures critiques (8h–10h, 14h–17h).

---

## 5. Risques et atténuations

| Risque | Probabilité | Impact | Atténuation |
|---|---|---|---|
| Adoption Étage 1 plus lente que prévu | Moyenne | Élevé | Lancer en bêta avec 5 flottes pilotes ; itérer le package avant marketing large |
| Sur-utilisation Étage 2 (clients à 15+ livraisons/mo) | Faible mais possible | Moyen | Monitoring usage + escalade commerciale |
| SLA 3h non tenable selon zone Abidjan | Moyenne | Élevé | Liste explicite des communes couvertes (carte SLA) ; communes hors zone restent en standard |
| Confusion avec les commissions marketplace | Élevée | Moyen | Documentation très claire : abonnement = service plateforme, commission = par vente |
| Buffer stock vu comme "déjà payé" donc clients refusent l'Étage 1 | Faible | Moyen | Discours commercial qui distingue : buffer stock = gestion stock interne, abonnement = service Pièces autour |

---

## 6. Plan de mise en marché recommandé

### Phase 1 — Validation pricing (Semaines 1-2)
1. Présenter cette offre à **3-5 prospects qualifiés** (flottes 10-50 véhicules déjà identifiées par les Liaisons).
2. Tester deux variantes A/B : avec et sans Étage 2.
3. Recueillir : prix accepté/refusé, features valorisées, freins exprimés.

### Phase 2 — Bêta payante (Semaines 3-8)
1. Inscrire 5 flottes pilotes au tarif validé.
2. Implémenter la facturation et l'activation des features Étage 1 (cf. § technique).
3. Monitoring quotidien des SLA Étage 2.
4. Itération à mi-parcours.

### Phase 3 — Lancement commercial (Semaines 9+)
1. Publier la grille tarifaire publique sur `pieces.ci/entreprises`.
2. Communication WhatsApp + emailing à la base prospect.
3. Programme de **parrainage** : 1 mois offert pour chaque flotte recommandée qui s'abonne.
4. Étendre l'Étage 2 à San-Pédro / Bouaké si la mécanique fonctionne à Abidjan.

---

## 7. Prochaines décisions à arrêter

Avant tout code, valider en pratique :

1. **Pricing exact** : 5 000 F/véhicule confirmé ? Tester aussi 4 000 F ou 6 000 F lors des entretiens prospect.
2. **Frontière features gratuites vs payantes** : la liste §2 est un point de départ — affiner avec les feedbacks prospects.
3. **Zone couverte par le SLA 3h** : carte explicite à produire (probablement : Plateau, Cocody, Marcory, Treichville, Yopougon, Abobo en routine ; Bingerville, Anyama, Songon en mode standard).
4. **Cycle de facturation** : mensuel d'avance ? Trimestriel avec remise ? Annuel avec remise plus forte ?
5. **Modes de paiement entreprise** : Mobile Money Pro suffisant pour 5–20 véhicules, virement bancaire requis au-delà.
6. **TVA** : si l'entreprise est assujettie, factures avec TVA 18 % détachée — à clarifier avec le comptable Pièces.

---

## 8. Impact technique (à dimensionner après validation pricing)

À titre indicatif, le développement nécessitera :

- Nouveau modèle Prisma `EnterpriseSubscription` (tier, status, billingCycle, startedAt, currentPeriodEnd, etc.)
- Migration + endpoints CRUD admin et entreprise
- Page admin `/admin/enterprises/[id]/subscription` pour activer / suspendre
- Page entreprise `/enterprise/billing` pour s'abonner et voir l'historique
- Intégration paiement récurrent CinetPay (déjà supporté par leur API)
- Cron mensuel pour facturer les abonnements actifs
- Gate côté features Étage 1 (`hasActiveSubscription(enterprise, 'FLEET')`) sur les 6 capacités listées
- Compteur Étage 2 (`expressDeliveriesUsedThisMonth`) + reset mensuel
- Endpoints + webhook SLA pour mesurer le respect des 3h et déclencher les remboursements automatiques

Effort estimé : **3 semaines** pour un MVP fonctionnel (1 dev backend + 1 dev front + 1 dev integ CinetPay).

---

## 9. Recommandation finale

**Aller de l'avant** avec ce packaging :
- Étage 1 à 5 000 F/véhicule/mois
- Étage 2 à 10 000 F/mois forfait
- Stocks tampon gratuits indépendants

**Tester d'abord** auprès de 3–5 prospects avant tout code. Ajuster les features de l'Étage 1 selon les feedbacks. Ne pas coder l'infrastructure d'abonnement tant qu'au moins 2 prospects sur 5 ont signé une lettre d'intention.

**Communication** : positionner publiquement comme "Pièces Pro Flotte" plutôt qu'abonnement — le mot abonnement crée une résistance immédiate en Côte d'Ivoire. "Pro Flotte" évoque l'évolution, pas la facture.

---

## Annexe — Comparaison rapide d'autres modèles considérés

| Modèle envisagé | Pourquoi rejeté |
|---|---|
| Tout gratuit, financement par commission seule | Pas de récurrence, vulnérable à la saisonnalité, sous-monétise la valeur livrée |
| Abonnement unique 50 000 F/flotte/mois | Trop élevé pour petites flottes, mal aligné avec la taille |
| Per-order premium uniquement (pas de subscription) | Pas de récurrence ; les prospects préfèrent une dépense prévisible |
| Bundling Étage 1 + Étage 2 obligatoire | Force un service que toutes les flottes ne valorisent pas (urgence) ; cf. décision : deux étages distincts |
| Modèle freemium 3 véhicules gratuits puis payant | Punit les petites flottes qui sont notre marché initial |

---

*Document interne Pièces — étude pricing version 1 · Mai 2026. À revoir après les premiers entretiens prospects.*
