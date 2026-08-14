<p class="eyebrow">Proposition interne</p>

# Réorganiser l'administration de Pièces

<p class="deck">Dix-neuf entrées à plat, quatre annuaires pour les mêmes personnes, deux modules dont les noms ne diffèrent que d'un « s », et aucun écran pour l'objet central de la marketplace : la commande. Proposition d'une console réorganisée par métier — neuf sections, une file de travail unique, une fiche par acteur.</p>

<div class="callout">
<p class="lead">Une console d'administration se juge à une seule question : <strong>« que dois-je faire maintenant ? »</strong></p>
<p>Aujourd'hui la réponse exige d'ouvrir sept écrans. La réorganisation proposée la met sur la page d'accueil, et range le reste selon la manière dont le travail se fait réellement.</p>
</div>

## Le diagnostic

Sept constats, tous vérifiés dans le code au 4 août 2026.

### 1. Une liste plate de dix-neuf entrées

La barre latérale empile dix-neuf liens sans aucun regroupement. Au-delà de sept éléments, une liste cesse d'être parcourue : elle est fouillée. L'ordre actuel n'aide pas — « Modélisation », un outil de projection stratégique consulté quelques fois par trimestre, occupe la deuxième position, juste après le tableau de bord.

### 2. Quatre annuaires pour les mêmes personnes

**Clients**, **Vendeurs**, **Entreprises** et **Prospection** sont quatre écrans, quatre fiches et quatre recherches. Or un garagiste d'Adjamé peut être simultanément acheteur, vendeur et prospect travaillé par une Liaison. Personne ne peut aujourd'hui répondre à « montre-moi tout ce que nous savons de cette personne » sans ouvrir trois onglets.

### 3. Trois entrées pour le même catalogue

**Pièces**, **Fiches terrain** et **Imports externes** décrivent le même objet à trois stades : la pièce publiée, la fiche en cours de validation, la donnée brute collectée. Trois entrées de premier niveau pour un seul cycle de vie.

### 4. Deux modules qu'un « s » sépare

`/admin/finance` est le cockpit comptable — du réel, en lecture seule. `/admin/finances` est le simulateur de projections — de l'hypothèse. Ils s'appellent « Finance » et « Modélisation » dans la barre latérale, mais leurs adresses se confondent, et rien à l'écran ne prévient qu'on regarde une prévision plutôt qu'un résultat.

### 5. Aucun écran pour les commandes

L'API expose `GET /admin/orders`. La navigation n'a pas d'entrée « Commandes ». **L'objet central de la marketplace n'a pas d'écran d'administration** : on l'atteint par la fiche CRM d'un client, par un export CSV, ou pas du tout. Les livraisons sont dans le même cas.

### 6. La navigation ne dit rien

Dix-neuf libellés, zéro chiffre. Rien n'indique qu'il y a onze litiges non pris en charge, quatre fiches terrain en attente de modération ou trois commissions à agréer. L'information existe — chaque module la calcule pour son propre cockpit — mais elle reste enfermée dans l'écran qui la produit.

### 7. Tout le monde voit tout

Un seul rôle garde l'ensemble : `ADMIN`. Un magasinier voit la comptabilité, un comptable voit les mouvements de stock. Le socle ERP corrige déjà ce point avec sept métiers et dix-sept capacités — encore faut-il une navigation structurée pour en tirer parti.

<div class="callout">
<p class="lead">Ces sept défauts ont une <strong>cause commune</strong>.</p>
<p>La navigation actuelle a été construite par ajout : chaque module livré a poussé une ligne de plus dans la barre latérale. Elle reflète l'ordre de développement, pas l'organisation du travail. Le nombre d'entrées n'est pas le problème — leur absence de structure l'est.</p>
</div>

## Cinq principes

- **Ranger par processus, pas par table.** L'équipe pense « je facture », « je réceptionne », « je relance » — pas « table Invoice », « table StockMovement ».
- **Un acteur, une fiche.** Une personne ou une entreprise existe une seule fois, avec des facettes (client, vendeur, prospect), jamais en quatre exemplaires.
- **La navigation informe.** Chaque entrée porte le nombre de dossiers qui attendent un geste. La barre latérale devient un tableau de bord.
- **Ne montrer que le faisable.** Une section qu'un métier n'a pas le droit d'ouvrir ne lui est pas affichée.
- **Un nom, une chose.** Deux écrans différents ne peuvent pas porter deux noms voisins.

## La nouvelle carte

Neuf sections, vingt-huit écrans. Personne ne voit les neuf : un magasinier en voit trois.

