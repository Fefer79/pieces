<p class="eyebrow">Document interne</p>

# Marketing — Manuel d'utilisation

<p class="deck">Le module « Marketing » de l'équipe Pièces : campagnes WhatsApp en masse, ciblées sur les segments CRM (clients à risque, vendeurs sans commande…) ou sur les tags CRM, avec aperçu d'audience, envoi planifié et respect automatique du désabonnement — accessible depuis l'espace Administration.</p>

<div class="callout">
<p class="lead">Une campagne n'est utile que si elle touche <strong>les bonnes personnes, au bon moment, sans importuner</strong> : le ciblage repose sur les mêmes segments que le CRM, et tout désabonné est exclu sans exception.</p>
<p>Ce manuel explique comment créer une campagne, vérifier son audience avant l'envoi, la lancer immédiatement ou la planifier, puis suivre ses résultats.</p>
</div>

## À quoi sert le module

Le module « Marketing » permet d'écrire **un message WhatsApp unique** et de l'envoyer à **une audience entière** en quelques clics, sans copier-coller ni envoi manuel. Il répond à quatre besoins :

- **Cibler juste** : les audiences sont les segments CRM déjà calculés par la plateforme (clients nouveaux, actifs, fidèles, à risque, inactifs ; vendeurs actifs, sans commande depuis 30 jours, fiche incomplète, litiges ouverts) ou n'importe quel **tag CRM** créé par l'équipe.
- **Vérifier avant d'envoyer** : l'aperçu d'audience montre combien de personnes recevront réellement le message — et combien en seront exclues (désabonnés, numéros manquants).
- **Choisir le moment** : envoi immédiat ou planifié à une date et heure précises.
- **Rester traçable** : chaque message envoyé est consigné dans la fiche CRM du destinataire (interaction « relance »), visible par toute l'équipe dans la timeline du client ou du vendeur.

**Accès.** Espace **Administration** → entrée **« Marketing »** dans la barre latérale. Le module est réservé aux membres de l'équipe Pièces habilités Administration. Il s'organise en deux onglets : **Campagnes** (la liste et le suivi) et **Nouvelle campagne** (la création).

## Onglet Campagnes

La page d'accueil du module donne l'activité marketing en un coup d'œil.

### Les quatre cartes

- **Campagnes** — nombre total de campagnes créées, tous statuts confondus.
- **En cours** — campagnes dont l'envoi est en train de se dérouler.
- **Planifiées** — campagnes dont l'envoi partira automatiquement à une date future.
- **Messages envoyés (30 j)** — nombre de WhatsApp effectivement délivrés sur les 30 derniers jours.

### La table des campagnes

Une ligne par campagne, les plus récentes en haut : nom (cliquable, ouvre la fiche), type d'audience, statut (pastille colorée), nombre de cibles et de messages envoyés, date de création. Les pastilles de statut :

| Statut | Signification |
|---|---|
| **Brouillon** | Créée, pas encore lancée — modifiable en esprit, aucun envoi parti |
| **Planifiée** | L'envoi partira automatiquement à la date prévue |
| **En cours** | L'envoi est en train de se dérouler |
| **Terminée** | Tous les messages ont été traités — les compteurs sont définitifs |
| **Annulée** | Abandonnée avant envoi — aucun message parti |

Le filtre en haut de la table (pastilles cliquables) ne montre qu'un statut à la fois ; la pagination (flèches **←** / **→**) avance par pages de 20 campagnes.

## Onglet Nouvelle campagne

### Créer une campagne, pas à pas

1. **Nom** — un nom parlant pour l'équipe (ex. « Relance clients à risque — août »). Il n'est jamais visible des destinataires.
2. **Message WhatsApp** — le texte exact qui sera reçu (1 000 caractères maximum, compteur visible en bas à droite). Écrivez-le comme un message personnel : court, chaleureux, avec un appel à l'action clair.
3. **Type d'audience** — *Segment clients*, *Segment vendeurs* ou *Tag CRM*.
4. **Audience** — la liste déroulante montre chaque segment ou tag avec son effectif entre parenthèses, par exemple « À risque (143) ».
5. **Aperçu de l'audience** — cliquez le bouton : l'encadré affiche le nombre de destinataires, les **désabonnés exclus**, les **sans téléphone exclus**, et un échantillon de 10 noms avec numéros. Vérifiez que l'échantillon correspond bien à qui vous voulez toucher.
6. **Date d'envoi (facultatif)** — laissez vide pour un brouillon à lancer à la main, ou choisissez une date et heure futures pour planifier l'envoi.
7. **Créer la campagne** — vous arrivez sur la fiche campagne, prête à être lancée.

**Important** : la création n'envoie rien. L'envoi ne démarre qu'au clic sur **« Lancer maintenant »** (fiche campagne) ou à l'heure planifiée.

## La fiche campagne

La fiche regroupe tout ce qui concerne une campagne :

- **Le message** tel qu'il sera reçu, et l'audience ciblée (type + segment ou tag, auteur de la campagne).
- **Les cinq compteurs** : Cibles (destinataires résolus au lancement), Envoyés, Échecs (envoi impossible : numéro invalide, erreur WhatsApp), Désabonnés exclus, Sans téléphone exclus.
- **Les dates** : création, envoi planifié, démarrage, fin.
- **Les actions** (brouillon et planifiée uniquement) : **« Lancer maintenant »** démarre l'envoi immédiatement (une confirmation vous est demandée — l'envoi est irréversible) ; **« Annuler la campagne »** l'abandonne définitivement.

