-- Rattrapage : la colonne `lead_address` et la levée de la contrainte de cible
-- ont été ajoutées APRÈS coup au dossier 20260918_prospection_anonymous_interview,
-- déjà enregistré comme appliqué en prod. `migrate deploy` ne rejoue jamais une
-- migration appliquée : la prod tournait donc sans `lead_address` et tout appel
-- à /prospection/interviews cassait (Prisma P2022).
--
-- Ce dossier rejoue le même SQL, idempotent, pour rattraper les bases déjà à jour
-- de la 20260918.

ALTER TABLE "prospection_interviews"
    DROP CONSTRAINT IF EXISTS "prospection_interviews_target_check";

ALTER TABLE "prospection_interviews"
    ADD COLUMN IF NOT EXISTS "lead_address" TEXT;
