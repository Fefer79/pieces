<p class="eyebrow">Document interne</p>

# Sourcing & Expéditions — Manuel d'utilisation

<p class="deck">Les modules « Sourcing » et « Expéditions » de l'espace Administration : à partir d'une demande de cotation, ouvrir un dossier, y saisir les offres relevées sur les sites de vente, comparer chacune au coût réel rendu Abidjan (immobilisation du véhicule comprise), générer le bon de commande, puis suivre l'expédition jusqu'à la livraison — le client voyant l'avancement sur sa page de suivi.</p>

<div class="callout">
<p class="lead">L'offre la moins chère à l'achat est presque toujours <strong>la plus chère au total</strong> : un véhicule immobilisé coûte 23 000 à 38 000 F par jour à sa flotte. Une pièce à 20 000 F livrée en 45 jours coûte plus d'un million de francs de manque à gagner.</p>
<p>Ce manuel explique comment ouvrir un dossier, y saisir les offres relevées, lire la matrice d'arbitrage, confirmer un prix, commander, puis suivre l'acheminement.</p>
</div>

## À quoi servent ces modules

Jusqu'ici, chercher une pièce rare à l'étranger se faisait entièrement à la main : ouvrir dix onglets, noter les prix dans un carnet, convertir les devises de tête, écrire aux vendeurs un par un, puis suivre le colis par WhatsApp. Rien n'était dans le système, rien n'était comparable, rien n'était retrouvable.

Les deux modules couvrent la chaîne complète :

- **Sourcing** — vous ouvrez un dossier par pièce à chercher, vous y saisissez chaque offre que vous relevez (le lien, le prix, le délai), et la plateforme les classe par **coût total rendu Abidjan**. Vous retenez, vous écartez, vous commandez.
- **Expéditions** — une fois la commande passée, vous suivez le colis étape par étape ; le demandeur voit l'avancement sur sa page de suivi, sans que vous ayez à le prévenir manuellement à chaque étape.

<div class="callout">
<p class="lead">La <strong>saisie manuelle est le mode standard</strong>.</p>
<p>C'est vous qui cherchez, sur les sites que vous connaissez, avec le jugement que l'outil n'a pas. Le module ne remplace pas ce travail : il le capitalise, le rend comparable et le garde. Une recherche automatique par assistant existe en complément, mais elle n'est pas le chemin normal — voir la dernière section.</p>
</div>

**Accès.** Espace **Administration** → entrées **« Sourcing »** et **« Expéditions »** dans la barre latérale. Réservés aux membres de l'équipe Pièces habilités Administration.

<div class="callout">
<p class="lead">Un prix relevé sur une page reste <strong>indicatif jusqu'à confirmation</strong>.</p>
<p>Un prix relevé sur une page web peut être périmé, hors taxes, ou ne pas inclure le port. Tant qu'un opérateur ne l'a pas vérifié auprès du vendeur, l'offre porte la pastille <strong>« À confirmer »</strong> et la matrice signale que son classement est indicatif. Ne communiquez jamais un montant non confirmé à un client comme un devis.</p>
</div>

## Ouvrir un dossier

Un dossier part **toujours d'une demande de cotation** (module « Cotations logistique »), pour que les offres restent rattachées à un besoin client réel.

1. Ouvrez la demande dans **Cotations logistique**.
2. Descendez au bloc **« Sourcing »**.
3. Cliquez **« Ouvrir un dossier de sourcing »**.

C'est tout : la pièce, la référence OEM, le véhicule et la quantité sont repris automatiquement de la demande, et vous arrivez directement sur le dossier, prêt à recevoir les offres.

Rien ne tourne en arrière-plan, il n'y a rien à attendre. Vous pouvez ouvrir plusieurs dossiers sur une même demande si vous voulez comparer deux pièces différentes (par exemple une référence d'origine et son équivalent aftermarket).

## Saisir une offre

C'est le geste central du module. Vous avez trouvé une annonce — sur eBay, AliExpress, PartSouq, chez un exportateur de Dubaï, ou par un contact WhatsApp — vous la mettez dans le dossier.

Sur la fiche du dossier, cliquez **« Ajouter une offre »**.

### Les champs à l'écran

