-- CreateEnum
CREATE TYPE "GuaranteeType" AS ENUM ('RETURN_48H', 'WARRANTY_30D');

-- CreateTable
CREATE TABLE "vendor_guarantee_signatures" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "guarantee_type" "GuaranteeType" NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_guarantee_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique constraint: one signature per guarantee type per vendor)
CREATE UNIQUE INDEX "uq_vendor_guarantee_type" ON "vendor_guarantee_signatures"("vendor_id", "guarantee_type");

-- AddForeignKey
ALTER TABLE "vendor_guarantee_signatures" ADD CONSTRAINT "vendor_guarantee_signatures_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
