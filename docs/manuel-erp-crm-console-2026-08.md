<p class="eyebrow">Document interne</p>

# ERP &amp; CRM Pièces — manuel de la console

<p class="deck">La console d'administration de Pièces déménage sur <strong>erp.pieces.ci</strong> : un domaine séparé, une navigation par métier, et une seule porte d'entrée pour piloter les trois lignes d'activité — Marketplace, Flottes, Logistique. Ce manuel est la carte complète de la console et le mode d'emploi de la bascule.</p>

<div class="callout">
<p class="lead">L'outil interne n'est plus une <strong>annexe de l'application client</strong> : c'est un produit à part entière, avec son domaine, ses métiers et ses habilitations.</p>
<p>Ce manuel décrit ce que fait chaque écran, qui a le droit de le voir, et où en est chaque brique — livrée, existante ailleurs, ou planifiée.</p>
</div>

## Comment lire ce manuel

Ce document est le **manuel chapeau** de l'ERP et du CRM. Il donne la carte d'ensemble, les règles d'accès et le mode d'emploi de la bascule vers `erp.pieces.ci`. Les modules qui disposent déjà d'un manuel détaillé y sont renvoyés plutôt que recopiés :

| Module | Manuel détaillé |
|---|---|
| **CRM clients &amp; vendeurs** | `manuel-crm-clients-vendeurs-2026-08` |
| **Stock, achats &amp; fournisseurs** | `manuel-erp-stock-achats-2026-08` |
| **Finance** | `manuel-erp-finance-2026-08` |
| **Marketing** | `manuel-marketing-campagnes-2026-08` |
| **Support &amp; SAV** | `manuel-support-sav-2026-08` |
| **Sourcing &amp; Expéditions** | `manuel-sourcing-expeditions-2026-08` |
| **Prospection vendeurs** | `manuel-prospection-vendeurs-2026-07` |

Les écrans qui n'ont pas encore de manuel propre — cockpit, tâches, équipe, référentiels, modélisation — sont documentés **intégralement ici**.

### État de livraison

**Les habilitations sont en production, la console dédiée reste à construire.**

Ce qui tourne aujourd'hui sous `pieces.ci/admin` : les fiches équipe avec rôle métier, la matrice de capacités, la navigation filtrée par capacité, le cockpit des trois lignes. `erp.pieces.ci` est en service, mais comme une porte d'entrée — le domaine redirige vers `/admin`, il ne sert pas encore d'arborescence propre.

Ce qui reste à faire : l'arborescence `/erp/*` elle-même, avec ses écrans propres et sa règle de routage. **Ce manuel décrit cette cible** et signale, écran par écran, où l'on en est. Tout ce qui n'est pas marqué « en production » est à venir.

## Pourquoi un domaine séparé

Aujourd'hui l'administration vit sous `pieces.ci/admin`, dans la même application que l'espace client. Trois raisons de l'en sortir :

- **Une console interne n'est pas une page de l'app client.** Densité d'information, tableaux larges, navigation par métier : rien de commun avec le parcours d'un acheteur. Les deux surfaces divergent, autant les séparer proprement.
- **La sécurité se raisonne mieux par domaine.** Un sous-domaine dédié permet de restreindre l'accès (filtrage, journalisation, politiques de navigateur) sans toucher au site public.
- **La lisibilité pour l'équipe.** « Va sur erp.pieces.ci » est une instruction ; « va sur pieces.ci puis /admin, mais pas /admin/finances qui est la modélisation, plutôt /admin/finance » n'en est pas une.

### Ce que la bascule change — et ne change pas

