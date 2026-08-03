<p class="eyebrow">Document interne</p>

# Sourcing & Expéditions — Manuel d'utilisation

<p class="deck">Les modules « Sourcing » et « Expéditions » de l'espace Administration : à partir d'une demande de cotation, lancer une recherche automatique d'offres sur les sites de vente internationaux, comparer chaque offre au coût réel rendu Abidjan (immobilisation du véhicule comprise), générer le bon de commande, puis suivre l'expédition jusqu'à la livraison — le client voyant l'avancement sur sa page de suivi.</p>

<div class="callout">
<p class="lead">L'offre la moins chère à l'achat est presque toujours <strong>la plus chère au total</strong> : un véhicule immobilisé coûte 23 000 à 38 000 F par jour à sa flotte. Une pièce à 20 000 F livrée en 45 jours coûte plus d'un million de francs de manque à gagner.</p>
<p>Ce manuel explique comment lancer une recherche, lire la matrice d'arbitrage, confirmer un prix, commander, puis suivre l'acheminement.</p>
</div>

## À quoi servent ces modules

Jusqu'ici, chercher une pièce rare à l'étranger se faisait entièrement à la main : ouvrir dix onglets, noter les prix dans un carnet, convertir les devises de tête, écrire aux vendeurs un par un, puis suivre le colis par WhatsApp. Rien n'était dans le système, rien n'était comparable, rien n'était retrouvable.

Les deux modules couvrent la chaîne complète :

- **Sourcing** — un assistant cherche pour vous des offres achetables sur les marketplaces internationales, chez les distributeurs régionaux et les exportateurs, puis les classe par **coût total rendu Abidjan**. Vous retenez, vous écartez, vous commandez.
- **Expéditions** — une fois la commande passée, vous suivez le colis étape par étape ; le demandeur voit l'avancement sur sa page de suivi, sans que vous ayez à le prévenir manuellement à chaque étape.

**Accès.** Espace **Administration** → entrées **« Sourcing »** et **« Expéditions »** dans la barre latérale. Réservés aux membres de l'équipe Pièces habilités Administration.

<div class="callout">
<p class="lead">Les prix rapportés par la recherche sont <strong>indicatifs jusqu'à confirmation</strong>.</p>
<p>Un prix relevé sur une page web peut être périmé, hors taxes, ou ne pas inclure le port. Tant qu'un opérateur ne l'a pas vérifié auprès du vendeur, l'offre porte la pastille <strong>« À confirmer »</strong> et la matrice signale que son classement est indicatif. Ne communiquez jamais un montant non confirmé à un client comme un devis.</p>
</div>

## Lancer une recherche

Une recherche part **toujours d'une demande de cotation** (module « Cotations logistique »), pour que les offres restent rattachées à un besoin client réel.

1. Ouvrez la demande dans **Cotations logistique**.
2. Descendez au bloc **« Sourcing »**.
3. Cliquez **« Rechercher des offres »**.

C'est tout : la pièce, la référence OEM, le véhicule et la quantité sont repris automatiquement de la demande.

La recherche prend **30 à 90 secondes**. Elle tourne en arrière-plan : vous pouvez fermer la page, aller traiter une autre demande, revenir plus tard. Le bloc se rafraîchit tout seul et affiche la pastille d'état :

| Pastille | Signification |
|---|---|
| **En attente** | La recherche est dans la file, elle va démarrer |
| **Recherche en cours** | L'assistant explore les sites de vente |
| **Terminée** | Les offres sont disponibles — cliquez pour les voir |
| **Échec** | Rien n'a pu être trouvé, la raison est affichée sous la pastille |

**Une seule recherche à la fois par demande.** Si vous cliquez pendant qu'une recherche tourne, la plateforme refuse : *« Une recherche est déjà en cours pour cette demande »*. C'est voulu — chaque recherche a un coût, et relancer ne donnerait pas de meilleurs résultats.

## L'écran Sourcing

L'entrée **« Sourcing »** de la barre latérale liste toutes les recherches, la plus récente en haut.

### Les quatre cartes

- **Recherches** — nombre total de recherches lancées.
- **En cours** — recherches en attente ou en train de tourner.
- **Offres trouvées** — nombre total d'offres remontées, toutes recherches confondues.
- **Offres avec prix** — parmi elles, combien portent un prix. Le complément (« *N* à chiffrer auprès du vendeur ») est votre file de travail : ce sont les offres où il faut décrocher le téléphone.

### La table

Une ligne par recherche : pièce (cliquable, ouvre le détail), véhicule, référence de la cotation d'origine (cliquable aussi), pastille d'état, nombre d'offres, date de lancement. Les filtres en haut portent sur l'état et sur le texte (pièce, référence OEM, modèle).

## La fiche d'une recherche

C'est l'écran de travail. Il contient deux tableaux : les **offres trouvées**, puis la **matrice d'arbitrage**.

