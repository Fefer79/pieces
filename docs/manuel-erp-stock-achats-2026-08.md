<p class="eyebrow">Document interne</p>

# ERP Stock, achats & fournisseurs — Manuel d'utilisation

<p class="deck">Le module « Stock &amp; achats » de l'équipe Pièces : inventaire de notre stock propre, journal des mouvements, bons de commande fournisseurs avec coût rendu entrepôt, et suivi des fournisseurs — accessible depuis l'espace Administration.</p>

<div class="callout">
<p class="lead">Une pièce vendue sur la marketplace ne doit jamais être <strong>introuvable en entrepôt</strong> : chaque entrée, chaque sortie et chaque franc dépensé en approvisionnement est tracé au même endroit.</p>
<p>Ce manuel explique comment utiliser le module au quotidien : tenir l'inventaire, passer et réceptionner un bon de commande, et réagir aux alertes de stock avant la rupture.</p>
</div>

## À quoi sert le module

Le module « Stock &amp; achats » est l'outil interne de gestion du **stock propre de Pièces** (les pièces que nous achetons et entreposons) et de la **visibilité sur le stock des vendeurs** de la marketplace. Il répond à quatre besoins :

- **Savoir ce qu'on a** : l'inventaire tient les quantités par pièce et par emplacement, avec la valeur du stock en FCFA.
- **Tout tracer** : chaque entrée, sortie, ajustement ou restitution est consignée dans un journal horodaté, avec l'auteur et la référence (bon de commande ou commande marketplace).
- **Acheter au bon prix** : les bons de commande fournisseurs estiment le coût complet d'un approvisionnement (marchandise + fret + douane + livraison finale) avant de s'engager.
- **Ne jamais être surpris** : les ruptures et les stocks bas — les nôtres comme ceux des vendeurs — remontent en alerte sur la page d'accueil du module.

**Accès.** Espace **Administration** → entrée **« Stock &amp; achats »** dans la barre latérale. Le module est réservé aux membres de l'équipe Pièces habilités Administration. Il s'organise en quatre onglets : **Inventaire**, **Achats**, **Fournisseurs** et **Mouvements**.

## Onglet Inventaire

La page d'accueil du module donne l'état du stock en un coup d'œil.

### Le cockpit : huit compteurs

Huit cartes en haut de page :

- **Emplacements actifs** — nombre d'entrepôts, boutiques et lieux de transit actifs.
- **Références suivies** — nombre de fiches catalogue distinctes pour lesquelles nous tenons un stock.
- **Ruptures** — lignes de stock à zéro. C'est votre priorité du matin.
- **Stock bas** — lignes au-dessus de zéro mais à leur seuil d'alerte ou en dessous.
- **Valeur du stock** — somme des quantités multipliées par leur coût moyen, en FCFA.
- **Mouvements 30 j** — nombre d'entrées, sorties et ajustements sur les 30 derniers jours.
- **Fournisseurs actifs** — fournisseurs non désactivés.
- **BC en cours** — bons de commande envoyés, en transit ou en réception partielle.

### La table des niveaux de stock

Le cœur de l'onglet : une ligne par couple **pièce × emplacement**, avec trois filtres combinables — **emplacement**, **statut** (Rupture / Stock bas / OK) et une **recherche** sur le nom de la pièce ou sa référence OEM.

Colonnes :

- **Pièce** — nom cliquable (ouvre la fiche catalogue) et référence OEM le cas échéant.
- **Emplacement** — nom de l'emplacement et son type (Entrepôt, Boutique ou Transit).
- **Quantité** — quantité physique actuelle.
- **Seuil** — seuil d'alerte : à cette quantité ou en dessous, la ligne passe en « Stock bas ».
- **CUMP** — coût unitaire moyen pondéré : le coût d'achat moyen de la pièce à cet emplacement, recalculé à chaque entrée valorisée (voir « Les automatismes »). Un tiret signifie coût inconnu (jamais d'entrée avec un prix).
- **Valeur** — quantité × coût moyen, en FCFA.
- **Statut** — pastille **Rupture** (rouge, quantité à zéro), **Stock bas** (orange, ≤ seuil) ou **OK** (vert).

### Ajuster un stock à la main

Le bouton **« Ajuster ± »** de chaque ligne sert à corriger le stock : inventaire physique, casse, erreur de saisie. La boîte de dialogue rappelle la pièce, l'emplacement et le solde actuel.

