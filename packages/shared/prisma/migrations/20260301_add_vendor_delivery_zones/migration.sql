-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "delivery_zones" TEXT[] NOT NULL DEFAULT '{}';
