-- CreateEnum
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('BROUILLON', 'PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "MarketingAudienceType" AS ENUM ('SEGMENT_CLIENT', 'SEGMENT_VENDEUR', 'TAG');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'MARKETING_CAMPAIGN_SEND';

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience_type" "MarketingAudienceType" NOT NULL,
    "audience_value" TEXT NOT NULL,
    "statut" "MarketingCampaignStatus" NOT NULL DEFAULT 'BROUILLON',
    "total_cibles" INTEGER NOT NULL DEFAULT 0,
    "envoyes" INTEGER NOT NULL DEFAULT 0,
    "echecs" INTEGER NOT NULL DEFAULT 0,
    "optouts" INTEGER NOT NULL DEFAULT 0,
    "sans_telephone" INTEGER NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_campaigns_statut_idx" ON "marketing_campaigns"("statut");

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