### Le tableau des offres

Une ligne par offre, avec :

- **Fournisseur** — son nom, son canal (marketplace internationale, distributeur régional, exportateur, fabricant, vendeur local), son pays, et le lien vers l'annonce d'origine. **Ouvrez toujours le lien** avant de retenir une offre : c'est votre seule vérification que la pièce correspond vraiment.
- **Condition** — Neuf, Occasion importée ou Ré-usiné, en pastille colorée. Quand le libellé de la source ne correspond à aucune de ces trois catégories, il est affiché tel quel en gris : ne devinez pas à la place du vendeur.
- **Prix unitaire** — le montant converti en FCFA, et en dessous le prix d'origine dans sa devise. La pastille **« À confirmer »** reste tant que le prix n'a pas été vérifié. Quand la page ne montrait aucun prix, la colonne affiche **« Prix à obtenir »**.
- **Délai** — le délai de préparation annoncé par le vendeur, quand il est indiqué.
- **Mode** — l'acheminement retenu pour le calcul. Laissé sur **« Auto »**, la plateforme décide (voir plus bas). Vous pouvez forcer un mode : votre choix prime toujours.
- **Statut** — Candidate, Retenue, Contactée, Écartée ou Commandée.

### Les quatre actions

- **Retenir** — met l'offre dans la liste courte. Dès qu'au moins une offre est retenue, **la matrice ne compare plus que les offres retenues** : c'est ainsi qu'on passe de quinze pistes à trois vraies options.
- **Écarter** — sort l'offre de la comparaison (mauvaise référence, vendeur douteux, pièce incompatible).
- **Message** — rédige un **brouillon** de message d'enquête au fournisseur, en français ou en anglais selon son pays, demandant disponibilité, prix ferme, MOQ, délai, poids et modalités d'expédition vers Abidjan. Le brouillon s'affiche dans un encadré avec trois boutons : **Copier**, **Ouvrir WhatsApp**, **Ouvrir l'e-mail**. **Rien n'est envoyé automatiquement** — vous relisez, vous adaptez, vous envoyez.
- **Créer le BC** — transforme l'offre en bon de commande (voir plus bas). Le bouton est désactivé tant que l'offre n'a pas de prix.

### Confirmer un prix

C'est l'étape qui fait toute la différence entre une piste et une décision.

Appelez ou écrivez au fournisseur, obtenez le prix ferme, puis **corrigez le prix directement sur l'offre**. La plateforme recalcule la conversion en FCFA et retire la pastille « À confirmer » : un prix corrigé à la main est, par définition, un prix vérifié.

## La matrice d'arbitrage

C'est le cœur du module. Elle répond à une seule question : **quelle offre coûte réellement le moins cher, tout compris ?**

Chaque ligne détaille les postes, jamais un total nu :

| Colonne | Ce qu'elle contient |
|---|---|
| **Pièce** | Prix de la pièce × quantité demandée |
| **Fret** | Transport selon le mode, sur le poids taxable |
| **Douane** | Droits estimés sur la valeur pièce + fret (import uniquement) |
| **Livraison** | Acheminement final dans Abidjan |
| **Immobilisation** | Délai total × coût journalier du véhicule — **le poste que personne ne chiffre** |
| **Coût total** | La somme, et le surcoût par rapport à la meilleure option |

La ligne la moins chère porte la pastille **« Recommandé »**. Les autres affichent leur surcoût en rouge.

**Le délai total** additionne la préparation annoncée par le vendeur et l'acheminement du mode. Un vendeur qui annonce 3 jours de préparation avec un aérien standard (5 jours) donne 8 jours d'immobilisation, pas 5.

### Pourquoi le maritime perd presque toujours