| Section | Écrans | Ce qu'on y fait |
|---|---|---|
| **Pilotage** | Ma journée · Cockpit · Projections | Savoir quoi faire, et où en est l'entreprise |
| **CRM** | Comptes · Pipeline · Prospection · Campagnes | Suivre les relations, gagner des affaires |
| **Ventes** | Commandes · Facturation · SAV | Traiter ce qui est vendu |
| **Achats** | Dossiers de sourcing · Bons de commande · Réceptions · Fournisseurs | Trouver et acheter |
| **Stock** | Niveaux · Mouvements · Inventaires | Savoir ce qu'on a |
| **Logistique** | Expéditions · Livraisons | Acheminer |
| **Catalogue** | Pièces · Modération · Sources externes | Tenir l'offre |
| **Comptabilité** | Écritures · Balance · Périodes · Exports | Tenir les comptes |
| **Paramètres** | Équipe · Rémunération terrain · Référentiels · Journal d'audit | Administrer la console |

## Les trois gestes structurants

Le reste de la proposition découle de ces trois-là. S'il ne fallait en retenir qu'un, ce serait le premier.

### 1. « Ma journée » — une file unique

La page d'accueil de tout membre de l'équipe, sauf la direction. Elle agrège **ce qui attend un geste de moi**, à travers tous les modules, en une seule liste triée par urgence :

| Origine | Ce qui remonte |
|---|---|
| **Tâches** | Mes tâches ouvertes, les retards en tête |
| **SAV** | Litiges non pris en charge, retours à inspecter |
| **Catalogue** | Fiches terrain en attente de modération |
| **Sourcing** | Offres à confirmer auprès du vendeur, dossiers sans offre depuis X jours |
| **Achats** | Bons de commande à approuver, réceptions en attente |
| **CRM** | Relances échues, comptes à risque non contactés |
| **Terrain** | Commissions à agréer |
| **Ventes** | Commandes bloquées, paiements en attente |

Chaque ligne dit **quoi**, **depuis quand**, et ouvre le dossier d'un clic. Une file vide est un objectif atteignable — ce que dix-neuf écrans ne permettent pas.

<div class="callout">
<p class="lead">C'est le geste qui transforme la console : dix-neuf modules à surveiller deviennent <strong>une file à vider</strong>.</p>
<p>Et il ne demande aucune donnée nouvelle : chaque compteur existe déjà dans le cockpit de son module. Il s'agit de les rassembler, pas de les créer.</p>
</div>

### 2. « Comptes » — une fiche par acteur

Un écran unique remplace Clients, Vendeurs et Entreprises. Un compte porte une ou plusieurs **facettes** — Client, Vendeur, Entreprise, Prospect — et la fiche affiche les blocs correspondants :

- **Identité** — nom, téléphones, commune, WhatsApp, position.
- **Facettes actives** — chips colorées, comme les chips de condition du catalogue.
- **Timeline unique** — commandes, litiges, retours, avis, appels, visites, campagnes reçues, notes internes, dans un seul fil chronologique.
- **Encours** — ce que ce compte doit ou ce qu'on lui doit.
- **Tâches et notes** rattachées.

Les filtres et les segments existants deviennent des facettes de cet écran plutôt que des écrans séparés. La prospection garde son écran propre : c'est un outil de terrain (radar de leads, GPS, déduplication, tournées), pas un annuaire.

### 3. La recherche globale

Un champ unique, ouvert au clavier depuis n'importe quel écran, qui cherche à travers **comptes, pièces, commandes, dossiers de sourcing, expéditions et factures**. Il affiche le type de chaque résultat et y mène directement.

C'est la sortie de secours qui rend une navigation à neuf sections confortable : quand on sait ce qu'on cherche, on ne navigue pas. L'API `/admin/suggest` fait déjà ce travail pour les vendeurs, les clients et les entreprises — il reste à y ajouter les pièces et les commandes.

## Rendre la console informative

Quatre mécaniques, appliquées partout de la même façon.

- **Badges de navigation.** Chaque entrée porte le nombre de dossiers en attente. Orange s'il y a du retard, gris sinon. Aucun badge ne doit compter autre chose qu'un travail à faire — un badge qui affiche un volume d'activité devient du bruit en une semaine.
- **Bandeau de compteurs en tête de liste.** Chaque écran de liste s'ouvre sur trois à six compteurs cliquables qui filtrent la liste. Le modèle existe déjà — les cockpits du SAV, du stock et du sourcing font exactement cela ; il s'agit de le généraliser.
- **Filtre de ligne d'activité persistant.** Marketplace / Flottes / Logistique, choisi une fois en haut de la console et conservé d'un écran à l'autre. Aujourd'hui il n'existe que sur le cockpit ERP.
- **Dire d'où vient un chiffre.** Tout indicateur agrégé porte une note de méthode : « commandes au statut Terminée, période = date de création ». Sans cela, deux écrans qui comptent différemment font perdre confiance aux deux.

