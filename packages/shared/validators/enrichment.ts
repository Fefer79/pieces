import { z } from 'zod'

// ---------------------------------------------------------------------------
// Agent Fiche Terrain — schémas des sorties agent (passes 1 et 2, phase 2)
// et des requêtes API du module enrichment.
// ---------------------------------------------------------------------------

/** Champ extrait avec sa confiance (0–1). Un champ non lisible = valeur null, confiance 0. */
const champConfianceSchema = z.object({
  valeur: z.string().nullable(),
  confiance: z.number().min(0).max(1),
})

const referenceOemSchema = z.object({
  constructeur: z.string(),
  reference: z.string(),
  confiance: z.number().min(0).max(1),
})

const signalAuthenticiteSchema = z.object({
  signal: z.string(),
  photo: z.number().int().min(1).nullable().optional(),
})

/** Sortie de la passe 1 (vision seule) — voir spec §5. */
export const enrichmentPass1OutputSchema = z.object({
  statut: z.enum(['ok', 'photos_insuffisantes']),
  photo_feedback: z.string().nullable(),
  identification: z
    .object({
      marque_fabricant: champConfianceSchema,
      reference_fabricant: champConfianceSchema,
      references_oem: z.array(referenceOemSchema),
      ean: champConfianceSchema,
      pays_origine: champConfianceSchema,
      normes: z.array(z.string()),
      caracteristiques: z.record(z.string()),
    })
    .nullable(),
  classification: z
    .object({
      categorie: z.string(),
      sous_categorie: z.string().nullable(),
      confiance: z.number().min(0).max(1),
    })
    .nullable(),
  authenticite: z
    .object({
      score: z.number().int().min(1).max(10),
      signaux_positifs: z.array(signalAuthenticiteSchema),
      signaux_negatifs: z.array(signalAuthenticiteSchema),
      justification: z.string(),
      verification_recommandee: z.boolean(),
    })
    .nullable(),
  confiance_globale: z.number().min(0).max(1).nullable(),
})

export type EnrichmentPass1Output = z.infer<typeof enrichmentPass1OutputSchema>

const fitmentAgentSchema = z.object({
  marque: z.string(),
  modele: z.string(),
  annees: z.string().nullable(),
  motorisation: z.string().nullable(),
  confiance: z.number().min(0).max(1),
  sources: z.array(z.string()),
})

/** Sortie de la passe 2 (compatibilités, web search) — voir spec §4/§5. */
export const enrichmentPass2OutputSchema = z.object({
  statut: z.enum(['ok', 'compatibilites_introuvables']),
  fitments: z.array(fitmentAgentSchema),
})

export type EnrichmentPass2Output = z.infer<typeof enrichmentPass2OutputSchema>

/** Sortie de la phase 2 batch (sourcing, réservé administrateur) — voir spec §9. */
export const enrichmentSourcingOutputSchema = z.object({
  cross_references: z.array(
    z.object({
      type: z.enum(['aftermarket', 'oem_croisee']),
      marque: z.string(),
      reference: z.string(),
      source: z.string(),
      verifie_le: z.string(),
    }),
  ),
  fournisseurs: z.array(
    z.object({
      nom: z.string(),
      canal: z.string(),
      ville: z.string().nullable(),
      contact_public: z.string().nullable(),
      source: z.string(),
    }),
  ),
  contacts_producteur: z.array(
    z.object({
      marque: z.string(),
      entite: z.string(),
      role: z.string(),
      email: z.string().nullable(),
      telephone: z.string().nullable().optional(),
      url: z.string(),
    }),
  ),
})

export type EnrichmentSourcingOutput = z.infer<typeof enrichmentSourcingOutputSchema>

// ---------------------------------------------------------------------------
// Requêtes API
// ---------------------------------------------------------------------------

export const enrichmentParamsSchema = z.object({ id: z.string().min(1) })

/** Complétion humaine de la fiche brouillon : prix / stock / garantie déclarés
 * avec le vendeur, et corrections des champs proposés par l'agent. Chaque
 * correction est journalisée (jeu de données précision de l'agent). */
export const enrichmentCompleteSchema = z.object({
  prix: z.number().int().min(1).optional(),
  stockQuantite: z.number().int().min(0).max(99999).optional(),
  warrantyValue: z.number().int().min(0).max(365).optional(),
  warrantyUnit: z.enum(['DAY', 'WEEK', 'MONTH']).optional(),
  fournisseurVisite: z.string().max(160).optional(),
  vendeurId: z.string().optional(),
  corrections: z
    .object({
      marqueFabricant: z.string().max(80).optional(),
      referenceFabricant: z.string().max(80).optional(),
      referenceOem: z.string().max(80).optional(),
      categorie: z.string().max(120).optional(),
      sousCategorie: z.string().max(120).optional(),
      nom: z.string().max(120).optional(),
      fitments: z
        .array(
          z.object({
            marque: z.string().min(1).max(60),
            modele: z.string().max(80).nullable().optional(),
            annees: z.string().max(20).nullable().optional(),
            motorisation: z.string().max(60).nullable().optional(),
            confirme: z.boolean().default(true),
          }),
        )
        .max(50)
        .optional(),
    })
    .optional(),
})

/** Validation de contenu (Liaison) : la fiche est correcte, ou photos à refaire. */
export const enrichmentModerateSchema = z.object({
  action: z.enum(['VALIDER_CONTENU', 'DEMANDER_PHOTOS']),
  commentaire: z.string().max(500).optional(),
})

/** Arbitrage administrateur : badge « pièce garantie », inspection, blocage. */
export const enrichmentArbitrateSchema = z.object({
  decision: z.enum(['APPROUVER', 'INSPECTION', 'BLOQUER']),
  noteQualite: z.number().int().min(1).max(10).optional(),
  descriptionIndependante: z.string().max(2000).optional(),
  publierLivrables: z.boolean().default(false),
  commentaire: z.string().max(500).optional(),
})

export const enrichmentListQuerySchema = z.object({
  statut: z.enum(['BROUILLON', 'EN_MODERATION', 'A_VERIFIER', 'VALIDE', 'BLOQUE']).optional(),
  file: z.enum(['moderation', 'inspections']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type EnrichmentCompleteInput = z.infer<typeof enrichmentCompleteSchema>
export type EnrichmentModerateInput = z.infer<typeof enrichmentModerateSchema>
export type EnrichmentArbitrateInput = z.infer<typeof enrichmentArbitrateSchema>
