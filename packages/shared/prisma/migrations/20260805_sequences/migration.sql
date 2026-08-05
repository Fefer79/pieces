-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_sequence_key_period" ON "sequences"("key", "year", "month");

-- Amorçage depuis les factures déjà émises.
--
-- Sans ça, le compteur repartirait de 1 pour le mois en cours et le premier
-- numéro généré entrerait en collision avec une facture existante
-- (`invoice_number` est UNIQUE) — soit exactement la panne qu'on corrige.
--
-- On lit le MAX du suffixe plutôt qu'un COUNT : si la série a un trou (une
-- création échouée par le passé), le COUNT redonnerait un numéro déjà pris.
INSERT INTO "sequences" ("id", "key", "year", "month", "next_value", "updated_at")
SELECT
    gen_random_uuid()::text,
    'INVOICE',
    EXTRACT(YEAR FROM "issued_at")::int,
    EXTRACT(MONTH FROM "issued_at")::int,
    MAX(split_part("invoice_number", '-', 3)::int) + 1,
    NOW()
FROM "invoices"
WHERE "invoice_number" ~ '^[A-Z]+-[0-9]{6}-[0-9]+$'
GROUP BY 2, 3, 4;
