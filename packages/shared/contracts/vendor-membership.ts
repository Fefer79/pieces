import { MIN_COMMISSION_FCFA, MIN_COMMISSION_RATE } from '../validators/catalog.js'

/**
 * Source de vérité unique du contrat d'adhésion vendeur (CGU).
 * Consommé par la page d'acceptation web ET le générateur de PDF API,
 * pour garantir que le vendeur signe exactement le texte qu'il lit.
 *
 * Toute modification de fond DOIT incrémenter VENDOR_CONTRACT_VERSION :
 * la version est figée sur chaque acceptation (preuve de consentement).
 */
export const VENDOR_CONTRACT_VERSION = '1.0'

/** Date d'entrée en vigueur de la présente version (affichée et figée). */
export const VENDOR_CONTRACT_EFFECTIVE_DATE = '2026-06-08'

const commissionPct = `${(MIN_COMMISSION_RATE * 100).toLocaleString('fr-FR')} %`
const commissionFloor = `${MIN_COMMISSION_FCFA.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')} FCFA`

export interface ContractArticle {
  /** Numéro d'article (1-indexé). */
  number: number
  title: string
  /** Paragraphes de prose. */
  paragraphs: string[]
  /** Puces optionnelles affichées sous les paragraphes. */
  bullets?: string[]
}

export interface VendorContract {
  title: string
  /** Sous-titre / accroche affiché sous le titre. */
  subtitle: string
  /** Identité de l'éditeur de la plateforme. */
  editor: {
    name: string
    description: string
    contact: string
  }
  /** Préambule (paragraphes introductifs). */
  preamble: string[]
  articles: ContractArticle[]
  /** Mentions de clôture (droit applicable, etc.). */
  closing: string[]
}

