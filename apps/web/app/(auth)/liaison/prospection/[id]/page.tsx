'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import {
  PROSPECTION_CONSENT_SCRIPT,
  PROSPECTION_CONSENT_CHECKBOX_LABEL,
  PROSPECTION_CONSENT_METHOD_LABELS,
  PROSPECTION_CONSENT_METHODS,
  PROSPECTION_INTERVIEW_STATUS_LABELS,
  prospectionQuestionsByTheme,
  type ProspectionConsentMethodKey,
} from 'shared/constants'
import {
  prospectionFetch,
  prospectionUploadAudio,
  prospectionAudioUrl,
  type ProspectionInterview,
} from '@/lib/prospection-api'
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognizer,
} from '@/lib/prospection-speech'

const THEMES = prospectionQuestionsByTheme()

export default function ProspectionInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [interview, setInterview] = useState<ProspectionInterview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const r = await prospectionFetch<ProspectionInterview>(`/interviews/${id}`)
    if (r.ok) setInterview(r.data)
    else setError(r.message)
    setLoading(false)
  }, [id])

  useEffect(() => {
    let cancelled = false
    prospectionFetch<ProspectionInterview>(`/interviews/${id}`).then((r) => {
      if (cancelled) return
      if (r.ok) setInterview(r.data)
      else setError(r.message)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="h-24 animate-pulse rounded-md bg-card" />
      </div>
    )
  }
  if (error || !interview) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="rounded-md bg-error-bg p-3 text-sm text-error-fg">{error ?? 'Entretien introuvable'}</p>
        <Link href="/liaison/prospection" className="mt-3 inline-block text-sm text-ink-2 hover:underline">
          ← Retour
        </Link>
      </div>
    )
  }

  return interview.consent ? (
    <Cockpit interview={interview} onChange={setInterview} reload={reload} />
  ) : (
    <ConsentGate id={id} interview={interview} onDone={reload} />
  )
}

// ---------------------------------------------------------------------------
// Étape 1 — consentement (bloquant tant qu'il n'est pas donné)
// ---------------------------------------------------------------------------

