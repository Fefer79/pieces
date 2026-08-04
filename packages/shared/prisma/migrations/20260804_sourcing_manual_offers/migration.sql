-- La saisie manuelle devient le mode standard de constitution d'un dossier de
-- sourcing ; la recherche automatique par agent reste possible, au cas par cas.

-- CreateEnum
CREATE TYPE "SourcingSearchOrigin" AS ENUM ('MANUAL', 'AGENT');

-- AlterTable
-- Les dossiers déjà en base viennent tous de l'agent (seul chemin qui existait).
ALTER TABLE "sourcing_searches" ADD COLUMN "origin" "SourcingSearchOrigin" NOT NULL DEFAULT 'AGENT';
ALTER TABLE "sourcing_searches" ALTER COLUMN "origin" SET DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "sourcing_offers" ADD COLUMN "entered_manually" BOOLEAN NOT NULL DEFAULT false;
