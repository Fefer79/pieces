# ingest

Workspace de scraping et import pour pieces.ci. Pipeline ETL hors API/web.

## Sources gérées

| Source | Type | Statut |
|---|---|---|
| OSM Overpass | Carto offline (CompetitorVendor) | Phase 4 |
| Google Places | Enrichissement contacts top 50 | Phase 4 |
| NHTSA vPIC | Catalogue véhicules | Phase 2 |
| Wikipedia / DBpedia | Catalogue véhicules | Phase 2 |
| 3H Autoparts | Pièces + prix (WooCommerce) | ✅ fait |
| Global Auto | Pièces + prix + compat (API JSON) | ✅ fait |
| MAPA-CI | Pièces (catalogue Osclass) | ⏭️ skippé — aucun prix (ni page, ni image) |
| Jumia CI | Pièces + prix (marketplace) | ✅ fait |
| CoinAfrique CI | Annonces pièces (prix mixtes) | ✅ fait |
| Annuaire CI | Concurrence | Phase 3 |
| partsouq | OEM compat | Phase 5 (optionnel) |

## Lancer un ingest

```bash
pnpm -F ingest ingest --source=osm
pnpm -F ingest ingest --source=nhtsa
pnpm -F ingest ingest --source=french-models
pnpm -F ingest ingest --source=3h --dry-run --limit=10   # dump JSON dans data/raw/
pnpm -F ingest ingest --source=3h --dry-run              # full crawl ~247 produits
pnpm -F ingest ingest --source=jumia --dry-run --limit=10 # dump JSON dans data/raw/
pnpm -F ingest ingest --source=jumia --dry-run            # full crawl ~900 produits
pnpm -F ingest ingest --source=jumia --commit             # load en DB (vendor shadow "Jumia CI")
pnpm -F ingest ingest --source=coinafrique --dry-run --limit=10
pnpm -F ingest ingest --source=coinafrique --dry-run      # full crawl ~2500 annonces
pnpm -F ingest ingest --source=coinafrique --commit       # load en DB (vendor shadow "CoinAfrique CI")
```

Le pipeline 3H utilise le JSON-LD `schema.org/Product` exposé par Rank Math SEO :
extract des 2 product-sitemaps → fetch chaque fiche → parse JSON-LD → normalize
(name, prix XOF, brand, OEM ref via SKU, condition, image). Sortie en `data/raw/3hautoparts-YYYY-MM-DD.json`.

Le pipeline **Jumia** parse les cartes produit (`article.prd`) de la catégorie
`voiture-pieces-rechange` page par page (cheerio). Le `robots.txt` de Jumia autorise
explicitement le scraping pour un bot identifié à < 200 RPM ; on tourne à 30 RPM avec
un UA de contact. Chaque carte fournit nom, prix FCFA (`.prc`, fourchette → borne basse),
marque, catégorie, image et ID produit (stable, depuis l'URL). Sortie en
`data/raw/jumia-pieces-YYYY-MM-DD.json`. ~900 produits, tous avec prix.

Le pipeline **CoinAfrique** parse les cartes d'annonce (`.ad__card`) de la catégorie
`accessoires-et-pieces-detachees` (cheerio), pagination `?page=N` jusqu'à épuisement
(dédup par `postId` ; le pager est fenêtré et réaffiche la dernière page au-delà de la
borne). Prix mixtes : le texte `.ad__card-price` fait foi (« Prix sur demande » → null) ;
l'attribut `data-ad-price` est trompeur et ignoré. Condition déduite du titre
(« neuf » → NEW, sinon USED). Vendeur shadow `INFORMAL`. ~2500 annonces (~18 % sans prix).

Le **load en DB** (`--commit`) crée/maj un vendeur shadow `isExternal` par source
(clé unique `Vendor.externalSource`) et upsert les `CatalogItem` sur la clé composite
`(externalSource, externalSourceId)`. Migration `Vendor.isExternal` +
`CatalogItem.externalSource/Url/Id` déjà en place.

## Architecture

- `src/sources/<name>.ts` — scraper par source (fetch → JSON brut Zod-validé)
- `src/normalizers/<name>.ts` — mapping JSON brut → entités Prisma
- `src/pipeline/` — orchestration ETL (extract → transform → load)
- `src/lib/` — utilitaires partagés (HTTP, rate-limit, slugify)
- `src/cli.ts` — point d'entrée CLI

Cf `_bmad-output/planning-artifacts/ingest-sources-recensement.md` pour le détail des sources.