| Champ | À remplir avec |
|---|---|
| **Fournisseur** *(obligatoire)* | Le nom du vendeur ou de la boutique. C'est le seul champ exigé. |
| **Lien de l'annonce** | L'URL de la page. Collez-la : le site (« ebay.com ») est déduit automatiquement, et le lien reste cliquable pour toute l'équipe. |
| **Prix unitaire** | Le montant **tel qu'affiché**, et sa devise dans la liste déroulante. Ne convertissez rien : la plateforme s'en charge. |
| **Condition** | Neuf, Occasion importée, Ré-usiné, Aftermarket, OEM — ou le libellé du vendeur tel quel. |
| **Prix confirmé** | À cocher **seulement** si vous avez eu le vendeur et qu'il vous a donné un prix ferme. Un prix simplement lu sur une page reste « à confirmer ». |

Le bouton **« Plus de champs »** ouvre le reste : canal (marketplace, distributeur régional, exportateur, fabricant, vendeur local), pays, délai de préparation, poids, référence OEM, quantité minimale, intitulé de l'annonce, WhatsApp et e-mail du vendeur, note interne.

**Remplissez ce que la page donne, laissez le reste vide.** Une offre incomplète mais réelle vaut mieux qu'une offre bloquée faute d'un champ que le vendeur n'indique pas. Deux champs méritent cependant l'effort d'un appel s'ils manquent :

- **le prix**, sans lequel l'offre n'entre pas dans la comparaison ;
- **le délai de préparation**, qui pèse directement sur le coût d'immobilisation.

Une offre saisie à la main porte la mention **« Saisie »** dans la table : l'équipe distingue toujours ce qu'un opérateur a vérifié de ce qu'un assistant a rapporté.

### Corriger ou supprimer

Le prix, le mode d'acheminement, la note et le statut se modifient directement sur la ligne. Le bouton **« Supprimer »** n'est là que pour les erreurs de saisie ; pour retirer une offre de la comparaison **sans la perdre**, utilisez **« Écarter »** — la piste reste consultable, et l'on sait pourquoi elle a été abandonnée. Une offre déjà commandée ne peut plus être supprimée : elle est le pivot d'un bon de commande.

## L'écran Sourcing

L'entrée **« Sourcing »** de la barre latérale liste tous les dossiers, le plus récent en haut.

### Les quatre cartes

- **Dossiers** — nombre total de dossiers ouverts.
- **Recherches auto en cours** — dossiers dont la recherche automatique tourne encore (voir dernière section). À zéro en fonctionnement normal.
- **Offres** — nombre total d'offres saisies ou rapportées, tous dossiers confondus.
- **Offres avec prix** — parmi elles, combien portent un prix. Le complément (« *N* à chiffrer auprès du vendeur ») est votre file de travail : ce sont les offres où il faut décrocher le téléphone.

### La table

Une ligne par dossier : pièce (cliquable, ouvre le détail), véhicule, référence de la cotation d'origine (cliquable aussi), **provenance** (Saisie manuelle ou Recherche automatique), nombre d'offres, date d'ouverture. Les filtres portent sur la provenance, sur l'état d'une recherche automatique et sur le texte (pièce, référence OEM, modèle).

## La fiche d'un dossier

C'est l'écran de travail. Il contient le bouton d'ajout, le tableau des **offres**, puis la **matrice d'arbitrage**.

### Le tableau des offres

Une ligne par offre, avec :

- **Fournisseur** — son nom, la mention « Saisie » s'il vient de vous, son canal (marketplace internationale, distributeur régional, exportateur, fabricant, vendeur local), son pays, et le lien vers l'annonce d'origine.
- **Condition** — Neuf, Occasion importée ou Ré-usiné, en pastille colorée. Quand le libellé de la source ne correspond à aucune de ces trois catégories, il est affiché tel quel en gris : ne devinez pas à la place du vendeur.
- **Prix unitaire** — le montant converti en FCFA, et en dessous le prix d'origine dans sa devise. La pastille **« À confirmer »** reste tant que le prix n'a pas été vérifié. Quand la page ne montrait aucun prix, la colonne affiche **« Prix à obtenir »**.
- **Délai** — le délai de préparation annoncé par le vendeur, quand il est indiqué.
- **Mode** — l'acheminement retenu pour le calcul. Laissé sur **« Auto »**, la plateforme décide (voir plus bas). Vous pouvez forcer un mode : votre choix prime toujours.
- **Statut** — Candidate, Retenue, Contactée, Écartée ou Commandée.

### Les cinq actions

