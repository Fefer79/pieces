-- Permet de laisser un avis sans compte pieces.ci : nom/téléphone déclarés à
-- la place du compte lié. reviewer_id devient optionnel (auto-rempli si
-- connecté), author_name/author_phone couvrent le cas non connecté.

-- AlterTable
ALTER TABLE "mechanic_reviews" ADD COLUMN IF NOT EXISTS "author_name" TEXT;
ALTER TABLE "mechanic_reviews" ADD COLUMN IF NOT EXISTS "author_phone" TEXT;
ALTER TABLE "mechanic_reviews" ALTER COLUMN "reviewer_id" DROP NOT NULL;

-- DropForeignKey / AddForeignKey: passer reviewer_id_fkey de RESTRICT à SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mechanic_reviews_reviewer_id_fkey'
  ) THEN
    ALTER TABLE "mechanic_reviews" DROP CONSTRAINT "mechanic_reviews_reviewer_id_fkey";
  END IF;
END $$;

ALTER TABLE "mechanic_reviews"
  ADD CONSTRAINT "mechanic_reviews_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
