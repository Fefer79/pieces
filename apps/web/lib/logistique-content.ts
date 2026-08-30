// Source unique du contenu de logistique.pieces.ci — vitrine, calculateur et
// parcours de cotation. Analogue de lib/fleet-plans.ts pour la vitrine flotte.
//
// Règles de copy, non négociables :
//  - Aucun vocabulaire SLA / pénalité / garantie / remboursement. Les délais sont
//    des estimations, jamais des engagements contractuels.
//  - Le partenaire transitaire n'est JAMAIS nommé : Pièces est l'opérateur de
//    bout en bout, l'exécution est sous-traitée (docs/logistique-as-a-service.md §1).
//  - Tout montant FCFA s'affiche en `font-mono tabular` via toLocaleString('fr-FR')
//    (séparateur = espace insécable U+00A0).
//  - Les tarifs internes de LOGISTICS_MODES (ratePerKg, minimumCharge) sont des
//    placeholders de cadrage : on n'affiche JAMAIS un tarif brut, seulement des
//    totaux calculés par le moteur.
//
// Les chiffres d'immobilisation (23 000 / 30 000 / 38 000 F par jour) viennent de
// la calibration GoCab, bornes basses retenues — cf. docs/logistique-as-a-service.md §1.

import type {
  ArbitrageInput,
  LogisticsMode,
  LogisticsConfidence,
  VehicleEconomyCategory,
} from 'shared/constants'
import type { ChipVariant } from '@/components/ui/chip'

export {
  CERTAINTY_WEIGHTS,
  CERTAINTY_LEVELS,
  CERTAINTY_SIGNAL_LABEL,
  computeCertainty,
  certaintyLevelSpec,
  nextBestSignal,
} from 'shared/constants'
export type {
  LeadCertaintySignal,
  LeadCertaintyLevel,
  LeadCertaintySignals,
} from 'shared/constants'

export const LOGISTIQUE_BASE_URL = 'https://logistique.pieces.ci'

/**
 * Les liens internes restent relatifs (`/logistique/devis`) : sur le
 * sous-domaine le middleware réécrit `/devis` → `/logistique/devis`, et sur
 * pieces.ci le chemin littéral fonctionne tel quel. On n'utilise l'URL absolue
 * que pour les `canonical`.
 */
export const canonicalFor = (slug: string) =>
  `${LOGISTIQUE_BASE_URL}${slug === '/' ? '' : slug}`

export const LOGISTIQUE_NAV: Array<{ href: string; label: string }> = [
  { href: '/logistique/flottes-vtc', label: 'Flottes VTC' },
  { href: '/logistique/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/logistique/calculateur', label: 'Calculateur' },
  { href: '/logistique/faq', label: 'FAQ' },
]

export const LOGISTIQUE_FOOTER_NOTE =
  'Les délais et montants affichés sont des estimations de cadrage, confirmées par un devis avant toute commande. Ils n\'engagent pas de délai contractuel.'

// ---------------------------------------------------------------------------
// Hero — vitrine ouverte (page d'accueil, tous demandeurs)
// ---------------------------------------------------------------------------

/**
 * La home s'adresse à tout le monde : le service ne suppose pas que le véhicule
 * produise une recette. L'argument d'entrée est donc le coût RENDU à Abidjan,
 * tout compris — pas l'immobilisation, qui reste l'argument du segment VTC et
 * vit sur /logistique/flottes-vtc (VTC_HERO plus bas).
 */
export const LOGISTIQUE_HERO = {
  eyebrow: 'Le logisticien des pièces détachées auto en Côte d\'Ivoire',
  title: 'La pièce que vous ne trouvez pas à Abidjan, nous la faisons venir.',
  lead: 'Une référence introuvable, un modèle trop récent, une marque peu distribuée : nous identifions la pièce exacte, nous la sourçons chez le fournisseur ou à l\'usine, et nous vous annonçons le coût rendu à Abidjan — fret, douane et livraison compris. Un seul interlocuteur, un seul montant.',
  ctaPrimary: { label: 'Demander une cotation', href: '/logistique/devis' },
  ctaSecondary: { label: 'Comment ça marche', href: '/logistique/comment-ca-marche' },
  audiences: [
    'Particuliers',
    'Garages & ateliers',
    'Flottes VTC',
    'Flottes d\'entreprise',
    'Mines & BTP',
    'Concessionnaires',
    'Importateurs',
  ],
}