- **Retenir** — met l'offre dans la liste courte. Dès qu'au moins une offre est retenue, **la matrice ne compare plus que les offres retenues** : c'est ainsi qu'on passe de quinze pistes à trois vraies options.
- **Écarter** — sort l'offre de la comparaison (mauvaise référence, vendeur douteux, pièce incompatible).
- **Message** — rédige un **brouillon** de message d'enquête au fournisseur, en français ou en anglais selon son pays, demandant disponibilité, prix ferme, MOQ, délai, poids et modalités d'expédition vers Abidjan. Le brouillon s'affiche dans un encadré avec trois boutons : **Copier**, **Ouvrir WhatsApp**, **Ouvrir l'e-mail**. **Rien n'est envoyé automatiquement** — vous relisez, vous adaptez, vous envoyez.
- **Supprimer** — efface une offre saisie par erreur. À ne pas confondre avec « Écarter ».
- **Créer le BC** — transforme l'offre en bon de commande (voir plus bas). Le bouton est désactivé tant que l'offre n'a pas de prix.

### Confirmer un prix

C'est l'étape qui fait toute la différence entre une piste et une décision.

Appelez ou écrivez au fournisseur, obtenez le prix ferme, puis **corrigez le prix directement sur l'offre**. La plateforme recalcule la conversion en FCFA et retire la pastille « À confirmer » : un prix corrigé à la main est, par définition, un prix vérifié. Vous pouvez aussi cocher la case dès la saisie, si vous aviez le vendeur au téléphone en remplissant le formulaire.

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
2. Ouvrez le dossier depuis la demande.
3. Cherchez sur vos sites habituels. Pour chaque annonce crédible (référence OEM identique, vendeur avec un historique), cliquez **« Ajouter une offre »** et collez le lien, le prix affiché et sa devise. Trois ou quatre offres suffisent.
4. Appelez les vendeurs, obtenez les prix fermes, corrigez-les sur les offres et cochez « prix confirmé ».
5. Lisez la matrice : montrez au client le coût total, pas le prix de la pièce. Sur un véhicule immobilisé, l'aérien express gagne souvent malgré son prix.
6. Créez le BC, créez l'expédition, envoyez le lien de suivi.

### Le client vous envoie lui-même un lien

Cas fréquent : le propriétaire a repéré une annonce et demande ce qu'elle donne, rendue à Abidjan.

1. Ouvrez le dossier de sa demande (ou créez-le).
2. **« Ajouter une offre »** → collez son lien, le prix et la devise affichés.
3. La matrice répond immédiatement : prix pièce, fret, douane, livraison, immobilisation, total. C'est la réponse à sa question, et elle est chiffrée.
4. Saisissez à côté une ou deux offres de votre côté : la comparaison montre au client s'il avait trouvé la bonne affaire — ou pas.

### Aucune offre avec prix

Les marketplaces masquent souvent les prix aux visiteurs. C'est normal, et ce n'est pas un échec :

1. Saisissez quand même les offres, sans prix : la piste est enregistrée, avec son lien et son contact.
2. Utilisez **« Message »** pour chacune : le brouillon demande déjà tout ce qu'il faut.
3. Envoyez par WhatsApp ou e-mail, notez les réponses en corrigeant les prix sur les offres.
4. La matrice devient exploitable dès le premier prix confirmé.

### Réapprovisionnement planifié, véhicule non immobilisé

Quand le véhicule roule, l'immobilisation ne s'applique pas de la même façon : le maritime groupé redevient compétitif. Forcez **« Maritime groupé »** sur les offres concernées et comparez — c'est le seul cas où l'économie à l'achat se retrouve vraiment au total.

## La recherche automatique (complément)

En plus de la saisie manuelle, le bloc « Sourcing » d'une demande propose **« Lancer une recherche automatique »**. Un assistant explore alors les marketplaces internationales, les distributeurs régionaux et les exportateurs, et remonte les offres qu'il trouve dans un dossier séparé, marqué **Recherche automatique**.

**Ce n'est pas le chemin normal**, pour trois raisons :

