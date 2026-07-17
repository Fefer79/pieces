<p class="eyebrow">Manuel d'utilisation</p>

# Prospection vendeurs : du lead repéré au vendeur actif

<p class="deck">Comment les Liaisons et l'Administrateur utilisent le carnet de prospects et le radar de leads pour recenser les vendeurs de pièces d'Abidjan, suivre le démarchage terrain et les convertir en vendeurs Pièces.</p>

<div class="callout">
<p class="lead">Chaque vendeur de pièces d'Abidjan est <strong>déjà quelque part</strong> : sur OpenStreetMap, sur CoinAfrique, sur Facebook, au marché d'Adjamé.</p>
<p>L'outil de prospection les rassemble en un seul carnet, trace chaque appel et chaque visite, et transforme le travail terrain en vendeurs actifs sur la plateforme — sans doublon et sans lead oublié.</p>
</div>

## Vue d'ensemble

L'outil couvre tout le cycle de prospection en trois briques :

- **Le carnet de prospects** — chaque vendeur potentiel est une fiche : identité, boutique, téléphones, WhatsApp, commune, position GPS, pièces vendues, liens (Facebook, WhatsApp, site), photos et remarques.
- **Le journal d'actions** — chaque appel, message WhatsApp, visite ou note est enregistré, horodaté et signé. Le statut du prospect et la date de relance se mettent à jour dans le même geste.
- **Le radar de leads** — l'administrateur importe en un clic les vendeurs déjà présents dans nos bases (boutiques physiques OpenStreetMap, vendeurs des marketplaces comme CoinAfrique), dédupliqués automatiquement.

| Qui | Où | Rôle dans la prospection |
|---|---|---|
| **Liaison** | `/liaison/contacts` | Créer les fiches, faire les appels et visites, journaliser, relancer, convertir |
| **Administrateur** | `/admin/prospection` | Importer les leads du radar, assigner aux liaisons, piloter le funnel, convertir |

## Le cycle de vie d'un prospect

Chaque fiche porte un statut. Le funnel type : **À contacter → Appelé → Visité → Conclu**.

| Statut | Signification | Prochaine action attendue |
|---|---|---|
| **À contacter** | Lead identifié, jamais démarché | Premier appel ou premier message WhatsApp |
| **Appelé** | Premier contact établi | Programmer la visite ou la relance |
| **Visité** | Rencontre physique effectuée | Négocier, conclure ou programmer une relance |
| **À relancer** | En attente d'une décision du vendeur | Relance à la date fixée |
| **À revoir** | Situation à clarifier | Nouvel échange nécessaire |
| **Conclu** | Vendeur convaincu → converti sur la plateforme | Onboarding vendeur (KYC, catalogue) |
| **Injoignable** | Numéro muet après plusieurs tentatives | Réessayer plus tard ou terrain |
| **Rejeté** | Pas intéressé ou hors cible | Aucune — la fiche reste pour mémoire |

---

## Guide Liaison

### 1. Ma journée : les relances

En ouvrant **Contacts**, le bandeau ambre « À relancer aujourd'hui » liste vos prospects dont la relance est due — y compris celles **en retard**, marquées d'un badge rouge. C'est votre liste d'appels du matin : elle ne montre que *vos* prospects assignés.

### 2. Créer une fiche

Bouton **+ Nouveau**. Deux façons de remplir :

- **Saisie terrain** : nom, boutique, téléphone (format ivoirien à 10 chiffres), commune, pièces vendues, position GPS si vous êtes sur place.
- **Depuis un lien** : collez l'URL d'une page Facebook, d'un profil `wa.me` ou d'un site — le système extrait automatiquement les téléphones ivoiriens, les liens WhatsApp/Facebook/Instagram et les infos de la page. Vérifiez puis enregistrez.

Une fiche peut porter plusieurs liens (Facebook, WhatsApp, Instagram, TikTok, site web) : ajoutez-les au fil de vos découvertes depuis la fiche.

### 3. Contacter en un geste

Depuis la fiche :

- **Bouton WhatsApp** — ouvre la conversation avec un **message de démarchage pré-rédigé** (présentation de Pièces, personnalisé au nom du contact). Relisez, ajustez, envoyez.
- **Bouton Appeler** — compose directement le numéro.

### 4. Journaliser chaque action

Après chaque contact, enregistrez l'action dans le **Journal d'actions** de la fiche — c'est le cœur de l'outil :

- **Type** : Appel, WhatsApp, Visite ou Note.
- **Compte-rendu** : ce qui a été dit, les objections, le prix évoqué, la suite convenue.
- **Nouveau statut** (optionnel) : « → Appelé », « → À relancer »… dans le même geste.
- **Date de relance** (optionnel) : le prospect réapparaîtra dans votre bandeau du matin ce jour-là.

Le journal garde l'historique complet, horodaté et signé. Une visite met automatiquement à jour la date de dernière visite. Les pastilles de statut de la section « Suivi » passent aussi par le journal : tout changement est tracé.