1. Saisissez le **delta** : un nombre positif (entrée, ex. `10`) ou négatif (sortie, ex. `-2`), directement ou avec les boutons **−** et **+**. Le **solde projeté** s'affiche en dessous ; un solde négatif est refusé (le bouton est grisé et le serveur le rejetterait de toute façon).
2. Sur une **entrée** (delta positif), un champ **coût unitaire FCFA** apparaît : renseignez-le pour que le coût moyen de la pièce soit recalculé. Laissez-le vide si vous ne connaissez pas le coût — le coût moyen reste alors inchangé.
3. Renseignez le **motif** (ex. « inventaire », « casse transport », « correction saisie ») : il apparaîtra dans le journal des mouvements, sous la date.
4. **« Valider l'ajustement »** : la ligne et les compteurs se mettent à jour aussitôt.

Exemple : il reste 7 bobines d'allumage à l'entrepôt de Treichville, 2 sont cassées à la livraison. Ajustement de **−2**, motif « casse transport » → le solde passe à 5 et un mouvement « Ajustement » est consigné à votre nom.

### Les alertes stock vendeurs

Sous la table, la section **« Alertes vendeurs »** liste les fiches **vendeurs** (marketplace) dont la quantité suivie est en rupture ou sous leur seuil — ruptures d'abord, puis quantité croissante. Chaque ligne montre la pastille de statut, la pièce (cliquable), le vendeur (cliquable, avec la mention « Stock interne » pour notre propre boutique), le stock et le seuil. Dix alertes sont affichées ; un compteur indique le total s'il y en a davantage (ex. « 10 alertes affichées sur 23 »).

Usage : c'est votre liste de réapprovisionnement et de relances. Une fiche vendeur en rupture, c'est une pièce que la marketplace ne peut plus vendre — appelez le vendeur ou proposez de sourcer la pièce via un bon de commande.

### Les emplacements

Un emplacement est un lieu physique où nous stockons : un **entrepôt**, une **boutique** ou un lieu de **transit** (zone de dédouanement, dépôt temporaire). Le bouton **« + Emplacement »** ouvre la création : nom (ex. « Entrepôt Treichville »), type et commune (optionnel). **Si aucun emplacement n'existe**, le formulaire s'affiche d'office en haut de page — commencez par créer l'emplacement par défaut, sans quoi ni ajustement ni réception ne peuvent impacter le stock.

## Onglet Achats

L'onglet Achats gère les **bons de commande fournisseurs** (BC), du brouillon à la réception.

### La liste des bons de commande

La table liste tous les BC, du plus récent au plus ancien, filtrables par **statut** et par **fournisseur**. Colonnes : **numéro** (format `BC-20260802-8F3K` — daté et dictable au téléphone), fournisseur, statut, mode logistique, nombre de lignes, montant estimé, date de livraison estimée (ETA) et date de création.

Les six statuts : **Brouillon**, **Envoyée**, **En transit**, **Réception partielle**, **Réceptionnée**, **Annulée**.

### Créer un bon de commande, pas à pas

Le bouton **« + Nouveau bon de commande »** ouvre le formulaire.

1. **Fournisseur** : tapez au moins 2 lettres du nom, du pays ou de la ville, puis cliquez le bon résultat. Le fournisseur choisi s'affiche avec sa localisation, sa devise et son délai typique ; **« Changer »** permet de recommencer. Si la recherche ne trouve rien, le message « Aucun fournisseur trouvé. Créez-le dans l'onglet Fournisseurs » s'affiche : créez d'abord la fiche là-bas.
2. **Mode logistique** : cinq choix (voir la table ci-dessous).
3. **Destination** : l'emplacement qui recevra la marchandise. **« Aucune (pas d'impact stock) »** permet de suivre un achat sans faire entrer les quantités en stock (achat pour compte de tiers, pièce montée immédiatement, etc.).
4. **Lignes** : chaque ligne est soit rattachée à une **fiche catalogue** (recherchez et sélectionnez-la), soit une **désignation libre** (ex. « Plaquettes Corolla 2015 ») quand la fiche n'existe pas encore. Les deux peuvent se mélanger dans le même bon. Renseignez la **quantité**, le **prix unitaire en FCFA** et le **poids estimé en kilos** par unité — ce poids est indispensable pour les modes d'import car il conditionne l'estimation du fret. **« + Ajouter une ligne »** pour empiler les références.
5. **L'encadré « Coût rendu entrepôt »** se calcule tout seul dès que le montant est positif : marchandise, fret, douane, livraison finale, délai estimé et **total rendu**. Changez de mode ou de poids : l'estimation se recalcule après une fraction de seconde.
6. **Notes internes** (optionnel : conditions, transporteur, contact au départ…) puis **« Créer le bon (brouillon) »**. Vous arrivez directement sur la fiche du bon créé.

