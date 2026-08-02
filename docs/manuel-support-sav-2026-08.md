<p class="eyebrow">Document interne</p>

# Support & SAV — Manuel d'utilisation

<p class="deck">Le module « Support & SAV » de l'équipe Pièces : pilotage des litiges clients et des retours pièces — prise en charge, résolution argumentée, remboursement avec libération automatique du séquestre et notification WhatsApp du client — accessible depuis l'espace Administration.</p>

<div class="callout">
<p class="lead">Un litige bien traité transforme un client déçu en client fidèle ; un litige <strong>perdu de vue</strong> le perd pour toujours. Chaque litige et chaque retour a ici un statut clair, un prochain geste attendu, et une trace écrite.</p>
<p>Ce manuel explique comment traiter un litige de bout en bout (prendre en charge, résoudre, clôturer) et faire avancer un retour jusqu'au remboursement.</p>
</div>

## À quoi sert le module

Le module « Support & SAV » est le **poste de commande du service après-vente**. Avant lui, les litiges et les retours n'avaient ni liste d'ensemble ni fiche de traitement : il fallait fouiller commande par commande. Il répond à trois besoins :

- **Tout voir** : la liste complète des litiges et des retours de la plateforme, avec leurs statuts, filtrable et cherchable.
- **Traiter avec méthode** : chaque dossier suit un chemin balisé — un litige est pris en charge, résolu par écrit, puis clôturé ; un retour avance étape par étape, sans transition impossible.
- **Rembourser proprement** : au statut « Remboursé », le séquestre de la commande est automatiquement remboursé au client s'il était encore bloqué, et le client est prévenu par WhatsApp.

**Accès.** Espace **Administration** → entrée **« SAV »** dans la barre latérale. Le module est réservé aux membres de l'équipe Pièces habilités Administration. Il s'organise en deux onglets : **Litiges** et **Retours**.

## Onglet Litiges

### Les six cartes (cockpit)

En haut de l'onglet, la photographie instantanée du SAV :

- **Litiges ouverts** — en attente de prise en charge. C'est la file d'attente prioritaire : chaque matin commence ici.
- **En cours d'examen** — pris en charge, pas encore résolus.
- **Résolus · 30 j** — litiges résolus sur les 30 derniers jours (votre production).
- **Retours demandés** — retours au premier statut, en attente d'acceptation.
- **Retours en cours** — acceptés, récupérés ou inspectés, pas encore conclus.
- **Remboursé · 30 j** — montant total remboursé sur 30 jours, avec le nombre de retours concernés.

### La table des litiges

Une ligne par litige, le plus récent en haut : date, commande (numéro court + montant), plaignant (nom + téléphone), raison (tronquée — survolez pour tout lire), statut (pastille colorée), et le lien **« Fiche »**. La recherche accepte un extrait de la raison ou un numéro de commande ; les pastilles de statut filtrent la liste (combinaison recherche + statut possible) ; la pagination avance par pages de 20.

| Statut | Signification |
|---|---|
| **Ouvert** | Nouveau, personne ne s'en occupe encore |
| **En cours d'examen** | Pris en charge par l'équipe, analyse en cours |
| **Résolu (client)** | Tranché en faveur du client |
| **Résolu (vendeur)** | Tranché en faveur du vendeur |
| **Clôturé** | Dossier fermé définitivement |

## Traiter un litige, pas à pas