### 5. Convertir en vendeur

Quand le vendeur dit oui : bouton **« Convertir en vendeur »** sur la fiche. Le système crée le compte Vendeur (statut « activation en attente », rattaché à vous), passe la fiche à **Conclu**, et journalise la conversion. Si un vendeur existe déjà avec ce numéro (par exemple un vendeur CoinAfrique importé), la fiche est **liée au compte existant** au lieu d'en créer un doublon. Enchaînez ensuite avec l'onboarding habituel (KYC, ajout des pièces).

<div class="callout">
<p class="lead">La règle d'or : <strong>aucun contact sans trace</strong>.</p>
<p>Un appel non journalisé est un appel perdu pour l'équipe : personne ne sait qu'il a eu lieu, et le prospect sera peut-être démarché deux fois — ou jamais relancé.</p>
</div>

---

## Guide Administrateur

Tout se passe sur **Admin → Prospection**.

### 1. Piloter le funnel

En haut de page : trois compteurs (prospects totaux, convertis en vendeurs, actions des 7 derniers jours) et le **funnel cliquable** — chaque pastille de statut affiche son effectif et filtre la liste. Le tableau « performance par liaison » montre, pour chacune : prospects suivis, conclus, taux de conversion.

### 2. Le radar de leads

La carte **« Radar de leads »** montre ce qui est importable depuis nos bases internes, source par source : X importables · Y déjà connus · Z sans téléphone.

- **OSM** — boutiques physiques de pièces auto d'Abidjan cartographiées sur OpenStreetMap (nom, téléphone, commune, position GPS, zone marché type « Adjamé Roxy/Forum »).
- **Marketplaces** (CoinAfrique…) — les vrais vendeurs derrière les annonces déjà importées dans le catalogue, avec leur nombre d'annonces en remarque.

Cliquez **« Importer N lead(s) »** : les nouveaux prospects arrivent en statut « À contacter », non assignés, avec leur provenance en badge. L'import est **rejouable sans risque** : la déduplication (voir plus bas) garantit zéro doublon. Si la carte affiche « Aucun nouveau lead », les gisements sont à jour — ils se réalimentent quand l'équipe technique relance les collectes (`ingest`).

### 3. Assigner aux liaisons

Dans le tableau des prospects, la colonne **« Liaison assignée »** est un menu : choisissez la liaison (par exemple par secteur géographique — filtrez par commune ou par source pour constituer les lots). L'assignation est tracée dans le journal de la fiche, et le prospect apparaît dans l'agenda de la liaison.

### 4. Convertir et suivre

Le bouton **« Convertir »** est aussi disponible côté admin pour les conclusions directes. Les fiches déjà converties affichent « ✓ Vendeur ». Filtres disponibles : statut (funnel cliquable), source (Manuel, OSM, CoinAfrique…), recherche par nom, boutique ou téléphone.

## La déduplication, en clair

Le système refuse les doublons à trois niveaux, dans cet ordre :

| Niveau | Règle |
|---|---|
| **Identité source** | Un même lead (même boutique OSM, même vendeur marketplace) n'est jamais réimporté deux fois |
| **Téléphone** | Les numéros sont normalisés au format `+225XXXXXXXXXX` (espaces, tirets, préfixes 00225 unifiés) ; un numéro déjà en carnet bloque le doublon |
| **Compte vendeur** | Un vendeur déjà lié à une fiche n'est pas re-proposé ; une conversion sur un numéro déjà vendeur **lie** la fiche au compte existant |

Les leads sans téléphone ivoirien exploitable sont écartés de l'import et comptés dans la prévisualisation.

## Bonnes pratiques

- **Journalisez immédiatement** après chaque appel ou visite — pas en fin de journée.
- **Fixez toujours une relance** quand le prospect n'a pas dit non : un prospect sans date de relance sort des radars.
- **Collez les liens** Facebook/WhatsApp dès que vous les trouvez : l'extraction automatique enrichit la fiche et évite les ressaisies.
- **Respectez le cadre d'usage** : ces coordonnées servent exclusivement au démarchage professionnel Pièces. Pas d'export sauvage, pas d'usage personnel ; un prospect qui refuse passe en « Rejeté » et n'est plus sollicité.
- **Admin : importez le radar chaque semaine** et assignez dans la foulée — un lead non assigné n'est dans l'agenda de personne.

---

Pièces.ci — Marketplace pièces auto & solutions flotte · Abidjan, Côte d'Ivoire · fernando.kouame@gmail.com

_Manuel interne v1.0 (juillet 2026) couvrant le carnet de prospects, le journal d'actions, le radar de leads et le cockpit de prospection. Écrans de référence : `/liaison/contacts` et `/admin/prospection`. Pour l'onboarding vendeur après conversion (KYC, catalogue, commission), voir le manuel Liaison._
