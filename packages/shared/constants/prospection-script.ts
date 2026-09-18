// La « bible du démarcheur vendeur » — trame d'entretien utilisée par le
// commercial / la liaison quand il ou elle démarche un vendeur de pièces sur le
// terrain (Adjamé, la casse, M'batto…).
//
// Ce fichier est du code pur (aucun import Prisma / Fastify / React) : il sert à
//   - afficher le téléprompteur des questions dans l'app liaison,
//   - donner à Gemini la liste des questions pour extraire les réponses d'une
//     transcription d'entretien,
//   - mapper une réponse sur un champ du prospect (`target`) lors de l'étape
//     « exploiter l'entretien ».
//
// ⚠ L'entretien n'est enregistré / transcrit qu'APRÈS consentement explicite du
//    vendeur. `PROSPECTION_CONSENT_SCRIPT` est la phrase que le démarcheur lit à
//    voix haute ; elle est gelée avec l'horodatage dans `ProspectionInterview`.

/** Thèmes de la trame, dans l'ordre où on les déroule en entretien. */
export const PROSPECTION_THEMES = [
  'ACCROCHE',
  'ACTIVITE',
  'GAMME',
  'CATALOGUE',
  'LOGISTIQUE',
  'PRIX',
  'GARANTIE',
  'OBJECTIONS',
  'CLOTURE',
] as const

export type ProspectionThemeKey = (typeof PROSPECTION_THEMES)[number]

export const PROSPECTION_THEME_LABELS: Record<ProspectionThemeKey, string> = {
  ACCROCHE: 'Accroche & interlocuteur',
  ACTIVITE: 'Bloc 1 — Le stock, et ce qui dort',
  GAMME: 'Bloc 2 — Marques & références',
  CATALOGUE: 'Bloc 3 — Suivi du stock & vente en ligne',
  LOGISTIQUE: 'Bloc 4 — Livraison',
  PRIX: 'Bloc 5 — Prix, paiement & crédit',
  GARANTIE: 'Garanties & retours',
  OBJECTIONS: 'Objections fréquentes',
  CLOTURE: 'Reformulation & engagement',
}

/**
 * Cibles possibles d'une réponse — champs du `VendorContact` (prospect CRM) que
 * l'étape « exploiter l'entretien » peut pré-remplir. `null` = question de
 * cadrage sans report automatique.
 */
export type ProspectionAnswerTarget =
  | 'shopName'
  | 'commune'
  | 'address'
  | 'pieces'
  | 'piecesLibre'
  | 'remarques'
  | 'notesAppel'
  | null

export interface ProspectionQuestion {
  /** Identifiant stable — clé dans `ProspectionInterview.answers`. Ne pas renommer. */
  id: string
  theme: ProspectionThemeKey
  /** Formulation lue / affichée au démarcheur. */
  label: string
  /** Aide-mémoire : ce qu'on cherche à obtenir, relances possibles. */
  hint?: string
  target?: ProspectionAnswerTarget
}

