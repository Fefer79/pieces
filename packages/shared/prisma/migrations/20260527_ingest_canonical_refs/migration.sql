-- Canonical ingest reference tables (Phase 1 — Chantiers 1/2/3).
-- Adds master vehicle/part/market-price/competitor tables filled by apps/ingest pipelines.
-- Pure additive migration: no destructive changes to existing tables.

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG', 'CNG', 'OTHER');

CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'PICKUP', 'VAN', 'TRUCK', 'COUPE', 'WAGON', 'CONVERTIBLE', 'MOTORCYCLE', 'OTHER');

CREATE TYPE "IngestSource" AS ENUM ('HAUTOPARTS_3H', 'MAPA_CI', 'JUMIA_CI', 'COINAFRIQUE_CI', 'ANNUAIRE_CI', 'OSM', 'GOOGLE_PLACES', 'NHTSA', 'WIKIPEDIA', 'PARTSOUQ', 'MANUAL');

CREATE TYPE "CompetitorType" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

CREATE TYPE "CompetitorSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- ============================================================================
-- Vehicle canonical reference (Chantier 1)
-- ============================================================================

CREATE TABLE "vehicle_makes" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "country"       TEXT,
    "popularity_ci" INTEGER NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicle_makes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vehicle_makes_slug_key" ON "vehicle_makes"("slug");
CREATE INDEX "idx_vehicle_makes_slug" ON "vehicle_makes"("slug");

CREATE TABLE "vehicle_models" (
    "id"         TEXT NOT NULL,
    "make_id"    TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "year_start" INTEGER,
    "year_end"   INTEGER,
    "body_type"  "BodyType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vehicle_models_make_id_slug_key" ON "vehicle_models"("make_id", "slug");
CREATE INDEX "idx_vehicle_models_make" ON "vehicle_models"("make_id");
ALTER TABLE "vehicle_models"
  ADD CONSTRAINT "vehicle_models_make_id_fkey"
  FOREIGN KEY ("make_id") REFERENCES "vehicle_makes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "vehicle_generations" (
    "id"         TEXT NOT NULL,
    "model_id"   TEXT NOT NULL,
    "code"       TEXT,
    "year_start" INTEGER NOT NULL,
    "year_end"   INTEGER,
    "body_type"  "BodyType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vehicle_generations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_vehicle_generations_model_year" ON "vehicle_generations"("model_id", "year_start");
ALTER TABLE "vehicle_generations"
  ADD CONSTRAINT "vehicle_generations_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "vehicle_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "vehicle_engines" (
    "id"              TEXT NOT NULL,
    "generation_id"   TEXT NOT NULL,
    "code"            TEXT,
    "displacement_cc" INTEGER,
    "fuel_type"       "FuelType",
    "power_kw"        INTEGER,
    "oem_refs"        TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vehicle_engines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_vehicle_engines_generation" ON "vehicle_engines"("generation_id");
CREATE INDEX "idx_vehicle_engines_code" ON "vehicle_engines"("code");
ALTER TABLE "vehicle_engines"
  ADD CONSTRAINT "vehicle_engines_generation_id_fkey"
  FOREIGN KEY ("generation_id") REFERENCES "vehicle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Part canonical reference + market price (Chantier 2)
-- ============================================================================

CREATE TABLE "part_categories" (
    "id"         TEXT NOT NULL,
    "parent_id"  TEXT,
    "name"       TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "oem_group"  TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "part_categories_slug_key" ON "part_categories"("slug");
CREATE INDEX "idx_part_categories_parent" ON "part_categories"("parent_id");
ALTER TABLE "part_categories"
  ADD CONSTRAINT "part_categories_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "part_references" (
    "id"          TEXT NOT NULL,
    "oem_number"  TEXT,
    "category_id" TEXT,
    "name"        TEXT NOT NULL,
    "brand"       TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "part_references_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "part_references_oem_number_brand_key" ON "part_references"("oem_number", "brand");
CREATE INDEX "idx_part_references_category" ON "part_references"("category_id");
CREATE INDEX "idx_part_references_oem" ON "part_references"("oem_number");
ALTER TABLE "part_references"
  ADD CONSTRAINT "part_references_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "part_reference_fitments" (
    "id"                TEXT NOT NULL,
    "part_reference_id" TEXT NOT NULL,
    "vehicle_engine_id" TEXT NOT NULL,
    CONSTRAINT "part_reference_fitments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "part_reference_fitments_part_reference_id_vehicle_engine_id_key"
  ON "part_reference_fitments"("part_reference_id", "vehicle_engine_id");
CREATE INDEX "idx_part_ref_fitments_engine" ON "part_reference_fitments"("vehicle_engine_id");
ALTER TABLE "part_reference_fitments"
  ADD CONSTRAINT "part_reference_fitments_part_reference_id_fkey"
  FOREIGN KEY ("part_reference_id") REFERENCES "part_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "part_reference_fitments"
  ADD CONSTRAINT "part_reference_fitments_vehicle_engine_id_fkey"
  FOREIGN KEY ("vehicle_engine_id") REFERENCES "vehicle_engines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "market_price_observations" (
    "id"                TEXT NOT NULL,
    "part_reference_id" TEXT,
    "raw_title"         TEXT NOT NULL,
    "source"            "IngestSource" NOT NULL,
    "source_url"        TEXT,
    "source_item_id"    TEXT,
    "vendor_name"       TEXT,
    "price_fcfa"        INTEGER,
    "currency"          TEXT NOT NULL DEFAULT 'XOF',
    "condition"         "PartCondition",
    "part_source"       "PartSource",
    "observed_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "market_price_observations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "market_price_observations_source_source_item_id_key"
  ON "market_price_observations"("source", "source_item_id");
CREATE INDEX "idx_market_price_part_ref" ON "market_price_observations"("part_reference_id");
CREATE INDEX "idx_market_price_source_time" ON "market_price_observations"("source", "observed_at");
ALTER TABLE "market_price_observations"
  ADD CONSTRAINT "market_price_observations_part_reference_id_fkey"
  FOREIGN KEY ("part_reference_id") REFERENCES "part_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Competitor cartography (Chantier 3 / Phase 4)
-- ============================================================================

CREATE TABLE "competitor_vendors" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "type"           "CompetitorType" NOT NULL,
    "website_url"    TEXT,
    "phone"          TEXT,
    "whatsapp"       TEXT,
    "email"          TEXT,
    "address"        TEXT,
    "zone"           TEXT,
    "commune"        TEXT,
    "lat"            DOUBLE PRECISION,
    "lng"            DOUBLE PRECISION,
    "osm_id"         TEXT,
    "gmaps_place_id" TEXT,
    "specialties"    TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimated_size" "CompetitorSize",
    "rating"         DOUBLE PRECISION,
    "reviews_count"  INTEGER,
    "notes"          TEXT,
    "observed_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "competitor_vendors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "competitor_vendors_osm_id_key" ON "competitor_vendors"("osm_id");
CREATE UNIQUE INDEX "competitor_vendors_gmaps_place_id_key" ON "competitor_vendors"("gmaps_place_id");
CREATE INDEX "idx_competitor_vendors_type_zone" ON "competitor_vendors"("type", "zone");
CREATE INDEX "idx_competitor_vendors_commune" ON "competitor_vendors"("commune");