Un exemple réel, sur un véhicule premium thermique (30 000 F d'immobilisation par jour) :

| | Maritime groupé | Aérien standard |
|---|---|---|
| Prix de la pièce | 20 000 F | 120 000 F |
| Fret + douane + livraison | ≈ 60 000 F | ≈ 90 000 F |
| Délai | 45 jours | 5 jours |
| **Immobilisation** | **1 350 000 F** | **150 000 F** |
| **Coût total** | **≈ 1 430 000 F** | **≈ 360 000 F** |

La pièce « six fois moins chère » revient **quatre fois plus cher**. C'est exactement ce que la matrice montre au client, poste par poste — et c'est l'argument commercial de Pièces.

Le maritime redevient pertinent quand le véhicule **n'est pas immobilisé** (pièce de stock, entretien planifié) ou pour des colis volumineux qui ne peuvent pas voler.

### Comment le mode d'acheminement est choisi

Quand la colonne « Mode » est sur **Auto**, les règles s'appliquent dans cet ordre :

1. **Le mode que vous avez forcé gagne toujours.**
2. **Vendeur en Côte d'Ivoire** → achat local : ni fret, ni douane d'import.
3. **Matière restreinte en fret aérien** (batteries, amortisseurs à gaz, composants haute tension d'électrique) → maritime : l'aérien est interdit ou fortement encadré, le chiffrer serait mentir.
4. **Colis volumineux** (plus de 80 kg ou 150 dm³ estimés) → maritime : l'aérien y devient absurde bien avant que le calcul ne le dise.
5. **Sinon** → aérien standard.

Si vous connaissez mieux le dossier que la règle — un transitaire qui consolide, un vendeur qui expédie déjà par DHL — forcez le mode. C'est fait pour.

## Créer le bon de commande

Sur l'offre retenue, cliquez **« Créer le BC »**. La plateforme :

- **retrouve ou crée le fournisseur** dans « Stock, achats & fournisseurs » (avec son pays, ses coordonnées et sa devise habituelle) ;
- **génère le bon de commande** avec le numéro `BC-…`, la devise de l'offre, le taux de change appliqué, le mode d'acheminement retenu et les frais estimés ;
- **passe l'offre en « Commandée »** et la relie définitivement au bon.

Le bouton **« Voir le BC »** apparaît alors sur la ligne. La suite se passe dans le module Stock : réception, mouvements de stock, coût moyen pondéré.

**Deux garde-fous** : impossible de commander une offre sans prix, impossible de créer deux bons de commande sur la même offre.

## Suivre une expédition

### Créer l'expédition

Depuis la fiche du bon de commande (**Stock, achats & fournisseurs** → **Achats**), bloc **« Expédition »** → **« Créer une expédition »**. Choisissez le transporteur, saisissez le numéro de suivi s'il est déjà connu (il est ajoutable plus tard).

<div class="callout">
<p class="lead">Le lien de suivi client n'est affiché <strong>qu'une seule fois</strong>, à la création.</p>
<p>Copiez-le immédiatement et envoyez-le au demandeur. Il n'est jamais réaffiché : la plateforme n'en conserve qu'une empreinte chiffrée, exactement comme un mot de passe. Si le lien est perdu, il faut recréer une expédition.</p>
</div>

Pour DHL, FedEx et UPS, le **lien de suivi transporteur est construit automatiquement** à partir du numéro : un clic ouvre le suivi officiel.

### Faire avancer les étapes

L'écran **« Expéditions »** liste tous les envois avec leur étape, leur transporteur, leur bon de commande et leur coût logistique. Sur la fiche d'une expédition, le panneau **« Faire avancer »** enregistre chaque étape : choisissez la nouvelle étape, ajoutez le lieu et une note, validez.

Les étapes, dans l'ordre :

| Étape | Signification |
|---|---|
| **Recherche fournisseur** | Expédition créée, pièce pas encore récupérée |
| **Pièce collectée** | Le colis est parti de chez le fournisseur |
| **En transit** | En cours d'acheminement vers Abidjan |
| **Dédouanement** | Arrivée, en cours de formalités douanières |
| **Livraison Abidjan** | Dédouanée, en cours de livraison finale |
| **Livrée** | Remise au demandeur |
| **Annulée** | Envoi abandonné |

**On ne revient jamais en arrière.** Un client qui voit son suivi reculer perd confiance : la plateforme refuse toute transition régressive. Sauter une étape en avant est en revanche autorisé (un envoi DHL peut être dédouané et livré le même jour). L'annulation reste possible tant que rien n'est livré.

**Le bon de commande suit automatiquement** : quand l'expédition passe « En transit », le bon passe en « En transit ». En revanche, la livraison **ne déclenche pas** la réception en stock : celle-ci reste une action explicite de l'écran Achats, parce qu'elle crée des mouvements de stock et recalcule les coûts.

### Prévenir le demandeur

Le bouton **« Envoyer le message »** envoie au demandeur, par WhatsApp, l'étape en cours et l'arrivée estimée. **C'est une action volontaire** : rien ne part automatiquement à chaque transition, parce que toutes les étapes ne méritent pas un message.

### Les coûts

La fiche détaille le coût logistique poste par poste — fret, douane, livraison Abidjan, total — et jamais un total nu. Le **poids taxable** est calculé selon le mode : en aérien, le transporteur facture le maximum entre le poids réel et le volume converti (1 m³ = 167 kg) ; en maritime groupé, 1 m³ = 1 tonne.

## Ce que voit le client

Le demandeur ouvre sa page de suivi avec la référence de sa cotation et son lien personnel. Dès qu'une expédition est rattachée à sa demande, il y voit un bloc **« Acheminement »** : l'étape en cours, l'arrivée estimée, et la frise des étapes franchies avec leurs dates et lieux.

<div class="callout">
<p class="lead">Le partenaire transitaire n'est <strong>jamais nommé</strong> côté client.</p>
<p>Pièces est l'opérateur de bout en bout ; l'exécution est sous-traitée, c'est notre affaire. Seuls DHL, FedEx et UPS sont nommés, parce que le client a besoin de leur numéro de suivi. Pour tout le reste, la page affiche « Notre partenaire logistique ». Cette règle est appliquée par la plateforme, vous n'avez rien à surveiller.</p>
</div>

Le client ne voit ni les coûts internes, ni les notes de l'équipe, ni les offres écartées.

## Scénarios pratiques

### Pièce rare pour un véhicule immobilisé

1. La demande arrive avec la mention **« Véhicule immobilisé »** — elle est prioritaire, chaque jour coûte 23 000 à 38 000 F au client.
2. Lancez la recherche, attendez une minute.
3. Retenez 2 ou 3 offres crédibles (référence OEM identique, vendeur avec un historique).
4. Appelez-les, obtenez les prix fermes, corrigez-les sur les offres.
5. Lisez la matrice : montrez au client le coût total, pas le prix de la pièce. Sur un véhicule immobilisé, l'aérien express gagne souvent malgré son prix.
6. Créez le BC, créez l'expédition, envoyez le lien de suivi.

### Aucune offre avec prix

Les marketplaces masquent souvent les prix aux visiteurs. C'est normal, et ce n'est pas un échec :

1. Repérez les offres dont la référence correspond exactement.
2. Utilisez **« Message »** pour chacune : le brouillon demande déjà tout ce qu'il faut.
3. Envoyez par WhatsApp ou e-mail, notez les réponses en corrigeant les prix sur les offres.
4. La matrice devient exploitable dès le premier prix confirmé.

### Réapprovisionnement planifié, véhicule non immobilisé

Quand le véhicule roule, l'immobilisation ne s'applique pas de la même façon : le maritime groupé redevient compétitif. Forcez **« Maritime groupé »** sur les offres concernées et comparez — c'est le seul cas où l'économie à l'achat se retrouve vraiment au total.

## Bonnes pratiques

- **Ouvrez toujours le lien de l'annonce** avant de retenir une offre. L'assistant rapporte ce qu'il lit ; il ne garantit pas que la pièce est la bonne.
- **Ne communiquez jamais un prix « À confirmer »** au client comme un devis. Confirmez d'abord.
- **Retenez avant d'arbitrer.** Une matrice à quinze lignes n'aide personne ; à trois lignes, elle décide.
- **Une recherche par demande.** Si les résultats sont mauvais, le problème est en amont : précisez la référence OEM ou le modèle du véhicule sur la cotation.
- **Copiez le lien de suivi tout de suite** après avoir créé l'expédition. Il ne sera pas réaffiché.
- **Renseignez le poids réel** dès que le transporteur le communique : le poids taxable, donc le coût, en dépend entièrement.
- **Prévenez le client aux étapes qui comptent** (départ, dédouanement, livraison), pas à chacune.

## Limites connues

- **Prix indicatifs par nature.** L'assistant lit des pages web publiques ; les prix peuvent être périmés, hors taxes, ou hors port. La confirmation ops n'est pas une formalité, c'est le cœur du métier.
- **Grille de fret et taux de douane à calibrer.** Les tarifs d'acheminement et le taux de douane de 20 % sont des ordres de grandeur de cadrage. Le total affiché n'est juste que si la grille l'est : **elle doit être obtenue du partenaire transitaire avant tout usage client** de ces montants.
- **Taux de change figés.** Les taux de conversion sont des constantes (seul l'euro est fixe, par parité). Ils sont modifiables par l'équipe technique sans redéploiement, mais **personne ne les met à jour automatiquement** : à surveiller, sinon les montants en FCFA dérivent silencieusement. Le taux appliqué à un bon de commande reste corrigeable à la main.
- **Pas d'intégration transporteur.** Les étapes sont saisies par l'équipe. Les liens DHL/FedEx/UPS sont construits automatiquement, mais aucune API ne remonte les événements.
- **Pas de relance automatique.** Une recherche en échec n'est pas retentée : c'est volontaire, un retry consommerait des recherches facturées sur une requête déjà connue pour échouer, et créerait des offres en double.
- **Pas de message automatique au client.** Chaque notification est une action volontaire de l'équipe.
- **Recherche liée à une demande.** Il n'est pas prévu de lancer une recherche exploratoire sans besoin client rattaché.

---

Pièces.ci — Marketplace pièces auto · Abidjan, Côte d'Ivoire · Document interne, équipe Pièces

_Manuel Sourcing & Expéditions v1.0 — août 2026. Décrit les modules « Sourcing » et « Expéditions » de l'espace Administration tels que déployés. Spécification d'origine : `docs/sourcing-expeditions-plan-2026-08.md`. Pour toute évolution de l'outil, mettre à jour ce document dans `docs/`._