export const PROSPECTION_SCRIPT: readonly ProspectionQuestion[] = [
  // --- Accroche -----------------------------------------------------------
  {
    id: 'accroche_pitch',
    theme: 'ACCROCHE',
    label:
      '« Bonjour Monsieur / Madame. Je suis [prénom], de Pièces — pieces.ci. Nous sommes une plateforme qui met en relation les vendeurs de pièces et les acheteurs : entreprises, flottes, professionnels et particuliers. Nous sommes le Jumia des pièces détachées. »',
    hint: 'Puis on s’arrête et on laisse la phrase tomber — c’est lui qui relance. Debout, sans sortir le téléphone, sans rien tendre. On donne son prénom, pas une fonction, et on ne demande jamais « je peux vous prendre cinq minutes ? ». S’il demande « ça marche déjà ? » : « Pas encore — nous ne sommes pas en activité, nous recensons d’abord les vendeurs professionnels. Ceux qui seront présents au lancement auront un nouveau canal de distribution pour vendre plus. »',
  },
  {
    id: 'accroche_interlocuteur',
    theme: 'ACCROCHE',
    label: '« À qui je parle ? » puis « C’est vous le propriétaire du magasin ? »',
    hint: 'La question qui décide de la suite. Patron absent → on ne présente pas, on repart avec son nom et son heure de présence. Gérant / fils / caissier → découverte oui, closing non.',
  },
  {
    id: 'accroche_bascule',
    theme: 'ACCROCHE',
    label:
      '« Avant de vous expliquer comment ça marche, j’aimerais d’abord comprendre comment vous travaillez, pour vous dire ce qui vous sert vraiment. Vous permettez ? »',
    hint: 'On bascule en découverte AVANT d’argumenter. Et on n’interroge jamais un commerçant sur sa clientèle : ni ancienneté, ni qui sont ses clients, ni combien il en sert par jour. Il le dira de lui-même en parlant de son stock.',
  },
  {
    id: 'accroche_nom_boutique',
    theme: 'ACCROCHE',
    label: 'Noter l’enseigne du magasin — telle qu’elle est sur la devanture, sans la demander si elle est visible.',
    target: 'shopName',
  },
  {
    id: 'activite_localisation',
    theme: 'ACCROCHE',
    label: 'Noter l’adresse et le repère pour retrouver la boutique (carrefour, pharmacie, station).',
    target: 'address',
  },
  {
    id: 'activite_commune',
    theme: 'ACCROCHE',
    label: 'Noter la commune.',
    target: 'commune',
  },
  // --- Bloc 1 : le stock -------------------------------------------------
  // Transition : « Parlons de votre stock. »
  {
    id: 'activite_volume_stock',
    theme: 'ACTIVITE',
    label: '« Vous avez combien de références disponibles ? Et elles portent les références du constructeur ? »',
    hint: 'Deux réponses en une : le volume classe la fiche, les références constructeur conditionnent la qualité des annonces et la recherche par compatibilité.',
    target: 'remarques',
  },
  {
    id: 'activite_reserve',
    theme: 'ACTIVITE',
    label: '« Tout est ici, ou vous avez une réserve ailleurs ? »',
    hint: 'Un entrepôt séparé = grossiste réel, priorité haute.',
    target: 'remarques',
  },
  {
    id: 'gamme_etat',
    theme: 'ACTIVITE',
    label: '« Vous vendez du neuf, de l’occasion importée, du ré-usiné ? Les trois ? »',
    hint: 'Détermine la condition affichée sur les annonces — c’est la première chose que l’acheteur regarde.',
  },
  {
    id: 'gamme_familles',
    theme: 'ACTIVITE',
    label:
      '« Vous êtes fort sur quoi ? Le freinage, le moteur, la filtration, la suspension, l’électricité, la carrosserie ? »',
    hint: 'Sa spécialité est son argument de vente en ligne.',
    target: 'pieces',
  },
  {
    id: 'activite_stock_dormant',
    theme: 'ACTIVITE',
    label: '« Et qu’est-ce qui dort dans vos rayons depuis six mois ? »',
    hint: 'La question la plus rentable de l’entretien : on la pose lentement et on laisse le silence. S’il répond, il nomme lui-même le problème qu’on résout. S’il élude, on y revient en fin d’entretien.',
    target: 'remarques',
  },
  {
    id: 'activite_ventes_refusees',
    theme: 'ACTIVITE',
    label: '« Ça vous arrive de refuser une vente parce que vous n’avez pas la pièce ? »',
    hint: 'Ouvre le sujet de la mise en relation entre vendeurs.',
  },
  // --- Bloc 2 : marques & références -------------------------------------
  // Transition : « Vous couvrez quelles marques ? »
  {
    id: 'gamme_marques_vehicules',
    theme: 'GAMME',
    label: '« Vous couvrez quelles marques de véhicules ? »',
    hint: 'Largeur de gamme ; les coréennes et les chinoises sont les segments qui montent.',
    target: 'piecesLibre',
  },
  {
    id: 'gamme_origine_adaptable',
    theme: 'GAMME',
    label: '« Vous vendez de l’origine, de l’adaptable, ou les deux ? »',
    hint: 'Un vendeur qui assume l’adaptable est un vendeur honnête : c’est bon signe.',
  },
  {
    id: 'gamme_demande_client',
    theme: 'GAMME',
    label: '« Quand un client vient, il vous dit quoi ? Il apporte la pièce, la carte grise, une photo ? »',
    hint: 'Il décrit le vrai parcours d’achat — celui qu’on reproduit en ligne.',
  },
  // --- Bloc 3 : suivi du stock & vente en ligne --------------------------
  // Transition : « Et pour suivre tout ce stock, vous faites comment ? »
  {
    id: 'suivi_gestion_stock',
    theme: 'CATALOGUE',
    label: '« Vous suivez ça dans un cahier, sur un ordinateur, ou c’est de tête ? »',
    hint: 'Détermine l’effort de saisie initial — et qui doit le porter.',
  },
  {
    id: 'catalogue_smartphone',
    theme: 'CATALOGUE',
    label: '« Et ici, qui connaît le stock par cœur ? »',
    hint: 'Identifie l’employé désigné qui prendra le relais de l’agent Liaison pour publier les arrivages. On note son nom et son numéro dès maintenant.',
    target: 'remarques',
  },
  {
    id: 'suivi_vente_en_ligne',
    theme: 'CATALOGUE',
    label: '« Est-ce que vous vendez déjà en ligne — Facebook, WhatsApp Business ? Et comment ça se passe ? »',
    hint: 'On demande au présent, sans supposer un échec. Un vendeur déjà actif comprend la proposition en deux minutes ; un vendeur déçu formule une objection qu’on traite tout de suite plutôt qu’au closing.',
  },
  // --- Bloc 4 : livraison ------------------------------------------------
  // Transition : « Quand un client commande, c’est vous qui livrez ou il vient chercher ? »
  {
    id: 'logistique_livraison',
    theme: 'LOGISTIQUE',
    label: '« Vous livrez, ou le client vient toujours chercher ? »',
    hint: 'S’il livre déjà, il connaît le coût réel et la contrainte.',
  },
  {
    id: 'logistique_zones',
    theme: 'LOGISTIQUE',
    label: '« Vous allez jusqu’où dans Abidjan ? »',
    hint: 'Alimente les zones de livraison de sa fiche vendeur.',
    target: 'piecesLibre',
  },
  {
    id: 'logistique_hors_abidjan',
    theme: 'LOGISTIQUE',
    label: '« Est-ce que vous livrez en dehors d’Abidjan ? Et si oui, comment ? »',
    hint: 'Un vendeur qui expédie déjà sur Bouaké ou San Pedro a une solution de transport réutilisable — et une clientèle hors zone que la plateforme élargit.',
    target: 'remarques',
  },
  {
    id: 'logistique_casse',
    theme: 'LOGISTIQUE',
    label: '« Et une pièce cassée ou perdue en route, ça vous est déjà arrivé ? »',
    hint: 'Prépare le sujet de la reprise et de la garantie.',
  },
  // --- Bloc 5 : prix, paiement & crédit ----------------------------------
  // Transition : « Dernière chose, et après je vous explique ce qu’on fait. »
  {
    id: 'prix_negociation',
    theme: 'PRIX',
    label: '« Vos prix sont fixes, ou vous négociez au cas par cas ? »',
    hint: 'Détermine si le prix affiché en ligne sera tenable.',
  },
  {
    id: 'prix_paiement',
    theme: 'PRIX',
    label: '« Vous prenez le mobile money, ou seulement le cash ? »',
    hint: 'Par quel canal on lui transmettra son argent après l’encaissement.',
  },
  {
    id: 'prix_credit',
    theme: 'PRIX',
    label: '« Vous faites crédit à certains mécaniciens ? … Et ils vous paient à temps ? »',
    hint: 'Le point de douleur le plus exploitable de tout l’entretien. On laisse le silence après la seconde question.',
    target: 'remarques',
  },
  {
    id: 'prix_commission',
    theme: 'PRIX',
    label: 'Commission : c’est le vendeur qui la fixe, pièce par pièce. On ne suggère aucun taux, ni ici ni sur le terrain. Noter un chiffre uniquement s’il l’avance lui-même.',
    hint: 'Ce qu’on explique : pas de frais d’inscription, pas d’abonnement — on est payé seulement quand ça vend.',
    target: 'remarques',
  },
  // --- Garanties & retours ----------------------------------------------
  {
    id: 'garantie_politique',
    theme: 'GARANTIE',
    label: '« Quelles sont les garanties que vous donnez sur vos pièces ? »',
    hint: 'Sa pratique réelle, avant qu’on lui parle des nôtres. C’est ce qu’on reprendra pièce par pièce à la publication.',
  },
  {
    id: 'garantie_retours',
    theme: 'GARANTIE',
    label: '« Et quand une pièce vendue revient, ça se passe comment chez vous ? »',
    hint: 'Prépare la conversation sur le socle de reprise et sur la garantie qu’il choisira d’accorder.',
  },
  // --- Objections --------------------------------------------------------
  {
    id: 'objection_principale',
    theme: 'OBJECTIONS',
    label: 'Noter l’objection telle qu’elle est formulée, dans ses mots.',
    hint: 'Commission, temps à passer, concurrence entre vendeurs, confiance dans le paiement, « j’ai déjà essayé Facebook »… C’est ce qui fait progresser la trame.',
    target: 'remarques',
  },
  {
    id: 'objection_reponse',
    theme: 'OBJECTIONS',
    label: 'Reformuler l’objection et y répondre. Est-ce que la réponse le rassure ?',
  },
  // --- Reformulation & engagement ---------------------------------------
  {
    id: 'cloture_reformulation',
    theme: 'CLOTURE',
    label:
      '« Si je résume : vous êtes fort sur [sa famille de pièces], et vous avez [son stock dormant] qui ne bouge pas. Et sur le crédit, vous m’avez dit que [ce qu’il a dit]. C’est bien ça ? »',
    hint: 'On ne passe jamais à l’offre sans rendre au commerçant ce qu’il vient de dire. C’est à ce « oui, c’est ça » qu’on enchaîne sur UNE accroche d’argumentaire, jamais deux.',
  },
  {
    id: 'cloture_decision',
    theme: 'CLOTURE',
    label: 'Où en est-on ? Il est partant pour essayer, il veut réfléchir, c’est non ?',
    hint: 'Traduire en statut : Conclu / À relancer / À revoir / Rejeté.',
  },
  {
    id: 'catalogue_demarrage',
    theme: 'CLOTURE',
    label:
      '« On recense TOUT votre stock : j’envoie un agent, il photographie et décrit rayon par rayon, et le jour de l’ouverture c’est votre magasin entier qui est en ligne. On le fait jeudi ou vendredi ? »',
    hint: 'L’objectif par défaut est le stock entier, jamais un échantillon : l’agent passe une fois, ce qu’il n’a pas photographié n’existera pas au lancement. Noter le niveau obtenu : contrat signé + recensement complet / mandat de recensement complet / premier lot seulement (repli, à ne proposer que s’il refuse d’ouvrir tout le stock) / nouveau rendez-vous / refus.',
    target: 'remarques',
  },
  {
    id: 'cloture_prochaine_etape',
    theme: 'CLOTURE',
    label: 'Prochaine étape concrète et sa date : signature du contrat, RDV photos, rappel ?',
    hint: 'Une action, une date. Sans date, ce n’est pas une action.',
    target: 'notesAppel',
  },
  {
    id: 'cloture_contact',
    theme: 'CLOTURE',
    label: 'Confirmer le numéro WhatsApp sur lequel envoyer le contrat et le lien.',
  },
]

