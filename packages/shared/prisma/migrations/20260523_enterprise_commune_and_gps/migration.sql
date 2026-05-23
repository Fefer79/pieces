-- Enterprise: add commune (required-ish via app layer), lat/lng for precise location.
-- The existing seeded enterprise gets backfilled to commune='Yopougon' (its address mentioned it).

ALTER TABLE "enterprises"
  ADD COLUMN "commune" TEXT,
  ADD COLUMN "lat" DOUBLE PRECISION,
  ADD COLUMN "lng" DOUBLE PRECISION;

UPDATE "enterprises"
SET "commune" = 'Yopougon'
WHERE "commune" IS NULL AND "address" ILIKE '%Yopougon%';