function ConsentGate({
  id,
  interview,
  onDone,
}: {
  id: string
  interview: ProspectionInterview
  onDone: () => void
}) {
  const [ack, setAck] = useState(false)
  const [method, setMethod] = useState<ProspectionConsentMethodKey>('VERBAL')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = interview.prospect
    ? interview.prospect.shopName ?? interview.prospect.name
    : interview.vendor?.shopName ?? 'Vendeur'

  async function submit() {
    setSubmitting(true)
    setError(null)
    const r = await prospectionFetch(`/interviews/${id}/consent`, {
      method: 'POST',
      body: JSON.stringify({ method, scriptText: PROSPECTION_CONSENT_SCRIPT, acknowledged: true }),
    })
    setSubmitting(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    onDone()
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link href="/liaison/prospection" className="mb-2 inline-block text-sm text-ink-2 hover:underline">
        ← Retour
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Accord du vendeur</h1>
      <p className="mb-4 text-sm text-muted">
        {target} — l’enregistrement et la transcription ne démarrent qu’après l’accord explicite du
        vendeur.
      </p>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}

      <div className="rounded-md border border-ink/15 bg-[rgba(0,35,102,0.05)] p-4">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-2">
          À lire à voix haute
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">« {PROSPECTION_CONSENT_SCRIPT} »</p>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-ink">Forme de l’accord</legend>
        <div className="grid gap-2">
          {PROSPECTION_CONSENT_METHODS.map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                method === m ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]' : 'border-border bg-card'
              }`}
            >
              <input
                type="radio"
                name="method"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="mt-0.5"
              />
              <span className="text-ink">{PROSPECTION_CONSENT_METHOD_LABELS[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3 text-sm">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-ink">{PROSPECTION_CONSENT_CHECKBOX_LABEL}</span>
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={!ack || submitting}
        className="mt-5 w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-white transition-transform hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        style={{ minHeight: 48 }}
      >
        {submitting ? 'Enregistrement…' : 'Le vendeur est d’accord — continuer'}
      </button>
      <p className="mt-3 text-xs text-muted">
        L’accord est horodaté et la phrase lue est archivée avec l’entretien.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Étape 2 — cockpit d'entretien (téléprompteur + enregistrement + transcript)
// ---------------------------------------------------------------------------

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function Cockpit({
  interview,
  onChange,
  reload,
}: {
  interview: ProspectionInterview
  onChange: (i: ProspectionInterview) => void
  reload: () => void
}) {
  const id = interview.id
  const speechSupported = isSpeechRecognitionSupported()

  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [interim, setInterim] = useState('')
  const [transcript, setTranscript] = useState(interview.transcript ?? '')
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [answers, setAnswers] = useState(interview.answers)
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | 'finish' | 'extract' | 'apply'>(null)

  const recognizerRef = useRef<SpeechRecognizer | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingFinalsRef = useRef<string[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const target = interview.prospect
    ? interview.prospect.shopName ?? interview.prospect.name
    : interview.vendor?.shopName ?? 'Vendeur'

  const flushTranscript = useCallback(async () => {
    if (pendingFinalsRef.current.length === 0) return
    const text = pendingFinalsRef.current.join(' ')
    pendingFinalsRef.current = []
    const r = await prospectionFetch<ProspectionInterview>(`/interviews/${id}/transcript`, {
      method: 'POST',
      body: JSON.stringify({ text, source: 'ios-speech', replace: false }),
    })
    if (r.ok) {
      setTranscript(r.data.transcript ?? '')
      onChange(r.data)
    }
  }, [id, onChange])

  const stopEverything = useCallback(async () => {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    if (flushTimerRef.current) clearInterval(flushTimerRef.current)
    setInterim('')

    const mr = mediaRecorderRef.current
    let audioBlob: Blob | null = null
    if (mr && mr.state !== 'inactive') {
      audioBlob = await new Promise<Blob>((resolve) => {
        mr.addEventListener(
          'stop',
          () => resolve(new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })),
          { once: true },
        )
        mr.stop()
      })
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null

    await flushTranscript()

    if (audioBlob && audioBlob.size > 0) {
      const up = await prospectionUploadAudio(id, audioBlob)
      if (up.ok) onChange(up.data)
      else setBanner(up.message)
    }
    setRecording(false)
  }, [flushTranscript, id, onChange])

  // Nettoyage si on quitte la page en cours d'enregistrement.
  useEffect(() => {
    return () => {
      recognizerRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function startRecording() {
    setBanner(null)
    // Audio (optionnel — on continue même sans micro autorisé).
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        chunksRef.current = []
        const mr = new MediaRecorder(stream)
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        mr.start(1000)
        mediaRecorderRef.current = mr
      }
    } catch {
      setBanner('Micro non disponible : seule la transcription texte sera utilisée.')
    }

    if (speechSupported) {
      const recognizer = createSpeechRecognizer({
        onFinal: (t) => {
          pendingFinalsRef.current.push(t)
          setTranscript((prev) => `${prev}${prev && !prev.endsWith('\n') ? ' ' : ''}${t}`)
        },
        onInterim: setInterim,
        onError: (m) => setBanner(m),
      })
      recognizer.start()
      recognizerRef.current = recognizer
    }

    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    flushTimerRef.current = setInterval(() => void flushTranscript(), 5000)
    setRecording(true)
  }

  async function finishInterview() {
    setBusy('finish')
    if (recording) await stopEverything()
    const r = await prospectionFetch<ProspectionInterview>(`/interviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'A_TRANSCRIRE', endedAt: new Date().toISOString() }),
    })
    setBusy(null)
    if (r.ok) onChange(r.data)
    else setBanner(r.message)
  }

  async function saveTranscriptEdit() {
    const r = await prospectionFetch<ProspectionInterview>(`/interviews/${id}/transcript`, {
      method: 'POST',
      body: JSON.stringify({ text: transcript, source: 'manuel', replace: true }),
    })
    if (r.ok) {
      onChange(r.data)
      setEditingTranscript(false)
    } else setBanner(r.message)
  }

  async function extract() {
    setBusy('extract')
    setBanner(null)
    const r = await prospectionFetch(`/interviews/${id}/extract`, { method: 'POST' })
    if (!r.ok) {
      setBusy(null)
      setBanner(r.message)
      return
    }
    // Le job tourne en tâche de fond — on repolle quelques fois.
    let tries = 0
    const poll = setInterval(async () => {
      tries += 1
      const g = await prospectionFetch<ProspectionInterview>(`/interviews/${id}`)
      if (g.ok && (g.data.status === 'TRANSCRIT' || g.data.status === 'EXPLOITE')) {
        clearInterval(poll)
        setAnswers(g.data.answers)
        setTranscript(g.data.transcript ?? '')
        onChange(g.data)
        setBusy(null)
        setBanner('Réponses extraites. Vérifiez-les avant de reporter sur la fiche.')
      } else if (tries >= 12) {
        clearInterval(poll)
        setBusy(null)
        setBanner('Extraction lancée — les réponses apparaîtront d’ici quelques instants.')
      }
    }, 5000)
  }

  async function apply() {
    setBusy('apply')
    setBanner(null)
    const r = await prospectionFetch<ProspectionInterview>(`/interviews/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ overwrite: false }),
    })
    setBusy(null)
    if (r.ok) {
      onChange(r.data)
      setBanner('Réponses reportées sur la fiche prospect.')
    } else setBanner(r.message)
  }

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* En-tête collant : cible + statut + pastille d'enregistrement */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/liaison/prospection" className="text-xs text-ink-2 hover:underline">
              ← Entretiens
            </Link>
            <h1 className="truncate font-display text-xl text-ink">{target}</h1>
          </div>
          {recording ? (
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-error-bg px-3 py-1.5 text-xs font-semibold text-error-fg">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-error-fg" />
              ENREGISTREMENT · {fmtTime(elapsed)}
            </span>
          ) : (
            <Chip variant={interview.status === 'EXPLOITE' ? 'status-ok' : 'plain'}>
              {PROSPECTION_INTERVIEW_STATUS_LABELS[interview.status]}
            </Chip>
          )}
        </div>
      </div>

      {banner && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-ink">{banner}</p>
      )}

      {/* Contrôle d'enregistrement */}
      <section className="mb-4 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Enregistrement & transcription</p>
            <p className="mt-0.5 text-xs text-muted">
              {speechSupported
                ? 'Transcription par la dictée du téléphone, en direct.'
                : 'Dictée non disponible sur ce navigateur — saisissez la transcription à la main.'}
            </p>
          </div>
          {recording ? (
            <button
              type="button"
              onClick={() => void stopEverything()}
              className="shrink-0 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white"
              style={{ minHeight: 44 }}
            >
              Arrêter
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="shrink-0 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              style={{ minHeight: 44 }}
            >
              Démarrer
            </button>
          )}
        </div>

        <div className="mt-3 rounded-sm border border-border bg-surface p-3">
          {editingTranscript ? (
            <>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                className="w-full resize-y rounded-sm border border-border-strong bg-card p-2 text-sm text-ink"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveTranscriptEdit()}
                  className="rounded-md bg-ink-2 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTranscript(interview.transcript ?? '')
                    setEditingTranscript(false)
                  }}
                  className="rounded-md bg-card px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-border"
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-ink">
                {transcript || <span className="text-muted-2">Aucune transcription pour l’instant.</span>}
                {interim && <span className="text-muted"> {interim}</span>}
              </p>
              {!recording && (
                <button
                  type="button"
                  onClick={() => setEditingTranscript(true)}
                  className="mt-2 text-xs font-medium text-ink-2 hover:underline"
                >
                  Corriger la transcription
                </button>
              )}
            </>
          )}
        </div>

        {interview.audio && !recording && <AudioPlayback interviewId={id} />}
      </section>

      {/* Téléprompteur de la bible */}
      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Trame d’entretien</h2>
          <span className="font-mono text-xs text-muted">
            {answeredCount}/{THEMES.reduce((n, t) => n + t.questions.length, 0)} répondu
          </span>
        </div>
        <div className="grid gap-2">
          {THEMES.map((theme) => (
            <ThemeSection
              key={theme.theme}
              label={theme.label}
              questions={theme.questions}
              answers={answers}
              onAnswer={(qid, text) => {
                setAnswers((prev) => {
                  const next = { ...prev }
                  if (text.trim()) next[qid] = { text, source: 'MANUEL' }
                  else delete next[qid]
                  return next
                })
                void prospectionFetch(`/interviews/${id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ answers: { [qid]: { text, source: 'MANUEL' } } }),
                })
              }}
            />
          ))}
        </div>
      </section>

      {/* Actions de clôture */}
      <section className="grid gap-2 rounded-md border border-border bg-card p-4">
        <button
          type="button"
          onClick={() => void finishInterview()}
          disabled={busy !== null}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {busy === 'finish' ? 'Clôture…' : 'Terminer l’entretien'}
        </button>
        <button
          type="button"
          onClick={() => void extract()}
          disabled={busy !== null || !transcript.trim()}
          className="rounded-md bg-card px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-border disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {busy === 'extract' ? 'Extraction IA…' : 'Extraire les réponses de la transcription (IA)'}
        </button>
        <button
          type="button"
          onClick={() => void apply()}
          disabled={busy !== null || !interview.prospect || answeredCount === 0}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {busy === 'apply' ? 'Report…' : 'Reporter les réponses sur la fiche prospect'}
        </button>
        {!interview.prospect && (
          <p className="text-xs text-muted">
            Report indisponible : cet entretien est rattaché à un vendeur, pas à un prospect CRM.
          </p>
        )}
        <button
          type="button"
          onClick={reload}
          className="text-xs font-medium text-ink-2 hover:underline"
        >
          Rafraîchir
        </button>
      </section>
    </div>
  )
}

