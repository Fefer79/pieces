-- AlterTable
ALTER TABLE "vendor_contacts" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUEL';
ALTER TABLE "vendor_contacts" ADD COLUMN "source_ref" TEXT;

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_source" ON "vendor_contacts"("source");
CREATE UNIQUE INDEX "uq_vendor_contacts_source_ref" ON "vendor_contacts"("source", "source_ref");
