import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { BackgroundSyncPlugin, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// File d'attente hors-ligne (espace vendeur) : les deux écritures les plus
// coûteuses à perdre sur une connexion Abidjan intermittente — noter une vente
// hors-plateforme, confirmer une commande — sont rejouées automatiquement à la
// reconnexion plutôt que silencieusement perdues. `runtimeCaching` ne cible que
// les GET ; ces routes sont enregistrées séparément, uniquement pour POST.
//
// Limite connue : le jeton d'auth est figé dans la requête au moment de la
// mise en file. Si la reconnexion survient après son expiration, le rejeu
// échoue (401) et la requête est abandonnée à maxRetentionTime — pas de
// rafraîchissement de session en tâche de fond ici.
serwist.registerCapture(
  ({ url }) => url.pathname === '/api/v1/catalog/sales',
  new NetworkOnly({
    plugins: [new BackgroundSyncPlugin('vendor-sales-queue', { maxRetentionTime: 24 * 60 })],
  }),
  'POST',
)

serwist.registerCapture(
  ({ url }) => /^\/api\/v1\/orders\/[^/]+\/confirm$/.test(url.pathname),
  new NetworkOnly({
    plugins: [new BackgroundSyncPlugin('vendor-order-confirm-queue', { maxRetentionTime: 24 * 60 })],
  }),
  'POST',
)