/** Regroupe la trame par thème, dans l'ordre de `PROSPECTION_THEMES`. */
export function prospectionQuestionsByTheme(): Array<{
  theme: ProspectionThemeKey
  label: string
  questions: ProspectionQuestion[]
}> {
  return PROSPECTION_THEMES.map((theme) => ({
    theme,
    label: PROSPECTION_THEME_LABELS[theme],
    questions: PROSPECTION_SCRIPT.filter((q) => q.theme === theme),
  }))
}

export function prospectionQuestion(id: string): ProspectionQuestion | undefined {
  return PROSPECTION_SCRIPT.find((q) => q.id === id)
}

// --- Consentement --------------------------------------------------------

export const PROSPECTION_CONSENT_METHODS = ['VERBAL', 'ECRIT'] as const
export type ProspectionConsentMethodKey = (typeof PROSPECTION_CONSENT_METHODS)[number]

export const PROSPECTION_CONSENT_METHOD_LABELS: Record<ProspectionConsentMethodKey, string> = {
  VERBAL: 'Accord verbal (lu à voix haute, vendeur d’accord)',
  ECRIT: 'Accord écrit (signature / message du vendeur)',
}

/**
 * Phrase lue à voix haute au vendeur avant tout enregistrement. Elle est gelée
 * (copiée telle quelle) dans l'entretien avec l'horodatage du consentement.
 */
