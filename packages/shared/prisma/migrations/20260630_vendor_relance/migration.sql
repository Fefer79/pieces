-- Relance des fiches vendeurs incomplètes (onboarding minimal : nom + téléphone).
-- Additif : aucune donnée existante touchée.

-- Nouveau type de job pour le scan périodique des vendeurs à relancer.
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'RELANCE_INCOMPLETE_VENDORS_SCAN';

-- Suivi de la dernière relance par vendeur, pour espacer les rappels et plafonner
-- le nombre d'envois (voir vendorRelance.service.ts).
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "relance_last_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "relance_count"        INTEGER NOT NULL DEFAULT 0;
