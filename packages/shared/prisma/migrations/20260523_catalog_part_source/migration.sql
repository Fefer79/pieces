-- Add part_source dimension (OEM / AFTERMARKET / COMPATIBLE) to catalog items.
-- Orthogonal to condition (NEW/USED/REFURBISHED). Nullable for legacy rows.

CREATE TYPE "PartSource" AS ENUM ('OEM', 'AFTERMARKET', 'COMPATIBLE');

ALTER TABLE "catalog_items" ADD COLUMN "part_source" "PartSource";
