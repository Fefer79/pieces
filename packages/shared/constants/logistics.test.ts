import { describe, it, expect } from 'vitest'
import {
  DOWNTIME_COST_PER_DAY,
  resolveEconomyCategory,
  matchLogisticsFamily,
  chargeableWeightKg,
  computeArbitrageMatrix,
  PART_LOGISTICS_FAMILIES,
  DEFAULT_FAMILY,
  LOGISTICS_MODES,
  SEA_LCL_MIN_CHARGEABLE_KG,
} from './logistics'

const familyById = (id: string) => PART_LOGISTICS_FAMILIES.find((f) => f.id === id) ?? null

describe('resolveEconomyCategory', () => {
  it('classes an EV as premium electric whatever the model', () => {
    expect(resolveEconomyCategory({ energyType: 'EV', model: 'NAT' })).toBe('PREMIUM_EV')
  })

  it('classes known city cars as economy', () => {
    expect(resolveEconomyCategory({ energyType: 'ICE', model: 'Alto' })).toBe('ECONOMY_ICE')
    expect(resolveEconomyCategory({ model: 'Starlet' })).toBe('ECONOMY_ICE')
  })

  it('defaults to premium thermal', () => {
    expect(resolveEconomyCategory({ energyType: 'ICE', model: 'B70' })).toBe('PREMIUM_ICE')
    expect(resolveEconomyCategory({})).toBe('PREMIUM_ICE')
  })
})

describe('matchLogisticsFamily', () => {
  it('matches on the part name, accent-insensitive', () => {
    expect(matchLogisticsFamily('Plaquettes avant')?.id).toBe('BRAKE_PADS')
    expect(matchLogisticsFamily('Démarreur')?.id).toBe('ALTERNATOR_STARTER')
    expect(matchLogisticsFamily('demarreur')?.id).toBe('ALTERNATOR_STARTER')
  })

  it('prefers the longest keyword so "moteur complet" beats "moteur"', () => {
    expect(matchLogisticsFamily('Moteur complet')?.id).toBe('ENGINE')
  })

  it('combines name and category', () => {
    expect(matchLogisticsFamily('Avant droit', 'Carrosserie / Pare-chocs')?.id).toBe('BUMPER')
  })

  it('ne fait plus passer une pièce de transmission pour une boîte de vitesses', () => {
    // Le mot-clé « transmission » rattachait un cardan de 13 kg à une boîte de
    // 67 kg : le fret express estimé était multiplié par cinq.
    expect(matchLogisticsFamily('Cardan avant droit', 'Transmission / Cardan')?.id).toBe('DRIVESHAFT')
    expect(matchLogisticsFamily('Croisillon de transmission')?.id).toBe('DRIVESHAFT')
    expect(matchLogisticsFamily('Boîte de vitesses complète')?.id).toBe('GEARBOX')
    expect(matchLogisticsFamily('Boîte automatique')?.id).toBe('GEARBOX')
  })

  it('exige des mots entiers : « boîtier » n’est pas une « boîte »', () => {
    expect(matchLogisticsFamily('Boîtier papillon')?.id).toBe('SMALL_ELECTRIC')
    expect(matchLogisticsFamily('Boîtier de direction')?.id).toBe('STEERING')
  })

  it('n’envoie au moteur complet que ce qui en est un', () => {
    expect(matchLogisticsFamily('Moteur complet')?.id).toBe('ENGINE')
    expect(matchLogisticsFamily('Bloc moteur')?.id).toBe('ENGINE')
    // « support moteur » et « volant moteur » pesaient 185 kg dans l'ancienne
    // recherche par sous-chaîne.
    expect(matchLogisticsFamily('Support moteur')).toBeNull()
    expect(matchLogisticsFamily('Volant moteur')?.id).toBe('CLUTCH_KIT')
  })

  it('fait primer le nom de la pièce sur sa catégorie', () => {
    // Sans cette priorité, la catégorie « Moteur / … » emportait tout.
    expect(matchLogisticsFamily('Vilebrequin', 'Moteur / Vilebrequin')?.id).toBe('ENGINE_HEAVY_PART')
    expect(matchLogisticsFamily('Joint de culasse', 'Moteur / Joint de culasse')?.id).toBe('GASKET')
  })

  it('préfère le mot-clé le plus long à l’intérieur d’un même texte', () => {
    expect(matchLogisticsFamily('Filtre à particules (FAP)')?.id).toBe('EXHAUST')
    expect(matchLogisticsFamily('Filtre à huile')?.id).toBe('FILTER')
  })

  it('couvre les petites pièces courantes plutôt que de les laisser au gabarit générique', () => {
    expect(matchLogisticsFamily('Capteur ABS')?.id).toBe('SMALL_ELECTRIC')
    expect(matchLogisticsFamily('Injecteur diesel')?.id).toBe('SMALL_ELECTRIC')
    expect(matchLogisticsFamily('Courroie de distribution')?.id).toBe('BELT_KIT')
    expect(matchLogisticsFamily('Pompe à eau')?.id).toBe('PUMP')
    expect(matchLogisticsFamily('Rétroviseur droit')?.id).toBe('WIPER_MIRROR')
    expect(matchLogisticsFamily('Turbocompresseur')?.id).toBe('TURBO')
    expect(matchLogisticsFamily('Silencieux d’échappement')?.id).toBe('EXHAUST')
  })

  it('returns null when nothing matches', () => {
    expect(matchLogisticsFamily('Chose indéterminée')).toBeNull()
  })
})

