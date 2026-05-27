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
pnpm -F ingest ingest --source=osm --bbox=abidjan
pnpm -F ingest ingest --source=3h --dry-run
```

## Architecture

- `src/sources/<name>.ts` — scraper par source (fetch → JSON brut Zod-validé)
- `src/normalizers/<name>.ts` — mapping JSON brut → entités Prisma
- `src/pipeline/` — orchestration ETL (extract → transform → load)
- `src/lib/` — utilitaires partagés (HTTP, rate-limit, slugify)
- `src/cli.ts` — point d'entrée CLI

Cf `_bmad-output/planning-artifacts/ingest-sources-recensement.md` pour le détail des sources.