export interface ReceiptLine {
  label: string
  value: string
  /** Ligne mise en avant comme le poste dominant. */
  dominant?: boolean
}

/**
 * Composant signature « Reçu », version ouverte : la décomposition du coût rendu
 * à Abidjan, sans immobilisation. C'est la règle DESIGN.md « décomposition de
 * prix explicite » appliquée à l'import, et elle vaut pour tous les demandeurs.
 * Même pièce d'exemple que le reçu VTC, pour que les deux pages se répondent.
 */
export const LOGISTIQUE_RECEIPT_OPEN = {
  header: 'Amortisseur avant · Bestune B70 2024',
  subheader: 'Aérien standard, 5 jours',
  lines: [
    { label: 'Prix pièce (usine)', value: '32 000' },
    { label: 'Fret aérien (poids taxable 4,5 kg)', value: '46 500' },
    { label: 'Douane (20 %)', value: '15 700' },
    { label: 'Livraison Abidjan', value: '2 000' },
  ] as ReceiptLine[],
  total: { label: 'Coût rendu à Abidjan', value: '96 200 FCFA' },
  note: 'Estimation de cadrage, ± 20 %. Aucun poste caché : ce que vous voyez est ce que vous payez, douane comprise.',
}

export const LOGISTIQUE_STATS: Array<{ num: string; cap: string }> = [
  { num: '4 h → 45 j', cap: 'six modes d\'acheminement comparés sur la même grille' },
  { num: '17 familles', cap: 'de pièces codées en poids et en volume : vous n\'avez rien à peser' },
  { num: '0 F', cap: 'la cotation et le devis confirmé sont gratuits, sans compte' },
  { num: '2 h', cap: 'le retour habituel sur un devis confirmé, par WhatsApp, en heures ouvrées' },
]

/**
 * Segments servis. Chaque carte pointe vers le formulaire avec le type de
 * demandeur pré-sélectionné (`?profil=`), ce qui évite au visiteur de se
 * reconnaître dans un menu déroulant après coup. Les valeurs `profil`
 * correspondent aux `CUSTOMER_TYPE_OPTIONS` (donc à l'enum côté API).
 */
export const LOGISTIQUE_SEGMENTS: Array<{
  profil: string
  title: string
  body: string
  href?: string
  hrefLabel?: string
}> = [
  {
    profil: 'INDIVIDUAL',
    title: 'Particuliers',
    body: 'Votre voiture est immobilisée faute d\'une pièce que personne n\'a en stock à Abidjan. Nous la trouvons et nous vous donnons son coût rendu avant que vous engagiez quoi que ce soit.',
  },
  {
    profil: 'GARAGE',
    title: 'Garages & ateliers',
    body: 'Vous avez identifié la panne, pas le fournisseur. Envoyez la référence OEM ou une photo : nous cotons, nous importons et nous livrons à l\'atelier.',
  },
  {
    profil: 'FLEET_VTC',
    title: 'Flottes VTC',
    body: 'L\'offre la plus complète : arbitrage délai / coût, stock pré-positionné à Abidjan, entreposage et audit des dépenses.',
    href: '/logistique/flottes-vtc',
    hrefLabel: 'Voir l\'offre flottes VTC',
  },
  {
    profil: 'FLEET_COMPANY',
    title: 'Flottes d\'entreprise',
    body: 'Véhicules de fonction et utilitaires : approvisionnement planifié, facturation centralisée, inventaire exportable pour votre maintenance.',
  },
  {
    profil: 'MINING_BTP',
    title: 'Mines & BTP',
    body: 'Engins et poids lourds : pièces lourdes ou volumineuses, arbitrage entre aérien et maritime groupé, acheminement hors Abidjan chiffré dans le devis.',
  },
  {
    profil: 'DEALER',
    title: 'Concessionnaires',
    body: 'Compléter un stock de pièces d\'origine sans immobiliser de trésorerie sur un conteneur entier : vous commandez ce dont vous avez besoin, quand vous en avez besoin.',
  },
  {
    profil: 'IMPORTER',
    title: 'Importateurs & revendeurs',
    body: 'Groupage maritime, formalités douanières et livraison locale sur des séries de références, avec le détail poste par poste.',
  },
]

