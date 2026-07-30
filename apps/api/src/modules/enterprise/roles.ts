import type { EnterpriseMemberRole } from '@prisma/client'

/**
 * Matrice de droits de l'espace flotte — source unique.
 *
 * Ces listes étaient dupliquées en dur dans six services : auditer « qui peut
 * exporter la compta » demandait de relire tout le module, et une omission
 * passait inaperçue (c'est exactement ce qui est arrivé à invoice.service.ts,
 * dont les quatre gardes étaient sans rôle).
 *
 * `apps/web/lib/enterprise-roles.ts` en est le miroir côté interface. Toute
 * modification ici doit y être répercutée — l'UI ne fait que masquer, c'est
 * ici que l'autorisation est décidée.
 */

/** Gestion du parc et de l'organisation : créer, supprimer, inviter. */
export const MANAGE_ROLES: EnterpriseMemberRole[] = ['OWNER', 'MANAGER']

/** Saisie terrain : le mécanicien alimente, il ne réorganise pas. */
export const ENTRY_ROLES: EnterpriseMemberRole[] = ['OWNER', 'MANAGER', 'MECHANIC']

/** Lecture financière : factures, dépenses, export des commandes. */
export const FINANCE_ROLES: EnterpriseMemberRole[] = ['OWNER', 'MANAGER', 'ACCOUNTANT']

/** Comptabilité pure (FEC) — le gestionnaire n'a pas à y toucher. */
export const ACCOUNTING_ROLES: EnterpriseMemberRole[] = ['OWNER', 'ACCOUNTANT']

/** Émettre une demande de pièce. */
export const REQUESTER_ROLES: EnterpriseMemberRole[] = ['OWNER', 'MANAGER', 'MECHANIC']

/** Approuver une demande et l'engager en commande. */
export const APPROVER_ROLES: EnterpriseMemberRole[] = ['OWNER', 'MANAGER']

/** Toucher aux rôles des membres : le propriétaire seul. */
export const OWNER_ONLY: EnterpriseMemberRole[] = ['OWNER']
