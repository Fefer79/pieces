---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowStatus: 'complete'
completedDate: '2026-02-28'
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-02-26.md
  - _bmad-output/planning-artifacts/domain-research-pieces-2026-02-27.md
  - _bmad-output/planning-artifacts/market-research-pieces-2026-02-27.md
  - _bmad-output/planning-artifacts/technical-research-pieces-2026-02-27.md
workflowType: 'prd'
briefCount: 0
researchCount: 3
brainstormingCount: 1
projectDocsCount: 0
classification:
  projectType: 'multi-channel marketplace'
  domain: 'trust infrastructure'
  complexity: 'haute'
  projectContext: 'brownfield informel'
  channels:
    - 'WhatsApp (photo-first, flux primaire pour mécaniciens et utilisateurs peu digitalisés)'
    - 'PWA navigation visuelle (marque → modèle → année → catégorie)'
    - 'PWA recherche VIN / référence OEM (mécaniciens avancés, importateurs)'
  coreProposition: 'Prescription transparente — mécanicien diagnostique, propriétaire choisit (neuf/occasion/aftermarket, multi-vendeurs, prix transparents), Pièces livre au garage'
  moat: 'Data propriétaire (premier catalogue pièces ivoirien) + réseau mécaniciens certifiés'
  notes: 'Brownfield informel — greffer sur infrastructure sociale existante (réseaux WhatsApp mécaniciens, pratiques apporteurs affaires). Complexité humaine + technique. Stack: Next.js PWA + Node.js Fastify + Python FastAPI (IA) + CinetPay + WhatsApp Cloud API.'
---

# Product Requirements Document - pieces

**Author:** F
**Date:** 2026-02-27

## Executive Summary

Pièces est une marketplace multi-canal de pièces détachées automobiles (neuves, occasion, aftermarket) opérant en Côte d'Ivoire, conçue pour rétablir la transparence sur un marché structurellement opaque. Le produit adresse simultanément trois acteurs : le **mécanicien** (prescripteur technique), le **propriétaire** (décideur d'achat), et le **vendeur/importateur** (fournisseur). La proposition centrale — appelée workflow tripartite — dissocie pour la première fois le diagnostic technique du choix commercial : le mécanicien identifie la pièce, Pièces présente au propriétaire plusieurs options (neuf/occasion/aftermarket, multi-vendeurs, prix transparents), le propriétaire choisit et paie, la pièce est livrée au garage en moins de deux heures.

Le marché ivoirien des pièces auto est estimé à 400–650 M USD, avec une croissance de 18%/an, un parc de ~500 000 véhicules (âge moyen 15–18 ans) et aucun acteur digital structuré en Afrique de l'Ouest francophone. Le concurrent le plus avancé (Garage, YC S22) a pivoté hors du secteur, victime de la dévaluation du naira nigérian, d'un modèle B2B wholesale aux marges insuffisantes, et d'une trajectoire de rentabilité trop longue. Pièces opère en zone FCFA/UEMOA (monnaie stable), génère des revenus de livraison dès la première transaction, et cible le propriétaire final comme payeur direct — éliminant les fragilités structurelles de son prédécesseur.

### Ce qui rend Pièces spécial

**L'infrastructure de confiance, pas la marketplace.** Le problème du marché ivoirien n'est pas l'accès aux pièces — elles existent à Adjamé. Le problème est épistémique : personne ne sait ce que les choses coûtent vraiment, ni si la pièce est authentique, ni si le mécanicien est honnête. Pièces transforme une information opaque et personnelle en information publique et comparable. La transparence des prix *est* le produit.

**Trois canaux parallèles, zéro friction d'adoption.** WhatsApp est le flux primaire pour les mécaniciens terrain (photo → liste de résultats → commande) — aucun changement de comportement requis. La PWA offre deux modes complémentaires : navigation visuelle par marque/modèle/année pour les propriétaires, et recherche par VIN ou référence OEM pour les mécaniciens avancés et importateurs. L'entrée dans Pièces est celle que l'utilisateur préfère naturellement.

**Brownfield informel, pas greenfield.** Pièces ne construit pas sur un terrain vide — elle se greffe sur une infrastructure sociale existante (réseaux WhatsApp de mécaniciens, pratiques d'apporteurs d'affaires, relations de confiance vendeur-acheteur). L'adoption ne nécessite pas de rééduquer le marché : elle formalise ce qui existe déjà en le rendant transparent et tracé.

**La data comme moat à long terme.** Chaque transaction Pièces constitue le premier dataset structuré du marché ivoirien des pièces auto : quelles pièces, pour quels véhicules, à quels prix, dans quelles zones. Cet actif devient défendable dès les premières centaines de transactions.

## Project Classification

| Dimension | Valeur |
|---|---|
| **Type projet** | Multi-channel marketplace (WhatsApp-first + PWA) |
| **Domaine** | Trust infrastructure — marché informel à transparence nulle |
| **Complexité** | Haute — IA vision (3 phases), logistique last-mile CI, multi-acteurs, fintech |
| **Contexte** | Brownfield informel — greffe sur infrastructure sociale existante |
| **Marché initial** | Abidjan, Côte d'Ivoire → expansion UEMOA (Phase 2+) |

## Success Criteria

### Succès Utilisateur

