#!/usr/bin/env bash
# Réparation de l'historique de migrations Prisma sur la PROD (db.prisma.io).
#
# Contexte : le schéma de prod a été construit au `db:push`, jamais par les
# migrations. `_prisma_migrations` ne contenait que `0_init` (baseliné le
# 2026-07-30 à 13h16) et une ligne en échec, ce qui bloquait tout déploiement
# de l'API en P3009 depuis le 2026-07-30 ~10h25.
#
# Ce script n'écrit QUE dans la table `_prisma_migrations`. Aucune donnée
# applicative n'est touchée, aucun DDL n'est exécuté.
#
# Les deux migrations 20260730_vehicle_plate_* sont volontairement EXCLUES :
# elles ne sont réellement pas appliquées (la colonne plate_canonical n'existe
# pas en prod) et doivent s'exécuter pour de vrai au prochain déploiement.
#
# Si ça bloque sur « Timed out trying to acquire a postgres advisory lock »,
# le verrou 72707369 est détenu par un backend persistant du pooler
# (pooled.db.prisma.io) : le client d'origine est parti sans le libérer et le
# backend survit indéfiniment. NE PAS relancer en boucle — chaque tentative
# expirée laisse un backend orphelin côté serveur qui sature le rôle
# prisma_migration ("too many connections"). Nettoyer d'abord, via l'URL pooled :
#   node scripts/kill-prod-migration-sessions.cjs
#   node scripts/unlock-prod-advisory.cjs
#
# Si le verrou est repris par intermittence (retry de déploiement Render, qui
# échoue en P3018 sur le schéma déjà présent et laisse une ligne non finie),
# préférer scripts/baseline-prod-migrations-sql.cjs : il fait le même baseline
# par SQL direct via l'URL pooled, sans verrou advisory, et marque au passage
# rolled-back les lignes interrompues.
#
# État au 2026-07-31 : réparation EFFECTUÉE (56 migrations baselinées, statut
# propre, seules les deux 20260730_vehicle_plate_* restent à appliquer).
# Ce script est conservé à titre de référence / rejeu éventuel.
set -euo pipefail

cd "$(dirname "$0")/.."
DB=$(grep -o "postgres://[^'\"]*db\.prisma\.io:5432/postgres?sslmode=require" ../../.claude/settings.local.json | head -1)
[ -n "$DB" ] || { echo "Connexion prod introuvable dans .claude/settings.local.json"; exit 1; }
export DATABASE_URL="$DB"

infra_check() {
  # $1 = sortie d'une commande prisma ; retourne 0 si erreur d'infra (verrou/connexion)
  printf '%s' "$1" | grep -qE "P1002|advisory lock|too many connections"
}

echo "== 1/2 : on efface la ligne en échec =="
out=$(pnpm exec prisma migrate resolve --rolled-back 20260301_add_catalog_items_and_jobs 2>&1) && rc=0 || rc=1
if infra_check "$out"; then
  printf '%s\n' "$out"
  echo "Verrou/connexion indisponible : nettoyer les sessions (scripts/kill-prod-migration-sessions.cjs puis scripts/unlock-prod-advisory.cjs) avant de relancer."
  exit 1
fi
if [ "$rc" = 0 ]; then echo "ligne en échec effacée"; else echo "rien à effacer (déjà résolu ou jamais échouée), on continue"; fi

echo "== 2/2 : on baseline les 56 migrations déjà présentes en base =="
while read -r m; do
  [ -n "$m" ] || continue
  printf '  %s ... ' "$m"
  out=$(pnpm exec prisma migrate resolve --applied "$m" 2>&1) && { echo "ok"; continue; }
  if infra_check "$out"; then
    echo "ERREUR INFRA"
    printf '%s\n' "$out"
    echo "Arrêt immédiat : problème de verrou/connexion. Ne pas relancer en boucle (chaque tentative expirée laisse un backend orphelin côté serveur)."
    exit 1
  fi
  echo "déjà marquée / erreur"
done <<'MIGRATIONS'
20260301_add_catalog_items_and_jobs
20260301_add_catalog_stock_price_fields
20260301_add_consent_and_deletion_request
20260301_add_deliveries
20260301_add_guarantee_signatures
20260301_add_notification_preferences
20260301_add_orders_and_payments
20260301_add_reviews_and_disputes
20260301_add_search_synonyms_pg_trgm
20260301_add_user_vehicles
20260301_add_vendor_and_kyc
20260301_add_vendor_delivery_zones
20260301_init_user_model
20260523_add_enterprise_and_vehicle_fleet
20260523_catalog_part_source
20260523_enterprise_commune_and_gps
20260525_catalog_created_by_liaison
20260526_catalog_commission
20260526_catalog_item_photos
20260526_orderitem_commission_snapshot
20260527_activity_log
20260527_catalog_item_fitments
20260527_enterprise_buffer_stock
20260527_enterprise_subscriptions
20260527_ingest_canonical_refs
20260527_invoices_fne_foundation
20260527_maintenance_centers
20260527_maintenance_schedules
20260527_return_orders
20260527_role_liaison
20260527_vendor_score
20260528_external_sources
20260528_global_auto_external_sources
20260528_vendor_external_source_unique
20260529_align_schema_drift
20260603_drivers
20260603_order_item_condition_snapshot
20260604_maintenance_reminders
20260607_buffer_stock_replenish
20260608_vendor_contracts
20260624_warranty_value_unit
20260625_vendor_external_seller
20260629_order_delivery_commune
20260630_vendor_relance
20260705_catalog_subcategory
20260708_catalog_stock_quantity
20260710_order_delivery_mode
20260711103023_agent_fiche_terrain
20260713_buyer_role
20260714153256_add_universal_compatibility
20260716_vendor_contacts
20260717_contact_activities
20260717_contact_source
20260726_vehicle_energy_type
20260727_part_requests
20260728_logistics_quote_requests
MIGRATIONS

echo
echo "== État final =="
pnpm exec prisma migrate status
