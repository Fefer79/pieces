-- Socle ERP interne (erp.pieces.ci) — lot 1 « Structure ».
--
-- N'ajoute qu'une table : le rattachement d'un compte Pièces à l'équipe
-- interne. Les capacités elles-mêmes ne sont pas en base : elles sont dérivées
-- du rôle métier par une matrice statique partagée API ↔ web
-- (packages/shared/constants/erp-rbac.ts).
--
-- ⚠ POURQUOI CETTE MIGRATION EST IDEMPOTENTE
--
-- Une première version de ce socle a été explorée sur la branche
-- `feat/erp-crm-socle` (abandonnée) et sa migration `20260730_erp_socle` a été
-- appliquée à la base de DÉVELOPPEMENT le 31 juillet 2026. Cette base porte
-- donc déjà `StaffRole`, `BusinessUnit` et `staff_members` — avec exactement la
-- même forme que ci-dessous (vérifié colonne par colonne).
--
-- La production, elle, n'a jamais reçu cette branche : elle est vierge de ces
-- objets. Une migration stricte casserait donc en développement, une migration
-- absente manquerait en production. Les gardes `IF NOT EXISTS` font que le même
-- fichier convient aux deux.
--
-- Ce n'est PAS une licence générale : les migrations suivantes doivent rester
-- strictes. L'idempotence se justifie ici par un historique connu et documenté,
-- pas par principe.

-- CreateEnum
-- `CREATE TYPE ... IF NOT EXISTS` n'existe pas en PostgreSQL : on intercepte.
DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM ('DIRECTION', 'COMMERCIAL', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'OPS_LOGISTIQUE', 'SUPPORT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BusinessUnit" AS ENUM ('MARKETPLACE', 'FLOTTE', 'LOGISTIQUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "staff_members" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_staff_members_role" ON "staff_members"("staff_role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_staff_members_active" ON "staff_members"("active");

-- AddForeignKey
-- Une contrainte n'a pas de `IF NOT EXISTS` : on teste le catalogue.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_members_user_id_fkey'
  ) THEN
    ALTER TABLE "staff_members"
      ADD CONSTRAINT "staff_members_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
