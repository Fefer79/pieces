-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEPTION', 'SORTIE_COMMANDE', 'AJUSTEMENT', 'RESTITUTION');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('BROUILLON', 'ENVOYEE', 'EN_TRANSIT', 'RECEPTION_PARTIELLE', 'RECEPTIONNEE', 'ANNULEE');

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "is_internal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ENTREPOT',
    "commune" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "qty_on_hand" INTEGER NOT NULL DEFAULT 0,
    "seuil_bas" INTEGER NOT NULL DEFAULT 2,
    "cump_fcfa" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "cout_unitaire_fcfa" INTEGER,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "note" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "pays" TEXT,
    "ville" TEXT,
    "contact_name" TEXT,
    "telephone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "site" TEXT,
    "devise" TEXT NOT NULL DEFAULT 'AED',
    "delai_typique_jours" INTEGER,
    "conditions" TEXT,
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "destination_id" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'LOCAL',
    "statut" "PurchaseOrderStatus" NOT NULL DEFAULT 'BROUILLON',
    "devise" TEXT NOT NULL DEFAULT 'FCFA',
    "taux_change" INTEGER,
    "montant_estime_fcfa" INTEGER,
    "frais_estimes" JSONB,
    "montant_reel_fcfa" INTEGER,
    "envoye_at" TIMESTAMP(3),
    "eta_at" TIMESTAMP(3),
    "recu_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "catalog_item_id" TEXT,
    "designation" TEXT NOT NULL,
    "oem_reference" TEXT,
    "quantite" INTEGER NOT NULL,
    "quantite_recue" INTEGER NOT NULL DEFAULT 0,
    "prix_unitaire" DOUBLE PRECISION NOT NULL,
    "poids_estime_kg" DOUBLE PRECISION,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_stock_levels_location" ON "stock_levels"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_catalog_item_id_location_id_key" ON "stock_levels"("catalog_item_id", "location_id");

-- CreateIndex
CREATE INDEX "idx_stock_movements_item" ON "stock_movements"("catalog_item_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_stock_movements_location" ON "stock_movements"("location_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_numero_key" ON "purchase_orders"("numero");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_statut" ON "purchase_orders"("statut");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_supplier" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_purchase_order_items_po" ON "purchase_order_items"("purchase_order_id");

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "stock_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "stock_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

