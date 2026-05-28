# ingest

Workspace de scraping et import pour pieces.ci. Pipeline ETL hors API/web.

## Sources gérées

| Source | Type | Statut |
|---|---|---|
| OSM Overpass | Carto offline (CompetitorVendor) | Phase 4 |
| Google Places | Enrichissement contacts top 50 | Phase 4 |
| NHTSA vPIC | Catalogue véhicules | Phase 2 |
| Wikipedia / DBpedia | Catalogue véhicules | Phase 2 |
| 3H Autoparts | Pièces + prix (WooCommerce) | Phase 3 |
| MAPA-CI | Pièces (catalogue) | Phase 3 |
| Jumia CI | Pièces + prix | Phase 3 |
| CoinAfrique CI | Annonces pièces | Phase 3 |
| Annuaire CI | Concurrence | Phase 3 |
| partsouq | OEM compat | Phase 5 (optionnel) |

## Lancer un ingest

```bash
pnpm -F ingest ingest --source=osm
pnpm -F ingest ingest --source=nhtsa
pnpm -F ingest ingest --source=french-models
pnpm -F ingest ingest --source=3h --dry-run --limit=10   # dump JSON dans data/raw/
pnpm -F ingest ingest --source=3h --dry-run              # full crawl ~247 produits
```

Le pipeline 3H utilise le JSON-LD `schema.org/Product` exposé par Rank Math SEO :
extract des 2 product-sitemaps → fetch chaque fiche → parse JSON-LD → normalize
(name, prix XOF, brand, OEM ref via SKU, condition, image). Sortie en `data/raw/3hautoparts-YYYY-MM-DD.json`.

L'étape **load en DB** n'est pas encore branchée — elle nécessite la migration
Prisma `Vendor.isExternal` + `CatalogItem.externalSource/Url/Id` (Étape 2).

## Architecture

- `src/sources/<name>.ts` — scraper par source (fetch → JSON brut Zod-validé)
- `src/normalizers/<name>.ts` — mapping JSON brut → entités Prisma
- `src/pipeline/` — orchestration ETL (extract → transform → load)
- `src/lib/` — utilitaires partagés (HTTP, rate-limit, slugify)
- `src/cli.ts` — point d'entrée CLI

Cf `_bmad-output/planning-artifacts/ingest-sources-recensement.md` pour le détail des sources.
