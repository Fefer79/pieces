import { z } from 'zod'
import { phoneSchema } from './auth'

/** Génération d'un lien de contrat (par un admin ou une liaison). */
export const createVendorContractSchema = z.object({
  sellerName: z.string().min(2, 'Le nom du vendeur est requis').max(120),
  shopName: z.string().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
  /** Rattacher à un vendeur déjà inscrit (optionnel). */
  vendorId: z.string().uuid().optional(),
})

/** Paramètre de route : le token du lien. */
export const vendorContractTokenParamsSchema = z.object({
  token: z.string().min(10).max(120),
})

/** Acceptation / signature électronique du contrat par le vendeur. */
export const acceptVendorContractSchema = z.object({
  signedName: z.string().min(2, 'Veuillez saisir votre nom complet').max(120),
  accepted: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les conditions pour signer' }),
  }),
})

export type CreateVendorContractInput = z.infer<typeof createVendorContractSchema>
export type AcceptVendorContractInput = z.infer<typeof acceptVendorContractSchema>
