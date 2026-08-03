# Module Sourcing & Expéditions — de la demande client à la livraison

> **Plan d'implémentation.** Rédigé le 2026-08-03 après analyse du code existant.
> Statut : **implémenté le 2026-08-03** — les 4 lots sont livrés. Ce document reste la
> référence de conception ; le code fait foi.

## Où est le code

| Lot | Où |
|---|---|
| 1 — modèle de données | `packages/shared/prisma/schema.prisma` (SourcingSearch, SourcingOffer, Shipment, ShipmentEvent) + `migrations/20260803_sourcing_shipments/` |
| 2 — agent de recherche | `packages/shared/constants/{currencies,carriers}.ts`, `validators/sourcing.ts`, `apps/api/src/modules/sourcing/sourcing.{prompts,agent}.ts`, `queue/handlers/sourcingSearch.ts` |
| 3 — service & arbitrage | `apps/api/src/modules/sourcing/{sourcing,shipment}.{service,routes}.ts` → `/api/v1/admin/sourcing`, `/api/v1/admin/shipments`, `/api/v1/logistics/shipments/:reference/public` |
| 4 — interfaces | `apps/web/lib/sourcing-{api,utils}.ts`, `app/(auth)/admin/{sourcing,expeditions}/`, `components/sourcing/`, `components/logistique/shipment-timeline.tsx` |

**Écarts assumés par rapport au plan initial** : le rendu d'arbitrage admin est écrit dans la page
plutôt que de réutiliser `components/logistics-matrix.tsx` (qui est une carte interactive flotte
allant chercher sa matrice par le réseau, pas un rendu de résultat déjà calculé) ; les tables
statut → chip vivent dans `lib/sourcing-utils.ts` car Next.js refuse tout export supplémentaire
depuis un fichier de page.

**Reste ouvert** : cf. « Points d'attention » en fin de document — la calibration de la grille de
fret (n° 3) et la mise à jour des taux de change (n° 4) ne sont pas résolues par ce lot.

## Contexte de rédaction (conservé)

---

## Contexte

Un client de `logistique.pieces.ci` a exprimé un besoin de pièce rare. Aujourd'hui la recherche
sur les sites de vente internationaux, la comparaison des offres, la commande et le suivi de
l'expédition se font entièrement à la main, hors système.

**Ce qui existe déjà dans le code** (vérifié) :

| Étape | État | Où |
|---|---|---|
| Recenser le besoin | ✅ complet | `LogisticsQuoteRequest` — référence unique, pipeline `NEW→CONTACTED→QUOTING→QUOTED→WON/LOST`, assignation ops, photos, journal d'événements. Cockpit `/admin/logistique`, dépôt public `logistique.pieces.ci/devis`, suivi client `/suivi/[reference]?t=token`. Plus `PartRequest` côté flotte. |
| Moteur d'arbitrage | ✅ complet | `computeArbitrageMatrix()` dans `packages/shared/constants/logistics.ts` — compare des options sur prix pièce + fret + douane 20 % + last mile + **coût d'immobilisation**. Rendu par `apps/web/components/logistics-matrix.tsx`. |
| Recherche web agentique | ✅ brique en place | `apps/api/src/modules/enrichment/enrichment.agent.ts` — outil `web_search_20260209` (`webSearchTool(maxUses)`), `createWithPauseResume`, sortie JSON validée Zod. |
| Commander | ✅ complet | `Supplier` + `PurchaseOrder` (n° `BC-…`, mode `LOGISTICS_MODES`, devise + `tauxChange`, `fraisEstimes {fret, douane, lastMile}`, `BROUILLON→ENVOYEE→EN_TRANSIT→RECEPTIONNEE`) dans `apps/api/src/modules/stock/`. Réception → `StockMovement` + CUMP. |
| Messagerie | ✅ complet | `notifyWhatsAppUser` (Baileys → Cloud API). |
| **Recherche d'offres réelles** | ❌ **absent** | L'agent existant sort des *fournisseurs* pour une fiche catalogue, en batch nocturne, jamais rattaché à une demande client, et sans prix. Les scrapers `apps/ingest` ne couvrent que la Côte d'Ivoire. |
| **Objet « offre candidate »** | ❌ **absent** | Rien pour lister/comparer/arbitrer des offres. La matrice tourne sur des tarifs placeholder. |
| **Suivi d'expédition** | ❌ **absent** | Zéro occurrence DHL/FedEx/AWB. `PurchaseOrder` n'a que `envoyeAt/etaAt/recuAt`. `Delivery` = coursier Abidjan uniquement. |