export const PROSPECTION_CONSENT_SCRIPT =
  'Pour la qualité de notre suivi, j’aimerais enregistrer et faire transcrire notre échange. ' +
  'L’enregistrement reste interne à Pièces, sert à préparer votre inscription et vous pouvez ' +
  'demander sa suppression à tout moment. Êtes-vous d’accord ?'

export const PROSPECTION_CONSENT_CHECKBOX_LABEL =
  'J’ai lu cette phrase au vendeur et il a donné son accord pour être enregistré et transcrit.'

// --- Statuts d'entretien ----------------------------------------------

export const PROSPECTION_INTERVIEW_STATUSES = [
  'BROUILLON',
  'EN_COURS',
  'A_TRANSCRIRE',
  'TRANSCRIT',
  'EXPLOITE',
  'ANNULE',
] as const

export type ProspectionInterviewStatusKey = (typeof PROSPECTION_INTERVIEW_STATUSES)[number]

export const PROSPECTION_INTERVIEW_STATUS_LABELS: Record<ProspectionInterviewStatusKey, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  A_TRANSCRIRE: 'À transcrire',
  TRANSCRIT: 'Transcrit',
  EXPLOITE: 'Exploité',
  ANNULE: 'Annulé',
}

export type ProspectionAnswerSource = 'MANUEL' | 'TRANSCRIPTION' | 'IA'

export interface ProspectionAnswerValue {
  text: string
  source: ProspectionAnswerSource
}
