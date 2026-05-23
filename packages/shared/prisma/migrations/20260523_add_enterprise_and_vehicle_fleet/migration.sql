-- Fleet management foundations: Enterprise, EnterpriseMember, enriched Vehicle, Order links.
-- user_vehicles is dropped (confirmed empty in dev + prod on 2026-05-23).

-- Enums --------------------------------------------------------------------

CREATE TYPE "VehicleUsageType" AS ENUM (
  'TRANSPORT',
  'CHANTIER',
  'LIVRAISON',
  'DIRECTION',
  'AUTRE'
);

CREATE TYPE "EnterpriseMemberRole" AS ENUM (
  'OWNER',
  'MANAGER',
  'MECHANIC',
  'ACCOUNTANT'
);

-- Drop legacy user_vehicles (empty) ---------------------------------------

DROP TABLE IF EXISTS "user_vehicles";

-- enterprises --------------------------------------------------------------

CREATE TABLE "enterprises" (
  "id"         TEXT        NOT NULL PRIMARY KEY,
  "name"       TEXT        NOT NULL,
  "slug"       TEXT        NOT NULL,
  "address"    TEXT,
  "rccm"       TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "enterprises_slug_key" ON "enterprises"("slug");
CREATE INDEX "idx_enterprises_slug" ON "enterprises"("slug");

-- enterprise_members ------------------------------------------------------

CREATE TABLE "enterprise_members" (
  "id"            TEXT                  NOT NULL PRIMARY KEY,
  "enterprise_id" TEXT                  NOT NULL,
  "user_id"       TEXT                  NOT NULL,
  "role"          "EnterpriseMemberRole" NOT NULL DEFAULT 'MECHANIC',
  "invited_at"    TIMESTAMP(3),
  "joined_at"     TIMESTAMP(3),
  "created_at"    TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_members_enterprise_id_fkey"
    FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "enterprise_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_enterprise_member" ON "enterprise_members"("enterprise_id", "user_id");
CREATE INDEX "idx_enterprise_members_user" ON "enterprise_members"("user_id");

-- vehicles ----------------------------------------------------------------

CREATE TABLE "vehicles" (
  "id"                  TEXT              NOT NULL PRIMARY KEY,
  "user_id"             TEXT,
  "enterprise_id"       TEXT,
  "brand"               TEXT              NOT NULL,
  "model"               TEXT              NOT NULL,
  "year"                INTEGER           NOT NULL,
  "vin"                 TEXT,
  "plate"               TEXT,
  "engine"              TEXT,
  "mileage"             INTEGER,
  "mileage_updated_at"  TIMESTAMP(3),
  "usage_type"          "VehicleUsageType",
  "group_name"          TEXT,
  "photo_url"           TEXT,
  "created_at"          TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)      NOT NULL,
  CONSTRAINT "vehicles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "vehicles_enterprise_id_fkey"
    FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_vehicles_user" ON "vehicles"("user_id");
CREATE INDEX "idx_vehicles_enterprise" ON "vehicles"("enterprise_id");
CREATE INDEX "idx_vehicles_plate" ON "vehicles"("plate");

-- orders: link to vehicle + enterprise ------------------------------------

ALTER TABLE "orders"
  ADD COLUMN "vehicle_id"    TEXT,
  ADD COLUMN "enterprise_id" TEXT;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "orders_enterprise_id_fkey"
    FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_orders_vehicle" ON "orders"("vehicle_id");
CREATE INDEX "idx_orders_enterprise" ON "orders"("enterprise_id");
