-- CreateEnum
CREATE TYPE "ProspectionInterviewStatus" AS ENUM ('BROUILLON', 'EN_COURS', 'A_TRANSCRIRE', 'TRANSCRIT', 'EXPLOITE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ProspectionConsentMethod" AS ENUM ('VERBAL', 'ECRIT');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'PROSPECTION_EXTRACT';

-- CreateTable
CREATE TABLE "prospection_interviews" (
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

-- CreateIndex
CREATE INDEX "idx_prospection_interviews_prospect" ON "prospection_interviews"("prospect_id");

-- CreateIndex
CREATE INDEX "idx_prospection_interviews_vendor" ON "prospection_interviews"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_prospection_interviews_conductor" ON "prospection_interviews"("conducted_by_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_prospection_interviews_status" ON "prospection_interviews"("status");

-- Rattachement souple : au moins un prospect ou un vendeur.
ALTER TABLE "prospection_interviews"
    ADD CONSTRAINT "prospection_interviews_target_check"
    CHECK ("prospect_id" IS NOT NULL OR "vendor_id" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "prospection_interviews" ADD CONSTRAINT "prospection_interviews_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "vendor_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospection_interviews" ADD CONSTRAINT "prospection_interviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospection_interviews" ADD CONSTRAINT "prospection_interviews_conducted_by_id_fkey" FOREIGN KEY ("conducted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
