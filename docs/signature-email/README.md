# Signature e-mail Pièces

`signature-fernando.html` — bloc HTML prêt à coller (Fernando Kouamé, General Manager).

## Installation

**Gmail (web)** — Roue dentée → *Voir tous les paramètres* → *Général* → *Signature* → *Créer*. Ouvrir `signature-fernando.html` dans un navigateur, tout sélectionner (`⌘A`), copier, coller dans le champ. Affecter la signature aux nouveaux messages **et** aux réponses, puis *Enregistrer les modifications*.

**Outlook** — Web : roue dentée → *Courrier* → *Rédiger et répondre*. Bureau : *Outlook* → *Préférences* → *Signatures*. Même copier-coller.

**Apple Mail** — *Mail* → *Réglages* → *Signatures* → `+`. **Décocher « Toujours utiliser la police par défaut »** avant de coller, sinon la mise en forme saute.

## Contraintes respectées

- Tableaux + styles en ligne uniquement (pas de flex/grid) : seule mise en page fiable dans Outlook (moteur Word).
- Aucune police distante. Le nom retombe sur Georgia (approximation de Gloock), le reste sur Arial.
- Logo servi depuis `https://pieces.ci/logo-pieces-light.png` — c'est-à-dire `apps/web/public/logo-pieces-light.png`. **Ne pas supprimer ni renommer ce fichier**, la signature de toute la boîte pointe dessus.
- Couleurs = tokens `DESIGN.md` : ink `#00113A`, liens `#002366`, filet accent `#FF6B00`, labels `#9B9B98`.

## Décliner pour un autre collaborateur

Copier le fichier et changer quatre choses : le nom, la ligne de fonction, le `href="tel:"` + son libellé, le `href="mailto:"` + son libellé. Ne pas toucher au reste (structure, couleurs, tailles).
