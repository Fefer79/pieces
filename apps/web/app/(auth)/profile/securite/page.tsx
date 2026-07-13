'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type SupabaseClient = ReturnType<typeof createClient>

const inputCls =
  'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'
const labelCls =
  'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

export default function SecurityPage() {
  const { user, loading } = useAuth()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }

    setSavingPassword(true)
    try {
      const { error: pwError } = await getSupabase().auth.updateUser({ password: newPassword })
      if (pwError) {
        setPasswordError(pwError.message)
        return
      }
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch {
      setPasswordError('Erreur de connexion')
    } finally {
      setSavingPassword(false)
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
        <h1 className="mt-1 font-display text-3xl text-ink">Sécurité</h1>
      </div>

      <section className="mb-4 rounded-md border border-border bg-card p-5">
        <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Connexion
        </p>
        <dl className="divide-y divide-border">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-muted">Téléphone (code SMS)</dt>
            <dd className="font-mono text-sm text-ink">{user.phone ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-muted">Email</dt>
            <dd className="text-sm text-ink">{user.email ?? '—'}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          Un seul compte, quel que soit le mode de connexion (SMS, WhatsApp, email).
          Modifiez vos coordonnées dans{' '}
          <Link href="/profile/identite" className="underline hover:text-ink">
            Identité
          </Link>
          .
        </p>
      </section>

      <form onSubmit={handleChangePassword} className="rounded-md border border-border bg-card p-5">
        <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Mot de passe
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="newPassword" className={labelCls}>
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError('') }}
              placeholder="Au moins 6 caractères"
              minLength={6}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelCls}>
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
              placeholder="Confirmer"
              minLength={6}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
          {passwordError && (
            <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
              {passwordError}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="w-full rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-50"
          >
            {savingPassword ? 'Enregistrement…' : passwordSuccess ? '✓ Mot de passe enregistré' : 'Définir le mot de passe'}
          </button>
          <p className="text-xs text-muted">
            Une fois défini, vous pourrez vous connecter sans recevoir d&apos;OTP.
          </p>
        </div>
      </form>
    </main>
  )
}
