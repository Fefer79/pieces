-- One shadow vendor per external source: NULLs remain allowed in Postgres.
CREATE UNIQUE INDEX "vendors_external_source_key"
  ON "vendors"("external_source");
