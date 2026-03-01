# Modèles de données — Pièces

**Généré le :** 2026-03-01
**ORM :** Prisma 6.x
**Base de données :** PostgreSQL (hébergée sur Supabase)
**Schéma :** `packages/shared/prisma/schema.prisma`

---

## Vue d'ensemble

La base de données contient **16 modèles** et **15 enums** couvrant l'ensemble du domaine métier : utilisateurs multi-rôles, vendeurs avec KYC, catalogue avec IA, commandes tripartites, séquestre, livraison GPS, évaluations et litiges.

---

## Diagramme de relations

```
User ──1:1──► Vendor ──1:N──► CatalogItem
  │              │
  │              ├──1:1──► VendorKyc
  │              └──1:N──► VendorGuaranteeSignature
  │
  ├──1:N──► UserVehicle
  ├──1:N──► Order (initiator) ──1:N──► OrderItem
  │            │
  │            ├──1:N──► OrderEvent (audit trail)
  │            ├──1:1──► EscrowTransaction
  │            ├──1:1──► Delivery ──1:N──► DeliveryReview
  │            ├──1:N──► SellerReview
  │            └──1:N──► Dispute
  │
  ├──1:N──► Delivery (rider)
  ├──1:1──► NotificationPreference
  ├──1:N──► DataDeletionRequest
  ├──1:N──► SellerReview (reviewer)
  └──1:N──► DeliveryReview (reviewer)

Job (standalone)
SearchSynonym (standalone)
```

---

## Enums