export const LOGISTIQUE_SEGMENTS_INTRO =
  'Le service est le même pour tous : une pièce à trouver, un coût rendu à Abidjan, un seul interlocuteur. Ce qui change, c\'est ce que nous ajoutons autour.'

/**
 * Bloc prioritaire de la home renvoyant vers la page flottes VTC. Il conserve le
 * chiffre-choc de l'immobilisation, mais comme argument d'UN segment — plus
 * comme thèse du site.
 */
export const VTC_TEASER = {
  eyebrow: 'Offre prioritaire · Flottes VTC',
  title: 'Si votre véhicule produit une recette, l\'attente coûte plus cher que la pièce.',
  lead: 'Pour les flottes VTC, nous chiffrons un troisième terme que personne ne met dans la balance : le revenu perdu chaque jour d\'immobilisation. À 30 000 F par jour, cinq jours d\'attente valent 150 000 F, soit près de cinq fois le prix de l\'amortisseur.',
  bullets: [
    'Matrice d\'arbitrage : six modes d\'acheminement comparés en coût total réel.',
    'Stock pré-positionné à Abidjan : la pièce disponible en 4 h, pas en 5 jours.',
    'Entreposage et dispatch, suivis par référence OEM et par véhicule.',
    'Audit big data annuel de vos dépenses en pièces détachées.',
  ],
  ctaPrimary: { label: 'Voir l\'offre flottes VTC', href: '/logistique/flottes-vtc' },
  ctaSecondary: {
    label: 'Calculer mon coût d\'immobilisation',
    href: '/logistique/calculateur',
  },
}

// ---------------------------------------------------------------------------
// Hero — page flottes VTC (/logistique/flottes-vtc)
// ---------------------------------------------------------------------------

export const VTC_HERO = {
  eyebrow: 'Offre flottes VTC',
  title: 'Nous chiffrons l\'attente.',
  lead: 'Une pièce introuvable à Abidjan, c\'est un véhicule à l\'arrêt et une recette perdue. Nous comparons les options d\'approvisionnement (achat local, aérien, maritime) et nous y ajoutons le revenu perdu chaque jour d\'immobilisation.',
  ctaPrimary: { label: 'Demander une cotation', href: '/logistique/devis?profil=FLEET_VTC' },
  ctaSecondary: { label: 'Combien coûte un véhicule à l\'arrêt ?', href: '/logistique/calculateur' },
  audiences: ['Flottes VTC', 'Flottes d\'entreprise', 'Mines & BTP', 'Particuliers VTC'],
}

/**
 * Composant signature « Reçu » appliqué à l'arbitrage. Exemple : amortisseur
 * avant de Bestune B70 2024, immobilisation 30 000 F/jour (§1 du doc), acheminé
 * en aérien standard (5 j).
 */
export const LOGISTIQUE_RECEIPT = {
  header: 'Amortisseur avant · Bestune B70 2024',
  subheader: 'Aérien standard, 5 jours',
  lines: [
    { label: 'Prix pièce (usine)', value: '32 000' },
    { label: 'Fret aérien (poids taxable 4,5 kg)', value: '46 500' },
    { label: 'Douane (20 %)', value: '15 700' },
    { label: 'Livraison Abidjan', value: '2 000' },
    { label: 'Immobilisation 5 j × 30 000 F', value: '150 000', dominant: true },
  ] as ReceiptLine[],
  total: { label: 'Coût total réel', value: '246 200 FCFA' },
  note: 'Estimation de cadrage, ± 20 %. L\'immobilisation représente 61 % du coût total réel. C\'est beaucoup plus que le prix de la pièce.',
}

export const VTC_STATS: Array<{ num: string; cap: string }> = [
  { num: '4 h → 45 j', cap: 'six modes d\'acheminement comparés sur la même grille' },
  { num: '30 000 F', cap: 'ce que coûte une journée d\'arrêt d\'un véhicule premium' },
  { num: '× 42', cap: 'écart entre la pièce la moins chère et le coût total le plus élevé' },
  { num: '17 familles', cap: 'de pièces déjà codées en poids et en volume : vous n\'avez rien à peser' },
]

export const TOTAL_COST_FORMULA = [
  'Coût total = prix pièce',
  '           + frais logistique (fret + douane + livraison locale)',
  '           + délai en jours × coût d\'immobilisation journalier',
]

