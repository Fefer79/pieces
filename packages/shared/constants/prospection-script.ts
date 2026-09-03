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
  'PRIX',
  'CATALOGUE',
  'LOGISTIQUE',
  'GARANTIE',
  'OBJECTIONS',
  'CLOTURE',
] as const

export type ProspectionThemeKey = (typeof PROSPECTION_THEMES)[number]

export const PROSPECTION_THEME_LABELS: Record<ProspectionThemeKey, string> = {
  ACCROCHE: 'Accroche & présentation',
  ACTIVITE: 'Activité & stock',
  GAMME: 'Gamme & marques',
  PRIX: 'Prix & marge',
  CATALOGUE: 'Catalogue & photos',
  LOGISTIQUE: 'Livraison & zones',
  GARANTIE: 'Garanties & retours',
  OBJECTIONS: 'Objections fréquentes',
  CLOTURE: 'Engagement & suite',
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
      'Se présenter : « Pièces met en relation les mécaniciens et les propriétaires de véhicules avec des vendeurs de pièces à Abidjan. On vous amène des clients, vous ne payez que sur les ventes. »',
    hint: 'Vérifier que l’interlocuteur est bien le patron / décideur du stock.',
  },
  {
    id: 'accroche_interlocuteur',
    theme: 'ACCROCHE',
    label: 'À qui je parle ? Êtes-vous le propriétaire de la boutique ?',
    hint: 'Nom du décideur, rôle. Si employé : demander quand repasser voir le patron.',
  },
  {
    id: 'accroche_nom_boutique',
    theme: 'ACCROCHE',
    label: 'Quel est le nom de la boutique / du magasin ?',
    target: 'shopName',
  },
  // --- Activité & stock -------------------------------------------------
  {
    id: 'activite_anciennete',
    theme: 'ACTIVITE',
    label: 'Depuis combien de temps vendez-vous des pièces ici ?',
    hint: 'Ancienneté = fiabilité de l’approvisionnement.',
  },
  {
    id: 'activite_volume_stock',
    theme: 'ACTIVITE',
    label: 'Combien de références avez-vous en stock, à peu près ? Le magasin est plein ou vous commandez à la demande ?',
    hint: 'Ordre de grandeur : dizaines / centaines / milliers de références.',
    target: 'remarques',
  },
  {
    id: 'activite_rotation',
    theme: 'ACTIVITE',
    label: 'Vous vendez combien de pièces par jour en moyenne ?',
    hint: 'Sert à prioriser les vendeurs à fort volume.',
  },
  {
    id: 'activite_localisation',
    theme: 'ACTIVITE',
    label: 'Où est exactement la boutique ? Quel repère pour la trouver ?',
    hint: 'Commune + quartier + repère (carrefour, pharmacie, station).',
    target: 'address',
  },
  {
    id: 'activite_commune',
    theme: 'ACTIVITE',
    label: 'Dans quelle commune se trouve la boutique ?',
    target: 'commune',
  },
  // --- Gamme & marques -------------------------------------------------
  {
    id: 'gamme_familles',
    theme: 'GAMME',
    label: 'Vous êtes plutôt sur quelles familles de pièces ? (freinage, filtration, moteur, suspension, carrosserie, électricité…)',
    target: 'pieces',
  },
  {
    id: 'gamme_marques_vehicules',
    theme: 'GAMME',
    label: 'Vous couvrez quelles marques de véhicules en priorité ? (Toyota, Hyundai, Kia, Peugeot, Mercedes…)',
    target: 'piecesLibre',
  },
  {
    id: 'gamme_etat',
    theme: 'GAMME',
    label: 'Vos pièces sont neuves, d’occasion importée, ré-usinées, adaptables ? Dans quelles proportions ?',
    hint: 'Important pour le chip « état » sur les fiches. Demander la provenance (Dubaï, Europe, casse locale).',
  },
  {
    id: 'gamme_origine',
    theme: 'GAMME',
    label: 'Vous vous approvisionnez où ? (import direct, grossiste local, casse…)',
  },
  // --- Prix & marge --------------------------------------------------
  {
    id: 'prix_niveau',
    theme: 'PRIX',
    label: 'Sur une pièce courante (ex. plaquettes de frein Corolla), vous vendez à combien aujourd’hui ?',
    hint: 'Récupérer 2–3 prix concrets pour situer le vendeur vs le marché.',
  },
  {
    id: 'prix_negociation',
    theme: 'PRIX',
    label: 'Vos prix sont fixes ou négociables ? Vous faites des remises aux garages ?',
  },
  {
    id: 'prix_commission',
    theme: 'PRIX',
    label: 'Expliquer la commission Pièces sur chaque vente et vérifier que le principe est compris et accepté.',
    hint: 'Pas de frais d’inscription, pas d’abonnement : on prélève seulement quand ça vend.',
  },
  // --- Catalogue & photos -----------------------------------------
  {
    id: 'catalogue_photos',
    theme: 'CATALOGUE',
    label: 'Vous avez déjà des photos de vos pièces ? Un cahier / un fichier des références ?',
    hint: 'Proposer la fiche express par photo pour démarrer le catalogue tout de suite.',
  },
  {
    id: 'catalogue_smartphone',
    theme: 'CATALOGUE',
    label: 'Vous avez un smartphone Android ? Qui s’en occuperait pour mettre les pièces en ligne ?',
    hint: 'Identifier la personne qui tiendra le catalogue (patron, fils, vendeur).',
  },
  {
    id: 'catalogue_demarrage',
    theme: 'CATALOGUE',
    label: 'On commence par combien de pièces ? Lesquelles sont vos meilleures ventes à mettre en avant ?',
    target: 'remarques',
  },
  // --- Livraison & zones -----------------------------------------
  {
    id: 'logistique_livraison',
    theme: 'LOGISTIQUE',
    label: 'Aujourd’hui, comment le client récupère la pièce ? Vous livrez, ou il vient chercher ?',
  },
  {
    id: 'logistique_zones',
    theme: 'LOGISTIQUE',
    label: 'Vous livrez dans quelles communes ? Vous avez un livreur / un taxi habituel ?',
    target: 'piecesLibre',
  },
  {
    id: 'logistique_delai',
    theme: 'LOGISTIQUE',
    label: 'Quand une pièce n’est pas en stock, vous la trouvez en combien de temps ?',
  },
  // --- Garanties & retours -------------------------------------
  {
    id: 'garantie_politique',
    theme: 'GARANTIE',
    label: 'Vous donnez une garantie sur les pièces ? Combien de temps ? Sur quel type de pièces ?',
    hint: 'Neuf vs occasion : la garantie diffère. Noter la durée annoncée.',
  },
  {
    id: 'garantie_retours',
    theme: 'GARANTIE',
    label: 'Si une pièce ne va pas, vous reprenez / échangez ? Sous quelles conditions ?',
  },
  // --- Objections ---------------------------------------------
  {
    id: 'objection_principale',
    theme: 'OBJECTIONS',
    label: 'Quelle est sa principale réticence ? (commission, temps à passer, concurrence entre vendeurs, confiance dans le paiement…)',
    hint: 'Noter l’objection telle qu’elle est formulée, pour préparer la relance.',
    target: 'remarques',
  },
  {
    id: 'objection_reponse',
    theme: 'OBJECTIONS',
    label: 'Reformuler l’objection et y répondre. Est-ce que la réponse le rassure ?',
  },
  // --- Clôture ----------------------------------------------
  {
    id: 'cloture_decision',
    theme: 'CLOTURE',
    label: 'Où en est-on ? Il est partant pour essayer, il veut réfléchir, c’est non ?',
    hint: 'Traduire en statut : Conclu / À relancer / À revoir / Rejeté.',
  },
  {
    id: 'cloture_prochaine_etape',
    theme: 'CLOTURE',
    label: 'Prochaine étape concrète : signature du contrat d’adhésion, RDV pour les photos, rappel à une date ?',
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
