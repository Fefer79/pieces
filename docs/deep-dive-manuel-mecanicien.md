# Manuel d'utilisation — Mécanicien Pièces

**Plateforme :** Pièces — Marketplace de pièces détachées automobiles
**Marché :** Côte d'Ivoire (Abidjan)
**Devise :** FCFA
**Version :** 2.0 — Septembre 2026

---

## Table des matières

1. [Votre compte et votre espace](#1-votre-compte-et-votre-espace)
2. [Se connecter](#2-se-connecter)
3. [Consentement ARTCI](#3-consentement-artci)
4. [Navigation dans l'application](#4-navigation-dans-lapplication)
5. [Le véhicule sélectionné et le garage](#5-le-véhicule-sélectionné-et-le-garage)
6. [Chercher une pièce](#6-chercher-une-pièce)
7. [Identifier une pièce par photo (IA)](#7-identifier-une-pièce-par-photo-ia)
8. [Décoder un numéro VIN](#8-décoder-un-numéro-vin)
9. [La fiche produit](#9-la-fiche-produit)
10. [Comparer les offres de plusieurs vendeurs](#10-comparer-les-offres-de-plusieurs-vendeurs)
11. [Pièces à importer : la précommande](#11-pièces-à-importer--la-précommande)
12. [Ma sélection (le panier)](#12-ma-sélection-le-panier)
13. [Frais de livraison : comment ils sont calculés](#13-frais-de-livraison--comment-ils-sont-calculés)
14. [Envoyer la commande / partager le lien](#14-envoyer-la-commande--partager-le-lien)
15. [La page de validation et de paiement](#15-la-page-de-validation-et-de-paiement)
16. [Paiement et séquestre](#16-paiement-et-séquestre)
17. [Statuts de commande](#17-statuts-de-commande)
18. [Suivi de l'acheminement d'une précommande](#18-suivi-de-lacheminement-dune-précommande)
19. [Livraison, réception et confirmation](#19-livraison-réception-et-confirmation)
20. [Garantie et socle de reprise](#20-garantie-et-socle-de-reprise)
21. [Évaluer un vendeur et une livraison](#21-évaluer-un-vendeur-et-une-livraison)
22. [Ouvrir un litige](#22-ouvrir-un-litige)
23. [Retours](#23-retours)
24. [Cotation d'import (logistique)](#24-cotation-dimport-logistique)
25. [L'annuaire des mécaniciens](#25-lannuaire-des-mécaniciens)
26. [Notifications WhatsApp](#26-notifications-whatsapp)
27. [Profil et gestion du compte](#27-profil-et-gestion-du-compte)
28. [Le parcours complet](#28-le-parcours-complet)
29. [Référence des endpoints](#29-référence-des-endpoints)
30. [Codes d'erreur](#30-codes-derreur)
31. [FAQ mécanicien](#31-faq-mécanicien)

---

## 1. Votre compte et votre espace

### Il n'y a plus de « rôle mécanicien »

Pièces ne classe plus ses utilisateurs en « mécanicien » et « propriétaire ». Tout nouveau
compte reçoit le rôle **BUYER**, présenté dans l'interface comme l'**Espace Achat**. C'est
l'espace que vous utilisez en tant que mécanicien.

**Ce qui a changé par rapport à la version 1 du manuel :** « qui paie » n'est plus déduit
d'un rôle. C'est un **choix explicite au moment de valider la sélection** : soit vous payez
vous-même, soit vous envoyez un lien de validation au propriétaire du véhicule. Un même
compte fait les deux, commande par commande.

### Les sept espaces

| Espace | Rôle technique | À qui |
|---|---|---|
| **Espace Achat** | `BUYER` | Vous. Recherche de pièces, commandes, véhicules. Activable seul, gratuit. |
| **Espace Vendeur** | `SELLER` | Vendeurs de pièces. Activable seul (onboarding KYC). |
| **Espace Flotte** | `ENTERPRISE` | Entreprises multi-véhicules. Activable seul. |
| **Espace Livreur** | `RIDER` | Livreurs partenaires. Attribué par Pièces. |
| **Espace Chauffeur** | `DRIVER` | Chauffeurs invités par leur entreprise. Attribué. |
| **Espace Liaison** | `LIAISON` | Agents terrain Pièces. Attribué. |
| **Administration** | `ADMIN` | Back-office Pièces. Attribué. |

Un même compte peut cumuler plusieurs espaces et basculer de l'un à l'autre depuis
**Profil → Mes espaces** (`/profile/espaces`). Les pages partagées — `/browse`, `/search`,
`/panier`, `/orders`, `/profile` — n'appartiennent à aucun espace : le contexte ne bascule
jamais dessus.

### Ce que vous faites sur la plateforme

- Trouver les pièces dont vos clients ont besoin (texte, marque/modèle/année/motorisation, photo IA, VIN)
- Comparer les offres de plusieurs vendeurs sur une même référence
- Constituer une sélection, choisir le lieu et le délai de livraison
- Payer vous-même, ou envoyer un lien de validation au propriétaire du véhicule
- Suivre la commande jusqu'à la livraison, confirmer la réception
- Évaluer le vendeur et le livreur, ouvrir un litige si nécessaire
- Optionnellement : inscrire votre atelier dans l'annuaire public des mécaniciens

---

## 2. Se connecter

Quatre façons d'accéder à votre compte. Toutes aboutissent au **même compte** : un
utilisateur = un enregistrement, quel que soit le canal.

### 2.1 Email + mot de passe

**Page :** `/login`

1. Saisir votre adresse email
2. Saisir votre mot de passe
3. **« Se connecter »**

En cas d'oubli, le lien **« Mot de passe oublié »** (`/forgot-password`) envoie un lien de
réinitialisation par email, qui ouvre `/reset-password`.

### 2.2 Créer un compte

**Page :** `/register`

Email + mot de passe + confirmation. Un email de confirmation est envoyé ; le lien active le
compte via `/auth/callback`. Le mot de passe fait **6 caractères minimum**.

### 2.3 Google

Bouton **« Continuer avec Google »** sur `/login`. Si l'échange échoue, l'application affiche
« La connexion avec Google a échoué. Réessayez, ou connectez-vous avec votre email. »

### 2.4 WhatsApp (OTP inversé)

**Page :** `/login/whatsapp`

C'est le chemin le plus rapide sur un téléphone, et il ne dépend pas d'un SMS.

1. Saisir votre numéro à 10 chiffres (préfixe **+225** pré-rempli, préfixes acceptés **01**, **05**, **07**)
2. L'application génère un **code** et un lien `wa.me` vers le numéro WhatsApp de Pièces
3. Vous envoyez ce code par WhatsApp depuis votre propre numéro
4. La page interroge le serveur toutes les 3 secondes ; dès réception du message, vous êtes connecté

Si le code expire, le message « Le code a expiré. Veuillez recommencer. » s'affiche et vous
revenez à l'étape du numéro.

> **Note d'exploitation :** l'activation en production dépend des variables
> `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` et `WHATSAPP_BUSINESS_NUMBER` côté serveur.

### 2.5 Redirection après connexion

Si vous arrivez sur `/login` depuis une page protégée, le paramètre `returnTo` vous y ramène
après authentification. Sinon la destination par défaut est `/browse`.

---

## 3. Consentement ARTCI

À la première connexion, une fenêtre modale bloque l'accès à l'application.

**Contenu affiché :**

- Référence à la **loi n°2013-450** relative à la protection des données à caractère personnel en Côte d'Ivoire
- Données collectées : numéro de téléphone (identification), historique de transactions (suivi des commandes), photos de pièces (identification)
- Vos droits : consulter vos données et demander leur suppression à tout moment

**Action :** bouton **« J'accepte »**. Tant que le consentement n'est pas enregistré, la
garde `requireConsent` refuse les appels API avec le code `CONSENT_REQUIRED`.

La date de consentement est consultable dans **Profil → Mes données** (`/profile/data`).

---

## 4. Navigation dans l'application

### 4.1 Barre de navigation basse (mobile)

Les onglets dépendent de votre espace actif. En **Espace Achat** :

| Onglet | Page | Description |
|---|---|---|
| **Accueil** | `/` | Page d'accueil / recherche |
| **Sélection** | `/panier` | Votre panier, avec le nombre d'articles en pastille |
| **Commandes** | `/orders` | Historique de vos commandes |
| **Profil** | `/profile` | Compte et paramètres |

Non connecté, la barre affiche : Accueil · Sélection · Info · Connexion.

### 4.2 Menu latéral (mobile)

Le tiroir donne accès à : Entreprises & flottes (`/entreprises`), Logistique (`/logistique`),
À propos, Comment ça marche, Contact, Mon tableau de bord (`/dashboard`), Mon profil,
Mes véhicules (`/vehicles`), Mes commandes (`/orders`).

### 4.3 Les trois univers

Une barre « univers » relie les trois faces de la plateforme :

| Univers | Entrée | Pour quoi |
|---|---|---|
| **Marketplace** | `/browse` | Acheter des pièces disponibles ou à importer |
| **Flotte** | `/entreprises` | Gestion multi-véhicules pour entreprises |
| **Logistique** | `/logistique` | Faire venir une pièce introuvable à Abidjan |

### 4.4 Tableau de bord

**Page :** `/dashboard` — vue synthétique : nombre total de commandes, commandes en cours,
commandes terminées, vos 5 dernières commandes, vos véhicules, le nombre d'articles en
sélection.

---

## 5. Le véhicule sélectionné et le garage

### 5.1 Le véhicule sélectionné

Vous pouvez fixer un **véhicule courant** (marque, modèle, année, motorisation). Il est
conservé côté navigateur et sert à :

- **filtrer strictement** les résultats de recherche par compatibilité (fitments)
- pré-remplir les filtres de `/search`
- afficher sur chaque fiche produit un bandeau de compatibilité :
  - ✅ « Compatible avec votre Toyota Hilux 2012 »
  - 🌐 « Pièce compatible universelle — s'adapte à tous les véhicules »
  - ⚠️ « Compatibilité non confirmée avec votre … »

Les catégories universelles (**Accessoires & équipements**, **Outillage & entretien**,
**Fluides & consommables**) contournent le filtre strict : elles restent visibles quel que
soit le véhicule sélectionné.

### 5.2 Le garage

**Page :** `/vehicles`

Sauvegardez les véhicules de vos clients réguliers.

| Champ | Règle |
|---|---|
| **Marque** | Obligatoire |
| **Modèle** | Obligatoire |
| **Année** | Obligatoire — de 1980 à l'année courante + 1 |
| **Motorisation** | Optionnelle, choisie dans la liste des motorisations connues du modèle |
| **VIN** | Optionnel, exactement 17 caractères (majuscules, I/O/Q filtrés) |

**Limite : 5 véhicules.** Au-delà, le message « Limite de 5 véhicules atteinte » s'affiche et
l'API répond `VEHICLE_LIMIT_REACHED`. Supprimez-en un pour en ajouter un autre.

Chaque véhicule propose **« Chercher pièces »** (ouvre `/browse/{marque}/{modèle}/{année}`)
et **« Supprimer »**. Vous ne voyez et ne supprimez que vos propres véhicules.

### 5.3 Véhicule rattaché à une commande

Si vous rattachez un véhicule à une commande, la commande est associée à son **suivi de
coûts**. Quand le véhicule appartient à une **entreprise** dont vous êtes membre, le palier
d'abonnement de cette entreprise s'applique aux frais de livraison (voir §13). Le panier
affiche alors : « Commande pour *Toyota Hilux* — rattachée au suivi de coûts du véhicule »,
avec un bouton **« Détacher »**.

---

## 6. Chercher une pièce

Quatre chemins : texte, arborescence véhicule, photo, VIN.

### 6.1 Recherche par filtres — `/search`

C'est l'écran de recherche principal. Tous les filtres sont dans l'URL, donc partageables.

| Filtre | Valeurs |
|---|---|
| **Texte** (`q`) | Nom, référence OEM, catégorie, compatibilité |
| **Véhicule** | marque / modèle / année / motorisation |
| **Catégorie** | les 32 catégories du référentiel |
| **État** (multi-choix) | Neuf · Occasion importée · Ré-usiné |
| **Disponibilité** | **Disponible à Abidjan** (livraison 48–72 h) · **À importer** (précommande, 5 j à 8 semaines) |
| **Prix** | minimum / maximum en FCFA |
| **Tri** | Les plus récents · Prix croissant · Prix décroissant |

**Pagination :** 20 résultats par page par défaut, 100 au maximum.

**Repli automatique sur l'import :** si votre recherche ne ramène rien en local, la page
compte silencieusement les pièces correspondantes **à importer** et vous propose d'y basculer
en un clic.

**Ordre par défaut :** le stock local passe systématiquement avant l'import — une pièce
livrable en heures ne se compare pas à une pièce à faire venir.

### 6.2 Recherche textuelle

- Déclenchement automatique après **300 ms** de saisie, **2 caractères** minimum
- Correction des fautes de frappe via un dictionnaire de synonymes (pg_trgm)
- **Autocomplétion** : l'endpoint `/browse/suggest` propose des noms de pièces, restreints au
  véhicule sélectionné s'il y en a un

### 6.3 Navigation par véhicule

`/browse` → `/browse/[marque]` → `/browse/[marque]/[modèle]` → `/browse/[marque]/[modèle]/[année]`

Le référentiel véhicules porte, pour chaque modèle, les **motorisations avec leurs plages
d'années**. Vous pouvez donc affiner jusqu'à la motorisation, ce qui élimine les pièces d'une
autre version du même modèle.

### 6.4 Les 32 catégories

Moteur · Distribution · Allumage · Alimentation carburant · Admission & turbo · Échappement ·
Refroidissement · Lubrification · Filtration · Embrayage · Transmission · Boîte de vitesses ·
Freinage · Suspension · Direction · Roues & pneus · Électrique & batterie · Démarrage & charge ·
Capteurs & calculateurs · Éclairage & signalisation · Climatisation & chauffage ·
Essuie-glace & lave-glace · Vitrage · Carrosserie extérieure · Carrosserie intérieure ·
Sièges & sellerie · Serrurerie & sécurité · Audio & multimédia · Navigation & connectivité ·
Accessoires & équipements · Outillage & entretien · Fluides & consommables

Chaque catégorie se décline en sous-catégories ; le champ affiché sur une annonce est la
chaîne combinée **« Catégorie / Sous-catégorie »**.

### 6.5 Ce que montre un résultat

Miniature · nom · catégorie · **chip d'état** (Neuf / Occasion importée / Ré-usiné / OEM /
Aftermarket) · **chip de disponibilité** (à Abidjan / à importer) · nom de la boutique · prix
en FCFA.

Seules les pièces **publiées**, **en stock** et de **vendeurs actifs** apparaissent.

---

## 7. Identifier une pièce par photo (IA)

**Page :** `/browse/photo` — endpoint public, aucun compte requis.

L'analyse est faite par **Google Gemini 2.0 Flash**.

### Comment faire

1. Appuyer sur la zone de capture
2. Sur mobile : la caméra arrière s'ouvre ; sur ordinateur : sélection de fichier
3. L'IA analyse la photo

**Conseils :** bonne lumière · pièce entière dans le cadre · fond uni.

**Formats :** JPEG (.jpg, .jpeg), PNG, WebP — **5 Mo maximum** (`FILE_TOO_LARGE`,
`INVALID_FILE_TYPE`).

### Les trois issues

| Confiance | Résultat | Ce que vous voyez |
|---|---|---|
| **≥ 0,70** | Identifiée | Bandeau vert : nom, catégorie, référence OEM, compatibilité, prix suggéré, taux de confiance — puis la liste des pièces correspondantes du catalogue |
| **0,30 – 0,70** | Désambiguïsation | Bandeau ambre : jusqu'à 5 catégories candidates en grille ; vous choisissez la bonne et la recherche est relancée dessus |
| **< 0,30** | Échec | Bandeau ambre : lien vers la recherche par marque, invitation à reprendre une meilleure photo |

Un **filtre véhicule** optionnel (marque / modèle / année) restreint les correspondances à
votre véhicule.

---

## 8. Décoder un numéro VIN

**Page :** `/browse/vin`

Le VIN est le numéro à 17 caractères gravé sur le véhicule.

1. Saisir les 17 caractères — conversion automatique en majuscules, caractères invalides
   (I, O, Q) filtrés, compteur « 14/17 caractères »
2. Le bouton **« Décoder »** s'active au 17ᵉ caractère
3. Le service interroge **NHTSA VPIC**, puis recoupe avec le référentiel véhicules Pièces

**Ce que le décodage donne :** marque, modèle, **millésime** et, quand c'est possible, la
**motorisation**. Le référentiel interne sert de second tamis : il lève l'ambiguïté du
millésime sur les VIN non américains et réduit une liste de seize motorisations à une ou deux
en croisant cylindrée, puissance et carburant. Si le VIN n'est pas décodable, le millésime le
plus récent que le code autorise est présenté comme **probable**, pas comme acquis.

Un bouton **« Chercher des pièces pour ce véhicule → »** enchaîne sur la recherche filtrée.

**Où trouver le VIN :** plaque visible à travers le pare-brise côté conducteur · montant de
la portière conducteur · carte grise.

> L'endpoint est limité à **20 appels par minute** (proxy vers un service tiers).

---

## 9. La fiche produit

**Page :** `/produit/[id]`

La fiche est organisée pour décider, pas pour lire.

1. **Bandeau de compatibilité** avec votre véhicule sélectionné (voir §5.1)
2. **Titre, catégorie et chips** : état, disponibilité, source de la pièce (OEM / Aftermarket…),
   garantie, « Rupture de stock » le cas échéant
3. **Encart « pièce à importer »** si la pièce n'est pas à Abidjan (voir §11)
4. **Bloc vendeur** : étoiles (note moyenne des avis vérifiés) d'abord, nombre d'avis, puis
   « Vendu par *nom de boutique* » en discret. **Le téléphone du vendeur n'est jamais exposé**
   à un acheteur, y compris sur les annonces issues de sources externes.
5. **Galerie photo** : photos dédiées, sinon l'image principale de la fiche, avec vignettes
6. **Quantité**, **lieu de livraison** (commune d'Abidjan) et **délai** — les trois modes sont
   chiffrés en direct
7. **Décomposition du prix** : prix pièce × quantité, fret et douane s'il s'agit d'un import,
   livraison, total. Aucune ligne cachée.
8. **Deux actions** : **« Ajouter à la sélection »** et **« Acheter maintenant »** (crée la
   commande et vous emmène droit au paiement ; vous redirige vers `/login` si nécessaire)
9. **Caractéristiques** : référence OEM, socle de reprise
10. **Véhicules compatibles** : la liste des fitments (marque, modèle, plage d'années, motorisation)
11. **Autres vendeurs pour cette pièce** (voir §10)
12. **CTA WhatsApp** : « Une question ? Commander via WhatsApp », message pré-rempli avec le
    nom de la pièce et sa référence

Si la pièce est en rupture, un encart propose de **demander une cotation d'import**
(`/logistique/devis`), pré-rempli avec le nom et la référence.

---

## 10. Comparer les offres de plusieurs vendeurs

Quand plusieurs vendeurs proposent la **même référence OEM**, la fiche affiche
« *N* autres vendeurs pour cette pièce ».

**Deux tris :**

- **Qualité-prix** (par défaut) — un score sur 100 calculé relativement aux autres offres du groupe
- **Prix** — du moins cher au plus cher

Le score de qualité-prix combine :

| Composante | Rôle |
|---|---|
| **Prix** | Poids dominant — 1 pour l'offre la moins chère, décroissant ensuite |
| **Note vendeur** | 0–100 ramené à 0–1 ; 0,5 par défaut pour un vendeur pas encore noté |
| **Garantie** | Durée relative, normalisée en jours |
| **Type de pièce** | Bonus de fiabilité pour l'OEM et l'aftermarket reconnu |

L'offre au meilleur rapport porte le badge **« Meilleur rapport »** dans les deux tris. Une
pièce disponible localement est toujours classée avant une pièce à importer, avant même le
prix.

---

## 11. Pièces à importer : la précommande

Certaines références ne sont pas à Abidjan : elles sont en stock chez un partenaire
international. Vous **précommandez**, Pièces achète, achemine et dédouane.

### Ce que la fiche annonce avant le prix

> « Pièce neuve à faire venir en Côte d'Ivoire. Cette référence est en stock chez un
> partenaire international (Allemagne). Elle n'est pas à Abidjan aujourd'hui : vous
> précommandez, nous l'achetons, l'acheminons et la dédouanons pour vous. »

Le délai estimé cumule la **préparation chez le partenaire** et le **transit**.

### Les trois acheminements

| Mode | Libellé client | Délai de transit |
|---|---|---|
| `SEA_LCL` | **Bateau (groupage)** | 6 à 8 semaines |
| `AIR_ECONOMY` | **Avion économique** | 10 à 15 jours |
| `AIR_NOW` | **Avion express** | 5 à 8 jours |

Un mode impraticable pour le colis (bateau sur une bougie, avion sur une batterie) est
affiché **grisé avec son motif**, jamais masqué. Si vous en choisissez un qui devient
impraticable, le serveur bascule sur la première option disponible plutôt que de vendre un
acheminement impossible.

> Le bateau divise le coût, l'avion divise l'attente.

### Les quatre lignes du prix

1. **Prix de la pièce**
2. **Fret** — selon l'acheminement retenu, calculé sur le poids taxable (poids réel ou
   volumétrique, borne haute de la famille logistique si le poids n'est pas renseigné)
3. **Droits de douane** — calculés sur la **valeur d'achat réelle** chez le partenaire, pas
   sur le prix de vente. Une douane calculée sur notre prix public serait une marge cachée
   déguisée en taxe.
4. **Livraison locale** à votre commune, après dédouanement

### L'échéancier : acompte puis solde

Une précommande se règle **en deux temps** :

| Étape | Quand | Quoi |
|---|---|---|
| **Acompte** | À la commande | Finance l'achat chez le partenaire et le fret |
| **Solde** | Une fois la pièce **dédouanée à Abidjan** | Le reste, livraison locale comprise |

Les deux montants sont affichés **avant** l'ajout au panier, dans un encart sombre :
« À payer aujourd'hui — acompte » / « Solde à l'arrivée à Abidjan ».

**La contrepartie :** *si le partenaire ne peut finalement pas fournir la pièce, votre acompte
vous est intégralement remboursé.* L'acompte reste sous séquestre jusque-là.

### Règle : pas de panier mixte

Une commande est **entièrement locale** ou **entièrement d'import**. Les deux n'ont ni le
même échéancier ni le même délai ; les mélanger bloquerait des pièces disponibles en
attendant un bateau. Le panier vous en avertit :

> « Deux commandes séparées sont nécessaires. Retirez l'un des deux groupes pour continuer,
> puis passez la seconde commande. »

Code d'erreur côté API : `ORDER_MIXED_SUPPLY_MODE`.

Le paiement à la livraison n'est pas proposé sur une précommande
(`ORDER_COD_UNAVAILABLE_ON_PREORDER`) : il n'y a rien à livrer tant que la marchandise n'est
pas achetée.

---

## 12. Ma sélection (le panier)

**Page :** `/panier`

### Panier hybride

Le panier vit dans votre navigateur **et** sur le serveur :

- À l'ouverture, si vous êtes connecté, le **brouillon serveur** est fusionné dans le panier local
- Chaque modification est repoussée vers le serveur après **800 ms** de calme
- Vous retrouvez donc votre sélection en changeant d'appareil
- Vider le panier supprime le brouillon serveur

### Ce que la page affiche

- **Lignes groupées par vendeur**, avec le sous-total de chaque vendeur — chacun expédie séparément
- Pour chaque ligne : miniature, nom (lien vers la fiche), catégorie, **chips** état /
  disponibilité / source, sélecteur de quantité, prix × quantité, lien **« Retirer »**
- Le **véhicule rattaché**, avec un bouton « Détacher »
- **Lieu de livraison** : liste des communes d'Abidjan
- **Mode de livraison** : Économique / Standard / Express, chacun **chiffré**
- Pour un panier d'import : **acheminement depuis l'étranger** et **échéancier**
- **Décomposition du prix** et total
- **« Qui paie cette commande ? »**

### Qui paie : le choix explicite

| Option | Effet |
|---|---|
| **Je paie moi-même** | La commande est créée et vous êtes emmené directement sur la page de paiement |
| **Le propriétaire du véhicule** | La commande est créée et un **lien de validation** vous est remis à partager |

C'est ce choix, et non votre rôle, qui détermine le déroulé. Le bouton d'action change en
conséquence : « Procéder au paiement », « Précommander et payer l'acompte » ou
« Envoyer au propriétaire ».

### Contrôles à la création

| Contrôle | Message |
|---|---|
| Au moins un article valide | `ORDER_NO_VALID_ITEMS` |
| Pièces publiées et en stock | — |
| Quantité ≤ stock suivi | « Stock insuffisant pour « X » : 2 disponible(s), 3 demandée(s) » (`ORDER_INSUFFICIENT_STOCK`) |
| Pas de panier mixte local/import | `ORDER_MIXED_SUPPLY_MODE` |
| Véhicule accessible | `VEHICLE_FORBIDDEN` / `VEHICLE_NOT_FOUND` |

**Le prix est figé (snapshot) à la création de la commande.** Si le vendeur change son prix
ensuite, votre commande garde le prix initial.

---

## 13. Frais de livraison : comment ils sont calculés

Le calcul est **identique côté page et côté serveur** : le montant affiché est exactement
celui qui sera facturé.

### La formule

```
frais par vendeur = max( taux × sous-total du vendeur , plancher de zone × facteur de gabarit )
frais commande    = min( somme des frais par vendeur , plafond du mode )
```

Trois variables : **le montant**, **l'encombrement**, **le délai**.

### Les trois délais

| Mode | Libellé | Délai |
|---|---|---|
| `ECO` | Économique | 3 à 5 jours |
| `STANDARD` | Standard | 48 à 72 h |
| `EXPRESS` | Express | prioritaire, dans la journée |

### Le gabarit

Dérivé de la catégorie de la pièce ; c'est la pièce **la plus encombrante** du vendeur qui
dicte le véhicule à mobiliser.

| Gabarit | Libellé | Transport | Facteur |
|---|---|---|---|
| **S** | Petit colis | sacoche moto | × 1 |
| **M** | Colis moyen | top-case | × 1,3 |
| **L** | Volumineux | coffre / tricycle | × 1,8 |
| **XL** | Hors gabarit | utilitaire | × 2,5 |

Exemples : Filtration et Allumage → S ; Freinage et Distribution → M ; Suspension et
Échappement → L ; Moteur, Boîte de vitesses, Vitrage → XL.

### La zone

Dérivée de la commune : centre · intermédiaire · périphérie.

### Les paliers (abonnement de l'entreprise du véhicule rattaché)

| Palier | Taux STANDARD | Plancher STANDARD (centre → périphérie) | Plafond STANDARD |
|---|---|---|---|
| **Gratuit** | 3 % | 1 500 → 2 500 F | 9 000 F |
| **Flotte Pro** | 2 % | 1 000 → 2 000 F | 5 000 F |
| **Flotte Pro +** | 0 % | 0 F | **Livraison offerte** |

En Économique les taux sont 2 % / 1,5 % / 0 % (plafonds 6 000 / 4 000 / 0 F) ; en Express
6 % / 4 % / 0 % (plancher 5 000 F, plafonds 19 900 / 9 900 / 0 F).

Sans véhicule d'entreprise rattaché, le palier est **Gratuit**. Le palier effectif est résolu
côté serveur (`/orders/delivery-context`) : le client ne le décide jamais.

### Règle bloquante

**Sans commune de livraison, pas de paiement.** Le serveur refuse avec
`ORDER_DELIVERY_COMMUNE_REQUIRED` — sans commune, les frais valent zéro et la commande
partirait sans destination facturée.

---

## 14. Envoyer la commande / partager le lien

### Le flux tripartite

```
MÉCANICIEN                  PROPRIÉTAIRE               VENDEUR
(trouve la pièce)           (valide et paie)           (confirme et prépare)
     │                            │                          │
     ▼                            │                          │
Constitue la sélection            │                          │
Choisit commune + délai           │                          │
Choisit « qui paie »              │                          │
     │                            │                          │
     ├── Partage le lien ────────►│                          │
     │   (WhatsApp / SMS)         │                          │
     │                            ▼                          │
     │                    Ouvre /choose/{token}              │
     │                    Voit le détail du prix             │
     │                    Ajuste commune / délai             │
     │                    Choisit son paiement et paie       │
     │                            │                          │
     │                            ├── Alerte WhatsApp ──────►│
     │                            │                   Confirme (45 min)
     │◄─── Livraison ─────────────┴──────────────────────────┘
```

### Le lien

Format : `https://pieces.ci/choose/{shareToken}`

Le token est un secret de 32 caractères hexadécimaux généré à la création. Il fait office de
**preuve de possession** : celui qui l'a peut consulter la commande, changer la livraison,
payer, annuler et confirmer la réception — **sans compte**.

L'écran de confirmation vous propose d'**ouvrir** la page de validation, de **copier** le
lien (bouton « Copier » → « Copié ✓ »), ou de démarrer une **nouvelle sélection**.

### Devis PDF

Un devis PDF de la commande est téléchargeable par le titulaire du compte :
`GET /api/v1/orders/{orderId}/devis.pdf`.

---

## 15. La page de validation et de paiement

**Page :** `/choose/[shareToken]` — publique.

### Le titre s'adapte

| Situation | Titre affiché |
|---|---|
| Vous payez vous-même | « Validez et payez votre sélection » |
| Lien envoyé au propriétaire | « Votre mécanicien vous demande d'approuver » |

### Ce que le payeur peut faire tant que la commande est en **DRAFT**

| Action | Détail |
|---|---|
| **Choisir la commune** | « Où souhaitez-vous être livré ? » — le serveur re-tarife |
| **Choisir le délai** | Économique / Standard / Express, chacun avec son prix exact |
| **Choisir l'acheminement** (import) | Bateau / Avion éco / Avion express — re-calcule fret, douane et échéancier |
| **Choisir le moyen de paiement** | voir §16 |
| **Payer** | Le bouton affiche le montant : « Payer 47 500 FCFA » ou « Payer l'acompte » |
| **Annuler** | Possible aussi en PAID et VENDOR_CONFIRMED |

Après paiement, la livraison est verrouillée (`ORDER_DELIVERY_LOCKED`).

### Ce que le payeur voit

- **Les articles**, avec pour chacun la **garantie annoncée pièce par pièce**
  (« Garantie 3 mois » ou « Sans garantie commerciale »)
- **Le socle de reprise** (voir §20)
- **Le détail, avant de payer** : Pièces · Main-d'œuvre · Fret · Douane · Livraison · **Total**
- La mention : « **Paiement sous séquestre.** L'argent n'est libéré au vendeur qu'après
  confirmation de livraison. Aucune marge cachée. »
- Pour une précommande : « **Acompte sous séquestre.** Si la pièce s'avère indisponible, il
  vous est intégralement remboursé. »

---

## 16. Paiement et séquestre

### Les moyens de paiement

| Moyen | Type | Condition |
|---|---|---|
| **Orange Money** | Mobile money | Toujours |
| **MTN MoMo** | Mobile money | Toujours |
| **Wave** | Mobile money — « Frais 0 FCFA » | Toujours |
| **Espèces à la livraison** | COD | Seulement si le montant dû ≤ **75 000 FCFA** et hors précommande |

Passerelle : **CinetPay**. Le paiement mobile place la commande en `PENDING_PAYMENT` ; le
webhook CinetPay la fait passer en `PAID` après vérification du montant. Le COD passe
directement en `PAID`.

Au-delà de 75 000 F en espèces : `ORDER_COD_LIMIT`.

### Le séquestre

Les fonds encaissés sont placés en séquestre (`EscrowTransaction`, statut **HELD**) :

- **RELEASED** — libérés au vendeur après confirmation de la livraison
- **REFUNDED** — remboursés en cas d'annulation ou de litige tranché en faveur de l'acheteur

Pour une précommande, l'acompte et le solde donnent chacun leur transaction. L'annulation
d'une précommande rembourse **intégralement** tout ce qui a été encaissé, **avant** de passer
la commande en annulée.

### Ce qui se déclenche au passage en PAID

1. Émission de la **facture** (idempotente)
2. **Décrémentation du stock** des pièces à quantité suivie, et alerte aux vendeurs sous le seuil
3. **Alerte WhatsApp à chaque vendeur** concerné, avec son propre nombre de pièces
4. Le vendeur a **45 minutes** pour confirmer

Une annulation après paiement **restitue** le stock consommé.

### Consulter le paiement

`GET /api/v1/orders/{orderId}/escrow` — montant, statut, dates.

---

## 17. Statuts de commande

### Les treize statuts

| Statut | Libellé | Signification |
|---|---|---|
| `DRAFT` | Brouillon | Commande créée, en attente de validation / paiement |
| `PENDING_PAYMENT` | En attente de paiement | Paiement mobile money initié |
| `DEPOSIT_PAID` | Acompte reçu | *(précommande)* achat lancé chez le partenaire |
| `IN_IMPORT` | En acheminement | *(précommande)* la marchandise a quitté le partenaire |
| `AWAITING_BALANCE` | Solde à régler | *(précommande)* pièce dédouanée à Abidjan |
| `PAID` | Payée | Paiement complet reçu ; le vendeur est alerté |
| `VENDOR_CONFIRMED` | Confirmée vendeur | Le vendeur a confirmé la disponibilité |
| `DISPATCHED` | Expédiée | Livreur en route vers le vendeur |
| `IN_TRANSIT` | En transit | Pièce en cours de livraison |
| `DELIVERED` | Livrée | Pièce remise |
| `CONFIRMED` | Confirmée | Réception confirmée |
| `COMPLETED` | Terminée | Fonds libérés au vendeur |
| `CANCELLED` | Annulée | Commande annulée |

Les trois statuts d'import sont **réservés aux précommandes** : une commande standard qui
tenterait d'y entrer est refusée (`ORDER_INVALID_TRANSITION`).

### Transitions autorisées

```
DRAFT            → PENDING_PAYMENT · PAID (COD) · DEPOSIT_PAID · CANCELLED
PENDING_PAYMENT  → PAID · DEPOSIT_PAID · CANCELLED
DEPOSIT_PAID     → IN_IMPORT · CANCELLED
IN_IMPORT        → AWAITING_BALANCE · CANCELLED
AWAITING_BALANCE → PAID · CANCELLED
PAID             → VENDOR_CONFIRMED · CANCELLED
VENDOR_CONFIRMED → DISPATCHED · CANCELLED
DISPATCHED       → IN_TRANSIT
IN_TRANSIT       → DELIVERED
DELIVERED        → CONFIRMED · COMPLETED (libération automatique à 24 h)
CONFIRMED        → COMPLETED
```

**Annulation possible** en DRAFT, PENDING_PAYMENT, PAID, VENDOR_CONFIRMED — et, pour une
précommande, à chaque étape d'import. Une fois expédiée, l'annulation n'est plus possible
(`ORDER_CANNOT_CANCEL`).

### Suivre ses commandes — `/orders`

| Fonction | Détail |
|---|---|
| **Filtres** | Tous · Brouillon · En cours · Livré · Annulé, avec compteur par onglet |
| **Recherche** | Filtre prédictif sur le nom des pièces de vos commandes |
| **Chaque ligne** | Identifiant court (8 caractères), date, articles avec chips état/disponibilité, vendeur, total, badge de statut, statut de livraison |
| **Pagination** | Précédent / Suivant, indicateur Page X / Y |

---

## 18. Suivi de l'acheminement d'une précommande

Dès qu'une expédition est enregistrée, la page `/choose/{token}` affiche un **fil de suivi** :

- La **référence** de l'expédition
- L'**arrivée estimée** (« Arrivée estimée le 14 octobre »)
- La **chronologie des étapes** : libellé, lieu, date — départ du partenaire, transit,
  dédouanement, arrivée

Tant qu'aucune étape n'est enregistrée : « Expédition enregistrée. Les étapes s'afficheront
ici dès le départ de la marchandise. »

Ni les coûts logistiques internes ni l'identité du transitaire ne sont exposés.

### Les messages d'étape

| Statut | Message affiché |
|---|---|
| `DEPOSIT_PAID` | « Acompte reçu — achat lancé. Nous passons commande chez notre partenaire. » |
| `IN_IMPORT` | « Pièce en acheminement. Prochaine étape : dédouanement à Abidjan. » |
| `AWAITING_BALANCE` | « Pièce arrivée — solde à régler. Il reste *X* FCFA à régler, livraison comprise, pour déclencher la remise. » |

Le solde se règle depuis la même page (`POST /orders/{id}/pay-balance`) et n'est appelable
qu'en `AWAITING_BALANCE` (`ORDER_BALANCE_NOT_DUE`).

---

## 19. Livraison, réception et confirmation

### Suivi de livraison

`GET /api/v1/deliveries/order/{orderId}` — endpoint public.

| Statut | Description |
|---|---|
| `PENDING_ASSIGNMENT` | En attente d'assignation d'un livreur |
| `ASSIGNED` | Livreur assigné |
| `PICKUP_IN_PROGRESS` | Livreur en route vers la boutique du vendeur |
| `IN_TRANSIT` | Pièce en cours de livraison |
| `DELIVERED` | Pièce livrée |

Informations disponibles : adresse de collecte, adresse de livraison, mode, montant COD à
collecter, indicateur « client absent », et **coordonnées GPS du livreur** mises à jour en
temps réel pendant la course.

### Confirmer la réception

Après livraison, la page affiche « Livré — en attente de confirmation. Confirmez la réception
pour libérer le paiement au vendeur. »

- **Manuellement** : `POST /orders/{id}/confirm-receipt` avec le shareToken — la commande
  passe en `CONFIRMED`
- **Automatiquement** : un balayage (`ORDER_AUTO_CONFIRM_SCAN`) passe en confirmé toute
  commande **livrée depuis plus de 24 h** sans litige ouvert ou en cours d'examen

Ce délai de 24 h est exactement celui du socle de reprise : c'est votre fenêtre pour signaler
une non-conformité.

---

## 20. Garantie et socle de reprise

### La garantie est décidée pièce par pièce

Depuis le contrat vendeur v1.2, la garantie n'est **plus un standard imposé** par la
plateforme. Le vendeur la fixe sur chaque pièce, en jours, semaines ou mois — et peut n'en
accorder aucune.

Conséquence dans l'interface : une pièce sans garantie affiche « **Sans garantie
commerciale** », jamais une garantie par défaut trompeuse. La garantie est figée dans la
commande (snapshot) : ce qui a été promis à l'achat reste opposable.

### Le socle de reprise, dû sur chaque vente

> **Reprise garantie, même sans garantie commerciale**
>
> - La livraison n'a pas pu être effectuée.
> - Vous refusez la pièce à la livraison : elle ne correspond pas à l'annonce.
> - Non-conformité à l'annonce signalée dans les **24 h** suivant la livraison.

Ce socle est affiché sur la fiche produit et sur la page de paiement, du même texte source
que celui présenté au vendeur.

---

## 21. Évaluer un vendeur et une livraison

### Évaluer un vendeur

| Condition | Règle |
|---|---|
| Qui | L'**initiateur** de la commande |
| Quand | Commande en `DELIVERED`, `CONFIRMED` ou `COMPLETED` |
| Unicité | Un avis par commande et par vendeur |
| Note | 1 à 5 étoiles, obligatoire |
| Commentaire | Jusqu'à 1 000 caractères, optionnel |

Les avis sont **publics** : les 50 plus récents, la note moyenne (1 décimale) et le total.
Ce sont ces avis qui alimentent les étoiles de la fiche produit — chacun est rattaché à une
commande réelle, donc **vérifié**.

Chaque commande livrée déclenche aussi un **recalcul du score** de tous les vendeurs qui y
figurent.

### Évaluer une livraison

Mêmes règles, avec la livraison en `DELIVERED` ou `CONFIRMED`. Les avis livreurs sont
également publics.

---

## 22. Ouvrir un litige

| Élément | Règle |
|---|---|
| Qui | Un **participant** de la commande |
| Raison | 5 à 2 000 caractères |
| Accès au détail | Participants de la commande et administrateurs uniquement |

### Cycle de vie

| Statut | Signification |
|---|---|
| `OPEN` | Litige ouvert |
| `UNDER_REVIEW` | En cours d'examen par un administrateur |
| `RESOLVED_BUYER` | Tranché en votre faveur → remboursement |
| `RESOLVED_SELLER` | Tranché en faveur du vendeur → fonds libérés |
| `CLOSED` | Clôturé |

**Effet de bord utile :** tant qu'un litige est `OPEN` ou `UNDER_REVIEW`, la confirmation
automatique à 24 h est suspendue — les fonds restent sous séquestre.

---

## 23. Retours

Un retour peut être ouvert sur une commande livrée
(`POST /api/v1/returns`, puis `GET /api/v1/returns/mine`).

Chaque retour suit sa propre machine d'états ; une transition invalide est refusée
(`INVALID_RETURN_TRANSITION`). Les transitions de traitement sont réservées au vendeur et à
l'administration. Le remboursement, quand il est prononcé, passe par le séquestre.

---

## 24. Cotation d'import (logistique)

Quand la pièce n'existe nulle part dans le catalogue, l'univers **Logistique** prend le
relais.

**Page :** `/logistique/devis` — **sans compte, sans engagement**.

- Le **nom de la pièce suffit** pour démarrer
- Plus vous ajoutez de preuves (**VIN**, **photos**, carte grise), plus le devis confirmé est précis
- Jusqu'à un nombre borné de photos (`LOGISTICS_MAX_PHOTOS` au-delà)
- **Estimation immédiate**, devis confirmé par WhatsApp sous deux heures ouvrées
- Une **référence** est attribuée ; le suivi public est accessible à
  `/logistique/suivi/{reference}`

**Pages voisines :** `/logistique` (présentation), `/logistique/comment-ca-marche`,
`/logistique/calculateur`, `/logistique/faq`, `/logistique/flottes-vtc`.

### Retrouver vos cotations

**Page :** `/profile/cotations`

| Statut | Libellé |
|---|---|
| `NEW` | Nouveau |
| `CONTACTED` | Contacté |
| `QUOTING` | En cotation |
| `QUOTED` | Devis envoyé |
| `WON` | Accepté |
| `LOST` | Refusé |

Chaque ligne affiche la référence, la pièce, le véhicule, le **niveau de certitude** de
l'estimation (Faible / Moyen / Élevé) et la date.

---

## 25. L'annuaire des mécaniciens

Pièces héberge un **annuaire public ouvert** de mécaniciens et garages en Côte d'Ivoire —
inscrits par eux-mêmes, recommandés par leurs clients. C'est une fonctionnalité distincte de
l'Espace Achat : votre fiche d'atelier n'est pas votre compte.

### Chercher un mécanicien — `/mecaniciens`

- **« Près de moi »** : géolocalisation, rayon de 15 km
- Filtre par **commune** d'Abidjan
- Filtre par **spécialité**
- Chaque fiche montre : nom, commune, spécialités, note moyenne, nombre d'avis, distance le cas échéant
- Fiche détaillée : `/mecaniciens/atelier/{id}` — appel direct depuis la fiche

### Les huit spécialités

Mécanique générale · Électricité auto · Climatisation · Carrosserie / Peinture ·
Diagnostic électronique · Freinage · Boîte de vitesses · Pneus / Parallélisme

### Inscrire son atelier — `/mecaniciens/inscription`

Gratuit, **publié immédiatement**, pas de dossier à constituer. Il faut être connecté.

| Champ | Règle |
|---|---|
| **Nom de l'atelier** | Obligatoire |
| **Téléphone** | Obligatoire, unique (`MECHANIC_PHONE_TAKEN`) |
| **Commune** | Optionnelle |
| **Adresse** | Optionnelle |
| **Position** | Optionnelle, posée sur une carte |
| **Spécialités** | Multi-sélection dans la liste fixe |
| **Bio** | Optionnelle |

Une seule fiche par compte (`MECHANIC_ALREADY_EXISTS`). Vous modifiez votre fiche à tout
moment ; un agent de liaison ou un administrateur le peut également. L'équipe Pièces peut
**suspendre** une fiche signalée, et la **réactiver**.

### Recommander un mécanicien — `/mecaniciens/recommander`

Tout utilisateur avec un compte peut laisser un avis, **même si l'intervention n'est pas
passée par Pièces** — la plupart des réparations se négocient directement avec l'atelier.
Le compte est exigé précisément pour limiter les faux avis. Un avis par mécanicien et par
compte (`MECHANIC_REVIEW_ALREADY_EXISTS`). Un avis signalé peut être masqué par la modération.

---

## 26. Notifications WhatsApp

### Ce que vous recevez

| Statut atteint | Message |
|---|---|
| `PAID` | « Votre commande *abc12345* est confirmée. Le vendeur prépare votre pièce. » |
| `VENDOR_CONFIRMED` | « Le vendeur a confirmé votre commande *abc12345*. Livraison en cours de préparation. » |
| `DISPATCHED` | « Votre commande *abc12345* a été expédiée ! Un livreur est en route. » |
| `DELIVERED` | « Votre commande *abc12345* a été livrée. Confirmez la réception. » |
| `CANCELLED` | « Votre commande *abc12345* a été annulée. » |

`DRAFT` et `PENDING_PAYMENT` ne déclenchent aucune notification.

Si un véhicule de votre garage a un entretien qui arrive à échéance, vous pouvez aussi
recevoir un rappel : « 🔧 Entretien *Toyota Hilux* : plaquettes de frein … Commandez la pièce
sur Pièces. »

### Préférences

`GET` / `PUT /api/v1/notifications/preferences`

| Canal | Disponibilité | Défaut |
|---|---|---|
| **WhatsApp** | Actif | ✅ Activé |
| **SMS** | Non disponible | ❌ |
| **Push** | Non disponible | ❌ |

---

## 27. Profil et gestion du compte

**Page :** `/profile` — avatar avec initiales, nom / email / téléphone, badge de l'espace actif.

| Entrée | Page | Contenu |
|---|---|---|
| **Identité** | `/profile/identite` | Nom, email, téléphone (+225 + 10 chiffres) — modifiables |
| **Mes cotations logistique** | `/profile/cotations` | Vos demandes d'import (voir §24) |
| **Mes espaces** | `/profile/espaces` | Basculer d'espace, en activer un nouveau |
| **Sécurité** | `/profile/securite` | Moyens de connexion, changement de mot de passe (6 caractères minimum) |
| **Mes données** | `/profile/data` | Confidentialité, export, suppression |

### Mes espaces

Chaque espace est présenté par une carte : libellé, description, et selon le cas
**« Vous êtes ici »**, **« Activé » + « Aller à cet espace »**, ou **« + Activer cet
espace »**. Les espaces attribués (Livreur, Chauffeur, Liaison, Administration) affichent leur
message de réserve au lieu d'un bouton d'activation.

### Sécurité

Le rappel y est explicite : « Un seul compte, quel que soit le mode de connexion (SMS,
WhatsApp, email). »

### Mes données (loi n°2013-450)

Consultation du numéro de téléphone non masqué, des rôles, du contexte actif, de la date de
consentement et de la date de création du compte. Le bouton **« Demander la suppression de
mes données »** enregistre la demande, traitée par l'équipe Pièces.

### Déconnexion

Bouton **« Se déconnecter »** en bas du profil.

---

## 28. Le parcours complet

```
ÉTAPE 1 — Vous cadrez le besoin
┌───────────────────────────────────────────────────────────┐
│ Véhicule sélectionné (garage, VIN, ou saisie)             │
│ → tous les résultats sont filtrés par compatibilité       │
└───────────────────────────┬───────────────────────────────┘
                            ▼
ÉTAPE 2 — Vous trouvez la pièce
┌───────────────────────────────────────────────────────────┐
│ Texte · marque/modèle/année/motorisation · photo IA · VIN │
│ Filtres : état, disponibilité, prix, tri                  │
│ Comparaison multi-vendeurs, score qualité-prix            │
└───────────────────────────┬───────────────────────────────┘
                            ▼
ÉTAPE 3 — Vous constituez la sélection     ★ VOTRE ACTION ★
┌──────────┐
│  DRAFT   │ Articles · commune · délai · véhicule rattaché
└────┬─────┘ Puis : « Qui paie ? »
     │
     ├─── « Je paie moi-même » ──────────► page de paiement
     │
     └─── « Le propriétaire » ──────────► lien /choose/{token}
                                          partagé par WhatsApp / SMS
                            ▼
ÉTAPE 4 — Le payeur valide et règle
┌──────────────────┐        ┌────────────────┐
│ PENDING_PAYMENT  │   ou   │ DEPOSIT_PAID   │ (précommande d'import)
└────┬─────────────┘        └───────┬────────┘
     │ webhook CinetPay / COD               │ IN_IMPORT
     ▼                                      │ AWAITING_BALANCE → solde
┌──────┐ ◄─────────────────────────────────┘
│ PAID │ Facture émise · stock décrémenté · vendeurs alertés
└──┬───┘ Fonds SOUS SÉQUESTRE
   │ Le vendeur confirme sous 45 minutes
   ▼
┌────────────────────┐   ┌────────────┐   ┌────────────┐
│ VENDOR_CONFIRMED   │──►│ DISPATCHED │──►│ IN_TRANSIT │ (suivi GPS)
└────────────────────┘   └────────────┘   └─────┬──────┘
                                                ▼
┌───────────┐  confirmation manuelle    ┌───────────┐   ┌───────────┐
│ DELIVERED │ ──── ou auto à 24 h ────► │ CONFIRMED │──►│ COMPLETED │
└───────────┘  (si aucun litige)        └───────────┘   └───────────┘
                                                     Fonds libérés 💰

❌ CANCELLED — possible jusqu'à VENDOR_CONFIRMED → séquestre remboursé
```

### Vos actions, résumées

| Moment | Action |
|---|---|
| Cadrage | Sélectionner ou enregistrer le véhicule |
| Recherche | Trouver la pièce (texte, véhicule, photo, VIN) |
| Arbitrage | Comparer les offres, choisir local ou import |
| Sélection | Constituer le panier, fixer commune et délai |
| Checkout | Choisir qui paie — vous ou le propriétaire |
| Partage | Envoyer le lien de validation |
| Réception | Vérifier la pièce et confirmer la réception |
| Après-vente | Évaluer, ouvrir un litige ou un retour si nécessaire |

---

## 29. Référence des endpoints

### Recherche et navigation (public)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/browse/brands` | Marques |
| GET | `/api/v1/browse/brands/:brand/models` | Modèles d'une marque |
| GET | `/api/v1/browse/brands/:brand/models/:model/years` | Années d'un modèle |
| GET | `/api/v1/browse/brands/:brand/models/:model/engines` | Motorisations (restreintes au millésime si `year`) |
| GET | `/api/v1/browse/categories` | Les 32 catégories |
| GET | `/api/v1/browse/parts` | Filtrer (brand, model, year, engine, category, q, condition, supplyMode, page, limit) |
| GET | `/api/v1/browse/search` | Recherche textuelle (pg_trgm + synonymes, 2 caractères min) |
| GET | `/api/v1/browse/suggest` | Autocomplétion des noms de pièces |
| GET | `/api/v1/browse/compare` | Offres multi-vendeurs par référence OEM (`sort=price|value`) |
| GET | `/api/v1/browse/items/:id` | Détail public d'une fiche produit |
| POST | `/api/v1/browse/vin-decode` | Décoder un VIN (20 req/min) |
| POST | `/api/v1/browse/import-quote` | Fret + douane d'un lot à importer |

### Identification par photo (public)

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/vision/identify` | Identifier une pièce par photo |
| POST | `/api/v1/vision/disambiguate` | Affiner après désambiguïsation |

### Garage (authentifié)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/users/me/vehicles` | Lister mes véhicules |
| POST | `/api/v1/users/me/vehicles` | Ajouter (max 5) |
| DELETE | `/api/v1/users/me/vehicles/:vehicleId` | Supprimer |

### Panier et commandes

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/orders/draft` | ✅ | Récupérer le brouillon panier |
| PUT | `/api/v1/orders/draft` | ✅ | Synchroniser le brouillon panier |
| GET | `/api/v1/orders/delivery-context` | ✅ | Palier de tarification livraison |
| POST | `/api/v1/orders` | ✅ | Créer une commande |
| GET | `/api/v1/orders` | ✅ | Mes commandes |
| GET | `/api/v1/orders/history` | ✅ | Historique paginé |
| GET | `/api/v1/orders/:orderId` | ✅ | Détail (initiateur, membre entreprise, vendeur, admin) |
| GET | `/api/v1/orders/:orderId/devis.pdf` | ✅ | Devis PDF |
| GET | `/api/v1/orders/share/:shareToken` | — | Commande via lien partagé |
| PATCH | `/api/v1/orders/share/:shareToken/delivery` | — | Délai, commune, acheminement |
| POST | `/api/v1/orders/:orderId/pay` | — | Choisir le moyen de paiement |
| POST | `/api/v1/orders/:orderId/pay-balance` | — | Régler le solde d'une précommande |
| POST | `/api/v1/orders/:orderId/cancel` | — | Annuler |
| POST | `/api/v1/orders/:orderId/confirm-receipt` | — | Confirmer la réception |

Les routes sans authentification exigent le **shareToken** dans le corps de la requête
(preuve de possession).

### Livraison, paiement, après-vente

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/deliveries/order/:orderId` | Suivi de livraison (public) |
| GET | `/api/v1/orders/:orderId/escrow` | Statut du séquestre |
| POST | `/api/v1/reviews/seller` | Évaluer un vendeur |
| POST | `/api/v1/reviews/delivery` | Évaluer une livraison |
| GET | `/api/v1/reviews/vendor/:vendorId` | Avis d'un vendeur (public) |
| GET | `/api/v1/reviews/rider/:riderId` | Avis d'un livreur (public) |
| POST | `/api/v1/reviews/disputes` | Ouvrir un litige |
| GET | `/api/v1/reviews/disputes/order/:orderId` | Litiges d'une commande |
| POST | `/api/v1/returns` | Ouvrir un retour |
| GET | `/api/v1/returns/mine` | Mes retours |
| GET | `/api/v1/returns/:id` | Détail d'un retour |
| POST | `/api/v1/returns/:id/cancel` | Annuler un retour |

### Logistique d'import

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/logistics/quote-requests` | Demander une cotation (public) |
| POST | `/api/v1/logistics/quote-requests/:id/photos` | Joindre des photos |
| GET | `/api/v1/logistics/quote-requests/:reference/public` | Suivi par référence (public) |
| GET | `/api/v1/logistics/quote-requests/mine` | Mes cotations |

### Annuaire mécaniciens

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/mechanics` | — | Rechercher (q, commune, specialty, lat/lng/radiusKm, page, limit) |
| GET | `/api/v1/mechanics/:id` | — | Profil public |
| GET | `/api/v1/mechanics/:id/reviews` | — | Avis publiés |
| POST | `/api/v1/mechanics` | ✅ | Inscrire son atelier |
| GET | `/api/v1/mechanics/me` | ✅ | Ma fiche |
| PATCH | `/api/v1/mechanics/:id` | ✅ | Modifier (propriétaire, liaison, admin) |
| POST | `/api/v1/mechanics/:id/reviews` | ✅ | Laisser un avis |

### Compte, consentement, notifications

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/whatsapp/start` | Démarrer la connexion WhatsApp |
| GET | `/api/v1/auth/whatsapp/status` | Interroger le statut du code |
| GET | `/api/v1/users/me` | Mon profil |
| PATCH | `/api/v1/users/me/profile` | Nom, email, téléphone |
| POST | `/api/v1/users/me/role` | Activer un espace |
| PATCH | `/api/v1/users/me/context` | Changer d'espace actif |
| POST | `/api/v1/users/me/consent` | Enregistrer le consentement ARTCI |
| GET | `/api/v1/users/me/data` | Mes données personnelles |
| POST | `/api/v1/users/me/data/deletion-request` | Demander la suppression |
| GET | `/api/v1/notifications/preferences` | Mes préférences |
| PUT | `/api/v1/notifications/preferences` | Modifier mes préférences |

---

## 30. Codes d'erreur

### Compte et accès

| Code | HTTP | Signification |
|---|---|---|
| `AUTH_MISSING_TOKEN` | 401 | Token d'authentification manquant |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Espace insuffisant pour cette action |
| `CONSENT_REQUIRED` | 403 | Consentement ARTCI non donné |
| `CONSENT_MUST_ACCEPT` | 400 | Le consentement doit être accepté |
| `USER_NOT_FOUND` | 404 | Utilisateur introuvable |
| `USER_INVALID_ROLE` | 400 | Espace inconnu |
| `USER_ROLE_NOT_ASSIGNED` | 403 | Espace non activé sur ce compte |
| `INVALID_PHONE` | 422 | Numéro invalide (format +225XXXXXXXXXX) |

### Véhicules

| Code | HTTP | Signification |
|---|---|---|
| `VEHICLE_LIMIT_REACHED` | 400 | Maximum 5 véhicules atteint |
| `VEHICLE_NOT_FOUND` | 404 | Véhicule introuvable |
| `VEHICLE_FORBIDDEN` | 403 | Véhicule inaccessible depuis ce compte |
| `BRAND_NOT_FOUND` | 404 | Marque inconnue |
| `MODEL_NOT_FOUND` | 404 | Modèle inconnu |

### Commandes et paiement

| Code | HTTP | Signification |
|---|---|---|
| `ORDER_NO_VALID_ITEMS` | 400 | Aucun article valide |
| `ORDER_INSUFFICIENT_STOCK` | 400 | Quantité demandée supérieure au stock |
| `ORDER_MIXED_SUPPLY_MODE` | 400 | Panier mêlant pièces locales et pièces à importer |
| `ORDER_DELIVERY_COMMUNE_REQUIRED` | 400 | Commune de livraison non renseignée |
| `DELIVERY_CHOICE_EMPTY` | 400 | Aucun choix de livraison transmis |
| `ORDER_DELIVERY_LOCKED` | 409 | Livraison non modifiable après paiement |
| `ORDER_COD_LIMIT` | 400 | Espèces à la livraison au-delà de 75 000 FCFA |
| `ORDER_COD_UNAVAILABLE_ON_PREORDER` | 400 | Pas de paiement à la livraison sur une précommande |
| `ORDER_NOT_A_PREORDER` | 400 | Action réservée aux précommandes |
| `ORDER_BALANCE_NOT_DUE` | 409 | Le solde n'est pas encore appelable |
| `ORDER_INVALID_STATUS` | 400 | Action incompatible avec le statut |
| `ORDER_INVALID_TRANSITION` | 409 | Transition de statut interdite |
| `ORDER_CANNOT_CANCEL` | 400 | Annulation impossible (livraison en cours) |
| `ORDER_NOT_DELIVERED` | 400 | La commande doit être livrée avant confirmation |
| `ORDER_FORBIDDEN` | 403 | Lien de partage invalide, ou accès refusé |
| `ORDER_NOT_FOUND` | 404 | Commande introuvable |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Montant encaissé différent du montant attendu |
| `ESCROW_NOT_FOUND` | 404 | Transaction de séquestre introuvable |
| `ESCROW_ALREADY_PROCESSED` | 400 | Séquestre déjà libéré ou remboursé |

### Après-vente

| Code | HTTP | Signification |
|---|---|---|
| `REVIEW_NOT_ORDER_BUYER` | 403 | Seul l'acheteur peut évaluer |
| `REVIEW_ORDER_NOT_COMPLETED` | 400 | La commande doit être livrée |
| `REVIEW_DELIVERY_NOT_COMPLETED` | 400 | La livraison doit être terminée |
| `REVIEW_INVALID_RATING` | 400 | Note hors de 1–5 |
| `DISPUTE_NOT_ORDER_PARTY` | 403 | Non participant à la commande |
| `RETURN_NOT_FOUND` | 404 | Retour introuvable |
| `INVALID_RETURN_TRANSITION` | 409 | Transition de retour interdite |
| `DELIVERY_NOT_FOUND` | 404 | Livraison introuvable |

### Photos, cotations, annuaire

| Code | HTTP | Signification |
|---|---|---|
| `FILE_TOO_LARGE` | 422 | Photo au-delà de 5 Mo |
| `INVALID_FILE_TYPE` | 422 | Format de photo non accepté |
| `ITEM_NOT_FOUND` | 404 | Pièce introuvable |
| `LOGISTICS_LEAD_NOT_FOUND` | 404 | Cotation introuvable |
| `LOGISTICS_LEAD_LOCKED` | 409 | Cotation non modifiable |
| `LOGISTICS_MAX_PHOTOS` | 422 | Trop de photos jointes |
| `LOGISTICS_UPLOAD_TOKEN_EXPIRED` | 401 | Lien d'envoi de photos expiré |
| `MECHANIC_ALREADY_EXISTS` | 409 | Une fiche existe déjà pour ce compte |
| `MECHANIC_PHONE_TAKEN` | 409 | Numéro déjà utilisé par une autre fiche |
| `MECHANIC_NOT_FOUND` | 404 | Fiche introuvable |
| `MECHANIC_FORBIDDEN` | 403 | Modification non autorisée |
| `MECHANIC_REVIEW_ALREADY_EXISTS` | 409 | Vous avez déjà évalué ce mécanicien |

---

## 31. FAQ mécanicien

### Q1 — Comment devenir mécanicien sur Pièces ?

Il n'y a pas d'inscription spéciale. Créez un compte (email, Google ou WhatsApp) : il reçoit
l'**Espace Achat**, qui est celui du mécanicien. Si vous voulez en plus apparaître dans
l'annuaire public, inscrivez votre atelier sur `/mecaniciens/inscription`.

### Q2 — Comment trouver la bonne pièce ?

Quatre chemins : la **recherche textuelle** avec filtres (état, disponibilité, prix), la
**navigation par véhicule** jusqu'à la motorisation, la **photo** analysée par l'IA, et le
**décodage du VIN**. Sélectionnez d'abord le véhicule : tous les résultats sont alors filtrés
par compatibilité réelle.

### Q3 — Qui paie la commande ?

C'est vous qui décidez, commande par commande, au moment de valider la sélection :
**« Je paie moi-même »** ou **« Le propriétaire du véhicule »**. Dans le second cas, un lien
`/choose/{token}` est généré à partager par WhatsApp ou SMS.

### Q4 — Le propriétaire doit-il avoir un compte ?

**Non.** Le lien de partage vaut preuve de possession : celui qui l'a peut consulter la
commande, ajuster la livraison, payer, annuler et confirmer la réception sans créer de compte.

### Q5 — Puis-je ajouter mes frais de main-d'œuvre ?

Oui. La main-d'œuvre est une ligne distincte de la commande, affichée séparément dans la
décomposition du prix vue par le payeur.

### Q6 — Le prix peut-il changer après ma commande ?

Non. Le prix de chaque pièce est **figé à la création** de la commande. Seuls les frais de
livraison bougent si le payeur change de commune ou de délai — et il voit le nouveau montant
avant de payer.

### Q7 — Pourquoi mes frais de livraison ne sont-ils pas les mêmes d'une commande à l'autre ?

Trois variables : le **montant** (les frais sont un pourcentage du sous-total, avec plancher
et plafond), l'**encombrement** de la pièce la plus volumineuse, et le **délai** choisi.
S'ajoute le fait que chaque vendeur expédie séparément : un panier à deux vendeurs porte deux
frais. Voir §13.

### Q8 — Pourquoi ne puis-je pas mettre dans le même panier une pièce disponible et une pièce à importer ?

Parce que les deux n'ont ni le même échéancier de paiement (une fois / acompte puis solde) ni
le même délai (48 h / plusieurs semaines). Les mélanger bloquerait la pièce disponible en
attendant le bateau. Passez deux commandes.

### Q9 — Quand le vendeur est-il payé ?

Après la **confirmation de livraison**. Les fonds encaissés restent sous **séquestre**
(statut HELD) jusque-là, puis sont libérés. Sans confirmation manuelle, la libération est
automatique **24 h** après la livraison, à condition qu'aucun litige ne soit ouvert.

### Q10 — Je précommande une pièce à importer : que se passe-t-il si elle n'est finalement pas disponible ?

Votre acompte vous est **intégralement remboursé**. C'est écrit sur la fiche produit et sur
la page de paiement, et c'est la contrepartie du fait de payer avant que la pièce n'existe
pour vous.

### Q11 — Que faire si la pièce reçue ne correspond pas ?

Trois recours, du plus simple au plus formel : **refuser la pièce à la livraison** (socle de
reprise), **signaler la non-conformité dans les 24 h** suivant la livraison, ou **ouvrir un
litige** (5 à 2 000 caractères). Un litige ouvert suspend la libération automatique des
fonds.

### Q12 — Que veut dire « Sans garantie commerciale » ?

Que le vendeur n'a accordé aucune garantie sur cette pièce précise. Ce n'est pas une absence
de recours : le **socle de reprise** s'applique quand même (§20). C'est un choix d'affichage
honnête — l'ancienne mention « Garantie 7J » par défaut promettait ce qui n'était pas dû.

### Q13 — Combien de véhicules puis-je enregistrer ?

**Cinq.** Au-delà, supprimez-en un. Le véhicule sélectionné, lui, n'est pas limité : vous
pouvez toujours saisir un véhicule ponctuel sans l'enregistrer.

### Q14 — Le numéro du vendeur est-il visible ?

Non. Le **nom de boutique** est affiché, jamais le téléphone — y compris sur les annonces
issues de sources externes. Seuls les administrateurs et les agents de liaison y ont accès,
par des endpoints dédiés.

### Q15 — La pièce n'existe nulle part dans le catalogue. Que faire ?

Demandez une **cotation d'import** sur `/logistique/devis` : sans compte, sans engagement, le
nom de la pièce suffit pour démarrer. Estimation immédiate, devis confirmé par WhatsApp sous
deux heures ouvrées, suivi par référence dans **Profil → Mes cotations logistique**.

### Q16 — Comment retrouver une sélection commencée sur un autre téléphone ?

Elle vous suit. Le panier est **hybride** : tant que vous êtes connecté, il est synchronisé
avec un brouillon serveur, réhydraté à l'ouverture de `/panier` sur n'importe quel appareil.

---

*Document généré le 2026-09-23 — Pièces v2.0*