**Le chaînon manquant est central** : aucune FK ne relie `LogisticsQuoteRequest` (le besoin) à
`PurchaseOrder` (l'achat), et il n'y a rien entre les deux.

**Résultat visé** : depuis une demande de cotation, lancer une recherche automatique sur les sites
de vente internationaux, obtenir une liste d'offres comparées au coût rendu Abidjan (immobilisation
comprise), arbitrer, générer le bon de commande, puis suivre l'expédition jusqu'à la livraison —
le client voyant l'avancement sur sa page de suivi existante.

## Décisions actées

- **Recherche** : agent Claude + `web_search` (pas de scrapers par site). Réutilise l'outil déjà en
  production. Zéro clé API, zéro maintenance par marketplace, tolérant à l'anti-bot.
  Contrepartie assumée : les prix sont **indicatifs jusqu'à confirmation ops** — matérialisé par un
  champ `priceConfirmed` et un badge « à confirmer » dans l'UI.
- **Tracking** : saisie ops + lien transporteur. Modèles `Shipment`/`ShipmentEvent`, étapes déjà
  spécifiées §4 du doc. Aucune intégration transporteur (une API pourra alimenter `ShipmentEvent`
  plus tard sans changer le modèle).
- **Périmètre** : chaîne complète besoin → offres → arbitrage → BC → suivi.
- **Emplacement** : sous `/admin`, comme tous les modules ERP actuels (CRM, Stock, Finance…).

---

## Lot 1 — Modèle de données

`packages/shared/prisma/schema.prisma` + migration `packages/shared/prisma/migrations/<date>_sourcing_shipments/`.

**Enums** : `SourcingSearchStatus` (PENDING RUNNING DONE FAILED) · `SourcingOfferStatus`
(CANDIDATE SHORTLISTED CONTACTED REJECTED ORDERED) · `SourcingChannel` (MARKETPLACE_INTL
DISTRIBUTOR_REGIONAL EXPORTER MANUFACTURER LOCAL) · `ShipmentCarrier` (DHL FEDEX UPS TRANSITAIRE
AIR_CARGO SEA_LCL POSTAL OTHER) · `ShipmentStatus` (SOURCING COLLECTED IN_TRANSIT CUSTOMS
LOCAL_DELIVERY DELIVERED CANCELLED — reprise littérale du §4 du doc).

**`SourcingSearch`** — `quoteRequestId?` (FK `LogisticsQuoteRequest`), `partRequestId?` (FK
`PartRequest`), snapshot de la requête (`partName`, `oemReference`, `vehicleBrand/Model/Year`,
`quantity`), `status`, `model`, `startedAt/finishedAt`, `error`, `createdById`, `offers[]`.

**`SourcingOffer`** — `searchId` (cascade), `supplierName`, `channel`, `country`, `city`, `url`,
`sourceSite`, `title`, `brand`, `oemReference`, `conditionLabel` (mappé sur `PartCondition` quand
possible), `priceAmount` + `priceCurrency` + `priceFcfa` + `priceConfirmed`, `shippingAmount?`,
`moq?`, `leadTimeDays?`, `weightKg?`, `availability`, `contactPhone/Email/Whatsapp?`,
`confidence`, `status`, `opsNote?`, `chosenMode?` (clé `LogisticsMode`), `purchaseOrderId?`.

**`Shipment`** — `reference @unique` (`EXP-YYYYMMDD-XXXX`), `purchaseOrderId?`, `quoteRequestId?`,
`carrier` + `carrierOther?` + `trackingNumber?` + `trackingUrl?`, `mode`, `status`,
`originCountry/City?`, `departedAt/etaAt/customsClearedAt/arrivedAt/deliveredAt?`,
`weightKg/volumeDm3/chargeableWeightKg?`, `freightCostFcfa/customsCostFcfa/lastMileCostFcfa/totalCostFcfa?`,
`publicTokenHash?`, `notes?`, `createdById`, `events[]`.

