'use client'

import { useState } from 'react'
import type { CrmSubject } from '@/lib/crm-api'
import { CrmTimeline } from './crm-timeline'
import { CrmInteractionForm } from './crm-interaction-form'
import { CrmTasks } from './crm-tasks'
import { CrmTagEditor } from './crm-tag-editor'
import { CrmRelanceDialog } from './crm-relance-dialog'

/**
 * Bloc CRM mutualisé des fiches admin (client USER / vendeur VENDOR) :
 * tags, timeline fusionnée, ajout d'interaction, tâches et relance WhatsApp.
 */
export function CrmSection({ subject, subjectId }: { subject: CrmSubject; subjectId: string }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [relanceOpen, setRelanceOpen] = useState(false)
  const refresh = () => setRefreshKey((k) => k + 1)

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">CRM</h2>
        <button
          onClick={() => setRelanceOpen(true)}
          className="rounded-sm border border-accent/50 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20"
        >
          Relance WhatsApp
        </button>
      </div>

      <div className="mb-4 border-b border-border pb-4">
        <CrmTagEditor subject={subject} subjectId={subjectId} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Timeline</h3>
          <CrmTimeline subject={subject} subjectId={subjectId} refreshKey={refreshKey} />
        </div>
        <div className="space-y-5 lg:col-span-2">
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Ajouter une interaction</h3>
            <CrmInteractionForm subject={subject} subjectId={subjectId} onCreated={refresh} />
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Tâches</h3>
            <CrmTasks subject={subject} subjectId={subjectId} />
          </div>
        </div>
      </div>

      {relanceOpen && (
        <CrmRelanceDialog
          subject={subject}
          subjectId={subjectId}
          onClose={() => setRelanceOpen(false)}
          onSent={refresh}
        />
      )}
    </section>
  )
}
