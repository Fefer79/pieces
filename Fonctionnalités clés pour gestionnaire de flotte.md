# Pièces — Fonctionnalités clés de l'espace digital B2B Flottes

## Priorisées par impact business et faisabilité

---

## 🔴 PRIORITÉ 1 — MVP (Lancement)

Les fonctionnalités sans lesquelles la plateforme n'a pas de raison d'exister.

---

### 1. Identification intelligente de pièces

**Le cœur de Pièces — le différenciateur.**

- **Recherche par véhicule** : l'utilisateur entre marque → modèle → année → motorisation, et accède au catalogue de pièces compatibles. C'est le parcours de base incontournable.
- **Recherche par photo (IA)** : le gestionnaire de flotte ou le mécanicien photographie la pièce usée/cassée, l'IA identifie le type de pièce et propose les références compatibles. Critique en Côte d'Ivoire où beaucoup de mécaniciens ne connaissent pas la référence OEM exacte.
- **Recherche par numéro OEM / référence** : pour les pros qui connaissent déjà la ref, permettre la recherche directe avec cross-référencement automatique (OEM → aftermarket équivalent → compatible).
- **Recherche par VIN (numéro de châssis)** : le VIN identifie précisément le véhicule, ses options et donc les pièces exactes. Élimine les erreurs de compatibilité.

**Pourquoi c'est P1** : c'est le problème n°1 des flottes — trouver la bonne pièce pour le bon véhicule dans un parc multi-marques vieillissant. Sans ça, Pièces n'est qu'un catalogue de plus.

---

### 2. Gestion du parc véhicules (Garage digital)

**Chaque client B2B enregistre sa flotte une seule fois.**

- **Fiche véhicule** : marque, modèle, année, motorisation, VIN, kilométrage, immatriculation, photo
- **Ajout en masse** : import CSV/Excel pour les flottes >20 véhicules
- **Groupement** : par site, par agence, par type d'usage (chantier, livraison, direction)
- **Historique par véhicule** : toutes les pièces commandées, tous les entretiens, toutes les dépenses — liées au véhicule

**Pourquoi c'est P1** : c'est ce qui rend Pièces collant (sticky). Une fois la flotte enregistrée, chaque recherche de pièce est contextualisée — plus besoin de re-saisir les infos véhicule. Et ça crée une barrière à la sortie.

---

### 3. Catalogue multi-sources avec comparaison de prix

**Le gestionnaire de flotte a besoin de voir ses options.**

- **Affichage par pièce** : pour chaque pièce identifiée, montrer les options disponibles :
  - Pièce d'origine (OEM) — prix, disponibilité, délai
  - Pièce aftermarket de qualité (équipementiers reconnus : Bosch, Valeo, Monroe, etc.) — prix, disponibilité
  - Pièce compatible / générique — prix, disponibilité
- **Score de confiance** : indicateur visuel de fiabilité du fournisseur et de la pièce (authentique vérifié, aftermarket certifié, source non vérifiée)
- **Disponibilité en temps réel** : en stock local (Abidjan), en transit, sur commande (délai estimé)
- **Prix transparent** : le gestionnaire peut enfin comparer au lieu de subir le prix du garagiste

**Pourquoi c'est P1** : l'opacité des prix est le pain point n°2 des flottes. C'est ce qui justifie le passage de l'achat informel vers Pièces.

---

### 4. Commande et paiement

**Le tunnel d'achat, adapté au B2B ivoirien.**

- **Panier multi-véhicules** : commander des pièces pour plusieurs véhicules en une seule commande
- **Devis téléchargeable** : le gestionnaire de flotte doit souvent faire valider un devis par sa hiérarchie avant d'acheter — PDF professionnel avec références, prix unitaires, TVA
- **Modes de paiement** :
  - Mobile Money (Orange Money, MTN MoMo, Wave) — incontournable en Côte d'Ivoire
  - Virement bancaire
  - Paiement à la livraison (pour les premiers clients, bâtir la confiance)
  - Crédit / compte prépayé (phase ultérieure)
