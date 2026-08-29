-- Garantie figée sur la ligne de commande.
--
-- Depuis le contrat vendeur v1.2, la garantie n'est plus un standard de la
-- plateforme : le vendeur la fixe pièce par pièce et peut n'en donner aucune.
-- L'acheteur doit donc pouvoir prouver ce qui lui a été promis au moment de
-- l'achat, indépendamment des modifications ultérieures de l'annonce.
ALTER TABLE "order_items" ADD COLUMN "warranty_value" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "warranty_unit" "WarrantyUnit";
