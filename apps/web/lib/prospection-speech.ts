'use client'

// Fine couche au-dessus du moteur de reconnaissance vocale du terminal
// (`SpeechRecognition` / `webkitSpeechRecognition`). Sur iOS Safari c'est la
// dictée d'Apple : on-device, gratuite, mais la session se coupe après un
// silence ou ~1 min — on la relance tant que l'utilisateur n'a pas arrêté.

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): { transcript: string }
  [index: number]: { transcript: string }
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    item(index: number): SpeechRecognitionResultLike
    [index: number]: SpeechRecognitionResultLike
  }
}
interface SpeechRecognitionErrorEventLike {
  readonly error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getCtor() !== null
}

export interface SpeechRecognizerOptions {
  lang?: string
  /** Appelé pour chaque segment finalisé (à persister). */
  onFinal: (text: string) => void
  /** Texte provisoire en cours de reconnaissance (non persisté). */
  onInterim: (text: string) => void
  /** Erreur bloquante (permission refusée, service indisponible). */
  onError?: (message: string) => void
  /** Changement d'état d'écoute. */
  onListeningChange?: (listening: boolean) => void
}

export interface SpeechRecognizer {
  readonly supported: boolean
  start(): void
  stop(): void
}

export function createSpeechRecognizer(opts: SpeechRecognizerOptions): SpeechRecognizer {
  const Ctor = getCtor()
  if (!Ctor) {
    return { supported: false, start: () => {}, stop: () => {} }
  }

  let recognition: SpeechRecognitionLike | null = null
  let wantActive = false
  let restartTimer: ReturnType<typeof setTimeout> | null = null

  const build = (): SpeechRecognitionLike => {
    const r = new Ctor()
    r.lang = opts.lang ?? 'fr-FR'
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1

    r.onstart = () => opts.onListeningChange?.(true)

    r.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        const alt = result[0]
        const text = alt?.transcript ?? ''
        if (result.isFinal) {
          const clean = text.trim()
          if (clean) opts.onFinal(clean)
        } else {
          interim += text
        }
      }
      opts.onInterim(interim.trim())
    }

    r.onerror = (event) => {
      // Erreurs transitoires : la relance dans onend suffit.
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantActive = false
        opts.onError?.(
          "Micro refusé. Autorisez l'accès au microphone pour transcrire l'entretien.",
        )
      } else {
        opts.onError?.(`Reconnaissance vocale : ${event.error}`)
      }
    }

    r.onend = () => {
      opts.onListeningChange?.(false)
      opts.onInterim('')
      if (!wantActive) return
      // Petit délai : iOS n'aime pas un restart synchrone dans onend.
      restartTimer = setTimeout(() => {
        if (!wantActive || !recognition) return
        try {
          recognition.start()
        } catch {
          /* déjà démarré : ignore */
        }
      }, 400)
    }

    return r
  }

  return {
    supported: true,
    start() {
      if (wantActive) return
      wantActive = true
      recognition = build()
      try {
        recognition.start()
      } catch {
        /* start() jeté si déjà en cours */
      }
    },
    stop() {
      wantActive = false
      if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = null
      }
      opts.onInterim('')
      if (recognition) {
        try {
          recognition.stop()
        } catch {
          /* ignore */
        }
        recognition = null
      }
    },
  }
}
