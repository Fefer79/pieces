'use client'

import { createContext, useContext } from 'react'
import type { ErpMe } from '@/lib/erp-api'

// Profil ERP résolu une fois par le layout, partagé avec toutes les pages.
//
// Sans ça, chaque écran refait `GET /erp/me` pour savoir quelles actions
// afficher — un aller-retour par navigation, alors que le layout ne se remonte
// pas entre deux pages du même segment.

const ErpContext = createContext<ErpMe | null>(null)

export function ErpProvider({ me, children }: { me: ErpMe; children: React.ReactNode }) {
  return <ErpContext.Provider value={me}>{children}</ErpContext.Provider>
}

/**
 * Profil ERP courant. Lève hors du layout ERP : c'est un bug de composition,
 * pas un cas d'exécution à gérer.
 */
export function useErp(): ErpMe {
  const me = useContext(ErpContext)
  if (!me) {
    // Invariant de composition détecté au développement, pas une erreur d'API :
    // AppError attacherait un code HTTP à ce qui est un bug de structure de
    // l'arbre React.
    // eslint-disable-next-line no-restricted-syntax
    throw new Error('useErp doit être utilisé dans app/erp/layout.tsx')
  }
  return me
}
