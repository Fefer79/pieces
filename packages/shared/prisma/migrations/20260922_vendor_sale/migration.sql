-- Carnet numérique du vendeur : vente enregistrée hors du parcours commande
-- pieces.ci (boutique, WhatsApp, téléphone). Table neuve, aucune donnée
-- existante à migrer.

-- CreateEnum
CREATE TYPE "VendorSaleChannel" AS ENUM ('BOUTIQUE', 'WHATSAPP', 'TELEPHONE', 'AUTRE');

-- CreateTable
CREATE TABLE "vendor_sales" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "catalog_item_id" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "buyer_name" TEXT,
    "buyer_phone" TEXT,
    "channel" "VendorSaleChannel" NOT NULL DEFAULT 'BOUTIQUE',
    "note" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_vendor_sales_vendor_date" ON "vendor_sales"("vendor_id", "sold_at");

-- CreateIndex
CREATE INDEX "idx_vendor_sales_catalog_item" ON "vendor_sales"("catalog_item_id");

-- AddForeignKey
ALTER TABLE "vendor_sales" ADD CONSTRAINT "vendor_sales_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_sales" ADD CONSTRAINT "vendor_sales_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_sales" ADD CONSTRAINT "vendor_sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
