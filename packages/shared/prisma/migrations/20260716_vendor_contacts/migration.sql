-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('A_CONTACTER', 'APPELE', 'VISITE', 'RELANCE', 'CONCLU', 'INJOIGNABLE', 'A_REVOIR', 'REJETE');

-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shop_name" TEXT,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "pieces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pieces_libre" TEXT,
    "remarques" TEXT,
    "statut" "ContactStatus" NOT NULL DEFAULT 'A_CONTACTER',
    "relance_le" TIMESTAMP(3),
    "derniere_visite" TIMESTAMP(3),
    "derniere_commande" TIMESTAMP(3),
    "notes_appel" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" TEXT,
    "liaison_id" TEXT,
    "vendor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contact_links" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "scraped_at" TIMESTAMP(3),
    "raw_data" JSONB,

    CONSTRAINT "vendor_contact_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_phone" ON "vendor_contacts"("phone");
CREATE INDEX "idx_vendor_contacts_liaison" ON "vendor_contacts"("liaison_id");
CREATE INDEX "idx_vendor_contacts_statut" ON "vendor_contacts"("statut");
CREATE INDEX "idx_vendor_contacts_relance" ON "vendor_contacts"("relance_le");
CREATE INDEX "idx_vendor_contacts_created_by" ON "vendor_contacts"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_vendor_contact_links_contact" ON "vendor_contact_links"("contact_id");
CREATE UNIQUE INDEX "uq_vendor_contact_link_url" ON "vendor_contact_links"("contact_id", "url");

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contact_links" ADD CONSTRAINT "vendor_contact_links_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "vendor_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