export const TOTAL_COST_INTRO =
  'Un gestionnaire de parc arbitre entre « attendre la pièce » et « payer plus vite » sans jamais chiffrer le troisième terme, qui est pourtant le plus lourd dans la plupart des cas.'

// ---------------------------------------------------------------------------
// Matrice de démonstration — passée telle quelle à computeArbitrageMatrix()
// ---------------------------------------------------------------------------

/**
 * La table de la landing est produite par le MÊME moteur que le produit
 * (`computeArbitrageMatrix`, packages/shared/constants/logistics.ts). Aucune
 * dérive possible entre le discours commercial et ce que voit un client.
 */
export const DEMO_MATRIX: {
  vehicle: string
  caption: string
  note: string
  input: ArbitrageInput
} = {
  vehicle: 'Bestune B70 2024, amortisseur avant',
  caption:
    'Immobilisation 30 000 F/jour (catégorie premium thermique). Pièce introuvable à Abidjan, 32 000 F à l\'usine — quatre façons de la faire venir.',
  note: 'À prix de pièce identique, le mode d\'acheminement fait tout : le maritime, le moins cher au fret, produit le coût total le plus élevé.',
  input: {
    downtimeCostPerDay: 30_000,
    // Famille résolue au rendu depuis « amortisseur » — cf. matchLogisticsFamily.
    options: [
      { mode: 'AIR_NOW', partPrice: 32_000 },
      { mode: 'AIR_STANDARD', partPrice: 32_000 },
      { mode: 'AIR_ECONOMY', partPrice: 32_000 },
      { mode: 'SEA_LCL', partPrice: 32_000 },
    ],
  },
}

export const DEMO_MATRIX_PART_QUERY = 'amortisseur avant'

/** Règle à retenir en sortant de la démonstration. */
export const SWITCH_RULE =
  'À 30 000 F par jour d\'arrêt, un jour gagné vaut 30 000 F de transport. Toute option qui raccourcit le délai d\'un jour pour moins de 30 000 F est rentable, quel que soit le prix de la pièce.'

// ---------------------------------------------------------------------------
// Modes d'acheminement (copy public — jamais les tarifs internes)
// ---------------------------------------------------------------------------

export const MODE_COPY: Record<
  LogisticsMode,
  { publicLabel: string; delay: string; useCase: string; basis: string }
> = {
  PRE_POSITIONED: {
    publicLabel: 'Stock pré-positionné',
    delay: '4 h',
    useCase: 'Pièce déjà à Abidjan, réservée à votre flotte sur un plan d\'anticipation.',
    basis: 'Forfait de mise à disposition',
  },
  LOCAL: {
    publicLabel: 'Achat local',
    delay: '24 à 48 h',
    useCase: 'La pièce existe chez un vendeur d\'Abidjan et sa qualité est vérifiée.',
    basis: 'Grille de livraison Abidjan',
  },
  AIR_NOW: {
    publicLabel: 'Aérien express',
    delay: '3 jours',
    useCase: 'Véhicule productif à l\'arrêt : chaque jour gagné vaut plus que le fret.',
    basis: 'Poids taxable × tarif zone + douane',
  },
  AIR_STANDARD: {
    publicLabel: 'Aérien standard',
    delay: '4 à 5 jours',
    useCase: 'Le cas courant : bon compromis délai / coût sur une pièce d\'usure.',
    basis: 'Poids taxable, tarif dégressif',
  },
  AIR_ECONOMY: {
    publicLabel: 'Aérien économique',
    delay: '7 jours',
    useCase: 'Pièce chère et arrêt tolérable : véhicule de réserve, entretien planifié.',
    basis: 'Poids taxable, tarif éco',
  },
  SEA_LCL: {
    publicLabel: 'Maritime groupé',
    delay: '45 jours',
    useCase: 'Anticipation et pièces volumineuses. Rarement rentable sur un véhicule en service.',
    basis: 'Volume (m³) ou tonne + manutention + douane',
  },
}

/**
 * Ordre d'affichage public. Le pré-positionné n'est proposé qu'aux flottes, et
 * l'achat local ne l'est plus du tout : on fait venir une pièce précisément
 * parce qu'elle est introuvable à Abidjan. MODE_COPY.LOCAL reste défini pour
 * les cotations déjà émises avec ce mode.
 */
