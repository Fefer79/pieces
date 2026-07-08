-- Suivi de quantité en stock par pièce + seuil d'alerte stock faible.
-- stock_quantity NULL = quantité non suivie (comportement historique : inStock manuel).
ALTER TABLE "catalog_items" ADD COLUMN "stock_quantity" INTEGER;
ALTER TABLE "catalog_items" ADD COLUMN "low_stock_threshold" INTEGER NOT NULL DEFAULT 1;
