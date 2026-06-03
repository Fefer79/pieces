-- Snapshot condition / part source on order items (first-class condition chips on /orders).
-- Additive + nullable: existing rows keep NULL (chip simply omitted). Enums already exist.

ALTER TABLE "order_items" ADD COLUMN "condition" "PartCondition";
ALTER TABLE "order_items" ADD COLUMN "part_source" "PartSource";
