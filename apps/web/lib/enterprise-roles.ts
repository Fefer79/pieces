/**
 * Miroir côté interface de `apps/api/src/modules/enterprise/roles.ts`.
 *
 * Ce fichier ne protège rien : il évite d'afficher des boutons qui finiront en
 * 403. L'autorisation est décidée côté serveur, et doit le rester. Toute
 * modification de la matrice de droits se fait dans les deux fichiers.
 */

export type FleetRole = 'OWNER' | 'MANAGER' | 'MECHANIC' | 'ACCOUNTANT'

export const FLEET_ROLE_LABEL: Record<FleetRole, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Gestionnaire',
  MECHANIC: 'Mécanicien',
  ACCOUNTANT: 'Comptable',
}

export const FLEET_ROLE_HELP: Record<FleetRole, string> = {
  OWNER: 'Tous les droits, y compris la gestion des membres.',
  MANAGER: 'Gère le parc, les chauffeurs, les commandes et approuve les demandes.',
  MECHANIC: 'Saisit les entretiens et demande des pièces. Ne voit pas la comptabilité.',
  ACCOUNTANT: 'Accède aux factures et aux exports comptables. Ne modifie pas le parc.',
}

const CAN = {
  /** Factures, exports de dépenses, abonnement. */
  viewFinance: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
  /** Export FEC — pièce comptable. */
  viewAccounting: ['OWNER', 'ACCOUNTANT'],
  /** Créer, modifier, supprimer véhicules / chauffeurs / centres / stock. */
  manageFleet: ['OWNER', 'MANAGER'],
  /** Saisie terrain : kilométrage, entretien fait, ajustement de stock. */
  enterData: ['OWNER', 'MANAGER', 'MECHANIC'],
  /** Inviter, retirer, changer les rôles. */
  manageMembers: ['OWNER'],
  /** Approuver une demande de pièce et la convertir en commande. */
  approve: ['OWNER', 'MANAGER'],
  /** Émettre une demande de pièce. */
  createRequest: ['OWNER', 'MANAGER', 'MECHANIC'],
} satisfies Record<string, FleetRole[]>

export type FleetAction = keyof typeof CAN

export function can(role: FleetRole | null | undefined, action: FleetAction): boolean {
  if (!role) return false
  return (CAN[action] as readonly FleetRole[]).includes(role)
}
