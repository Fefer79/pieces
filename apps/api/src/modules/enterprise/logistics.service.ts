import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import {
  computeArbitrageMatrix,
  matchLogisticsFamily,
  resolveEconomyCategory,
  DOWNTIME_COST_PER_DAY,
  ANNUAL_PARTS_SPEND,
  type ArbitrageOptionInput,
  type ArbitrageResult,
  type VehicleEconomyCategory,
} from 'shared/constants'

export interface MatrixInput {
  /** Prix vendeur local (FCFA). Absent = pas d'option locale proposée. */
  localPrice?: number
  /** Prix usine / import (FCFA), commun aux options aériennes et maritime. */
  importPrice?: number
  /** Prix de sortie du stock pré-positionné (FCFA). */
  prePositionedPrice?: number
  localAvailable?: boolean
  localDelayDays?: number
  /** Poids/volume réels s'ils sont connus — sinon estimés depuis la famille de pièce. */
  weightKg?: number
  volumeDm3?: number
  /** Écrase le coût d'immobilisation dérivé de la catégorie du véhicule. */
  downtimeCostPerDay?: number
}

export interface MatrixResult extends ArbitrageResult {
  vehicle: {
    id: string
    brand: string
    model: string
    year: number
    plate: string | null
    energyType: string | null
    category: VehicleEconomyCategory
  }
  annualPartsSpend: number
  /** Vrai quand le coût d'immobilisation vient du paramétrage et non du barème. */
  downtimeCostOverridden: boolean
}

const IMPORT_MODES = ['AIR_NOW', 'AIR_STANDARD', 'AIR_ECONOMY', 'SEA_LCL'] as const

/**
 * Matrice d'arbitrage d'une demande de pièce : compare le coût total de chaque option
 * d'approvisionnement en intégrant le revenu perdu pendant l'immobilisation du véhicule.
 * Lecture seule — accessible à tout membre de l'entreprise.
 */
export async function computePartRequestMatrix(
  enterpriseId: string,
  userId: string,
  requestId: string,
  input: MatrixInput = {},
): Promise<MatrixResult> {
  await assertMember(enterpriseId, userId)

  const request = await prisma.partRequest.findFirst({
    where: { id: requestId, enterpriseId },
    select: {
      id: true,
      partName: true,
      category: true,
      description: true,
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          plate: true,
          energyType: true,
        },
      },
    },
  })
  if (!request) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const vehicle = request.vehicle
  const category = resolveEconomyCategory({
    energyType: vehicle.energyType,
    model: vehicle.model,
  })
  const downtimeCostPerDay = input.downtimeCostPerDay ?? DOWNTIME_COST_PER_DAY[category]

  const family = matchLogisticsFamily(request.partName, request.category)

  const options: ArbitrageOptionInput[] = []
  if (input.prePositionedPrice != null) {
    options.push({ mode: 'PRE_POSITIONED', partPrice: input.prePositionedPrice })
  }
  options.push({
    mode: 'LOCAL',
    partPrice: input.localPrice ?? 0,
    available: input.localAvailable ?? input.localPrice != null,
    ...(input.localDelayDays != null && { transitDays: input.localDelayDays }),
  })
  for (const mode of IMPORT_MODES) {
    options.push({ mode, partPrice: input.importPrice ?? 0 })
  }

  const matrix = computeArbitrageMatrix({
    downtimeCostPerDay,
    weightKg: input.weightKg,
    volumeDm3: input.volumeDm3,
    family,
    options,
  })

  return {
    ...matrix,
    vehicle: { ...vehicle, category },
    annualPartsSpend: ANNUAL_PARTS_SPEND[category],
    downtimeCostOverridden: input.downtimeCostPerDay != null,
  }
}
