-- Socle ERP interne (erp.pieces.ci) — lot 1 « Structure ».
--
-- N'ajoute qu'une table : le rattachement d'un compte Pièces à l'équipe
-- interne. Les capacités elles-mêmes ne sont pas en base : elles sont dérivées
-- du rôle métier par une matrice statique partagée API ↔ web
-- (packages/shared/constants/erp-rbac.ts).

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DIRECTION', 'COMMERCIAL', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'OPS_LOGISTIQUE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "BusinessUnit" AS ENUM ('MARKETPLACE', 'FLOTTE', 'LOGISTIQUE');

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "staff_role" "StaffRole" NOT NULL,
    "business_units" "BusinessUnit"[],
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_staff_members_role" ON "staff_members"("staff_role");

-- CreateIndex
CREATE INDEX "idx_staff_members_active" ON "staff_members"("active");

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
