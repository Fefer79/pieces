// Source unique des formules flotte — partagée par la vitrine publique
// (/entreprises) et la page abonnement (/enterprise/billing).
// Positionnement : Pièces optimise les coûts d'exploitation des flottes.
// Stratégie tarifaire : 3 paliers, Flotte Pro + (10 000 F) mis en avant.
// Aucune mention de SLA contractuel / pénalité / remboursement : la livraison
// rapide est présentée comme un bénéfice de service.

export type TierKey = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'

export interface FleetPlan {
  key: TierKey
  label: string
  tagline: string
  price: string
  priceNote: string
  cta: string
  highlights: string[]
  /** Carte mise en avant (le palier que l'on recommande) */
  highlight?: boolean
  badge?: string
}

/** La promesse de livraison rapide du palier Pro + (sans SLA ni pénalité). */
export const DELIVERY_PROMISE = 'Livraison express à Abidjan : 3 heures, 6 heures maximum.'

export const FLEET_PLANS: FleetPlan[] = [
  {
    key: 'FREE',
    label: 'Gratuit',
    tagline: 'Achetez la bonne pièce, au bon prix.',
    price: '0 F',
    priceNote: 'commission fournisseur uniquement',
    cta: 'Créer un compte',
    highlights: [
      'Catalogue avec compatibilité véhicule',
      'Comparateur multi-fournisseurs sur le prix',
      'Garantie pièce intermédiée + retours',
      'Jusqu’à 3 véhicules, 1 utilisateur',
    ],
  },
  {
    key: 'PRO_FLOTTE',
    label: 'Flotte Pro',
    tagline: 'Pilotez vos coûts.',
    price: '5 000 F',
    priceNote: 'par véhicule / mois',
    cta: 'Demander un essai 30 jours',
    highlights: [
      'Véhicules et utilisateurs illimités',
      'Tableau de bord et analytique des coûts (coût/km, par catégorie)',
      'Détection automatique des véhicules « gouffres »',
      'Alertes d’entretien prédictives',
      'Multi-centres + rôles fins (gestionnaire / mécano / compta)',
      'Stock tampon sur pièces critiques',
      'Factures normalisées DGI à l’unité',
    ],
  },
  {
    key: 'PRO_FLOTTE_PLUS',
    label: 'Flotte Pro +',
    tagline: 'Zéro immobilisation, administration déléguée.',
    price: '10 000 F',
    priceNote: 'par véhicule / mois — tout inclus',
    cta: 'Demander un essai 30 jours',
    highlight: true,
    badge: 'Recommandé — meilleur rapport',
    highlights: [
      'Tout Flotte Pro inclus',
      'Livraison express : 3 h, 6 h maximum (Abidjan)',
      'Réapprovisionnement automatique du stock tampon',
      'Facture mensuelle consolidée + optimisation fiscale + export FEC',
      'Support prioritaire WhatsApp dédié',
      'Concierge sourcing (même hors catalogue)',
      'Revue trimestrielle avec un expert Pièces',
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
      { label: 'Stock tampon sur SKU critiques', free: '—', pro: '✓', plus: '✓' },
      { label: 'Réapprovisionnement automatique', free: '—', pro: '—', plus: '✓' },
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
      { label: 'Livraison standard', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Livraison express 3 h (6 h max) à Abidjan', free: '—', pro: '—', plus: '✓' },
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

/** Leviers d'économies mis en avant sur la vitrine. */
export const COST_LEVERS: Array<{ title: string; body: string }> = [
  {
    title: 'Le bon prix, à chaque achat',
    body: 'Comparateur multi-fournisseurs et scoring qualité : vous arrêtez de surpayer les pièces et d’acheter de la mauvaise qualité qui casse vite.',
  },
  {
    title: 'Vos véhicules sous contrôle',
    body: 'L’analytique par véhicule (coût/km, par catégorie) révèle les véhicules qui coûtent anormalement cher, ce qui permet d’investiguer si le problème est le chauffeur ou le véhicule.',
  },
  {
    title: 'Moins de pannes, moins d’immobilisation',
    body: 'Les alertes d’entretien préviennent la casse avant qu’elle arrive. Avec Flotte Pro +, la pièce est livrée en 3 h (6 h max) à Abidjan.',
  },
  {
    title: 'Administration et fiscalité allégées',
    body: 'Factures normalisées DGI, facture mensuelle consolidée et export FEC : votre comptabilité flotte est prête, sans ressaisie.',
  },
]
