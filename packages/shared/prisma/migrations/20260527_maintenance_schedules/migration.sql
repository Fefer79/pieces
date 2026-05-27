-- Recurring maintenance schedules per vehicle.
-- A vehicle can have N schedules (e.g. oil change every 5000 km, brake pads
-- every 30000 km). Status (À jour / Bientôt due / En retard) is computed
-- from vehicle.mileage vs lastDoneAtKm + intervalKm at read time.

CREATE TYPE "MaintenanceKind" AS ENUM (
  'OIL_CHANGE',
  'OIL_FILTER',
  'AIR_FILTER',
  'FUEL_FILTER',
  'CABIN_FILTER',
  'BRAKE_PADS_FRONT',
  'BRAKE_PADS_REAR',
  'TIMING_BELT',
  'TIRES',
  'COOLANT',
  'TRANSMISSION_FLUID',
  'OTHER'
);

CREATE TABLE "maintenance_schedules" (
  "id"               TEXT NOT NULL,
  "vehicle_id"       TEXT NOT NULL,
  "kind"             "MaintenanceKind" NOT NULL,
  "label"            TEXT,
  "interval_km"      INTEGER NOT NULL,
  "warning_km"       INTEGER NOT NULL DEFAULT 500,
  "last_done_at_km"  INTEGER,
  "last_done_at"     TIMESTAMP(3),
  "enabled"          BOOLEAN NOT NULL DEFAULT true,
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "maintenance_schedules"
  ADD CONSTRAINT "maintenance_schedules_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_maintenance_schedules_vehicle"       ON "maintenance_schedules" ("vehicle_id");
CREATE INDEX "idx_maintenance_schedules_vehicle_kind" ON "maintenance_schedules" ("vehicle_id", "kind");
