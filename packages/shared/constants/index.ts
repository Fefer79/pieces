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
  CURRENCY_RATES_FCFA,
  RATES_UPDATED_AT,
  FIXED_PARITY_CURRENCIES,
  normalizeCurrency,
  toFcfa,
  formatCurrencyAmount,
} from './currencies'
export type { SupportedCurrency } from './currencies'
export {
  SHIPMENT_CARRIERS,
  SHIPMENT_CARRIER_KEYS,
  buildTrackingUrl,
  publicCarrierLabel,
  SHIPMENT_FLOW,
  SHIPMENT_STATUSES,
  SHIPMENT_TRANSITIONS,
  canTransitionShipment,
} from './carriers'
export type {
  ShipmentCarrierKey,
  CarrierSpec,
  ShipmentStatusKey,
  ShipmentStatusSpec,
} from './carriers'
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
