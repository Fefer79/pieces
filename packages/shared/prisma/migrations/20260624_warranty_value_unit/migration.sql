-- Garantie vendeur : durée + unité (jours / semaines / mois) au lieu de mois seuls.
-- On ajoute warranty_value + warranty_unit, on rétro-remplit depuis warranty_months
-- (toutes les valeurs existantes étaient en mois), puis on supprime l'ancienne colonne.

CREATE TYPE "WarrantyUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

ALTER TABLE "catalog_items" ADD COLUMN "warranty_value" INTEGER;
ALTER TABLE "catalog_items" ADD COLUMN "warranty_unit" "WarrantyUnit";

-- Rétro-remplissage : l'existant était exprimé en mois.
UPDATE "catalog_items"
SET "warranty_value" = "warranty_months",
    "warranty_unit" = 'MONTH'
WHERE "warranty_months" IS NOT NULL;

ALTER TABLE "catalog_items" DROP COLUMN "warranty_months";
