-- Qui paie ? Choix du checkout, désormais persisté.
--
-- Sans ça, la page /choose/[shareToken] devinait le cadrage à partir du seul
-- viewer connecté : un propriétaire qui payait sa propre commande sans session
-- résolue voyait « Votre mécanicien vous demande d'approuver ».
CREATE TYPE "OrderPayer" AS ENUM ('SELF', 'OWNER_LINK');

ALTER TABLE "orders" ADD COLUMN "payer_mode" "OrderPayer" NOT NULL DEFAULT 'SELF';
