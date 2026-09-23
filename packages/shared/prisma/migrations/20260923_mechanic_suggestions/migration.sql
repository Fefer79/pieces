-- Suggestions de mécaniciens absents de l'annuaire — dépôt ouvert, modéré
-- avant de devenir une fiche `mechanics`. Table neuve, aucune donnée à migrer.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MechanicSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "mechanic_suggestions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "commune" TEXT,
    "address" TEXT,
    "specialty" TEXT,
    "note" TEXT,
    "suggested_by_id" TEXT,
    "status" "MechanicSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "moderated_by_id" TEXT,
    "moderated_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_mechanic_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mechanic_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_mechanic_suggestions_status" ON "mechanic_suggestions"("status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "mechanic_suggestions" ADD CONSTRAINT "mechanic_suggestions_suggested_by_id_fkey" FOREIGN KEY ("suggested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "mechanic_suggestions" ADD CONSTRAINT "mechanic_suggestions_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
