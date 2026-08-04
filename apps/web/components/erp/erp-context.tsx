'use client'

import { createContext, useContext } from 'react'
import type { ErpMe } from '@/lib/erp-api'

// Profil ERP chargé une seule fois par le layout et partagé aux écrans.
//
// Sans ce contexte, chaque page referait `GET /erp/me` pour connaître les
// capacités de l'utilisateur — une requête par navigation, pour une donnée qui
// ne change pas pendant la session.

const ErpContext = createContext<ErpMe | null>(null)

export function ErpProvider({ value, children }: { value: ErpMe; children: React.ReactNode }) {
  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>
}

export function useErp(): ErpMe {
  const value = useContext(ErpContext)
  if (!value) {
    // eslint-disable-next-line no-restricted-syntax
    throw new Error('useErp doit être utilisé dans le layout de la console ERP')
  }
  return value
}
