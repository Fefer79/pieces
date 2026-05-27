-- Structured vehicle compatibility for catalog items.
-- Replaces the free-text vehicle_compatibility column with a normalized
-- table so a part can declare N fitments (brand + optional model/year/engine).
-- The legacy vehicle_compatibility column is kept for one release for rollback.

CREATE TABLE "catalog_item_fitments" (
  "id"              TEXT NOT NULL,
  "catalog_item_id" TEXT NOT NULL,
  "brand"           TEXT NOT NULL,
  "model"           TEXT,
  "year_from"       INTEGER,
  "year_to"         INTEGER,
  "engine"          TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalog_item_fitments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "catalog_item_fitments"
  ADD CONSTRAINT "catalog_item_fitments_catalog_item_id_fkey"
  FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_fitments_brand_model" ON "catalog_item_fitments" ("brand", "model");
CREATE INDEX "idx_fitments_item"         ON "catalog_item_fitments" ("catalog_item_id");

CREATE INDEX "idx_catalog_items_oem_group"
  ON "catalog_items" ("oem_reference", "part_source", "condition");
