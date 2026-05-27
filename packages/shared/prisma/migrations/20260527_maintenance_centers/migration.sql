-- Maintenance centers (workshops) per enterprise + per-vehicle home center.
-- Foundation for delivery consolidation: orders for vehicles attached to
-- center X are eligible for batched dispatch on that center's preferred day.

CREATE TABLE "maintenance_centers" (
  "id"                   TEXT NOT NULL,
  "enterprise_id"        TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "commune"              TEXT,
  "address"              TEXT,
  "lat"                  DOUBLE PRECISION,
  "lng"                  DOUBLE PRECISION,
  "contact_name"         TEXT,
  "contact_phone"        TEXT,
  "delivery_day_of_week" INTEGER,
  "active"               BOOLEAN NOT NULL DEFAULT true,
  "notes"                TEXT,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "maintenance_centers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "maintenance_centers"
  ADD CONSTRAINT "maintenance_centers_enterprise_id_fkey"
  FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_maintenance_centers_enterprise" ON "maintenance_centers" ("enterprise_id");

ALTER TABLE "vehicles"
  ADD COLUMN "home_center_id" TEXT;

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_home_center_id_fkey"
  FOREIGN KEY ("home_center_id") REFERENCES "maintenance_centers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_vehicles_home_center" ON "vehicles" ("home_center_id");
