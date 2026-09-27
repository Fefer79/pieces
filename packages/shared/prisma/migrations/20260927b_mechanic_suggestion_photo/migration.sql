-- Une photo peut accompagner une suggestion (import contact ou upload manuel),
-- reprise sur la fiche Mechanic si la suggestion est approuvée.

-- AlterTable
ALTER TABLE "mechanic_suggestions" ADD COLUMN IF NOT EXISTS "photo" TEXT;