| | Avant | Après | Où l'on en est |
|---|---|---|---|
| **Adresse** | `pieces.ci/admin` | `erp.pieces.ci` | Domaine en service, mais il redirige vers `/admin` |
| **Connexion** | Compte Pièces | Le même compte — le cookie est partagé sur tout `.pieces.ci` | ✅ en production |
| **Qui entre** | Rôle `ADMIN` | Fiche **équipe** avec un rôle métier (l'`ADMIN` reste admis) | ✅ en production |
| **Navigation** | Une liste de 19 entrées | Sections métier, filtrées par capacité | ✅ en production, sous `/admin` |
| **Modules existants** | 19 écrans `/admin/*` | Inchangés et joignables — la console ERP pointe dessus | ✅ inchangés |
| **Arborescence** | `/admin/*` | `/erp/*` avec ses écrans propres | ⏳ à construire |

<div class="callout">
<p class="lead">Aucun écran existant n'est <strong>supprimé ni réécrit</strong> par la bascule.</p>
<p>Les modules <code>/admin/*</code> continuent de fonctionner exactement comme aujourd'hui. La console ERP ajoute une couche au-dessus : une page d'accueil consolidée, des tâches, des habilitations par métier, et des liens vers les modules en place. La migration se fait écran par écran, sans coupure.</p>
</div>

### La règle de routage

**Aujourd'hui**, `erp.pieces.ci` est une porte d'entrée et rien de plus : la racine mène au login si besoin, puis redirige vers `/admin`. Le domaine est en service, l'arborescence dédiée n'existe pas encore. Un lien `erp.pieces.ci/stock` ne mène nulle part — il faut passer par `/admin/stock`.

**À terme**, sur `erp.pieces.ci`, **tout sera réécrit vers la console** — `erp.pieces.ci/taches` servira `/erp/taches`, `erp.pieces.ci/` servira le cockpit. Une courte liste d'exceptions échappera à la règle, parce qu'il faut pouvoir se connecter et lire les mentions légales : `/login`, `/logout`, `/auth`, `/oauth`, `/forgot-password`, `/reset-password`, `/cgu`, `/confidentialite`.

Ce sera le choix **inverse** de `logistique.pieces.ci`, qui expose une liste blanche de pages. La vitrine logistique est publique et compte une dizaine de pages ; l'ERP n'aura aucune page publique et en comptera des dizaines. Maintenir une liste blanche de quarante entrées serait une fabrique à 404 silencieux.

Conséquence pratique une fois la bascule faite : `pieces.ci/erp/…` et `erp.pieces.ci/…` désigneront la même chose. Les deux cohabiteront — utile en développement, où les sous-domaines locaux sont pénibles, et pour les liens croisés depuis `/admin`.

## Accès et habilitations

### Deux dimensions indépendantes

Un compte Pièces porte des **rôles d'espace** (`BUYER`, `SELLER`, `RIDER`, `DRIVER`, `ADMIN`, `ENTERPRISE`, `LIAISON`) qui ouvrent les espaces côté client. L'ERP ajoute une seconde dimension, sans rapport : le **rôle métier interne**, porté par une *fiche équipe* rattachée au compte.

Un vendeur de la marketplace n'a aucune fiche équipe. Un comptable de Pièces a une fiche équipe `COMPTABLE` et, côté client, un simple compte acheteur. Les deux ne se mélangent jamais.

### La fiche équipe

| Champ | Contenu |
|---|---|
| **Rôle métier** | Un seul parmi les sept ci-dessous |
| **Lignes d'activité** | Marketplace, Flottes, Logistique — une ou plusieurs |
| **Intitulé** | Libre (« Responsable achats », « Chargée de compte grands comptes ») |
| **Actif** | Un membre désactivé perd **toutes** ses capacités, même celles de son rôle |
| **Date d'entrée** | Informative |

### Les sept rôles métier

| Rôle | Ce qu'il peut faire |
|---|---|
| **Direction** | Accès complet, y compris clôture comptable et administration de l'ERP |
| **Commercial** | CRM en écriture, lecture des ventes et du stock. Pas d'accès comptable |
| **Comptable** | Factures, encaissements, écritures et clôture de période |
| **Acheteur** | Crée les bons de commande. L'approbation reste à la direction |
| **Magasinier** | Mouvements de stock et inventaires |
| **Ops logistique** | Cotations, suivi des expéditions, mouvements de stock |
| **Support** | Lecture seule sur le CRM et les ventes |

### Les dix-sept capacités

Chaque écran et chaque action est gardé par une **capacité** de la forme `domaine:action`. `erp:read` est le socle : sans elle, aucun accès à la console.

| Domaine | Capacités |
|---|---|
| **ERP** | `erp:read` (accéder), `erp:admin` (administrer) |
| **CRM** | `crm:read`, `crm:write`, `crm:assign` (attribuer comptes et opportunités) |
| **Ventes** | `sales:read`, `sales:invoice` (factures et avoirs), `sales:payment` (encaissements) |
| **Comptabilité** | `accounting:read`, `accounting:post` (comptabiliser), `accounting:close` (clôturer) |
| **Achats** | `purchase:read`, `purchase:order` (créer un BC), `purchase:approve` (approuver) |
| **Stock** | `stock:read`, `stock:move` (mouvements), `stock:adjust` (ajuster et valider les inventaires) |

<div class="callout">
<p class="lead">Séparation des tâches : <strong>celui qui commande n'approuve pas</strong>.</p>
<p>L'acheteur détient <code>purchase:order</code> mais pas <code>purchase:approve</code> — un bon de commande passe donc toujours par un second regard. De même, le magasinier compte et ajuste le stock, mais la clôture comptable lui échappe.</p>
</div>

### Trois règles à connaître

- **La navigation ne ment pas.** La barre latérale n'affiche que ce que l'API acceptera : un comptable ne voit pas la section « Achats » plutôt que de cliquer et récolter un refus. Une section vidée de toutes ses entrées disparaît entièrement.
- **`erp:admin` couvre tout.** C'est la capacité de la direction ; elle satisfait n'importe quelle vérification.
- **L'`ADMIN` plateforme obtient tout, sans fiche.** C'est l'amorçage : les administrateurs actuels entrent dans l'ERP sans migration de données, et créent les premières fiches équipe. À terme, chacun doit avoir sa fiche avec son vrai métier — l'`ADMIN` généralisé est une béquille de démarrage, pas un régime cible.

### Écran « Paramètres → Équipe »

Réservé à `erp:admin`. Il permet de :

1. **Rechercher un utilisateur existant** (par nom, téléphone ou e-mail) — on n'enrôle jamais un inconnu, toujours un compte Pièces déjà créé.
2. **L'enrôler** : choisir le rôle métier, cocher les lignes d'activité, saisir l'intitulé. Une ligne d'explication s'affiche sous chaque rôle pour éviter les erreurs d'attribution.
3. **Modifier ou désactiver** un membre. La désactivation est préférable à la suppression : elle coupe l'accès tout en conservant l'historique (tâches créées, notes écrites).

## La carte de la console

| Section | Écran | À quoi ça sert | Capacité | État |
|---|---|---|---|---|
| **Pilotage** | Cockpit | Indicateurs consolidés des trois lignes | `erp:read` | En production (`/admin`) |
| | Tâches | Travail interne et relances | `erp:read` | Phase 1 |
| **CRM** | Pipeline | Opportunités par étape | `crm:read` | Phase 3 |
| | Comptes | Fiche unique client / prospect | `crm:read` | Phase 3 |
| | Prospection vendeurs | Carnet de prospects terrain | `crm:read` | En production (`/admin/prospection`) |
| | Cotations logistique | Tunnel des demandes de devis | `crm:read` | En production (`/admin/logistique`) |
| **Ventes** | Factures | Émission, avoirs | `sales:read` | Phase 2 |
| | Encaissements | Rapprochement des règlements | `sales:payment` | Phase 2 |
| | Balance âgée client | Créances par ancienneté | `sales:read` | Phase 2 |
| **Achats** | Fournisseurs | Référentiel fournisseurs | `purchase:read` | En production (`/admin/stock`) |
| | Bons de commande | Approvisionnement | `purchase:read` | En production (`/admin/stock`) |
| | Réceptions | Entrées marchandises | `purchase:read` | En production (`/admin/stock`) |
| **Stock** | Niveaux | Inventaire valorisé | `stock:read` | En production (`/admin/stock`) |
| | Mouvements | Journal horodaté | `stock:read` | En production (`/admin/stock`) |
| | Inventaires | Comptages et écarts | `stock:adjust` | Phase 2 |
| **Comptabilité** | Écritures | Journal comptable | `accounting:read` | Phase 2 |
| | Balance | Balance générale | `accounting:read` | Phase 2 |
| | Périodes | Clôture mensuelle | `accounting:close` | Phase 2 |
| **Paramètres** | Équipe | Fiches et habilitations | `erp:read` / `erp:admin` | En production (`/admin/equipe`) |

Les entrées de phase 2 et 3 apparaissent **grisées** dans la barre latérale : l'équipe voit la carte complète du produit sans tomber sur des pages vides.

## Pilotage → Cockpit

La page d'accueil de la console — en production aujourd'hui sous `/admin`. Elle **n'agrège que des données existantes** : le socle ne crée aucune donnée métier, il donne une lecture unique de ce que la plateforme produit déjà.

### Le filtre de ligne d'activité

Quatre boutons en haut : **Toutes lignes**, **Marketplace**, **Flottes**, **Logistique**. Tous les indicateurs de la page s'y plient.

<div class="callout">
<p class="lead">Le rattachement à une ligne d'activité est aujourd'hui une <strong>heuristique, pas une donnée</strong>.</p>
<p>Faute de colonne « ligne d'activité » sur les modèles historiques : <strong>Marketplace</strong> = les commandes sans entreprise (particuliers, mécaniciens) ; <strong>Flottes</strong> = les commandes rattachées à une entreprise, plus les abonnements ; <strong>Logistique</strong> = les demandes de cotation. Les phases suivantes poseront l'information à la source. D'ici là, c'est la seule lecture honnête possible.</p>
</div>

### Les quatre compteurs

- **CA du mois** — total TTC des factures émises depuis le 1er du mois, avec la variation en pourcentage par rapport au mois précédent.
- **Factures émises** — leur nombre, et le panier moyen en sous-titre.
- **Commandes actives** — commandes payées mais pas encore soldées (statuts `PAID` à `CONFIRMED`), avec le nombre en attente de paiement.
- **Mes tâches** — vos tâches ouvertes, et combien sont en retard.

### Les blocs de lecture

| Bloc | Ce qu'il montre |
|---|---|
| **Chiffre d'affaires facturé — 6 mois** | Histogramme du TTC facturé mois par mois |
| **Répartition du mois** | Part de chaque ligne d'activité dans le CA du mois |
| **Tunnel logistique** | Cotations ouvertes, cotations gagnées ce mois → lien vers la file |
| **Flottes** | Abonnements actifs, en période d'essai, véhicules gérés, entreprises |
| **Réseau vendeurs** | Vendeurs actifs, prospects à travailler → lien vers la prospection |
| **Ventilation fiscale du mois** | Base HT, TVA collectée, total TTC |

La logistique ne produit pas encore de facture : son activité se lit dans le tunnel de cotation, pas dans le chiffre d'affaires. Le bloc fiscal est une ventilation, pas une déclaration — les écritures et la balance âgée arrivent en phase 2.

## Pilotage → Tâches

> ⏳ **À construire.** Cet écran n'a pas d'équivalent sous `/admin`. La description ci-dessous est la cible, pas l'existant.

Le carnet de travail commun de l'équipe. Une tâche portera un titre, une description, un responsable, une échéance, une priorité, une ligne d'activité, et — c'est le point important — un **rattachement** à un objet de la plateforme (une commande, un vendeur, une entreprise, un dossier de sourcing).

### Statuts

| Statut | Signification | Action rapide |
|---|---|---|
| **À faire** | Créée, pas commencée | « Démarrer » |
| **En cours** | Prise en charge | « Terminer » |
| **Terminée** | Close avec succès | — |
| **Annulée** | Close sans suite | — |

### Priorités

**Urgente**, **Haute**, **Normale**, **Basse**. La priorité ne change rien au comportement du système : c'est un signal pour l'équipe, affiché par une pastille de couleur.

### Échéances

L'échéance s'affiche en clair — « Aujourd'hui », « Demain », « Hier », « Dans 3 jours », « Il y a 5 jours » — plutôt qu'en date brute, au-delà d'une semaine seulement la date complète est affichée. Une date brute oblige à compter mentalement ; ici l'urgence se lit.

Une tâche est **en retard** si son échéance est passée **et** qu'elle est encore ouverte. Une tâche terminée ou annulée n'est jamais en retard, et ne compte pas dans la charge.

### Bonnes pratiques

- **Une tâche = un geste attendu de quelqu'un.** « Rappeler M. Koné avant vendredi » est une tâche. « Suivre le dossier Yango » n'en est pas une.
- **Rattachez toujours.** Une tâche rattachée à une commande se retrouve depuis la commande ; une tâche orpheline se perd.
- **Annulez plutôt que supprimez.** Une tâche annulée garde la trace de la décision.

## Notes internes

> ⏳ **À construire.** Comme les tâches, les notes arrivent avec la console dédiée. La description ci-dessous est la cible, pas l'existant.

Toute entité de la plateforme pourra recevoir des **notes internes** : un commentaire libre, signé et horodaté, visible de l'équipe et jamais du client. Une note pourra être **épinglée** — elle remonte alors en tête, ce qui sert pour les consignes permanentes (« Ce client règle toujours à 30 jours, ne pas relancer avant »).

La note est le bon endroit pour le contexte qui ne rentre dans aucun champ. Elle ne remplace pas une tâche : une note ne se termine pas.

## CRM

Le CRM de Pièces couvre aujourd'hui **trois périmètres complémentaires**, hérités de trois besoins distincts. La couche « Pipeline / Comptes » de la phase 3 les unifiera ; d'ici là, chacun garde son écran.

| Périmètre | Écran | Objet suivi |
|---|---|---|
| **Clients &amp; vendeurs** | `/admin/crm` | Relation avec un compte existant |
| **Prospection vendeurs** | `/admin/prospection` | Vendeur pas encore sur la plateforme |
| **Cotations logistique** | `/admin/logistique` | Demande de devis entrante |

### Clients &amp; vendeurs

Fiches 360° (commandes, litiges, retours, avis, demandes de pièces), timeline fusionnée de tous les échanges, tâches et relances avec rappel WhatsApp automatique le matin, tags libres et segments calculés (client nouveau / actif / fidèle / à risque / inactif ; vendeur actif / sans commande depuis 30 jours / fiche incomplète / litiges ouverts).

→ Manuel complet : `manuel-crm-clients-vendeurs-2026-08`.

### Prospection vendeurs

Carnet de prospects terrain, journal d'actions (appel, WhatsApp, visite, note), radar de leads importés d'OpenStreetMap et des marketplaces, attribution aux Liaisons, déduplication, conversion en vendeur. Funnel : **À contacter → Appelé → Visité → Conclu**.

→ Manuel complet : `manuel-prospection-vendeurs-2026-07`.

### Cotations logistique

La file des demandes de devis entrantes depuis `logistique.pieces.ci`. Chaque ligne porte une référence, la pièce demandée, le contact, le véhicule, les preuves fournies et le niveau de certitude de l'identification. Funnel : **Nouvelle → Contactée → En cotation → Cotée → Gagnée / Perdue / Spam**.

C'est le point d'entrée du parcours Sourcing : une cotation gagnée devient un dossier de sourcing.

## Ventes et Finance

### Aujourd'hui : le module Finance

Cockpit comptable **strictement en lecture seule** — il n'écrit rien, il agrège. Trois onglets : **Vue d'ensemble**, **Vendeurs**, **Exports**.

Deux repères qui valent dans tout le module :

- **Seules les commandes terminées comptent.** Une commande en cours, annulée ou remboursée n'entre ni dans le chiffre d'affaires ni dans les commissions. La période d'une commande est sa date de création.
- **Le GMV n'est pas un revenu.** Le revenu de Pièces est la ligne « Commissions ». Le GMV est le total encaissé par les clients.

→ Manuel complet : `manuel-erp-finance-2026-08`.

### Demain : facturation et comptabilité

Les écrans **Factures**, **Encaissements**, **Balance âgée**, **Écritures**, **Balance** et **Périodes** arrivent en phase 2. Deux briques de fondation sont déjà posées :

**La numérotation atomique.** Les numéros de pièces (facture, avoir, règlement, écriture, opportunité, bon de commande, réception, facture fournisseur) sont désormais tirés d'un compteur transactionnel, remis à zéro chaque mois, chaque année ou jamais selon le type.

<div class="callout">
<p class="lead">Un numéro tiré est <strong>consommé, même si l'opération échoue ensuite</strong>.</p>
<p>La série peut donc comporter des trous. C'est volontaire et c'est le compromis habituel : l'alternative (garder le verrou jusqu'à la fin de l'opération) sérialiserait toute la facturation. Un trou dans la numérotation n'est pas une anomalie à corriger.</p>
</div>

**Le journal des ventes.** Un type de traitement de fond est réservé pour la comptabilisation automatique des ventes ; il sera activé avec les écritures.

## Achats et Stock

Le module **Stock &amp; achats** couvre déjà l'essentiel, en quatre onglets : **Inventaire**, **Achats**, **Fournisseurs**, **Mouvements**.

- **Inventaire** — quantités par pièce et par emplacement, valeur du stock en FCFA, alertes de rupture et de stock bas (les nôtres et ceux des vendeurs).
- **Achats** — bons de commande fournisseurs avec estimation du **coût rendu entrepôt** (marchandise + fret + douane + livraison finale) avant engagement, et réception partielle.
- **Fournisseurs** — fiches et historique.
- **Mouvements** — journal horodaté de chaque entrée, sortie, ajustement et restitution, avec l'auteur et la référence.

→ Manuel complet : `manuel-erp-stock-achats-2026-08`.

Ce qui reste à venir : les **inventaires** au sens comptage physique avec validation des écarts (capacité `stock:adjust`), et le circuit d'**approbation** formel des bons de commande (`purchase:approve`), aujourd'hui implicite.

## Logistique

Trois écrans qui se suivent dans le temps.

| Écran | Rôle |
|---|---|
| **Cotations logistique** | La demande entre, on la qualifie et on la chiffre |
| **Sourcing** | On ouvre un dossier, on saisit les offres relevées, on arbitre, on commande |
| **Expéditions** | On suit le colis étape par étape ; le client voit l'avancement |

<div class="callout">
<p class="lead">L'offre la moins chère à l'achat est presque toujours <strong>la plus chère au total</strong>.</p>
<p>Un véhicule immobilisé coûte 23 000 à 38 000 F par jour à sa flotte. La matrice d'arbitrage du sourcing classe donc les offres au coût rendu Abidjan, immobilisation comprise — pas au prix affiché. Et un prix relevé sur une page web reste <strong>indicatif tant qu'un opérateur ne l'a pas confirmé auprès du vendeur</strong> : ne communiquez jamais un montant non confirmé comme un devis.</p>
</div>

→ Manuel complet : `manuel-sourcing-expeditions-2026-08`.

## Support et Marketing

### Support &amp; SAV

Deux onglets, **Litiges** et **Retours**. Un litige est pris en charge, résolu par écrit, puis clôturé. Un retour avance étape par étape sans transition impossible. Au statut « Remboursé », le séquestre de la commande est automatiquement remboursé au client s'il était encore bloqué, et le client est prévenu par WhatsApp. Sous le paiement direct, le vendeur étant payé dès l'encaissement, il n'y a en général rien à débloquer : le remboursement se règle avec le vendeur et se trace dans la note de résolution.

→ Manuel complet : `manuel-support-sav-2026-08`.

### Marketing

Campagnes WhatsApp en masse, ciblées sur les **mêmes segments que le CRM** ou sur n'importe quel tag. Aperçu d'audience avant envoi (combien recevront, combien sont exclus), envoi immédiat ou planifié, exclusion automatique et sans exception des désabonnés, traçage de chaque envoi dans la fiche CRM du destinataire.

→ Manuel complet : `manuel-marketing-campagnes-2026-08`.

## Référentiels et données

Ces écrans n'ont pas de manuel dédié : voici l'essentiel.

### Pièces

Le catalogue complet de la marketplace, tous vendeurs confondus. Recherche prédictive (nom, catégorie, référence OEM, marque, vendeur), filtre de statut (**Brouillon**, **Publié**, **Archivé**) et filtre de stock (**Rupture**, **Stock bas**, **Stock OK**, **Non suivi**). Colonnes : photo, nom, vendeur, prix, commission, stock, statut.

L'ancienne page « Catalogue » redirige ici — il n'y a plus qu'un seul écran catalogue.

### Fiches terrain

L'arbitrage d'authenticité des fiches produit remontées par les vendeurs et les Liaisons. Chaque fiche porte un **score d'authenticité sur 10** et un statut : **Brouillon**, **En modération**, **Inspection**, **Validée**, **Bloquée**. Le nombre de tentatives est signalé quand une fiche revient plusieurs fois.

C'est le filtre qui protège la promesse de la plateforme : une pièce mal identifiée vendue comme d'origine est un litige garanti.

### Imports externes

Les pièces et vendeurs collectés automatiquement sur des sources tierces, avant intégration au catalogue. Sources actuelles : 3H Autoparts, MAPA-CI, Jumia CI, CoinAfrique CI, Annuaire CI, Global Auto Online, OpenStreetMap, Google Places, NHTSA, Wikipedia, partsouq, et la saisie manuelle. Filtres par source, par présence d'une référence OEM et par statut.

### Clients

L'annuaire des utilisateurs. Filtres par rôle, par segment CRM et par tag ; export CSV. Deux fonctions utiles : la **dernière interaction** en colonne (repère de relance), et l'**enregistrement manuel d'un utilisateur WhatsApp** pour créer une fiche à partir d'un simple numéro.

### Vendeurs

L'annuaire des boutiques : statut, tags, dernière interaction, nombre d'articles ; filtres par segment et tag ; export CSV. L'écran génère aussi le **lien de contrat vendeur** à envoyer à un vendeur pour qu'il signe son contrat en ligne.

### Entreprises

Les comptes flotte : nom, commune, RCCM, nombre de véhicules, nombre de membres. Recherche sur les trois premiers champs.

### Liaisons

Le tableau de bord de l'activité terrain : par Liaison, le nombre de vendeurs créés, de pièces ajoutées, de commissions **à agréer** (mis en évidence quand il y en a), le total d'actions, la dernière activité et la répartition par type d'action.

### Équipe &amp; commissions

À ne pas confondre avec « Paramètres → Équipe » de l'ERP, qui gère les habilitations. Cet écran-ci gère la **rémunération des agents terrain** : profils, objectifs, et commissions estimées puis générées par période mensuelle.

- L'estimation reprend exactement la règle du cockpit : seules les commandes au statut `COMPLETED` comptent, la période est celle de la création de la commande, la commission est la somme des commissions des lignes.
- Les montants sont arrondis à la centaine de FCFA.
- Une commission générée peut ensuite être **payée** ou **annulée**.

### Modélisation

Le simulateur de projections financières : MRR et ARR à l'horizon choisi, résultat cumulé, plancher de trésorerie, avec trois scénarios (**Pessimiste**, **Base**, **Optimiste**) et quatre horizons (12, 24, 36, 60 mois). Les revenus sont ventilés en trois sources : commissions marketplace, abonnements Flotte, logistique premium.

<div class="callout">
<p class="lead">C'est un <strong>outil de projection, pas un état financier</strong>.</p>
<p>Aucun chiffre de cet écran ne décrit le passé. Ne le confondez pas avec le module <strong>Finance</strong>, qui lui ne montre que du réel. Le piège est réel : les deux entrées s'appellent aujourd'hui <code>/admin/finances</code> (modélisation) et <code>/admin/finance</code> (comptable) — un « s » les sépare. La bascule ERP est l'occasion de renommer.</p>
</div>

## Gouvernance et traçabilité

Quatre principes que la console applique partout :

- **Rien d'anonyme.** Chaque note, chaque tâche, chaque mouvement de stock, chaque interaction CRM porte son auteur et son horodatage.
- **Rien de perdu.** On désactive, on annule, on clôture — on ne supprime pas. L'historique d'un membre parti reste lisible.
- **Rien d'invisible.** Ce qu'un membre n'a pas le droit de faire ne lui est pas proposé : la navigation est filtrée par capacité, elle ne se contente pas de refuser au clic.
- **Rien d'inventé.** Quand un indicateur repose sur une approximation — le rattachement à une ligne d'activité, aujourd'hui —, l'écran le dit.

## Feuille de route

| Phase | Contenu | État |
|---|---|---|
| **1a — Habilitations** | Fiches équipe, rôles métier, capacités, navigation filtrée, cockpit | ✅ En production sous `/admin` |
| **1b — Console dédiée** | Arborescence `/erp/*`, règle de routage totale, tâches, notes, numérotation | À faire |
| **2 — Ventes &amp; compta** | Factures, avoirs, encaissements, balance âgée, écritures, balance, clôture de période, inventaires physiques | À faire |
| **3 — CRM unifié** | Pipeline d'opportunités et fiche compte unique, s'appuyant sur les trois CRM existants | À faire |
| **4 — Ligne d'activité à la source** | Colonne « ligne d'activité » sur les modèles métier, en remplacement de l'heuristique du cockpit | À faire |

### Déjà fait

1. ~~Déclarer `erp.pieces.ci`~~ en DNS et sur l'hébergement — en service, il redirige vers `/admin`.
2. ~~Appliquer la migration~~ des rôles métier — `staff_role` et `business_units` sont posés sur les fiches équipe existantes.
3. ~~Poser les capacités~~ — gardes API et navigation filtrée sont actives sur `/admin`.

### Ce qu'il reste à faire

1. **Créer les fiches équipe** depuis un compte administrateur : une par membre, avec son vrai métier — pour sortir du régime d'amorçage où tout `ADMIN` peut tout. C'est la seule étape qui ne demande pas de code.
2. **Construire l'arborescence `/erp/*`** et sa règle de routage (réécriture totale sauf liste noire), puis basculer `erp.pieces.ci` de la redirection vers la réécriture.
3. **Livrer tâches, notes et numérotation**, qui n'ont pas d'équivalent sous `/admin`.
4. **Migrer les modules écran par écran** de `/admin/*` vers `/erp/*`, sans coupure — `/admin` reste en service le temps de la transition.
5. **Communiquer la nouvelle adresse** à l'équipe une fois la console autonome.

## Limites connues

- **Le rattachement à une ligne d'activité est déduit**, pas déclaré (voir Cockpit). Les chiffres par ligne sont justes en tendance, approximatifs à la commande près.
- **La logistique n'a pas de chiffre d'affaires facturé** : son activité ne se lit que dans le tunnel de cotation.
- **Le séquestre bloqué du module Finance est un instantané** : il ne dépend pas de la période choisie.
- **La numérotation peut comporter des trous** (voir Ventes et Finance).
- **Trois CRM coexistent** en attendant la phase 3. Un même interlocuteur peut apparaître dans deux d'entre eux ; le rapprochement est manuel.
- **`/admin/finance` et `/admin/finances`** désignent deux choses différentes. À renommer lors de la bascule.

_Document interne Pièces — reflète l'état du code au 14 août 2026 : modules `/admin` en production, habilitations par métier en production, `erp.pieces.ci` en service en redirection vers `/admin`. La console `/erp` dédiée reste la cible : ce manuel la décrit au futur. À réviser après chaque phase._
