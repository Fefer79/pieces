-- Enable pg_trgm and unaccent extensions for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateTable
CREATE TABLE "search_synonyms" (
    "id" TEXT NOT NULL,
    "typo" TEXT NOT NULL,
    "correction" TEXT NOT NULL,

    CONSTRAINT "search_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_synonyms_typo_key" ON "search_synonyms"("typo");

-- Create trigram index on catalog_items for fuzzy text search
CREATE INDEX "idx_catalog_items_name_trgm" ON "catalog_items" USING gin (name gin_trgm_ops);
CREATE INDEX "idx_catalog_items_category_trgm" ON "catalog_items" USING gin (category gin_trgm_ops);
CREATE INDEX "idx_catalog_items_oem_reference_trgm" ON "catalog_items" USING gin (oem_reference gin_trgm_ops);

-- Seed common search synonyms for auto parts in French/CI context
INSERT INTO "search_synonyms" ("id", "typo", "correction") VALUES
  (gen_random_uuid(), 'uile', 'huile'),
  (gen_random_uuid(), 'frain', 'frein'),
  (gen_random_uuid(), 'filltre', 'filtre'),
  (gen_random_uuid(), 'filtre a uile', 'filtre à huile'),
  (gen_random_uuid(), 'plakette', 'plaquette'),
  (gen_random_uuid(), 'amorisseur', 'amortisseur'),
  (gen_random_uuid(), 'amortiseur', 'amortisseur'),
  (gen_random_uuid(), 'bouji', 'bougie'),
  (gen_random_uuid(), 'bougy', 'bougie'),
  (gen_random_uuid(), 'couroie', 'courroie'),
  (gen_random_uuid(), 'couroi', 'courroie'),
  (gen_random_uuid(), 'rotule', 'rotule'),
  (gen_random_uuid(), 'roulement', 'roulement'),
  (gen_random_uuid(), 'roulman', 'roulement'),
  (gen_random_uuid(), 'echapement', 'échappement'),
  (gen_random_uuid(), 'echapment', 'échappement'),
  (gen_random_uuid(), 'embrayag', 'embrayage'),
  (gen_random_uuid(), 'radiateur', 'radiateur'),
  (gen_random_uuid(), 'radiater', 'radiateur'),
  (gen_random_uuid(), 'alternater', 'alternateur'),
  (gen_random_uuid(), 'alternateure', 'alternateur'),
  (gen_random_uuid(), 'demareur', 'démarreur'),
  (gen_random_uuid(), 'demmareur', 'démarreur'),
  (gen_random_uuid(), 'suspention', 'suspension'),
  (gen_random_uuid(), 'suspenssion', 'suspension'),
  (gen_random_uuid(), 'distribusion', 'distribution'),
  (gen_random_uuid(), 'cardan', 'cardan'),
  (gen_random_uuid(), 'gasket', 'joint de culasse'),
  (gen_random_uuid(), 'pompe a eau', 'pompe à eau'),
  (gen_random_uuid(), 'pompe a uile', 'pompe à huile');