- chaque recherche a un coût réel (un appel modèle et jusqu'à douze recherches web) ;
- l'assistant rapporte ce qu'il lit, sans juger de la fiabilité du vendeur ni de la compatibilité réelle de la pièce ;
- une bonne part des marketplaces bloque la lecture automatique, ce qui donne des dossiers vides ou des offres sans prix.

Réservez-la aux cas où vous **ne trouvez rien** par vous-même : référence obscure, pièce de véhicule rare, marché que vous ne connaissez pas.

La recherche prend **30 à 90 secondes** et tourne en arrière-plan : vous pouvez fermer la page. Le bloc se rafraîchit tout seul et affiche l'état :

| Pastille | Signification |
|---|---|
| **En attente** | La recherche est dans la file, elle va démarrer |
| **Recherche en cours** | L'assistant explore les sites de vente |
| **Terminée** | Les offres sont disponibles — cliquez pour les voir |
| **Échec** | Rien n'a pu être trouvé, la raison est affichée sous la pastille |

**Une seule recherche automatique à la fois par demande** : relancer ne donnerait pas de meilleurs résultats, et coûterait deux fois. Les dossiers manuels, eux, ne sont jamais bloqués — vous pouvez continuer à saisir pendant qu'une recherche tourne.

Les offres rapportées se traitent **exactement comme les autres** : ouvrez toujours le lien avant de retenir une offre, et confirmez le prix auprès du vendeur avant de commander. Un échec de recherche n'est pas retenté automatiquement : un nouvel essai consommerait des recherches facturées sur une requête déjà connue pour échouer, et créerait des offres en double.

## Bonnes pratiques

- **Saisissez au fil de l'eau.** Une annonce vue et non saisie est une annonce perdue : l'onglet se ferme, le lien disparaît, et personne d'autre dans l'équipe n'y aura accès.
- **Trois à cinq offres suffisent.** Au-delà, on compare pour comparer. En dessous de trois, la matrice n'arbitre rien.
- **Ne communiquez jamais un prix « À confirmer »** au client comme un devis. Confirmez d'abord.
- **Retenez avant d'arbitrer.** Une matrice à quinze lignes n'aide personne ; à trois lignes, elle décide.
- **Ne cochez « prix confirmé » que si vous avez eu le vendeur.** C'est la case qui engage Pièces vis-à-vis du client.
- **Écartez plutôt que supprimer.** Savoir pourquoi une piste a été abandonnée a de la valeur le mois suivant.
- **Copiez le lien de suivi tout de suite** après avoir créé l'expédition. Il ne sera pas réaffiché.
- **Renseignez le poids réel** dès que le transporteur le communique : le poids taxable, donc le coût, en dépend entièrement.
- **Prévenez le client aux étapes qui comptent** (départ, dédouanement, livraison), pas à chacune.

## Limites connues

- **Prix indicatifs par nature.** Un prix lu sur une page publique peut être périmé, hors taxes, ou hors port. La confirmation auprès du vendeur n'est pas une formalité, c'est le cœur du métier.
- **Pas d'évaluation automatique d'un lien.** Coller une URL ne remplit pas le formulaire à votre place : vous lisez la page et saisissez ce qu'elle indique. C'est plus sûr — et la plupart des marketplaces bloquent de toute façon la lecture automatique.
- **Grille de fret et taux de douane à calibrer.** Les tarifs d'acheminement et le taux de douane de 20 % sont des ordres de grandeur de cadrage. Le total affiché n'est juste que si la grille l'est : **elle doit être obtenue du partenaire transitaire avant tout usage client** de ces montants.
- **Taux de change figés.** Les taux de conversion sont des constantes (seul l'euro est fixe, par parité). Ils sont modifiables par l'équipe technique sans redéploiement, mais **personne ne les met à jour automatiquement** : à surveiller, sinon les montants en FCFA dérivent silencieusement. Le taux appliqué à un bon de commande reste corrigeable à la main.
- **Pas d'intégration transporteur.** Les étapes sont saisies par l'équipe. Les liens DHL/FedEx/UPS sont construits automatiquement, mais aucune API ne remonte les événements.
- **Pas de message automatique au client.** Chaque notification est une action volontaire de l'équipe.
- **Dossier lié à une demande.** Il n'est pas prévu d'ouvrir un dossier exploratoire sans besoin client rattaché.

---

Pièces.ci — Marketplace pièces auto · Abidjan, Côte d'Ivoire · Document interne, équipe Pièces

_Manuel Sourcing & Expéditions v1.0 — août 2026. Décrit les modules « Sourcing » et « Expéditions » de l'espace Administration tels que déployés. Spécification d'origine : `docs/sourcing-expeditions-plan-2026-08.md`. Pour toute évolution de l'outil, mettre à jour ce document dans `docs/`._
