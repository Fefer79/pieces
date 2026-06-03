-- Gestion des chauffeurs (flotte) : rôle DRIVER, fiches chauffeur, affectations
-- véhicule, relevés journaliers (CA/dépenses/km), incidents.
-- Additif : aucune donnée existante touchée.

-- Rôle DRIVER (PG 12+ autorise ADD VALUE en transaction tant qu'il n'est pas
-- utilisé dans la même migration — ce qui est le cas ici).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DRIVER';

-- Enums chauffeur
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "DriverIncidentType" AS ENUM ('ACCIDENT', 'INFRACTION', 'BREAKDOWN', 'COMPLAINT', 'OTHER');
CREATE TYPE "DriverIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- drivers ------------------------------------------------------------------
CREATE TABLE "drivers" (
  "id"               TEXT          NOT NULL PRIMARY KEY,
  "enterprise_id"    TEXT          NOT NULL,
  "user_id"          TEXT,
  "name"             TEXT          NOT NULL,
  "phone"            TEXT          NOT NULL,
  "license_number"   TEXT,
  "license_category" TEXT,
  "photo_url"        TEXT,
  "status"           "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
  "hired_at"         TIMESTAMP(3),
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "drivers_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_driver_phone" ON "drivers"("enterprise_id", "phone");
CREATE INDEX "idx_drivers_enterprise" ON "drivers"("enterprise_id");
CREATE INDEX "idx_drivers_user" ON "drivers"("user_id");

-- driver_assignments -------------------------------------------------------
CREATE TABLE "driver_assignments" (
  "id"         TEXT         NOT NULL PRIMARY KEY,
  "driver_id"  TEXT         NOT NULL,
  "vehicle_id" TEXT         NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"   TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "driver_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_driver_assignments_driver" ON "driver_assignments"("driver_id");
CREATE INDEX "idx_driver_assignments_vehicle" ON "driver_assignments"("vehicle_id");

-- driver_daily_records -----------------------------------------------------
CREATE TABLE "driver_daily_records" (
  "id"             TEXT         NOT NULL PRIMARY KEY,
  "driver_id"      TEXT         NOT NULL,
  "vehicle_id"     TEXT,
  "date"           DATE         NOT NULL,
  "revenue"        INTEGER      NOT NULL DEFAULT 0,
  "fuel_cost"      INTEGER      NOT NULL DEFAULT 0,
  "other_expenses" INTEGER      NOT NULL DEFAULT 0,
  "km_driven"      INTEGER,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "driver_daily_records_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "driver_daily_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_driver_day" ON "driver_daily_records"("driver_id", "date");
CREATE INDEX "idx_driver_daily_driver" ON "driver_daily_records"("driver_id");
CREATE INDEX "idx_driver_daily_vehicle" ON "driver_daily_records"("vehicle_id");

-- driver_incidents ---------------------------------------------------------
CREATE TABLE "driver_incidents" (
  "id"            TEXT                     NOT NULL PRIMARY KEY,
  "driver_id"     TEXT                     NOT NULL,
  "vehicle_id"    TEXT,
  "type"          "DriverIncidentType"     NOT NULL,
  "severity"      "DriverIncidentSeverity" NOT NULL DEFAULT 'LOW',
  "date"          DATE                     NOT NULL,
  "description"   TEXT,
  "cost_estimate" INTEGER,
  "created_at"    TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_incidents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "driver_incidents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "idx_driver_incidents_driver" ON "driver_incidents"("driver_id");
CREATE INDEX "idx_driver_incidents_vehicle" ON "driver_incidents"("vehicle_id");