Les prix se saisissent **en FCFA** : convertissez au taux du jour avant de saisir (la devise du fournisseur reste indiquée sur sa fiche à titre informatif).

### Les modes logistiques et leur coût

| Mode | Délai | Tarif fret | Minimum | Frais de dossier |
|---|---|---|---|---|
| **Achat local** | 2 j | — | — | 2 000 F |
| **Aérien express** | 3 j | 9 500 F/kg | 45 000 F | 15 000 F |
| **Aérien standard** | 5 j | 7 000 F/kg | 32 000 F | 15 000 F |
| **Aérien économique** | 7 j | 5 000 F/kg | 25 000 F | 15 000 F |
| **Maritime groupé** | 45 j | 450 F/kg | 30 000 F | 25 000 F |

Règles de calcul de l'estimation :

- **Fret** = poids total × tarif/kg, ramené au minimum de perception si inférieur, **plus** les frais de dossier. En achat local, le fret se résume au forfait de 2 000 F.
- **Douane (20 %)** = 20 % de (marchandise + fret), pour les modes d'import uniquement (aérien et maritime). Zéro en achat local.
- **Last-mile** = 2 000 F forfaitaires pour la livraison finale à Abidjan après dédouanement (import uniquement).

Exemple chiffré : 10 alternateurs à 45 000 F pièce (marchandise **450 000 F**), 70 kg au total, en **Aérien standard** :

- Fret : 70 kg × 7 000 F = 490 000 F + 15 000 F de dossier = **505 000 F**
- Douane : 20 % × (450 000 + 505 000) = **191 000 F**
- Last-mile : **2 000 F**
- **Total rendu : 1 148 000 F**, soit ~114 800 F l'alternateur posé à l'entrepôt — contre 45 000 F affiché chez le fournisseur. C'est ce coût rendu, jamais le prix fournisseur seul, qui doit piloter vos décisions d'achat.

### La fiche du bon de commande

Cliquez un numéro dans la liste pour ouvrir la fiche. L'en-tête affiche le numéro, la pastille de statut, le fournisseur, le mode et l'auteur. À gauche, la table des **lignes** (quantité commandée, quantité reçue avec le reliquat, prix unitaire, sous-total) ; à droite, les actions et les montants.

#### Faire avancer le statut

La carte **« Statut »** n'affiche que les actions possibles depuis le statut actuel :

| Statut actuel | Boutons affichés |
|---|---|
| **Brouillon** | « Envoyer au fournisseur » · « Annuler le bon » |
| **Envoyée** | « Marquer en transit » · « Annuler le bon » |
| **En transit** | « Annuler le bon » |
| **Réception partielle** | « Clôturer la réception » |
| **Réceptionnée** | — (état final) |
| **Annulée** | — (état final) |

L'annulation demande une confirmation. À l'envoi au fournisseur, la date d'envoi est enregistrée et, si aucune ETA n'était fixée, la date de livraison estimée est calculée automatiquement (délai du mode logistique).

#### Réceptionner, ligne par ligne

Dès que le bon est **Envoyée**, **En transit** ou en **Réception partielle**, la carte **« Réception »** apparaît avec, pour chaque ligne encore ouverte : le reliquat (« Reste 6 / 10 »), un champ **quantité reçue** (pré-rempli au reliquat) et un champ **prix réel FCFA** (pré-rempli en filigrane au prix prévu — corrigez-le si la facture diffère). **« Réceptionner »** valide la ligne, sans attendre le reste du bon : les réceptions partielles sont la norme.

À chaque réception sur une ligne rattachée à une fiche catalogue **avec destination** : la quantité entre en stock à l'emplacement, un mouvement « Réception » est consigné, le coût moyen est recalculé **au prix réel**, et le compteur de stock affiché sur la marketplace est crédité. Les lignes libres (sans fiche catalogue) ne suivent que le coût et la quantité. Quand toutes les lignes sont complètes, le bon passe de lui-même en **Réceptionnée** ; sinon il passe en **Réception partielle** — à clôturer manuellement (« Clôturer la réception ») quand le reliquat est perdu ou abandonné.

Attention : un bon **sans destination** affiche un avertissement orange — les quantités et coûts sont suivis, mais rien n'entre en stock.

#### Montants et informations

La carte **« Montants »** rappelle l'estimation (marchandise, fret, douane, last-mile, total rendu, délai) et affiche le **« Montant réel réceptionné »** dès la première réception : c'est la somme des prix réels des quantités reçues, à comparer au total estimé. La carte **« Informations »** donne le fournisseur (cliquable), la destination, le mode, la devise, l'ETA, la date d'envoi et la date de dernière réception. Les **notes internes** se modifient à tout moment (« Enregistrer les notes »).

