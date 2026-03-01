-- CreateEnum: OrderStatus
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'VENDOR_CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum: PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'COD');

-- CreateEnum: EscrowStatus
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED');

-- CreateTable: orders
CREATE TABLE "orders" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "initiator_id" TEXT NOT NULL,
    "owner_phone" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_method" "PaymentMethod",
    "share_token" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "labor_cost" INTEGER,
    "vendor_confirmed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_items
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "vendor_shop_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "image_thumb_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_events
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "actor" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: escrow_transactions
CREATE TABLE "escrow_transactions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "held_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_share_token_key" ON "orders"("share_token");
CREATE INDEX "idx_orders_initiator" ON "orders"("initiator_id");
CREATE INDEX "idx_orders_status" ON "orders"("status");
CREATE INDEX "idx_order_items_order" ON "order_items"("order_id");
CREATE INDEX "idx_order_events_order" ON "order_events"("order_id");
CREATE UNIQUE INDEX "escrow_transactions_order_id_key" ON "escrow_transactions"("order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_initiator_id_fkey"
    FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
