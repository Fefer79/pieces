// Partagé entre la liste et le détail d'une expédition — un fichier de page
// App Router ne peut pas exporter autre chose que son composant et les options
// de segment.

import type { ChipVariant } from '@/components/ui/chip'
import type { ShipmentStatus } from '@/lib/sourcing-api'

export const STATUS_CHIP: Record<ShipmentStatus, ChipVariant> = {
  SOURCING: 'plain',
  COLLECTED: 'oem',
  IN_TRANSIT: 'status-warn',
  CUSTOMS: 'status-warn',
  LOCAL_DELIVERY: 'status-warn',
  DELIVERED: 'status-ok',
  CANCELLED: 'status-err',
}