## Onglet Fournisseurs

### La liste

Recherche par nom, pays ou ville, filtre **Actifs / Inactifs**, et bouton **« + Nouveau fournisseur »**. La table affiche : nom (cliquable), localisation (ville, pays), contact et téléphone, devise, délai typique en jours, nombre de bons de commande et statut.

### Créer et modifier

Le formulaire (création comme édition) demande : **nom** (obligatoire), pays, ville, contact, téléphone, WhatsApp, email, **devise** (trois lettres, ex. AED pour Dubaï) et **délai typique** en jours. Tout est optionnel sauf le nom — mais plus la fiche est complète, plus le picker des bons de commande est parlant.

### La fiche fournisseur

L'en-tête affiche le nom, la pastille Actif/Inactif et deux boutons : **« Modifier »** (même formulaire que la création) et **« Désactiver »** — la désactivation masque le fournisseur des nouveaux flux sans effacer son historique ; **« Réactiver »** fait marche arrière.

Deux cartes chiffrées : le **volume cumulé** (somme des montants estimés de tous les bons hors annulés) et le nombre de **bons récents**. En dessous : les **coordonnées** complètes et les **20 derniers bons de commande** du fournisseur (numéro cliquable, statut, mode, montant, date) — de quoi préparer un appel fournisseur en dix secondes.

## Onglet Mouvements

Le **journal** de tout ce qui a bougé, du plus récent au plus ancien, 50 lignes par page. Colonnes : date et heure (avec le motif éventuel en dessous), type, pièce (cliquable), emplacement, quantité signée, coût unitaire, référence et auteur.

Les quatre types de mouvement :

| Type | Quand il est créé | Signe |
|---|---|---|
| **Réception** | Réception d'un bon de commande (ligne liée à une fiche, avec destination) | + |
| **Sortie commande** | Une commande marketplace est payée et la pièce est suivie en entrepôt | − |
| **Ajustement** | Correction manuelle depuis l'onglet Inventaire | ± |
| **Restitution** | Une commande payée est annulée : le stock est recrédité | + |

Filtres combinables : **type**, **emplacement**, **fiche catalogue** (recherche par nom) et **dates** (« Du » / « Au »). Précision honnête : le filtre par dates s'applique à la page affichée (un bandeau le rappelle) — remontez les pages avec les flèches pour élargir la fenêtre. La colonne **« Référence »** ouvre le bon de commande à l'origine d'une réception, ou indique « Commande » pour les sorties et restitutions marketplace.

## Les automatismes

Une grande partie du stock se tient tout seule. Ce que fait le système, sans intervention :

- **Commande payée → stock décrémenté.** Quand une commande marketplace passe en payée (y compris au comptant à la livraison), la quantité de chaque pièce à quantité suivie est décrémentée ; à zéro, la fiche bascule en « épuisé » sur la marketplace. Si la pièce est aussi suivie dans notre inventaire, une « Sortie commande » est consignée au journal et le niveau de l'entrepôt diminue d'autant.
- **Commande payée annulée → stock restitué.** Symétriquement, l'annulation d'une commande déjà payée recrédite la quantité (mouvement « Restitution ») et la fiche redevient disponible.
- **Seuil franchi → vendeur alerté.** Au moment où une vente fait passer une fiche vendeur sous son seuil (ou à zéro), le vendeur reçoit une alerte WhatsApp — une seule fois par franchissement, pas à chaque vente.
- **Entrée valorisée → coût moyen recalculé.** À chaque entrée assortie d'un coût (ajustement avec coût, réception au prix réel), le coût unitaire moyen pondéré est recalculé : *CUMP = (stock ancien × coût ancien + quantité entrée × coût d'entrée) ÷ stock nouveau*. Exemple : 10 pièces en stock à 25 000 F de coût moyen, réception de 5 pièces à 28 000 F → nouveau coût moyen (10 × 25 000 + 5 × 28 000) ÷ 15 = **26 000 F**. Si le coût était inconnu (stock constitué sans prix), le premier coût saisi devient la base.
- **Réception → compteur marketplace mis à jour.** Réceptionner un bon sur une fiche catalogue crédite le compteur de stock visible des acheteurs ; une fiche dont la quantité n'était pas suivie devient suivie à sa première réception.

Conséquence pratique : **vous ne gérez que les entrées** (ajustements et réceptions) — les sorties liées aux ventes sont automatiques.

