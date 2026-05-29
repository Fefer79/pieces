-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_actor_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_user_id_fkey";

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "address" TEXT,
ADD COLUMN     "commune" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "managed_by_liaison_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_vendors_managed_by_liaison" ON "vendors"("managed_by_liaison_id");

-- RenameForeignKey
ALTER TABLE "catalog_item_photos" RENAME CONSTRAINT "catalog_item_photos_item_fkey" TO "catalog_item_photos_catalog_item_id_fkey";

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_managed_by_liaison_id_fkey" FOREIGN KEY ("managed_by_liaison_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_catalog_photo_position" RENAME TO "catalog_item_photos_catalog_item_id_position_key";

-- RenameIndex
ALTER INDEX "uq_catalog_items_external" RENAME TO "catalog_items_external_source_external_source_id_key";

-- RenameIndex
ALTER INDEX "uq_enterprise_buffer_item" RENAME TO "enterprise_buffer_stock_enterprise_id_catalog_item_id_key";

-- RenameIndex
ALTER INDEX "uq_enterprise_member" RENAME TO "enterprise_members_enterprise_id_user_id_key";

-- RenameIndex
ALTER INDEX "uq_enterprise_monthly" RENAME TO "enterprise_monthly_invoices_enterprise_id_year_month_key";

-- RenameIndex
ALTER INDEX "uq_part_references_external" RENAME TO "part_references_external_source_external_source_id_key";

-- RenameIndex
ALTER INDEX "uq_vehicle_engines_external" RENAME TO "vehicle_engines_external_source_external_source_id_key";

-- RenameIndex
ALTER INDEX "uq_vehicle_generations_external" RENAME TO "vehicle_generations_external_source_external_source_id_key";

-- RenameIndex
ALTER INDEX "uq_vehicle_makes_external" RENAME TO "vehicle_makes_external_source_external_source_id_key";

-- RenameIndex
ALTER INDEX "uq_vehicle_models_external" RENAME TO "vehicle_models_external_source_external_source_id_key";