1. **Ouvrez la fiche** depuis la table. Vous y trouvez la raison complète, les preuves jointes, le plaignant, et dans le panneau de droite toute la commande : articles avec vendeur et condition de la pièce, montants, statut, **séquestre** (bloqué, libéré ou remboursé).
2. **« Prendre en charge »** (litige ouvert) — le litige passe *En cours d'examen* : l'équipe sait que quelqu'un est dessus. Appelez le client et/ou le vendeur (téléphones sur la fiche), examinez les preuves.
3. **« Résoudre »** (ouvert ou en cours d'examen) — le formulaire demande deux choses : **en faveur de qui** (client ou vendeur) et la **résolution écrite**. Rédigez-la avec soin : elle est envoyée au plaignant par WhatsApp et reste dans l'historique. Faits, décision, suite concrète (« remboursement en cours », « échange expédié mardi ») — jamais de généralités.
4. **« Clôturer »** (en cours d'examen ou résolu) — ferme le dossier. Une confirmation vous est demandée : la clôture est définitive.

## Onglet Retours

La table des retours fonctionne comme celle des litiges (recherche, filtres de statut, pagination) : date de demande, commande, demandeur, motif (Défectueux, Mauvaise pièce, Non conforme, Plus besoin, Autre), statut, montant remboursé, lien **« Fiche »**.

### La chaîne d'un retour

Un retour avance toujours dans le même ordre — jamais de raccourci :

**Demandé → Accepté → Récupéré → Inspecté → Remboursé** (ou **Rejeté** après inspection) — avec **Annulé** possible depuis *Demandé* ou *Accepté*.

Sur la fiche retour, le bouton **« Faire avancer »** ne propose que les statuts suivants autorisés pour l'étape en cours — impossible de se tromper de transition. À chaque passage, l'étape est horodatée (visible dans l'encadré « Étapes ») et vous pouvez joindre une **note de résolution** (visible dans l'historique).

### Rembourser, pas à pas

1. Le retour doit être au statut **Inspecté** : la pièce est entre nos mains, vérifiée.
2. **« Faire avancer »** → statut **« Remboursé »** : le champ **montant remboursé (FCFA)** apparaît — il est **obligatoire**. Saisissez le montant exact convenu (total ou partiel).
3. Un bandeau vous rappelle les conséquences avant de confirmer : le séquestre de la commande, s'il est encore bloqué, est **remboursé au client**, et le client reçoit une **notification WhatsApp**.
4. Confirmez : le statut, le montant et la date de remboursement s'affichent sur la fiche, et le compteur « Remboursé · 30 j » du cockpit s'en trouve augmenté.

### Rejeter un retour

Depuis *Demandé* (retour injustifié) ou *Inspecté* (pièce non conforme au motif déclaré), choisissez **« Rejeté »** et expliquez toujours la décision dans la note — le demandeur est notifié par WhatsApp, une note claire évite le litige qui suivrait.

## Les automatismes

- **Horodatage systématique** : chaque changement de statut d'un retour enregistre sa date (demandé, accepté, récupéré, inspecté, remboursé, rejeté, annulé) — la fiche « Étapes » raconte le dossier sans rien saisir.
- **Remboursement du séquestre** : au passage « Remboursé », si le séquestre de la commande est encore bloqué, il est automatiquement remboursé au client. S'il a déjà été libéré au vendeur, le statut avance mais aucun mouvement de séquestre n'a lieu — réglez alors le remboursement hors plateforme et notez-le dans la note de résolution.
- **Notifications WhatsApp** : le plaignant reçoit la résolution de son litige ; le demandeur d'un retour est prévenu au remboursement comme au rejet. Les notifications partent en meilleur effort : si le numéro est injoignable, le statut avance quand même.
- **Traçabilité** : chaque action de l'équipe (prise en charge, résolution, clôture, avancement d'un retour) est consignée au journal d'activité de la plateforme avec son auteur.

## Scénarios pratiques

### La revue du matin (10 minutes)

1. Onglet **Litiges**, carte **Ouverts** : tout litige ouvert est pris en charge dans la matinée (bouton « Prendre en charge »), puis appelé dans la foulée.
2. Filtre **En cours d'examen** : les dossiers de la veille ont-ils reçu leur réponse ? Un litige qui dépasse 48 h en examen se résout ou s'explique.
3. Onglet **Retours**, filtre **Demandé** : acceptez ou rejetez chaque demande du jour ; filtre **Inspecté** : concluez les remboursements en attente.

### Litige « pièce défectueuse » type

1. Le client ouvre un litige sur une commande livrée : la fiche montre la pièce, son vendeur et le séquestre encore bloqué.
2. Prenez en charge, appelez le client (preuves : photos jointes), puis le vendeur.
3. La pièce est bien défectueuse → demandez un **retour** (canal habituel), et quand le retour est **inspecté**, passez-le à **Remboursé** : le séquestre bloqué repart automatiquement au client.
4. Résolvez le litige **en faveur du client** (« pièce défectueuse confirmée à l'inspection, remboursement effectué le … »), puis clôturez.

### Retour « plus besoin »

1. Retour demandé après livraison, motif « Plus besoin ». La commande est livrée depuis deux jours, pièce neuve.
2. Acceptez le retour → la pièce est **récupérée** par le livreur → **inspectée** (intacte, revendable).
3. Passez à **Remboursé** avec le montant de la pièce (hors frais de livraison, selon la politique en vigueur — notez le calcul dans la note).

## Bonnes pratiques

- **Prenez en charge avant d'appeler** : le statut « En cours d'examen » évite que deux collègues appellent le même client — et le cockpit reflète la réalité.
- **La résolution s'écrit pour le client** : elle part telle quelle en WhatsApp. Relisez-la avec ses yeux avant de confirmer.
- **Une note à chaque étape sensible** : remboursement partiel, rejet, arrangement avec le vendeur — la note de résolution est la mémoire du dossier quand un collègue le rouvrira.
- **Ne laissez rien au statut « Demandé » plus de 24 h** : accepter ou rejeter vite, même si la suite prend du temps — le client sait que son dossier avance.
- **Vérifiez le séquestre avant de rembourser** : l'encadré commande de la fiche l'affiche. S'il est déjà « Libéré au vendeur », le remboursement ne passera pas par la plateforme — anticipez la solution et tracez-la.
- **Clôturez les dossiers terminés** : une liste de litiges propre se concentre sur l'ouvert et l'examen ; le clôturé reste retrouvable par le filtre.

## Limites connues

- **Pas d'assignation nominative** : un litige ou un retour n'est pas attribué à un agent précis — la coordination repose sur la prise en charge et les relances CRM (une tâche CRM peut être créée sur la fiche client pour le suivi).
- **Pas de notes internes chronologiques** : la fiche trace les statuts et une note de résolution, mais pas une timeline de commentaires d'équipe — utilisez les interactions CRM de la fiche client pour le journal détaillé.
- **Montant de remboursement libre** : la plateforme ne calcule pas le montant (pièce seule, avec ou sans livraison) — il est saisi par l'agent, selon la politique en vigueur.
- **Notifications en meilleur effort** : un client sans numéro valide ou désabonné de WhatsApp n'est pas prévenu — le statut avance quand même ; prévoyez un appel dans ce cas.
- **Pas de statistiques de délai** : le cockpit compte les dossiers, pas encore les délais moyens de traitement.

---

Pièces.ci — Marketplace pièces auto · Abidjan, Côte d'Ivoire · Document interne, équipe Pièces

_Manuel Support & SAV v1.0 — août 2026. Décrit le module « Support & SAV » de l'espace Administration (litiges, retours, remboursements) tel que déployé. Pour toute évolution de l'outil, mettre à jour ce document dans `docs/`._
