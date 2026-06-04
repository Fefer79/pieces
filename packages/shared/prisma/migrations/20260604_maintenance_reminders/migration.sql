-- Rappels d'entretien automatiques par WhatsApp.
-- Additif : aucune donnée existante touchée.

-- Nouveau type de job pour le scan quotidien des entretiens dus.
-- (PG 12+ autorise ADD VALUE ; la valeur n'est pas utilisée dans cette migration.)
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'MAINTENANCE_REMINDER_SCAN';

-- Suivi d'envoi par échéance, pour éviter d'envoyer le même rappel chaque jour.
ALTER TABLE "maintenance_schedules"
  ADD COLUMN IF NOT EXISTS "last_notified_at"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_notified_status" TEXT;
