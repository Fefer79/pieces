-- Multi-photo support for catalog items (max 3 enforced at app layer).
-- The legacy single-image columns on catalog_items are kept for backward compat
-- but new code reads/writes through this table. Position 0 is the cover photo.

CREATE TABLE "catalog_item_photos" (
  "id"              TEXT         NOT NULL PRIMARY KEY,
  "catalog_item_id" TEXT         NOT NULL,
  "position"        INTEGER      NOT NULL,
  "url_original"    TEXT         NOT NULL,
  "url_thumb"       TEXT,
  "url_small"       TEXT,
  "url_medium"      TEXT,
  "url_large"       TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_item_photos_item_fkey"
    FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_catalog_photo_position"
  ON "catalog_item_photos"("catalog_item_id", "position");
CREATE INDEX "idx_catalog_photos_item"
  ON "catalog_item_photos"("catalog_item_id");

-- Backfill: move the existing single image into a position-0 photo for each item that has one.
INSERT INTO "catalog_item_photos"
  (id, catalog_item_id, position, url_original, url_thumb, url_small, url_medium, url_large)
SELECT
  gen_random_uuid()::text, id, 0,
  image_original_url, image_thumb_url, image_small_url, image_medium_url, image_large_url
FROM "catalog_items"
WHERE image_original_url IS NOT NULL;
