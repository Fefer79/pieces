-- Troisième délai de livraison : ÉCONOMIQUE (3–5 jours), moins cher que le
-- standard 48–72 h. Le prix suit désormais le volume réel (montant du panier
-- ET gabarit de la pièce) — voir packages/shared/constants/delivery-pricing.ts.
--
-- Idempotent : Render exécute `prisma migrate deploy` et le SQL peut avoir été
-- appliqué à la main sur la prod (sinon P3009 et boucle de redémarrage).
ALTER TYPE "DeliveryMode" ADD VALUE IF NOT EXISTS 'ECO';