- **Suivi de commande** : statut en temps réel (confirmée → en préparation → expédiée → livrée)
- **Bon de livraison digital** : preuve de réception avec signature électronique

**Pourquoi c'est P1** : sans tunnel d'achat fonctionnel avec les moyens de paiement locaux, pas de transaction.

---

### 5. Tableau de bord gestionnaire de flotte

**Vue d'ensemble pour le décideur.**

- **Synthèse des dépenses** : total pièces par mois, par véhicule, par catégorie de pièce
- **Véhicules les plus coûteux** : classement des véhicules par coût de maintenance → aide à la décision de remplacement
- **Historique des commandes** : avec filtres (date, véhicule, montant, statut)
- **Export comptable** : CSV/Excel des transactions pour le DAF

**Pourquoi c'est P1** : c'est le levier de fidélisation. Le gestionnaire qui voit ses données structurées ne retourne pas au cahier papier.

---

## 🟡 PRIORITÉ 2 — Post-lancement (Mois 3-6)

Les fonctionnalités qui créent de la valeur récurrente et augmentent l'ARPU.

---

### 6. Alertes de maintenance préventive

- **Calendrier d'entretien** par véhicule basé sur le kilométrage ou la durée : vidange tous les X km, freins tous les Y km, courroie de distribution à Z km
- **Notifications push/SMS/WhatsApp** : "Le véhicule AB-1234-CI atteint 90 000 km — remplacement courroie de distribution recommandé"
- **Pré-panier automatique** : l'alerte propose directement les pièces nécessaires avec le prix, prêtes à commander
- **Personnalisation** : le gestionnaire ou le mécanicien peut ajuster les intervalles selon les conditions locales (routes en terre = intervalles réduits)

**Pourquoi c'est P2** : nécessite que la flotte soit déjà enregistrée (P1) et que les kilométrages soient mis à jour. Mais c'est un game-changer pour la fidélisation.

---

### 7. Multi-utilisateurs et rôles

- **Admin flotte** : voit tout, valide les commandes, gère le budget
- **Mécanicien / chef d'atelier** : recherche et identifie les pièces, crée des demandes de commande
- **Chauffeur** : signale un problème sur son véhicule (avec photo), le système identifie la pièce probable
- **DAF / Comptable** : accède uniquement aux rapports financiers et factures
- **Workflow de validation** : le mécanicien identifie → le chef d'atelier valide → l'admin commande. Évite les achats non autorisés.

**Pourquoi c'est P2** : les grandes flottes (>30 véhicules) ont plusieurs intervenants. Sans gestion des rôles, l'outil reste limité au one-man-show.

---

### 8. Gestion des fournisseurs et marketplace

- **Réseau de fournisseurs vérifiés** : les vendeurs de pièces à Treichville, Adjamé, Marcory s'inscrivent et référencent leur stock
- **Notation et avis** : les gestionnaires de flotte évaluent la qualité des pièces reçues et la fiabilité du fournisseur
- **Certification anti-contrefaçon** : badge "Fournisseur vérifié" pour ceux qui passent un processus de contrôle qualité
- **Mise en concurrence** : pour une même pièce, afficher les offres de plusieurs fournisseurs avec prix et délais

**Pourquoi c'est P2** : bâtir le réseau fournisseur prend du temps, mais c'est ce qui fait la profondeur du catalogue et la compétitivité prix.

---

### 9. Canal WhatsApp / Assistant conversationnel

- **Bot WhatsApp** : le mécanicien envoie une photo de la pièce ou le numéro de plaque par WhatsApp, reçoit les références et prix
- **Support humain** : escalade vers un expert pièces si l'IA ne trouve pas
- **Commande par WhatsApp** : confirmation et paiement via lien sécurisé