export const VENDOR_CONTRACT: VendorContract = {
  title: 'Conditions générales d’adhésion vendeur',
  subtitle:
    'Contrat de commercialisation des pièces sur la marketplace Pièces — Côte d’Ivoire',
  editor: {
    name: 'Pièces',
    description:
      'Place de marché de pièces détachées automobiles opérant en Côte d’Ivoire (Abidjan).',
    contact: 'contact@pieces.ci',
  },
  preamble: [
    'Les présentes conditions générales d’adhésion (le « Contrat ») régissent la relation entre Pièces, exploitant de la marketplace pieces.ci (la « Plateforme »), et toute personne physique ou morale qui référence et commercialise des pièces détachées automobiles sur la Plateforme (le « Vendeur »).',
    'En signant électroniquement le présent Contrat, le Vendeur reconnaît avoir lu, compris et accepté l’intégralité de ses clauses. La signature électronique, l’horodatage et l’adresse IP collectés au moment de l’acceptation valent consentement et preuve de l’engagement du Vendeur.',
    'Le présent Contrat est non exclusif : le Vendeur reste libre de commercialiser ses pièces par tout autre canal.',
  ],
  articles: [
    {
      number: 1,
      title: 'Objet',
      paragraphs: [
        'Le Contrat a pour objet de définir les conditions dans lesquelles le Vendeur est autorisé à publier des annonces, recevoir des commandes et être réglé pour les pièces détachées qu’il commercialise via la Plateforme.',
        'Pièces agit en qualité d’intermédiaire technique de mise en relation et de tiers de confiance pour le paiement. Pièces n’est ni acheteur, ni revendeur des pièces : la vente est conclue directement entre le Vendeur et l’acheteur.',
      ],
    },
    {
      number: 2,
      title: 'Inscription et vérification d’identité (KYC)',
      paragraphs: [
        'L’adhésion est soumise à la vérification de l’identité du Vendeur. Le Vendeur s’engage à fournir des informations exactes et à jour.',
      ],
      bullets: [
        'Vendeur formel (entreprise) : numéro RCCM valide.',
        'Vendeur informel (particulier / artisan) : pièce d’identité nationale (CNI).',
        'Pièces se réserve le droit de suspendre tout compte dont les informations sont fausses, incomplètes ou frauduleuses.',
      ],
    },
    {
      number: 3,
      title: 'Annonces et obligation de transparence',
      paragraphs: [
        'Le Vendeur est seul responsable de l’exactitude de ses annonces : désignation, référence OEM, compatibilité véhicule, prix et photographies réelles de la pièce.',
        'L’état de chaque pièce doit être déclaré sans ambiguïté parmi les catégories de la Plateforme : Neuf, Occasion importée, Ré-usiné, Aftermarket ou OEM. Toute fausse déclaration de l’état engage la responsabilité du Vendeur et peut entraîner le remboursement de l’acheteur et la suspension du compte.',
        'Le Vendeur garantit qu’il détient les pièces qu’il met en vente, qu’elles sont licites et qu’elles ne proviennent ni de vol, ni de recel, ni de contrefaçon.',
      ],
    },
    {
      number: 4,
      title: 'Prix et commission de la Plateforme',
      paragraphs: [
        'Le Vendeur fixe librement le prix de vente de ses pièces, exprimé en FCFA.',
        `En contrepartie du service de mise en relation, d’encaissement sécurisé et de visibilité, Pièces perçoit une commission sur chaque pièce vendue via la Plateforme. Le montant de la commission est fixé par le Vendeur lors de la publication, sans pouvoir être inférieur au plancher de ${commissionPct} du prix de la pièce, avec un minimum de ${commissionFloor} par pièce.`,
        'La commission applicable est figée (« snapshot ») au moment de la création de la commande : une modification ultérieure du barème ou du prix n’affecte pas les commandes déjà passées.',
      ],
    },
    {
      number: 5,
      title: 'Paiement sécurisé (séquestre) et reversement',
      paragraphs: [
        'Les paiements des acheteurs sont encaissés par Pièces via son prestataire de paiement (CinetPay) et conservés sous séquestre (escrow) jusqu’à la confirmation de la bonne livraison de la pièce.',
        'Après confirmation de livraison et expiration du délai de retour, Pièces reverse au Vendeur le prix de vente diminué de la commission. Le reversement est effectué par les moyens de paiement convenus (mobile money ou virement).',
        'En cas de litige, de retour ou d’annulation, le reversement peut être suspendu jusqu’à résolution conformément aux articles 6 et 8.',
      ],
    },
    {
      number: 6,
      title: 'Garanties, retours et conformité',
      paragraphs: [
        'Le Vendeur s’engage à respecter les garanties standard de la Plateforme, présentées à l’acheteur au moment de l’achat :',
      ],
      bullets: [
        'Retour sous 48 heures si la pièce livrée ne correspond pas à l’annonce (référence, état ou compatibilité erronés).',
        'Garantie de bon fonctionnement de 30 jours pour les pièces vendues comme fonctionnelles, sauf mention contraire explicite dans l’annonce.',
        'En cas de non-conformité avérée, le Vendeur prend en charge le remboursement ou l’échange ; la commission correspondante n’est pas due.',
      ],
    },
    {
      number: 7,
      title: 'Livraison',
      paragraphs: [
        'Le Vendeur prépare la pièce dans les délais convenus et la remet au livreur mandaté ou l’expédie selon le mode choisi pour la commande. Le Vendeur s’engage à un emballage soigné préservant l’intégrité de la pièce.',
        'Les frais et délais de livraison annoncés au sein de la Plateforme sont présentés comme un avantage de service ; ils ne constituent pas un engagement contractuel de résultat opposable au Vendeur.',
      ],
    },
    {
      number: 8,
      title: 'Litiges entre Vendeur et acheteur',
      paragraphs: [
        'En cas de litige, Pièces met à disposition un mécanisme de médiation interne. Le Vendeur s’engage à répondre de bonne foi et dans un délai raisonnable aux demandes ouvertes.',
        'Pièces peut, à l’issue de l’instruction d’un litige, rembourser l’acheteur par prélèvement sur les sommes séquestrées ou à venir lorsque la responsabilité du Vendeur est établie.',
      ],
    },
    {
      number: 9,
      title: 'Obligations et bonne conduite du Vendeur',
      paragraphs: ['Le Vendeur s’engage à :'],
      bullets: [
        'respecter la réglementation ivoirienne applicable à son activité (commerciale, fiscale, douanière) ;',
        'honorer les commandes acceptées et maintenir à jour la disponibilité de son stock ;',
        'ne pas contourner la Plateforme pour échapper à la commission sur une mise en relation issue de Pièces ;',
        'traiter acheteurs, livreurs et équipe Pièces avec courtoisie.',
      ],
    },
    {
      number: 10,
      title: 'Protection des données personnelles',
      paragraphs: [
        'Les données collectées (identité, contact, coordonnées de paiement) sont traitées pour l’exécution du présent Contrat, conformément à la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel.',
        'Le Vendeur dispose d’un droit d’accès, de rectification et de suppression de ses données, exerçable auprès de Pièces. Pièces ne cède pas les données du Vendeur à des tiers à des fins commerciales.',
      ],
    },
    {
      number: 11,
      title: 'Durée, suspension et résiliation',
      paragraphs: [
        'Le Contrat est conclu pour une durée indéterminée à compter de son acceptation.',
        'Chaque partie peut y mettre fin à tout moment, sous réserve de l’exécution des commandes en cours et du règlement des sommes dues. Pièces peut suspendre ou résilier sans préavis le compte d’un Vendeur en cas de manquement grave (fraude, fausse déclaration d’état, contrefaçon, contournement répété).',
        'La résiliation n’affecte pas les obligations nées avant son entrée en effet, notamment les garanties dues aux acheteurs.',
      ],
    },
    {
      number: 12,
      title: 'Évolution des conditions',
      paragraphs: [
        'Pièces peut faire évoluer les présentes conditions. Toute nouvelle version est identifiée par un numéro de version. Le Vendeur en est informé et peut être invité à accepter à nouveau la version mise à jour pour continuer à vendre.',
      ],
    },
    {
      number: 13,
      title: 'Droit applicable et juridiction',
      paragraphs: [
        'Le présent Contrat est régi par le droit ivoirien. À défaut de résolution amiable, tout litige relatif à sa validité, son interprétation ou son exécution relève de la compétence des juridictions d’Abidjan.',
      ],
    },
  ],
  closing: [
    'Fait pour valoir ce que de droit. L’acceptation électronique du présent Contrat est horodatée et conservée par Pièces à titre de preuve.',
  ],
}
