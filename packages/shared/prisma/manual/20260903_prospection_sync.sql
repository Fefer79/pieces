-- Synchro prod du module « entretien de démarchage ».
--
-- Ce dépôt migre la base hors de `prisma migrate` (cf. le commentaire de l'enum
-- JobType dans schema.prisma) : ce fichier rejoue à la main le contenu des
-- migrations 20260903_prospection_interviews et 20260903_prospection_lead_kyc_photo.
-- Idempotent : rejouable sans risque, quel que soit l'état actuel de la base.
--
--   cd packages/shared && DATABASE_URL='<prod db.prisma.io>' pnpm exec prisma db execute \
--     --schema prisma/schema.prisma --file prisma/manual/20260903_prospection_sync.sql

-- 1. Enum JobType. Sans cette valeur, le cast ANY($1::"JobType"[]) de
--    queueService.dequeue() échoue en 22P02 et bloque TOUT le worker.
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'PROSPECTION_EXTRACT';

-- 2. Enums de l'entretien.
DO $$ BEGIN
  CREATE TYPE "ProspectionInterviewStatus" AS ENUM
    ('BROUILLON','EN_COURS','A_TRANSCRIRE','TRANSCRIT','EXPLOITE','ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProspectionConsentMethod" AS ENUM ('VERBAL','ECRIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Table des entretiens.
CREATE TABLE IF NOT EXISTS "prospection_interviews" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT,
    "vendor_id" TEXT,
    "conducted_by_id" TEXT NOT NULL,
    "status" "ProspectionInterviewStatus" NOT NULL DEFAULT 'BROUILLON',
    "consent_given_at" TIMESTAMP(3),
    "consent_method" "ProspectionConsentMethod",
    "consent_script_text" TEXT,
    "consent_given_by_id" TEXT,
    "audio_key" TEXT,
    "audio_mime_type" TEXT,
    "audio_duration_sec" INTEGER,
    "audio_size_bytes" INTEGER,
    "transcript" TEXT,
    "transcript_source" TEXT,
    "transcript_segments" JSONB,
    "answers" JSONB,
    "notes" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prospection_interviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_prospection_interviews_prospect"
    ON "prospection_interviews"("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_prospection_interviews_vendor"
    ON "prospection_interviews"("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_prospection_interviews_conductor"
    ON "prospection_interviews"("conducted_by_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_prospection_interviews_status"
    ON "prospection_interviews"("status");

DO $$ BEGIN
  ALTER TABLE "prospection_interviews" ADD CONSTRAINT "prospection_interviews_prospect_id_fkey"
    FOREIGN KEY ("prospect_id") REFERENCES "vendor_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "prospection_interviews" ADD CONSTRAINT "prospection_interviews_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "prospection_interviews" ADD CONSTRAINT "prospection_interviews_conducted_by_id_fkey"
    FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Entretien démarré sur un simple nom, sans fiche prospect.
ALTER TABLE "prospection_interviews"
    ADD COLUMN IF NOT EXISTS "lead_name" TEXT,
    ADD COLUMN IF NOT EXISTS "lead_shop_name" TEXT,
    ADD COLUMN IF NOT EXISTS "lead_phone" TEXT,
    ADD COLUMN IF NOT EXISTS "lead_commune" TEXT;

ALTER TABLE "prospection_interviews"
    DROP CONSTRAINT IF EXISTS "prospection_interviews_target_check";

ALTER TABLE "prospection_interviews"
    ADD CONSTRAINT "prospection_interviews_target_check"
    CHECK (
        "prospect_id" IS NOT NULL
        OR "vendor_id" IS NOT NULL
        OR ("lead_name" IS NOT NULL AND length(btrim("lead_name")) > 0)
    );

-- 5. Photo de la pièce d'identité ; le numéro devient optionnel (informels).
ALTER TABLE "vendor_kyc"
    ADD COLUMN IF NOT EXISTS "document_image_key" TEXT,
    ADD COLUMN IF NOT EXISTS "document_image_mime_type" TEXT,
    ADD COLUMN IF NOT EXISTS "document_image_at" TIMESTAMP(3);

ALTER TABLE "vendor_kyc" ALTER COLUMN "document_number" DROP NOT NULL;