**Pourquoi c'est P2** : WhatsApp est le canal dominant en Côte d'Ivoire. Beaucoup de gestionnaires de flottes ne téléchargeront pas une app mais utiliseront WhatsApp sans hésiter.

---

### 10. Programme de fidélité / Compte entreprise

- **Tarifs négociés** : prix dégressifs selon le volume annuel d'achat
- **Crédit fournisseur** : pour les clients récurrents vérifiés, possibilité de commander et payer à 30 jours
- **Points de fidélité** : chaque achat cumule des points convertibles en remises
- **Compte prépayé** : l'entreprise charge un solde, les mécaniciens commandent dans la limite du budget alloué — contrôle budgétaire natif

**Pourquoi c'est P2** : c'est ce qui transforme un acheteur ponctuel en client récurrent. Le compte prépayé est un excellent levier de rétention.

---

## 🟢 PRIORITÉ 3 — Croissance (Mois 6-12+)

Les fonctionnalités qui construisent un avantage concurrentiel durable.

---

### 11. Analytique avancée et prédictif

- **Prédiction de pannes** : basé sur l'historique de la flotte et les données agrégées de toutes les flottes Pièces, anticiper quelles pièces vont casser sur quel type de véhicule
- **Benchmark** : comparer ses coûts de maintenance avec la moyenne des flottes similaires (même marques, même secteur) — anonymisé
- **Recommandations d'optimisation** : "Votre Toyota Hilux 2015 a coûté 3,2M FCFA en pièces cette année — la moyenne pour ce modèle est 1,8M. Voici les postes de surcoût."
- **Rapport TCO (Total Cost of Ownership)** : coût total par véhicule incluant pièces, main d'œuvre, immobilisation

**Pourquoi c'est P3** : nécessite un volume de données significatif. Mais c'est la fonctionnalité qui rendrait Pièces irremplaçable.

---

### 12. Intégration atelier / réseau de garages partenaires

- **Annuaire de garages vérifiés** : trouvez un mécanicien certifié près de votre véhicule
- **Devis intégré pièce + main d'œuvre** : le gestionnaire voit le coût total (pièce via Pièces + pose chez le garagiste partenaire)
- **Traçabilité complète** : la pièce commandée sur Pièces est livrée directement au garage, le gestionnaire reçoit la confirmation de pose
- **Garantie pièce + pose** : si la pièce est achetée sur Pièces et posée chez un partenaire, garantie conjointe

**Pourquoi c'est P3** : c'est un modèle marketplace complet (pièce + service). Complexe mais très différenciant.

---

### 13. API et intégrations

- **API ouverte** : pour que les grandes entreprises et les éditeurs de logiciels de gestion de flotte (Fleeti, Wilyz, Falcon Control Systems) puissent intégrer le catalogue Pièces dans leurs outils
- **Intégration ERP** : connexion avec les systèmes comptables des grandes entreprises (SAP, Sage, Odoo)
- **Intégration TecDoc/TecAlliance** : pour enrichir le catalogue avec la base de données la plus complète de cross-référencement de pièces
- **Webhook commandes** : notification automatique au fournisseur quand une commande est passée

**Pourquoi c'est P3** : les grandes flottes (mines, BTP, multinationales) n'adopteront l'outil que s'il s'intègre à leur stack existant.

---

### 14. Logistique intégrée

- **Livraison dernier kilomètre** : réseau de livreurs partenaires (moto, fourgon) pour livrer les pièces en 2-4h dans Abidjan
- **Livraison sur chantier/mine** : expédition vers les sites distants avec suivi GPS
- **Retour simplifié** : processus de retour digitalisé si la pièce ne correspond pas
- **Micro-hubs de stock** : points de stockage décentralisés dans les zones à forte demande (Yopougon, Treichville, Adjamé) pour les pièces à forte rotation

**Pourquoi c'est P3** : la disponibilité immédiate de la pièce est ce qui tue les alternatives digitales face à l'achat informel en face-à-face. La rapidité de livraison est le dernier mile de la conversion.

---