Pendant un envoi en cours, rechargez la page pour voir les compteurs monter ; la campagne passe à **Terminée** quand tous les destinataires ont été traités.

## Les automatismes

- **Envoi asynchrone** : l'envoi est pris en charge par la file de travaux de la plateforme (un message toutes les fractions de seconde). Vous pouvez quitter la page — rien ne dépend de votre navigateur.
- **Exclusion des désabonnés** : tout destinataire qui a désactivé les notifications WhatsApp dans ses préférences est automatiquement écarté et comptabilisé dans « Désabonnés (exclus) » — aucune exception possible. Pour un vendeur, c'est la préférence de son compte utilisateur lié qui s'applique.
- **Traçage CRM** : chaque message (réussi ou en échec) crée une interaction « relance » dans la fiche CRM du destinataire, avec le statut d'envoi. L'équipe voit donc, dans la timeline d'un client, qu'il a reçu telle campagne tel jour.
- **Planification** : une campagne planifiée part toute seule à l'heure prévue, même personne de connecté.
- **Jamais de doublon** : si l'envoi global échoue en cours de route, la plateforme ne relance **pas** automatiquement la campagne — aucun destinataire ne recevra deux fois le même message. Les compteurs montrent alors où l'envoi s'est arrêté.

## Scénarios pratiques

### Relancer les clients à risque (mensuel)

1. Onglet **Nouvelle campagne** → type *Segment clients* → audience **« À risque »**.
2. Aperçu : vérifiez l'échantillon (ce sont des clients qui n'ont pas commandé depuis 2 à 4 mois).
3. Message du type : « Bonjour, votre véhicule mérite le meilleur : ce mois-ci, la livraison est offerte sur toutes les pièces d'entretien. Passez commande sur pieces.ci ».
4. Lancez en début de mois ; suivez les envois sur la fiche ; comparez le segment « À risque » le mois suivant dans le CRM.

### Réveiller les vendeurs sans commande

1. Type *Segment vendeurs* → audience **« Sans commande depuis 30 j »**.
2. Message orienté aide : « Bonjour, votre boutique Pièces n'a pas reçu de commande ce mois-ci. Notre équipe peut vous aider à compléter votre catalogue — répondez à ce message. »
3. Planifiez l'envoi un mardi à 9 h (créneau de lecture maximal), pas le week-end.

### Annoncer une opération ciblée par tag

1. Dans le CRM, taguez au préalable les contacts concernés (ex. tag « garages partenaires »).
2. Type *Tag CRM* → choisissez ce tag dans la liste (l'effectif affiché = nombre de fiches taguées).
3. Envoyez l'annonce ; chaque destinataire retrouve la trace de l'envoi dans sa fiche.

## Bonnes pratiques

- **Un message = une idée.** Une annonce claire avec un seul appel à l'action (« commandez », « répondez », « découvrez ») surpasse toujours un pavé.
- **Écrivez comme à un client, pas à une liste.** « Bonjour Awa » lit-on dans l'aperçu : relisez l'échantillon et demandez-vous si vous apprécieriez de recevoir ce message.
- **Fréquence raisonnable** : pas plus d'une campagne par audience et par mois, sauf événement réel (promotion, rupture réparée). Le désabonnement WhatsApp est définitif et prive ensuite le CRM de ce canal.
- **Testez d'abord sur un tag restreint** (ex. un tag « test » contenant les numéros de l'équipe) avant d'envoyer à 500 clients.
- **Vérifiez toujours l'aperçu** : un segment qui affiche 0 destinataire ne peut pas être lancé — le bouton refusera avec le message « L'audience ne contient aucun destinataire ».
- **Préférez la planification aux envois du soir ou du week-end** : un message reçu à 9 h un jour ouvré est lu ; reçu à 22 h, il agace.

## Limites connues

- **Texte libre WhatsApp** : l'envoi utilise la fenêtre de conversation WhatsApp. Pour des destinataires n'ayant jamais échangé avec le numéro Pièces (hors fenêtre de 24 h), Meta peut exiger des **modèles de messages approuvés** — une évolution future du module.
- **Pas de reprise automatique** : en cas d'échec global en cours d'envoi, la campagne s'arrête pour éviter tout doublon ; les compteurs indiquent l'état d'avancement et l'équipe peut créer une nouvelle campagne pour le reliquat.
- **Pas de personnalisation par destinataire** : le même texte part à tous (pas de « Bonjour {prénom} » automatique pour l'instant).
- **Pas de statistiques de lecture** : les compteurs mesurent l'envoi (remis à WhatsApp), pas l'ouverture ni la lecture du message.
- **Annulation limitée** : seules les campagnes brouillon ou planifiées peuvent être annulées — un envoi en cours va à son terme.
- **Audience figée au lancement** : le nombre de cibles est calculé au moment du lancement ; un client qui entrerait dans le segment le lendemain ne recevra pas la campagne.

---

Pièces.ci — Marketplace pièces auto · Abidjan, Côte d'Ivoire · Document interne, équipe Pièces

_Manuel Marketing v1.0 — août 2026. Décrit le module « Marketing » de l'espace Administration (campagnes, création, fiche campagne) tel que déployé. Pour toute évolution de l'outil, mettre à jour ce document dans `docs/`._
