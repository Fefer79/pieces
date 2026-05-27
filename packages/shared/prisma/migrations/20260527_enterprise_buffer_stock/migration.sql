-- Enterprise buffer stock (chantier 9): per-enterprise reserved inventory
-- for critical SKUs (filters, brake pads, etc.) so Pièces can guarantee
-- 24h availability on high-rotation references.

CREATE TABLE "enterprise_buffer_stock" (
  "id"             TEXT NOT NULL,
  "enterprise_id"  TEXT NOT NULL,
  "catalog_item_id" TEXT NOT NULL,
  "target_qty"     INTEGER NOT NULL,
  "current_qty"    INTEGER NOT NULL DEFAULT 0,
  "auto_replenish" BOOLEAN NOT NULL DEFAULT false,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "enterprise_buffer_stock_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "enterprise_buffer_stock"
  ADD CONSTRAINT "enterprise_buffer_stock_enterprise_id_fkey"
  FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_buffer_stock"
  ADD CONSTRAINT "enterprise_buffer_stock_catalog_item_id_fkey"
  FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "uq_enterprise_buffer_item" ON "enterprise_buffer_stock" ("enterprise_id", "catalog_item_id");
CREATE INDEX "idx_buffer_stock_enterprise"      ON "enterprise_buffer_stock" ("enterprise_id");
