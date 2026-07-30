-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DIRECTION', 'COMMERCIAL', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'OPS_LOGISTIQUE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "BusinessUnit" AS ENUM ('MARKETPLACE', 'FLOTTE', 'LOGISTIQUE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'ERP_POST_SALES_JOURNAL';

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "staff_role" "StaffRole" NOT NULL,
    "business_units" "BusinessUnit"[],
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "due_at" TIMESTAMP(3),
    "business_unit" "BusinessUnit",
    "assignee_staff_id" TEXT,
    "created_by_staff_id" TEXT,
    "related_type" TEXT,
    "related_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author_staff_id" TEXT NOT NULL,
    "related_type" TEXT NOT NULL,
    "related_id" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_key" ON "staff_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_staff_members_role" ON "staff_members"("staff_role");

-- CreateIndex
CREATE INDEX "idx_staff_members_active" ON "staff_members"("active");

-- CreateIndex
CREATE INDEX "idx_tasks_assignee_status" ON "tasks"("assignee_staff_id", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_status_due" ON "tasks"("status", "due_at");

-- CreateIndex
CREATE INDEX "idx_tasks_related" ON "tasks"("related_type", "related_id");

-- CreateIndex
CREATE INDEX "idx_notes_related" ON "notes"("related_type", "related_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sequences_key_year_month_key" ON "sequences"("key", "year", "month");

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_staff_id_fkey" FOREIGN KEY ("assignee_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_staff_id_fkey" FOREIGN KEY ("author_staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

