'use client'

import { useEnterprise } from '@/lib/enterprise-context'
import { can, type FleetAction } from '@/lib/enterprise-roles'

/**
 * Masque une action que le membre n'a pas le droit d'effectuer, plutôt que de
 * l'afficher et de laisser l'API répondre 403.
 *
 * Ce composant ne protège rien : la décision d'autorisation appartient au
 * serveur (`assertMember`). Il évite seulement les culs-de-sac.
 */
export function RoleGate({
  action,
  children,
  fallback = null,
}: {
  action: FleetAction
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { role } = useEnterprise()
  return <>{can(role, action) ? children : fallback}</>
}

/** Variante hook, pour désactiver un contrôle plutôt que le masquer. */
export function useCan(action: FleetAction): boolean {
  const { role } = useEnterprise()
  return can(role, action)
}
