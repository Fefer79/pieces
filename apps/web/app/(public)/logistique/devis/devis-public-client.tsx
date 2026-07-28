'use client'

import { useSearchParams } from 'next/navigation'
import { DevisWizard } from '@/components/logistique/devis-wizard'
import type { DevisContext } from '@/components/logistique/devis-context'

// Wrapper client : la page /logistique/devis sert le wizard en mode PUBLIC.
// Les modes ACCOUNT et FLEET passent par /enterprise/logistics/quotes/new et
// /profile/cotations/new (routes authentifiées), où le contexte est chargé
// côté serveur.
export function DevisPublicClient() {
  const searchParams = useSearchParams()
  const context: DevisContext = {
    mode: 'PUBLIC',
    fromRequest: null,
  }
  // Prefill le partName/partCategory depuis ?piece=&cat=
  void searchParams
  return <DevisWizard context={context} />
}
