-- Invoices foundation (Phase 1 — FNE-CI compliance scaffolding).
-- DGI/FNE integration TBD: fne_validation_number, fne_qr_payload, fne_submitted_at
-- are nullable and will be populated by a future FNE-CI client.
--
-- Per-order invoice: 1 invoice per paid order (unique). Captures HT/TVA/TTC at
-- issue time so amounts are immutable even if the order changes.
--
-- EnterpriseMonthlyInvoice: consolidated record per enterprise/year/month for
-- the comptable. Recomputed on demand from invoices table.

CREATE TABLE "invoices" (
  "id"                      TEXT NOT NULL,
  "order_id"                TEXT NOT NULL,
  "enterprise_id"           TEXT,
  "invoice_number"          TEXT NOT NULL,
  "issued_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "subtotal_ht"             INTEGER NOT NULL,
  "tva_rate"                INTEGER NOT NULL DEFAULT 18,
  "tva_amount"              INTEGER NOT NULL,
  "total_ttc"               INTEGER NOT NULL,
  "fne_validation_number"   TEXT,
  "fne_qr_payload"          TEXT,
  "fne_submitted_at"        TIMESTAMP(3),
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_enterprise_id_fkey"
  FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices" ("order_id");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices" ("invoice_number");
CREATE INDEX "idx_invoices_enterprise" ON "invoices" ("enterprise_id");
CREATE INDEX "idx_invoices_issued_at" ON "invoices" ("issued_at");

CREATE TABLE "enterprise_monthly_invoices" (
  "id"             TEXT NOT NULL,
  "enterprise_id"  TEXT NOT NULL,
  "year"           INTEGER NOT NULL,
  "month"          INTEGER NOT NULL,
  "invoice_count"  INTEGER NOT NULL DEFAULT 0,
  "total_ht"       INTEGER NOT NULL DEFAULT 0,
  "tva_amount"     INTEGER NOT NULL DEFAULT 0,
  "total_ttc"      INTEGER NOT NULL DEFAULT 0,
  "generated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "enterprise_monthly_invoices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "enterprise_monthly_invoices"
  ADD CONSTRAINT "enterprise_monthly_invoices_enterprise_id_fkey"
  FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "uq_enterprise_monthly" ON "enterprise_monthly_invoices" ("enterprise_id", "year", "month");
CREATE INDEX "idx_monthly_invoices_enterprise" ON "enterprise_monthly_invoices" ("enterprise_id");
