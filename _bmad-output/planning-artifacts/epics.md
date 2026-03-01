---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# Pièces - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Pièces, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Identification & Catalogue (12 FRs)**
- FR1: Le mécanicien peut envoyer une photo de pièce via WhatsApp pour obtenir une liste de correspondances filtrées par véhicule
- FR2: Le bot peut extraire le VIN d'une photo de carte grise ivoirienne via OCR
- FR3: Le système peut décoder un VIN pour identifier le véhicule exact (marque, modèle, motorisation, année) via un service de décodage VIN standardisé (international + véhicules européens)
- FR4: Le mécanicien peut saisir manuellement un VIN en fallback si la photo de carte grise est illisible
- FR5: Le mécanicien peut naviguer dans le catalogue par marque → modèle → année → catégorie depuis la PWA
- FR6: Le mécanicien peut rechercher une pièce par numéro de référence OEM dans la PWA
- FR7: La PWA peut mémoriser et pré-remplir le profil du dernier véhicule utilisé
- FR8: Le vendeur peut générer automatiquement des fiches catalogue en envoyant des photos de ses pièces en stock
- FR9: Le vendeur peut valider, ajuster les prix et confirmer le stock de ses fiches catalogue générées par IA
- FR10: Le mécanicien peut ajouter des pièces de différents véhicules dans un même panier (multi-références) et déclencher une livraison consolidée en un seul envoi
- FR54: Le vendeur peut mettre à jour ses prix et son stock à tout moment sans validation admin (mise à jour automatique en temps réel)
- FR55: Le vendeur peut configurer les zones géographiques dans lesquelles il accepte de livrer
- FR50: Le mécanicien peut enregistrer une demande pour une pièce absente du catalogue et être notifié quand un vendeur l'ajoute (Phase 2)

**Workflow de Commande Tripartite (8 FRs)**
- FR11: Le mécanicien peut initier une commande et générer un lien de choix partageable vers le propriétaire
- FR12: Le propriétaire peut visualiser les options de pièces (neuf / occasion / aftermarket, multi-vendeurs) avec le prix total transparent (pièce + livraison, sans frais cachés)
- FR13: Le propriétaire peut sélectionner une option et procéder au paiement depuis son interface, sans compte préalable requis
- FR53: L'acheteur peut annuler une commande confirmée avant l'assignation à un Rider, avec remboursement intégral
- FR14: Le vendeur peut confirmer ou décliner une commande dans une fenêtre de 45 minutes
- FR15: Le système peut annuler automatiquement une commande et rembourser l'acheteur si le vendeur n'a pas répondu dans 45 minutes
- FR16: Le mécanicien peut déclencher une commande de remplacement urgent en 1 tap si la pièce reçue est non conforme, sans double paiement, avec litige ouvert en parallèle
- FR58: Le propriétaire peut finaliser un achat en mode guest en saisissant uniquement son numéro de téléphone, sans création de compte préalable

**Paiement & Transactions (7 FRs)**
- FR17: L'acheteur peut payer via Orange Money, MTN MoMo, Wave ou en espèces à la livraison (COD, plafonné à 75 000 FCFA)
- FR18: Le système peut séquestrer les fonds de l'acheteur dès la commande et les libérer au vendeur uniquement à confirmation de livraison
- FR19: Le système peut virer les fonds au vendeur dans les 2 heures suivant la confirmation de livraison
- FR59: Le système peut déclencher un remboursement automatique vers le mode de paiement original lors d'une annulation ou d'un litige tranché en faveur de l'acheteur
- FR60: Le système peut libérer automatiquement les fonds séquestrés vers le vendeur après un délai de confirmation non reçue (timeout configurable)
- FR20: Le Rider peut enregistrer un paiement COD et capturer un récépissé photo pour validation
- FR21: Le Rider peut escalader un incident de paiement terrain au support en temps réel et basculer sur un mode de paiement alternatif

