-- Sourcing & Expéditions — docs/sourcing-expeditions-plan-2026-08.md
--
-- Relie le besoin client (logistics_quote_requests / part_requests) à l'achat
-- (purchase_orders) : recherche d'offres par agent, arbitrage, puis suivi du
-- colis jusqu'à Abidjan.

-- AlterEnum
-- ALTER TYPE ... ADD VALUE ne peut pas tourner dans le même bloc transactionnel
-- que son usage ; Prisma migrate exécute ce fichier statement par statement, et
-- aucune colonne ci-dessous n'utilise cette valeur, donc c'est sans risque.
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'SOURCING_SEARCH_RUN';

-- CreateEnum
CREATE TYPE "SourcingSearchStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "SourcingOfferStatus" AS ENUM ('CANDIDATE', 'SHORTLISTED', 'CONTACTED', 'REJECTED', 'ORDERED');

-- CreateEnum
CREATE TYPE "SourcingChannel" AS ENUM ('MARKETPLACE_INTL', 'DISTRIBUTOR_REGIONAL', 'EXPORTER', 'MANUFACTURER', 'LOCAL');

-- CreateEnum
CREATE TYPE "ShipmentCarrier" AS ENUM ('DHL', 'FEDEX', 'UPS', 'TRANSITAIRE', 'AIR_CARGO', 'SEA_LCL', 'POSTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('SOURCING', 'COLLECTED', 'IN_TRANSIT', 'CUSTOMS', 'LOCAL_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sourcing_searches" (
    "id" TEXT NOT NULL,
    "status" "SourcingSearchStatus" NOT NULL DEFAULT 'PENDING',
    "quote_request_id" TEXT,
    "part_request_id" TEXT,
    "part_name" TEXT NOT NULL,
    "oem_reference" TEXT,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_year" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcing_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourcing_offers" (
    "id" TEXT NOT NULL,
    "search_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "channel" "SourcingChannel" NOT NULL DEFAULT 'MARKETPLACE_INTL',
    "country" TEXT,
    "city" TEXT,
    "url" TEXT,
    "source_site" TEXT,
    "title" TEXT,
    "brand" TEXT,
    "oem_reference" TEXT,
    "condition_label" TEXT,
    "condition" "PartCondition",
    "price_amount" DOUBLE PRECISION,
    "price_currency" TEXT,
    "price_fcfa" INTEGER,
    "price_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "shipping_amount" DOUBLE PRECISION,
    "moq" INTEGER,
    "lead_time_days" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "availability" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_whatsapp" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SourcingOfferStatus" NOT NULL DEFAULT 'CANDIDATE',
    "ops_note" TEXT,
    "chosen_mode" TEXT,
    "purchase_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sourcing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'SOURCING',
    "purchase_order_id" TEXT,
    "quote_request_id" TEXT,
    "carrier" "ShipmentCarrier" NOT NULL DEFAULT 'TRANSITAIRE',
    "carrier_other" TEXT,
    "tracking_number" TEXT,
    "tracking_url" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'AIR_STANDARD',
    "origin_country" TEXT,
    "origin_city" TEXT,
    "departed_at" TIMESTAMP(3),
    "eta_at" TIMESTAMP(3),
    "customs_cleared_at" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "weight_kg" DOUBLE PRECISION,
    "volume_dm3" DOUBLE PRECISION,
    "chargeable_weight_kg" DOUBLE PRECISION,
    "freight_cost_fcfa" INTEGER,
    "customs_cost_fcfa" INTEGER,
    "last_mile_cost_fcfa" INTEGER,
    "total_cost_fcfa" INTEGER,
    "public_token_hash" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_events" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "from_status" "ShipmentStatus",
    "to_status" "ShipmentStatus",
    "label" TEXT NOT NULL,
    "location" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sourcing_searches_status" ON "sourcing_searches"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_sourcing_searches_quote_request" ON "sourcing_searches"("quote_request_id");

-- CreateIndex
CREATE INDEX "idx_sourcing_searches_part_request" ON "sourcing_searches"("part_request_id");

-- CreateIndex
CREATE INDEX "idx_sourcing_offers_search" ON "sourcing_offers"("search_id", "status");

-- CreateIndex
CREATE INDEX "idx_sourcing_offers_po" ON "sourcing_offers"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_reference_key" ON "shipments"("reference");

-- CreateIndex
CREATE INDEX "idx_shipments_status" ON "shipments"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_shipments_po" ON "shipments"("purchase_order_id");

-- CreateIndex
CREATE INDEX "idx_shipments_quote_request" ON "shipments"("quote_request_id");

-- CreateIndex
CREATE INDEX "idx_shipment_events_shipment" ON "shipment_events"("shipment_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "sourcing_searches" ADD CONSTRAINT "sourcing_searches_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "logistics_quote_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_searches" ADD CONSTRAINT "sourcing_searches_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_searches" ADD CONSTRAINT "sourcing_searches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_offers" ADD CONSTRAINT "sourcing_offers_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "sourcing_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sourcing_offers" ADD CONSTRAINT "sourcing_offers_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "logistics_quote_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
