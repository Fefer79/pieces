-- Rubriques « Neuf à importer » / « Occasion à importer » : pièces en stock chez
-- un partenaire international, à faire venir en Côte d'Ivoire.
--
-- Trois briques :
--   1. supplyMode sur CatalogItem/OrderItem — disponibilité physique, axe
--      INDÉPENDANT de la condition (un partenaire allemand vend du neuf, une
--      casse française de l'occasion, même circuit fret + douane).
--   2. fret / douane / acompte / solde sur Order (précommande en deux temps).
--   3. escrow_transactions passe de une à N écritures par commande (DEPOSIT
--      puis BALANCE) ; tout l'historique reste en FULL.
--
-- Idempotent de bout en bout : Render exécute `prisma migrate deploy` et le SQL
-- peut avoir été appliqué à la main sur la prod (sinon P3009 et boucle de
-- redémarrage). Cf. mémoire « render-runs-migrate-deploy ».

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "SupplyMode" AS ENUM ('LOCAL', 'IMPORT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrderType" AS ENUM ('STANDARD', 'IMPORT_PREORDER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EscrowKind" AS ENUM ('FULL', 'DEPOSIT', 'BALANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Nouveaux états de la précommande d'import. `ADD VALUE IF NOT EXISTS` ne peut
-- pas tourner dans un bloc transactionnel avec un usage immédiat : ces valeurs
-- ne sont référencées par aucune donnée dans cette migration.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DEPOSIT_PAID';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_IMPORT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_BALANCE';

-- ---------------------------------------------------------------------------
-- catalog_items — provenance + coût d'achat interne
-- ---------------------------------------------------------------------------
ALTER TABLE "catalog_items"
  ADD COLUMN IF NOT EXISTS "supply_mode" "SupplyMode" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN IF NOT EXISTS "origin_country" TEXT,
  ADD COLUMN IF NOT EXISTS "source_cost_amount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "source_cost_currency" TEXT,
  ADD COLUMN IF NOT EXISTS "source_cost_fcfa" INTEGER,
  ADD COLUMN IF NOT EXISTS "import_margin_pct" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "weight_kg" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "supplier_lead_days" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_catalog_items_supply_mode"
  ON "catalog_items" ("supply_mode", "status");

-- ---------------------------------------------------------------------------
-- vendors — partenaire international
-- ---------------------------------------------------------------------------
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "is_import_partner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "origin_country" TEXT;

-- ---------------------------------------------------------------------------
-- orders — précommande en deux temps
-- ---------------------------------------------------------------------------
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "order_type" "OrderType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "freight_fee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "customs_fee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "logistics_mode" TEXT,
  ADD COLUMN IF NOT EXISTS "deposit_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "balance_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deposit_paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "balance_paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shipment_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_orders_shipment" ON "orders" ("shipment_id");

DO $$ BEGIN
  ALTER TABLE "orders"
    ADD CONSTRAINT "orders_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "shipments" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- order_items — snapshot provenance + coût d'achat
-- ---------------------------------------------------------------------------
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "supply_mode" "SupplyMode" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN IF NOT EXISTS "origin_country" TEXT,
  ADD COLUMN IF NOT EXISTS "source_cost_snapshot" INTEGER,
  ADD COLUMN IF NOT EXISTS "weight_kg" DOUBLE PRECISION;

-- ---------------------------------------------------------------------------
-- escrow_transactions — de une à N écritures par commande
-- ---------------------------------------------------------------------------
ALTER TABLE "escrow_transactions"
  ADD COLUMN IF NOT EXISTS "kind" "EscrowKind" NOT NULL DEFAULT 'FULL';

-- L'ancienne unicité sur order_id seul interdisait l'acompte + solde.
ALTER TABLE "escrow_transactions" DROP CONSTRAINT IF EXISTS "escrow_transactions_order_id_key";
DROP INDEX IF EXISTS "escrow_transactions_order_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_escrow_order_kind"
  ON "escrow_transactions" ("order_id", "kind");
