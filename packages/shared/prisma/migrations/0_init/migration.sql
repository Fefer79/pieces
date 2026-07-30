-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER', 'RIDER', 'ADMIN', 'ENTERPRISE', 'LIAISON', 'DRIVER');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('FORMAL', 'INFORMAL');

-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('RCCM', 'CNI');

-- CreateEnum
CREATE TYPE "GuaranteeType" AS ENUM ('RETURN_48H', 'WARRANTY_30D');

-- CreateEnum
CREATE TYPE "WarrantyUnit" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "CatalogItemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PartCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "PartSource" AS ENUM ('OEM', 'AFTERMARKET', 'COMPATIBLE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'VENDOR_CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'COD');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'PICKUP_IN_PROGRESS', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('EXPRESS', 'STANDARD');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('IMAGE_PROCESS_VARIANTS', 'CATALOG_AI_IDENTIFY', 'MAINTENANCE_REMINDER_SCAN', 'BUFFER_STOCK_REPLENISH_SCAN', 'RELANCE_INCOMPLETE_VENDORS_SCAN', 'ENRICHMENT_FITMENTS', 'ENRICHMENT_SOURCING_SCAN', 'ENRICHMENT_SOURCING_COLLECT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VendorContractStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VehicleUsageType" AS ENUM ('TRANSPORT', 'CHANTIER', 'LIVRAISON', 'DIRECTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "VehicleEnergyType" AS ENUM ('ICE', 'EV', 'HYBRID');

-- CreateEnum
CREATE TYPE "EnterpriseMemberRole" AS ENUM ('OWNER', 'MANAGER', 'MECHANIC', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO_FLOTTE', 'PRO_FLOTTE_PLUS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionEventKind" AS ENUM ('CREATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'ACTIVATED', 'SUSPENDED', 'REACTIVATED', 'CANCELLED', 'TIER_CHANGED', 'CYCLE_CHANGED', 'ROI_GUARANTEE_INVOKED', 'SLA_BREACH');

-- CreateEnum
CREATE TYPE "PartRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartRequestUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PartRequestSource" AS ENUM ('LOCAL', 'AIR', 'CARGO', 'ANY');

-- CreateEnum
CREATE TYPE "MaintenanceKind" AS ENUM ('OIL_CHANGE', 'OIL_FILTER', 'AIR_FILTER', 'FUEL_FILTER', 'CABIN_FILTER', 'BRAKE_PADS_FRONT', 'BRAKE_PADS_REAR', 'TIMING_BELT', 'TIRES', 'COOLANT', 'TRANSMISSION_FLUID', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_PART', 'NOT_AS_DESCRIBED', 'NO_LONGER_NEEDED', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'PICKED_UP', 'INSPECTED', 'REFUNDED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG', 'CNG', 'OTHER');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'PICKUP', 'VAN', 'TRUCK', 'COUPE', 'WAGON', 'CONVERTIBLE', 'MOTORCYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "IngestSource" AS ENUM ('HAUTOPARTS_3H', 'MAPA_CI', 'JUMIA_CI', 'COINAFRIQUE_CI', 'ANNUAIRE_CI', 'GLOBAL_AUTO_CI', 'OSM', 'GOOGLE_PLACES', 'NHTSA', 'WIKIPEDIA', 'PARTSOUQ', 'MANUAL');

-- CreateEnum
CREATE TYPE "CompetitorType" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CompetitorSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DriverIncidentType" AS ENUM ('ACCIDENT', 'INFRACTION', 'BREAKDOWN', 'COMPLAINT', 'OTHER');

-- CreateEnum
CREATE TYPE "DriverIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EnrichmentOrigin" AS ENUM ('LIAISON', 'VENDEUR');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('BROUILLON', 'EN_MODERATION', 'A_VERIFIER', 'VALIDE', 'BLOQUE');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('A_CONTACTER', 'APPELE', 'VISITE', 'RELANCE', 'CONCLU', 'INJOIGNABLE', 'A_REVOIR', 'REJETE');

-- CreateEnum
CREATE TYPE "ContactActivityType" AS ENUM ('APPEL', 'WHATSAPP', 'VISITE', 'NOTE', 'STATUT', 'ASSIGNATION', 'CONVERSION');

-- CreateEnum
CREATE TYPE "LogisticsLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTING', 'QUOTED', 'WON', 'LOST', 'SPAM');

-- CreateEnum
CREATE TYPE "LogisticsLeadSurface" AS ENUM ('LANDING', 'CALCULATEUR', 'CAMPAIGN', 'WHATSAPP', 'REFERRAL', 'APP', 'FLEET');

-- CreateEnum
CREATE TYPE "LogisticsLeadPhotoKind" AS ENUM ('PART', 'REGISTRATION_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "LogisticsCustomerType" AS ENUM ('FLEET_VTC', 'FLEET_COMPANY', 'MINING_BTP', 'INDIVIDUAL', 'GARAGE', 'DEALER', 'IMPORTER', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadCertaintyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VehicleEconomyCategory" AS ENUM ('ECONOMY_ICE', 'PREMIUM_ICE', 'PREMIUM_EV');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabase_id" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "email" TEXT,
    "roles" "Role"[],
    "active_context" "Role",
    "consented_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "managed_by_liaison_id" TEXT,
    "shop_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vendor_type" "VendorType" NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "delivery_zones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "external_source" TEXT,
    "external_seller_id" TEXT,
    "orders_delivered" INTEGER NOT NULL DEFAULT 0,
    "disputes_opened" INTEGER NOT NULL DEFAULT 0,
    "avg_review_rating" DOUBLE PRECISION,
    "aggregate_rating" DOUBLE PRECISION,
    "score_updated_at" TIMESTAMP(3),
    "relance_last_sent_at" TIMESTAMP(3),
    "relance_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_guarantee_signatures" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "guarantee_type" "GuaranteeType" NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_guarantee_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_kyc" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "kyc_type" "KycType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contracts" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "contract_version" TEXT NOT NULL,
    "status" "VendorContractStatus" NOT NULL DEFAULT 'PENDING',
    "vendor_id" TEXT,
    "seller_name" TEXT NOT NULL,
    "shop_name" TEXT,
    "phone" TEXT,
    "created_by_id" TEXT,
    "signed_name" TEXT,
    "signed_at" TIMESTAMP(3),
    "accepted_ip" TEXT,
    "accepted_user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_deletion_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "created_by_liaison_id" TEXT,
    "name" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "oem_reference" TEXT,
    "vehicle_compatibility" TEXT,
    "suggested_price" INTEGER,
    "price" INTEGER,
    "status" "CatalogItemStatus" NOT NULL DEFAULT 'DRAFT',
    "image_original_url" TEXT,
    "image_thumb_url" TEXT,
    "image_small_url" TEXT,
    "image_medium_url" TEXT,
    "image_large_url" TEXT,
    "serial_photo_url" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "quality_score" DOUBLE PRECISION,
    "quality_issue" TEXT,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "stock_quantity" INTEGER,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 1,
    "condition" "PartCondition",
    "part_source" "PartSource",
    "warranty_value" INTEGER,
    "warranty_unit" "WarrantyUnit",
    "price_updated_at" TIMESTAMP(3),
    "price_alert_flag" BOOLEAN NOT NULL DEFAULT false,
    "is_universally_compatible" BOOLEAN NOT NULL DEFAULT false,
    "commission_amount" INTEGER,
    "commission_accepted_at" TIMESTAMP(3),
    "external_source" TEXT,
    "external_source_id" TEXT,
    "external_source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_fitments" (
    "id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "engine" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_item_fitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_photos" (
    "id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url_original" TEXT NOT NULL,
    "url_thumb" TEXT,
    "url_small" TEXT,
    "url_medium" TEXT,
    "url_large" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_item_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rccm" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "enterprise_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal_ht" INTEGER NOT NULL,
    "tva_rate" INTEGER NOT NULL DEFAULT 18,
    "tva_amount" INTEGER NOT NULL,
    "total_ttc" INTEGER NOT NULL,
    "fne_validation_number" TEXT,
    "fne_qr_payload" TEXT,
    "fne_submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_monthly_invoices" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "invoice_count" INTEGER NOT NULL DEFAULT 0,
    "total_ht" INTEGER NOT NULL DEFAULT 0,
    "tva_amount" INTEGER NOT NULL DEFAULT 0,
    "total_ttc" INTEGER NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_monthly_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_subscriptions" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "trial_ends_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_subscription_events" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "kind" "SubscriptionEventKind" NOT NULL,
    "payload" JSONB,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_buffer_stock" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "target_qty" INTEGER NOT NULL,
    "current_qty" INTEGER NOT NULL DEFAULT 0,
    "auto_replenish" BOOLEAN NOT NULL DEFAULT false,
    "last_replenished_at" TIMESTAMP(3),
    "last_replenish_order_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprise_buffer_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_requests" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "status" "PartRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "part_name" TEXT,
    "category" TEXT,
    "oem_reference" TEXT,
    "urgency" "PartRequestUrgency" NOT NULL DEFAULT 'NORMAL',
    "preferred_source" "PartRequestSource" NOT NULL DEFAULT 'ANY',
    "max_budget" INTEGER,
    "approved_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_request_photos" (
    "id" TEXT NOT NULL,
    "part_request_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_request_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_request_events" (
    "id" TEXT NOT NULL,
    "part_request_id" TEXT NOT NULL,
    "from_status" "PartRequestStatus",
    "to_status" "PartRequestStatus" NOT NULL,
    "actor_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_centers" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "delivery_day_of_week" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprise_members" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "EnterpriseMemberRole" NOT NULL DEFAULT 'MECHANIC',
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "kind" "MaintenanceKind" NOT NULL,
    "label" TEXT,
    "interval_km" INTEGER NOT NULL,
    "warning_km" INTEGER NOT NULL DEFAULT 500,
    "last_done_at_km" INTEGER,
    "last_done_at" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "last_notified_at" TIMESTAMP(3),
    "last_notified_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "enterprise_id" TEXT,
    "home_center_id" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "plate" TEXT,
    "engine" TEXT,
    "mileage" INTEGER,
    "mileage_updated_at" TIMESTAMP(3),
    "usage_type" "VehicleUsageType",
    "energy_type" "VehicleEnergyType",
    "group_name" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_orders" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "enterprise_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "description" TEXT,
    "pickup_address" TEXT,
    "pickup_contact_name" TEXT,
    "pickup_contact_phone" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "refund_amount" INTEGER,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "inspected_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_reviews" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_synonyms" (
    "id" TEXT NOT NULL,
    "typo" TEXT NOT NULL,
    "correction" TEXT NOT NULL,

    CONSTRAINT "search_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "enterprise_id" TEXT,
    "owner_phone" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_method" "PaymentMethod",
    "share_token" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "delivery_commune" TEXT,
    "delivery_mode" "DeliveryMode" NOT NULL DEFAULT 'STANDARD',
    "labor_cost" INTEGER,
    "vendor_confirmed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "vendor_shop_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "image_thumb_url" TEXT,
    "condition" "PartCondition",
    "part_source" "PartSource",
    "commission_amount" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "actor" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rider_id" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "mode" "DeliveryMode" NOT NULL DEFAULT 'STANDARD',
    "pickup_address" TEXT,
    "pickup_lat" DOUBLE PRECISION,
    "pickup_lng" DOUBLE PRECISION,
    "delivery_address" TEXT,
    "delivery_lat" DOUBLE PRECISION,
    "delivery_lng" DOUBLE PRECISION,
    "rider_lat" DOUBLE PRECISION,
    "rider_lng" DOUBLE PRECISION,
    "estimated_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "client_absent" BOOLEAN NOT NULL DEFAULT false,
    "cod_amount" INTEGER,
    "receipt_photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "held_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "push" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_makes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "popularity_ci" INTEGER NOT NULL DEFAULT 0,
    "external_source" TEXT,
    "external_source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_makes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" TEXT NOT NULL,
    "make_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year_start" INTEGER,
    "year_end" INTEGER,
    "body_type" "BodyType",
    "external_source" TEXT,
    "external_source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_generations" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "code" TEXT,
    "year_start" INTEGER NOT NULL,
    "year_end" INTEGER,
    "body_type" "BodyType",
    "external_source" TEXT,
    "external_source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_engines" (
    "id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "code" TEXT,
    "displacement_cc" INTEGER,
    "fuel_type" "FuelType",
    "power_kw" INTEGER,
    "oem_refs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "external_source" TEXT,
    "external_source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_engines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "oem_group" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_references" (
    "id" TEXT NOT NULL,
    "oem_number" TEXT,
    "category_id" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "external_source" TEXT,
    "external_source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_reference_fitments" (
    "id" TEXT NOT NULL,
    "part_reference_id" TEXT NOT NULL,
    "vehicle_engine_id" TEXT NOT NULL,

    CONSTRAINT "part_reference_fitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_price_observations" (
    "id" TEXT NOT NULL,
    "part_reference_id" TEXT,
    "raw_title" TEXT NOT NULL,
    "source" "IngestSource" NOT NULL,
    "source_url" TEXT,
    "source_item_id" TEXT,
    "vendor_name" TEXT,
    "price_fcfa" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "condition" "PartCondition",
    "part_source" "PartSource",
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_price_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompetitorType" NOT NULL,
    "website_url" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "zone" TEXT,
    "commune" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "osm_id" TEXT,
    "gmaps_place_id" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimated_size" "CompetitorSize",
    "rating" DOUBLE PRECISION,
    "reviews_count" INTEGER,
    "notes" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "license_number" TEXT,
    "license_category" TEXT,
    "photo_url" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "hired_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_assignments" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_daily_records" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "date" DATE NOT NULL,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "fuel_cost" INTEGER NOT NULL DEFAULT 0,
    "other_expenses" INTEGER NOT NULL DEFAULT 0,
    "km_driven" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_daily_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_incidents" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "type" "DriverIncidentType" NOT NULL,
    "severity" "DriverIncidentSeverity" NOT NULL DEFAULT 'LOW',
    "date" DATE NOT NULL,
    "description" TEXT,
    "cost_estimate" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_enrichments" (
    "id" TEXT NOT NULL,
    "part_id" TEXT,
    "origine" "EnrichmentOrigin" NOT NULL,
    "statut" "EnrichmentStatus" NOT NULL DEFAULT 'BROUILLON',
    "identification" JSONB,
    "classification" JSONB,
    "photo_feedback" TEXT,
    "authenticite" JSONB,
    "fitments" JSONB,
    "sourcing" JSONB,
    "sourcing_batch_id" TEXT,
    "note_qualite" INTEGER,
    "description_independante" TEXT,
    "livrables_approuves_at" TIMESTAMP(3),
    "confiance_globale" DOUBLE PRECISION,
    "photos" TEXT[],
    "photo_hashes" TEXT[],
    "photos_variants" JSONB,
    "prix" INTEGER,
    "stock_quantite" INTEGER,
    "warranty_value" INTEGER,
    "warranty_unit" TEXT,
    "liaison_id" TEXT,
    "vendeur_id" TEXT,
    "fournisseur_visite" TEXT,
    "corrections" JSONB,
    "tentatives" INTEGER NOT NULL DEFAULT 1,
    "content_validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "validated_at" TIMESTAMP(3),

    CONSTRAINT "part_enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_references" (
    "id" TEXT NOT NULL,
    "ref_source" TEXT NOT NULL,
    "ref_cible" TEXT NOT NULL,
    "marque_cible" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "verifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_contacts" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "url" TEXT NOT NULL,
    "verifie_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shop_name" TEXT,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "pieces" TEXT[],
    "pieces_libre" TEXT,
    "remarques" TEXT,
    "statut" "ContactStatus" NOT NULL DEFAULT 'A_CONTACTER',
    "relance_le" TIMESTAMP(3),
    "derniere_visite" TIMESTAMP(3),
    "derniere_commande" TIMESTAMP(3),
    "notes_appel" TEXT,
    "photos" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'MANUEL',
    "source_ref" TEXT,
    "created_by_id" TEXT,
    "liaison_id" TEXT,
    "vendor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_activities" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "author_id" TEXT,
    "type" "ContactActivityType" NOT NULL,
    "note" TEXT,
    "statut_avant" "ContactStatus",
    "statut_apres" "ContactStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contact_links" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "scraped_at" TIMESTAMP(3),
    "raw_data" JSONB,

    CONSTRAINT "vendor_contact_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_quote_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "LogisticsLeadStatus" NOT NULL DEFAULT 'NEW',
    "user_id" TEXT,
    "enterprise_id" TEXT,
    "vehicle_id" TEXT,
    "part_request_id" TEXT,
    "contact_name" TEXT NOT NULL,
    "company_name" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "commune" TEXT,
    "customer_type" "LogisticsCustomerType" NOT NULL DEFAULT 'OTHER',
    "fleet_size" INTEGER,
    "part_name" TEXT NOT NULL,
    "part_category" TEXT,
    "oem_reference" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "part_price_hint" INTEGER,
    "family_id" TEXT,
    "vin" TEXT,
    "vin_decoded" BOOLEAN NOT NULL DEFAULT false,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_year" INTEGER,
    "energy_type" "VehicleEnergyType",
    "economy_category" "VehicleEconomyCategory",
    "vehicle_immobilized" BOOLEAN NOT NULL DEFAULT false,
    "certainty_score" INTEGER NOT NULL DEFAULT 0,
    "certainty_level" "LeadCertaintyLevel" NOT NULL DEFAULT 'LOW',
    "downtime_cost_per_day" INTEGER,
    "estimate_json" JSONB,
    "surface" "LogisticsLeadSurface" NOT NULL DEFAULT 'LANDING',
    "campaign" TEXT,
    "referer" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "consent_at" TIMESTAMP(3),
    "upload_token_hash" TEXT,
    "upload_token_expires_at" TIMESTAMP(3),
    "assigned_to_user_id" TEXT,
    "ops_note" TEXT,
    "contacted_at" TIMESTAMP(3),
    "quoted_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "lost_reason" TEXT,
    "converted_enterprise_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_quote_request_photos" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "kind" "LogisticsLeadPhotoKind" NOT NULL,
    "url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_quote_request_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_quote_request_events" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "from_status" "LogisticsLeadStatus",
    "to_status" "LogisticsLeadStatus",
    "actor_user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_quote_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_id_key" ON "users"("supabase_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_activity_logs_actor" ON "activity_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_logs_action" ON "activity_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_logs_target" ON "activity_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_user_id_key" ON "vendors"("user_id");

-- CreateIndex
CREATE INDEX "idx_vendors_phone" ON "vendors"("phone");

-- CreateIndex
CREATE INDEX "idx_vendors_managed_by_liaison" ON "vendors"("managed_by_liaison_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_external_source_external_seller_id_key" ON "vendors"("external_source", "external_seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_guarantee_signatures_vendor_id_guarantee_type_key" ON "vendor_guarantee_signatures"("vendor_id", "guarantee_type");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_kyc_vendor_id_key" ON "vendor_kyc"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contracts_token_key" ON "vendor_contracts"("token");

-- CreateIndex
CREATE INDEX "idx_vendor_contracts_vendor" ON "vendor_contracts"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_vendor_contracts_status" ON "vendor_contracts"("status");

-- CreateIndex
CREATE INDEX "idx_data_deletion_requests_user" ON "data_deletion_requests"("user_id");

-- CreateIndex
CREATE INDEX "idx_catalog_items_vendor_status" ON "catalog_items"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "idx_catalog_items_created_by_liaison" ON "catalog_items"("created_by_liaison_id");

-- CreateIndex
CREATE INDEX "idx_catalog_items_oem_group" ON "catalog_items"("oem_reference", "part_source", "condition");

-- CreateIndex
CREATE INDEX "idx_catalog_items_category" ON "catalog_items"("category", "subcategory");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_external_source_external_source_id_key" ON "catalog_items"("external_source", "external_source_id");

-- CreateIndex
CREATE INDEX "idx_fitments_brand_model" ON "catalog_item_fitments"("brand", "model");

-- CreateIndex
CREATE INDEX "idx_fitments_item" ON "catalog_item_fitments"("catalog_item_id");

-- CreateIndex
CREATE INDEX "idx_catalog_photos_item" ON "catalog_item_photos"("catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_photos_catalog_item_id_position_key" ON "catalog_item_photos"("catalog_item_id", "position");

-- CreateIndex
CREATE INDEX "idx_jobs_status_type" ON "jobs"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_slug_key" ON "enterprises"("slug");

-- CreateIndex
CREATE INDEX "idx_enterprises_slug" ON "enterprises"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_enterprise" ON "invoices"("enterprise_id");

-- CreateIndex
CREATE INDEX "idx_invoices_issued_at" ON "invoices"("issued_at");

-- CreateIndex
CREATE INDEX "idx_monthly_invoices_enterprise" ON "enterprise_monthly_invoices"("enterprise_id");

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_monthly_invoices_enterprise_id_year_month_key" ON "enterprise_monthly_invoices"("enterprise_id", "year", "month");

-- CreateIndex
CREATE INDEX "idx_enterprise_subs_enterprise" ON "enterprise_subscriptions"("enterprise_id");

-- CreateIndex
CREATE INDEX "idx_enterprise_subs_status" ON "enterprise_subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_subscription_events_sub" ON "enterprise_subscription_events"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_subscription_events_kind" ON "enterprise_subscription_events"("kind");

-- CreateIndex
CREATE INDEX "idx_buffer_stock_enterprise" ON "enterprise_buffer_stock"("enterprise_id");

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_buffer_stock_enterprise_id_catalog_item_id_key" ON "enterprise_buffer_stock"("enterprise_id", "catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_requests_order_id_key" ON "part_requests"("order_id");

-- CreateIndex
CREATE INDEX "idx_part_requests_enterprise_status" ON "part_requests"("enterprise_id", "status");

-- CreateIndex
CREATE INDEX "idx_part_requests_vehicle" ON "part_requests"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_part_requests_created_by" ON "part_requests"("created_by_user_id");

-- CreateIndex
CREATE INDEX "idx_part_requests_status" ON "part_requests"("status");

-- CreateIndex
CREATE INDEX "idx_part_request_photos_request" ON "part_request_photos"("part_request_id");

-- CreateIndex
CREATE INDEX "idx_part_request_events_request" ON "part_request_events"("part_request_id");

-- CreateIndex
CREATE INDEX "idx_part_request_events_created_at" ON "part_request_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_maintenance_centers_enterprise" ON "maintenance_centers"("enterprise_id");

-- CreateIndex
CREATE INDEX "idx_enterprise_members_user" ON "enterprise_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enterprise_members_enterprise_id_user_id_key" ON "enterprise_members"("enterprise_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_schedules_vehicle" ON "maintenance_schedules"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_schedules_vehicle_kind" ON "maintenance_schedules"("vehicle_id", "kind");

-- CreateIndex
CREATE INDEX "idx_vehicles_user" ON "vehicles"("user_id");

-- CreateIndex
CREATE INDEX "idx_vehicles_enterprise" ON "vehicles"("enterprise_id");

-- CreateIndex
CREATE INDEX "idx_vehicles_plate" ON "vehicles"("plate");

-- CreateIndex
CREATE INDEX "idx_vehicles_home_center" ON "vehicles"("home_center_id");

-- CreateIndex
CREATE INDEX "idx_return_orders_order" ON "return_orders"("order_id");

-- CreateIndex
CREATE INDEX "idx_return_orders_enterprise_status" ON "return_orders"("enterprise_id", "status");

-- CreateIndex
CREATE INDEX "idx_return_orders_status" ON "return_orders"("status");

-- CreateIndex
CREATE INDEX "idx_seller_reviews_vendor" ON "seller_reviews"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "seller_reviews_order_id_reviewer_id_key" ON "seller_reviews"("order_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "idx_delivery_reviews_rider" ON "delivery_reviews"("rider_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_reviews_delivery_id_reviewer_id_key" ON "delivery_reviews"("delivery_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "idx_disputes_order" ON "disputes"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_synonyms_typo_key" ON "search_synonyms"("typo");

-- CreateIndex
CREATE UNIQUE INDEX "orders_share_token_key" ON "orders"("share_token");

-- CreateIndex
CREATE INDEX "idx_orders_initiator" ON "orders"("initiator_id");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_vehicle" ON "orders"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_orders_enterprise" ON "orders"("enterprise_id");

-- CreateIndex
CREATE INDEX "idx_order_items_order" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_events_order" ON "order_events"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "idx_deliveries_rider" ON "deliveries"("rider_id");

-- CreateIndex
CREATE INDEX "idx_deliveries_status" ON "deliveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_transactions_order_id_key" ON "escrow_transactions"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_makes_slug_key" ON "vehicle_makes"("slug");

-- CreateIndex
CREATE INDEX "idx_vehicle_makes_slug" ON "vehicle_makes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_makes_external_source_external_source_id_key" ON "vehicle_makes"("external_source", "external_source_id");

-- CreateIndex
CREATE INDEX "idx_vehicle_models_make" ON "vehicle_models"("make_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_make_id_slug_key" ON "vehicle_models"("make_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_external_source_external_source_id_key" ON "vehicle_models"("external_source", "external_source_id");

-- CreateIndex
CREATE INDEX "idx_vehicle_generations_model_year" ON "vehicle_generations"("model_id", "year_start");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_generations_external_source_external_source_id_key" ON "vehicle_generations"("external_source", "external_source_id");

-- CreateIndex
CREATE INDEX "idx_vehicle_engines_generation" ON "vehicle_engines"("generation_id");

-- CreateIndex
CREATE INDEX "idx_vehicle_engines_code" ON "vehicle_engines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_engines_external_source_external_source_id_key" ON "vehicle_engines"("external_source", "external_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_categories_slug_key" ON "part_categories"("slug");

-- CreateIndex
CREATE INDEX "idx_part_categories_parent" ON "part_categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_part_references_category" ON "part_references"("category_id");

-- CreateIndex
CREATE INDEX "idx_part_references_oem" ON "part_references"("oem_number");

-- CreateIndex
CREATE UNIQUE INDEX "part_references_oem_number_brand_key" ON "part_references"("oem_number", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "part_references_external_source_external_source_id_key" ON "part_references"("external_source", "external_source_id");

-- CreateIndex
CREATE INDEX "idx_part_ref_fitments_engine" ON "part_reference_fitments"("vehicle_engine_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_reference_fitments_part_reference_id_vehicle_engine_id_key" ON "part_reference_fitments"("part_reference_id", "vehicle_engine_id");

-- CreateIndex
CREATE INDEX "idx_market_price_part_ref" ON "market_price_observations"("part_reference_id");

-- CreateIndex
CREATE INDEX "idx_market_price_source_time" ON "market_price_observations"("source", "observed_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_price_observations_source_source_item_id_key" ON "market_price_observations"("source", "source_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_vendors_osm_id_key" ON "competitor_vendors"("osm_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_vendors_gmaps_place_id_key" ON "competitor_vendors"("gmaps_place_id");

-- CreateIndex
CREATE INDEX "idx_competitor_vendors_type_zone" ON "competitor_vendors"("type", "zone");

-- CreateIndex
CREATE INDEX "idx_competitor_vendors_commune" ON "competitor_vendors"("commune");

-- CreateIndex
CREATE INDEX "idx_drivers_enterprise" ON "drivers"("enterprise_id");

-- CreateIndex
CREATE INDEX "idx_drivers_user" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_enterprise_id_phone_key" ON "drivers"("enterprise_id", "phone");

-- CreateIndex
CREATE INDEX "idx_driver_assignments_driver" ON "driver_assignments"("driver_id");

-- CreateIndex
CREATE INDEX "idx_driver_assignments_vehicle" ON "driver_assignments"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_driver_daily_driver" ON "driver_daily_records"("driver_id");

-- CreateIndex
CREATE INDEX "idx_driver_daily_vehicle" ON "driver_daily_records"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_daily_records_driver_id_date_key" ON "driver_daily_records"("driver_id", "date");

-- CreateIndex
CREATE INDEX "idx_driver_incidents_driver" ON "driver_incidents"("driver_id");

-- CreateIndex
CREATE INDEX "idx_driver_incidents_vehicle" ON "driver_incidents"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_part_enrichments_liaison" ON "part_enrichments"("liaison_id");

-- CreateIndex
CREATE INDEX "idx_part_enrichments_vendeur_date" ON "part_enrichments"("vendeur_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_part_enrichments_statut" ON "part_enrichments"("statut");

-- CreateIndex
CREATE INDEX "idx_cross_references_source" ON "cross_references"("ref_source");

-- CreateIndex
CREATE UNIQUE INDEX "cross_references_ref_source_ref_cible_marque_cible_key" ON "cross_references"("ref_source", "ref_cible", "marque_cible");

-- CreateIndex
CREATE INDEX "idx_manufacturer_contacts_marque" ON "manufacturer_contacts"("marque");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_contacts_marque_entite_role_key" ON "manufacturer_contacts"("marque", "entite", "role");

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_phone" ON "vendor_contacts"("phone");

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_liaison" ON "vendor_contacts"("liaison_id");

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_statut" ON "vendor_contacts"("statut");

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_relance" ON "vendor_contacts"("relance_le");

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_created_by" ON "vendor_contacts"("created_by_id");

-- CreateIndex
CREATE INDEX "idx_vendor_contacts_source" ON "vendor_contacts"("source");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contacts_source_source_ref_key" ON "vendor_contacts"("source", "source_ref");

-- CreateIndex
CREATE INDEX "idx_contact_activities_contact" ON "contact_activities"("contact_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_contact_activities_author" ON "contact_activities"("author_id");

-- CreateIndex
CREATE INDEX "idx_vendor_contact_links_contact" ON "vendor_contact_links"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contact_links_contact_id_url_key" ON "vendor_contact_links"("contact_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_quote_requests_reference_key" ON "logistics_quote_requests"("reference");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_status" ON "logistics_quote_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_phone" ON "logistics_quote_requests"("phone");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_ip" ON "logistics_quote_requests"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_assignee" ON "logistics_quote_requests"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_certainty" ON "logistics_quote_requests"("certainty_level");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_user" ON "logistics_quote_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_logistics_leads_enterprise" ON "logistics_quote_requests"("enterprise_id", "status");

-- CreateIndex
CREATE INDEX "idx_logistics_lead_photos_request" ON "logistics_quote_request_photos"("quote_request_id");

-- CreateIndex
CREATE INDEX "idx_logistics_lead_events_request" ON "logistics_quote_request_events"("quote_request_id", "created_at");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_managed_by_liaison_id_fkey" FOREIGN KEY ("managed_by_liaison_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_guarantee_signatures" ADD CONSTRAINT "vendor_guarantee_signatures_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_kyc" ADD CONSTRAINT "vendor_kyc_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_created_by_liaison_id_fkey" FOREIGN KEY ("created_by_liaison_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_fitments" ADD CONSTRAINT "catalog_item_fitments_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_photos" ADD CONSTRAINT "catalog_item_photos_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_monthly_invoices" ADD CONSTRAINT "enterprise_monthly_invoices_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_subscriptions" ADD CONSTRAINT "enterprise_subscriptions_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_subscription_events" ADD CONSTRAINT "enterprise_subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "enterprise_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_buffer_stock" ADD CONSTRAINT "enterprise_buffer_stock_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_buffer_stock" ADD CONSTRAINT "enterprise_buffer_stock_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_photos" ADD CONSTRAINT "part_request_photos_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_events" ADD CONSTRAINT "part_request_events_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_request_events" ADD CONSTRAINT "part_request_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_centers" ADD CONSTRAINT "maintenance_centers_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_members" ADD CONSTRAINT "enterprise_members_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_members" ADD CONSTRAINT "enterprise_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_home_center_id_fkey" FOREIGN KEY ("home_center_id") REFERENCES "maintenance_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_reviews" ADD CONSTRAINT "delivery_reviews_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_reviews" ADD CONSTRAINT "delivery_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_transactions" ADD CONSTRAINT "escrow_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_make_id_fkey" FOREIGN KEY ("make_id") REFERENCES "vehicle_makes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "vehicle_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_engines" ADD CONSTRAINT "vehicle_engines_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "vehicle_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_categories" ADD CONSTRAINT "part_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_references" ADD CONSTRAINT "part_references_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_reference_fitments" ADD CONSTRAINT "part_reference_fitments_part_reference_id_fkey" FOREIGN KEY ("part_reference_id") REFERENCES "part_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_reference_fitments" ADD CONSTRAINT "part_reference_fitments_vehicle_engine_id_fkey" FOREIGN KEY ("vehicle_engine_id") REFERENCES "vehicle_engines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_price_observations" ADD CONSTRAINT "market_price_observations_part_reference_id_fkey" FOREIGN KEY ("part_reference_id") REFERENCES "part_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_assignments" ADD CONSTRAINT "driver_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_assignments" ADD CONSTRAINT "driver_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_daily_records" ADD CONSTRAINT "driver_daily_records_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_daily_records" ADD CONSTRAINT "driver_daily_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_incidents" ADD CONSTRAINT "driver_incidents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_incidents" ADD CONSTRAINT "driver_incidents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_enrichments" ADD CONSTRAINT "part_enrichments_liaison_id_fkey" FOREIGN KEY ("liaison_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_enrichments" ADD CONSTRAINT "part_enrichments_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "vendor_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contact_links" ADD CONSTRAINT "vendor_contact_links_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "vendor_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_part_request_id_fkey" FOREIGN KEY ("part_request_id") REFERENCES "part_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_requests" ADD CONSTRAINT "logistics_quote_requests_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_request_photos" ADD CONSTRAINT "logistics_quote_request_photos_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "logistics_quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_quote_request_events" ADD CONSTRAINT "logistics_quote_request_events_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "logistics_quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

