import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, DM_Mono } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Gloock&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${instrumentSans.variable} ${dmMono.variable} bg-[#FFFFFF] font-[family-name:var(--font-instrument)] text-[#00113a] antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
