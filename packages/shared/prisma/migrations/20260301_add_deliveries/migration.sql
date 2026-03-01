-- CreateEnum: DeliveryStatus
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'PICKUP_IN_PROGRESS', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'RETURNED');

-- CreateEnum: DeliveryMode
CREATE TYPE "DeliveryMode" AS ENUM ('EXPRESS', 'STANDARD');

-- CreateTable: deliveries
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "rider_id" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "mode" "DeliveryMode" NOT NULL DEFAULT 'STANDARD',
    "pickup_address" TEXT,
    "pickup_lat" DOUBLE PRECISION,
    "pickup_lng" DOUBLE PRECISION,
    "delivery_address" TEXT,
    "delivery_lat" DOUBLE PRECISION,
    "delivery_lng" DOUBLE PRECISION,
    "rider_lat" DOUBLE PRECISION,
    "rider_lng" DOUBLE PRECISION,
    "estimated_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "client_absent" BOOLEAN NOT NULL DEFAULT false,
    "cod_amount" INTEGER,
    "receipt_photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");
CREATE INDEX "idx_deliveries_rider" ON "deliveries"("rider_id");
CREATE INDEX "idx_deliveries_status" ON "deliveries"("status");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_rider_id_fkey"
    FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
