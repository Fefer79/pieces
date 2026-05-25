-- Track which liaison (User) created a catalog item on behalf of a vendor.
-- Nullable: legacy rows and items created directly by the vendor have no liaison.

ALTER TABLE "catalog_items"
  ADD COLUMN "created_by_liaison_id" TEXT;

ALTER TABLE "catalog_items"
  ADD CONSTRAINT "catalog_items_created_by_liaison_id_fkey"
  FOREIGN KEY ("created_by_liaison_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_catalog_items_created_by_liaison"
  ON "catalog_items"("created_by_liaison_id");
