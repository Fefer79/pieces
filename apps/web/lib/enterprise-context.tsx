'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
  setActiveEnterpriseId,
  type Enterprise,
} from './enterprise-api'
import type { FleetRole } from './enterprise-roles'

/**
 * Entreprise active de l'espace flotte, chargée une fois pour toutes.
 *
 * Avant, chaque page relisait le localStorage dans son propre effet et
 * plusieurs sortaient avant `setLoading(false)` — d'où des écrans bloqués sur
 * « Chargement… » dès qu'on arrivait ailleurs que sur le tableau de bord. Et
 * seul le tableau de bord savait changer d'entreprise, ce qui rendait le
 * multi-flotte inutilisable.
 */

type EnterpriseContextValue = {
  enterprises: Enterprise[]
  active: Enterprise | null
  enterpriseId: string | null
  role: FleetRole | null
  loading: boolean
  error: string | null
  setActive: (id: string) => void
  /** À appeler après création d'une entreprise pour recharger la liste. */
  refresh: () => Promise<void>
}

const EnterpriseContext = createContext<EnterpriseContextValue | null>(null)

export function EnterpriseProvider({ children }: { children: React.ReactNode }) {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await enterpriseFetch<Enterprise[]>('')
    setLoading(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setEnterprises(res.data)
    // L'entreprise mémorisée peut avoir disparu (membre retiré) : on retombe
    // sur la première disponible plutôt que de laisser l'espace vide.
    const stored = getActiveEnterpriseId()
    const resolved = res.data.find((e) => e.id === stored) ?? res.data[0] ?? null
    if (resolved) {
      setActiveId(resolved.id)
      if (resolved.id !== stored) setActiveEnterpriseId(resolved.id)
    } else {
      setActiveId(null)
    }
  }, [])

  // Chargement initial depuis l'API : c'est bien une synchronisation avec un
  // système externe, mais `load` pose l'état de façon synchrone dans certains
  // chemins d'erreur — d'où la dérogation locale.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { load() }, [load])

  const setActive = useCallback((id: string) => {
    setActiveEnterpriseId(id)
    setActiveId(id)
  }, [])

  const active = enterprises.find((e) => e.id === activeId) ?? null

  return (
    <EnterpriseContext.Provider
      value={{
        enterprises,
        active,
        enterpriseId: active?.id ?? null,
        role: (active?.memberRole as FleetRole | undefined) ?? null,
        loading,
        error,
        setActive,
        refresh: load,
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  )
}

/**
 * Hors de l'espace flotte (la sidebar est montée partout), le provider est
 * absent : on renvoie un état neutre plutôt que de lever.
 */
const EMPTY: EnterpriseContextValue = {
  enterprises: [],
  active: null,
  enterpriseId: null,
  role: null,
  loading: false,
  error: null,
  setActive: () => {},
  refresh: async () => {},
}

export function useEnterprise(): EnterpriseContextValue {
  return useContext(EnterpriseContext) ?? EMPTY
}