export const PUBLIC_MODES: LogisticsMode[] = [
  'AIR_NOW',
  'AIR_STANDARD',
  'AIR_ECONOMY',
  'SEA_LCL',
]

// ---------------------------------------------------------------------------
// Ce que nous prenons en charge
// ---------------------------------------------------------------------------

/**
 * `fleetOnly` marque les leviers qui ne s'adressent qu'aux gestionnaires de
 * parc : sur la vitrine ouverte ils portent une mention « Flottes » pour qu'un
 * particulier ne se demande pas si l'offre le concerne.
 */
export const LOGISTIQUE_LEVERS: Array<{
  line: string
  title: string
  body: string
  fleetOnly?: boolean
}> = [
  {
    line: 'Sourcing',
    title: 'Trouver la bonne référence',
    body: 'À partir d\'une photo, d\'une référence OEM ou d\'un VIN, nous identifions la pièce exacte et nous remontons les fournisseurs : usine, équipementier, marché local.',
  },
  {
    line: 'Arbitrage',
    title: 'Chiffrer chaque option',
    body: 'Une seule grille pour comparer : prix pièce, fret, douane, livraison, et le revenu perdu pendant l\'attente. Chaque poste est détaillé.',
  },
  {
    line: 'Exécution',
    title: 'Acheminer et dédouaner',
    body: 'Enlèvement chez le fournisseur, fret, formalités douanières ivoiriennes et livraison au garage ou au centre de maintenance. Un seul interlocuteur.',
  },
  {
    line: 'Entreposage',
    fleetOnly: true,
    title: 'Stocker, dispatcher, livrer à la demande',
    body: 'Pour les gestionnaires de flotte, nous gardons vos pièces importées en stock à Abidjan, suivies par référence et par véhicule. La mise à disposition est facturée à l\'enlèvement ou à la livraison, selon votre cadence, sans facturation au mètre carré.',
  },
  {
    line: 'Anticipation',
    fleetOnly: true,
    title: 'Éviter l\'urgence',
    body: 'Sur un parc homogène, nous construisons un plan d\'approvisionnement trimestriel : les pièces d\'usure arrivent par maritime avant la panne, sont stockées, puis dispatchées au fil des besoins.',
  },
]

export const WEIGHT_VOLUME_PROMISE = {
  title: 'Vous n\'avez rien à peser.',
  body: 'Un transitaire vous demande le poids et les dimensions avant de coter. Nous avons codé 17 familles de pièces avec leurs fourchettes de poids et de volume : vous nommez la pièce, nous calculons le poids taxable.',
  bullets: [
    'Aérien : le poids facturé est le maximum entre le poids réel et le volume ÷ 6 000.',
    'Maritime groupé : 1 m³ compte pour 1 tonne, donc un pare-chocs coûte son volume, pas sa masse.',
    'Batteries, airbags et amortisseurs à gaz sont signalés comme restreints en fret aérien.',
    'Chaque envoi réel affine le référentiel : la marge d\'erreur se resserre avec le volume.',
  ],
}

export const STORAGE_FLEET_BULLETS: string[] = [
  'Stockage à Abidjan, suivi par référence OEM et par véhicule de la flotte.',
  'Mise à disposition à l\'enlèvement (votre coursier) ou à la livraison (notre coursier).',
  'Pièces réservées à votre parc : jamais livrées à un tiers par erreur.',
  'Inventaire exportable (CSV) à chaque fin de mois, pour rapprochement avec votre maintenance.',
  'Idéal pour les pièces d\'usure importées par maritime en une fois et servies au fil des mois.',
  'Compatible avec le plan d\'anticipation trimestriel : un seul interlocuteur, du fournisseur au véhicule.',
]

