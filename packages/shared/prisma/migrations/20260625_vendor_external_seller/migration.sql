-- Un Vendor par vendeur réel pour les sources externes (CoinAfrique…).
-- Avant : un seul vendeur fantôme par source (unique sur external_source).
-- Après : on déduplique sur (external_source, external_seller_id), où external_seller_id
-- est l'identité stable du vendeur côté source (UUID `data-user-id` CoinAfrique).
-- Le vendeur fantôme existant devient le fallback et reçoit le sentinel '__shadow__'.

ALTER TABLE "vendors" ADD COLUMN "external_seller_id" TEXT;

-- L'ancien vendeur fantôme CoinAfrique devient le fallback.
UPDATE "vendors"
SET "external_seller_id" = '__shadow__'
WHERE "external_source" IS NOT NULL;

-- Remplace l'unicité mono-colonne par l'unicité composite (source, seller).
DROP INDEX IF EXISTS "vendors_external_source_key";

CREATE UNIQUE INDEX "uq_vendors_external_seller"
  ON "vendors"("external_source", "external_seller_id");
