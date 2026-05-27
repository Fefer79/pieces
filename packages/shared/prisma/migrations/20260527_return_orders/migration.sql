-- Return order workflow (chantier 8): structured reverse logistics
-- separate from the existing free-form Dispute model. Status state machine:
-- REQUESTED → ACCEPTED → PICKED_UP → INSPECTED → REFUNDED | REJECTED
-- Cancel allowed from REQUESTED / ACCEPTED.

CREATE TYPE "ReturnReason" AS ENUM (
  'DEFECTIVE',
  'WRONG_PART',
  'NOT_AS_DESCRIBED',
  'NO_LONGER_NEEDED',
  'OTHER'
);

CREATE TYPE "ReturnStatus" AS ENUM (
  'REQUESTED',
  'ACCEPTED',
  'PICKED_UP',
  'INSPECTED',
  'REFUNDED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "return_orders" (
  "id"                    TEXT NOT NULL,
  "order_id"              TEXT NOT NULL,
  "order_item_id"         TEXT,
  "enterprise_id"         TEXT,
  "requested_by_id"       TEXT NOT NULL,
  "reason"                "ReturnReason" NOT NULL,
  "description"           TEXT,
  "pickup_address"        TEXT,
  "pickup_contact_name"   TEXT,
  "pickup_contact_phone"  TEXT,
  "status"                "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "refund_amount"         INTEGER,
  "evidence"              TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  "requested_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at"           TIMESTAMP(3),
  "picked_up_at"          TIMESTAMP(3),
  "inspected_at"          TIMESTAMP(3),
  "refunded_at"           TIMESTAMP(3),
  "rejected_at"           TIMESTAMP(3),
  "cancelled_at"          TIMESTAMP(3),
  "resolution_note"       TEXT,
  "updated_at"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "return_orders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "return_orders"
  ADD CONSTRAINT "return_orders_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "return_orders"
  ADD CONSTRAINT "return_orders_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_return_orders_order"             ON "return_orders" ("order_id");
CREATE INDEX "idx_return_orders_enterprise_status" ON "return_orders" ("enterprise_id", "status");
CREATE INDEX "idx_return_orders_status"            ON "return_orders" ("status");