### 15. Mode hors-ligne et SMS

- **Consultation catalogue hors-ligne** : pour les mécaniciens sur chantier/mine sans connexion stable
- **Commande par SMS/USSD** : pour les utilisateurs sans smartphone ou en zone rurale
- **Synchronisation automatique** : les données se synchronisent dès que la connexion revient

**Pourquoi c'est P3** : les mines et chantiers BTP sont souvent en zone à couverture réseau faible. Cette fonctionnalité élargit le marché au-delà d'Abidjan.

---

## MATRICE DE SYNTHÈSE

| # | Fonctionnalité | Priorité | Segment cible principal | Impact revenue | Complexité |
|---|---|---|---|---|---|
| 1 | Identification intelligente (photo/VIN/modèle) | 🔴 P1 | Tous | ★★★★★ | Élevée |
| 2 | Garage digital (gestion du parc) | 🔴 P1 | Tous | ★★★★☆ | Moyenne |
| 3 | Catalogue multi-sources + comparaison prix | 🔴 P1 | Tous | ★★★★★ | Élevée |
| 4 | Commande & paiement (Mobile Money) | 🔴 P1 | Tous | ★★★★★ | Moyenne |
| 5 | Tableau de bord gestionnaire | 🔴 P1 | Entreprises, Transport | ★★★★☆ | Moyenne |
| 6 | Alertes maintenance préventive | 🟡 P2 | Tous | ★★★★☆ | Moyenne |
| 7 | Multi-utilisateurs et rôles | 🟡 P2 | BTP, Mines, Grandes flottes | ★★★☆☆ | Moyenne |
| 8 | Marketplace fournisseurs | 🟡 P2 | Tous | ★★★★★ | Élevée |
| 9 | Canal WhatsApp | 🟡 P2 | Transport, PME | ★★★★☆ | Moyenne |
| 10 | Fidélité / Compte entreprise | 🟡 P2 | Tous | ★★★★☆ | Faible |
| 11 | Analytique prédictive | 🟢 P3 | Grandes flottes | ★★★★★ | Élevée |
| 12 | Réseau garages partenaires | 🟢 P3 | Entreprises, VTC | ★★★★☆ | Élevée |
| 13 | API & intégrations | 🟢 P3 | Mines, BTP, Multinationales | ★★★☆☆ | Élevée |
| 14 | Logistique intégrée | 🟢 P3 | Tous | ★★★★★ | Très élevée |
| 15 | Mode hors-ligne / SMS | 🟢 P3 | Mines, BTP (chantiers) | ★★★☆☆ | Moyenne |

---

## PARCOURS UTILISATEUR TYPE — MVP

```
GESTIONNAIRE DE FLOTTE (Entreprise de transport, 25 véhicules)

1. S'inscrit sur Pièces → crée son compte entreprise
2. Enregistre ses 25 véhicules (import Excel ou saisie manuelle)
3. Son mécanicien signale : "le Toyota Hilux AB-1234 a besoin de plaquettes de frein"
4. Le gestionnaire ouvre Pièces → sélectionne le véhicule AB-1234 dans son garage
5. Le système connaît déjà le modèle exact → affiche les plaquettes compatibles
   - OEM Toyota : 45 000 FCFA — En stock — Livraison 24h
   - Bosch aftermarket : 28 000 FCFA — En stock — Livraison 24h
   - Compatible générique : 15 000 FCFA — En stock — Livraison 48h
6. Le gestionnaire choisit Bosch, ajoute aussi un filtre à huile
7. Génère un devis PDF → l'envoie à son directeur pour validation
8. Commande confirmée → paiement Orange Money
9. Livraison le lendemain → pièce posée par le mécanicien
10. L'achat est enregistré dans l'historique du véhicule AB-1234
11. En fin de mois, le gestionnaire exporte un rapport de dépenses pièces par véhicule
```

---

*Document Pièces — Fonctionnalités B2B — v1 — 23 mai 2026*