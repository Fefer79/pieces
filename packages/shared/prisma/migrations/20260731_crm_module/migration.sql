-- CreateEnum
CREATE TYPE "CrmSubjectType" AS ENUM ('USER', 'VENDOR');

-- CreateEnum
CREATE TYPE "CrmInteractionType" AS ENUM ('NOTE', 'APPEL', 'WHATSAPP', 'VISITE', 'EMAIL', 'RELANCE');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('A_FAIRE', 'FAIT', 'ANNULE');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'CRM_DUE_TASKS_SCAN';

-- CreateTable
CREATE TABLE "crm_interactions" (
    "id" TEXT NOT NULL,
    "subject" "CrmSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "type" "CrmInteractionType" NOT NULL,
    "details" TEXT,
    "meta" JSONB,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "notes" TEXT,
    "subject" "CrmSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "statut" "CrmTaskStatus" NOT NULL DEFAULT 'A_FAIRE',
    "echeance_le" TIMESTAMP(3),
    "rappel_envoye_at" TIMESTAMP(3),
    "fait_at" TIMESTAMP(3),
    "assignee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tags" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT,

    CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tag_assignments" (
    "tag_id" TEXT NOT NULL,
    "subject" "CrmSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_tag_assignments_pkey" PRIMARY KEY ("tag_id","subject","subject_id")
);

-- CreateIndex
CREATE INDEX "idx_crm_interactions_subject" ON "crm_interactions"("subject", "subject_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_crm_interactions_author" ON "crm_interactions"("author_id");

-- CreateIndex
CREATE INDEX "idx_crm_tasks_statut_echeance" ON "crm_tasks"("statut", "echeance_le");

-- CreateIndex
CREATE INDEX "idx_crm_tasks_subject" ON "crm_tasks"("subject", "subject_id");

-- CreateIndex
CREATE INDEX "idx_crm_tasks_assignee" ON "crm_tasks"("assignee_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "crm_tags_nom_key" ON "crm_tags"("nom");

-- CreateIndex
CREATE INDEX "idx_crm_tag_assignments_subject" ON "crm_tag_assignments"("subject", "subject_id");

-- AddForeignKey
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tag_assignments" ADD CONSTRAINT "crm_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "crm_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