## Les pastilles de stock sur la page Pièces

La page catalogue de l'administration (**Administration → Pièces**) affiche désormais une colonne **« Stock »** entre la commission et le statut de publication :

- **« Stock : N »** — quantité suivie, en vert ; passe en **orange** quand N est au seuil ou en dessous, en **rouge** à zéro.
- **« Non suivi »** — le vendeur gère sa disponibilité à la main, aucun compteur n'est tenu.

Un filtre dédié (« Tout le stock », « Rupture », « Stock bas », « Stock OK », « Non suivi ») permet d'isoler les fiches à problème ; il s'applique à la page affichée — combinez-le avec la recherche pour cibler une référence précise.

## Scénarios pratiques

### Mettre le module en service (une fois)

1. Onglet **Inventaire** : créez l'emplacement par défaut (ex. « Entrepôt Treichville », type Entrepôt).
2. Pour chaque pièce en stock : **« Ajuster ± »** avec la quantité physique constatée **et le coût d'achat**, motif « stock initial ». Le coût moyen et la valeur du stock se construisent ainsi.
3. Créez vos fournisseurs habituels dans l'onglet **Fournisseurs**.

### Passer et réceptionner un bon d'import (chaque semaine)

1. Onglet **Achats** → **« + Nouveau bon de commande »** : fournisseur, mode (ex. Aérien standard), destination, lignes avec poids.
2. Vérifiez l'encadré coût rendu — c'est votre prix de revient réel. Ajustez le mode si le total dépasse la marge visée.
3. **« Créer le bon (brouillon) »**, vérifiez la fiche, puis **« Envoyer au fournisseur »** : l'ETA se calcule.
4. À l'arrivée physique : **« Marquer en transit »** si ce n'est fait, puis réceptionnez **chaque ligne dès son arrivée** avec le prix réel facturé. Clôturez la réception quand le reliquat est soldé.

### Traiter les alertes du matin (5 minutes)

1. Onglet **Inventaire** : compteurs **Ruptures** et **Stock bas** — filtrez la table par statut pour agir (réappro via un BC ou appel fournisseur).
2. Section **Alertes vendeurs** : pour chaque fiche, appelez le vendeur (réassort ?) ou planifiez un sourcing interne.
3. Onglet **Mouvements** : parcourez les ajustements de la veille — tout retrait doit avoir un motif explicite.

## Bonnes pratiques

- **Toujours un motif d'ajustement.** C'est la seule explication qui restera dans le journal dans trois mois.
- **Réceptionnez dès l'arrivée physique**, pas en fin de semaine : le stock marketplace et le coût moyen ne sont justes qu'à cette condition.
- **Renseignez le seuil bas** de chaque référence : c'est lui qui déclenche le statut « Stock bas » et donc votre réappro avant la rupture.
- **Poids systématique sur les lignes d'import** : sans poids, l'estimation de fret est fausse et le coût rendu aussi.
- **Créez le fournisseur avant le bon** : le formulaire de BC ne trouve que les fournisseurs existants.
- **Une destination par bon** : sans destination, rien n'entre en stock à la réception — réservez « Aucune » aux achats hors stock assumés.
- **Prix réel à la réception** si la facture diffère du bon : c'est lui qui fixe le coût moyen et le montant réel du BC.

## Limites connues

- **Filtres côté écran** : le filtre par dates du journal des mouvements et le filtre de statut stock de la page Pièces s'appliquent à la page affichée, pas à toute la base — paginez pour élargir.
- **Saisie en FCFA uniquement** sur les bons de commande : convertissez au taux du jour avant de saisir les prix ; la devise du fournisseur est indicative.
- **Stock vendeur hors entrepôt** : les mouvements automatiques (sortie commande, restitution) ne sont tracés dans le journal que si la pièce est aussi suivie sur un emplacement ; sinon, seul le compteur marketplace bouge.
- **Seuil et coût moyen** ne se modifient pas depuis l'écran d'ajustement : le seuil se règle via l'API du module, et le coût moyen ne se corrige que par une entrée valorisée.
- **Alertes vendeurs** : les 10 premières sont affichées, le total est indiqué en dessous.

---

Pièces.ci — Marketplace pièces auto · Abidjan, Côte d'Ivoire · Document interne, équipe Pièces

_Manuel ERP Stock, achats &amp; fournisseurs v1.0 — août 2026. Décrit le module « Stock &amp; achats » de l'espace Administration (inventaire, achats, fournisseurs, mouvements) tel que déployé. Pour toute évolution de l'outil, mettre à jour ce document dans `docs/`._
