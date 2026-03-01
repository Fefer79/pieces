-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED');

-- CreateTable
CREATE TABLE "seller_reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_reviews" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_seller_reviews_vendor" ON "seller_reviews"("vendor_id");
CREATE UNIQUE INDEX "uq_seller_review_order_user" ON "seller_reviews"("order_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "idx_delivery_reviews_rider" ON "delivery_reviews"("rider_id");
CREATE UNIQUE INDEX "uq_delivery_review_delivery_user" ON "delivery_reviews"("delivery_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "idx_disputes_order" ON "disputes"("order_id");

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_reviews" ADD CONSTRAINT "delivery_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