// Audit big data des dépenses de pièces détachées — service additionnel pour
// gestionnaires de flotte. Source des données : commandes et réparations
// déclarées par la flotte + données propriétaires Pièces (connaissance
// accumulée sur les pièces, familles, prix marché, durées d'immobilisation).
// Plus le parc alimente la base, plus l'audit est précis.
export const AUDIT_BIGDATA = {
  eyebrow: 'Audit big data',
  title: 'Optimisez vos dépenses en pièces détachées sur la durée.',
  lead: 'Un audit annuel de vos dépenses en pièces détachées : ce que vous dépensez, où, et ce que vous pourriez ré-allouer. Il est bâti sur deux sources de données.',
  sources: [
    {
      title: 'Vos données',
      body: 'Les commandes et réparations de pièces détachées déclarées par votre flotte sur Pièces.',
    },
    {
      title: 'Nos données propriétaires',
      body: 'La connaissance accumulée par Pièces : prix marché, durées d\'immobilisation par famille, calendriers d\'usure par modèle de véhicule, écarts de prix entre fournisseurs.',
    },
  ],
  outputs: [
    'Ce que vous avez dépensé, par véhicule, par famille, par fournisseur.',
    'Les pièces qui reviennent trop souvent, signe d\'usure avancée ou de fournisseur à changer.',
    'Les écarts de prix vs le marché Pièces, par référence.',
    'Les optimisations possibles : regrouper les achats, basculer une pièce d\'usure en stock tampon, abandonner un fournisseur récurrent en surcoût.',
  ],
  ctaFleetLabel: 'Demander un audit',
  ctaFleetHref: '/entreprises',
  pricing: {
    included: 'Inclus dans les abonnements Flotte Pro et Flotte Pro +.',
    onDemand: '19 900 FCFA par véhicule de flotte, pour les gestionnaires non abonnés.',
    onDemandNote: 'Audit livré en 10 jours ouvrés, avec session de restitution d\'une heure.',
  },
  principle:
    'Plus nous avons de données sur votre parc, plus l\'audit est précis. C\'est pourquoi il est inclus dans l\'abonnement : chaque mois passé sur Pièces affine la recommandation suivante.',
}

export const LOGISTIQUE_STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Vous décrivez la pièce',
    body: 'Nom, référence OEM si vous l\'avez, photo, et le véhicule : VIN, carte grise ou saisie manuelle. Deux minutes, sans compte.',
  },
  {
    title: 'Estimation immédiate',
    body: 'Le moteur compare aussitôt les options d\'acheminement avec le coût d\'immobilisation de votre véhicule. Estimation de cadrage, ± 20 %.',
  },
  {
    title: 'Devis confirmé',
    body: 'Nous vérifions le poids réel auprès du fournisseur et confirmons les tarifs. Vous recevez les options fermes par WhatsApp, généralement sous deux heures ouvrées.',
  },
  {
    title: 'Acheminement et suivi',
    body: 'Vous choisissez une ligne du tableau. Le suivi passe par les mêmes étapes : sourcing, enlèvement, transit, douane, livraison.',
  },
]

export const TRANSPORT_STAGES: Array<{ key: string; label: string; body: string }> = [
  { key: 'SOURCING', label: 'Sourcing', body: 'Fournisseur identifié, référence confirmée.' },
  { key: 'COLLECTED', label: 'Enlevée', body: 'Pièce récupérée chez le fournisseur.' },
  { key: 'IN_TRANSIT', label: 'En transit', body: 'En route vers Abidjan.' },
  { key: 'CUSTOMS', label: 'Douane', body: 'Formalités douanières ivoiriennes en cours.' },
  { key: 'LOCAL_DELIVERY', label: 'Livraison locale', body: 'Dédouanée, en cours de livraison.' },
  { key: 'DELIVERED', label: 'Livrée', body: 'Remise au garage ou au centre de maintenance.' },
]

export const CONFIDENCE_LEVELS: Array<{
  key: LogisticsConfidence
  label: string
  body: string
  chip: ChipVariant
}> = [
  {
    key: 'MEASURED',
    label: 'Mesuré',
    body: 'Le poids et le volume viennent d\'un envoi réel de cette pièce. L\'estimation est serrée.',
    chip: 'status-ok',
  },
  {
    key: 'CATALOG',
    label: 'Fiche fournisseur',
    body: 'Poids et volume repris de la fiche technique du fournisseur.',
    chip: 'oem',
  },
  {
    key: 'FAMILY',
    label: 'Fourchette de famille',
    body: 'Estimation par famille de pièces. C\'est le cas par défaut : ± 20 % annoncé.',
    chip: 'plain',
  },
]

export const VEHICLE_CATEGORY_COPY: Record<
  VehicleEconomyCategory,
  { label: string; examples: string; downtimeLabel: string }
