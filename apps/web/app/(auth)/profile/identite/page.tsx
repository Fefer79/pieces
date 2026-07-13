'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const inputCls =
  'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'
const labelCls =
  'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

export default function IdentityPage() {
  const { user, loading, refreshProfile, getAccessToken } = useAuth()
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setEditName(user.name ?? '')
      setEditEmail(user.email ?? '')
      setEditPhone(user.phone ? user.phone.replace('+225', '') : '')
    }
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    setError('')
    try {
      const token = await getAccessToken()
      if (!token) return

      // N'envoyer que les champs remplis : une chaîne vide échoue la
      // validation de format côté backend (email, téléphone).
      const payload: Record<string, string> = {}
      const trimmedName = editName.trim()
      if (trimmedName) payload.name = trimmedName
      const trimmedEmail = editEmail.trim()
      if (trimmedEmail) payload.email = trimmedEmail
      const phoneDigits = editPhone.replace(/\D/g, '')
      if (phoneDigits.length === 10) payload.phone = `+225${phoneDigits}`

      if (Object.keys(payload).length === 0) {
        setError('Aucune information à enregistrer')
        return
      }

      const res = await fetch('/api/v1/users/me/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error?.message ?? 'Erreur lors de la sauvegarde')
        return
      }
      await refreshProfile()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <Link
          href="/profile"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted hover:text-ink"
        >
          ← Compte
        </Link>
        <h1 className="mt-1 font-display text-3xl text-ink">Identité</h1>
      </div>

      <form onSubmit={handleSave} className="mb-4 rounded-md border border-border bg-card p-5">
        <div className="space-y-3">
          <div>
            <label htmlFor="phone" className={labelCls}>
              Téléphone
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-sm border border-r-0 border-border-strong bg-surface px-3 font-mono text-sm text-muted">
                +225
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="07 00 00 00 00"
                className={`${inputCls} rounded-l-none`}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Ce numéro sert à la connexion et aux notifications WhatsApp.
            </p>
          </div>
          <div>
            <label htmlFor="name" className={labelCls}>
              Nom
            </label>
            <input
              id="name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Votre nom (optionnel)"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Votre email (optionnel)"
              className={inputCls}
            />
          </div>
          {error && (
            <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : saveSuccess ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </main>
  )
}
