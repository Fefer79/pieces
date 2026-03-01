-- Add stock management and price tracking fields to catalog_items

ALTER TABLE "catalog_items" ADD COLUMN "in_stock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "catalog_items" ADD COLUMN "price_updated_at" TIMESTAMP(3);
ALTER TABLE "catalog_items" ADD COLUMN "price_alert_flag" BOOLEAN NOT NULL DEFAULT false;