> = {
  ECONOMY_ICE: {
    label: 'Économique thermique',
    examples: 'Suzuki Alto, Toyota Starlet, Kia Picanto',
    downtimeLabel: 'Recette nette perdue par jour d\'arrêt',
  },
  PREMIUM_ICE: {
    label: 'Premium thermique',
    examples: 'Bestune B70 / T55, berlines et SUV de flotte',
    downtimeLabel: 'Recette nette perdue par jour d\'arrêt',
  },
  PREMIUM_EV: {
    label: 'Premium électrique',
    examples: 'Bestune NAT, E03 et assimilés',
    downtimeLabel: 'Recette nette perdue par jour d\'arrêt',
  },
}

export const LOGISTIQUE_FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Faut-il un compte pour demander une cotation ?',
    a: 'Non. Un nom, un numéro de téléphone et la description de la pièce suffisent. Si vous avez déjà un compte Pièces, connectez-vous : votre véhicule et vos coordonnées sont repris automatiquement, et vous retrouvez toutes vos cotations au même endroit.',
  },
  {
    q: 'Pourquoi me demandez-vous le VIN ou la carte grise ?',
    a: 'Deux véhicules du même modèle et de la même année peuvent porter des pièces différentes selon la finition ou le millésime. Le VIN verrouille la variante exacte, donc la référence constructeur. Sans lui, nous savons coter le transport mais pas garantir que la pièce ira sur votre véhicule.',
  },
  {
    q: 'La cotation est-elle payante ?',
    a: 'Non. L\'estimation est immédiate et gratuite, le devis confirmé aussi. Vous ne payez que si vous choisissez une option.',
  },
  {
    q: 'Que couvre le montant affiché ?',
    a: 'Le prix de la pièce quand vous nous l\'indiquez, le fret, les droits de douane, la livraison à Abidjan, et le revenu perdu pendant l\'immobilisation du véhicule. Chaque poste est détaillé : nous n\'agrégeons jamais un coût sans le montrer.',
  },
  {
    q: 'Qui porte les droits de douane ?',
    a: 'Ils sont intégrés à l\'estimation au taux courant applicable aux pièces détachées et refacturés au réel. La douane ivoirienne étant un poste volatil, tout écart constaté est justifié pièce à l\'appui.',
  },
  {
    q: 'Certaines pièces sont-elles interdites en avion ?',
    a: 'Les batteries, les airbags et les amortisseurs à gaz sont restreints ou surtaxés en fret aérien. Le moteur d\'estimation vous le signale directement sur la ligne concernée, et nous confirmons famille par famille avant le devis.',
  },
  {
    q: 'Pourquoi le maritime apparaît-il presque toujours comme le plus coûteux ?',
    a: 'Parce qu\'il immobilise le véhicule 45 jours. À 30 000 F par jour, cela représente 1 350 000 F de recette perdue, et aucune économie de fret ne compense. Le maritime n\'a de sens qu\'en anticipé, c\'est-à-dire avant la panne.',
  },
  {
    q: 'Livrez-vous en dehors d\'Abidjan ?',
    a: 'La livraison finale est organisée depuis Abidjan. Pour l\'intérieur du pays, indiquez-le dans votre demande : nous chiffrons l\'acheminement complémentaire dans le devis.',
  },
]

// ---------------------------------------------------------------------------
// Calculateur d'immobilisation
// ---------------------------------------------------------------------------

export const CALCULATEUR_COPY = {
  eyebrow: 'Calculateur',
  title: 'Combien vous coûte un véhicule à l\'arrêt ?',
  lead: 'Le chiffre que personne ne met dans la balance au moment d\'arbitrer entre « attendre » et « payer plus vite ». Ajustez les paramètres à votre exploitation.',
  assumption:
    'Les recettes nettes par défaut viennent d\'une flotte VTC d\'Abidjan (bornes basses retenues). Remplacez-les par les vôtres : le résultat n\'a de valeur que si le paramètre est le vôtre.',
  cta: 'Chiffrer ma pièce',
}

// ---------------------------------------------------------------------------
// Formulaire de cotation
// ---------------------------------------------------------------------------