## Renommages

| Aujourd'hui | Proposé | Pourquoi |
|---|---|---|
| **Modélisation** (`/admin/finances`) | **Projections** (Pilotage) | Dit que ce sont des hypothèses, et libère le mot « finance » |
| **Finance** (`/admin/finance`) | **Comptabilité** | Du réel, tenu par le comptable |
| **Pièces** (`/admin/parts`) | **Catalogue** | La liste est à `/parts`, la fiche à `/catalog/:id` — deux noms pour un objet |
| **Fiches terrain** | **Modération** | Dit le geste attendu, pas la provenance |
| **Imports externes** | **Sources externes** | Ce sont des sources qui alimentent en continu, pas des imports ponctuels |
| **Cotations logistique** | **Pipeline** | C'est un tunnel d'opportunités, au même titre que les demandes flotte |
| **Sourcing** | **Dossiers de sourcing** | Un dossier est une unité de travail ; « sourcing » est une activité |
| **Équipe** (commissions terrain) | **Rémunération terrain** | Libère « Équipe » pour les habilitations, qui en ont besoin |
| **Liaisons** | *(fusionné)* | Même population que « Équipe » — deux vues d'un même sujet |
| **SAV** | **SAV** *(inchangé, déplacé)* | Le nom est bon ; sa place est sous Ventes |

## Où va chaque écran actuel

Rien n'est supprimé. Table de correspondance complète des dix-neuf entrées.

| Entrée actuelle | Nouvelle place |
|---|---|
| Tableau de bord | Pilotage → Cockpit |
| Modélisation | Pilotage → Projections |
| Pièces | Catalogue → Pièces |
| Fiches terrain | Catalogue → Modération |
| Imports externes | Catalogue → Sources externes |
| Vendeurs | CRM → Comptes *(facette Vendeur)* |
| Clients | CRM → Comptes *(facette Client)* |
| Entreprises | CRM → Comptes *(facette Entreprise)* |
| CRM | CRM → Comptes *(la fiche 360 devient la fiche de compte)* |
| Prospection | CRM → Prospection |
| Cotations logistique | CRM → Pipeline |
| Marketing | CRM → Campagnes |
| SAV | Ventes → SAV |
| Finance | Comptabilité → Exports *(le cockpit rejoint Pilotage)* |
| Stock &amp; achats — Inventaire | Stock → Niveaux |
| Stock &amp; achats — Mouvements | Stock → Mouvements |
| Stock &amp; achats — Achats | Achats → Bons de commande |
| Stock &amp; achats — Fournisseurs | Achats → Fournisseurs |
| Sourcing | Achats → Dossiers de sourcing |
| Expéditions | Logistique → Expéditions |
| Liaisons | Paramètres → Rémunération terrain |
| Équipe | Paramètres → Rémunération terrain |

## Les écrans qui manquent

La réorganisation met en évidence six trous. Trois sont, à mon sens, à combler en priorité.

| Écran | Pourquoi | Priorité |
|---|---|---|
| **Commandes** | L'objet central de la marketplace n'a pas d'écran. L'API existe déjà (`GET /admin/orders`) | Haute |
| **Livraisons** | Aucune vue d'ensemble des courses en cours ni des livreurs | Haute |
| **Ma journée** | La file unique décrite plus haut | Haute |
| **Réceptions** | Aujourd'hui noyée dans la fiche du bon de commande | Moyenne |
| **Inventaires** | Comptage physique et validation des écarts (capacité `stock:adjust`) | Moyenne |
| **Journal d'audit** | Qui a changé quoi, quand — indispensable dès que l'équipe dépasse dix personnes | Moyenne |

## Qui voit quoi

Application de la matrice de capacités du socle ERP à la nouvelle carte. ● section complète · ◐ partielle · — invisible.