function AudioPlayback({ interviewId }: { interviewId: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    prospectionAudioUrl(interviewId).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      objectUrl = u
      setUrl(u)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [interviewId])

  if (!url) return null
  return (
    <div className="mt-3">
      <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
        Enregistrement archivé
      </p>
      <audio src={url} controls className="w-full" />
    </div>
  )
}

function ThemeSection({
  label,
  questions,
  answers,
  onAnswer,
}: {
  label: string
  questions: ReturnType<typeof prospectionQuestionsByTheme>[number]['questions']
  answers: ProspectionInterview['answers']
  onAnswer: (qid: string, text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const done = questions.filter((q) => answers[q.id]?.text?.trim()).length

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
        style={{ minHeight: 44 }}
      >
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="font-mono text-[11px] text-muted">
          {done}/{questions.length} {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          {questions.map((q) => (
            <QuestionRow
              key={q.id}
              label={q.label}
              hint={q.hint}
              value={answers[q.id]?.text ?? ''}
              source={answers[q.id]?.source}
              onChange={(text) => onAnswer(q.id, text)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionRow({
  label,
  hint,
  value,
  source,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  source?: 'MANUEL' | 'TRANSCRIPTION' | 'IA'
  onChange: (text: string) => void
}) {
  // Synchronise l'état local si la valeur externe change (extraction IA), sans
  // effet : pattern « ajuster l'état pendant le rendu » recommandé par React.
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  return (
    <div className="border-b border-border px-3 py-3 last:border-b-0">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border ${
            value.trim() ? 'border-neuf-fg bg-neuf-bg' : 'border-border-strong'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => draft !== value && onChange(draft)}
            rows={2}
            placeholder="Réponse du vendeur…"
            className="mt-2 w-full resize-y rounded-sm border border-border-strong bg-surface p-2 text-sm text-ink placeholder:text-muted-2"
          />
          {source && source !== 'MANUEL' && (
            <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wide text-muted">
              {source === 'IA' ? 'proposé par IA' : 'transcription'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
