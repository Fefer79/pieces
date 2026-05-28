-- Phase A: enable external-source tracking on the vehicle catalog tree + part references,
-- so ingest scrapers (global-auto, etc.) can upsert idempotently by upstream ID.

ALTER TABLE "vehicle_makes"
  ADD COLUMN "external_source" TEXT,
  ADD COLUMN "external_source_id" TEXT;

ALTER TABLE "vehicle_models"
  ADD COLUMN "external_source" TEXT,
  ADD COLUMN "external_source_id" TEXT;

ALTER TABLE "vehicle_generations"
  ADD COLUMN "external_source" TEXT,
  ADD COLUMN "external_source_id" TEXT;

ALTER TABLE "vehicle_engines"
  ADD COLUMN "external_source" TEXT,
  ADD COLUMN "external_source_id" TEXT;

ALTER TABLE "part_references"
  ADD COLUMN "external_source" TEXT,
  ADD COLUMN "external_source_id" TEXT;

CREATE UNIQUE INDEX "uq_vehicle_makes_external"
  ON "vehicle_makes"("external_source", "external_source_id");

CREATE UNIQUE INDEX "uq_vehicle_models_external"
  ON "vehicle_models"("external_source", "external_source_id");

CREATE UNIQUE INDEX "uq_vehicle_generations_external"
  ON "vehicle_generations"("external_source", "external_source_id");

CREATE UNIQUE INDEX "uq_vehicle_engines_external"
  ON "vehicle_engines"("external_source", "external_source_id");

CREATE UNIQUE INDEX "uq_part_references_external"
  ON "part_references"("external_source", "external_source_id");

-- New ingest source for global-auto.online
ALTER TYPE "IngestSource" ADD VALUE 'GLOBAL_AUTO_CI';
