import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, DM_Mono, Gloock } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

const dmMono = DM_Mono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
})

const gloock = Gloock({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-gloock',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pièces — Marketplace Pièces Auto',
  description: 'Trouvez et commandez vos pièces auto en Côte d\'Ivoire',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff6b00',
}

// ⚠ Les variables next/font sont portées par <html>, pas par <body>.
//
// Les tokens `@theme` de Tailwind sont émis sur `:root` et y référencent
// `var(--font-gloock)` & co. Or une var() est substituée sur l'élément où la
// déclaration se trouve : si --font-gloock n'est défini que sur <body>, le token
// :root vaut « guaranteed-invalid », --font-display / --font-body ne s'appliquent
// nulle part, et la page retombe silencieusement sur la police système — sans
// erreur, alors que les WOFF2 sont bien téléchargés. Voir globals.css § Typography.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${instrumentSans.variable} ${dmMono.variable} ${gloock.variable}`}>
      <body className="bg-surface text-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
