-- Enrichit les avis mécaniciens (coût payé, photos-preuve) et permet de
-- géolocaliser précisément une suggestion dès le dépôt.

-- AlterTable
ALTER TABLE "mechanic_reviews" ADD COLUMN IF NOT EXISTS "amount_paid" INTEGER;
ALTER TABLE "mechanic_reviews" ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "mechanic_suggestions" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "mechanic_suggestions" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
