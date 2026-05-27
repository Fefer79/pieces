-- Aggregate vendor scoring (chantier 5). Snapshot fields recomputed by
-- vendorScore.service. Values may be NULL while the score has never run.

ALTER TABLE "vendors"
  ADD COLUMN "orders_delivered"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "disputes_opened"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "avg_review_rating" DOUBLE PRECISION,
  ADD COLUMN "aggregate_rating"  DOUBLE PRECISION,
  ADD COLUMN "score_updated_at"  TIMESTAMP(3);
