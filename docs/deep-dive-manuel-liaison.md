# Manuel d'utilisation — Liaison Pièces

**Plateforme :** Pièces — Marketplace de pièces auto d'occasion
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 1.0 — Mai 2026

---

## À qui s'adresse ce document

Ce manuel décrit le rôle et les procédures du **Liaison Pièces**, employé terrain chargé de démarcher les vendeurs de pièces auto, de les onboarder sur la plateforme, et — pour une partie d'entre eux — de gérer le compte vendeur en leur nom le temps qu'ils prennent leur autonomie.

C'est la première personne que voit le vendeur. C'est aussi celle qui rend le catalogue de Pièces possible.

---

## Table des matières

1. [Mission du Liaison](#1-mission-du-liaison)
2. [Connexion et accès au tableau de bord](#2-connexion-et-accès-au-tableau-de-bord)
3. [Préparation d'une visite vendeur](#3-préparation-dune-visite-vendeur)
4. [Onboarder un nouveau vendeur](#4-onboarder-un-nouveau-vendeur)
5. [Ajouter une pièce au catalogue](#5-ajouter-une-pièce-au-catalogue)
6. [Négocier et enregistrer la commission](#6-négocier-et-enregistrer-la-commission)
7. [Faire agréer la commission par le vendeur](#7-faire-agréer-la-commission-par-le-vendeur)
8. [Modifier une annonce existante](#8-modifier-une-annonce-existante)
9. [Coordination des commandes](#9-coordination-des-commandes)
10. [Suivi quotidien du tableau de bord](#10-suivi-quotidien-du-tableau-de-bord)
11. [Bonnes pratiques et erreurs à éviter](#11-bonnes-pratiques-et-erreurs-à-éviter)
12. [FAQ Liaison](#12-faq-liaison)

---

## 1. Mission du Liaison

Le Liaison a trois responsabilités principales :

1. **Démarcher** les vendeurs de pièces auto sur le terrain (casses, garages, magasins, marchés).
2. **Onboarder** les vendeurs sur la plateforme Pièces : créer leur compte, saisir leur KYC, prendre la photo des premières pièces, fixer une commission agréée pour chaque article.
3. **Coordonner** les commandes pour les vendeurs qui n'ont pas encore leur propre compte actif : transmettre les demandes, suivre la livraison, faire le pont avec un employé du vendeur ou le vendeur lui-même.

Un vendeur peut soit :

- **Avoir son propre compte vendeur** (le Liaison l'a aidé à l'activer, le vendeur prend le relais) — le Liaison agit alors comme accompagnateur, pas comme gestionnaire.
- **Être géré par le Liaison** — le compte vendeur existe dans la base mais c'est le Liaison qui saisit le catalogue et coordonne les ventes au quotidien.

Dans les deux cas, le Liaison reste l'interlocuteur de premier niveau pour le vendeur.

---

## 2. Connexion et accès au tableau de bord

### Première connexion

1. Ouvrir `https://pieces.ci` sur navigateur mobile ou ordinateur.
2. Se connecter avec son numéro de téléphone professionnel (+225 XX XX XX XX XX).
3. Saisir le code OTP reçu par SMS.

Le rôle **LIAISON** doit être attribué par un administrateur Pièces. Sans ce rôle, l'espace Liaison est inaccessible.

### Accéder à l'espace Liaison

Une fois connecté :

- **Desktop** : menu latéral gauche → onglets *Tableau de bord*, *Vendeurs*, *Pièces*.
- **Mobile** : barre de navigation en bas → icônes *Liaison*, *Vendeurs*, *Pièces*.

L'URL directe est `https://pieces.ci/liaison`.

### Changer de contexte

Si le compte du Liaison cumule plusieurs rôles (par exemple LIAISON + MECHANIC), basculer via le menu *Mon compte* → *Changer de contexte*. Toutes les fonctionnalités décrites ici nécessitent que le contexte actif soit **LIAISON**.

---

## 3. Préparation d'une visite vendeur

Avant d'aller voir un nouveau vendeur, rassembler les informations suivantes :

| Information | Pourquoi |
|---|---|
| Nom commercial de la boutique | Apparaîtra sur les annonces |
| Nom du contact principal | Personne qui valide les ventes |
| Numéro de téléphone | Doit être unique sur la plateforme |
| Type de vendeur (formel/informel) | Détermine le document KYC |
| Document KYC (RCCM si formel, CNI si informel) | Obligatoire pour activer le compte |
| Commune et adresse | Localisation client |
| Coordonnées GPS approximatives | Idéalement prises sur place |
| Zones de livraison acceptées | Communes où le vendeur peut livrer |

**Astuce :** prendre les coordonnées GPS pendant la visite via l'application Maps de son téléphone, puis les noter avant de remplir le formulaire dans Pièces.

---

## 4. Onboarder un nouveau vendeur

### Étape par étape

1. Depuis le tableau de bord Liaison, cliquer **+ Onboarder un vendeur** ou aller dans *Vendeurs* → **+ Ajouter**.
2. Remplir le formulaire :
   - **Nom commercial** (2 à 100 caractères)
   - **Nom du contact**
   - **Téléphone** au format `+225XXXXXXXXXX` — ce numéro doit être **unique** dans la base
   - **Type vendeur** : Formel ou Informel
   - **Document KYC** :
     - Si vendeur **FORMEL** : RCCM (numéro du registre du commerce)
     - Si vendeur **INFORMEL** : CNI (numéro de carte nationale d'identité)
   - **Commune** (sélection dans la liste des communes d'Abidjan)
   - **Adresse**
   - **GPS** (latitude / longitude)
   - **Zones de livraison** (sélection multiple de communes)
3. Cliquer **Créer le vendeur**.

À l'issue, le vendeur est créé avec le statut **PENDING_ACTIVATION**. Il apparaît dans la liste *Vendeurs* du Liaison avec un badge orange "En attente d'activation".

### Activer le vendeur

L'activation est l'étape qui passe le vendeur du statut PENDING_ACTIVATION à **ACTIVE**. Elle requiert :

- La **signature des garanties vendeur** (responsabilité produit, délais, conditions de retour).
- La validation du KYC par un administrateur Pièces.

Tant que le vendeur n'est pas ACTIVE, ses pièces peuvent être ajoutées au catalogue mais les **commandes ne pourront pas être finalisées**.

---

## 5. Ajouter une pièce au catalogue

Une fois le vendeur créé, ajouter ses pièces une par une.

1. Aller dans le détail du vendeur (*Vendeurs* → cliquer sur le vendeur) puis cliquer **+ Ajouter**.
2. Remplir le formulaire pièce :
   - **Nom de la pièce** (obligatoire, ex : "Alternateur 90A")
   - **Catégorie** (Moteur, Freinage, Suspension, Transmission, Carrosserie, Électronique, Filtration, Échappement, Climatisation, Allumage, ou texte libre)
   - **État** (obligatoire) :
     - **Neuf** — pièce jamais montée
     - **Occasion** — pièce démontée d'un véhicule
     - **Ré-usiné** — pièce remise à neuf en atelier
   - **Prix (FCFA)** — laisser vide si à confirmer plus tard
   - **Commission Pièces (FCFA)** — montant agréé avec le vendeur (voir section 6)
   - **Référence OEM** (numéro constructeur si visible sur la pièce)
   - **Compatibilité véhicule** (marque · modèle · année — ex : "Toyota Hilux 2010-2015")
   - **Garantie (mois)** — durée pendant laquelle le vendeur garantit la pièce
   - **En stock** (cocher si la pièce est physiquement disponible)
3. Cliquer **Ajouter la pièce**.

La pièce est immédiatement **PUBLIÉE** dans le catalogue public.

### Photos

L'upload de photos détaillées (jusqu'à 3 par pièce) se fait via le flux vendeur classique. Pour les pièces saisies par le Liaison, prendre au minimum une photo claire qui sert d'image principale lors de la saisie initiale.

---

## 6. Négocier et enregistrer la commission

Chaque pièce mise en vente sur Pièces porte une **commission** : la part du prix de vente qui revient à la plateforme. Cette commission est **agréée avec le vendeur** lors de l'onboarding ou de l'ajout de chaque pièce.

### Comment fixer le montant

Il n'y a **pas de pourcentage imposé**. Le Liaison négocie de bonne foi avec le vendeur en fonction :

- du type de pièce (rotative vs. lente),
- du prix de vente,
- de la marge habituelle du vendeur,
- de la complexité de la transaction.

> **À titre indicatif** : on observe que les commissions s'établissent généralement entre **5 % et 10 %** du prix de vente, souvent autour de 8 %. Cela peut varier selon les vendeurs et les types de pièces ; à terme, les données collectées permettront d'affiner.

### Plancher de sécurité

Pour protéger l'équilibre économique de la plateforme, un **plancher minimum** est appliqué automatiquement :

> **Commission minimale = max(1 000 FCFA, 5 % du prix de vente)**

Si le Liaison saisit un montant inférieur à ce plancher, le système l'enregistre automatiquement à la valeur du plancher. Un message discret prévient le Liaison quand cela arrive (`Plancher de sécurité : sera enregistrée à X FCFA minimum`).

Le plancher est une **règle technique de sécurité**, pas une cible commerciale. La cible commerciale est celle qu'on a négociée avec le vendeur.

### Cas particulier — vendeur qui saisit lui-même

Quand le vendeur a son propre compte et saisit ses propres pièces, **il doit lui-même indiquer la commission** dans son interface vendeur. La même règle de plancher s'applique. Le Liaison peut accompagner le vendeur dans cette étape lors de l'onboarding, mais à terme c'est au vendeur de définir la commission de chacune de ses pièces.

---

## 7. Faire agréer la commission par le vendeur

Indiquer une commission dans le système ne suffit pas : **chaque commission doit être explicitement agréée par le vendeur**. C'est ce qui distingue une simple proposition d'un accord engageant.

### Workflow

1. Lors de la visite, après avoir saisi la pièce, **montrer l'écran au vendeur** (ou imprimer une fiche récapitulative).
2. Énoncer clairement : "Pour cette pièce, vous nous reversez X FCFA de commission par vente."
3. Une fois l'accord verbal obtenu, depuis la page **Modifier la pièce** :
   - Cliquer le bouton vert **"Marquer agréée"**.
   - Le badge passe de 🟠 *À agréer* à 🟢 *Agréée*.

### Visualiser le statut

- Sur la liste des pièces (`/liaison/parts` et détail vendeur), chaque ligne porte un badge :
  - 🟢 **✓ Agréée** — commission validée par le vendeur, ligne sûre.
  - 🟠 **⏳ À agréer** — proposée mais pas encore validée.
- Sur le tableau de bord Liaison, une tuile *"Commissions à agréer"* affiche le compteur global (et s'allume en orange dès qu'il y a une commission en attente).

### Règle automatique

> Si le **montant** d'une commission est modifié après agrément, le statut **revient automatiquement à "À agréer"**.

C'est volontaire : on ne peut pas conserver un accord vendeur sur une autre somme que celle qu'il a validée. Toute modification d'amount remet le compteur à zéro et impose une nouvelle validation orale.

---

## 8. Modifier une annonce existante

Le Liaison peut modifier n'importe quelle pièce qu'il a saisie ou qui appartient à un vendeur qu'il gère.

1. Aller sur `/liaison/parts` ou sur la page du vendeur.
2. Cliquer **Modifier** sur la ligne de la pièce.
3. Ajuster les champs nécessaires (nom, prix, état, commission, stock…).
4. Cliquer **Enregistrer**.

**À retenir :**

- Modifier le **prix** ne change pas automatiquement la commission. Il faut renégocier si nécessaire.
- Modifier la **commission** (au montant près) **invalide l'agrément vendeur précédent**. Il faut refaire l'étape "Marquer agréée" après accord oral.
- Modifier le stock (case **En stock**) est immédiat et ne nécessite pas de re-validation.

---

## 9. Coordination des commandes

Quand une commande arrive sur une pièce d'un vendeur que le Liaison gère, le flux est le suivant :

1. **Notification** — le système notifie le Liaison (et le vendeur s'il a un compte actif).
2. **Vérification stock** — le Liaison contacte le vendeur ou son employé pour confirmer que la pièce est bien disponible physiquement.
3. **Confirmation** — depuis l'interface vendeur (le Liaison se connecte avec le compte du vendeur s'il le gère), confirmer la commande pour qu'elle passe en VENDOR_CONFIRMED.
4. **Préparation et remise au livreur** — coordonner avec le vendeur et le livreur le retrait de la pièce.
5. **Suivi** — vérifier que la commande passe par les états DISPATCHED → IN_TRANSIT → DELIVERED → CONFIRMED.
6. **Paiement** — une fois confirmée, l'escrow libère les fonds vers le vendeur. La commission Pièces est automatiquement prélevée.

> **Note technique** : la commission enregistrée au moment de la commande (`OrderItem.commissionAmount`) est figée. Une modification ultérieure de la commission sur la fiche catalogue n'affecte pas les commandes déjà passées.

---

## 10. Suivi quotidien du tableau de bord

Le tableau de bord Liaison (`/liaison`) affiche 4 indicateurs clés :

| Indicateur | Action attendue |
|---|---|
| **Vendeurs** (total) | Voir la croissance du portefeuille |
| **Vendeurs en attente** | Relancer la signature des garanties / activation KYC |
| **Pièces saisies** | Voir le rythme d'enrichissement du catalogue |
| **Commissions à agréer** | **Prioritaire** — faire valider les commissions en attente lors de la prochaine visite |

La tuile *"Commissions à agréer"* s'affiche en orange dès qu'au moins une pièce attend l'accord du vendeur. **Objectif : tendre vers 0 en permanence.**

---

## 11. Bonnes pratiques et erreurs à éviter

### À faire systématiquement

- **Toujours prendre les coordonnées GPS sur place** — l'adresse postale seule ne suffit pas à Abidjan, et le livreur en aura besoin.
- **Saisir au moins une photo claire de la pièce** à l'onboarding initial — une fiche sans photo se vend mal.
- **Faire agréer la commission le jour même** de la saisie, idéalement avant de quitter la boutique.
- **Mettre à jour le statut "En stock"** dès qu'une pièce part — vendre une pièce indisponible dégrade la confiance dans Pièces.
- **Mettre à jour les zones de livraison** quand le vendeur étend son rayon.

### À éviter

- ❌ Saisir une commission à 0 ou très basse en pensant "on verra plus tard" — le plancher de sécurité va corriger automatiquement, mais l'agrément vendeur ne sera plus aligné avec ce qui est vraiment perçu.
- ❌ Modifier le prix d'une pièce sans en informer le vendeur — risque de litige.
- ❌ Marquer une commission comme agréée sans avoir eu l'accord oral du vendeur — c'est une fausse déclaration.
- ❌ Créer un doublon de vendeur (même numéro de téléphone) — le système refusera mais cela perd du temps.
- ❌ Laisser des vendeurs en PENDING_ACTIVATION pendant des semaines — leurs pièces ne se vendent pas tant que le statut n'est pas ACTIVE.

---

## 12. FAQ Liaison

**Q. Un vendeur veut récupérer son propre compte. Comment faire ?**
R. Demander à un administrateur Pièces de transférer la propriété du `Vendor` à un `User` du vendeur (création d'un compte avec son numéro de téléphone, attribution du rôle SELLER, liaison du `Vendor.userId`). Le `managedByLiaisonId` reste rempli — le Liaison continue d'apparaître comme accompagnateur.

**Q. J'ai créé une pièce par erreur, comment la supprimer ?**
R. Mettre le statut **ARCHIVED** via le bouton de modification (ou via l'admin Pièces). Les pièces archivées n'apparaissent plus dans la recherche publique mais restent dans l'historique.

**Q. Le vendeur veut changer sa commission après quelques semaines. Que faire ?**
R. Modifier la commission sur chaque pièce concernée, puis re-marquer agréée après accord oral. Pour un changement global du vendeur, contacter l'admin Pièces (il peut faire un update en masse).

**Q. Le numéro de téléphone du vendeur change. Comment mettre à jour ?**
R. Aller sur la fiche du vendeur → modifier le téléphone. Le système refusera si le nouveau numéro est déjà utilisé par un autre vendeur ou un autre utilisateur.

**Q. Je ne vois pas un vendeur que j'ai onboardé.**
R. Vérifier que `managedByLiaisonId` pointe bien sur votre compte. Si vous avez onboardé pour un autre Liaison ou un autre Liaison a repris le suivi, demander à l'admin de réassigner.

**Q. La page Modifier ne me laisse pas changer un champ.**
R. Seul l'état (Neuf/Occasion/Ré-usiné), le prix, la commission, la garantie, la compatibilité et le stock sont modifiables après création. Pour changer le nom ou la catégorie de manière significative, archiver et recréer.

**Q. Comment savoir si une commande est passée sur une pièce de mon vendeur ?**
R. Le tableau de bord Liaison n'expose pas encore les commandes ; passer par l'interface vendeur (se connecter avec le compte du vendeur si on le gère, ou demander au vendeur). Une intégration commandes dans l'espace Liaison est prévue.

---

## Annexe — Référence rapide des écrans

| Écran | URL |
|---|---|
| Tableau de bord Liaison | `/liaison` |
| Liste de mes vendeurs | `/liaison/vendors` |
| Onboarder un vendeur | `/liaison/vendors/new` |
| Détail d'un vendeur | `/liaison/vendors/[id]` |
| Ajouter une pièce | `/liaison/vendors/[id]/parts/new` |
| Modifier une pièce | `/liaison/vendors/[id]/parts/[partId]/edit` |
| Liste de toutes mes pièces saisies | `/liaison/parts` |

---

*Document interne Pièces — à conserver et à transmettre à tout nouveau Liaison rejoignant l'équipe.*
