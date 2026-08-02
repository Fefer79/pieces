-- CreateEnum
CREATE TYPE "AgentObjectiveMetric" AS ENUM ('VENDEURS_GERES', 'NOUVEAUX_VENDEURS', 'PROSPECTS_CONCLUS', 'PIECES_AJOUTEES', 'INTERACTIONS_CRM', 'TACHES_FAITES', 'VISITES_TERRAIN');

-- CreateEnum
CREATE TYPE "AgentCommissionStatus" AS ENUM ('ESTIMEE', 'DUE', 'PAYEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "team_member_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fonction" TEXT,
    "taux_commission_pct" INTEGER NOT NULL DEFAULT 10,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "embauche_le" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_objectives" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "metrique" "AgentObjectiveMetric" NOT NULL,
    "cible" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_commissions" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "base_fcfa" INTEGER NOT NULL,
    "taux_pct" INTEGER NOT NULL,
    "montant_fcfa" INTEGER NOT NULL,
    "statut" "AgentCommissionStatus" NOT NULL DEFAULT 'DUE',
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_member_profiles_user_id_key" ON "team_member_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_agent_objectives_periode" ON "agent_objectives"("periode");

-- CreateIndex
CREATE UNIQUE INDEX "agent_objectives_agent_id_periode_metrique_key" ON "agent_objectives"("agent_id", "periode", "metrique");

-- CreateIndex
CREATE INDEX "idx_agent_commissions_periode_statut" ON "agent_commissions"("periode", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "agent_commissions_agent_id_periode_key" ON "agent_commissions"("agent_id", "periode");

-- AddForeignKey
ALTER TABLE "team_member_profiles" ADD CONSTRAINT "team_member_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_objectives" ADD CONSTRAINT "agent_objectives_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

