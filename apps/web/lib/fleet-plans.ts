// Source unique des formules flotte — partagée par la vitrine publique
// (/entreprises) et la page abonnement (/enterprise/billing).
// Positionnement : Pièces optimise les coûts d'exploitation des flottes.
// Stratégie tarifaire : 3 paliers, Flotte Pro + (9 900 F) mis en avant.
// Aucune mention de SLA contractuel / pénalité / remboursement : la livraison
// rapide est présentée comme un bénéfice de service.
// Même règle pour l'immobilisation : jamais « zéro immobilisation » — on promet
// « les temps d'immobilisation les plus courts possibles » grâce à une équipe
// dédiée (engagement de moyens, pas de résultat).
// Gestion déléguée des achats de pièces : service optionnel SANS SURCOÛT inclus
// dans Flotte Pro + (voir DELEGATED_PROCUREMENT).
// Les fourchettes de livraison affichées ici doivent rester cohérentes avec la
// grille réellement facturée : packages/shared/constants/delivery-pricing.ts
// (% du sous-total par vendeur, plancher zone = borne basse, plafond = borne haute).

export type TierKey = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'

export interface FleetPlan {
  key: TierKey
  label: string
  tagline: string
  price: string
  priceNote: string
  cta: string
  highlights: string[]
  /**
   * Temps et coûts de livraison, affichés dans une rangée alignée en bas des
   * cartes tarifaires (après les autres avantages) pour comparer les formules.
   */
  delivery: Array<{ label: string; value: string }>
  /** Carte mise en avant (le palier que l'on recommande) */
  highlight?: boolean
  badge?: string
}

/** La promesse de livraison rapide du palier Pro + (sans SLA ni pénalité). */
export const DELIVERY_PROMISE =
  'Livraison express à Abidjan : 6 heures, 12 heures maximum. Offerte avec Flotte Pro + ; en option sinon (5 000 – 19 900 F en Gratuit, 5 000 – 9 900 F en Flotte Pro). Livraison standard 48–72 h : 1 500 – 9 000 F en Gratuit, 1 000 – 5 000 F en Flotte Pro.'

export const FLEET_PLANS: FleetPlan[] = [
  {
    key: 'FREE',
    label: 'Gratuit',
    tagline: 'Achetez la bonne pièce, au bon prix.',
    price: '0 F',
    priceNote: '',
    cta: 'Créer un compte',
    highlights: [
      'Catalogue avec compatibilité véhicule',
      'Comparateur multi-fournisseurs sur le prix',
      'Garantie pièce intermédiée + retours',
      'Jusqu’à 3 véhicules, 1 utilisateur',
    ],
    delivery: [
      { label: 'Standard 48–72 h', value: '1 500 – 9 000 F' },
      { label: 'Express 6 h (12 h max)', value: '+ 5 000 – 19 900 F' },
    ],
  },
  {
    key: 'PRO_FLOTTE',
    label: 'Flotte Pro',
    tagline: 'Pilotez vos coûts.',
    price: '4 900 F',
    priceNote: 'par véhicule / mois',
    cta: 'Demander un essai 30 jours',
    highlights: [
      'Véhicules et utilisateurs illimités',
      'Tableau de bord et analytique des coûts (coût/km, par catégorie)',
      'Détection automatique des véhicules « gouffres »',
      'Alertes d’entretien prédictives',
      'Multi-centres + rôles fins (gestionnaire / mécano / compta)',
      'Factures normalisées DGI à l’unité',
    ],
    delivery: [
      { label: 'Standard 48–72 h', value: '1 000 – 5 000 F' },
      { label: 'Express 6 h (12 h max)', value: '+ 5 000 – 9 900 F' },
    ],
  },
  {
    key: 'PRO_FLOTTE_PLUS',
    label: 'Flotte Pro +',
    tagline: 'Vos achats de pièces, gérés pour vous.',
    price: '9 900 F',
    priceNote: 'par véhicule / mois — tout inclus',
    cta: 'Demander un essai 30 jours',
    highlight: true,
    badge: 'Recommandé — meilleur rapport',
    highlights: [
      'Tout Flotte Pro inclus',
      'Gestion déléguée de vos achats de pièces (en option, sans surcoût)',
      'Stock tampon sur pièces critiques',
      'Réapprovisionnement automatique du stock tampon',
      'Facture mensuelle consolidée + optimisation fiscale + export FEC',
      'Support prioritaire WhatsApp dédié',
      'Concierge sourcing (même hors catalogue)',
      'Revue trimestrielle avec un expert Pièces',
    ],
    delivery: [
      { label: 'Standard 48–72 h', value: 'Offerte' },
      { label: 'Express 6 h (12 h max)', value: 'Offerte' },
    ],
  },
]

export interface ComparisonGroup {
  group: string
  rows: Array<{ label: string; free: string; pro: string; plus: string }>
}

