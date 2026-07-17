// Source unique des « espaces » — le vocabulaire UI des rôles RBAC.
// Un espace = une zone exclusive de l'app (préfixe d'URL), les rôles qui y
// donnent accès, et le copy d'activation quand l'utilisateur ne l'a pas encore.
// Les routes partagées (/browse, /panier, /orders, /profile) n'appartiennent à
// aucun espace : on ne bascule jamais le contexte dessus.

export interface SpaceActivationCopy {
  title: string
  bullets: string[]
  note: string
}

export interface Space {
  key: string
  /** Libellé visible — on ne dit jamais « rôle » ni « contexte » dans l'UI. */
  label: string
  /** Une ligne sous le libellé (cartes « Mes espaces », menu). */
  description: string
  /** Rôle canonique posé à l'activation. */
  role: string
  /** Rôles qui donnent accès à l'espace. */
  matchRoles: string[]
  /** Préfixe d'URL exclusif à l'espace. */
  prefix: string
  /** Destination « Aller à cet espace ». */
  root: string
  /** Destination après la première activation (défaut : la page demandée). */
  postActivation?: string
  /** Présent ⇔ l'utilisateur peut activer l'espace lui-même. */
  activation?: SpaceActivationCopy
  /** Message pour les espaces attribués (non auto-activables). */
  reserved?: string
}

export const SPACES: Space[] = [
  {
    key: 'achat',
    label: 'Espace Achat',
    description: 'Recherche de pièces, commandes, véhicules',
    role: 'BUYER',
    matchRoles: ['BUYER'],
    prefix: '/vehicles',
    root: '/browse',
    activation: {
      title: "Activer l'espace Achat ?",
      bullets: [
        'Recherchez des pièces pour vos véhicules',
        'Commandez avec paiement sécurisé sous séquestre',
        'Suivez vos commandes et livraisons',
      ],
      note: 'Gratuit. Vous pourrez toujours revenir à vos autres espaces.',
    },
  },
  {
    key: 'vendeur',
    label: 'Espace Vendeur',
    description: 'Votre boutique et vos commandes vendeur',
    role: 'SELLER',
    matchRoles: ['SELLER'],
    prefix: '/vendors',
    root: '/vendors/catalog',
    postActivation: '/vendors/onboarding',
    activation: {
      title: "Activer l'espace Vendeur ?",
      bullets: [
        'Créez votre boutique en ligne',
        'Recevez des commandes de mécaniciens et propriétaires',
        'Paiement sécurisé sous séquestre',
      ],
      note: 'Gratuit. Vous pourrez toujours revenir à votre espace Achat.',
    },
  },
  {
    key: 'flotte',
    label: 'Espace Flotte',
    description: 'Gérez les véhicules de votre entreprise',
    role: 'ENTERPRISE',
    matchRoles: ['ENTERPRISE'],
    prefix: '/enterprise',
    root: '/enterprise/dashboard',
    postActivation: '/enterprise/dashboard',
    activation: {
      title: "Activer l'espace Flotte ?",
      bullets: [
        'Suivez les dépenses pièces de tous vos véhicules',
        'Gérez chauffeurs, commandes et factures au même endroit',
        'Gestion déléguée et livraison prioritaire pour réduire l’immobilisation',
      ],
      note: 'Vous pourrez toujours revenir à votre espace Achat.',
    },
  },
  {
    key: 'livreur',
    label: 'Espace Livreur',
    description: 'Vos courses de livraison de pièces',
    role: 'RIDER',
    matchRoles: ['RIDER'],
    prefix: '/rider',
    root: '/rider',
    reserved:
      'Cet espace est réservé aux livreurs partenaires de Pièces. Contactez-nous pour devenir livreur.',
  },
  {
    key: 'chauffeur',
    label: 'Espace Chauffeur',
    description: 'Vos demandes de pièces pour la flotte',
    role: 'DRIVER',
    matchRoles: ['DRIVER'],
    prefix: '/driver',
    root: '/driver',
    reserved:
      'Cet espace est réservé aux chauffeurs invités par leur entreprise.',
  },
  {
    key: 'liaison',
    label: 'Espace Liaison',
    description: 'Vendeurs et pièces sur le terrain',
    role: 'LIAISON',
    matchRoles: ['LIAISON', 'ADMIN'],
    prefix: '/liaison',
    root: '/liaison',
    reserved: 'Cet espace est réservé aux agents de liaison Pièces.',
  },
  {
    key: 'admin',
    label: 'Administration',
    description: 'Back-office Pièces',
    role: 'ADMIN',
    matchRoles: ['ADMIN'],
    prefix: '/admin',
    root: '/admin',
    reserved: 'Cet espace est réservé aux administrateurs Pièces.',
  },
]

/** Espace dont `pathname` fait partie, ou null pour les routes partagées. */
export function spaceForPath(pathname: string): Space | null {
  return (
    SPACES.find(
      (s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`),
    ) ?? null
  )
}

/** Espace correspondant à un rôle (contexte actif) — canonique d'abord. */
export function spaceForRole(role: string | null | undefined): Space | null {
  if (!role) return null
  return (
    SPACES.find((s) => s.role === role) ??
    SPACES.find((s) => s.matchRoles.includes(role)) ??
    null
  )
}

/** Espaces accessibles avec ces rôles. */
export function spacesForRoles(roles: string[]): Space[] {
  return SPACES.filter((s) => roles.some((r) => s.matchRoles.includes(r)))
}
