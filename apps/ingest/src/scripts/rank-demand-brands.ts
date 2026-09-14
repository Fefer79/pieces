/**
 * Classe les marques par demande réelle observée en base, pour piloter le ciblage
 * des scrapers d'import (Opisto & co.) au lieu du score curé de `ci-marques.ts`.
 *
 * Lecture seule. Lancer avec la base de PROD :
 *   pnpm -F ingest demand:brands
 */
import { prisma } from '../lib/prisma.ts'

type Row = Record<string, unknown>

const show = (label: string, rows: Row[]): void => {
  console.log(`\n### ${label}`)
  console.table(
    rows.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]),
      ),
    ),
  )
}

async function main(): Promise<void> {
  show(
    'Parc véhicules par marque',
    await prisma.$queryRaw`SELECT brand, COUNT(*)::int AS n FROM vehicles GROUP BY brand ORDER BY n DESC LIMIT 25`,
  )
  show(
    'Fitments (annonces couvrant la marque)',
    await prisma.$queryRaw`SELECT brand, COUNT(DISTINCT catalog_item_id)::int AS n FROM catalog_item_fitments GROUP BY brand ORDER BY n DESC LIMIT 25`,
  )
  show(
    'Demandes de pièces par marque du véhicule',
    await prisma.$queryRaw`SELECT v.brand, COUNT(*)::int AS n FROM part_requests pr JOIN vehicles v ON v.id = pr.vehicle_id GROUP BY v.brand ORDER BY n DESC LIMIT 20`,
  )
  show(
    'Catalogue par supply_mode',
    await prisma.$queryRaw`SELECT supply_mode, COUNT(*)::int AS n FROM catalog_items GROUP BY supply_mode ORDER BY n DESC`,
  )
  show(
    'Catalogue par source externe',
    await prisma.$queryRaw`SELECT external_source, COUNT(*)::int AS n FROM catalog_items GROUP BY external_source ORDER BY n DESC LIMIT 15`,
  )
  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
