-- Marge Pièces : montant ajouté par la plateforme au prix vendeur (invisible
-- côté vendeur), inclus dans le prix payé par l'acheteur. Sert le modèle
-- « référencement 0 % » : Pièces se rémunère via la marge plutôt que la commission.
-- Additif : défaut 0, aucune annonce/commande existante impactée.

ALTER TABLE "catalog_items"
  ADD COLUMN "platform_markup" INTEGER NOT NULL DEFAULT 0;

-- Snapshot de la marge au moment de la commande (audit + calcul du reversement).
ALTER TABLE "order_items"
  ADD COLUMN "platform_markup" INTEGER NOT NULL DEFAULT 0;