export const LEAD_FORM_COPY = {
  steps: [
    {
      title: 'La pièce',
      help: 'Le nom suffit pour démarrer. Tout le reste améliore la précision du devis.',
    },
    {
      title: 'Le véhicule',
      help: 'Le VIN ou la carte grise nous permettent de confirmer la référence exacte.',
    },
    {
      title: 'Vous',
      help: 'Nous revenons vers vous par WhatsApp, généralement sous deux heures ouvrées.',
    },
  ],
  indicativeBanner:
    'Sans VIN ni carte grise, cette estimation reste indicative : nous ne pouvons pas confirmer la référence exacte de la pièce pour votre véhicule.',
  vinNotDecoded:
    'VIN enregistré. Il n\'est pas reconnu par la base publique d\'immatriculation. C\'est fréquent pour les marques chinoises et les imports japonais, et cela ne pose aucun problème : notre équipe le décode auprès du constructeur.',
  estimateTitleWithPrice: 'Coût total estimé',
  // Le coût d'immobilisation ne fait pas partie de l'estimation publique : il
  // n'a de sens que pour une flotte, et il est traité sur /logistique/flottes-vtc.
  estimateTitleWithoutPrice: 'Coût d\'acheminement estimé',
  estimateNoteWithoutPrice:
    'Hors prix de la pièce, hors droits de douane sur sa valeur et hors frais d\'envoi Pièces (10 % du prix). Indiquez un prix estimé pour obtenir le coût complet.',
  estimateFootnote:
    'Estimation de cadrage, ± 20 %. Les frais d\'envoi Pièces (10 % du prix de la pièce) couvrent la recherche du fournisseur, le dédouanement et la remise à Abidjan. Un devis confirmé précède toute commande.',
  downtimeAssumption:
    'Hypothèse : véhicule premium thermique, 30 000 F de recette perdue par jour. Précisez la motorisation pour affiner.',
  fleetDowntimeTeaser:
    'Vous gérez une flotte ? Un véhicule à l’arrêt coûte chaque jour, et cela change l’option la plus rentable.',
  fleetDowntimeCta: 'Voir l’arbitrage au coût total réel',
  consent:
    'J\'accepte que Pièces utilise ces informations pour établir ma cotation et me recontacter.',
  submit: 'Envoyer ma demande',
  submitting: 'Envoi…',
  photoRetry: 'Photo non envoyée. Réessayer',
}

/**
 * Segments de demandeurs. Les cibles de la vitrine (flottes VTC, flottes
 * d'entreprise, mines & BTP, particuliers) sont en tête, mais la liste reste
 * ouverte : le service logistique s'adresse à tout le monde.
 */
export const CUSTOMER_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'FLEET_VTC', label: 'Flotte VTC' },
  { value: 'FLEET_COMPANY', label: 'Flotte d\'entreprise' },
  { value: 'MINING_BTP', label: 'Mines & BTP' },
  { value: 'INDIVIDUAL', label: 'Particulier (dont chauffeur VTC)' },
  { value: 'GARAGE', label: 'Garage / atelier' },
  { value: 'DEALER', label: 'Concessionnaire' },
  { value: 'IMPORTER', label: 'Importateur / revendeur' },
  { value: 'OTHER', label: 'Autre' },
]

/** Segments pour lesquels la taille du parc est une question pertinente. */
export const FLEET_CUSTOMER_TYPES = ['FLEET_VTC', 'FLEET_COMPANY', 'MINING_BTP']

export const customerTypeLabel = (value: string) =>
  CUSTOMER_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value

/**
 * Valide un segment reçu par l'URL (`/logistique/devis?profil=GARAGE`). Un
 * paramètre inconnu est ignoré plutôt que propagé : le wizard enverrait sinon
 * une valeur refusée par l'enum côté API.
 */
export const isCustomerType = (value: string | null | undefined): boolean =>
  !!value && CUSTOMER_TYPE_OPTIONS.some((o) => o.value === value)

export const MERCI_COPY = {
  title: 'Demande enregistrée.',
  lead: 'Conservez cette référence : elle vous permet de suivre votre cotation.',
  next: [
    'Notre équipe vérifie le poids réel de la pièce auprès du fournisseur.',
    'Vous recevez les options fermes par WhatsApp, généralement sous deux heures ouvrées.',
    'Vous choisissez une ligne du tableau, rien n\'est engagé avant votre accord.',
  ],
}
