-- Mode de livraison choisi par l'acheteur au panier (STANDARD 48-72h / EXPRESS 6h).
-- Persisté sur la commande pour le calcul des frais par palier d'abonnement et
-- hérité par Delivery.mode à la création de la livraison.
ALTER TABLE "orders" ADD COLUMN "delivery_mode" "DeliveryMode" NOT NULL DEFAULT 'STANDARD';