**`ShipmentEvent`** — `shipmentId` (cascade), `fromStatus?`, `toStatus?`, `label`, `location?`,
`occurredAt`, `actorUserId?`, `note?`. Même forme que `LogisticsQuoteRequestEvent`.

**Enum `JobType`** : ajouter `SOURCING_SEARCH_RUN` (l'ajout d'un type de job impose une migration).

## Lot 2 — Recherche d'offres (agent)

- `packages/shared/constants/currencies.ts` — **nouveau**. `CURRENCY_RATES_FCFA` (EUR = 655,957
  fixe par parité XOF/EUR ; USD, AED, CNY, TRY, GBP en taux ops-modifiables) + `toFcfa(amount, currency)`.
  Le `tauxChange` de `PurchaseOrder` s'alimente de là.
- `packages/shared/constants/carriers.ts` — **nouveau**. Libellé + gabarit d'URL de suivi par
  `ShipmentCarrier` → `buildTrackingUrl(carrier, number)`. C'est ce qui remplace une intégration API.
- `packages/shared/validators/sourcing.ts` — **nouveau**. `sourcingOffersOutputSchema` (sortie
  agent), `sourcingSearchCreateSchema`, `offerUpdateSchema`, `shipmentCreateSchema`,
  `shipmentTransitionSchema`, `adminSourcingListQuery`. Modèle : `packages/shared/validators/logistics.ts`.
- `apps/api/src/lib/anthropic.ts` — **modifier**. Y remonter `webSearchTool(maxUses)` (aujourd'hui
  const locale dans `enrichment.agent.ts:46`) et faire importer `enrichment.agent.ts` depuis là.
  Petit refactor, évite la duplication.
- `apps/api/src/modules/sourcing/sourcing.prompts.ts` — **nouveau**. `PROMPT_SOURCING_OFFERS` :
  distinct de `PROMPT_SOURCING` existant (qui sort des fournisseurs pour le catalogue). Consigne :
  offres **achetables** sur marketplaces internationales (eBay, AliExpress, PartSouq, RockAuto,
  Autodoc, Amazon, Alibaba) + distributeurs régionaux Afrique de l'Ouest + exportateurs
  Dubaï/Turquie/Inde ; toujours l'URL source ; **prix `null` si non visible, jamais inventé** ;
  devise telle qu'affichée ; délai et poids seulement s'ils sont indiqués.
- `apps/api/src/modules/sourcing/sourcing.agent.ts` — **nouveau**. `runOfferSearch(input, logger)`,
  calqué sur `runCompatibilityPass` (`enrichment.agent.ts:107-130`) : `createWithPauseResume` +
  `tools: [webSearchTool(12)]` + `extractJson` + `safeParse` → `null` et `logger.warn` structuré
  en cas de sortie invalide. Modèle via `ENRICHMENT_PASS2_MODEL` (sonnet).