describe('chargeableWeightKg', () => {
  it('bills air freight on volume when the part is bulky (divisor 6000)', () => {
    // 200 dm³ = 200 000 cm³ / 6000 = 33,3 kg > 7 kg réels
    expect(chargeableWeightKg('AIR_NOW', 7, 200)).toBeCloseTo(33.33, 1)
  })

  it('bills air freight on real weight when the part is dense', () => {
    expect(chargeableWeightKg('AIR_NOW', 60, 120)).toBe(60)
  })

  it('bills LCL at 1 m³ = 1 t', () => {
    expect(chargeableWeightKg('SEA_LCL', 7, 200)).toBe(200)
  })

  it('bills local delivery on real weight', () => {
    expect(chargeableWeightKg('LOCAL', 7, 200)).toBe(7)
  })
})

describe('computeArbitrageMatrix', () => {
  const shock = familyById('SHOCK_ABSORBER')

  it('adds downtime cost and ranks options by total cost', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_ICE,
      family: shock,
      options: [
        { mode: 'LOCAL', partPrice: 45_000 },
        { mode: 'AIR_NOW', partPrice: 32_000 },
        { mode: 'SEA_LCL', partPrice: 32_000 },
      ],
    })

    expect(result.options.map((o) => o.mode)).toEqual(['LOCAL', 'AIR_NOW', 'SEA_LCL'])
    expect(result.options[0].recommended).toBe(true)
    expect(result.options[0].extraCostVsBest).toBe(0)

    const local = result.options[0]
    // 2 jours × 30 000 F
    expect(local.downtimeCost).toBe(60_000)
    expect(local.totalCost).toBe(local.partPrice + local.freightCost + local.downtimeCost)
  })

  it('écarte le maritime quand il est plus lent sans être moins cher', () => {
    // Une petite pièce : le LCL n'a que ses frais fixes, il coûtait 30 000 F
    // contre 25 000 F en aérien économique — 45 jours d'attente pour payer plus.
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 0,
      family: familyById('SMALL_ELECTRIC'),
      options: [
        { mode: 'AIR_ECONOMY', partPrice: 0 },
        { mode: 'SEA_LCL', partPrice: 0 },
      ],
    })

    const [sea] = result.options.filter((o) => o.mode === 'SEA_LCL')
    expect(sea.available).toBe(false)
    expect(sea.warnings.join(' ')).toMatch(/non pertinent|sans être moins cher/)
    expect(result.options.find((o) => o.recommended)?.mode).toBe('AIR_ECONOMY')
  })

  it('écarte aussi le maritime au-dessus du seuil quand il reste dominé', () => {
    // Un rétroviseur pèse 1,75 kg en aérien (taxé au volume / 6) mais 9 kg
    // taxables en LCL : au-dessus du seuil, et pourtant plus cher que l'aérien.
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 0,
      family: familyById('WIPER_MIRROR'),
      options: [
        { mode: 'AIR_ECONOMY', partPrice: 0 },
        { mode: 'SEA_LCL', partPrice: 0 },
      ],
    })

    const [sea] = result.options.filter((o) => o.mode === 'SEA_LCL')
    expect(sea.chargeableWeightKg).toBeGreaterThan(SEA_LCL_MIN_CHARGEABLE_KG)
    expect(sea.available).toBe(false)
  })

  it('garde le maritime dès qu’il est réellement moins cher', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 0,
      family: familyById('GEARBOX'),
      options: [
        { mode: 'AIR_ECONOMY', partPrice: 0 },
        { mode: 'SEA_LCL', partPrice: 0 },
      ],
    })

    const [sea] = result.options.filter((o) => o.mode === 'SEA_LCL')
    expect(sea.available).toBe(true)
    const [eco] = result.options.filter((o) => o.mode === 'AIR_ECONOMY')
    expect(sea.freightCost).toBeLessThan(eco.freightCost)
  })

  it('ne laisse pas le coût d’immobilisation écarter une option en contexte flotte', () => {
    // L'immobilisation écrase tout le reste : jugée sur le coût total, la moindre
    // option lente disparaîtrait alors qu'elle reste parfaitement proposable.
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 30_000,
      family: familyById('GEARBOX'),
      options: [
        { mode: 'AIR_NOW', partPrice: 500_000 },
        { mode: 'AIR_STANDARD', partPrice: 500_000 },
        { mode: 'AIR_ECONOMY', partPrice: 500_000 },
        { mode: 'SEA_LCL', partPrice: 500_000 },
      ],
    })

    expect(result.options.every((o) => o.available)).toBe(true)
    expect(result.options.find((o) => o.recommended)?.mode).toBe('AIR_ECONOMY')
  })

  it('makes sea freight the most expensive option despite the cheapest part', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_EV,
      family: shock,
      options: [
        { mode: 'LOCAL', partPrice: 45_000 },
        { mode: 'SEA_LCL', partPrice: 32_000 },
      ],
    })

    const [local, sea] = result.options
    expect(local.mode).toBe('LOCAL')
    expect(sea.mode).toBe('SEA_LCL')
    expect(sea.partPrice).toBeLessThan(local.partPrice)
    expect(sea.totalCost).toBeGreaterThan(local.totalCost)
    // 45 j × 38 000 F
    expect(sea.downtimeCost).toBe(1_710_000)
  })

  it('ranks pre-positioned stock first even at a higher part price', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_EV,
      family: shock,
      options: [
        { mode: 'PRE_POSITIONED', partPrice: 47_000 },
        { mode: 'LOCAL', partPrice: 45_000 },
        { mode: 'AIR_NOW', partPrice: 32_000 },
      ],
    })

    expect(result.options[0].mode).toBe('PRE_POSITIONED')
    expect(result.options[0].recommended).toBe(true)
  })

  it('never recommends an unavailable option', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_ICE,
      family: shock,
      options: [
        { mode: 'LOCAL', partPrice: 10_000, available: false },
        { mode: 'AIR_NOW', partPrice: 32_000 },
      ],
    })

    expect(result.options[0].mode).toBe('LOCAL')
    expect(result.options[0].recommended).toBe(false)
    expect(result.options.find((o) => o.recommended)?.mode).toBe('AIR_NOW')
  })

  it('n’applique douane et frais d’envoi qu’aux options importées', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_ICE,
      family: shock,
      options: [
        { mode: 'LOCAL', partPrice: 45_000 },
        { mode: 'AIR_STANDARD', partPrice: 32_000 },
      ],
    })

    const [local, air] = result.options
    expect(local.mode).toBe('LOCAL')
    expect(air.mode).toBe('AIR_STANDARD')
    expect(local.customsCost).toBe(0)
    expect(local.serviceFee).toBe(0)
    expect(air.customsCost).toBeGreaterThan(0)
    // 10 % du prix de la pièce, assis sur elle seule — ni le fret ni la douane.
    expect(air.serviceFee).toBe(3_200)
  })

  it('facture les frais d’envoi à 10 % du prix de la pièce', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 0,
      family: shock,
      options: [{ mode: 'AIR_STANDARD', partPrice: 250_000 }],
    })

    const [air] = result.options
    expect(air.serviceFee).toBe(25_000)
    expect(air.totalCost).toBe(
      air.partPrice + air.freightCost + air.customsCost + air.serviceFee + air.downtimeCost,
    )
  })

  it('n’ajoute aucun frais d’envoi quand le prix de la pièce est inconnu', () => {
    // Le devis public tolère un prix vide : la ligne est alors à zéro et le
    // total s'annonce comme un plancher, jamais comme un coût complet.
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 0,
      family: shock,
      options: [{ mode: 'AIR_STANDARD', partPrice: 0 }],
    })

    expect(result.options[0].serviceFee).toBe(0)
  })

  it('enforces the freight minimum charge on a light part', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: DOWNTIME_COST_PER_DAY.PREMIUM_ICE,
      family: familyById('FILTER'),
      options: [{ mode: 'AIR_NOW', partPrice: 5_000 }],
    })

    expect(result.options[0].freightCost).toBe(LOGISTICS_MODES.AIR_NOW.minimumCharge)
  })

  it('flags air-restricted and fragile families', () => {
    const shockResult = computeArbitrageMatrix({
      downtimeCostPerDay: 30_000,
      family: shock,
      options: [{ mode: 'AIR_NOW', partPrice: 32_000 }],
    })
    expect(shockResult.options[0].warnings.join(' ')).toMatch(/restreinte en fret aérien/)

    const glassResult = computeArbitrageMatrix({
      downtimeCostPerDay: 30_000,
      family: familyById('WINDSHIELD'),
      options: [{ mode: 'SEA_LCL', partPrice: 90_000 }],
    })
    expect(glassResult.options[0].warnings.join(' ')).toMatch(/fragile/)
  })

  it('falls back to the generic family and reports FAMILY confidence', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 30_000,
      options: [{ mode: 'LOCAL', partPrice: 20_000 }],
    })
    expect(result.familyId).toBe(DEFAULT_FAMILY.id)
    expect(result.confidence).toBe('FAMILY')
  })

  it('reports MEASURED confidence when a real weight is supplied', () => {
    const result = computeArbitrageMatrix({
      downtimeCostPerDay: 30_000,
      weightKg: 4.2,
      volumeDm3: 15,
      family: shock,
      options: [{ mode: 'AIR_NOW', partPrice: 32_000 }],
    })
    expect(result.confidence).toBe('MEASURED')
    expect(result.weightKg).toBe(4.2)
  })
})
