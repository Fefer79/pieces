-- Demandes de pièces des flottes (PartRequest).
--
-- Ces tables existaient dans schema.prisma depuis le 2026-07-28 mais n'avaient
-- jamais eu de migration : elles avaient été créées en local via `db:push`.
-- La migration 20260728_logistics_quote_requests référence `part_requests`
-- (FK part_request_id) et échouait donc sur une base neuve. Cette migration
-- comble le trou et doit rester ordonnée AVANT celle du 28.

-- CreateEnum
CREATE TYPE "PartRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartRequestUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PartRequestSource" AS ENUM ('LOCAL', 'AIR', 'CARGO', 'ANY');

-- CreateTable
CREATE TABLE "part_requests" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "status" "PartRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "part_name" TEXT,
    "category" TEXT,
    "oem_reference" TEXT,
    "urgency" "PartRequestUrgency" NOT NULL DEFAULT 'NORMAL',
    "preferred_source" "PartRequestSource" NOT NULL DEFAULT 'ANY',
    "max_budget" INTEGER,
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_request_photos" (
    "id" TEXT NOT NULL,
    "part_request_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_request_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_request_events" (
    "id" TEXT NOT NULL,
    "part_request_id" TEXT NOT NULL,
    "from_status" "PartRequestStatus",
    "to_status" "PartRequestStatus" NOT NULL,
    "actor_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "part_requests_order_id_key" ON "part_requests"("order_id");

-- CreateIndex
CREATE INDEX "idx_part_requests_enterprise_status" ON "part_requests"("enterprise_id", "status");

-- CreateIndex
CREATE INDEX "idx_part_requests_vehicle" ON "part_requests"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_part_requests_created_by" ON "part_requests"("created_by_user_id");

-- CreateIndex
CREATE INDEX "idx_part_requests_status" ON "part_requests"("status");

-- CreateIndex
CREATE INDEX "idx_part_request_photos_request" ON "part_request_photos"("part_request_id");

-- CreateIndex
CREATE INDEX "idx_part_request_events_request" ON "part_request_events"("part_request_id");

-- CreateIndex
CREATE INDEX "idx_part_request_events_created_at" ON "part_request_events"("created_at");

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_photos" ADD CONSTRAINT "part_request_photos_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_events" ADD CONSTRAINT "part_request_events_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_events" ADD CONSTRAINT "part_request_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
