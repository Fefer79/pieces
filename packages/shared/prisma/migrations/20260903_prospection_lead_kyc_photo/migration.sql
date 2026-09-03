-- Entretien de démarchage démarré sur un simple nom, sans fiche prospect.
ALTER TABLE "prospection_interviews"
    ADD COLUMN "lead_name" TEXT,
    ADD COLUMN "lead_shop_name" TEXT,
    ADD COLUMN "lead_phone" TEXT,
    ADD COLUMN "lead_commune" TEXT;

ALTER TABLE "prospection_interviews"
    DROP CONSTRAINT IF EXISTS "prospection_interviews_target_check";

ALTER TABLE "prospection_interviews"
    ADD CONSTRAINT "prospection_interviews_target_check"
    CHECK (
        "prospect_id" IS NOT NULL
        OR "vendor_id" IS NOT NULL
        OR ("lead_name" IS NOT NULL AND length(btrim("lead_name")) > 0)
    );

-- Photo de la pièce d'identité (CNI, passeport, permis…) ou du RCCM.
ALTER TABLE "vendor_kyc"
    ADD COLUMN "document_image_key" TEXT,
    ADD COLUMN "document_image_mime_type" TEXT,
    ADD COLUMN "document_image_at" TIMESTAMP(3);

-- Un vendeur informel peut n'apporter que la photo : le numéro devient optionnel.
ALTER TABLE "vendor_kyc"
    ALTER COLUMN "document_number" DROP NOT NULL;