**Mécanicien (Kofi)**
- Élimine ses déplacements à Adjamé pour les pièces commandées via Pièces
- Obtient le badge **"Bon Mécano"** — décerné à ≥ 4,2/5 de note moyenne sur ≥ 10 commandes évaluées par les propriétaires (un seul niveau, mérité, pas d'intermédiaire)
- Reçoit la pièce au garage sans avancer de trésorerie ni gérer le paiement
- Ses clients le perçoivent comme honnête grâce à la transparence des prix portée par Pièces

**Propriétaire / Gestionnaire de flotte (Adjoua)**
- A payé le prix correspondant exactement à son choix (neuf/occasion/aftermarket, vendeur sélectionné) — zéro marge cachée
- A reçu la pièce à l'adresse du garage dans le délai choisi
- Pour les flottes : visibilité complète sur les dépenses pièces par véhicule et par mécanicien (Phase 2)

**Vendeur / Importateur (Ibrahim)**
- Paiement direct à confirmation de livraison via CinetPay — zéro risque d'impayé
- Catalogue en ligne sans saisie manuelle des références

### Succès Business

| Horizon | Métrique | Cible |
|---|---|---|
| **Lancement (J0)** | Vendeurs actifs | 10 vendeurs, ≥ 10 000 références cataloguées |
| **Lancement (J0)** | Comptes Enterprise | 5 entreprises avec flotte signées |
| **Lancement (J0)** | Mécaniciens pilotes | 50 mécaniciens formés (1 par commune Abidjan) |
| **3 mois** | GMV cumulé | ~300M FCFA (0,1% marché CI) |
| **3 mois** | Cadence commandes | ≥ 250 commandes/mois |
| **3 mois** | Mécaniciens Bon Mécano | ≥ 30 badges décernés |
| **12 mois** | GMV mensuel récurrent | ~250M FCFA/mois (1% marché CI) |
| **12 mois** | Cadence commandes | ≥ 2 000 commandes/mois |
| **12 mois** | Revenus livraison | Couverture ≥ 60% des coûts opérationnels |

### Succès Technique

| Composant | Métrique | Seuil |
|---|---|---|
| **IA photo (Phase 1 MVP)** | Précision top-3 | ≥ 70% (VLM zero-shot) |
| **IA photo (Phase 2)** | Précision top-3 | ≥ 85% (fine-tuning post-lancement) |
| **WhatsApp bot** | Temps de réponse | < 10 secondes (flow complet : webhook → réponse, VIN inclus) |
| **PWA** | First Contentful Paint (3G) | < 3 secondes |
| **Livraison Express** | Délai garanti | ≤ 1h30 — SLA respecté ≥ 85% |
| **Livraison Standard** | Délai garanti | ≤ 24h — SLA respecté ≥ 90% |
| **Paiement** | Taux de succès transactions | ≥ 95% |
| **Disponibilité** | Uptime | ≥ 99,5% |

### Résultats Mesurables

- **Rétention mécaniciens** : ≥ 60% reviennent dans les 7 jours suivant leur première commande
- **Taux de complétion workflow tripartite** : J30 → 40%, J60 → 55%, J90 → 70%
- **Satisfaction livraison** : ≥ 80% de notes ≥ 4/5 sur délai et état de la pièce
- **Taux de litiges** : < 5% des transactions en T1 (suivi mensuel pour décision escrow Phase 2)

## Product Scope

### MVP — Lancement

**Périmètre :** Pilote fermé, Abidjan uniquement, accès sur invitation — validation du workflow tripartite de bout en bout avant ouverture publique.

1. **Workflow tripartite** — mécanicien initie (WhatsApp ou PWA), propriétaire reçoit options et paie, livraison au garage
2. **WhatsApp Bot** — photo → IA identification → top-3 résultats avec prix → commande en 3 taps
3. **PWA** — navigation visuelle (marque → modèle → année → catégorie) + recherche VIN/référence OEM + pré-remplissage localStorage dernier véhicule
4. **IA photo Phase 1** — VLM zero-shot (Gemini Flash) avec fallback assistance humaine
5. **Catalogue vendeur** — auto-généré par photo IA, confirmation prix/stock par le vendeur
6. **Paiement vendeur** — prépaiement direct acheteur → virement vendeur à confirmation de livraison (CinetPay), sans période de rétention
7. **Paiement hybride acheteur** — Orange Money / MTN MoMo / Wave / Cash à la livraison (COD plafonné à 75 000 FCFA)
8. **Livraison à la demande** — Express ≤ 1h30 (tarif premium) + Standard ≤ 24h (tarif économique), réseau moto-coursiers
9. **Profil véhicule** — enregistrement marque/modèle/année, filtrage automatique des résultats de recherche
10. **Badge "Bon Mécano"** — note moyenne ≥ 4,2/5 sur ≥ 10 commandes évaluées, affiché sur le profil mécanicien

### Croissance — Post-MVP (Phase 2)

- **Suite Enterprise** : comptes multi-véhicules, workflow d'approbation, facturation mensuelle consolidée, benchmark flotte
- **Escrow complet** : rétention CinetPay avec libération à confirmation — décision conditionnée au taux de litiges T1
- **Certification mécanicien formalisée** : recrutement structuré, formation, badge visible clients
- **Badge qualité pièces** : Import Certifié / Occasion vérifiée / Aftermarket
- **Passeport Véhicule** : historique complet maintenance attaché à l'immatriculation
- **Dashboard importateur** : données demande marché, ruptures identifiées, optimisation container
- **Monétisation structurée** : commission volume vendeurs + abonnement Enterprise + abonnement vendeur premium
- **IA photo Phase 2** : fine-tuning EfficientNet/ViT sur dataset terrain ivoirien (15 000+ images)

### Vision — Phase 3+

- **Pièces Crédit** — "Répare maintenant, paie en 3 fois" (partenariat Wave Credit / Djamo)
- **Mini-assurance** — garantie 3 mois sur pièces certifiées (+10% prix, assuré partenaire)
- **China Direct** — connexion importateurs ivoiriens aux fabricants Changan/BYD/JAC (Guangzhou)
- **Guides vidéo** — iFixit localisé : mécaniciens ivoiriens, véhicules du marché CI, SEO local
- **Achat groupé** — regroupement propriétaires par véhicule et quartier (-15%)
- **Insurance API** — expertise dommages accident (photo → liste pièces → rapport assureur)
- **Expansion UEMOA** — Sénégal, Mali, Burkina Faso (même monnaie FCFA, friction minimale)

## User Journeys

### Journey 1 — Kofi, Mécanicien Terrain (WhatsApp, Parcours Principal)

**Persona :** Kofi, 34 ans, mécanicien indépendant à Yopougon. Atelier : 3 employés, 6–8 véhicules par semaine. Il passe actuellement 1h–2h par jour à Adjamé pour les pièces.

**Situation :** Il est 10h30. Une Toyota Corolla 2008 attend depuis le matin. Diagnostic : filtre à huile à changer. Son fournisseur habituel n'a plus de stock.

**Ouverture :** Kofi ouvre WhatsApp, envoie une photo nette du filtre usagé au bot Pièces. Réponse immédiate : "Photo reçue ✅ — Pour vous donner les bonnes pièces, envoyez maintenant une photo de la **carte grise** du véhicule."

**Carte grise + VIN :** Kofi photographie la carte grise posée sur le pare-brise. Le bot extrait le VIN automatiquement et interroge le service VIN gratuit : "Véhicule confirmé : Toyota Corolla 1ZZ-FE (2008, Abidjan) ✅" — aucune ambiguïté moteur possible.

**Gestion photo floue :** Si la photo est de mauvaise qualité (OCR < seuil minimum), le bot demande : "La photo n'est pas assez nette. Essayez avec plus de lumière ☀️" (1 retry). Si toujours illisible : "Tapez les 17 caractères du VIN directement" → fallback navigation PWA si VIN inconnu.

**Résultats :** 8 secondes après confirmation VIN, le bot envoie 3 options avec photo, prix, vendeur et délai de livraison. Kofi sélectionne l'option 1 et envoie le lien de choix à son client.

**Résolution :** Le client reçoit le lien, confirme et paie via Orange Money. La pièce arrive au garage en 58 minutes. Son client le voit confirmer le prix en direct — "Ce mécanicien-là, il est honnête." Kofi n'a pas quitté son atelier.

**Exigences révélées :** workflow WhatsApp 2 photos séquentielles (pièce + carte grise), extraction VIN automatique, service VIN gratuit ivoirien/international, délai bot < 10 secondes (VIN inclus), seuil OCR défini (≥ 14/17 caractères), 1 retry photo, fallback VIN manuel → fallback PWA, lien partageable propriétaire.

---

### Journey 2 — Kofi, Cas Limite : Mauvaise Pièce (Urgent Replacement)

**Situation :** Deux jours plus tard. La plaquette de frein livrée pour une Peugeot 206 ne rentre pas — deux variantes existaient et la carte grise n'a pas permis de les distinguer.

**Détection active :** 30 minutes après la livraison, le bot envoie : "La pièce est-elle conforme ? ✅ / ❌". Kofi répond ❌.

**Recours en 1 tap :** Le bot propose : "Commander la variante alternative en urgence ? La commande originale est mise en litige automatiquement. Vous ne payez pas deux fois." Kofi confirme.

**Résolution parallèle :** La commande de remplacement est lancée immédiatement. Le litige est ouvert — le support a accès aux photos de la conversation WhatsApp originale (pièce + carte grise). Le vendeur doit répondre avec son bon de retour sous 4h.

**Exigences révélées :** confirmation livraison active (push bot 30min post-livraison), commande remplacement urgente sans double paiement, accès support aux photos WhatsApp par commande, délai SLA vendeur retour pièce incorrecte 48h.

---

### Journey 3 — Maxime, Propriétaire Particulier (Choix Transparent)

**Persona :** Maxime, 41 ans, cadre commercial à Cocody. Sa Hyundai Tucson 2015 a un problème de suspension. Il fait confiance à son mécanicien mais s'est déjà senti floué sur les prix.

**Ouverture :** À 11h15, il reçoit un lien WhatsApp de son mécanicien : "Votre mécanicien a identifié : Amortisseur avant gauche Hyundai Tucson 2015 — Voici vos options."

**Choix :** Trois cartes visuelles avec photo, prix et vendeur. Il choisit l'option occasion certifiée à 45 000 FCFA (garantie 30 jours). Il paie via Wave en 3 taps. Récapitulatif immédiat : "Vous payez : 45 000 FCFA pièce + 2 500 FCFA livraison Express = **47 500 FCFA total**. Aucun frais caché."

**Suivi :** Maxime reçoit un lien de tracking GPS en temps réel. La pièce arrive au garage à 12h43. À 13h10 : "Votre mécanicien a confirmé la pose. Comment évaluez-vous votre expérience ?" Il donne 5/5 à la livraison et 5/5 au mécanicien.

**Résolution :** Pour la première fois, Maxime sait exactement ce qu'il a payé et pourquoi. Il recommande Pièces à deux collègues la semaine suivante.

**Exigences révélées :** lien partageable propriétaire (commande initiée mécanicien, complétée propriétaire), prix transparent affiché (pièce + livraison = total), tracking GPS temps réel client, notification post-livraison pour évaluation mécanicien.

---

### Journey 4 — Ibrahim, Importateur/Vendeur (Onboarding + Première Vente)

**Persona :** Ibrahim, 48 ans, importateur de pièces à Adjamé. 20 ans d'expérience, ~3 000 références en stock. Méfiant envers les plateformes qui prennent des commissions sans apporter de valeur.

**Onboarding :** Un agent terrain Pièces le rencontre. Ibrahim envoie des photos de ses pièces en stock. L'IA génère les fiches catalogue automatiquement (référence OEM, compatibilité véhicule, prix suggéré). Il valide et ajuste en 45 minutes.

**Garanties obligatoires :** Avant activation de son profil vendeur, Ibrahim signe deux engagements Pièces :
- **Garantie retour pièce incorrecte** : reprise sous 48h, remboursement intégral si la pièce livrée ne correspond pas à la commande
- **Garantie pièces d'occasion** : fonctionnement minimum 30 jours — Pièces arbitre les litiges via appel humain bilatéral (pas une décision algorithmique)

**Arbitrage litige (humain) :** En cas de litige sur une pièce d'occasion, un agent Pièces avec compétence technique automobile appelle Ibrahim et le client dans les 24h. Il pose des questions techniques précises, photos à l'appui, et rend une décision motivée par écrit. Si Ibrahim a tort : remboursement prélevé sur ses fonds séquestrés. Si le client a tort : commande clôturée, Ibrahim payé.

**Première commande :** Notification push : "Commande #0042 — Filtre Bosch W712/73 — Express — Yopougon — Dispatch requis avant 11h30." Il confirme. Si pas de réponse sous 45 minutes : annulation automatique et remboursement acheteur.

**Paiement :** À confirmation de livraison, virement CinetPay dans les 2 heures. "C'est la première plateforme qui paie le jour même."

**Exigences révélées :** catalogue auto-généré par IA, signature garanties obligatoires à l'onboarding, arbitrage litige humain (agent technique, 24h, décision écrite), fenêtre dispatch 45min sinon annulation auto, fonds séquestrés CinetPay jusqu'à confirmation livraison, virement J0.

---

### Journey 5 — Adjoua, Gestionnaire de Flotte (Enterprise)

**Persona :** Adjoua, 38 ans, directrice logistique d'une société de distribution, 23 véhicules, 3 mécaniciens salariés.

**Situation :** Un camion tombe en panne à 14h30 — tournée de livraison compromise.

**Commande urgente :** Son mécanicien identifie la pièce via WhatsApp (carte grise + photo). Elle reçoit le lien, sélectionne Express. Confirmation : "Livraison estimée : 16h00 — Suivi en temps réel disponible."

**Tracking actif :** À 15h50, alerte proactive : "⚠️ Votre coursier est dans les embouteillages d'Adjamé — Nouveau délai estimé : 16h25." Elle re-planifie la tournée avant que son chauffeur attende.

**SLA breach :** La livraison arrive à 16h28 — 28 minutes de retard. Pièces envoie automatiquement : "Retard constaté — Votre prochaine livraison Standard offerte." Adjoua apprécie la proactivité — elle n'a pas eu à appeler.

**Dashboard flotte (Phase 2) :** Visibilité complète sur 23 véhicules, dépenses pièces par véhicule et par mécanicien, historique pannes, benchmark mensuel.

**Exigences révélées :** tracking GPS temps réel + ETA dynamique, alerte proactive dépassement SLA (avant contact client), remboursement SLA automatique (retard Express → Standard offert), dashboard flotte multi-véhicules (Phase 2).

---

### Journey 6 — Moussa, Livreur Pièces Rider

**Persona :** Moussa, 27 ans, ex-livreur Glovo. Il rejoint Pièces pour les tarifs mieux adaptés aux livraisons de pièces lourdes.

**Interface Rider :** Son app affiche en gros : "Livraison #0044 — Amortisseur Hyundai — Garage Serge — Yopougon — **PAIEMENT : Wave — 47 500 FCFA**". Le QR code Wave est pré-généré et prêt à scanner.

**Problème paiement :** Wave ne passe pas (réseau). Moussa appuie sur "Problème paiement" — le support Pièces est alerté immédiatement. Solution en 2 minutes : basculer en Orange Money. Nouveau QR généré, client scanne.

**Cas COD :** Pour une autre livraison, c'est cash. L'app rappelle : "Plafond COD actif : 75 000 FCFA — Collecte : 32 000 FCFA — Photo récépissé requise." Il photographie le billet, la livraison est confirmée.

**Fin de journée :** Ses courses sont résumées, son paiement journalier calculé automatiquement.

**Exigences révélées :** affichage mode paiement + montant en gros sur app Rider, QR pré-généré par mode de paiement, bouton escalade "Problème paiement" → support temps réel, photo récépissé COD, décompte journalier automatique coursier.

---

### Journey 7 — Serge, Mécanicien Structuré (PWA + VIN)

**Persona :** Serge, 45 ans, gérant d'un garage multi-marques à Cocody. Il connaît les références OEM par cœur et préfère la précision de la PWA.

**Situation :** Il commande 6 références pour 3 véhicules différents en début de journée.

**PWA VIN :** Il saisit le VIN depuis la carte grise du premier véhicule. La PWA affiche le profil complet confirmé par le service VIN. Il navigue directement aux plaquettes de frein pour cet exact moteur.

**Commande multi-références :** Il ajoute 3 références au panier. Véhicule 2 : navigation marque/modèle/année. Véhicule 3 : recherche référence OEM directe. Commande consolidée : 1 livraison pour 6 pièces, économie de frais de livraison.

**Résolution :** "Les références sont bonnes parce que le VIN élimine toute ambiguïté. Et je ne fais qu'une seule livraison pour tout."

**Exigences révélées :** saisie VIN PWA avec service vérification, navigation multi-mode (VIN / visuelle / référence OEM), panier multi-références multi-véhicules, consolidation livraison.

---

### Journey 8 — Aya, Agente Terrain Pièces (Onboarding Vendeur Informel)

**Persona :** Aya, 31 ans, agente terrain Pièces. Mission : onboarder 5 vendeurs d'Adjamé par semaine.

**Situation :** Elle rencontre Mamadou, vendeur de pièces d'occasion depuis 12 ans, sans smartphone avancé.

**Sur place :** Aya utilise sa tablette pour photographier les pièces de Mamadou. L'IA génère les fiches. Elle explique les garanties — Mamadou hésite sur la garantie occasion. Aya le rassure : "Ces garanties vous protègent aussi — si le client se plaint sans raison, Pièces arbitre avec vous."

**Signature :** Mamadou signe sur tablette. Son profil est actif en 2 heures.

**Première commande :** Mamadou reçoit un SMS (fallback, pas WhatsApp) : "Commande pièce occasion — dispatch requis avant 11h30." Il répond "OK" par SMS. Aya est notifiée de la confirmation.

**Exigences révélées :** onboarding assisté par agent terrain, interface tablette agente, support SMS fallback (pas uniquement WhatsApp), profil actif sous 2h, notification dispatch vendeur via SMS.

---

### Journey 9 — Kofi, Mauvaise Première Expérience (Proactive Recovery)

**Situation :** Kofi tente Pièces pour la première fois. La livraison Express arrive avec 45 minutes de retard. Son client est agacé, Kofi embarrassé. Il ne laisse aucun avis et ne rappelle pas.

**Détection automatique :** Pièces détecte le SLA breach. Le soir même, Kofi reçoit : "Kofi, votre livraison #0031 a pris 2h15 au lieu de 1h30. Ce n'est pas acceptable. Votre prochaine livraison Express est offerte."

**Appel humain J+1 :** Un agent Pièces appelle Kofi le lendemain matin — 90 secondes, pas un script. "Kofi, on a eu un problème avec le coursier hier à Marcory. Votre client a été impacté. Qu'est-ce qu'on peut faire ?" Kofi est surpris qu'on l'appelle.

**Récupération :** À J+7, Kofi passe une deuxième commande. Elle se passe bien. Il devient régulier et commence à recommander Pièces à des confrères.

**Exigences révélées :** détection automatique SLA breach, crédit immédiat sur compte mécanicien, appel humain proactif J+1 pour première commande ratée (pas un message automatique), tracking rétention J7 post-incident pour mesurer efficacité recovery.

---

### Exigences Révélées par les Parcours

#### Workflow WhatsApp (2 photos obligatoires)
- Photo pièce → bot demande photo carte grise → OCR VIN → service VIN gratuit → confirmation véhicule → résultats filtrés
- Seuil OCR : ≥ 14/17 caractères reconnus → sinon 1 retry → fallback VIN manuel → fallback PWA
- Délai total < 10 secondes (photo pièce + VIN inclus)

#### Identification & Catalogue
- IA confiance affichée + alerte ambiguïté multi-variante moteur
- Catalogue vendeur auto-généré par photo IA + validation vendeur
- Recherche multi-mode PWA : VIN / navigation visuelle / référence OEM
- Panier multi-références multi-véhicules avec consolidation livraison

#### Workflow Tripartite
- Mécanicien initie → lien partageable propriétaire → propriétaire choisit et paie → livraison garage
- Prix transparent : pièce + livraison = total affiché, aucun frais caché

#### Paiement & Fonds
- Fonds séquestrés CinetPay de la commande jusqu'à confirmation livraison coursier
- Virement vendeur sous 2h post-confirmation
- Multi-modal acheteur : Orange Money / MTN MoMo / Wave / COD (plafonné 75 000 FCFA)
- App Rider : mode paiement + montant + QR code pré-généré affichés en gros
- Bouton escalade paiement → support temps réel avec fallback mode de paiement alternatif

#### Garanties Vendeur (obligatoires à l'onboarding)
- Garantie retour pièce incorrecte : reprise 48h, remboursement intégral
- Garantie pièces d'occasion : fonctionnement 30 jours minimum
- Arbitrage litige : humain Pièces (agent avec compétence technique automobile), appel bilatéral, décision écrite sous 24h

#### Livraison & SLA
- Tracking GPS temps réel (client + gestionnaire flotte)
- Alerte proactive dépassement SLA avant que le client contacte le support
- Remboursement SLA automatique (retard Express → prochain Standard offert)
- Fenêtre dispatch vendeur : 45 min maximum sinon annulation automatique + remboursement acheteur

#### Commande de Remplacement Urgente
- Confirmation livraison active : push bot 30min post-livraison
- Si pièce non conforme : commande remplacement en 1 tap, litige parallèle sans double paiement
- Support : accès aux photos WhatsApp de la commande originale

#### Proactive Recovery
- Détection automatique SLA breach → crédit immédiat mécanicien
- Appel humain J+1 pour première commande ratée (pas un message automatique)
- Suivi rétention J7 post-incident

#### Badge & Notation
- Notification mécanicien si note moyenne descend vers le seuil badge
- Accès mécanicien à ses notes par commande avec date
- Formulaire contestation note abusive → revue support 48h
- Anti-manipulation notes multiples même client (Phase 2)

#### Support Opérationnel
- Équipe support avec compétence technique automobile minimale (arbitrage litige pièces)
- Accès support aux photos WhatsApp par numéro de commande
- Délai SLA support : 4h pour litige pièce incorrecte
- SMS fallback pour vendeurs sans WhatsApp avancé

## Domain-Specific Requirements

### Compliance & Réglementaire CI/UEMOA

**Protection des données — Loi n°2013-450**
- Inscription obligatoire à l'ARTCI avant tout traitement de données à caractère personnel
- Données concernées : nom, téléphone, localisation GPS (tracking coursiers), historique transactions, photos carte grise et pièces
- Consentement explicite requis à la collecte — modal au premier accès PWA + premier message WhatsApp bot
- Droits utilisateurs : accès, rectification, suppression des données personnelles sur demande
- **Action pré-lancement :** dossier d'inscription ARTCI à déposer au minimum 60 jours avant J0

**Paiement Mobile Money — BCEAO**
- Accords marchands digitalisés avec Orange CI, MTN CI, Wave et CinetPay — pas de démarche papier lourde
- CinetPay agréé BCEAO — conformité paiement couverte via CinetPay en tant que PSP agréé
- **Point de vigilance critique :** confirmer avec CinetPay que le modèle de séquestre (fonds retenus jusqu'à confirmation livraison) est couvert par sa licence PSP — une rétention prolongée peut qualifier comme activité bancaire non autorisée

**Onboarding Vendeur — KYC**
- Vendeurs formels (import/commerce enregistré) : RCCM obligatoire — numéro collecté et affiché sur le profil vendeur comme signal de confiance
- Vendeurs informels (Adjamé et marchés) : CNI ou carte de résident — scan ou photo lors de l'onboarding terrain par l'agente Pièces
- Vérification visuelle du RCCM par l'agent terrain pour les premiers onboardings Adjamé (anti-fraude)

### Contraintes Techniques

- **Hébergement données :** stockage données personnelles en CI ou zone UEMOA conforme — ou accord de transfert explicite si infrastructure cloud étrangère (AWS, GCP, etc.)
- **Consentement :** bannière/modal ARTCI-compliant au premier accès (PWA + WhatsApp)
- **Rétention données :** commandes + litiges = 12 mois minimum (durée légale CI) ; photos carte grise = durée minimale pour litiges ; logs GPS coursiers = 6 mois minimum — voir §Non-Functional Requirements / Fiabilité
- **RCCM visible :** numéro de registre commerce affiché sur chaque fiche vendeur dans la PWA

### Intégrations Requises

| Service | Usage | Type d'accord |
|---|---|---|
| CinetPay API | Paiement + séquestre fonds | Accord digital marchand |
| Orange Money Merchant CI | Paiement acheteur | Accord digital marchand |
| MTN MoMo Merchant CI | Paiement acheteur | Accord digital marchand |
| Wave Merchant | Paiement acheteur | Accord digital marchand |
| NHTSA VPIC API | Décodage VIN international | Gratuit, API publique US |
| WhatsApp Cloud API | Bot mécanicien + notifications | Meta for Business |
| ARTCI | Déclaration traitement données | Démarche administrative (60j avant J0) |

### Risques & Mitigations Domaine

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Délai inscription ARTCI bloque le lancement | Moyenne | Critique | Déposer le dossier 60 jours avant J0 — action pré-lancement obligatoire |
| CinetPay séquestre requalifié en activité bancaire | Faible | Critique | Confirmer par écrit avec CinetPay avant intégration ; alternative : séquestre limité à 48h max |
| VIN non reconnu (véhicules anciens, immatriculation CI non standard) | Haute | Moyen | Fallback manuel VIN + base locale des immatriculations CI si disponible ; IA dégradée sans VIN |
| RCCM vendeur falsifié lors de l'onboarding | Moyenne | Moyen | Vérification visuelle agent terrain pour premiers onboardings ; signalement manuel RCCM douteux |
| Hébergement cloud étranger non conforme ARTCI | Moyenne | Élevé | Définir stratégie hébergement (CI/UEMOA ou accord transfert) avant démarche ARTCI |

## Innovation & Novel Patterns

### Innovations Détectées — Hiérarchisées

#### Tier 1 — Différenciation Irréplicable (innovations sociales)

**1. Workflow tripartite — premier en Afrique de l'Ouest francophone**
Dissociation inédite du diagnostic technique et du choix commercial : le mécanicien prescrit, le propriétaire choisit avec information complète, Pièces garantit la transparence entre les deux. Cette restructuration de la relation de confiance est une innovation *institutionnelle* — impossible à copier en 6 mois même avec 10x le budget. C'est la thèse centrale du produit.

**2. Brownfield informel — greffe sur infrastructure sociale existante**
Pièces ne construit pas un réseau de mécaniciens : elle formalise celui qui existe déjà (réseaux WhatsApp, pratiques d'apporteurs d'affaires). L'adoption ne nécessite pas de rééduquer le marché — zéro friction d'adoption par design. Avantage structurel difficile à répliquer par un entrant étranger.

#### Tier 2 — Différenciation Temporaire (innovations technologiques)

**3. Photo → OCR carte grise → VIN → pièce filtrée via WhatsApp**
Combinaison inédite : vision IA pour identification de pièces + OCR sur document administratif ivoirien + décodage VIN, dans une conversation WhatsApp existante. Copiable avec du temps et des ressources, mais crée un avantage de 12–18 mois et construit le dataset propriétaire.

**4. Transparence des prix comme produit, pas comme feature**
Repositionnement épistémique : les marketplaces standard cachent les marges, Pièces fait de la comparabilité totale multi-vendeurs son avantage concurrentiel principal.

**5. Premier dataset structuré du marché CI**
Chaque transaction crée le premier historique de prix, demande et compatibilité de pièces auto en Côte d'Ivoire. Moat défendable à partir de ~1 000 transactions.

#### Tier 3 — Avantages Contextuels (choix stratégiques corrects)

**6. Zone FCFA/UEMOA — monnaie stable comme stratégie délibérée**
Contre-apprentissage direct du pivot de Garage (YC S22) face à la dévaluation du naira nigérian. Pièces opère en zone monétaire stable — pas un hasard géographique, une thèse d'investissement.

**7. Revenus dès J1 via livraison**
Les frais de livraison génèrent des revenus réels dès la première transaction. La logistique est un centre de profit, pas un coût d'acquisition — contrairement aux marketplaces qui subventionnent l'adoption.

### Contexte Marché & Positionnement Concurrentiel

Le marché AOF des pièces auto est un **blue ocean digital** : aucun acteur structuré en Afrique de l'Ouest francophone. Garage (YC S22), concurrent le plus avancé, a pivoté hors du secteur en 2023 — victime de la dévaluation du naira nigérian, d'un modèle B2B wholesale aux marges insuffisantes, et d'une trajectoire de rentabilité trop longue. Pièces adresse structurellement ces trois points de défaillance : zone FCFA stable, revenus livraison dès J1, payeur final = propriétaire (pas grossiste).

### Risques Innovation & Mitigations

| Innovation | Risque Principal | Mitigation |
|---|---|---|
| Workflow tripartite | Propriétaires habitués à déléguer sans voir les prix | Tester avec 10 propriétaires pilotes avant J0 ; lien optionnel si le propriétaire préfère déléguer |
| WhatsApp Bot VIN | VIN européens (Peugeot, Renault — marché massif CI) non couverts par NHTSA VPIC | Intégrer CarQuery API en complément de NHTSA ; fallback navigation manuelle toujours disponible |
| Dataset CI propriétaire | Données insuffisantes avant 1 000 transactions | Ne pas monétiser le dataset avant le seuil — construire d'abord |
| Brownfield informel | Mécaniciens perçoivent la transparence comme perte de contrôle | Badge "Bon Mécano" comme incitation positive à rester dans le système Pièces |

## SaaS B2B — Exigences Spécifiques au Type de Projet

### Vue d'Ensemble du Type de Projet

Pièces est une plateforme SaaS B2B multi-tenant orientée marketplace, combinant des flux tripartites complexes (mécanicien → propriétaire → vendeur), une gestion de catalogue à forte volumétrie, et des exigences de confidentialité inter-rôles. Le modèle opère en ligne uniquement (PWA sans mode offline), avec une stratégie de notifications multi-canal hiérarchisée.

### Architecture RBAC — ADR-001

#### Modèle de Permissions

- **Permissions atomiques cumulatives** : les rôles s'additionnent sur un même compte (ex. : un utilisateur peut être mécanicien ET propriétaire simultanément)
- **6 rôles** : mécanicien, propriétaire, vendeur, livreur Rider, agente terrain, admin/support
- **Contexte actif JWT** : claim `active_context` dans le token JWT, persisté en session — le sélecteur de contexte s'affiche uniquement quand l'utilisateur détient plusieurs rôles
- **DTO Projection centralisée** : couche de transformation des réponses API par rôle appelant — garantit que `mecanicien_name` est masqué pour tout requérant ayant `role:vendeur`, quelle que soit l'origine de l'appel
- **Audit admin/support** : toute action à droits élevés est loggée avec raison d'accès (conformité ARTCI Loi n°2013-450)

#### Matrice de Confidentialité

| Donnée | Mécanicien | Propriétaire | Vendeur | Admin |
|--------|-----------|--------------|---------|-------|
| Nom mécanicien | ✅ | ✅ | ❌ masqué | ✅ |
| Nom propriétaire | ❌ | ✅ | ❌ | ✅ |
| Coordonnées livraison | ❌ | ✅ | Partiel (zone) | ✅ |
| Détail commande | Prescripteur | Payeur | Vendeur propre | ✅ |

#### Scénarios de Transition de Contexte (Tests Critiques)

Les transitions de contexte mid-session représentent les cas les plus risqués du modèle RBAC :

- **Panier en cours** : si un mécanicien-propriétaire switche de contexte pendant une commande active, le panier est préservé et lié au contexte d'origine — pas de reset silencieux
- **Notifications mid-session** : les notifications reçues pendant une session sont étiquetées par contexte d'émission, affichées dans le contexte approprié
- **Matrice de tests** : 6 rôles × 4 types de données = 24 combinaisons de permissions + scénarios de transition documentés en suite de tests dédiée

### Architecture Multi-Tenant — ADR-002

#### Modèle Tenant

- **Row-Level Security PostgreSQL** : `tenant_id` sur toutes les tables critiques, injecté via middleware Fastify depuis le JWT — isolation forte sans bases séparées (viable v1)
- **Contrainte v1 — 1 tenant max par compte** : un compte peut être standalone (0 tenant) ou membre d'un garage Enterprise (1 tenant), jamais les deux simultanément
- **Limitation connue** : le cas du mécanicien indépendant travaillant pour plusieurs garages n'est pas supporté en v1 — documenté comme évolution v2 (multi-tenant membership)
- **Structure** : `tenant (entreprise) → members (comptes individuels avec rôles dans ce tenant)`
- **Admin Enterprise** : rôle spécifique permettant d'inviter des membres, visualiser les commandes consolidées du garage, gérer les accès internes
- **Indicateur visuel tenant** : bandeau permanent dans l'UI identifiant le contexte actif (ex. "Garage Auto Kouamé") — les notifications précisent également le contexte tenant vs compte personnel
- **Message UX si limite atteinte** : si un utilisateur tente de rejoindre un second tenant, message explicite : "En v1, un compte ne peut appartenir qu'à un seul garage. Cette fonctionnalité sera disponible dans une prochaine version."

#### Niveaux d'Accès

| Niveau | Description | Isolation |
|--------|-------------|-----------|
| Compte individuel | Accès personnel, aucun tenant | N/A |
| Membre Enterprise | Accès via tenant, rôle défini par admin | RLS tenant_id |
| Admin Enterprise | Gestion complète du tenant | RLS tenant_id |
| Admin/Support Pièces | Droits élevés cross-tenant, loggés | Audit obligatoire |

### Architecture Catalogue & Recherche — ADR-003

#### Spécifications Meilisearch

- **Volume initial** : ~10 000 références au lancement
- **Typo-tolerance activée** : seuil calibré pour noms de pièces automobiles (ex. "amortiseur" → "amortisseur", "peugeoot" → "Peugeot")
- **Tunnel de filtres prioritaires** : Marque véhicule → Modèle → Année → Catégorie pièce → Disponibilité stock → Prix
- **Recherche temps réel** : résultats dès la première frappe (< 50ms cible)

#### Stratégie de Synchronisation

- **Sync asynchrone event-driven** : ajout/modification pièce → event Fastify → queue Redis → indexation Meilisearch (délai max 5 secondes)
- **Circuit breaker + fallback** :
  - Seuil de déclenchement : 3 timeouts consécutifs (> 2s chacun)
  - Bascule automatique vers recherche PostgreSQL full-text
  - Recovery : re-bascule automatique vers Meilisearch après 30 secondes de disponibilité confirmée (health check)
  - Dégradation gracieuse — pas de page blanche pour le mécanicien

### PWA — Contraintes Techniques

- **Online-only** : aucun mode offline — PWA sans service worker de cache données métier
- **Compatibilité** : Android 8+ minimum, navigateurs modernes (Chrome, Firefox, Safari mobile)
- **Images** : format WebP systématique, compression optimisée pour connexions 3G/4G ivoiriennes
- **Authentification** : OTP SMS uniquement, sans mot de passe
- **Cibles de performance** :
  - Time-to-Interactive : < 3 secondes sur 4G
  - Time-to-Interactive : < 5 secondes sur 3G
  - Ces cibles s'appliquent au chargement initial — critiques pour l'adoption en garage

### Stratégie de Notifications

#### Hiérarchie des Canaux

1. **WhatsApp Cloud API** (prioritaire) — messages riches avec photos, boutons d'action
2. **SMS** (fallback) — si WhatsApp non disponible ou non installé
3. **Push PWA** (complément) — notifications in-app en session active

#### Matrice d'Événements — Flux Commande

| Événement | Mécanicien | Propriétaire | Vendeur | Livreur |
|-----------|-----------|--------------|---------|---------|
| Commande créée | — | ✅ approbation | ✅ nouvelle cmd | — |
| Commande approuvée | ✅ confirmation | — | ✅ préparer | — |
| Commande expédiée | ✅ suivi | ✅ suivi | — | ✅ assignation |
| Livraison confirmée | ✅ | ✅ | ✅ paiement libéré | ✅ |
| Réclamation ouverte | ✅ | ✅ | ✅ | — |

#### Matrice d'Événements — Flux Vendeur (Catalogue)

| Événement | Vendeur | Admin |
|-----------|---------|-------|
| Nouvelle demande pour pièce en stock | ✅ alerte opportunité | — |
| Stock critique (seuil configurable) | ✅ alerte stock | — |
| Modification prix acceptée | ✅ confirmation | — |
| Garantie réclamée sur pièce vendue | ✅ urgente | ✅ |
| Suspension compte vendeur | ✅ | ✅ |

### Considérations d'Implémentation

- **Phase 1** : RBAC complet + RLS tenant + Meilisearch + notifications WhatsApp/SMS + contrainte 1 tenant max — voir §Project Scoping & Phased Development
- **Phase 2** : Admin Enterprise self-service + multi-tenant membership (mécano multi-garages) + analytics consolidées — voir §Project Scoping & Phased Development
- **Observabilité** : logs structurés JSON, audit trail admin/support, métriques Meilisearch (latence, taux de fallback, circuit breaker trips)
- **Tests critiques** : matrice 24 combinaisons permissions + scénarios de transition de contexte + circuit breaker search en staging

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche MVP :** MVP Plateforme — construire l'infrastructure technique solide (RBAC, auth, catalogue, paiement, WhatsApp bot) avant de pousser l'acquisition. Valide la faisabilité technique ET la proposition de valeur sur un périmètre restreint.

**Opérations manuelles au lancement (ops-first) :**
Les fonctionnalités suivantes seront exécutées manuellement par l'équipe Pièces en Phase 1, puis automatisées progressivement :
- Onboarding vendeur : agente terrain sur place (tablette Pièces)
- Dispatching coursier : coordinateur humain (WhatsApp interne)
- Arbitrage litige : agent technique Pièces, appel bilatéral, décision écrite — rester humain indéfiniment (pas une cible d'automatisation)

**Pré-condition absolue :** Constitution de l'équipe technique avant tout développement. Voir document dédié : `_bmad-output/planning-artifacts/equipe-a-constituer.md`

**Ressources équipe cible pour Phase 1 MVP :**

| Rôle | Nb | Notes |
|------|----|-------|
| Développeur fullstack lead (Next.js + Fastify) | 1 | Recrutement prioritaire |
| Développeur IA/Python (FastAPI + VLM) | 1 | WhatsApp bot + photo ID |
| Développeur frontend/mobile (PWA + App Rider) | 1 | Interface mécanicien + Rider |
| Designer UI/UX | 1 (contractuel) | Mission 6 semaines |
| Agente(s) terrain | 1–2 | Onboarding vendeurs Adjamé |

---

### MVP Feature Set — Phase 1

**Parcours utilisateurs supportés en MVP :**
- Journey 1 — Kofi (WhatsApp, parcours principal avec VIN)
- Journey 3 — Maxime (propriétaire, choix transparent et paiement)
- Journey 4 — Ibrahim (vendeur, onboarding assisté + première vente)
- Journey 6 — Moussa (Rider, livraison et paiement terrain)
- Journey 8 — Aya (agente terrain, onboarding vendeur informel)

**Fonctionnalités Must-Have (automatisées) :**

| Fonctionnalité | Justification |
|----------------|---------------|
| WhatsApp Bot (photo + VIN → résultats) | Différenciation n°1, canal primaire mécaniciens |
| OCR carte grise → décodage VIN (NHTSA + CarQuery) | Sans VIN, l'IA pièce est insuffisamment précise |
| IA photo Phase 1 (Gemini Flash VLM zero-shot) | Identification pièce sans saisie manuelle |
| PWA — Navigation visuelle (marque → modèle → année) | Canal propriétaire + mécanicien structuré |
| PWA — Recherche VIN / référence OEM | Mécaniciens avancés et importateurs |
| Auth OTP SMS (sans mot de passe) | Friction minimale pour mécaniciens terrain |
| RBAC 6 rôles + contexte actif JWT | Base de sécurité non négociable |
| Catalogue vendeur (auto-généré par IA + validation vendeur) | Sans catalogue, pas de marketplace |
| Paiement acheteur multi-modal (CinetPay + Orange/MTN/Wave/COD) | Le propriétaire doit pouvoir payer |
| Séquestre CinetPay → virement vendeur à livraison | Confiance vendeur = adoption vendeur |
| App Rider basique (mission + paiement + photo COD) | Sans Rider, pas de livraison |
| Notifications WhatsApp → SMS fallback | Toutes les étapes clés du workflow |
| Garanties vendeur (retour 48h + occasion 30j) | Confiance acheteur = adoption acheteur |
| Badge "Bon Mécano" (calcul automatique) | Incitation mécanicien à rester dans le système |
| Conformité ARTCI (consentement + données) | Légal — requis avant J0 |

**Fonctionnalités Hors MVP Phase 1 (retirées volontairement) :**

| Fonctionnalité | Raison du report |
|----------------|-----------------|
| Suite Enterprise + tenant admin self-service | Complexe — 5 clients Enterprise pilotes gérés en manuel |
| Tracking GPS temps réel coursier | ETA communiqué par WhatsApp en Phase 1 |
| Alerte proactive SLA breach automatique | Script manuel sur monitoring commandes Phase 1 |
| Dashboard flotte multi-véhicules | Phase 2 |
| Passeport Véhicule | Phase 2 |
| Dashboard importateur | Phase 2 |
| Anti-manipulation notes (multi-compte) | Phase 2 — faible risque avec 50 mécaniciens pilotes |
| IA photo Phase 2 (fine-tuning EfficientNet/ViT) | Phase 2 — nécessite 15 000+ images terrain |

---

### Roadmap Phasée

#### Phase 1 — MVP (Mois 1–6)

**Objectif :** Première transaction réelle. Prouver que le workflow tripartite fonctionne de bout en bout.

**Jalons :**
- M1–M2 : Constitution équipe + dossier ARTCI déposé
- M2–M4 : Développement core (WhatsApp bot + PWA + paiement + RBAC)
- M4–M5 : Pilote fermé — 10 vendeurs, 50 mécaniciens, 5 Enterprise
- M5–M6 : Corrections + lancement public Abidjan

#### Phase 2 — Croissance (Mois 7–18)

**Objectif :** Automatiser les ops manuelles, enrichir les données, atteindre 2 000 commandes/mois.

- Suite Enterprise self-service + admin tenant complet
- Tracking GPS temps réel + alertes SLA automatiques
- Dashboard flotte + passeport véhicule
- IA photo Phase 2 (fine-tuning sur dataset terrain CI)
- Dashboard importateur (données demande + ruptures)
- Badge qualité pièces (Import Certifié / Occasion vérifiée)
- Automatisation dispatching coursier
- Escrow complet CinetPay (si taux litiges T1 < 5%)
- Certification mécanicien structurée

#### Phase 3 — Expansion (Mois 18+)

**Objectif :** Nouveaux marchés + nouveaux services financiers.

- Pièces Crédit (répare maintenant, paie en 3 fois)
- Mini-assurance sur pièces certifiées
- China Direct (connexion importateurs CI → fabricants Guangzhou)
- Guides vidéo iFixit localisé
- Achat groupé (-15%)
- Insurance API (expertise dommages accident)
- Expansion UEMOA (Sénégal, Mali, Burkina Faso)

---

### Stratégie de Mitigation des Risques

#### Risques Techniques

| Risque | Probabilité | Mitigation Phase 1 |
|--------|------------|-------------------|
| IA photo < 70% précision top-3 | Moyenne | Fallback assistance humaine (agent Pièces valide les cas ambigus) |
| VIN non reconnu (véhicules anciens) | Haute | Fallback navigation manuelle toujours disponible |
| Meilisearch indisponible | Faible | Circuit breaker → PostgreSQL full-text |
| WhatsApp Cloud API quota dépassé | Faible | Monitoring + upgrade plan Meta automatique |

#### Risques Marché

| Risque | Probabilité | Mitigation |
|--------|------------|------------|
| Mécaniciens refusent la transparence | Moyenne | Badge "Bon Mécano" comme incitation positive ; test avec 10 pilotes avant J0 |
| Vendeurs ne tiennent pas les délais 45min | Haute | Coordinateur dispatch humain Phase 1 ; pénalité vendeur automatisée Phase 2 |
| Propriétaires délèguent sans regarder | Haute | Lien optionnel : propriétaire peut juste approuver sans choisir |

#### Risques Ressources (Critique)

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Pas d'équipe technique constituée | Bloquant | Prioriser recrutement/sourcing avant tout engagement client |
| Budget insuffisant pour Phase 1 | Critique | MVP ops-first réduit la surface de développement de ~40% |
| Délai ARTCI (60 jours) non respecté | Bloquant légal | Déposer le dossier dès M1 — action J0 du projet |

## Functional Requirements

*Note : les numéros FR reflètent l'ordre de découverte collaborative. La numérotation sera normalisée (séquentielle par groupe) lors de la génération des Epics.*

### Identification & Catalogue

- FR1: Le mécanicien peut envoyer une photo de pièce via WhatsApp pour obtenir une liste de correspondances filtrées par véhicule
- FR2: Le bot peut extraire le VIN d'une photo de carte grise ivoirienne via OCR
- FR3: Le système peut décoder un VIN pour identifier le véhicule exact (marque, modèle, motorisation, année) via NHTSA VPIC et CarQuery API
- FR4: Le mécanicien peut saisir manuellement un VIN en fallback si la photo de carte grise est illisible
- FR5: Le mécanicien peut naviguer dans le catalogue par marque → modèle → année → catégorie depuis la PWA
- FR6: Le mécanicien peut rechercher une pièce par numéro de référence OEM dans la PWA
- FR7: La PWA peut mémoriser et pré-remplir le profil du dernier véhicule utilisé
- FR8: Le vendeur peut générer automatiquement des fiches catalogue en envoyant des photos de ses pièces en stock
- FR9: Le vendeur peut valider, ajuster les prix et confirmer le stock de ses fiches catalogue générées par IA
- FR10: Le mécanicien peut ajouter plusieurs pièces de plusieurs véhicules dans un même panier et déclencher une livraison consolidée
- FR54: Le vendeur peut mettre à jour ses prix et son stock à tout moment sans validation admin (mise à jour automatique en temps réel)
- FR55: Le vendeur peut configurer les zones géographiques dans lesquelles il accepte de livrer
- FR50: Le mécanicien peut enregistrer une demande pour une pièce absente du catalogue et être notifié quand un vendeur l'ajoute (Phase 2)

### Workflow de Commande Tripartite

- FR11: Le mécanicien peut initier une commande et générer un lien de choix partageable vers le propriétaire
- FR12: Le propriétaire peut visualiser les options de pièces (neuf / occasion / aftermarket, multi-vendeurs) avec le prix total transparent (pièce + livraison, sans frais cachés)
- FR13: Le propriétaire peut sélectionner une option et procéder au paiement depuis son interface, sans compte préalable requis
- FR53: L'acheteur peut annuler une commande confirmée avant l'assignation à un Rider, avec remboursement intégral
- FR14: Le vendeur peut confirmer ou décliner une commande dans une fenêtre de 45 minutes
- FR15: Le système peut annuler automatiquement une commande et rembourser l'acheteur si le vendeur n'a pas répondu dans 45 minutes
- FR16: Le mécanicien peut déclencher une commande de remplacement urgent en 1 tap si la pièce reçue est non conforme, sans double paiement, avec litige ouvert en parallèle
- FR58: Le propriétaire peut finaliser un achat en mode guest en saisissant uniquement son numéro de téléphone, sans création de compte préalable

### Paiement & Transactions

- FR17: L'acheteur peut payer via Orange Money, MTN MoMo, Wave ou en espèces à la livraison (COD, plafonné à 75 000 FCFA)
- FR18: Le système peut séquestrer les fonds de l'acheteur dès la commande et les libérer au vendeur uniquement à confirmation de livraison
- FR19: Le système peut virer les fonds au vendeur dans les 2 heures suivant la confirmation de livraison
- FR59: Le système peut déclencher un remboursement automatique vers le mode de paiement original lors d'une annulation ou d'un litige tranché en faveur de l'acheteur
- FR60: Le système peut libérer automatiquement les fonds séquestrés vers le vendeur après un délai de confirmation non reçue (timeout configurable)
- FR20: Le Rider peut enregistrer un paiement COD et capturer un récépissé photo pour validation
- FR21: Le Rider peut escalader un incident de paiement terrain au support en temps réel et basculer sur un mode de paiement alternatif

### Livraison & Logistique

- FR22: Le coordinateur Pièces peut assigner manuellement une livraison à un Rider disponible
- FR23: Le Rider peut consulter les détails de sa mission (adresse, description pièce, mode de paiement, montant)
- FR24: L'acheteur et le mécanicien peuvent consulter l'état en temps réel de leur livraison
- FR25: Le système peut calculer et afficher un délai estimé de livraison (Express ≤ 1h30 / Standard ≤ 24h)
- FR26: Le système peut créditer automatiquement le mécanicien d'une livraison Standard gratuite en cas de dépassement du SLA Express
- FR27: Le bot peut envoyer une demande de confirmation de livraison active 30 minutes après la livraison enregistrée
- FR57: Le Rider peut signaler un client absent et déclencher le protocole de tentative manquée (délai d'attente, retour pièce au vendeur)
- FR56: Le Rider peut visualiser les livraisons disponibles dans sa zone avant assignation (Phase 2)
- FR28: Le gestionnaire de flotte Enterprise peut visualiser les commandes et dépenses consolidées par véhicule et par mécanicien (Phase 2)

### Gestion des Utilisateurs & Accès

- FR29: Un utilisateur peut s'inscrire et s'authentifier par OTP SMS sans mot de passe
- FR30: Un utilisateur peut détenir plusieurs rôles simultanément sur un même compte et choisir son contexte actif
- FR51: Le propriétaire peut enregistrer et gérer plusieurs profils véhicules sur son compte
- FR52: L'utilisateur peut consulter l'historique de ses commandes passées avec statut, détails et documents associés
- FR31: L'agente terrain peut onboarder un vendeur en capturant son KYC (RCCM ou CNI/carte de résident) et ses photos de stock sur tablette
- FR32: Un admin Enterprise peut inviter des membres dans son espace tenant et leur assigner des rôles internes
- FR33: Un compte utilisateur peut appartenir à au plus un tenant Enterprise simultanément (v1)
- FR34: L'admin/support Pièces peut accéder aux données cross-tenant, avec journalisation obligatoire de chaque action

### Notifications & Communications

- FR35: Le système peut notifier chaque acteur (mécanicien, propriétaire, vendeur, Rider) aux étapes clés de leur commande via WhatsApp prioritairement, SMS en fallback, Push PWA en complément
- FR36: Le vendeur peut recevoir une alerte quand son stock atteint un seuil critique qu'il a configuré
- FR37: Le vendeur peut recevoir une alerte quand une demande correspond à une pièce de son catalogue
- FR38: L'équipe Pièces peut déclencher un appel proactif vers un mécanicien le lendemain d'une première commande avec SLA breach
- FR61: L'utilisateur peut gérer ses préférences de notification par canal (WhatsApp / SMS / Push PWA)

### Qualité, Garanties & Litiges

- FR39: Le vendeur peut signer les garanties obligatoires (retour pièce incorrecte 48h + pièce occasion 30j) lors de l'activation de son profil
- FR40: L'acheteur peut ouvrir un litige sur une pièce non conforme et soumettre des preuves (photos)
- FR41: Un agent Pièces peut conduire un arbitrage bilatéral (vendeur + client) avec accès aux photos WhatsApp de la commande et rendre une décision écrite
- FR42: Le mécanicien peut recevoir automatiquement le badge "Bon Mécano" quand il atteint ≥ 4,2/5 de note moyenne sur ≥ 10 commandes évaluées
- FR62: Le système peut révoquer automatiquement le badge "Bon Mécano" si la note moyenne descend sous le seuil sur une fenêtre glissante
- FR43: Le mécanicien peut consulter ses notes par commande avec date et contester une note qu'il juge abusive
- FR44: Le propriétaire peut évaluer le mécanicien et la livraison après réception de la pièce
- FR45: Le mécanicien peut être notifié si sa note moyenne approche le seuil de perte ou d'obtention du badge

### Conformité & Données

- FR46: Le système peut recueillir le consentement explicite de l'utilisateur au traitement de ses données personnelles (ARTCI) à la première utilisation sur tous les canaux (PWA + WhatsApp)
- FR47: L'utilisateur peut exercer ses droits d'accès, de rectification et de suppression de ses données personnelles
- FR48: Le numéro RCCM du vendeur formel est affiché publiquement sur sa fiche vendeur
- FR49: L'admin/support peut accéder aux photos et messages WhatsApp associés à une commande pour instruire un litige
- FR63: L'admin/support peut exporter les logs d'audit de ses actions pour conformité ARTCI (Phase 2)

## Non-Functional Requirements

### Performance

- Temps de réponse bot WhatsApp : < 10 secondes depuis la réception du webhook jusqu'à l'envoi de la réponse, **hors latence réseau opérateur** (mesure côté serveur uniquement)
- Temps de chargement PWA — First Contentful Paint : < 3 secondes sur 3G
- Temps de chargement PWA — Time to Interactive : < 3s sur 4G, < 5s sur 3G
- Temps de recherche catalogue Meilisearch : < 50ms pour une requête de référence pièce

### Sécurité

- Toutes les communications API : TLS 1.2 minimum
- Chiffrement au repos : **chiffrement disque infrastructure** (VPS/cloud) — pas pg_crypto en Phase 1 (complexité reportée à Phase 2)
- JWT access token : expiration 15 minutes
- OTP SMS (connexion sans mot de passe) : expiration 5 minutes, usage unique
- Quotas API : **alerte déclenchée à 80% de consommation** Gemini VLM + OTP SMS ; procédure de fallback définie et documentée si quota atteint (ex. : désactivation reconnaissance IA → formulaire manuel, OTP → email de secours)

### Fiabilité

- Disponibilité cible : 99,5% (hors maintenance planifiée annoncée 48h à l'avance)
- RTO (Recovery Time Objective) : 2 heures maximum après incident
- RPO (Recovery Point Objective) : 6 heures maximum (dernière sauvegarde exploitable)
- Circuit breaker Meilisearch : 3 timeouts > 2s consécutifs → bascule automatique vers recherche PostgreSQL ILIKE ; reprise Meilisearch testée après 30 secondes
- Timeout confirmation livraison (FR60) : **48 heures** après livraison confirmée par le coursier sans action du destinataire → libération automatique du paiement escrow vers le vendeur
- Clarification escrow : **panne de la plateforme Pièces ≠ fonds bloqués** — CinetPay gère l'escrow de manière indépendante ; les fonds sont protégés même en cas d'indisponibilité de Pièces
- Rétention des données : commandes + litiges = **12 mois minimum** ; logs GPS coursiers = **6 mois minimum**

### Scalabilité

- Phase 1 (pilote fermé) : support de **20 utilisateurs concurrents maximum** — threshold acceptable pour pilote 10 vendeurs / 50 mécaniciens / 5 Enterprise
- Upload photos catalogue : **5 MB maximum par image** ; compression client effectuée avant upload (réduction bande passante réseau mobile CI)
- Architecture conçue pour supporter 10× la charge Phase 1 sans refactoring architectural majeur (préparation Phase 2)

### Intégrations

- **CinetPay** : paiement mobile money (Orange Money, MTN MoMo, Wave) + escrow Phase 1
- **WhatsApp Cloud API** : réception webhooks, envoi messages proactifs, gestion templates approuvés
- **Gemini VLM** : reconnaissance visuelle pièces zero-shot, alerte quota à 80%
- **Tesseract / Google Vision** : OCR carte grise, extraction VIN
- **Meilisearch** : moteur de recherche catalogue (~10 000 références Phase 1), synchronisation asynchrone via queue Redis (délai ≤ 5s)
- **Redis** : cache sessions, queues tâches asynchrones

### Accessibilité

- Cibles tactiles : **minimum 44 × 44 px** pour tous les éléments interactifs (conformité mobile-first CI, pouces sur écrans 5–6 pouces)
- Contraste couleurs : ratio **minimum 4,5:1** (WCAG AA) pour texte standard
- Messages WhatsApp : contenu lisible en texte brut, sans dépendance aux rich media (images, boutons interactifs) pour les informations critiques (confirmation commande, montant, statut)

