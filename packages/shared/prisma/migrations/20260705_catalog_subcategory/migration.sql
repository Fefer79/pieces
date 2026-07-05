-- Colonne dédiée `subcategory` pour le facettage / reporting indépendant par
-- sous-catégorie. Le champ `category` reste la chaîne combinée
-- "Catégorie / Sous-catégorie" (séparateur " / ") pour l'affichage ; `subcategory`
-- en extrait la partie sous-catégorie, requêtable et agrégeable directement.
-- Rétro-remplissage depuis l'existant : tout ce qui suit le premier " / ".

ALTER TABLE "catalog_items" ADD COLUMN "subcategory" TEXT;
ALTER TABLE "order_items" ADD COLUMN "subcategory" TEXT;

UPDATE "catalog_items"
SET "subcategory" = substring("category" FROM position(' / ' IN "category") + 3)
WHERE "category" LIKE '% / %';

UPDATE "order_items"
SET "subcategory" = substring("category" FROM position(' / ' IN "category") + 3)
WHERE "category" LIKE '% / %';

CREATE INDEX "idx_catalog_items_category" ON "catalog_items" ("category", "subcategory");
