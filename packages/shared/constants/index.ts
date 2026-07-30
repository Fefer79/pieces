export { ABIDJAN_COMMUNES, ABIDJAN_DELIVERY_FEES } from './communes'
export type { AbidjanCommune } from './communes'
export { computeDeliveryFee, DELIVERY_MODES } from './delivery-pricing'
export type { DeliveryPricingTier, DeliveryPricingMode, DeliveryFeeInput } from './delivery-pricing'
export { VEHICLE_BRANDS, VEHICLE_DATA, BRAND_NAMES, getEngines, VEHICLE_TYPES, DEFAULT_VEHICLE_TYPE } from './vehicles'
export type { VehicleType, VehicleTypeId } from './vehicles'
export {
  PART_CATEGORIES,
  PART_CATALOG,
  UNIVERSAL_CATEGORIES,
  isUniversalCategory,
  CATEGORY_SEPARATOR,
  splitCategory,
  joinCategory,
  subcategoryOf,
} from './categories'
export type { PartCategory } from './categories'
export { parseCompatibilityText, extractFitmentsFromName } from './fitment'
export type { ParsedFitment, NameFitment } from './fitment'
export {
  MAINTENANCE_KIND_TO_PART,
  buildMaintenanceSearchHref,
} from './maintenance-parts'
export type { MaintenanceKindKey, MaintenancePartHint } from './maintenance-parts'
export { WARRANTY_UNITS, warrantyToDays, formatWarranty, isWarrantyUnit } from './warranty'
export type { WarrantyUnit } from './warranty'
export {
  DOWNTIME_COST_PER_DAY,
  ANNUAL_PARTS_SPEND,
  resolveEconomyCategory,
  PART_LOGISTICS_FAMILIES,
  DEFAULT_FAMILY,
  matchLogisticsFamily,
  chargeableWeightKg,
  LOGISTICS_MODES,
  CUSTOMS_DUTY_RATE,
  LAST_MILE_FEE,
  computeArbitrageMatrix,
} from './logistics'
export type {
  VehicleEnergyType,
  VehicleEconomyCategory,
  LogisticsConfidence,
  PartLogisticsFamily,
  LogisticsMode,
  LogisticsModeSpec,
  ArbitrageInput,
  ArbitrageOptionInput,
  ArbitrageOption,
  ArbitrageResult,
} from './logistics'
export {
  CERTAINTY_WEIGHTS,
  CERTAINTY_LEVELS,
  CERTAINTY_SIGNAL_LABEL,
  computeCertainty,
  certaintyLevelSpec,
  nextBestSignal,
} from './logistics-lead'
export type {
  LeadCertaintySignal,
  LeadCertaintyLevel,
  LeadCertaintySignals,
  CertaintyLevelSpec,
} from './logistics-lead'
export {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  BUSINESS_UNITS,
  BUSINESS_UNIT_LABELS,
  ERP_CAPABILITIES,
  ERP_CAPABILITIES_LIST,
  ERP_CAPABILITY_LABELS,
  capabilitiesFor,
  hasCapability,
  hasAnyCapability,
} from './erp-rbac'
export type { StaffRoleKey, BusinessUnitKey, ErpCapability } from './erp-rbac'
