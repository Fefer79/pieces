-- CreateEnum
CREATE TYPE "ContactActivityType" AS ENUM ('APPEL', 'WHATSAPP', 'VISITE', 'NOTE', 'STATUT', 'ASSIGNATION', 'CONVERSION');

-- CreateTable
CREATE TABLE "contact_activities" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "author_id" TEXT,
    "type" "ContactActivityType" NOT NULL,
    "note" TEXT,
    "statut_avant" "ContactStatus",
    "statut_apres" "ContactStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_contact_activities_contact" ON "contact_activities"("contact_id", "created_at");
CREATE INDEX "idx_contact_activities_author" ON "contact_activities"("author_id");

-- AddForeignKey
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "vendor_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
