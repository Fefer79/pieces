-- Agent Fiche Terrain (spec v1.1) : fiches produit générées par photo.

-- CreateEnum
CREATE TYPE "EnrichmentOrigin" AS ENUM ('LIAISON', 'VENDEUR');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('BROUILLON', 'EN_MODERATION', 'A_VERIFIER', 'VALIDE', 'BLOQUE');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'ENRICHMENT_FITMENTS';
ALTER TYPE "JobType" ADD VALUE 'ENRICHMENT_SOURCING_SCAN';
ALTER TYPE "JobType" ADD VALUE 'ENRICHMENT_SOURCING_COLLECT';

-- CreateTable
CREATE TABLE "part_enrichments" (
    "id" TEXT NOT NULL,
    "part_id" TEXT,
    "origine" "EnrichmentOrigin" NOT NULL,
    "statut" "EnrichmentStatus" NOT NULL DEFAULT 'BROUILLON',
    "identification" JSONB,
    "classification" JSONB,
    "photo_feedback" TEXT,
    "authenticite" JSONB,
    "fitments" JSONB,
    "sourcing" JSONB,
    "sourcing_batch_id" TEXT,
    "note_qualite" INTEGER,
    "description_independante" TEXT,
    "livrables_approuves_at" TIMESTAMP(3),
    "confiance_globale" DOUBLE PRECISION,
    "photos" TEXT[],
    "photo_hashes" TEXT[],
    "prix" INTEGER,
    "stock_quantite" INTEGER,
    "warranty_value" INTEGER,
    "warranty_unit" TEXT,
    "liaison_id" TEXT,
    "vendeur_id" TEXT,
    "fournisseur_visite" TEXT,
    "corrections" JSONB,
    "tentatives" INTEGER NOT NULL DEFAULT 1,
    "content_validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "validated_at" TIMESTAMP(3),

    CONSTRAINT "part_enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_references" (
    "id" TEXT NOT NULL,
    "ref_source" TEXT NOT NULL,
    "ref_cible" TEXT NOT NULL,
    "marque_cible" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "verifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_contacts" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "url" TEXT NOT NULL,
    "verifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_part_enrichments_liaison" ON "part_enrichments"("liaison_id");

-- CreateIndex
CREATE INDEX "idx_part_enrichments_vendeur_date" ON "part_enrichments"("vendeur_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_part_enrichments_statut" ON "part_enrichments"("statut");

-- CreateIndex
CREATE INDEX "idx_cross_references_source" ON "cross_references"("ref_source");

-- CreateIndex
CREATE UNIQUE INDEX "cross_references_ref_source_ref_cible_marque_cible_key" ON "cross_references"("ref_source", "ref_cible", "marque_cible");

-- CreateIndex
CREATE INDEX "idx_manufacturer_contacts_marque" ON "manufacturer_contacts"("marque");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_contacts_marque_entite_role_key" ON "manufacturer_contacts"("marque", "entite", "role");

-- AddForeignKey
ALTER TABLE "part_enrichments" ADD CONSTRAINT "part_enrichments_liaison_id_fkey" FOREIGN KEY ("liaison_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_enrichments" ADD CONSTRAINT "part_enrichments_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Variantes WebP par photo pour la publication catalogue
ALTER TABLE "part_enrichments" ADD COLUMN "photos_variants" JSONB;
