import type { Role, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

export type ActivityAction =
  | 'LIAISON_VENDOR_CREATED'
  | 'LIAISON_VENDOR_UPDATED'
  | 'LIAISON_PART_CREATED'
  | 'LIAISON_QUICK_PART_CREATED'
  | 'LIAISON_PART_UPDATED'
  | 'LIAISON_COMMISSION_ACCEPTED'
  | 'ENRICHMENT_PHOTO_REUSE'
  | 'ENRICHMENT_RESUBMISSION'
  | 'ENRICHMENT_INSPECTION_REQUESTED'
  | 'ENRICHMENT_BLOCKED'
  | 'ENRICHMENT_APPROVED'
  | 'ENRICHMENT_MANUAL_REVIEW_NEEDED'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_ACTIVITY_LOGGED'
  | 'CONTACT_ASSIGNED'
  | 'CONTACT_CONVERTED'
  | 'CRM_INTERACTION_ADDED'
  | 'CRM_TASK_CREATED'
  | 'CRM_TASK_UPDATED'
  | 'CRM_RELANCE_SENT'
  | 'CRM_TAG_ASSIGNED'
  | 'STOCK_ADJUSTED'
  | 'STOCK_LOCATION_CREATED'
  | 'SUPPLIER_CREATED'
  | 'SUPPLIER_UPDATED'
  | 'PURCHASE_ORDER_CREATED'
  | 'PURCHASE_ORDER_UPDATED'
  | 'PURCHASE_ORDER_RECEIVED'
  | 'EQUIPE_PROFILE_UPDATED'
  | 'OBJECTIVE_SET'
  | 'COMMISSION_GENERATED'
  | 'COMMISSION_UPDATED'
  | 'COMMISSION_PAID'
  | 'COMMISSION_CANCELLED'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_LAUNCHED'
  | 'CAMPAIGN_CANCELLED'
  | 'DISPUTE_REVIEWED'
  | 'DISPUTE_RESOLVED'
  | 'DISPUTE_CLOSED'
  | 'RETURN_STATUS_UPDATED'
  | 'SOURCING_SEARCH_CREATED'
  | 'SOURCING_PO_CREATED'
  | 'SHIPMENT_CREATED'
  | 'PROSPECTION_INTERVIEW_CREATED'
  | 'PROSPECTION_CONSENT_RECORDED'
  | 'PROSPECTION_INTERVIEW_APPLIED'

interface RecordParams {
  actorId: string
  actorRole: Role
  action: ActivityAction
  targetType:
    | 'Vendor'
    | 'CatalogItem'
    | 'PartEnrichment'
    | 'VendorContact'
    | 'User'
    | 'CrmTask'
    | 'StockLocation'
    | 'StockLevel'
    | 'Supplier'
    | 'PurchaseOrder'
    | 'AgentObjective'
    | 'AgentCommission'
    | 'MarketingCampaign'
    | 'Dispute'
    | 'ReturnOrder'
    | 'SourcingSearch'
    | 'Shipment'
    | 'ProspectionInterview'
  targetId?: string | null
  payload?: Record<string, unknown>
}

export async function recordActivity(params: RecordParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        ...(params.payload !== undefined && {
          payload: params.payload as Prisma.InputJsonValue,
        }),
      },
    })
  } catch {
    // Best-effort — never fail the parent operation if logging fails
  }
}
