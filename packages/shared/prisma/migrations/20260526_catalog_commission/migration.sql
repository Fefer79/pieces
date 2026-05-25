-- Vendor commission per catalog item.
-- App-layer validation: commission_amount >= max(1000, ROUND(price * 0.05)).
-- commission_accepted_at marks the explicit acceptance of the commission terms.

ALTER TABLE "catalog_items"
  ADD COLUMN "commission_amount" INTEGER,
  ADD COLUMN "commission_accepted_at" TIMESTAMP(3);

-- Backfill: legacy rows get the minimum commission based on existing price (or a 20k fallback).
UPDATE "catalog_items"
SET "commission_amount" = GREATEST(1000, ROUND(COALESCE("price", 20000) * 0.05))
WHERE "commission_amount" IS NULL;
