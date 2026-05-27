import { prisma } from '../lib/prisma.ts'

async function main(): Promise<void> {
  const stats = await prisma.$queryRawUnsafe<Array<Record<string, number>>>(`
    SELECT
      (SELECT count(*) FROM competitor_vendors)::int AS total,
      (SELECT count(*) FROM competitor_vendors WHERE estimated_size='LARGE')::int AS large_size,
      (SELECT count(*) FROM competitor_vendors WHERE estimated_size='MEDIUM')::int AS medium_size,
      (SELECT count(*) FROM competitor_vendors WHERE estimated_size='SMALL')::int AS small_size,
      (SELECT count(*) FROM competitor_vendors WHERE phone IS NOT NULL)::int AS with_phone,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Adjamé')::int AS adjame,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Treichville')::int AS treichville,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Yopougon')::int AS yopougon,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Marcory')::int AS marcory,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Cocody')::int AS cocody,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Abobo')::int AS abobo,
      (SELECT count(*) FROM competitor_vendors WHERE commune='Koumassi')::int AS koumassi
  `)
  console.log(JSON.stringify(stats[0], null, 2))
  const top = await prisma.competitorVendor.findMany({
    where: { phone: { not: null } },
    orderBy: { name: 'asc' },
    take: 10,
    select: { name: true, phone: true, commune: true, specialties: true },
  })
  console.log('\nTop 10 enseignes avec téléphone:')
  console.table(top)
  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
