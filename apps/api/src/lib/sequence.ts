import { prisma } from './prisma.js'
import { AppError } from './appError.js'

// Numérotation atomique des documents.
//
// Le problème corrigé : la numérotation des factures faisait
// `invoice.count() + 1`. Deux commandes payées en même temps lisaient le même
// compte et produisaient le même `invoiceNumber`, contraint `@unique` → l'une
// des deux plantait, et la facture n'était jamais émise pour un client qui
// avait pourtant payé.
//
// La parade est un `INSERT … ON CONFLICT DO UPDATE … RETURNING` : une seule
// requête, donc un seul verrou de ligne Postgres, donc aucune fenêtre entre la
// lecture et l'écriture. Deux appels concurrents obtiennent 1 et 2, jamais 1
// et 1.
//
// ⚠ Ne JAMAIS remplacer ceci par un findUnique suivi d'un update : ce serait
//   réintroduire exactement la course.

/** Compteurs connus. Les nouveaux domaines ajoutent leur clé ici. */
export type SequenceKey =
  | 'INVOICE'
  | 'CREDIT_NOTE'
  | 'PAYMENT'
  | 'JOURNAL_ENTRY'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'SUPPLIER_BILL'

export type SequencePeriod = 'MONTHLY' | 'YEARLY' | 'GLOBAL'

interface NextSequenceOptions {
  /** Granularité de remise à zéro. Défaut : mensuelle. */
  period?: SequencePeriod
}

function periodFor(date: Date, period: SequencePeriod): { year: number; month: number } {
  if (period === 'GLOBAL') return { year: 0, month: 0 }
  if (period === 'YEARLY') return { year: date.getFullYear(), month: 0 }
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

/**
 * Réserve et renvoie le prochain numéro pour `key` sur la période de `date`.
 *
 * Le numéro est consommé dès l'appel : si le traitement appelant échoue
 * ensuite, le numéro est perdu (trou dans la série). C'est le compromis
 * habituel et il est volontaire — l'alternative (verrou tenu jusqu'au commit)
 * sérialiserait toute la facturation.
 */
export async function nextSequence(
  key: SequenceKey,
  date: Date = new Date(),
  options: NextSequenceOptions = {},
): Promise<number> {
  const { year, month } = periodFor(date, options.period ?? 'MONTHLY')

  const rows = await prisma.$queryRaw<Array<{ next_value: number }>>`
    INSERT INTO "sequences" ("id", "key", "year", "month", "next_value", "updated_at")
    VALUES (gen_random_uuid()::text, ${key}, ${year}, ${month}, 2, NOW())
    ON CONFLICT ("key", "year", "month")
    DO UPDATE SET "next_value" = "sequences"."next_value" + 1, "updated_at" = NOW()
    RETURNING "next_value"
  `

  const returned = rows[0]?.next_value
  if (returned === undefined) {
    // Impossible en pratique : un INSERT … RETURNING renvoie toujours une ligne.
    throw new AppError('SEQUENCE_UNAVAILABLE', 500, {
      message: 'Numérotation indisponible, réessayez',
      key,
    })
  }

  // À l'insertion on stocke déjà 2 (la valeur suivante) et on rend 1.
  // À la mise à jour, `next_value` a été incrémenté et vaut le numéro rendu.
  return returned - 1
}

/**
 * Formate un numéro de document : `PCS-202607-00001`.
 * Conserve exactement le format historique des factures.
 */
export function formatDocumentNumber(prefix: string, date: Date, seq: number): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${prefix}-${y}${m}-${String(seq).padStart(5, '0')}`
}
