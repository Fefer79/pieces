'use client'

import { fmtFcfa } from '@/lib/admin-api'
import { ChartCard } from '@/components/ui/chart-card'
import { BUSINESS_UNIT_LABELS, type BusinessUnitKey } from 'shared/constants'

// Cockpit — les trois lignes d'activité du mois.
//
// Le reste du tableau de bord est marketplace-only ; ce bloc répond à l'autre
// question, celle de la direction. Il n'agrège que des tables existantes, et le
// rattachement d'une facture à une ligne d'activité est une heuristique
// (présence d'une entreprise) — c'est dit sous le graphique plutôt que caché.

export interface CockpitData {
  generatedAt: string
  businessUnit: BusinessUnitKey | null
  ventes: {
    caMois: number
    caMoisHt: number
    tvaMois: number
    facturesMois: number
    panierMoyen: number
    caMoisPrecedent: number
    evolutionPct: number | null
  }
  commandes: { actives: number; enAttentePaiement: number }
  flotte: {
    abonnementsActifs: number
    abonnementsEssai: number
    vehiculesGeres: number
    entreprises: number
  }
  logistique: { leadsOuverts: number; leadsGagnesMois: number }
  crm: { prospectsVendeurs: number; vendeursActifs: number }
  repartitionMois: Array<{ businessUnit: BusinessUnitKey; ca: number }>
  serieCa: Array<{ mois: string; ca: number; caHt: number; factures: number }>
}

const MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

/** « 2026-08 » → « août 26 ». */
function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const index = Number.parseInt(month ?? '1', 10) - 1
  return `${MONTHS_FR[index] ?? month} ${(year ?? '').slice(2)}`
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

export function Cockpit({ data }: { data: CockpitData }) {
  const { ventes, commandes, flotte, logistique, crm } = data
  const maxCa = Math.max(1, ...data.serieCa.map((b) => b.ca))
  const totalRepartition = data.repartitionMois.reduce((n, r) => n + r.ca, 0)

  const evolution =
    ventes.evolutionPct === null
      ? 'Pas de mois précédent à comparer'
      : `${ventes.evolutionPct >= 0 ? '+' : ''}${ventes.evolutionPct} % vs ${fmtFcfa(ventes.caMoisPrecedent)}`

  return (
    <section className="mb-6">
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="CA du mois" value={fmtFcfa(ventes.caMois)} hint={evolution} />
        <Stat
          label="Factures du mois"
          value={ventes.facturesMois}
          hint={`Panier moyen ${fmtFcfa(ventes.panierMoyen)}`}
        />
        <Stat
          label="Commandes actives"
          value={commandes.actives}
          hint={`${commandes.enAttentePaiement} en attente de paiement`}
        />
        <Stat
          label="Véhicules gérés"
          value={flotte.vehiculesGeres}
          hint={`${flotte.entreprises} entreprise${flotte.entreprises > 1 ? 's' : ''}`}
        />
        <Stat
          label="Abonnements actifs"
          value={flotte.abonnementsActifs}
          hint={`${flotte.abonnementsEssai} en période d’essai`}
        />
        <Stat
          label="Leads logistique"
          value={logistique.leadsOuverts}
          hint={`${logistique.leadsGagnesMois} gagné${logistique.leadsGagnesMois > 1 ? 's' : ''} ce mois`}
        />
        <Stat
          label="Prospects vendeurs"
          value={crm.prospectsVendeurs}
          hint={`${crm.vendeursActifs} vendeurs actifs`}
        />
        <Stat
          label="TVA du mois"
          value={fmtFcfa(ventes.tvaMois)}
          hint={`HT ${fmtFcfa(ventes.caMoisHt)}`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard
          title="Chiffre d’affaires facturé"
          className="lg:col-span-2"
          hint="Source : factures émises. La logistique n’en produit pas encore — elle se suit au tunnel de cotation."
        >
          {/* Barres en CSS : six valeurs ne justifient pas de charger Chart.js
              de plus dans cette page. */}
          <div className="flex h-40 items-end gap-2">
            {data.serieCa.map((bucket) => (
              <div key={bucket.mois} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-muted">
                  {bucket.ca > 0 ? fmtFcfa(bucket.ca) : ''}
                </span>
                <div
                  className="w-full rounded-t-sm bg-ink-2"
                  style={{ height: `${Math.round((bucket.ca / maxCa) * 100)}%`, minHeight: '2px' }}
                  title={`${bucket.factures} facture${bucket.factures > 1 ? 's' : ''}`}
                />
                <span className="font-mono text-[10px] text-muted">{monthLabel(bucket.mois)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Répartition du mois"
          hint="Rattachement déduit de la présence d’une entreprise sur la facture, faute de ligne d’activité stockée à la source."
        >
          {totalRepartition === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted">Aucune facture ce mois-ci.</p>
          ) : (
            <div className="space-y-3 py-2">
              {data.repartitionMois.map((row) => (
                <div key={row.businessUnit}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="text-ink">{BUSINESS_UNIT_LABELS[row.businessUnit]}</span>
                    <span className="font-mono tabular text-muted">{fmtFcfa(row.ca)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((row.ca / totalRepartition) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </section>
  )
}