- `apps/api/src/modules/queue/handlers/sourcingSearch.ts` — **nouveau**. Une recherche dure
  30–90 s : la route enqueue, le handler exécute et écrit les `SourcingOffer` (conversion FCFA à
  l'insertion). Câbler dans `worker.ts` (`JOB_TYPES` + map `handlers`). Pas d'`ensure…Scheduled` :
  ce job est déclenché à la demande, pas récurrent.

## Lot 3 — Service, arbitrage, commande, messages

`apps/api/src/modules/sourcing/sourcing.service.ts` + `.routes.ts`, montés
`/api/v1/admin/sourcing` dans `apps/api/src/server.ts` (à côté de `stockRoutes`, ligne ~107).
Toutes les routes sous `requireAuth` + `requireRole('ADMIN')`, schémas via `zodToFastify`.

- `createSearch(input, actor)` — depuis un `LogisticsQuoteRequest` (ou `PartRequest`), snapshot +
  `enqueue('SOURCING_SEARCH_RUN')`.
- `getSearch(id)` / `adminListSearches(query)` / `adminSearchStats()` — mêmes formes que
  `adminListQuoteRequests` / `adminQuoteRequestStats` (`logistics.service.ts:690,727`).
- `updateOffer(id, patch, actor)` — shortlist / reject / note / `chosenMode` / `priceConfirmed`.
- **`buildOfferMatrix(searchId)`** — le cœur de l'arbitrage : mappe les offres retenues en
  `ArbitrageOptionInput[]` (`{ mode, partPrice: priceFcfa, transitDays: leadTimeDays, available }`),
  résout la famille via `matchLogisticsFamily()` et le coût d'immobilisation via
  `resolveEconomyCategory()` / `DOWNTIME_COST_PER_DAY`, puis appelle `computeArbitrageMatrix()`.
  **Aucune duplication du moteur.** Règles de mapping du mode : cf. « Points d'attention » n° 2.
- `createPurchaseOrderFromOffer(offerId, actor)` — find-or-create `Supplier` depuis l'offre, puis
  réutilise `createPurchaseOrder` de `apps/api/src/modules/stock/stock.service.ts` avec une ligne
  `PurchaseOrderItem`, `devise`/`tauxChange` de l'offre, `mode` retenu, `fraisEstimes` issus de la
  matrice (via `estimateLandedCost`, `stock.service.ts:477`). Passe l'offre en `ORDERED`.
- `draftSupplierMessage(offerId)` — court appel Claude **sans** `web_search`, produit un message
  d'enquête (FR ou EN selon le pays). **Renvoie un brouillon ; l'envoi est une action ops
  explicite** via `notifyWhatsAppUser`, ou lien `wa.me` / `mailto:` si pas de canal interne.

`apps/api/src/modules/sourcing/shipment.service.ts` + routes `/api/v1/admin/shipments` :
- `createShipment(input, actor)` — référence via le pattern `buildReference` (`logistics.service.ts:80`),
  `trackingUrl` via `buildTrackingUrl`, `publicTokenHash` via `hashToken` (`logistics.service.ts:90`).
- `transitionShipment(id, toStatus, meta, actor)` — écrit un `ShipmentEvent`, horodate le champ
  correspondant, et propage le statut au `PurchaseOrder` lié (`IN_TRANSIT` → `EN_TRANSIT`,
  `DELIVERED` → laisse la réception à l'écran stock existant).
- `getShipmentPublic(reference, token)` — pour la page de suivi client.
- `notifyShipmentUpdate(id)` — action ops, WhatsApp au demandeur.

> ⚠️ **Règle produit à respecter** : `apps/web/lib/logistique-content.ts:7` — le partenaire
> transitaire n'est jamais nommé côté client. Sur les surfaces publiques, afficher le transporteur
> uniquement pour DHL/FedEx/UPS ; pour `TRANSITAIRE`, afficher « notre partenaire logistique ».

## Lot 4 — Interfaces

- `apps/web/lib/sourcing-api.ts` — **nouveau**, sur le modèle de `lib/stock-api.ts` / `lib/crm-api.ts`
  (`adminFetch`, déballage `body.data`).
- `/admin/sourcing/page.tsx` + `[id]/page.tsx` — **nouveaux**. Liste des recherches (bandeau KPI +
  filtres + pagination) puis détail : tableau des offres, matrice d'arbitrage (réutiliser
  `components/logistics-matrix.tsx`), actions shortlist / rejeter / message / créer le BC.
  Cloner le pattern de `apps/web/app/(auth)/admin/external-imports/page.tsx` (`useState` + `load`
  en `useCallback` + `URLSearchParams`, primitives `@/components/ui/table`, tokens `text-ink`,
  `bg-card`, `border-border`).
- `/admin/expeditions/page.tsx` + `[id]/page.tsx` — **nouveaux**. Liste + détail avec frise
  d'événements et formulaire de transition.
- `apps/web/app/(auth)/admin/logistique/[id]/page.tsx` — **modifier**. Bouton « Rechercher des
  offres » + encart des offres trouvées. C'est le lien besoin → recherche.
- `apps/web/app/(auth)/admin/stock/achats/[id]/page.tsx` — **modifier**. Bloc « Expédition » :
  créer/consulter le `Shipment` du BC.
- `apps/web/app/(auth)/admin/layout.tsx` — **modifier**. Entrées « Sourcing » et « Expéditions ».
- `apps/web/app/(public)/logistique/suivi/[reference]/page.tsx` — **modifier**. Afficher
  l'expédition et ses étapes quand la demande en a une. Le préfixe `/suivi/` est déjà dynamique
  dans `apps/web/lib/logistique-routes.ts` : **aucun changement de routage**.

**DESIGN.md** : la condition de chaque offre (Neuf / Occasion importée / Ré-usiné / Aftermarket /
OEM) s'affiche en **chip colorée**, jamais en gris ; la matrice affiche le **détail complet**
(prix pièce / fret / douane / last mile / immobilisation / total), jamais un prix nu.

## Tests

Vitest, mêmes conventions que l'existant (`vi.mock` avant import, `vi.stubEnv`, `app.inject()`).
- `sourcing.agent.test.ts` — sortie valide / invalide / erreur API → `null`.
- `sourcing.service.test.ts` — `buildOfferMatrix` (mapping mode, tri par coût total, offre
  recommandée), conversion devise, `createPurchaseOrderFromOffer` (find-or-create fournisseur).
- `shipment.service.test.ts` — machine à états, horodatages, propagation au BC, jeton public.
- `sourcing.routes.test.ts` — RBAC ADMIN, validation, pagination.
- Rappel : `toLocaleString('fr-FR')` insère U+00A0 — assertions en `toMatch(/…/)`, pas `toContain`.

## Vérification de bout en bout

```bash
pnpm -F shared db:generate && pnpm -F shared db:migrate
pnpm -F api test && pnpm -F web test
pnpm lint && pnpm build
```

Puis, API + web lancés (`pnpm dev`), avec `ANTHROPIC_API_KEY` réel :

1. Déposer une demande sur `logistique.pieces.ci/devis` (ou en base) → vérifier qu'elle apparaît
   dans `/admin/logistique`.
2. Ouvrir la demande → « Rechercher des offres » → vérifier le job `SOURCING_SEARCH_RUN` en base
   (`PENDING` → `COMPLETED`) et l'arrivée des offres avec URL + devise (worker : 1 job / 30 s).
3. Sur `/admin/sourcing/[id]` : shortlister 2–3 offres, forcer un mode, vérifier que la matrice
   classe par coût total et que l'immobilisation domine sur les longs délais (test attendu du doc :
   45 j × 30 000 F rend le maritime réactif toujours perdant).
