-- Enterprise subscriptions (Phase 1 — packaging Pro Flotte 3 niveaux).
-- Foundation only: data model + audit trail. Activation is manual via admin UI.
-- No payment integration in this phase.

CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO_FLOTTE', 'PRO_FLOTTE_PLUS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionEventKind" AS ENUM (
  'CREATED',
  'TRIAL_STARTED',
  'TRIAL_ENDED',
  'ACTIVATED',
  'SUSPENDED',
  'REACTIVATED',
  'CANCELLED',
  'TIER_CHANGED',
  'CYCLE_CHANGED',
  'ROI_GUARANTEE_INVOKED',
  'SLA_BREACH'
);

CREATE TABLE "enterprise_subscriptions" (
  "id"                  TEXT NOT NULL,
  "enterprise_id"       TEXT NOT NULL,
  "tier"                "SubscriptionTier" NOT NULL,
  "status"              "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "billing_cycle"       "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "trial_ends_at"       TIMESTAMP(3),
  "started_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_end"  TIMESTAMP(3),
  "cancelled_at"        TIMESTAMP(3),
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "enterprise_subscriptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "enterprise_subscriptions"
  ADD CONSTRAINT "enterprise_subscriptions_enterprise_id_fkey"
  FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_enterprise_subs_enterprise" ON "enterprise_subscriptions" ("enterprise_id");
CREATE INDEX "idx_enterprise_subs_status"     ON "enterprise_subscriptions" ("status");

CREATE TABLE "enterprise_subscription_events" (
  "id"               TEXT NOT NULL,
  "subscription_id"  TEXT NOT NULL,
  "kind"             "SubscriptionEventKind" NOT NULL,
  "payload"          JSONB,
  "actor_user_id"    TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "enterprise_subscription_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "enterprise_subscription_events"
  ADD CONSTRAINT "enterprise_subscription_events_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "enterprise_subscriptions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "idx_subscription_events_sub"  ON "enterprise_subscription_events" ("subscription_id");
CREATE INDEX "idx_subscription_events_kind" ON "enterprise_subscription_events" ("kind");
