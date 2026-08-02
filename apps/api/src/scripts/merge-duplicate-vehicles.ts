/**
 * Fusionne les véhicules en double d'un parc, par plaque canonique.
 *
 * L'import ne dédoublonnait pas contre la base : réimporter un fichier
 * dupliquait la flotte. Comme l'abonnement se facture au véhicule, chaque
 * doublon est aussi une ligne de facturation en trop.
 *
 * Le survivant est le véhicule le plus ancien (createdAt) ; on lui rattache
 * l'historique des doublons — commandes, entretiens, affectations chauffeur,
 * relevés, incidents, demandes de pièces, cotations — puis on les supprime.
 * Le kilométrage retenu est le plus élevé rencontré : un doublon plus récent
 * porte souvent le compteur à jour.
 *
 * DRY-RUN PAR DÉFAUT. `--apply` exécute réellement.
 *
 *   pnpm -F api tsx src/scripts/merge-duplicate-vehicles.ts            # rapport
 *   pnpm -F api tsx src/scripts/merge-duplicate-vehicles.ts --apply    # exécution
 *
 * ATTENTION : la base applicative de production est Prisma Postgres
 * (db.prisma.io). Le .env local pointe une base fantôme — lancer ce script sans
 * DATABASE_URL de prod ne fait rien d'utile. Vérifier la cible avant --apply.
 */
import { prisma } from '../lib/prisma.js'
import { canonicalPlate } from '../lib/plate.js'

const APPLY = process.argv.includes('--apply')

type VehicleRow = {
  id: string
  enterpriseId: string | null
  plate: string | null
  brand: string
  model: string
  mileage: number | null
  createdAt: Date
}

async function countChildren(vehicleId: string) {
  const [orders, schedules, assignments, dailyRecords, incidents, partRequests, quotes] =
    await Promise.all([
      prisma.order.count({ where: { vehicleId } }),
      prisma.maintenanceSchedule.count({ where: { vehicleId } }),
      prisma.driverAssignment.count({ where: { vehicleId } }),
      prisma.driverDailyRecord.count({ where: { vehicleId } }),
      prisma.driverIncident.count({ where: { vehicleId } }),
      prisma.partRequest.count({ where: { vehicleId } }),
      prisma.logisticsQuoteRequest.count({ where: { vehicleId } }),
    ])
  return { orders, schedules, assignments, dailyRecords, incidents, partRequests, quotes }
}

async function reassign(fromId: string, toId: string) {
  await prisma.order.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
  await prisma.maintenanceSchedule.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
  await prisma.driverAssignment.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
  await prisma.driverDailyRecord.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
  await prisma.driverIncident.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
  await prisma.partRequest.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
  await prisma.logisticsQuoteRequest.updateMany({ where: { vehicleId: fromId }, data: { vehicleId: toId } })
}

async function main() {
  const vehicles = (await prisma.vehicle.findMany({
    where: { enterpriseId: { not: null }, plate: { not: null } },
    select: {
      id: true,
      enterpriseId: true,
      plate: true,
      brand: true,
      model: true,
      mileage: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })) as VehicleRow[]

  // Regroupement (entreprise, plaque canonique).
  const groups = new Map<string, { enterpriseId: string; plate: string; list: VehicleRow[] }>()
  for (const v of vehicles) {
    const plate = canonicalPlate(v.plate)
    if (!plate || !v.enterpriseId) continue
    const key = `${v.enterpriseId}::${plate}`
    const group = groups.get(key) ?? { enterpriseId: v.enterpriseId, plate, list: [] }
    group.list.push(v)
    groups.set(key, group)
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.list.length > 1)

  if (duplicateGroups.length === 0) {
    console.log('Aucun doublon de plaque. Rien à fusionner.')
    return
  }

  // Impact par flotte : c'est le nombre de véhicules facturés qui change.
  const perEnterprise = new Map<string, number>()
  for (const { enterpriseId, list } of duplicateGroups) {
    perEnterprise.set(enterpriseId, (perEnterprise.get(enterpriseId) ?? 0) + list.length - 1)
  }

  const enterprises = await prisma.enterprise.findMany({
    where: { id: { in: [...perEnterprise.keys()] } },
    select: { id: true, name: true, _count: { select: { vehicles: true } } },
  })

  console.log(`\n${APPLY ? '=== FUSION ===' : '=== RAPPORT À BLANC (aucune écriture) ==='}\n`)
  console.log(`${duplicateGroups.length} plaque(s) en double sur ${enterprises.length} flotte(s).\n`)

  for (const e of enterprises) {
    const removed = perEnterprise.get(e.id) ?? 0
    console.log(
      `${e.name} — ${e._count.vehicles} véhicules facturés → ${e._count.vehicles - removed} après fusion (−${removed})`,
    )
  }
  console.log('')

  let merged = 0
  for (const { plate, list } of duplicateGroups) {
    const [survivor, ...dupes] = list // trié par createdAt asc
    if (!survivor) continue

    console.log(`Plaque ${plate} — ${list.length} fiches`)
    console.log(`  garder  ${survivor.id} (${survivor.brand} ${survivor.model}, créé le ${survivor.createdAt.toISOString().slice(0, 10)})`)

    let maxMileage = survivor.mileage ?? 0
    for (const dupe of dupes) {
      const children = await countChildren(dupe.id)
      const total = Object.values(children).reduce((a, b) => a + b, 0)
      console.log(
        `  fusion  ${dupe.id} (${dupe.brand} ${dupe.model}) — ${total} enregistrement(s) rattaché(s) : ${JSON.stringify(children)}`,
      )
      if ((dupe.mileage ?? 0) > maxMileage) maxMileage = dupe.mileage ?? 0

      if (APPLY) {
        await reassign(dupe.id, survivor.id)
        await prisma.vehicle.delete({ where: { id: dupe.id } })
        merged++
      }
    }

    if (APPLY) {
      await prisma.vehicle.update({
        where: { id: survivor.id },
        data: {
          plateCanonical: plate,
          ...(maxMileage > (survivor.mileage ?? 0) ? { mileage: maxMileage } : {}),
        },
      })
    }
  }

  console.log('')
  if (APPLY) {
    console.log(`${merged} doublon(s) fusionné(s) et supprimé(s).`)
    console.log("La contrainte d'unicité peut maintenant être posée (migration 20260730_vehicle_plate_unique).")
  } else {
    console.log('Rien n’a été écrit. Relancer avec --apply pour exécuter la fusion.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
