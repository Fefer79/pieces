-- Sépare le montant payé en pièces détachées / main d'œuvre — plus parlant
-- pour comparer les ateliers qu'un montant global. amount_paid (historique)
-- reste en place pour les avis existants.

ALTER TABLE "mechanic_reviews" ADD COLUMN IF NOT EXISTS "parts_amount" INTEGER;
ALTER TABLE "mechanic_reviews" ADD COLUMN IF NOT EXISTS "labor_amount" INTEGER;
