import { prisma } from '../lib/prisma.ts'

async function main(): Promise<void> {
  const totals = await prisma.$queryRawUnsafe<Array<Record<string, number>>>(`
    SELECT
      (SELECT count(*) FROM vehicle_makes)::int AS makes,
      (SELECT count(*) FROM vehicle_models)::int AS models,
      (SELECT count(*) FROM vehicle_models WHERE year_start IS NOT NULL)::int AS models_with_year_start,
      (SELECT count(*) FROM vehicle_models WHERE year_end IS NULL AND year_start IS NOT NULL)::int AS still_in_production,
      (SELECT count(*) FROM vehicle_generations)::int AS generations,
      (SELECT count(*) FROM vehicle_engines)::int AS engines
  `)
  console.log('Totaux:')
  console.log(JSON.stringify(totals[0], null, 2))

  const perMake = await prisma.$queryRawUnsafe<Array<{ name: string; popularity_ci: number; models: number; with_year: number }>>(`
    SELECT m.name, m.popularity_ci, count(vm.*)::int AS models,
           count(vm.year_start)::int AS with_year
    FROM vehicle_makes m
    LEFT JOIN vehicle_models vm ON vm.make_id = m.id
    GROUP BY m.id
    ORDER BY m.popularity_ci DESC
  `)
  console.log('\nPar marque (triées par popularité CI):')
  console.table(perMake)

  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
