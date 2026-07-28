/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
  type Enterprise,
  type FleetVehicle,
  type PartRequest,
} from '@/lib/enterprise-api'
import { DevisWizard } from '@/components/logistique/devis-wizard'
import type { DevisContext } from '@/components/logistique/devis-context'

const FleetContext = createContext<DevisContext | null>(null)

/**
 * Charge la flotte active, ses véhicules et — si présente — la demande de pièce
 * d&apos;origine (passerelle depuis /enterprise/requests/[id]), puis expose le
 * contexte prêt à l&apos;emploi.
 */
export function FleetDevisProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const fromRequest = searchParams.get('fromRequest')
  const [ctx, setCtx] = useState<DevisContext | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const enterpriseId = getActiveEnterpriseId()
    if (!enterpriseId) {
      setError('Aucune entreprise active.')
      return
    }
    let cancelled = false
    ;(async () => {
      const [eRes, vRes, prRes] = await Promise.all([
        enterpriseFetch<Enterprise[]>(`/`),
        enterpriseFetch<FleetVehicle[]>(`/${enterpriseId}/vehicles`),
        fromRequest
          ? enterpriseFetch<PartRequest>(`/${enterpriseId}/part-requests/${fromRequest}`)
          : Promise.resolve({ ok: true as const, data: null }),
      ])
      if (cancelled) return
      if (!eRes.ok) {
        setError(eRes.message)
        return
      }
      const enterprise = eRes.data.find((e) => e.id === enterpriseId) ?? eRes.data[0] ?? null
      const vehicles = vRes.ok ? vRes.data : []
      const pr = prRes.ok && prRes.data ? prRes.data : null
      setCtx({
        mode: 'FLEET',
        enterprise: enterprise
          ? {
              id: enterprise.id,
              name: enterprise.name,
              commune: enterprise.commune,
              address: enterprise.address,
            }
          : null,
        vehicles: vehicles.map((v) => ({
          id: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          vin: v.vin,
          energyType: v.engine === 'EV' ? 'EV' : v.engine === 'HYBRID' ? 'HYBRID' : 'ICE',
        })),
        fromRequest: pr
          ? {
              id: pr.id,
              partName: pr.partName,
              partCategory: pr.category,
              oemReference: pr.oemReference,
              vehicleId: pr.vehicleId,
            }
          : null,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [fromRequest])

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
    )
  }
  if (!ctx) {
    return <div className="text-sm text-muted">Chargement de la flotte…</div>
  }
  return <FleetContext.Provider value={ctx}>{children}</FleetContext.Provider>
}

export function useFleetDevisContext(): DevisContext {
  const ctx = useContext(FleetContext)
  if (!ctx) throw new Error('FleetDevisProvider manquant') // eslint-disable-line no-restricted-syntax
  return ctx
}

export function FleetWizard() {
  const ctx = useFleetDevisContext()
  return <DevisWizard context={ctx} />
}
