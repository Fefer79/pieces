-- Entretien de démarchage démarré « à blanc ».
--
-- Refonte de l'onboarding des vendeurs hors CRM : le démarcheur ne relève plus
-- l'identité de la boutique en ouvrant la visite (ça installe la méfiance), mais
-- EN FIN d'entretien. L'entretien peut donc exister sans prospect, sans vendeur
-- et sans nom pendant toute la conversation : on lève la contrainte de cible.
--
-- Idempotent : ce dépôt applique aussi le SQL à la main hors de `prisma migrate`
-- et Render lance `migrate deploy` au démarrage.

ALTER TABLE "prospection_interviews"
    DROP CONSTRAINT IF EXISTS "prospection_interviews_target_check";

-- L'adresse / le repère de la boutique quitte la trame d'entretien pour
-- rejoindre le bloc d'identité de fin de visite.
ALTER TABLE "prospection_interviews"
    ADD COLUMN IF NOT EXISTS "lead_address" TEXT;
