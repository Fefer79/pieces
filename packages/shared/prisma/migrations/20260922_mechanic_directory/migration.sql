-- Annuaire mécaniciens géolocalisé (mecanicien.pieces.ci). Tables neuves,
-- aucune donnée existante à migrer.

-- CreateEnum
CREATE TYPE "MechanicStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MechanicReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "mechanics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "created_by_liaison_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MechanicStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspended_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "moderated_by_id" TEXT,
    "avg_rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mechanics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanic_reviews" (
    "id" TEXT NOT NULL,
    "mechanic_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_order_id" TEXT,
    "status" "MechanicReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mechanic_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mechanics_user_id_key" ON "mechanics"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mechanics_phone_key" ON "mechanics"("phone");

-- CreateIndex
CREATE INDEX "idx_mechanics_geo" ON "mechanics"("lat", "lng");

-- CreateIndex
CREATE INDEX "idx_mechanics_commune" ON "mechanics"("commune");

-- CreateIndex
CREATE INDEX "idx_mechanics_status" ON "mechanics"("status");

-- CreateIndex
CREATE INDEX "idx_mechanic_reviews_mechanic" ON "mechanic_reviews"("mechanic_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_mechanic_review_mechanic_user" ON "mechanic_reviews"("mechanic_id", "reviewer_id");

-- AddForeignKey
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_created_by_liaison_id_fkey" FOREIGN KEY ("created_by_liaison_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_reviews" ADD CONSTRAINT "mechanic_reviews_mechanic_id_fkey" FOREIGN KEY ("mechanic_id") REFERENCES "mechanics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_reviews" ADD CONSTRAINT "mechanic_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_reviews" ADD CONSTRAINT "mechanic_reviews_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
