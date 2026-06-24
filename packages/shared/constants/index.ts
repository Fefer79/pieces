export { ABIDJAN_COMMUNES, ABIDJAN_DELIVERY_FEES } from './communes'
export type { AbidjanCommune } from './communes'
export { VEHICLE_BRANDS, VEHICLE_DATA, BRAND_NAMES, getEngines, VEHICLE_TYPES, DEFAULT_VEHICLE_TYPE } from './vehicles'
export type { VehicleType, VehicleTypeId } from './vehicles'
export { PART_CATEGORIES, PART_CATALOG, UNIVERSAL_CATEGORIES, isUniversalCategory } from './categories'
export type { PartCategory } from './categories'
export { parseCompatibilityText, extractFitmentsFromName } from './fitment'
export type { ParsedFitment, NameFitment } from './fitment'
export {
  MAINTENANCE_KIND_TO_PART,
  buildMaintenanceSearchHref,
} from './maintenance-parts'
export type { MaintenanceKindKey, MaintenancePartHint } from './maintenance-parts'