export const FLEET_COMPARISON: ComparisonGroup[] = [
  {
    group: 'Marketplace & confiance',
    rows: [
      { label: 'Catalogue compatibilité véhicule', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Comparateur multi-fournisseurs (prix)', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Comparateur enrichi (scoring qualité)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Garantie pièce intermédiée + retours', free: '✓', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Gestion de flotte',
    rows: [
      { label: 'Véhicules & utilisateurs', free: '3 véh / 1', pro: 'Illimités', plus: 'Illimités' },
      { label: 'Centres de maintenance', free: '—', pro: 'Illimités', plus: 'Illimités' },
      { label: 'Fiche véhicule enrichie (coût, coût/km, vs flotte)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Rôles fins (gestionnaire / mécano / compta)', free: '—', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Intelligence & pilotage des coûts',
    rows: [
      { label: 'Tableau de bord multi-véhicules', free: '—', pro: '✓', plus: '✓' },
      { label: 'Analytique flotte (coût/km, par catégorie, par usage)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Détection véhicules « gouffres »', free: '—', pro: '✓', plus: '✓' },
      { label: 'Alertes d’entretien prédictives', free: '—', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Stock & approvisionnement',
    rows: [
      { label: 'Stock tampon sur SKU critiques', free: '—', pro: '—', plus: '✓' },
      { label: 'Réapprovisionnement automatique', free: '—', pro: '—', plus: '✓' },
      { label: 'Gestion déléguée des achats de pièces', free: '—', pro: '—', plus: 'En option, incluse' },
    ],
  },
  {
    group: 'Facturation & fiscalité',
    rows: [
      { label: 'Factures normalisées DGI (QR, mentions)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Facture mensuelle consolidée flotte', free: '—', pro: '—', plus: '✓' },
      { label: 'Optimisation fiscale + export FEC', free: '—', pro: '—', plus: '✓' },
    ],
  },
  {
    group: 'Logistique',
    rows: [
      { label: 'Livraison standard (48–72 h)', free: '1 500 – 9 000 F', pro: '1 000 – 5 000 F', plus: 'Offerte' },
      { label: 'Livraison express 6 h (12 h max) à Abidjan', free: '+ 5 000 – 19 900 F', pro: '+ 5 000 – 9 900 F', plus: 'Offerte' },
      { label: 'Livraison prioritaire hors Abidjan', free: '—', pro: '—', plus: '✓' },
      { label: 'Concierge sourcing (hors catalogue)', free: '—', pro: '—', plus: '✓' },
    ],
  },
  {
    group: 'Service',
    rows: [
      { label: 'PDF historique véhicule signé Pièces', free: '—', pro: '✓', plus: '✓' },
      { label: 'Support standard', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Support prioritaire WhatsApp dédié', free: '—', pro: '—', plus: '✓' },
      { label: 'Revue trimestrielle avec un expert Pièces', free: '—', pro: '—', plus: '✓' },
    ],
  },
]

/**
 * Gestion déléguée des achats de pièces — service optionnel sans surcoût,
 * réservé à Flotte Pro +. Partagé par la vitrine (/entreprises) et toute page
 * qui présente le service. Ton : engagement de moyens (« les plus courts
 * possibles »), jamais de résultat garanti ni de « zéro immobilisation ».
 */
export const DELEGATED_PROCUREMENT = {
  eyebrow: 'Gestion déléguée — exclusif Flotte Pro +',
  title: 'Confiez-nous vos achats de pièces.',
  intro:
    'En option et sans surcoût dans Flotte Pro + : une équipe Pièces dédiée gère vos besoins en pièces détachées à votre place. Sur la base de vos dépenses actuelles, elle achète au meilleur rapport qualité/prix du marché et anticipe les besoins. Parce que c’est son seul métier, vos temps d’immobilisation sont les plus courts possibles.',
  steps: [
    {
      title: 'Audit de vos dépenses',
      body: 'Nous analysons votre historique d’achats et votre flotte : surcoûts, pièces critiques, fournisseurs habituels.',
    },
    {
      title: 'Plan d’approvisionnement',
      body: 'Stock tampon dimensionné véhicule par véhicule, fournisseurs sélectionnés au meilleur rapport qualité/prix.',
    },
    {
      title: 'Commandes proactives',
      body: 'Déclenchées par les alertes d’entretien, avant la panne. La pièce arrive en express, livraison offerte.',
    },
    {
      title: 'Revue trimestrielle',
      body: 'Économies réalisées et immobilisations évitées, chiffrées par votre expert Pièces.',
    },
  ],
  note: 'Service activable à la demande, sans surcoût, pour les flottes de 10 véhicules et plus. Vous gardez la visibilité complète : chaque achat reste tracé dans votre tableau de bord, avec le détail du prix.',
} as const

/** Leviers d'économies mis en avant sur la vitrine. `line` = la ligne du budget d'exploitation que le levier fait baisser. */
export const COST_LEVERS: Array<{ line: string; title: string; body: string }> = [
  {
    line: 'Achats',
    title: 'Le bon prix, à chaque achat',
    body: 'Comparateur multi-fournisseurs et scoring qualité : vous arrêtez de surpayer les pièces et savez exactement ce que vous achetez.',
  },
  {
    line: 'Pilotage',
    title: 'Vos véhicules sous contrôle',
    body: 'L’analytique par véhicule (coût/km, par catégorie) révèle les véhicules qui coûtent anormalement cher, ce qui permet d’investiguer si le problème est le chauffeur ou le véhicule.',
  },
  {
    line: 'Immobilisation',
    title: 'Les temps d’immobilisation les plus courts possibles',
    body: 'Les alertes d’entretien préviennent la casse avant qu’elle arrive, et Flotte Pro + livre la pièce en 6 h (12 h max) à Abidjan, livraison offerte. Avec la gestion déléguée, une équipe Pièces dédiée anticipe même vos besoins : vos véhicules attendent la pièce le moins longtemps possible.',
  },
  {
    line: 'Administration',
    title: 'Administration et fiscalité allégées',
    body: 'Factures normalisées DGI, facture mensuelle consolidée et export FEC : votre comptabilité flotte est prête, sans ressaisie.',
  },
]