| Enum | Valeurs |
|------|---------|
| `Role` | MECHANIC, OWNER, SELLER, RIDER, ADMIN, ENTERPRISE |
| `VendorStatus` | PENDING_ACTIVATION, ACTIVE, PAUSED |
| `VendorType` | FORMAL, INFORMAL |
| `KycType` | RCCM, CNI |
| `GuaranteeType` | RETURN_48H, WARRANTY_30D |
| `CatalogItemStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `OrderStatus` | DRAFT, PENDING_PAYMENT, PAID, VENDOR_CONFIRMED, DISPATCHED, IN_TRANSIT, DELIVERED, CONFIRMED, COMPLETED, CANCELLED |
| `PaymentMethod` | ORANGE_MONEY, MTN_MOMO, WAVE, COD |
| `EscrowStatus` | HELD, RELEASED, REFUNDED |
| `DeliveryStatus` | PENDING_ASSIGNMENT, ASSIGNED, PICKUP_IN_PROGRESS, IN_TRANSIT, DELIVERED, CONFIRMED, RETURNED |
| `DeliveryMode` | EXPRESS, STANDARD |
| `JobType` | IMAGE_PROCESS_VARIANTS, CATALOG_AI_IDENTIFY |
| `JobStatus` | PENDING, PROCESSING, COMPLETED, FAILED |
| `DisputeStatus` | OPEN, UNDER_REVIEW, RESOLVED_BUYER, RESOLVED_SELLER, CLOSED |
| `DeletionRequestStatus` | PENDING, APPROVED, REJECTED |

---

## Modèles détaillés

### User (`users`)

| Champ | Type | Contraintes |
|-------|------|-------------|
| id | UUID | PK, auto-généré |
| supabaseId | String | Unique |
| phone | String | Unique |
| roles | Role[] | Array d'enums |
| activeContext | Role? | Nullable |
| consentedAt | DateTime? | Nullable |
| createdAt | DateTime | Default now |
| updatedAt | DateTime | Auto-update |

**Relations :** Vendor (1:1), NotificationPreference (1:1), Orders (1:N initiator), Deliveries (1:N rider), UserVehicles (1:N), Reviews (1:N), Disputes (1:N), DataDeletionRequests (1:N)

---

### Vendor (`vendors`)

| Champ | Type | Contraintes |
|-------|------|-------------|
| id | UUID | PK |
| userId | UUID | Unique, FK→User |
| shopName | String | |
| contactName | String | |
| phone | String | |
| vendorType | VendorType | |
| status | VendorStatus | Default PENDING_ACTIVATION |
| deliveryZones | String[] | Communes d'Abidjan |
| createdAt/updatedAt | DateTime | |

**Relations :** User (1:1), VendorKyc (1:1), VendorGuaranteeSignatures (1:N), CatalogItems (1:N)

---

### CatalogItem (`catalog_items`)

| Champ | Type | Contraintes |
|-------|------|-------------|
| id | UUID | PK |
| vendorId | UUID | FK→Vendor |
| name | String | |
| category | String | |
| oemReference | String? | Référence constructeur |
| vehicleCompatibility | String? | |
| suggestedPrice | Int? | Prix suggéré par IA |
| price | Int? | Prix final vendeur |
| status | CatalogItemStatus | Default DRAFT |
| imageOriginalUrl | String? | Image originale |
| imageThumbUrl | String? | Thumbnail |
| imageSmallUrl | String? | Petite |
| imageMediumUrl | String? | Moyenne |
| imageLargeUrl | String? | Grande |
| aiConfidence | Float? | Score confiance IA |
| aiGenerated | Boolean | Default true |
| qualityScore | Float? | |
| qualityIssue | String? | |
| inStock | Boolean | Default true |
| priceUpdatedAt | DateTime? | |
| priceAlertFlag | Boolean? | |

**Index :** (vendorId, status)

---

### Order (`orders`)

| Champ | Type | Contraintes |
|-------|------|-------------|
| id | UUID | PK |
| initiatorId | UUID | FK→User |
| ownerPhone | String? | Téléphone propriétaire |
| status | OrderStatus | Default DRAFT |
| paymentMethod | PaymentMethod? | |
| shareToken | String | Unique |
| totalAmount | Int | |
| deliveryFee | Int? | |
| laborCost | Int? | Main d'oeuvre |
| vendorConfirmedAt | DateTime? | |
| paidAt | DateTime? | |
| cancelledAt | DateTime? | |

**Relations :** OrderItems (1:N), OrderEvents (1:N), EscrowTransaction (1:1), Delivery (1:1), SellerReviews (1:N), Disputes (1:N)

---

### OrderItem (`order_items`)

| Champ | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| orderId | UUID | FK→Order |
| catalogItemId | String | Référence (non FK strict) |
| vendorId | String | Snapshot vendeur |
| vendorShopName | String | Snapshot nom boutique |
| name | String | Snapshot nom pièce |
| category | String | Snapshot catégorie |
| priceSnapshot | Int | Prix figé à la commande |
| quantity | Int | Default 1 |
| imageThumbUrl | String? | |

---

### OrderEvent (`order_events`)

Audit trail immuable de chaque transition de statut.

| Champ | Type |
|-------|------|
| id | UUID |
| orderId | FK→Order |
| fromStatus | String |
| toStatus | String |
| actor | String |
| note | String? |
| createdAt | DateTime |

---

### Delivery (`deliveries`)

| Champ | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| orderId | UUID | Unique, FK→Order |
| riderId | UUID? | FK→User (livreur) |
| status | DeliveryStatus | Default PENDING_ASSIGNMENT |
| mode | DeliveryMode | Default STANDARD |
| pickupAddress/Lat/Lng | String/Float | Adresse enlèvement |
| deliveryAddress/Lat/Lng | String/Float | Adresse livraison |
| riderLat/riderLng | Float? | Position GPS live |
| estimatedAt | DateTime? | ETA |
| pickedUpAt | DateTime? | |
| deliveredAt | DateTime? | |
| confirmedAt | DateTime? | |
| clientAbsent | Boolean? | Protocole client absent |
| codAmount | Int? | Montant COD |
| receiptPhotoUrl | String? | Preuve livraison |

---

### EscrowTransaction (`escrow_transactions`)

| Champ | Type |
|-------|------|
| id | UUID |
| orderId | UUID (unique) |
| amount | Int |
| status | EscrowStatus (HELD/RELEASED/REFUNDED) |
| heldAt | DateTime |
| releasedAt | DateTime? |
| refundedAt | DateTime? |

---

### SellerReview / DeliveryReview

| Champ | Type |
|-------|------|
| id | UUID |
| orderId/deliveryId | FK |
| vendorId/riderId | String |
| reviewerId | FK→User |
| rating | Int (1-5) |
| comment | String? |

**Contrainte unique :** (orderId, reviewerId) / (deliveryId, reviewerId)

---

### Dispute (`disputes`)

| Champ | Type |
|-------|------|
| id | UUID |
| orderId | FK→Order |
| openedBy | FK→User |
| status | DisputeStatus |
| reason | String |
| evidence | String[] |
| resolution | String? |
| resolvedAt | DateTime? |

---

### Modèles auxiliaires

- **VendorKyc** : Type document (RCCM/CNI), numéro, flag public
- **VendorGuaranteeSignature** : Type garantie + date signature (unique par vendeur+type)
- **UserVehicle** : brand, model, year, VIN optionnel
- **Job** : File de jobs async (type, status, payload JSON, tentatives)
- **SearchSynonym** : Corrections typo → terme correct (typo unique)
- **NotificationPreference** : whatsapp (true), sms (false), push (false) par défaut
- **DataDeletionRequest** : Demande de suppression données (conformité ARTCI)

---

## Migrations

13 migrations datées 2026-03-01, appliquées dans l'ordre :

1. `init_user_model` — Table users
2. `add_vendor_and_kyc` — Tables vendors, vendor_kyc
3. `add_user_vehicles` — Table user_vehicles
4. `add_vendor_delivery_zones` — Colonne deliveryZones sur vendors
5. `add_catalog_items_and_jobs` — Tables catalog_items, jobs
6. `add_catalog_stock_price_fields` — Champs stock/prix sur catalog_items
7. `add_orders_and_payments` — Tables orders, order_items, order_events, escrow_transactions
8. `add_deliveries` — Table deliveries
9. `add_reviews_and_disputes` — Tables seller_reviews, delivery_reviews, disputes
10. `add_guarantee_signatures` — Table vendor_guarantee_signatures
11. `add_consent_and_deletion_request` — Champ consentedAt + table data_deletion_requests
12. `add_notification_preferences` — Table notification_preferences
13. `add_search_synonyms_pg_trgm` — Table search_synonyms + extension pg_trgm