**Livraison & Logistique (8 FRs)**
- FR22: Le coordinateur Pièces peut assigner manuellement une livraison à un Rider disponible
- FR23: Le Rider peut consulter les détails de sa mission (adresse, description pièce, mode de paiement, montant)
- FR24: L'acheteur et le mécanicien peuvent consulter l'état en temps réel de leur livraison
- FR25: Le système peut calculer et afficher un délai estimé de livraison (Express ≤ 1h30 / Standard ≤ 24h)
- FR26: Le système peut créditer automatiquement le mécanicien d'une livraison Standard gratuite en cas de dépassement du SLA Express
- FR27: Le bot peut envoyer une demande de confirmation de livraison active 30 minutes après la livraison enregistrée
- FR57: Le Rider peut signaler un client absent et déclencher le protocole de tentative manquée (délai d'attente, retour pièce au vendeur)
- FR56: Le Rider peut visualiser les livraisons disponibles dans sa zone avant assignation (Phase 2)
- FR28: Le gestionnaire de flotte Enterprise peut visualiser les commandes et dépenses consolidées par véhicule et par mécanicien (Phase 2)

**Gestion des Utilisateurs & Accès (6 FRs)**
- FR29: Un utilisateur peut s'inscrire et s'authentifier par OTP SMS sans mot de passe
- FR30: Un utilisateur peut détenir plusieurs rôles simultanément sur un même compte et choisir son contexte actif
- FR51: Le propriétaire peut enregistrer et gérer plusieurs profils véhicules sur son compte
- FR52: L'utilisateur peut consulter l'historique de ses commandes passées avec statut, détails et documents associés
- FR31: L'agente terrain peut onboarder un vendeur en capturant son KYC (RCCM ou CNI/carte de résident) et ses photos de stock sur tablette
- FR32: Un admin Enterprise peut inviter des membres dans son espace tenant et leur assigner des rôles internes
- FR33: Un compte utilisateur peut appartenir à au plus un tenant Enterprise simultanément (v1)
- FR34: L'admin/support Pièces peut accéder aux données cross-tenant, avec journalisation obligatoire de chaque action

**Notifications & Communications (5 FRs)**
- FR35: Le système peut notifier chaque acteur (mécanicien, propriétaire, vendeur, Rider) aux étapes clés de leur commande via WhatsApp prioritairement, SMS en fallback, Push PWA en complément
- FR36: Le vendeur peut recevoir une alerte quand son stock atteint un seuil critique qu'il a configuré
- FR37: Le vendeur peut recevoir une alerte quand une demande correspond à une pièce de son catalogue
- FR38: L'équipe Pièces peut déclencher un appel proactif vers un mécanicien le lendemain d'une première commande avec SLA breach
- FR61: L'utilisateur peut gérer ses préférences de notification par canal (WhatsApp / SMS / Push PWA)

**Qualité, Garanties & Litiges (7 FRs)**
- FR39: Le vendeur peut signer les garanties obligatoires (retour pièce incorrecte 48h + pièce occasion 30j) lors de l'activation de son profil
- FR40: L'acheteur peut ouvrir un litige sur une pièce non conforme et soumettre des preuves (photos)
- FR41: Un agent Pièces peut conduire un arbitrage bilatéral (vendeur + client) avec accès aux photos WhatsApp de la commande et rendre une décision écrite
- FR42: Le mécanicien peut recevoir automatiquement le badge "Bon Mécano" quand il atteint ≥ 4,2/5 de note moyenne sur ≥ 10 commandes évaluées
- FR62: Le système peut révoquer automatiquement le badge "Bon Mécano" si la note moyenne descend sous le seuil sur une fenêtre glissante
- FR43: Le mécanicien peut consulter ses notes par commande avec date et contester une note qu'il juge abusive
- FR44: Le propriétaire peut évaluer le mécanicien et la livraison après réception de la pièce
- FR45: Le mécanicien peut être notifié si sa note moyenne approche le seuil de perte ou d'obtention du badge

**Conformité & Données (5 FRs)**
- FR46: Le système peut recueillir le consentement explicite de l'utilisateur au traitement de ses données personnelles (ARTCI) à la première utilisation sur tous les canaux (PWA + WhatsApp)
- FR47: L'utilisateur peut exercer ses droits d'accès, de rectification et de suppression de ses données personnelles
- FR48: Le numéro RCCM du vendeur formel est affiché publiquement sur sa fiche vendeur
- FR49: L'admin/support peut accéder aux photos et messages WhatsApp associés à une commande pour instruire un litige
- FR63: L'admin/support peut exporter les logs d'audit de ses actions pour conformité ARTCI (Phase 2)

### NonFunctional Requirements

**Performance (4 NFRs)**
- NFR1: Temps de réponse bot WhatsApp : < 10 secondes depuis la réception du webhook jusqu'à l'envoi de la réponse, hors latence réseau opérateur (mesure côté serveur uniquement)
- NFR2: Temps de chargement PWA — First Contentful Paint : < 3 secondes sur 3G
- NFR3: Temps de chargement PWA — Time to Interactive : < 3s sur 4G, < 5s sur 3G
- NFR4: Temps de recherche catalogue Meilisearch : < 50ms pour une requête de référence pièce

**Sécurité (5 NFRs)**
- NFR5: Toutes les communications API : TLS 1.2 minimum
- NFR6: Chiffrement au repos : chiffrement disque infrastructure (VPS/cloud) — pas pg_crypto en Phase 1
- NFR7: JWT access token : expiration 15 minutes
- NFR8: OTP SMS (connexion sans mot de passe) : expiration 5 minutes, usage unique
- NFR9: Quotas API : alerte déclenchée à 80% de consommation Gemini VLM + OTP SMS ; procédure de fallback définie

**Fiabilité (7 NFRs)**
- NFR10: Disponibilité cible : 99,5% (hors maintenance planifiée annoncée 48h à l'avance)
- NFR11: RTO (Recovery Time Objective) : 2 heures maximum après incident
- NFR12: RPO (Recovery Point Objective) : 6 heures maximum (dernière sauvegarde exploitable)
- NFR13: Circuit breaker Meilisearch : 3 timeouts > 2s consécutifs → bascule PostgreSQL ILIKE ; reprise après 30s
- NFR14: Timeout confirmation livraison : 48 heures sans action destinataire → libération automatique escrow vendeur
- NFR15: Rétention des données : commandes + litiges = 12 mois minimum ; logs GPS coursiers = 6 mois minimum
- NFR16: Clarification escrow : CinetPay gère l'escrow indépendamment ; fonds protégés même si Pièces est indisponible

**Scalabilité (3 NFRs)**
- NFR17: Phase 1 (pilote fermé) : 20 utilisateurs concurrents maximum
- NFR18: Upload photos catalogue : 5 MB maximum par image ; compression client avant upload
- NFR19: Architecture conçue pour supporter 10× charge Phase 1 sans refactoring majeur

**Intégrations (6 NFRs)**
- NFR20: CinetPay : paiement mobile money (Orange Money, MTN MoMo, Wave) + escrow Phase 1
- NFR21: WhatsApp Cloud API : réception webhooks, envoi messages proactifs, gestion templates approuvés
- NFR22: Gemini VLM : reconnaissance visuelle pièces zero-shot, alerte quota à 80%
- NFR23: Tesseract / Google Vision : OCR carte grise, extraction VIN
- NFR24: Meilisearch : moteur de recherche catalogue (~10 000 références Phase 1), sync async via queue ≤ 5s
- NFR25: Redis : cache sessions, queues tâches asynchrones

**Accessibilité (3 NFRs)**
- NFR26: Cibles tactiles : minimum 44 × 44 px pour tous les éléments interactifs
- NFR27: Contraste couleurs : ratio minimum 4,5:1 (WCAG AA) pour texte standard
- NFR28: Messages WhatsApp : contenu lisible en texte brut, sans dépendance aux rich media pour les informations critiques

### Additional Requirements

**Exigences Architecture — Starter & Infrastructure**
- Starter Template : `create-turbo` base + setup manuel (Option C sélectionnée dans l'architecture)
- Monorepo Turborepo : `apps/web` (Next.js 16 PWA, Vercel) + `apps/api` (Fastify 5.7, Fly.io) + `packages/shared`
- ORM : Prisma 7.2.0 avec schema dans `packages/shared`
- CI/CD : GitHub Actions (lint → test → build sur PR, deploy auto sur merge main)
- Logging : Pino 10.3 (JSON structuré), redact PII
- Error Tracking : Sentry free tier (10K events/mois)
- Uptime : Cloudflare health check
- Domain/SSL : Cloudflare DNS + SSL + CDN

**Exigences Architecture — Séquence d'Implémentation**
- 1. Monorepo Turborepo + config TypeScript/ESLint/Prettier (Story 0)
- 2. Schema Prisma + migrations + seed data
- 3. Auth OTP + JWT Bearer + RBAC 6 rôles middleware (Fastify + Next.js)
- 4. Conventions REST + format erreur + Swagger
- 5. TanStack Query setup + API client typé
- 6. Pipeline images async sharp + R2 storage
- 7. PWA Serwist + Service Worker strategies
- 8. CI/CD GitHub Actions + deploy pipeline

**Exigences Architecture — Data & State**
- State machine commande : 10 états (DRAFT → PENDING_PAYMENT → PAID → VENDOR_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → CONFIRMED → COMPLETED → CANCELLED)
- pgqueue : tâches async (image resize, notifications WhatsApp/Push)
- Bearer token Authorization (pas cookies cross-origin)
- Env validation Zod : crash at startup si variable manquante

**Exigences UX — Design System**
- Tailwind CSS 4 + shadcn/ui (composants copiés dans le projet, Radix UI accessible)
- Mobile-first unique (360px cible), tablette (768px) pour agent terrain, desktop bonus
- Boutons pleine largeur, cibles tactiles ≥ 48x48px
- Images WebP < 50 KB, bundle < 200 KB initial, code splitting par route
- Palette : Bleu Confiance (#1976D2) = CTA, Rouge Marque = prix/marque

**Exigences UX — Composants Prioritaires MVP**
- Bouton photo (CTA principal, massif, centré — 40% écran)
- Carte résultat pièce (photo + prix + badge vendeur + CTA commande)
- Navigation logos marques (grille d'icônes tapables)
- Bottom navigation 3 onglets (Accueil, Commandes, Profil)
- Skeleton loading pour toutes les attentes réseau
- Mode offline : badge discret "hors ligne", sync automatique au retour réseau

**Exigences UX — Patterns WhatsApp**
- Emoji comme structure (1️⃣ 2️⃣ 3️⃣), messages courts, ton conversationnel
- Mode expert (mécanicien) : 1 recommandation + "O/N/V/P" vs Mode détaillé (propriétaire) : tous les vendeurs
- Seuil montant : < 25 000 FCFA = flow WhatsApp pur ; > 25 000 FCFA = lien mini-page détaillée
- Notifications dosées : 2-3 messages max par commande (confirmé, en route, livré)

**Exigences UX — Accessibilité & Contraintes Device**
- Android 1-3 Go RAM : bundle < 200 KB, lazy load par route
- Réseau 3G instable : Service Worker + cache offline, skeleton loading
- prefers-reduced-motion respecté pour animations
- Fond #FAFAFA, contrastes forts pour luminosité faible/soleil

### FR Coverage Map

**Epic 1 — Fondation Projet & Authentification**
- FR29: Inscription/auth OTP SMS sans mot de passe
- FR30: Multi-rôles simultanés + contexte actif
- FR46: Consentement ARTCI première utilisation
- FR47: Droits accès/rectification/suppression données personnelles

**Epic 2 — Catalogue Vendeur & Onboarding**
- FR8: Génération auto fiches catalogue par photo IA
- FR9: Validation/ajustement prix/stock par vendeur
- FR31: Onboarding vendeur terrain (KYC RCCM/CNI + photos stock)
- FR39: Signature garanties obligatoires (retour 48h + occasion 30j)
- FR48: RCCM affiché publiquement sur fiche vendeur
- FR54: Mise à jour prix/stock en temps réel sans validation admin
- FR55: Configuration zones géographiques livraison

**Epic 3 — Recherche & Navigation Pièces (PWA)**
- FR3: Décodage VIN (marque, modèle, motorisation, année)
- FR5: Navigation catalogue marque → modèle → année → catégorie
- FR6: Recherche par référence OEM
- FR7: Mémorisation/pré-remplissage dernier véhicule
- FR51: Gestion plusieurs profils véhicules

**Epic 4 — Commande Tripartite & Paiement**
- FR10: Panier multi-références multi-véhicules + livraison consolidée
- FR11: Initiation commande + lien partageable propriétaire
- FR12: Visualisation options multi-vendeurs prix transparent
- FR13: Sélection + paiement propriétaire sans compte préalable
- FR14: Confirmation/déclin vendeur (fenêtre 45 min)
- FR15: Annulation auto + remboursement si vendeur ne répond pas
- FR17: Paiement multi-modal (Orange Money, MTN MoMo, Wave, COD)
- FR18: Séquestre fonds acheteur → libération à confirmation livraison
- FR19: Virement vendeur sous 2h post-confirmation
- FR53: Annulation commande avant assignation Rider
- FR58: Achat mode guest (numéro de téléphone uniquement)
- FR59: Remboursement automatique annulation/litige
- FR60: Libération auto escrow après timeout configurable

**Epic 5 — Livraison & Logistique**
- FR20: Enregistrement paiement COD + récépissé photo Rider
- FR21: Escalade incident paiement + bascule mode alternatif
- FR22: Assignation manuelle livraison → Rider
- FR23: Détails mission Rider (adresse, pièce, paiement, montant)
- FR24: Suivi temps réel livraison (acheteur + mécanicien)
- FR25: Calcul/affichage délai estimé (Express ≤ 1h30, Standard ≤ 24h)
- FR26: Crédit auto livraison Standard si SLA Express dépassé
- FR27: Confirmation livraison active (push bot 30 min post-livraison)
- FR57: Signalement client absent + protocole tentative manquée

**Epic 6 — Bot WhatsApp — Identification & Commande**
- FR1: Photo pièce WhatsApp → liste correspondances filtrées
- FR2: Extraction VIN photo carte grise ivoirienne (OCR)
- FR4: Saisie manuelle VIN fallback

**Epic 7 — Évaluations, Confiance & Litiges**
- FR16: Commande remplacement urgent 1 tap + litige parallèle
- FR40: Ouverture litige pièce non conforme + preuves photos
- FR41: Arbitrage bilatéral agent Pièces + décision écrite
- FR42: Badge "Bon Mécano" auto (≥ 4,2/5, ≥ 10 commandes)
- FR43: Consultation notes par commande + contestation note abusive
- FR44: Évaluation mécanicien et livraison par propriétaire
- FR45: Notification seuil badge approché
- FR49: Accès admin photos/messages WhatsApp par commande
- FR62: Révocation auto badge si note descend sous seuil

**Epic 8 — Notifications Multi-Canal**
- FR35: Notifications étapes clés (WhatsApp > SMS > Push PWA)
- FR36: Alerte stock seuil critique vendeur
- FR37: Alerte demande correspondant au catalogue vendeur
- FR38: Appel proactif J+1 première commande SLA breach
- FR61: Préférences notification par canal

**Epic 9 — Administration, Historique & Enterprise**
- FR32: Admin Enterprise invite membres + rôles internes
- FR33: 1 tenant Enterprise par compte (v1)
- FR34: Accès admin cross-tenant + journalisation obligatoire
- FR52: Historique commandes (statut, détails, documents)
- FR63: Export logs audit ARTCI (Phase 2)

**Phase 2 (hors scope MVP) :**
- FR28: Dashboard flotte Enterprise (commandes/dépenses par véhicule)
- FR50: Demande pièce absente + notification ajout vendeur
- FR56: Rider visualise livraisons zone avant assignation

## Epic List

### Epic 1 : Fondation Projet & Authentification
Les utilisateurs peuvent s'inscrire par OTP SMS, gérer leur profil multi-rôles, et donner leur consentement ARTCI. Inclut le setup monorepo Turborepo, schema Prisma, auth OTP + JWT Bearer, RBAC 6 rôles, conventions REST, CI/CD GitHub Actions.
**FRs couverts :** FR29, FR30, FR46, FR47

## Epic 1 : Fondation Projet & Authentification

Les utilisateurs peuvent s'inscrire par OTP SMS, gérer leur profil multi-rôles, et donner leur consentement ARTCI. Inclut le setup monorepo Turborepo, schema Prisma, auth OTP + JWT Bearer, RBAC 6 rôles, conventions REST, CI/CD GitHub Actions.

### Story 1.1 : Initialisation Monorepo & CI/CD

As a développeur,
I want un monorepo Turborepo configuré avec TypeScript strict, linting, et un pipeline CI/CD déployant automatiquement,
So that l'équipe puisse développer, tester et déployer de manière fiable dès le premier jour.

**Acceptance Criteria:**

**Given** un nouveau repository Git vide
**When** le développeur exécute `npx create-turbo@latest pieces --example basic`
**Then** le monorepo contient `apps/web` (Next.js 16), `apps/api` (Fastify 5.7), et `packages/shared`
**And** TypeScript strict est activé (`strict: true`, `noUncheckedIndexedAccess: true`) dans les 2 apps
**And** ESLint 9 (flat config) + Prettier sont configurés et partagés via `packages/shared`
**And** `turbo build` et `turbo test` exécutent les pipelines en parallèle avec cache local

**Given** un push sur la branche `main`
**When** GitHub Actions exécute le workflow CI/CD
**Then** le pipeline lint → test → build s'exécute sur chaque PR
**And** `apps/web` est déployé automatiquement sur Vercel
**And** `apps/api` est déployé sur Fly.io via `flyctl deploy`
**And** les variables d'environnement sont validées par un schema Zod au démarrage (crash si variable manquante)

**Given** le déploiement est terminé
**When** un développeur accède aux URLs de staging
**Then** Sentry est configuré (frontend + backend, source maps)
**And** Cloudflare DNS + SSL est actif
**And** Cloudflare health check surveille l'uptime API
**And** un fichier `.env.example` est commité comme template

**Given** le projet est initialisé
**When** le compte WhatsApp Business est configuré
**Then** les templates WhatsApp Meta sont soumis en anticipation (confirmation commande, pièce en route, pièce livrée, options propriétaire, consentement ARTCI)
**And** une marge de 2-3 itérations de rejet est prévue (soumission dès cette story, pas à l'Epic 6)
**And** les templates sont documentés dans un fichier `docs/whatsapp-templates.md`

### Story 1.2 : Inscription & Authentification OTP SMS

As a utilisateur (mécanicien, propriétaire, vendeur),
I want m'inscrire et me connecter avec mon numéro de téléphone et un code OTP reçu par SMS,
So that je puisse accéder à Pièces sans mot de passe, en utilisant mon numéro comme seule identité.

**Acceptance Criteria:**

**Given** un utilisateur non inscrit saisit son numéro de téléphone ivoirien
**When** il soumet le formulaire d'inscription
**Then** un code OTP à 6 chiffres est envoyé par SMS
**And** le code expire après 5 minutes
**And** le code est à usage unique (invalidé après première utilisation)
**And** la table `User` est créée dans Prisma avec `phone`, `createdAt`, `updatedAt`

**Given** un utilisateur saisit un code OTP valide
**When** il soumet le code
**Then** un JWT access token est généré (expiration 15 minutes)
**And** un refresh token est généré et stocké de manière sécurisée
**And** le token contient les claims `userId`, `roles`, `active_context`
**And** l'utilisateur est redirigé vers la page d'accueil

**Given** un utilisateur demande un code OTP
**When** il soumet son numéro de téléphone
**Then** un rate limit strict est appliqué : max 3 demandes par 5 minutes par numéro, max 5 par heure
**And** un device fingerprint (token localStorage) est associé à la session
**And** si un nouveau device est détecté pour un numéro existant + commande > 50 000 FCFA dans les 24h → alerte de sécurité loggée (Sentry)

**Given** un utilisateur saisit un code OTP invalide ou expiré
**When** il soumet le code
**Then** un message d'erreur clair est affiché
**And** l'utilisateur peut demander un nouveau code

**Given** un utilisateur déjà inscrit saisit son numéro
**When** il soumet le formulaire de connexion
**Then** le même flow OTP s'applique (pas de distinction inscription/connexion côté UX)

**Given** les communications API
**When** n'importe quelle requête est envoyée
**Then** TLS 1.2 minimum est utilisé pour toutes les communications
**And** le Bearer token est envoyé dans le header `Authorization`

### Story 1.3 : Profil Multi-Rôles & Contexte Actif

As a utilisateur,
I want pouvoir détenir plusieurs rôles simultanément (mécanicien, propriétaire, vendeur, Rider, agent terrain, admin) et choisir mon contexte actif,
So that je puisse utiliser Pièces selon mes besoins du moment sans comptes multiples.

**Acceptance Criteria:**

**Given** un utilisateur authentifié avec un seul rôle
**When** il accède à la plateforme
**Then** le contexte actif est automatiquement celui de son unique rôle
**And** le sélecteur de contexte n'est pas affiché

**Given** un utilisateur authentifié avec plusieurs rôles (ex: mécanicien + propriétaire)
**When** il accède à la plateforme
**Then** un sélecteur de contexte est affiché
**And** le claim JWT `active_context` reflète le rôle sélectionné
**And** l'interface s'adapte au contexte actif (navigation, dashboard, permissions)

**Given** un utilisateur avec le contexte `vendeur`
**When** il fait une requête API pour voir les détails d'une commande
**Then** la couche DTO Projection masque les données confidentielles (ex: `mecanicien_name` est masqué pour le vendeur)
**And** chaque rôle voit uniquement les données auxquelles il a droit selon la matrice de confidentialité

**Given** un admin/support effectue une action à droits élevés
**When** il accède à des données cross-rôle
**Then** l'action est loggée avec la raison d'accès (conformité ARTCI)

### Story 1.4 : Consentement ARTCI & Droits sur les Données Personnelles

As a utilisateur,
I want donner mon consentement explicite au traitement de mes données personnelles lors de ma première utilisation, et pouvoir exercer mes droits d'accès, de rectification et de suppression,
So that mes données soient protégées conformément à la loi ivoirienne n°2013-450.

**Acceptance Criteria:**

**Given** un utilisateur accède à la PWA pour la première fois
**When** la page se charge
**Then** une modal de consentement ARTCI s'affiche
**And** la modal explique quelles données sont collectées (nom, téléphone, localisation GPS, historique transactions, photos)
**And** l'utilisateur doit accepter explicitement avant de pouvoir utiliser la plateforme
**And** le consentement est horodaté et stocké en base

**Given** un utilisateur interagit avec le bot WhatsApp pour la première fois
**When** il envoie son premier message
**Then** le bot envoie un message de consentement ARTCI avant toute autre interaction
**And** l'utilisateur doit répondre pour accepter

**Given** un utilisateur souhaite consulter ses données
**When** il accède à la section "Mes données" de son profil
**Then** il peut voir toutes les données personnelles stockées

**Given** un utilisateur souhaite rectifier ou supprimer ses données
**When** il soumet une demande de rectification ou suppression
**Then** la demande est traitée et confirmée
**And** la suppression respecte les durées de rétention légales (commandes/litiges 12 mois min)

### Story 1.5 : Conventions REST, Format Erreur & Documentation API

As a développeur,
I want des conventions REST standardisées, un format d'erreur uniforme, et une documentation Swagger auto-générée,
So that toutes les APIs soient cohérentes, prévisibles et documentées pour l'équipe.

**Acceptance Criteria:**

**Given** n'importe quelle route API Fastify
**When** une réponse est envoyée
**Then** elle suit le format standardisé : `{ data, meta, error }`
**And** les codes HTTP sont utilisés correctement (200, 201, 400, 401, 403, 404, 422, 500)
**And** les erreurs suivent le format : `{ code, message, details }`

**Given** un schema Zod défini dans `packages/shared`
**When** une requête arrive avec des données invalides
**Then** la validation Zod retourne une erreur 422 avec les détails des champs invalides
**And** le même schema Zod est utilisé côté frontend (React Hook Form) et backend

**Given** l'API Fastify est démarrée
**When** un développeur accède à `/docs`
**Then** la documentation Swagger est générée automatiquement depuis les schemas Zod
**And** tous les endpoints sont documentés avec leurs paramètres, réponses et exemples

**Given** une variable d'environnement requise est manquante
**When** l'application démarre
**Then** le processus crash immédiatement avec un message explicite indiquant la variable manquante (fail fast via Zod)

---

### Epic 2 : Catalogue Vendeur & Onboarding
Les vendeurs peuvent être onboardés (KYC RCCM/CNI), constituer leur catalogue via photo IA, gérer prix/stock en temps réel, configurer leurs zones de livraison, et signer les garanties obligatoires. Inclut le pipeline images (upload → R2 → sharp → variants WebP).
**FRs couverts :** FR8, FR9, FR31, FR39, FR48, FR54, FR55

### Epic 3 : Recherche & Navigation Pièces (PWA)
Les mécaniciens et propriétaires peuvent trouver des pièces par navigation visuelle (marque → modèle → année → catégorie), recherche référence OEM, décodage VIN, et photo IA sur la PWA. Ils peuvent enregistrer et gérer leurs profils véhicules. Inclut Meilisearch, PWA Serwist offline-first, TanStack Query, désambiguïsation visuelle et escalade humaine.
**FRs couverts :** FR3, FR5, FR6, FR7, FR51

### Epic 4 : Commande Tripartite & Paiement
Le workflow central du produit : le mécanicien prescrit et génère un lien partageable, le propriétaire visualise les options multi-vendeurs avec prix transparents et paie (mobile money ou COD), le vendeur confirme sous 45 min. Panier multi-références, mode guest propriétaire, annulation/remboursement automatiques, séquestre CinetPay.
**FRs couverts :** FR10, FR11, FR12, FR13, FR14, FR15, FR17, FR18, FR19, FR53, FR58, FR59, FR60

### Epic 5 : Livraison & Logistique
Les pièces sont livrées au garage avec suivi temps réel, assignation Rider manuelle, collecte COD avec récépissé photo, escalade paiement, gestion SLA (crédit auto si retard Express), confirmation active 30 min post-livraison, et protocole client absent.
**FRs couverts :** FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR57

### Epic 6 : Bot WhatsApp — Identification & Commande
Les mécaniciens peuvent identifier des pièces en envoyant une photo + photo carte grise via WhatsApp, l'IA identifie la pièce et le VIN est extrait par OCR. Le bot réutilise les APIs catalogue/commande/paiement des Epics 2-5 pour le flow complet dans WhatsApp (mode expert/détaillé, seuil 25K FCFA). Inclut désambiguïsation visuelle et escalade humaine.
**FRs couverts :** FR1, FR2, FR4

### Epic 7 : Évaluations, Confiance & Litiges
Les propriétaires évaluent mécaniciens et livraisons. Le badge "Bon Mécano" est décerné/révoqué automatiquement. Les litiges sont ouverts par l'acheteur avec preuves photos et arbitrés par un agent Pièces (décision écrite). Remplacement urgent en 1 tap sans double paiement.
**FRs couverts :** FR16, FR40, FR41, FR42, FR43, FR44, FR45, FR49, FR62

### Epic 8 : Notifications Multi-Canal
Chaque acteur est notifié aux étapes clés via WhatsApp (prioritaire), SMS (fallback), Push PWA (complément). Alertes stock vendeur, alertes demande catalogue, appel proactif J+1 SLA breach, préférences notification par canal.
**FRs couverts :** FR35, FR36, FR37, FR38, FR61

### Epic 9 : Administration, Historique & Enterprise
L'admin/support accède aux données cross-tenant avec journalisation obligatoire (ARTCI). Les utilisateurs consultent leur historique complet de commandes. Les admins Enterprise invitent des membres et gèrent les rôles internes. Un compte appartient à 1 tenant max (v1).
**FRs couverts :** FR32, FR33, FR34, FR52, FR63 (Phase 2)

## Epic 2 : Catalogue Vendeur & Onboarding

Les vendeurs peuvent être onboardés (KYC RCCM/CNI), constituer leur catalogue via photo IA, gérer prix/stock en temps réel, configurer leurs zones de livraison, et signer les garanties obligatoires.

### Story 2.1 : Onboarding Vendeur & KYC par Agent Terrain

As a agente terrain Pièces,
I want onboarder un vendeur en capturant son KYC (RCCM ou CNI) et ses informations de base sur tablette,
So that le vendeur ait un profil créé et prêt pour la constitution de son catalogue.

**Acceptance Criteria:**

**Given** l'agente terrain est authentifiée avec le rôle `agent_terrain`
**When** elle initie un onboarding vendeur
**Then** un formulaire adapté tablette s'affiche avec les champs : nom boutique, nom contact, téléphone, type vendeur (formel/informel)

**Given** le vendeur est formel (commerce enregistré)
**When** l'agente saisit ses informations
**Then** le numéro RCCM est obligatoire
**And** une photo ou scan du RCCM est capturée
**And** le RCCM est stocké pour affichage public sur la fiche vendeur (FR48)

**Given** le vendeur est informel (marché Adjamé)
**When** l'agente saisit ses informations
**Then** une photo CNI ou carte de résident est obligatoire
**And** la pièce d'identité est stockée de manière sécurisée (non publique)

**Given** les informations KYC sont soumises
**When** le profil vendeur est créé
**Then** le statut est `pending_activation` (en attente signature garanties)
**And** les tables Prisma `Vendor`, `VendorKyc` sont créées avec les champs nécessaires
**And** l'agente est notifiée de la création réussie

### Story 2.2 : Signature Garanties Obligatoires & Activation Profil

As a vendeur,
I want signer les garanties obligatoires Pièces lors de mon activation,
So that mon profil soit activé et que les acheteurs sachent que je m'engage sur la qualité.

**Acceptance Criteria:**

**Given** un vendeur avec statut `pending_activation`
**When** il (ou l'agente terrain) accède à l'écran de signature
**Then** les deux garanties sont affichées clairement :
- Garantie retour pièce incorrecte : reprise sous 48h, remboursement intégral
- Garantie pièces d'occasion : fonctionnement minimum 30 jours

**Given** le vendeur accepte et signe (signature digitale sur tablette ou validation SMS)
**When** la signature est soumise
**Then** la signature est horodatée et stockée en base
**And** le statut vendeur passe à `active`
**And** le numéro RCCM (si formel) est affiché publiquement sur la fiche vendeur
**And** le profil est activé sous 2h maximum après l'onboarding complet

**Given** le vendeur refuse de signer
**When** il décline les garanties
**Then** le profil reste en `pending_activation`
**And** il ne peut pas recevoir de commandes

### Story 2.3 : Pipeline Images & Génération Catalogue IA

As a vendeur (assisté par l'agente terrain),
I want envoyer des photos de mes pièces en stock pour que l'IA génère automatiquement les fiches catalogue,
So that mon catalogue soit constitué rapidement sans saisie manuelle des références.

**Acceptance Criteria:**

**Given** un vendeur actif (ou l'agente terrain pour lui)
**When** il upload une photo de pièce
**Then** l'image est uploadée vers Cloudflare R2 (format brut, max 5 MB)
**And** un job pgqueue est créé pour le traitement asynchrone
**And** sharp génère 4 variants WebP : thumb (150px), small (400px), medium (800px), large (1200px)
**And** les variants sont stockées sur R2 avec des URLs CDN

**Given** l'image brute est disponible sur R2
**When** le job IA est exécuté
**Then** Gemini VLM analyse l'image en zero-shot
**And** une fiche catalogue est auto-générée avec : nom pièce, catégorie, référence OEM probable, compatibilité véhicule suggérée, prix marché suggéré
**And** la fiche a le statut `draft` (en attente validation vendeur)

**Given** une session bulk d'onboarding (agente terrain + vendeur)
**When** plusieurs photos sont uploadées en séquence
**Then** chaque photo est traitée indépendamment
**And** un compteur de progression est affiché (ex: "32/50 pièces traitées")
**And** les photos de qualité insuffisante sont signalées (⚠️) avec suggestion de reprise
**And** une fiche catalogue ne peut être publiée que si la photo atteint un score qualité minimum (netteté, cadrage, luminosité) — sinon elle reste en `draft` avec indication "Photo à reprendre"

**Given** la session bulk est en cours sur tablette (agente terrain)
**When** le réseau est indisponible
**Then** les photos sont stockées localement en IndexedDB (mode offline complet)
**And** la sauvegarde est progressive (chaque photo est persistée individuellement)
**And** la sync vers le serveur reprend automatiquement au retour réseau

**Given** la session bulk est interrompue (crash, batterie, fermeture)
**When** l'agente rouvre l'application
**Then** la session reprend exactement où elle s'est arrêtée
**And** les photos déjà capturées et non synchronisées sont visibles et prêtes pour sync

**Given** l'alerte quota Gemini VLM atteint 80%
**When** un upload est soumis
**Then** une alerte est loggée (Sentry)
**And** le fallback défini est activé (formulaire manuel sans IA)

### Story 2.4 : Validation et Ajustement Catalogue Vendeur

As a vendeur,
I want valider, ajuster les prix et confirmer le stock de mes fiches catalogue générées par IA,
So that mon catalogue reflète exactement mon stock réel avec mes prix.

**Acceptance Criteria:**

**Given** un vendeur a des fiches catalogue en statut `draft`
**When** il accède à son interface catalogue
**Then** chaque fiche affiche : photo, nom IA, catégorie IA, référence OEM suggérée, compatibilité, prix suggéré
**And** tous les champs sont éditables

**Given** le vendeur modifie le prix d'une fiche
**When** il valide le changement
**Then** le prix est mis à jour en temps réel sans validation admin (FR54)
**And** la fiche passe de `draft` à `published`
**And** la pièce est immédiatement visible dans les résultats de recherche

**Given** le vendeur veut mettre à jour son stock
**When** il marque une pièce comme "en stock" ou "épuisée"
**Then** le changement est reflété instantanément
**And** les pièces épuisées n'apparaissent plus dans les résultats de recherche

**Given** le vendeur modifie le prix d'une fiche publiée
**When** la variation dépasse 50% (hausse ou baisse) en moins d'1 heure
**Then** une alerte est envoyée à l'admin pour revue (détection bait-and-switch)
**And** la fiche reste publiée mais le changement est flaggé dans les logs

**Given** la synchronisation Meilisearch
**When** une fiche catalogue est publiée ou modifiée
**Then** l'index Meilisearch est mis à jour de manière asynchrone via queue Redis (délai ≤ 5s)

### Story 2.5 : Configuration Zones de Livraison Vendeur

As a vendeur,
I want configurer les zones géographiques dans lesquelles j'accepte de livrer,
So that je ne reçoive que des commandes que je peux servir géographiquement.

**Acceptance Criteria:**

**Given** un vendeur actif accède à ses paramètres
**When** il configure ses zones de livraison
**Then** il peut sélectionner des communes/zones d'Abidjan (Yopougon, Cocody, Adjamé, Plateau, etc.)
**And** il peut choisir "Tout Abidjan" comme raccourci

**Given** un acheteur recherche une pièce
**When** les résultats sont affichés
**Then** seuls les vendeurs couvrant la zone de livraison de l'acheteur apparaissent
**And** si un vendeur est proche (< 500m du garage), l'option "Retrait possible — 0 FCFA" est affichée

**Given** un vendeur modifie ses zones
**When** il sauvegarde
**Then** le changement est effectif immédiatement pour les nouvelles recherches

### Story 2.6 : Dashboard Vendeur

As a vendeur,
I want consulter un tableau de bord avec mes ventes, paiements et catalogue,
So que j'aie une visibilité complète sur mon activité commerciale sur Pièces.

**Acceptance Criteria:**

**Given** un vendeur actif accède à son dashboard
**When** la page se charge
**Then** il voit un résumé : commandes actives, commandes du mois, chiffre d'affaires du mois, paiements reçus, paiements en attente de libération escrow

**Given** le vendeur consulte ses commandes
**When** il accède à la liste
**Then** il voit chaque commande avec : pièce, acheteur (zone uniquement, pas le nom — matrice confidentialité), statut, montant, date
**And** il peut filtrer par statut (en attente confirmation, confirmée, livrée, terminée)

**Given** le vendeur consulte son catalogue
**When** il accède à la section catalogue
**Then** il voit le nombre total de pièces publiées, en draft, et épuisées
**And** il peut accéder directement à la gestion de chaque fiche

---

## Epic 3 : Recherche & Navigation Pièces (PWA)

Les mécaniciens et propriétaires peuvent trouver des pièces par navigation visuelle, recherche OEM, décodage VIN, et photo IA sur la PWA. Désambiguïsation visuelle et escalade humaine garantissent le principe "Zéro Impasse".

### Story 3.1 : Navigation Catalogue Visuelle (Marque → Modèle → Année → Catégorie)

As a mécanicien ou propriétaire,
I want naviguer dans le catalogue par marque → modèle → année → catégorie depuis la PWA,
So that je puisse trouver une pièce visuellement sans saisir de texte.

**Acceptance Criteria:**

**Given** l'utilisateur accède à l'écran d'accueil de la PWA
**When** la page se charge
**Then** une grille de logos des marques auto populaires en CI est affichée (Toyota, Peugeot, Renault, Hyundai, Kia, etc.)
**And** les logos sont des zones tactiles ≥ 48x48px
**And** le bouton photo occupe 40% de l'écran (CTA principal)

**Given** l'utilisateur sélectionne une marque (ex: Toyota)
**When** il tape sur le logo
**Then** les modèles de cette marque sont affichés (Corolla, Hilux, RAV4, etc.)

**Given** l'utilisateur sélectionne un modèle (ex: Corolla)
**When** il tape sur le modèle
**Then** les années disponibles sont affichées

**Given** l'utilisateur sélectionne une année
**When** il tape sur l'année
**Then** les catégories de pièces sont affichées (freinage, filtration, suspension, etc.)
**And** les pièces disponibles dans cette catégorie sont listées avec photo, prix et vendeur

**Given** la PWA est en mode offline
**When** l'utilisateur navigue
**Then** les données cachées (marques, modèles) sont servies depuis le Service Worker (StaleWhileRevalidate)
**And** un badge discret "hors ligne" est affiché

### Story 3.2 : Recherche par Référence OEM & Meilisearch

As a mécanicien avancé,
I want rechercher une pièce par son numéro de référence OEM,
So that je puisse trouver exactement la pièce que je connais en quelques secondes.

**Acceptance Criteria:**

**Given** l'utilisateur saisit une référence OEM dans la barre de recherche
**When** il tape au moins 3 caractères
**Then** Meilisearch retourne les résultats en < 50ms
**And** les résultats affichent : photo, nom, référence OEM, compatibilité véhicule, prix, vendeur, badge vendeur

**Given** la recherche retourne des résultats
**When** ils sont affichés
**Then** les résultats sont triés par pertinence
**And** les cartes résultats sont scrollables avec lazy-loading
**And** chaque carte affiche le prix en gros caractères (info #1)

**Given** Meilisearch ne répond pas (3 timeouts > 2s consécutifs)
**When** le circuit breaker s'active
**Then** la recherche bascule automatiquement vers PostgreSQL ILIKE
**And** la reprise Meilisearch est testée après 30 secondes
**And** l'utilisateur ne perçoit pas l'interruption (même format de résultats)

**Given** la recherche ne retourne aucun résultat
**When** les résultats sont vides
**Then** des alternatives sont proposées : "Essayez par photo", "Naviguez par marque", ou "Contactez un spécialiste Pièces"
**And** jamais d'écran vide sans alternative (Principe Zéro Impasse)

**Given** l'utilisateur saisit du texte libre dans la barre de recherche (ex: "filtre gasoil hilux 2015")
**When** le texte ne correspond pas à une référence OEM exacte
**Then** Meilisearch effectue une recherche full-text sur le nom de pièce, catégorie et compatibilité véhicule
**And** les résultats sont affichés dans le même format que la recherche OEM

### Story 3.3 : Décodage VIN & Identification Véhicule

As a mécanicien,
I want saisir ou scanner un VIN pour identifier précisément le véhicule,
So that les résultats de recherche soient filtrés par compatibilité exacte (moteur, année, variante).

**Acceptance Criteria:**

**Given** l'utilisateur saisit un VIN de 17 caractères dans la PWA
**When** il soumet le VIN
**Then** le service de décodage VIN standardisé est appelé (NHTSA VPIC pour véhicules US/asiatiques + service complémentaire pour véhicules européens Peugeot/Renault)
**And** le véhicule est identifié : marque, modèle, motorisation, année
**And** la confirmation est affichée : "Véhicule confirmé : Toyota Corolla 1ZZ-FE (2008) ✅"

**Given** le VIN est décodé avec succès
**When** l'utilisateur recherche ensuite une pièce
**Then** les résultats sont automatiquement filtrés par compatibilité véhicule exacte

**Given** le VIN n'est pas reconnu (véhicules anciens, immatriculation CI non standard)
**When** le décodage échoue
**Then** un message explicite est affiché : "VIN non reconnu — essayez la navigation par marque/modèle/année"
**And** un fallback vers la navigation manuelle est proposé

**Given** l'utilisateur scanne le VIN via la caméra PWA
**When** la caméra capture le code
**Then** le VIN est extrait et soumis automatiquement

### Story 3.4 : Profils Véhicules & Pré-remplissage

As a propriétaire ou mécanicien,
I want enregistrer et gérer mes véhicules (marque, modèle, année, VIN),
So that mes recherches futures soient pré-filtrées et que je gagne du temps.

**Acceptance Criteria:**

**Given** un utilisateur authentifié
**When** il accède à "Mes véhicules"
**Then** il peut ajouter un véhicule (marque, modèle, année, VIN optionnel)
**And** il peut gérer plusieurs profils véhicules (FR51)
**And** il peut supprimer ou modifier un véhicule

**Given** un mécanicien complète son profil
**When** il accède à "Mon garage"
**Then** il peut enregistrer la localisation GPS de son atelier (capture GPS du téléphone ou placement sur carte)
**And** la localisation est enregistrée une fois et réutilisée comme adresse de livraison par défaut pour toutes ses commandes
**And** un point de repère textuel peut être ajouté en complément ("derrière le maquis de Tante Rose, Yopougon Wassakara")

**Given** l'utilisateur a des véhicules enregistrés
**When** il lance une recherche de pièce
**Then** le dernier véhicule utilisé est pré-sélectionné (FR7)
**And** il peut changer de véhicule via un sélecteur
**And** le profil véhicule est mémorisé en localStorage pour accès rapide

**Given** un propriétaire a un seul véhicule
**When** il lance une recherche
**Then** les résultats sont automatiquement filtrés pour ce véhicule sans action supplémentaire

### Story 3.5 : Identification Pièce par Photo IA & Désambiguïsation (PWA)

As a mécanicien ou propriétaire,
I want photographier une pièce depuis la PWA et obtenir les correspondances identifiées par IA,
So that je puisse trouver la bonne pièce même sans connaître la référence.

**Acceptance Criteria:**

**Given** l'utilisateur tape sur le bouton photo (CTA principal, 40% écran)
**When** la caméra s'ouvre
**Then** un guidage visuel est affiché (overlay semi-transparent) : "Placez la pièce entière dans le cadre, sur fond clair"
**And** des conseils sont affichés : "Bonne lumière ☀️ — Pièce entière — Fond uni"

**Given** l'utilisateur prend la photo
**When** l'image est capturée
**Then** l'image est envoyée à l'API d'identification IA (Gemini VLM)
**And** un skeleton loading est affiché pendant le traitement (< 10s)

**Given** l'IA identifie la pièce avec confiance élevée
**When** les résultats arrivent
**Then** la liste des vendeurs avec prix est affichée (identique au format recherche)
**And** si un profil véhicule est actif, les résultats sont filtrés par compatibilité

**Given** l'IA a une confiance faible (plusieurs pièces possibles)
**When** les résultats arrivent
**Then** une désambiguïsation visuelle est proposée : 4-5 images de pièces possibles
**And** l'utilisateur tape sur la bonne image pour affiner
**And** les résultats filtrés sont affichés après sélection

**Given** ni la photo ni la désambiguïsation ne donnent de résultat certain
**When** l'IA et le fallback échouent
**Then** une escalade humaine est déclenchée : "Un spécialiste Pièces vérifie pour vous — réponse sous 2 minutes"
**And** la demande est mise en queue pour traitement par le support avec priorité FIFO
**And** l'utilisateur est notifié dès que le spécialiste répond
**And** le support dispose d'un dashboard de triage des escalades : file d'attente visible, temps d'attente par demande, photos de la requête originale
**And** si le temps d'attente dépasse 2 min, une alerte est envoyée au superviseur support

### Story 3.6 : PWA Offline-First & Service Worker

As a utilisateur sur réseau 3G instable,
I want que la PWA fonctionne même en mode dégradé ou offline,
So that je puisse consulter mes données et préparer des actions même sans connexion.

**Acceptance Criteria:**

**Given** la PWA est installée et les assets sont en cache
**When** l'utilisateur ouvre l'app
**Then** le First Contentful Paint est < 3 secondes sur 3G (NFR2)
**And** le Time to Interactive est < 5s sur 3G (NFR3)
**And** le bundle initial est < 200 KB

**Given** le réseau est indisponible
**When** l'utilisateur navigue dans le catalogue
**Then** les données cachées (marques, modèles, résultats précédents) sont servies depuis le Service Worker
**And** un badge discret "Mode hors ligne — sync automatique" est affiché
**And** les actions (ajout panier) sont mises en queue IndexedDB pour sync au retour réseau

**Given** le réseau revient
**When** la connexion est rétablie
**Then** les actions en queue sont synchronisées automatiquement (Background Sync)
**And** le badge offline disparaît

**Given** les assets statiques (JS, CSS, images)
**When** ils sont demandés
**Then** la stratégie CacheFirst est appliquée (servir depuis cache, update en background)

**Given** les appels API (données dynamiques)
**When** ils sont demandés
**Then** la stratégie NetworkFirst est appliquée (données fraîches prioritaires, fallback cache)

---

## Epic 4 : Commande Tripartite & Paiement

Le workflow central : le mécanicien prescrit, le propriétaire choisit avec prix transparents et paie, le vendeur confirme. State machine 10 états, intégration CinetPay.

### Story 4.1 : State Machine Commande & Initiation Mécanicien

As a mécanicien,
I want initier une commande pour un client et générer un lien de choix partageable,
So that le propriétaire puisse voir les options et choisir lui-même avec transparence.

**Acceptance Criteria:**

**Given** un mécanicien a trouvé des résultats de recherche (via navigation, OEM, VIN ou photo)
**When** il sélectionne "Envoyer au propriétaire"
**Then** une commande est créée en statut `DRAFT`
**And** un lien partageable unique est généré
**And** le lien peut être envoyé via WhatsApp, SMS ou copié
**And** le prix de chaque pièce est verrouillé (snapshot dans `OrderItem`) au moment de la création de la commande — le vendeur confirme au prix fixé, pas au prix catalogue actuel

**Given** la state machine commande
**When** une commande est créée
**Then** elle suit les 10 états : DRAFT → PENDING_PAYMENT → PAID → VENDOR_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → CONFIRMED → COMPLETED → CANCELLED
**And** les transitions sont validées (impossible de passer de DRAFT à DELIVERED)
**And** les tables Prisma `Order`, `OrderItem`, `OrderStatusHistory` sont créées

**Given** le mécanicien veut commander directement (propriétaire présent au garage)
**When** il sélectionne "Commander directement"
**Then** le flow passe directement à la sélection de pièce et au paiement
**And** la commande est associée au mécanicien comme initiateur

### Story 4.2 : Page de Choix Propriétaire & Mode Guest

As a propriétaire,
I want visualiser les options de pièces avec prix transparents depuis le lien reçu de mon mécanicien,
So that je puisse comparer et choisir en toute connaissance de cause.

**Acceptance Criteria:**

**Given** le propriétaire ouvre le lien partageable
**When** la page se charge
**Then** les options de pièces sont affichées : photo, nom, état (neuf/occasion/aftermarket), prix pièce, frais livraison, prix total
**And** les vendeurs sont affichés avec leur badge et note
**And** les 3 premières options sont recommandées (meilleur rapport qualité-prix, moins cher, mieux noté)
**And** tous les résultats sont visibles (aucun masqué — transparence totale)
**And** si le mécanicien a pré-sélectionné un vendeur, une mention est affichée : "Votre mécanicien recommande [vendeur X], mais d'autres options sont disponibles ci-dessous"
**And** le propriétaire a la liberté totale de choisir n'importe quel vendeur, indépendamment de la recommandation du mécanicien

**Given** le propriétaire n'a pas de compte Pièces
**When** il veut commander
**Then** il peut finaliser en mode guest en saisissant uniquement son numéro de téléphone (FR58)
**And** aucune création de compte préalable n'est requise
**And** un OTP de vérification est envoyé au numéro guest AVANT la confirmation de la commande COD (vérifier que le numéro est réel et actif)
**And** si le numéro est dans la blacklist (historique de "client absent" ou "refus paiement COD" récurrent) → la commande COD est refusée avec message : "Le paiement à la livraison n'est pas disponible pour ce numéro. Choisissez un paiement mobile money."

**Given** le montant est < 25 000 FCFA
**When** la page est affichée
**Then** l'interface est simplifiée (flow léger, options directes)

**Given** le montant est > 25 000 FCFA
**When** la page est affichée
**Then** l'interface est enrichie : photos de la pièce réelle, badge vendeur, avis, comparaison détaillée

**Given** le prix affiché
**When** le propriétaire consulte les options
**Then** le prix total est transparent : pièce + livraison = total, aucun frais caché
**And** si retrait possible (vendeur < 500m) : "Retrait — 0 FCFA livraison" est affiché

**Given** les options de pièces sont affichées
**When** le propriétaire consulte un vendeur
**Then** les avis vérifiés des acheteurs précédents sont affichés (note moyenne + commentaires récents)
**And** seuls les acheteurs ayant effectivement reçu une pièce de ce vendeur peuvent laisser un avis

**Given** le mécanicien a initié la commande
**When** il active l'option "Facture séparée" avant de partager le lien au propriétaire
**Then** la page de choix propriétaire affiche le prix de la pièce séparé du coût de la main d'oeuvre (saisi par le mécanicien)
**And** le propriétaire voit clairement : "Pièce : X FCFA — Main d'oeuvre : Y FCFA — Livraison : Z FCFA — Total : X+Y+Z FCFA"
**And** cette option est facultative — si non activée, seuls le prix pièce et les frais de livraison sont affichés

### Story 4.3 : Sélection Pièce & Paiement CinetPay

As a propriétaire (ou mécanicien en mode direct),
I want sélectionner une pièce et payer via mobile money ou COD,
So that la commande soit confirmée et la pièce en route.

**Acceptance Criteria:**

**Given** le propriétaire sélectionne une option
**When** il choisit un mode de paiement
**Then** les modes disponibles sont : Orange Money, MTN MoMo, Wave, Cash à la livraison (COD)
**And** le COD est plafonné à 75 000 FCFA

**Given** le propriétaire choisit mobile money
**When** il lance le paiement
**Then** l'intégration CinetPay génère le formulaire de paiement pré-rempli
**And** la confirmation de paiement est reçue en temps réel
**And** la commande passe de DRAFT à PENDING_PAYMENT puis PAID

**Given** le propriétaire choisit COD
**When** il confirme la commande
**Then** la commande passe directement à PAID (paiement attendu à la livraison)
**And** le montant COD est affiché sur l'interface Rider

**Given** le paiement échoue
**When** CinetPay retourne une erreur
**Then** un message d'erreur clair est affiché
**And** l'utilisateur peut réessayer ou changer de mode de paiement
**And** la commande reste en DRAFT

### Story 4.4 : Séquestre Fonds & Virement Vendeur

As a vendeur,
I want recevoir le paiement dans les 2 heures suivant la confirmation de livraison,
So that j'aie la garantie d'être payé à chaque transaction.

**Acceptance Criteria:**

**Given** un paiement mobile money est confirmé
**When** le processeur de paiement (CinetPay ou autre) traite la transaction
**Then** les fonds sont reçus sur le compte Pièces (escrow géré directement par Pièces)
**And** les fonds ne sont PAS virés immédiatement au vendeur
**And** la commande passe à PAID
**And** le montant escrow est tracké dans la table `EscrowTransaction` (montant, commande, statut, timestamps)

**Given** la livraison est confirmée (statut DELIVERED → CONFIRMED)
**When** le destinataire ou le timeout confirme la réception
**Then** Pièces déclenche le virement vers le vendeur via le processeur de paiement
**And** le virement est effectué dans les 2 heures (FR19)
**And** la transaction escrow passe à `released`

**Given** aucune confirmation de réception après 48 heures (FR60)
**When** le timeout est atteint
**Then** les fonds sont automatiquement libérés vers le vendeur
**And** la commande passe à COMPLETED

**Given** une annulation ou un litige tranché en faveur de l'acheteur
**When** le remboursement est déclenché
**Then** Pièces rembourse automatiquement l'acheteur vers le mode de paiement original (FR59)
**And** la transaction escrow passe à `refunded`

**Given** un fallback escrow est nécessaire
**When** la durée de rétention dépasse 48h (ex: litige en cours)
**Then** les fonds restent sur le compte Pièces jusqu'à résolution du litige
**And** un plafond de rétention configurable est défini (ex: 30 jours max avant escalade obligatoire)

### Story 4.5 : Confirmation Vendeur & Annulation Auto 45 min

As a vendeur,
I want confirmer ou décliner une commande dans un délai raisonnable,
So that l'acheteur ne soit pas bloqué en attente.

**Acceptance Criteria:**

**Given** une commande est payée (statut PAID)
**When** le vendeur reçoit la notification de commande
**Then** il voit les détails : pièce, quantité, prix, mode livraison, zone
**And** il a deux options : "Confirmer" ou "Décliner"
**And** un timer de 45 minutes est affiché

**Given** le vendeur confirme
**When** il appuie sur "Confirmer"
**Then** la commande passe à VENDOR_CONFIRMED
**And** le dispatch livraison est déclenché

**Given** le vendeur décline
**When** il appuie sur "Décliner"
**Then** la commande est annulée
**And** le remboursement est déclenché automatiquement

**Given** le vendeur n'a pas répondu après 30 minutes
**When** le rappel est déclenché
**Then** un rappel est envoyé au vendeur (WhatsApp + SMS) : "Commande #X en attente — 15 min restantes pour confirmer"

**Given** le vendeur ne répond pas dans 45 minutes (FR15)
**When** le timeout est atteint
**Then** le système tente un re-routing automatique : la commande est proposée au vendeur suivant dans la liste (même pièce, prix le plus proche)
**And** si un vendeur alternatif est disponible : la commande est re-routée et l'acheteur est notifié "Vendeur indisponible — commande transférée à [vendeur alternatif], même pièce, prix [X] FCFA"
**And** si aucun vendeur alternatif n'est disponible : la commande est annulée, l'acheteur est remboursé intégralement et notifié

**Given** un pattern de collusion vendeur-mécanicien est suspecté
**When** l'admin consulte le dashboard
**Then** les paires mécanicien-vendeur avec un taux de sélection anormalement élevé (> 80% des commandes du mécanicien vers le même vendeur) et un prix moyen > moyenne marché sont signalées

**Given** le vendeur confirme une commande
**When** la commande passe à VENDOR_CONFIRMED
**Then** le vendeur voit les instructions de préparation : pièce à préparer, adresse de pickup, délai estimé avant passage du Rider
**And** le vendeur est notifié quand le Rider est assigné et en route vers sa boutique

### Story 4.6 : Annulation Commande par l'Acheteur

As a acheteur,
I want annuler une commande confirmée avant l'assignation à un Rider,
So that je puisse changer d'avis sans pénalité tant que la livraison n'a pas démarré.

**Acceptance Criteria:**

**Given** une commande en statut PAID ou VENDOR_CONFIRMED
**When** l'acheteur appuie sur "Annuler la commande"
**Then** si aucun Rider n'est assigné : annulation immédiate avec remboursement intégral (FR53)
**And** la commande passe à CANCELLED
**And** le vendeur est notifié de l'annulation

**Given** une commande en statut DISPATCHED ou IN_TRANSIT
**When** l'acheteur tente d'annuler
**Then** l'annulation est refusée
**And** un message explique : "La livraison est en cours. Contactez le support si nécessaire."

### Story 4.7 : Panier Multi-Références & Livraison Consolidée

As a mécanicien,
I want ajouter des pièces de différents véhicules dans un même panier et déclencher une seule livraison,
So that je puisse commander plusieurs pièces en un seul envoi et économiser sur les frais de livraison.

**Acceptance Criteria:**

**Given** un mécanicien recherche des pièces pour plusieurs véhicules
**When** il ajoute des pièces au panier
**Then** chaque pièce est associée à un véhicule spécifique
**And** le panier affiche le récapitulatif : pièces, véhicules, vendeurs, prix unitaires

**Given** un panier contient des pièces de vendeurs différents
**When** le mécanicien valide le panier
**Then** les commandes sont groupées par vendeur
**And** les livraisons sont consolidées quand possible (même vendeur = 1 livraison)
**And** le total (pièces + frais livraison consolidés) est affiché clairement

**Given** le panier est prêt
**When** le mécanicien choisit "Envoyer au propriétaire"
**Then** un seul lien partageable est généré pour tout le panier (FR10)

---

## Epic 5 : Livraison & Logistique

Les pièces sont livrées au garage avec suivi temps réel, assignation Rider, collecte COD, gestion SLA, et confirmation active.

### Story 5.1 : Assignation Livraison & Interface Mission Rider

As a coordinateur Pièces,
I want assigner manuellement une livraison à un Rider disponible,
So that la pièce soit expédiée vers le garage dans les délais.

**Acceptance Criteria:**

**Given** une commande passe à VENDOR_CONFIRMED
**When** le coordinateur accède au tableau de bord livraison
**Then** il voit les commandes en attente de dispatch avec : pièce, coordonnées GPS vendeur, coordonnées GPS garage (+ point de repère textuel), mode livraison (Express/Standard), mode paiement
**And** les adresses de livraison utilisent les coordonnées GPS enregistrées (pas de texte libre) — le point de repère textuel est affiché en complément pour le Rider

**Given** le coordinateur sélectionne un Rider
**When** il assigne la livraison
**Then** la commande passe à DISPATCHED
**And** le Rider reçoit une notification avec les détails de sa mission

**Given** le Rider reçoit une mission
**When** il ouvre l'interface Rider
**Then** il voit en gros : adresse de pickup (vendeur), adresse de livraison (garage), description pièce, mode de paiement, montant total (FR23)
**And** si mode mobile money : un QR code pré-généré est affiché
**And** si mode COD : le montant à collecter est affiché en gros

### Story 5.2 : Suivi Temps Réel & Estimation Délai

As a acheteur ou mécanicien,
I want suivre l'état de ma livraison en temps réel et connaître le délai estimé,
So that je puisse m'organiser et savoir quand la pièce arrive.

**Acceptance Criteria:**

**Given** une commande est en statut DISPATCHED
**When** le Rider est en route
**Then** la commande passe à IN_TRANSIT
**And** l'acheteur et le mécanicien peuvent consulter l'état en temps réel via SSE (Server-Sent Events)

**Given** le suivi est actif
**When** l'utilisateur consulte sa commande
**Then** le statut actuel est affiché (en cours de pickup, en transit, proche du garage)
**And** un délai estimé est affiché : Express ≤ 1h30, Standard ≤ 24h (FR25)
**And** le nom du coursier est mentionné dans la notification "en route"

**Given** la livraison Express dépasse le SLA 1h30
**When** le retard est détecté
**Then** une alerte proactive est envoyée au client AVANT qu'il contacte le support
**And** le nouveau délai estimé est communiqué

### Story 5.3 : Collecte Paiement Rider (COD & Mobile Money)

As a Rider,
I want collecter le paiement à la livraison et gérer les incidents de paiement,
So that la transaction soit complétée correctement sur le terrain.

**Acceptance Criteria:**

**Given** une livraison en mode mobile money
**When** le Rider arrive au garage
**Then** le QR code de paiement pré-généré est affiché sur l'écran du Rider
**And** le client scanne le QR pour payer

**Given** le paiement mobile money échoue (réseau)
**When** le Rider appuie sur "Problème paiement" (FR21)
**Then** le support est alerté immédiatement
**And** un fallback vers un mode de paiement alternatif est proposé (ex: Wave → Orange Money)
**And** un nouveau QR est généré pour le mode alternatif

**Given** une livraison en mode COD
**When** le Rider collecte le cash
**Then** il voit le montant exact à collecter et le plafond COD (75 000 FCFA)
**And** il capture un récépissé photo du paiement (FR20)
**And** la livraison est confirmée

**Given** la fin de journée du Rider
**When** il consulte son récapitulatif
**Then** ses courses sont résumées et son paiement journalier est calculé automatiquement

### Story 5.4 : Confirmation Livraison Active & Gestion SLA

As a système,
I want confirmer activement les livraisons et gérer les dépassements SLA,
So that la qualité de service soit maintenue et les mécaniciens compensés en cas de retard.

**Acceptance Criteria:**

**Given** une livraison est enregistrée par le Rider (statut DELIVERED)
**When** 30 minutes se sont écoulées
**Then** le bot envoie une demande de confirmation au destinataire : "La pièce est-elle conforme ? ✅ / ❌" (FR27)

**Given** le destinataire confirme ✅
**When** la confirmation est reçue
**Then** la commande passe à CONFIRMED
**And** la libération des fonds escrow est déclenchée

**Given** le destinataire répond ❌ (pièce non conforme)
**When** la réponse est reçue
**Then** un litige est ouvert automatiquement (traité dans Epic 7)
**And** les fonds restent en escrow

**Given** le Rider confirme la livraison
**When** la position GPS du Rider est enregistrée
**Then** la distance entre la position GPS du Rider et les coordonnées GPS du garage est calculée
**And** si l'écart dépasse 500m → alerte automatique au coordinateur : "Livraison confirmée à distance suspecte du garage"
**And** la livraison n'est PAS auto-confirmée — elle reste en attente de la confirmation active du destinataire

**Given** une commande > 25 000 FCFA est livrée
**When** le timeout de confirmation 48h est atteint sans réponse du destinataire
**Then** les fonds ne sont PAS libérés automatiquement — une relance supplémentaire est envoyée (WhatsApp + SMS + appel support)
**And** la libération auto n'intervient qu'après 72h pour les commandes > 25 000 FCFA

**Given** une commande > 50 000 FCFA est livrée
**When** la confirmation est demandée
**Then** la confirmation doit provenir des deux parties (mécanicien ET propriétaire) pour déclencher la libération escrow

**Given** une livraison Express dépasse le SLA 1h30
**When** le retard est confirmé
**Then** le mécanicien est crédité automatiquement d'une livraison Standard gratuite (FR26)
**And** le crédit est appliqué sur sa prochaine commande

### Story 5.5 : Protocole Client Absent

As a Rider,
I want signaler un client absent et suivre un protocole clair,
So that je ne reste pas bloqué indéfiniment et que la pièce soit gérée correctement.

**Acceptance Criteria:**

**Given** le Rider arrive au garage et le destinataire est absent
**When** il appuie sur "Client absent" (FR57)
**Then** un timer d'attente est déclenché (durée configurable, ex: 15 min)
**And** une notification est envoyée au destinataire : "Votre coursier est au garage. Merci de venir récupérer votre pièce."

**Given** le timer d'attente expire sans réponse
**When** le délai est dépassé
**Then** le Rider reçoit l'instruction de retourner la pièce au vendeur
**And** la commande est mise en attente de replanification
**And** l'acheteur est notifié avec options : reprogrammer la livraison ou annuler
**And** l'incident "client absent" est enregistré dans le score de fiabilité du numéro — après 2 incidents, le numéro est ajouté à la blacklist COD (paiement mobile money obligatoire pour les commandes futures)

---

## Epic 6 : Bot WhatsApp — Identification & Commande

Les mécaniciens peuvent identifier des pièces et commander entièrement via WhatsApp, avec désambiguïsation visuelle et escalade humaine.

### Story 6.1 : Infrastructure Bot WhatsApp & Webhook

As a système,
I want recevoir et traiter les messages WhatsApp entrants via le webhook Cloud API,
So that le bot puisse interagir avec les mécaniciens et propriétaires sur WhatsApp.

**Acceptance Criteria:**

**Given** WhatsApp Cloud API est configurée
**When** un utilisateur envoie un message au numéro Pièces
**Then** le webhook Fastify reçoit l'événement
**And** le message est parsé (texte, image, audio, localisation)
**And** les inputs sont sanitisés : métadonnées EXIF strippées des images, contenu texte filtré (pas d'instructions de prompt injection), format image validé (JPEG/PNG/WebP uniquement, max 5 MB)
**And** un rate limit par numéro WhatsApp est appliqué : max 10 photos/heure, max 50 messages/heure — au-delà, le bot répond : "Trop de messages — réessayez dans quelques minutes" et les requêtes sont droppées sans appel IA
**And** le traitement est lancé dans le process long-running Fastify (pas de timeout 60s)

**Given** le bot doit répondre
**When** une réponse est prête
**Then** le message est envoyé via l'API WhatsApp Cloud
**And** les templates pré-approuvés Meta sont utilisés pour les messages proactifs
**And** le temps total (webhook → réponse) est < 10 secondes (NFR1)

**Given** un nouvel utilisateur interagit pour la première fois
**When** il envoie son premier message
**Then** le consentement ARTCI est demandé avant toute interaction (réutilise la logique Epic 1)

### Story 6.2 : Photo Pièce → Identification IA via WhatsApp

As a mécanicien,
I want envoyer une photo de pièce sur WhatsApp et recevoir les correspondances avec prix et vendeurs,
So that je puisse identifier une pièce et commander sans quitter WhatsApp.

**Acceptance Criteria:**

**Given** Kofi interagit avec le bot pour la première fois (ou n'a pas encore envoyé de photo)
**When** il envoie un message texte ou "bonjour"
**Then** le bot répond avec les instructions de photo : "📷 Envoyez une photo de la pièce — entière, bonne lumière, fond uni si possible. Plus la photo est nette, plus les résultats sont précis !"

**Given** Kofi envoie une photo de pièce au bot Pièces
**When** la photo est reçue
**Then** le bot répond : "Photo reçue ✅ — Pour vous donner les bonnes pièces, envoyez maintenant une photo de la **carte grise** du véhicule."
**And** l'image est envoyée à Gemini VLM pour identification (réutilise l'API Epic 3)

**Given** l'IA identifie la pièce avec confiance élevée
**When** les résultats arrivent (< 10s total)
**Then** le bot envoie les résultats en format WhatsApp natif (FR1)
**And** mode expert (mécanicien) : 1 recommandation optimale en premier + "O" pour commander, "V" pour voir toutes les offres, "P + numéro" pour envoyer au propriétaire
**And** tous les vendeurs disponibles sont listés, top 3 recommandés en premier

**Given** l'IA a une confiance faible
**When** plusieurs pièces sont possibles
**Then** le bot envoie 4-5 images de pièces possibles : "Est-ce que c'est un de ceux-là ?"
**And** Kofi tape sur l'image correspondante (ou répond 1, 2, 3...)
**And** les résultats filtrés sont envoyés après sélection

**Given** ni la photo ni la désambiguïsation ne donnent de résultat
**When** l'identification échoue
**Then** le bot répond : "Un spécialiste Pièces vérifie pour vous — réponse sous 2 minutes"
**And** la demande est escaladée au support humain
**And** le spécialiste répond dans le même thread WhatsApp

**Given** Kofi envoie un message vocal au bot (ex: "J'ai besoin d'un alternateur pour Corolla 2010")
**When** le message audio est reçu
**Then** l'IA transcrit le message vocal en texte
**And** la recherche est lancée à partir de la transcription
**And** les résultats sont retournés dans le même format que pour une photo ou un texte

### Story 6.3 : OCR Carte Grise & Décodage VIN WhatsApp

As a mécanicien,
I want envoyer une photo de la carte grise pour que le bot extraie automatiquement le VIN,
So that les résultats soient filtrés par véhicule exact sans que j'aie à taper le VIN.

**Acceptance Criteria:**

**Given** le bot a demandé la photo de carte grise
**When** Kofi envoie la photo
**Then** l'OCR (Tesseract / Google Vision) extrait le VIN de la carte grise ivoirienne (FR2)
**And** si ≥ 14/17 caractères reconnus : le VIN est décodé via le service VIN
**And** le bot confirme : "Véhicule confirmé : [Marque] [Modèle] [Moteur] ([Année]) ✅"

**Given** la photo de carte grise est illisible (OCR < 14/17 caractères)
**When** le premier essai échoue
**Then** le bot propose 1 retry : "La photo n'est pas assez nette. Essayez avec plus de lumière ☀️"
**And** si le 2ème essai échoue : "Tapez les 17 caractères du VIN directement" (FR4)

**Given** le VIN tapé manuellement est invalide
**When** la validation échoue
**Then** le bot propose un fallback : "Pas de souci ! Essayez la recherche sur la PWA : [lien]"
**And** le flow ne se bloque jamais (Principe Zéro Impasse)

### Story 6.4 : Flow Commande WhatsApp Complet

As a mécanicien,
I want commander une pièce ou envoyer les options à mon client directement depuis WhatsApp,
So that tout le processus se fasse sans quitter la conversation.

**Acceptance Criteria:**

**Given** les résultats sont affichés en mode expert
**When** Kofi répond "O" (commander)
**Then** une commande directe est créée (réutilise l'API Epic 4)
**And** si le propriétaire est au garage → paiement sur place
**And** confirmation : "Commande confirmée. Livraison estimée : 1h30"

**Given** les résultats sont affichés
**When** Kofi répond "P 0707123456" (partager au propriétaire)
**Then** un message WhatsApp est envoyé au propriétaire avec les options
**And** le message est au format détaillé : "Votre mécanicien Kofi vous recommande... Répondez 1, 2 ou 3 pour commander"
**And** le flow tripartite est activé

**Given** le propriétaire reçoit les options via WhatsApp
**When** le montant est < 25 000 FCFA
**Then** le propriétaire commande directement dans WhatsApp ("Répondez 1, 2 ou 3")
**And** paiement COD = zéro sortie WhatsApp

**Given** le montant est > 25 000 FCFA
**When** le propriétaire reçoit les options
**Then** un lien vers la mini-page détaillée est inclus (photos, badges, avis, paiement CinetPay)
**And** la page charge en < 3 secondes sur 3G

### Story 6.5 : Notifications WhatsApp Commande

As a utilisateur (mécanicien, propriétaire, vendeur),
I want recevoir les notifications de ma commande sur WhatsApp,
So that je suive l'avancement sans ouvrir la PWA.

**Acceptance Criteria:**

**Given** une commande progresse dans la state machine
**When** une transition d'état se produit
**Then** le bot envoie la notification appropriée via template WhatsApp approuvé :
- "Commande confirmée ✅"
- "Pièce en route vers le garage 🚀"
- "Pièce livrée ✅"

**Given** les notifications par commande
**When** elles sont envoyées
**Then** maximum 2-3 messages par commande (pas de spam)
**And** le ton est conversationnel, pas corporate
**And** les emoji structurent le message (1️⃣ 2️⃣ 3️⃣, ✅, 🚀)

---

## Epic 7 : Évaluations, Confiance & Litiges

Système de notation, badge "Bon Mécano", litiges et remplacement urgent.

### Story 7.1 : Évaluation Mécanicien & Livraison par le Propriétaire

As a propriétaire,
I want évaluer le mécanicien et la livraison après réception de la pièce,
So that les bons mécaniciens soient récompensés et les futurs acheteurs informés.

**Acceptance Criteria:**

**Given** une commande est en statut CONFIRMED (livraison reçue)
**When** le propriétaire reçoit la demande d'évaluation (WhatsApp ou PWA)
**Then** il peut noter le mécanicien (1 à 5 étoiles) et la livraison (1 à 5 étoiles) (FR44)
**And** un commentaire optionnel peut être ajouté

**Given** la note est soumise
**When** elle est enregistrée
**Then** la note est associée à la commande avec la date
**And** la note moyenne du mécanicien est recalculée
**And** seuls les acheteurs ayant reçu la pièce peuvent noter (avis vérifiés)

### Story 7.2 : Badge "Bon Mécano" — Attribution & Révocation Automatique

As a mécanicien,
I want recevoir automatiquement le badge "Bon Mécano" quand mes notes le justifient,
So que mes clients voient que je suis un professionnel reconnu.

**Acceptance Criteria:**

**Given** un mécanicien atteint ≥ 4,2/5 de note moyenne sur ≥ 10 commandes évaluées
**When** le seuil est atteint
**Then** le badge "Bon Mécano" est décerné automatiquement (FR42)
**And** le badge est affiché sur son profil (PWA et dans les messages WhatsApp)
**And** le mécanicien est notifié de l'obtention du badge

**Given** un mécanicien avec le badge voit sa note moyenne descendre sous 4,2/5
**When** la fenêtre glissante est recalculée
**Then** le badge est révoqué automatiquement (FR62)
**And** le mécanicien est notifié de la perte du badge

**Given** la note moyenne d'un mécanicien approche le seuil (ex: 4,3/5)
**When** la variation est détectée
**Then** le mécanicien est notifié préventivement : "Votre note est proche du seuil. Maintenez la qualité !" (FR45)

**Given** les critères du badge
**When** un utilisateur consulte les conditions
**Then** les critères sont publics, non-négociables, et transparents

### Story 7.3 : Consultation Notes & Contestation

As a mécanicien,
I want consulter mes notes par commande et contester une note que je juge abusive,
So que je puisse comprendre mes évaluations et me défendre si nécessaire.

**Acceptance Criteria:**

**Given** un mécanicien accède à son profil
**When** il consulte la section "Mes évaluations"
**Then** il voit chaque note avec la date et la commande associée (FR43)
**And** sa note moyenne globale et son évolution sont affichées

**Given** le mécanicien juge une note abusive
**When** il soumet un formulaire de contestation
**Then** la contestation est envoyée au support pour revue
**And** le support a 48h pour rendre une décision
**And** si la contestation est acceptée : la note est retirée du calcul

### Story 7.4 : Ouverture Litige & Soumission Preuves

As a acheteur,
I want ouvrir un litige sur une pièce non conforme et soumettre des photos comme preuves,
So que le problème soit résolu et que je sois remboursé si nécessaire.

**Acceptance Criteria:**

**Given** un acheteur a reçu une pièce non conforme
**When** il ouvre un litige depuis la PWA ou WhatsApp (FR40)
**Then** il peut décrire le problème et soumettre des photos
**And** le litige est créé avec statut `open`
**And** les fonds restent en escrow
**And** un score de risque litige est calculé pour l'acheteur : si > 3 litiges sur ses 10 dernières commandes → le litige est flaggé pour revue manuelle obligatoire avant tout remboursement
**And** les photos soumises en litige sont comparées (hash perceptuel) aux photos de la commande originale pour détecter les substitutions d'images

**Given** un litige est ouvert
**When** le support accède au dossier
**Then** il peut voir les photos et messages WhatsApp associés à la commande originale (FR49)
**And** le SLA support litige est de 4h pour premier contact

### Story 7.5 : Arbitrage Bilatéral & Décision Écrite

As a agent Pièces,
I want conduire un arbitrage bilatéral avec accès aux preuves et rendre une décision écrite,
So que les litiges soient résolus équitablement.

**Acceptance Criteria:**

**Given** un litige est en statut `open`
**When** l'agent Pièces prend en charge le dossier
**Then** il peut contacter le vendeur et l'acheteur (appel bilatéral) (FR41)
**And** il a accès aux photos WhatsApp, détails commande, preuves soumises, et l'historique complet de litiges de l'acheteur (score de risque, litiges précédents, taux de litiges)
**And** pour les pièces d'occasion sous garantie 30 jours : des photos de l'état de la pièce à la livraison (capturées par le Rider) sont disponibles pour comparaison avec les photos du litige
**And** l'agent peut demander un avis technique tiers (mécanicien neutre) si l'usure normale est invoquée — la clause "usure normale exclue de la garantie" s'applique

**Given** l'agent rend sa décision
**When** la décision est écrite et soumise
**Then** si décision en faveur de l'acheteur : remboursement intégral automatique (fonds escrow → acheteur)
**And** si décision en faveur du vendeur : fonds libérés au vendeur, commande clôturée
**And** la décision écrite est archivée et accessible aux deux parties
**And** le délai maximum pour la décision est de 24h

### Story 7.6 : Commande de Remplacement Urgent

As a mécanicien,
I want déclencher une commande de remplacement en 1 tap si la pièce est non conforme,
So que mon client ne soit pas bloqué et que je ne paie pas deux fois.

**Acceptance Criteria:**

**Given** le mécanicien reçoit la confirmation livraison active (30 min post-livraison) et répond ❌
**When** il confirme que la pièce est non conforme
**Then** le bot propose : "Commander la variante alternative en urgence ? La commande originale est mise en litige automatiquement." (FR16)

**Given** le mécanicien confirme le remplacement
**When** il accepte
**Then** une commande de remplacement est créée sans double paiement
**And** un litige est ouvert en parallèle sur la commande originale
**And** les fonds escrow de la commande originale restent bloqués
**And** la commande de remplacement est envoyée en priorité

---

## Epic 8 : Notifications Multi-Canal

Notifications intelligentes à chaque acteur via WhatsApp, SMS et Push PWA.

### Story 8.1 : Service Notifications Multi-Canal

As a système,
I want envoyer des notifications aux bons acteurs aux étapes clés via le canal approprié,
So que chaque utilisateur soit informé sans être spammé.

**Acceptance Criteria:**

**Given** une transition d'état commande se produit
**When** une notification doit être envoyée
**Then** le service de notification détermine les destinataires et le canal selon la hiérarchie (FR35) :
1. WhatsApp (prioritaire) — via templates approuvés Meta
2. SMS (fallback si WhatsApp indisponible)
3. Push PWA (complément)

**Given** le service de notification
**When** un job notification est créé
**Then** il est mis en queue pgqueue pour traitement asynchrone
**And** le traitement est fiable (retry en cas d'échec)
**And** les notifications sont envoyées dans les 30 secondes suivant la transition

**Given** les notifications par acteur
**When** une commande progresse
**Then** :
- Mécanicien : commande confirmée, pièce en route, pièce livrée
- Propriétaire : options disponibles, paiement confirmé, livraison en route, livrée
- Vendeur : nouvelle commande (avec timer 45 min), livraison confirmée, paiement reçu
- Rider : mission assignée

### Story 8.2 : Alertes Vendeur (Stock Critique & Demande Catalogue)

As a vendeur,
I want recevoir des alertes quand mon stock atteint un seuil critique ou qu'une demande correspond à mon catalogue,
So que je puisse réagir rapidement et ne pas perdre de ventes.

**Acceptance Criteria:**

**Given** un vendeur a configuré un seuil de stock critique
**When** le stock d'une pièce atteint ce seuil
**Then** une alerte est envoyée au vendeur via son canal préféré (FR36)
**And** l'alerte indique la pièce concernée et le stock restant

**Given** une recherche d'un acheteur correspond à une pièce du catalogue vendeur
**When** la correspondance est détectée
**Then** le vendeur reçoit une alerte : "Demande pour [pièce] dans votre catalogue" (FR37)

### Story 8.3 : Préférences de Notification par Canal

As a utilisateur,
I want gérer mes préférences de notification par canal,
So que je reçoive les notifications uniquement de la manière qui me convient.

**Acceptance Criteria:**

**Given** un utilisateur accède à ses paramètres
**When** il configure ses préférences de notification
**Then** il peut activer/désactiver chaque canal : WhatsApp, SMS, Push PWA (FR61)
**And** au moins un canal doit rester actif pour les notifications critiques (commande, paiement)

**Given** les préférences sont sauvegardées
**When** une notification est envoyée
**Then** seuls les canaux activés par l'utilisateur sont utilisés
**And** la hiérarchie de fallback respecte les préférences

### Story 8.4 : Appel Proactif J+1 SLA Breach

As a équipe Pièces,
I want déclencher un appel proactif vers un mécanicien le lendemain d'une première commande avec SLA breach,
So que le mécanicien se sente pris en charge et revienne sur la plateforme.

**Acceptance Criteria:**

**Given** un mécanicien a passé sa première commande
**When** cette commande a eu un SLA breach (Express > 1h30)
**Then** le système crée une tâche d'appel proactif pour J+1 (FR38)
**And** la tâche est visible dans le tableau de bord support

**Given** l'agent support appelle le mécanicien
**When** l'appel est effectué (90 secondes, pas un script)
**Then** l'agent s'excuse, comprend l'impact, et propose une solution
**And** l'appel est loggé dans le dossier du mécanicien
**And** la rétention J7 post-incident est trackée pour mesurer l'efficacité du recovery

---

## Epic 9 : Administration, Historique & Enterprise

Outils admin, historique commandes, et fonctionnalités Enterprise de base.

### Story 9.1 : Historique Commandes Utilisateur

As a utilisateur (mécanicien, propriétaire, vendeur),
I want consulter l'historique de mes commandes passées avec statut, détails et documents associés,
So que je puisse suivre mes transactions et retrouver les informations importantes.

**Acceptance Criteria:**

**Given** un utilisateur authentifié
**When** il accède à la section "Mes commandes"
**Then** il voit la liste de ses commandes triées par date décroissante (FR52)
**And** chaque commande affiche : numéro, date, pièce, vendeur/mécanicien (selon le rôle), statut, montant

**Given** l'utilisateur clique sur une commande
**When** les détails s'affichent
**Then** il voit : timeline complète des statuts, détails pièce, informations livraison, documents associés (photo pièce, récépissé)
**And** la confidentialité est respectée selon la matrice des rôles (DTO Projection de l'Epic 1)

**Given** la pagination
**When** l'utilisateur a beaucoup de commandes
**Then** la pagination cursor-based est utilisée
**And** le chargement est progressif (lazy loading)

**Given** un utilisateur avec le rôle gestionnaire flotte ou admin Enterprise
**When** il consulte l'historique
**Then** il peut filtrer les commandes par véhicule et par mécanicien
**And** un résumé des dépenses par filtre est affiché (total, nombre de commandes)

### Story 9.2 : Admin Cross-Tenant & Journalisation

As a admin/support Pièces,
I want accéder aux données cross-tenant avec journalisation obligatoire,
So que je puisse gérer les litiges et le support en toute conformité ARTCI.

**Acceptance Criteria:**

**Given** un admin/support authentifié avec le rôle approprié
**When** il accède aux données d'un autre utilisateur/vendeur/mécanicien
**Then** l'accès est autorisé (FR34)
**And** chaque action est loggée avec : timestamp, admin ID, action, données consultées, raison d'accès

**Given** l'admin consulte un dossier litige
**When** il accède aux photos et messages WhatsApp associés
**Then** les données sont affichées de manière structurée
**And** l'accès est tracé dans les logs d'audit

**Given** les logs d'audit
**When** ils sont stockés
**Then** ils sont conservés 12 mois minimum (conformité ARTCI)
**And** ils ne peuvent pas être modifiés ou supprimés
**And** l'export des logs est prévu pour Phase 2 (FR63)

### Story 9.3 : Espace Enterprise & Gestion Membres

As a admin Enterprise (gestionnaire de flotte),
I want inviter des membres dans mon espace et leur assigner des rôles internes,
So que mon équipe puisse utiliser Pièces dans le cadre de l'entreprise.

**Acceptance Criteria:**

**Given** un utilisateur crée un espace Enterprise
**When** l'espace est initialisé
**Then** un tenant Enterprise est créé
**And** l'utilisateur devient admin du tenant

**Given** un admin Enterprise
**When** il invite un membre par numéro de téléphone
**Then** le membre reçoit une invitation (WhatsApp/SMS) (FR32)
**And** à l'acceptation, le membre est ajouté au tenant
**And** l'admin peut assigner des rôles internes (ex: mécanicien flotte, gestionnaire)

**Given** les contraintes tenant
**When** un utilisateur est invité
**Then** un compte peut appartenir à au plus 1 tenant Enterprise simultanément (FR33)
**And** si l'utilisateur appartient déjà à un tenant, un message d'erreur l'explique

**Given** un admin Enterprise
**When** il gère les membres
**Then** il peut voir la liste des membres, leurs rôles, et les retirer si nécessaire

**Note Phase 2 :** Le workflow d'approbation Enterprise (seuil pré-autorisé mécanicien, commande directe sous le seuil, approbation gestionnaire au-dessus) sera implémenté en Phase 2 avec le dashboard flotte complet (FR28).
