-- Vendor: support for external (shadow) vendors used by ingest scrapers
ALTER TABLE "vendors"
  ADD COLUMN "is_external" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "external_source" TEXT;

-- CatalogItem: link to upstream external listing
ALTER TABLE "catalog_items"
  ADD COLUMN "external_source" TEXT,
  ADD COLUMN "external_source_id" TEXT,
  ADD COLUMN "external_source_url" TEXT;

CREATE UNIQUE INDEX "uq_catalog_items_external"
  ON "catalog_items"("external_source", "external_source_id");
