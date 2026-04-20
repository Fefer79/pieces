'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type PromoSlide = {
  id: string
  eyebrow: string
  title: string
  description: string
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
  art: ReactNode
  theme: 'navy' | 'orange' | 'cream'
}

const themeClasses: Record<PromoSlide['theme'], { bg: string; text: string; art: string; dot: string; dotActive: string }> = {
  navy: {
    bg: 'bg-[linear-gradient(135deg,#00113A_0%,#002366_100%)]',
    text: 'text-white',
    art: 'bg-white/5 border border-white/10',
    dot: 'bg-white/30',
    dotActive: 'bg-white/95',
  },
  orange: {
    bg: 'bg-[linear-gradient(135deg,#FF6B00_0%,#FF4E00_100%)]',
    text: 'text-white',
    art: 'bg-white/15 border border-white/25',
    dot: 'bg-white/30',
    dotActive: 'bg-white/95',
  },
  cream: {
    bg: 'bg-[linear-gradient(135deg,#F0EEEB_0%,#E5E0D6_100%)]',
    text: 'text-ink',
    art: 'bg-ink/5 border border-ink/10',
    dot: 'bg-ink/20',
    dotActive: 'bg-ink/85',
  },
}

export function PromoCarousel({ slides, autoMs = 5500 }: { slides: PromoSlide[]; autoMs?: number }) {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!autoMs || slides.length <= 1) return
    timer.current = setInterval(() => setIdx((i) => (i + 1) % slides.length), autoMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [autoMs, slides.length])

  const goTo = (i: number) => {
    setIdx(i)
    if (timer.current) clearInterval(timer.current)
    if (autoMs && slides.length > 1) {
      timer.current = setInterval(() => setIdx((curr) => (curr + 1) % slides.length), autoMs)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="flex transition-transform duration-[550ms] ease-[cubic-bezier(.22,.61,.36,1)]"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((slide) => {
          const t = themeClasses[slide.theme]
          return (
            <div
              key={slide.id}
              className={`grid min-w-full grid-cols-1 items-center gap-8 px-5 py-6 md:grid-cols-[1.15fr_0.85fr] md:px-14 md:pb-16 md:pt-14 ${t.bg} ${t.text}`}
            >
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75 md:text-[11px] md:tracking-[0.16em]">
                  {slide.eyebrow}
                </div>
                <h2 className="mt-2 font-display text-[22px] leading-[1.1] tracking-[-0.015em] md:mt-3.5 md:text-[52px] md:leading-[1.05]">
                  {slide.title}
                </h2>
                <p className="mt-2 max-w-[500px] text-[13px] leading-snug opacity-90 md:mt-4 md:text-[17px] md:leading-relaxed">
                  {slide.description}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2 md:mt-6 md:gap-2.5">
                  <a
                    href={slide.cta.href}
                    className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-[13px] font-medium transition-all duration-150 active:scale-[0.98] md:px-5 md:py-3 md:text-[15px] ${
                      slide.theme === 'orange'
                        ? 'bg-white text-accent-hover hover:bg-white/90'
                        : slide.theme === 'cream'
                          ? 'bg-ink-2 text-white hover:bg-ink'
                          : 'bg-accent text-white hover:bg-accent-hover'
                    }`}
                  >
                    {slide.cta.label}
                  </a>
                  {slide.secondaryCta && (
                    <a
                      href={slide.secondaryCta.href}
                      className={`hidden items-center justify-center rounded-md border px-5 py-3 text-[15px] font-medium transition-all duration-150 active:scale-[0.98] md:inline-flex ${
                        slide.theme === 'cream'
                          ? 'border-border-strong bg-card text-ink hover:bg-surface'
                          : 'border-white/30 bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      {slide.secondaryCta.label}
                    </a>
                  )}
                </div>
              </div>
              <div
                className={`hidden h-[280px] place-items-center rounded-md text-[100px] md:grid ${t.art}`}
                aria-hidden
              >
                {slide.art}
              </div>
            </div>
          )
        })}
      </div>

      {slides.length > 1 && (() => {
        const current = slides[idx]
        if (!current) return null
        const t = themeClasses[current.theme]
        return (
          <div className="absolute bottom-3 left-5 z-10 flex gap-1.5 md:bottom-5 md:left-14 md:gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`Aller au slide ${i + 1}`}
                className={`h-[3px] w-7 rounded-sm transition-colors md:w-9 ${i === idx ? t.dotActive : t.dot}`}
              />
            ))}
          </div>
        )
      })()}
    </div>
  )
}
