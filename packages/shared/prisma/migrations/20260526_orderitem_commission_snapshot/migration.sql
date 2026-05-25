-- Snapshot the vendor commission at order-item creation time so admin
-- analytics reflect what was actually owed even if the vendor later
-- changes their commission on the catalog item.

ALTER TABLE "order_items"
  ADD COLUMN "commission_amount" INTEGER;
