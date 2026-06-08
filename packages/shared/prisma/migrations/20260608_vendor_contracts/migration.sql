-- Contrat d'adhésion vendeur (CGU) : lien partageable + signature électronique.
-- Un enregistrement par lien généré ; statut PENDING jusqu'à signature, puis
-- ACCEPTED (preuve : nom signé, horodatage, IP, user-agent) ou REVOKED.
-- Additif : aucune donnée existante touchée.

CREATE TYPE "VendorContractStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "vendor_contracts" (
  "id"                  TEXT                   NOT NULL PRIMARY KEY,
  "token"               TEXT                   NOT NULL,
  "contract_version"    TEXT                   NOT NULL,
  "status"              "VendorContractStatus" NOT NULL DEFAULT 'PENDING',
  "vendor_id"           TEXT,
  "seller_name"         TEXT                   NOT NULL,
  "shop_name"           TEXT,
  "phone"               TEXT,
  "created_by_id"       TEXT,
  "signed_name"         TEXT,
  "signed_at"           TIMESTAMP(3),
  "accepted_ip"         TEXT,
  "accepted_user_agent" TEXT,
  "created_at"          TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)           NOT NULL,
  CONSTRAINT "vendor_contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "vendor_contracts_token_key" ON "vendor_contracts"("token");
CREATE INDEX "idx_vendor_contracts_vendor" ON "vendor_contracts"("vendor_id");
CREATE INDEX "idx_vendor_contracts_status" ON "vendor_contracts"("status");
