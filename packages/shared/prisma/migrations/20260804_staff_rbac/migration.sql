-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DIRECTION', 'COMMERCIAL', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'OPS_LOGISTIQUE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "BusinessUnit" AS ENUM ('MARKETPLACE', 'FLOTTE', 'LOGISTIQUE');

-- AlterTable
-- Additif : les profils existants gardent staff_role NULL et n'obtiennent
-- aucune capacité par ce biais. Les administrateurs plateforme (Role.ADMIN)
-- conservent l'accès complet au back-office — c'est l'amorçage, ce sont eux
-- qui attribuent les premiers rôles métier.
ALTER TABLE "team_member_profiles" ADD COLUMN "staff_role" "StaffRole";
ALTER TABLE "team_member_profiles" ADD COLUMN "business_units" "BusinessUnit"[];
