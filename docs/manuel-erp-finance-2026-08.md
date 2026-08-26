<p class="eyebrow">Document interne</p>

# ERP Finance — Manuel d'utilisation

<p class="deck">Le module « Finance » de l'équipe Pièces : cockpit comptable en lecture seule — chiffre d'affaires, commissions, séquestre — avec ventilation mensuelle, agrégation par vendeur et exports CSV prêts pour Excel, accessible depuis l'espace Administration.</p>

<div class="callout">
<p class="lead">Chaque franc qui transite par la marketplace doit pouvoir être <strong>retrouvé, expliqué et exporté</strong> : le chiffre d'affaires du mois, la part de la plateforme, et l'argent séquestré en attente de livraison.</p>
<p>Ce manuel explique comment lire le cockpit, analyser l'activité par vendeur et produire les exports mensuels pour la comptabilité.</p>
</div>

## À quoi sert le module

Le module « Finance » est le **cockpit comptable** de la marketplace. Il est strictement en **lecture seule** : il ne crée ni ne modifie aucune donnée, il se contente d'agréger ce qui existe déjà (commandes, commissions, transactions séquestre). Il répond à trois besoins :

- **Piloter le mois en cours** : chiffre d'affaires (GMV), commissions plateforme, nombre de commandes, panier moyen — avec la variation par rapport au mois précédent.
- **Surveiller les reliquats de séquestre** : combien reste bloqué (mécanisme hérité, voir l'encadré ci-dessous) et combien a été libéré aux vendeurs sur la période.
- **Nourrir la comptabilité** : exports CSV mensuels — commandes, commissions par vendeur, mouvements de séquestre — directement ouvrables dans Excel.

Repères de lecture, valables dans tout le module :

- **Seules les commandes terminées comptent.** Une commande en cours, annulée ou remboursée n'entre ni dans le chiffre d'affaires ni dans les commissions. La période d'une commande est sa **date de création** (bornes UTC, comme le cockpit de la page d'accueil de l'administration).
- **Le chiffre d'affaires (GMV)** est la somme des montants totaux payés par les clients — ce n'est **pas** un revenu : le revenu de Pièces est la ligne **Commissions**.
- **Le séquestre bloqué est un instantané** : il ne dépend pas de la période choisie (voir « Limites connues »).

> **Le séquestre est en retrait.** Le modèle de paiement de Pièces est désormais le **paiement direct** : l'acheteur règle en ligne à la commande ou au livreur à la remise, aucun fonds n'est bloqué, et le vendeur est payé immédiatement à l'encaissement. Les cartes « Escrow bloqué » et la colonne « Escrow en cours » décrivent un mécanisme hérité que l'écran affiche encore. **Sous le paiement direct, ces montants doivent tendre vers zéro** : tout solde non nul est un reliquat de commandes anciennes, ou le signe qu'une commande a été encaissée sans être versée. C'est à lire comme une anomalie à résorber, plus comme un indicateur normal d'activité.


**Accès.** Espace **Administration** → entrée **« Finance »** dans la barre latérale. Le module est réservé aux membres de l'équipe Pièces habilités Administration. Il s'organise en trois onglets : **Vue d'ensemble**, **Vendeurs** et **Exports**.

## Onglet Vue d'ensemble

La page d'accueil du module donne la santé financière du mois en un coup d'œil.

### Choisir la période

Le sélecteur en haut de page liste les douze derniers mois (« août 2026 », « juillet 2026 »…). Tout l'onglet — cartes et libellés — se recalcule pour la période choisie. Par défaut, le mois en cours est affiché.

### Les huit cartes

- **GMV** — chiffre d'affaires de la période (somme des commandes terminées), avec la **variation vs mois précédent** en dessous (« +20 % » en vert, « −8 % » en rouge). Un tiret « — » signifie que le mois précédent était à zéro : pas de point de comparaison, jamais de « +∞ % » trompeur.
- **Commissions plateforme** — le revenu réel de Pièces sur la période (somme des commissions prélevées sur chaque article vendu), avec sa variation vs mois précédent.
- **Commandes terminées** — nombre de commandes clôturées sur la période.
- **Panier moyen** — GMV ÷ nombre de commandes. Zéro s'il n'y a aucune commande.
- **Frais de livraison** — total des frais de livraison facturés sur la période.
- **Main-d'œuvre** — total des prestations de montage/main-d'œuvre facturées sur la période.
- **Escrow bloqué** — argent encore séquestré (commandes payées, pas encore versées aux vendeurs). **Instantané** : cette carte ne change pas avec la période. Sous le paiement direct, elle doit tendre vers zéro.
- **Escrow libéré** — montants libérés aux vendeurs **pendant la période** (à leur date de libération).

### La table des douze derniers mois

Sous les cartes, la ventilation mensuelle : une ligne par mois (le plus ancien en haut), avec le GMV, les commissions, le nombre de commandes et la **variation du GMV** d'un mois sur l'autre (colorée : vert si le mois progresse, rouge s'il recule, tiret gris sinon). C'est le moyen le plus rapide de repérer la tendance : trois mois consécutifs en rouge sur le GMV appellent une explication.

## Onglet Vendeurs

L'onglet Vendeurs répond à la question : **qui a généré quoi sur la période ?**

### Lire la table

Choisissez la période avec le sélecteur. La table agrège les commandes terminées de la période **par vendeur**, triée par **commissions décroissantes** — vos meilleurs contributeurs de revenu sont en haut. Colonnes :

- **Vendeur** — nom de la boutique. La mention **« (supprimé) »** signale un vendeur dont la fiche n'existe plus (ses ventes historiques restent comptabilisées).
- **Téléphone** — contact principal de la boutique, pour une relance directe.
- **Commandes** — nombre de commandes distinctes contenant au moins un article du vendeur (plusieurs articles dans une même commande comptent pour une).
- **GMV** — somme des prix des articles du vendeur vendus sur la période.
- **Commissions** — la part prélevée par la plateforme sur ces ventes.
- **Escrow en cours** — argent actuellement séquestré sur les commandes de ce vendeur (instantané, toutes périodes confondues).

La pagination (flèches **←** / **→** en bas de page) avance par pages de 20 vendeurs.

### Usage typique

- **Classement du mois** : qui sont les dix vendeurs qui font le chiffre ? Croisez avec l'onglet CRM pour planifier les visites.
- **Vendeur en difficulté** : un gros vendeur dont les commissions s'effondrent d'un mois sur l'autre mérite un appel — rupture de stock ? concurrent ? La colonne téléphone est là pour ça.
- **Séquestre concentré** : une forte colonne « Escrow en cours » chez un seul vendeur signifie des commandes encaissées et non versées — vérifiez qu'il expédie, et que le versement immédiat a bien eu lieu.

## Onglet Exports

L'onglet Exports produit les fichiers pour la comptabilité et les analyses externes.

### Exporter, pas à pas

1. Choisissez la **période** dans le sélecteur (douze derniers mois).
2. Cliquez **« Télécharger le CSV »** sur la carte voulue. Le fichier se télécharge aussitôt, nommé avec la période (ex. `commandes-2026-08.csv`).
3. Ouvrez-le dans Excel (voir « Les exports CSV » ci-dessous).

Les trois exports disponibles :

- **Commandes** — une ligne par commande terminée de la période : date, n° de commande, client, vendeur(s), montant, livraison, main-d'œuvre, commission plateforme et statut séquestre. C'est le **journal des ventes** du mois.
- **Commissions par vendeur** — l'agrégat de l'onglet Vendeur, toutes lignes (sans pagination) : vendeur, téléphone, commandes, GMV, commissions, trié par commissions décroissantes. C'est la pièce justificative du revenu plateforme.
- **Mouvements escrow** — toutes les transactions séquestre **touchées par la période** (bloquées, libérées ou remboursées durant le mois) : date de blocage, commande, montant, statut, dates de libération et de remboursement. C'est le suivi de l'argent des clients que nous détenons.

## Les exports CSV

Les fichiers sont pensés pour **Excel en français** — aucun réglage n'est nécessaire à l'ouverture :

- **Encodage UTF-8 avec BOM** : les accents (« Commissions », « Téléphone ») s'affichent correctement ; sans ce marqueur, Excel lirait le fichier en latin-1 et les déformerait.
- **Séparateur « ; »** : chaque colonne tombe dans sa cellule à l'ouverture (pas d'« Assistant d'importation »).
- **Montants en FCFA entiers**, sans devise ni espace : directement sommables dans Excel.
- **Dates au format AAAA-MM-JJ** (ex. `2026-08-03`) : triables et reconnues par Excel.
- **Cellules protégées** : un nom contenant « ; », des guillemets ou un retour à la ligne est automatiquement entouré de guillemets (doublés si nécessaire) — le fichier reste valide quoi qu'il arrive.

## Scénarios pratiques

### La clôture du mois (15 minutes, le 1er du mois)

1. Onglet **Vue d'ensemble** → sélectionnez le mois écoulé : notez le GMV, les commissions et leur variation vs mois précédent.
2. Onglet **Exports**, même période : téléchargez les trois CSV.
3. Transmettez `commandes-AAAA-MM.csv` (journal des ventes) et `commissions-AAAA-MM.csv` (justificatif du revenu) à la comptabilité ; conservez `escrow-AAAA-MM.csv` pour le suivi du séquestre.

### Préparer le point hebdomadaire (5 minutes)

1. Onglet **Vue d'ensemble**, mois en cours : GMV et commissions vs mois précédent — la tendance est-elle tenue ?
2. Table des 12 mois : confirmez qu'aucun mois récent ne décroche.
3. Carte **Escrow bloqué** : si le montant gonfle de semaine en semaine, des commandes payées ne se livrent pas — creusez dans l'onglet Vendeurs (colonne « Escrow en cours ») pour identifier chez qui.

### Analyser un vendeur avant un rendez-vous

1. Onglet **Vendeurs**, mois en cours : retrouvez la boutique (classement par commissions).
2. Comparez mentalement sa position au mois précédent (changez de période) : en progression, stable, en baisse ?
3. Notez son « Escrow en cours » : élevé = beaucoup de livraisons en attente.

## Bonnes pratiques

- **Lisez le GMV avec sa variation, jamais seul.** 1,2 M F sans contexte ne dit rien ; « +20 % vs juillet » dit tout.
- **Un tiret « — » n'est pas un bug** : il signale un mois de comparaison à zéro (démarrage d'activité, mois creux) — la variation est tout simplement incalculable.
- **Exportez en début de mois**, une fois les commandes du mois écoulé stabilisées : une commande créée le 31 août et terminée le 2 septembre compte pour **août** (date de création).
- **Ne confondez jamais GMV et revenu** dans vos présentations : le revenu de Pièces est la ligne **Commissions** — le GMV est l'argent des vendeurs et des prestations qui transite.
- **Surveillez le séquestre comme une dette à éteindre** : sous le paiement direct, l'« Escrow bloqué » ne devrait plus se remplir. Ce qui y reste est dû — au client si la pièce n'a pas été remise, au vendeur si elle l'a été.

## Limites connues

- **Module 100 % lecture seule** : aucune écriture comptable — pas de saisie, pas de journal d'écritures, pas d'export vers un logiciel comptable. Les corrections se font dans les modules métier (commandes, vendeurs), jamais ici.
- **Escrow bloqué = instantané** : la carte et la colonne « en cours » affichent le séquestre **au moment où vous regardez**, indépendamment de la période choisie. Seul l'« Escrow libéré » (et l'export des mouvements) est daté sur la période.
- **Commandes terminées uniquement** : les ventes en cours n'apparaissent nulle part dans le module — le cockpit ne préjuge pas d'une commande qui pourrait encore s'annuler.
- **Agrégation par date de création** : une commande créée en juillet et terminée en août est comptabilisée en **juillet** (même règle que le cockpit d'accueil de l'administration).
- **Onglet Vendeurs paginé** (20 lignes par page) : pour la liste complète, utilisez l'export « Commissions par vendeur », qui contient toutes les lignes.
- **Pas de rapprochement de paiement** : le module agrège les montants commandés, il ne vérifie ni les encaissements CinetPay ni les versements aux vendeurs.

---

Pièces.ci — Marketplace pièces auto · Abidjan, Côte d'Ivoire · Document interne, équipe Pièces

_Manuel ERP Finance v1.0 — août 2026. Décrit le module « Finance » de l'espace Administration (vue d'ensemble, vendeurs, exports) tel que déployé. Pour toute évolution de l'outil, mettre à jour ce document dans `docs/`._