4. « Créer le bon de commande » → vérifier le `PurchaseOrder` sur `/admin/stock/achats` (n°, devise,
   `fraisEstimes`) et `offer.status = ORDERED`.
5. Créer une expédition depuis le BC, saisir un n° DHL → vérifier le `trackingUrl` généré, puis
   faire défiler `COLLECTED → IN_TRANSIT → CUSTOMS → LOCAL_DELIVERY → DELIVERED` et contrôler les
   `ShipmentEvent` + le passage du BC en `EN_TRANSIT`.
6. Ouvrir `logistique.pieces.ci/suivi/<reference>?t=<token>` → le client voit les étapes, **sans
   que le transitaire soit nommé**.

## Points d'attention — à trancher pendant l'implémentation

1. **Coût de l'agent.** 1 recherche = 1 appel sonnet + jusqu'à 12 recherches web. À spécifier
   précisément : compteur, fenêtre glissante, comportement au refus. Refuser une nouvelle recherche
   si une est déjà `PENDING`/`RUNNING` sur la même demande.
2. **Mapping offre → mode logistique — le point le plus fragile du lot 3**, puisque c'est lui qui
   décide de l'arbitrage. Règle de départ : `LOCAL` si `country === 'CI'`, sinon
   `chosenMode ?? 'AIR_STANDARD'`. À durcir (pays limitrophes ? offre volumineuse → `SEA_LCL` ?
   `leadTimeDays` annoncé incohérent avec le mode ?) et à couvrir par ses propres cas de test.
3. **Grille de fret et taux de douane.** `LOGISTICS_MODES` et `CUSTOMS_DUTY_RATE` sont des ordres
   de grandeur assumés (§9 du doc). Ce module rend leur calibration **bloquante** : le total
   affiché au client n'est juste que si la grille l'est. À obtenir du partenaire avant mise en
   production côté client.
4. **Taux de change.** Figés en constante au départ : trancher qui les met à jour et à quelle
   fréquence, sinon les prix FCFA dérivent silencieusement. Le `tauxChange` du BC doit rester
   surchargeable par l'ops (le champ existe déjà sur `PurchaseOrder`).
5. **Fiabilité des prix.** `priceConfirmed = false` par défaut, badge « à confirmer » dans l'UI, et
   la matrice signale explicitement qu'elle repose sur des prix non confirmés tant qu'aucun ne l'est.
