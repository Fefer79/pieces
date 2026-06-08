-- Modèle de rémunération du contrat d'adhésion vendeur :
--   COMMISSION : le vendeur fixe librement sa commission (0 % possible) ;
--   REFERRAL   : référencement sans commission, Pièces se rémunère via sa marge.
-- Additif : défaut COMMISSION, contrats existants inchangés.

CREATE TYPE "ContractCommissionModel" AS ENUM ('COMMISSION', 'REFERRAL');

ALTER TABLE "vendor_contracts"
  ADD COLUMN "commission_model" "ContractCommissionModel" NOT NULL DEFAULT 'COMMISSION';
