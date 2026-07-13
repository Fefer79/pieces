-- Fusion des rôles acheteur : MECHANIC + OWNER → BUYER.
-- Le « qui paie ? » n'est plus un rôle mais un choix au checkout.
-- Postgres ne sait pas retirer une valeur d'enum : on recrée le type en deux
-- temps — union des valeurs pour migrer les données, puis type final épuré.

-- 1. Type transitoire (anciennes valeurs + BUYER)
CREATE TYPE "Role_new" AS ENUM ('BUYER', 'MECHANIC', 'OWNER', 'SELLER', 'RIDER', 'ADMIN', 'ENTERPRISE', 'LIAISON', 'DRIVER');
ALTER TABLE "users" ALTER COLUMN "roles" TYPE "Role_new"[] USING ("roles"::text[]::"Role_new"[]);
ALTER TABLE "users" ALTER COLUMN "active_context" TYPE "Role_new" USING ("active_context"::text::"Role_new");
ALTER TABLE "activity_logs" ALTER COLUMN "actor_role" TYPE "Role_new" USING ("actor_role"::text::"Role_new");
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- 2. Migration des données (dédoublonne MECHANIC+OWNER → un seul BUYER)
UPDATE "users"
SET "roles" = ARRAY(
  SELECT DISTINCT CASE WHEN x IN ('MECHANIC', 'OWNER') THEN 'BUYER' ELSE x::text END
  FROM unnest("roles") AS x
)::"Role"[]
WHERE "roles" && ARRAY['MECHANIC', 'OWNER']::"Role"[];

UPDATE "users" SET "active_context" = 'BUYER' WHERE "active_context" IN ('MECHANIC', 'OWNER');
UPDATE "activity_logs" SET "actor_role" = 'BUYER' WHERE "actor_role" IN ('MECHANIC', 'OWNER');

-- 3. Type final sans MECHANIC/OWNER
CREATE TYPE "Role_final" AS ENUM ('BUYER', 'SELLER', 'RIDER', 'ADMIN', 'ENTERPRISE', 'LIAISON', 'DRIVER');
ALTER TABLE "users" ALTER COLUMN "roles" TYPE "Role_final"[] USING ("roles"::text[]::"Role_final"[]);
ALTER TABLE "users" ALTER COLUMN "active_context" TYPE "Role_final" USING ("active_context"::text::"Role_final");
ALTER TABLE "activity_logs" ALTER COLUMN "actor_role" TYPE "Role_final" USING ("actor_role"::text::"Role_final");
DROP TYPE "Role";
ALTER TYPE "Role_final" RENAME TO "Role";
