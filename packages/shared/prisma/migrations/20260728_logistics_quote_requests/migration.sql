-- Logistique : demandes de cotation (logistique.pieces.ci)
-- Un seul modèle pour les trois parcours (visiteur / compte / flotte) —
-- ce sont les rattachements nullables qui font la différence.

-- CreateEnum
CREATE TYPE "LogisticsLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTING', 'QUOTED', 'WON', 'LOST', 'SPAM');

-- CreateEnum
CREATE TYPE "LogisticsLeadSurface" AS ENUM ('LANDING', 'CALCULATEUR', 'CAMPAIGN', 'WHATSAPP', 'REFERRAL', 'APP', 'FLEET');

-- CreateEnum
CREATE TYPE "LogisticsLeadPhotoKind" AS ENUM ('PART', 'REGISTRATION_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "LogisticsCustomerType" AS ENUM ('GARAGE', 'FLEET', 'DEALER', 'IMPORTER', 'INDIVIDUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadCertaintyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VehicleEconomyCategory" AS ENUM ('ECONOMY_ICE', 'PREMIUM_ICE', 'PREMIUM_EV');

-- CreateTable
CREATE TABLE "logistics_quote_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "LogisticsLeadStatus" NOT NULL DEFAULT 'NEW',
    "user_id" TEXT,
    "enterprise_id" TEXT,
    "vehicle_id" TEXT,
    "part_request_id" TEXT,
    "contact_name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "commune" TEXT,
    "customer_type" "LogisticsCustomerType" NOT NULL DEFAULT 'OTHER',
    "fleet_size" INTEGER,
    "part_name" TEXT NOT NULL,
    "part_category" TEXT,
    "oem_reference" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "part_price_hint" INTEGER,
    "family_id" TEXT,
    "vin" TEXT,
    "vin_decoded" BOOLEAN NOT NULL DEFAULT false,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_year" INTEGER,
    "energy_type" "VehicleEnergyType",
    "economy_category" "VehicleEconomyCategory",
    "vehicle_immobilized" BOOLEAN NOT NULL DEFAULT false,
    "certainty_score" INTEGER NOT NULL DEFAULT 0,
    "certainty_level" "LeadCertaintyLevel" NOT NULL DEFAULT 'LOW',
    "downtime_cost_per_day" INTEGER,
    "estimate_json" JSONB,
    "surface" "LogisticsLeadSurface" NOT NULL DEFAULT 'LANDING',
    "campaign" TEXT,
    "referer" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "consent_at" TIMESTAMP(3),
    "upload_token_hash" TEXT,
    "upload_token_expires_at" TIMESTAMP(3),
    "assigned_to_user_id" TEXT,
    "ops_note" TEXT,
    "contacted_at" TIMESTAMP(3),
    "quoted_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "lost_reason" TEXT,
    "converted_enterprise_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_quote_request_photos" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "kind" "LogisticsLeadPhotoKind" NOT NULL,
    "url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_quote_request_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_quote_request_events" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "from_status" "LogisticsLeadStatus",
    "to_status" "LogisticsLeadStatus",
    "actor_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_quote_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "logistics_quote_requests_reference_key" ON "logistics_quote_requests"("reference");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_status" ON "logistics_quote_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_phone" ON "logistics_quote_requests"("phone");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_ip" ON "logistics_quote_requests"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_assignee" ON "logistics_quote_requests"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_certainty" ON "logistics_quote_requests"("certainty_level");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_user" ON "logistics_quote_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_enterprise" ON "logistics_quote_requests"("enterprise_id", "status");

-- CreateIndex
CREATE INDEX "idx_logistics_lead_photos_request" ON "logistics_quote_request_photos"("quote_request_id");

-- CreateIndex
CREATE INDEX "idx_logistics_lead_events_request" ON "logistics_quote_request_events"("quote_request_id", "created_at");

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_request_photos" ADD CONSTRAINT "logistics_quote_request_photos_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "logistics_quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_request_events" ADD CONSTRAINT "logistics_quote_request_events_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "logistics_quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
