-- Encaissement des abonnements flotte par mobile money (CinetPay).
-- Une ligne par tentative de paiement d'une période — les tentatives échouées
-- sont conservées : c'est la seule trace exploitable quand un client affirme
-- avoir payé.

-- AlterEnum : Moov Money manquait aux moyens de paiement.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MOOV_MONEY';

-- AlterEnum : cycle de vie de l'encaissement dans le journal d'abonnement.
ALTER TYPE "SubscriptionEventKind" ADD VALUE IF NOT EXISTS 'PAYMENT_INITIATED';
ALTER TYPE "SubscriptionEventKind" ADD VALUE IF NOT EXISTS 'PAYMENT_RECEIVED';
ALTER TYPE "SubscriptionEventKind" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "SubscriptionEventKind" ADD VALUE IF NOT EXISTS 'RENEWED';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_payments" (
    "id" TEXT NOT NULL,
    "enterprise_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "transaction_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "vehicle_count" INTEGER NOT NULL,
    "operator" "PaymentMethod" NOT NULL,
    "payer_phone" TEXT NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_url" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payments_transaction_id_key" ON "subscription_payments"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_sub_payments_enterprise" ON "subscription_payments"("enterprise_id");
CREATE INDEX IF NOT EXISTS "idx_sub_payments_status" ON "subscription_payments"("status");

-- AddForeignKey
ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_enterprise_id_fkey"
  FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "enterprise_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