| Section | Direction | Commercial | Comptable | Acheteur | Magasinier | Ops log. | Support |
|---|---|---|---|---|---|---|---|
| **Pilotage** | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| **CRM** | ● | ● | ◐ | ◐ | — | ● | ◐ |
| **Ventes** | ● | ◐ | ● | — | — | ◐ | ◐ |
| **Achats** | ● | — | ◐ | ● | ◐ | ◐ | — |
| **Stock** | ● | ◐ | — | ◐ | ● | ◐ | — |
| **Logistique** | ● | — | — | — | ◐ | ● | — |
| **Catalogue** | ● | ◐ | — | ◐ | ◐ | — | ◐ |
| **Comptabilité** | ● | — | ● | — | — | — | — |
| **Paramètres** | ● | — | — | — | — | — | — |
| **Sections visibles** | **9** | **5** | **5** | **5** | **5** | **6** | **4** |

Une console de neuf sections se présente donc, en pratique, comme une console de quatre à six sections. C'est ce qui rend la structure supportable.

## Schéma d'adresses

Un schéma unique et prévisible : `erp.pieces.ci/<section>/<écran>/<id>`.

- `/crm/comptes/:id` · `/crm/pipeline/:id` · `/crm/prospection`
- `/ventes/commandes/:id` · `/ventes/facturation` · `/ventes/sav/litiges/:id`
- `/achats/sourcing/:id` · `/achats/commandes/:id` · `/achats/receptions`
- `/stock/niveaux` · `/stock/mouvements` · `/stock/inventaires`
- `/catalogue/pieces/:id` · `/catalogue/moderation/:id`
- `/parametres/equipe`

Deux règles : le pluriel partout, et la fiche toujours sous la liste qui la contient — ce qui n'est pas le cas aujourd'hui, où la liste des pièces est à `/admin/parts` et la fiche à `/admin/catalog/:id`.

## Plan de bascule

Quatre lots, livrables indépendamment. Aucun ne coupe le service : `/admin/*` reste en place et redirige au fur et à mesure.

| Lot | Contenu | Effet visible |
|---|---|---|
| **1 — Structure** | Sections métier, filtrage par capacité, badges, recherche globale, puis arborescence `/erp/*` et redirections `/admin/*` → `/erp/*` | La console change de forme, aucun écran ne change |
| **2 — Ma journée** | La file unique, alimentée par les compteurs existants | Le gain le plus fort pour l'équipe |
| **3 — Dédoublonnage** | Comptes unifiés, fusion Liaisons + Équipe, renommages | Quatre annuaires deviennent un |
| **4 — Trous** | Commandes, Livraisons, Réceptions, Inventaires, Journal d'audit | La couverture devient complète |

La facturation, la comptabilité et le pipeline d'opportunités restent aux phases 2 et 3 de l'ERP déjà planifiées : la réorganisation leur réserve leur place sans les attendre.

<div class="callout">
<p class="lead">Faire la réorganisation <strong>sur erp.pieces.ci, pas sur /admin</strong>.</p>
<p>La console ERP est déjà construite en sections filtrées par capacité — c'est exactement la structure décrite ici. Réorganiser <code>/admin</code> d'abord reviendrait à faire le travail deux fois. Le lot 1 consiste donc à fusionner le socle et à y accrocher les modules existants, pas à déplacer des fichiers dans l'application actuelle.</p>
</div>

## Décisions à prendre

Quatre points qui relèvent de vous, et sur lesquels je n'ai pas tranché.

- **Fusionner réellement les annuaires, ou seulement les regrouper ?** Une vraie fiche de compte unique demande de rapprocher les enregistrements existants (un vendeur et un client peuvent être la même personne sans le savoir). Un regroupement en facettes sans rapprochement est plus rapide, mais laisse les doublons visibles.
- **Combien de temps garder `/admin` en redirection ?** Je recommande un trimestre, puis suppression.
- **Qui approuve les bons de commande ?** La matrice actuelle réserve `purchase:approve` à la direction. À l'échelle d'aujourd'hui c'est sain ; au-delà, c'est un goulot d'étranglement. Faut-il un seuil de montant en dessous duquel l'acheteur s'approuve lui-même ?
- **Faut-il un rôle « Liaison » dans l'ERP ?** Les Liaisons ont leur propre espace client (`/liaison`). Elles ne sont pas dans les sept métiers internes. À confirmer : restent-elles hors de la console ?

_Proposition interne Pièces — établie le 4 août 2026, révisée le 14 août 2026 à partir de l'état du code : dix-neuf modules `/admin` en production, habilitations par métier en production, `erp.pieces.ci` en service en redirection vers `/admin`. L'arborescence `/erp/*` dédiée reste la cible. Aucun engagement de délai : les lots sont dimensionnés pour être livrés indépendamment._
