-- CreateEnum
CREATE TYPE "CatalogItemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('IMAGE_PROCESS_VARIANTS', 'CATALOG_AI_IDENTIFY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT,
    "oem_reference" TEXT,
    "vehicle_compatibility" TEXT,
    "suggested_price" INTEGER,
    "price" INTEGER,
    "status" "CatalogItemStatus" NOT NULL DEFAULT 'DRAFT',
    "image_original_url" TEXT,
    "image_thumb_url" TEXT,
    "image_small_url" TEXT,
    "image_medium_url" TEXT,
    "image_large_url" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "quality_score" DOUBLE PRECISION,
    "quality_issue" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_catalog_items_vendor_status" ON "catalog_items"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "idx_jobs_status_type" ON "jobs"("status", "type");

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
