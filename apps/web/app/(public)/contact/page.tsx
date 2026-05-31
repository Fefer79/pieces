'use client'

import { useState } from 'react'
import { BottomNav } from '@/components/bottom-nav'

const WA_NUMBER = '2250709021708'
const PHONE_DISPLAY = '+225 07 09 02 17 08'
const EMAIL = 'contact@pieces.ci'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')

  const sendEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = `Message de ${name || 'un visiteur'} — Pièces.ci`
    const body = `${message}\n\n—\nNom : ${name}\nContact : ${contact}`
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const sendWhatsApp = () => {
    const text = message
      ? `Bonjour Pièces.ci, ${message}`
      : 'Bonjour Pièces.ci, j’ai une question.'
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-white pb-16 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
          <a href="/" className="flex-shrink-0">
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
          </a>
          <a
            href="/browse"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Rechercher
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-12 lg:px-8 lg:py-16">
        <h1 className="text-center font-display text-3xl text-ink lg:text-4xl">Contactez-nous</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed text-muted">
          Une question sur une pièce, une commande ou nos services entreprise ? Écrivez-nous
          ou démarrez une conversation WhatsApp — nous répondons rapidement.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_0.85fr]">
          {/* Message form */}
          <form
            onSubmit={sendEmail}
            className="rounded-xl border border-border bg-card p-6 lg:p-7"
          >
            <h2 className="font-display text-xl text-ink">Envoyer un message</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
                  Votre nom
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nom et prénom"
                  className="w-full rounded-md border border-border-strong bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="contact" className="mb-1.5 block text-sm font-medium text-ink">
                  Téléphone ou email
                </label>
                <input
                  id="contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  placeholder="+225 07 00 00 00 00 ou vous@email.com"
                  className="w-full rounded-md border border-border-strong bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-ink">
                  Votre message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="Décrivez votre besoin, la pièce recherchée, votre véhicule…"
                  className="w-full resize-none rounded-md border border-border-strong bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:scale-[0.98]"
              >
                Envoyer par email
              </button>
              <button
                type="button"
                onClick={sendWhatsApp}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>
            </div>
          </form>

          {/* Contact methods */}
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50 p-4 transition-colors hover:bg-green-100"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-ink">WhatsApp</p>
                <p className="text-sm text-muted">Discutez avec nous en direct</p>
              </div>
            </a>

            <a
              href={`tel:+${WA_NUMBER}`}
              className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 transition-colors hover:bg-blue-100"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#002366] text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-ink">Téléphone</p>
                <p className="text-sm text-muted">{PHONE_DISPLAY}</p>
              </div>
            </a>

            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-card"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-ink">Email</p>
                <p className="text-sm text-muted">{EMAIL}</p>
              </div>
            </a>

            <p className="mt-1 px-1 text-xs leading-relaxed text-muted-2">
              Pièces.ci — Abidjan, Côte d&apos;Ivoire. Ligne WhatsApp 6 h – 22 h, 7 j / 7.
            </p>
          </div>
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
