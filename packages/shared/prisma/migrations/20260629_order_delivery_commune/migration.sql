-- Lieu de livraison choisi par l'acheteur au panier : persisté sur la commande
-- pour calculer les frais (forfait commune × nb vendeurs) et pré-remplir
-- l'adresse de la livraison (Delivery.deliveryAddress) pour le rider.
ALTER TABLE "orders" ADD COLUMN "delivery_commune" TEXT;
