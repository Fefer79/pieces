-- Réapprovisionnement automatique du stock tampon.
-- Additif : aucune donnée existante touchée.

-- Nouveau type de job pour le scan quotidien des stocks tampons à réapprovisionner.
ALTER TYPE "JobType" ADD VALUE IF NOT EXISTS 'BUFFER_STOCK_REPLENISH_SCAN';

-- Suivi du dernier bon de réappro généré par ligne de stock tampon, pour éviter
-- de regénérer un bon tant que le précédent est récent ou non résolu.
ALTER TABLE "enterprise_buffer_stock"
  ADD COLUMN IF NOT EXISTS "last_replenished_at"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_replenish_order_id"  TEXT;
