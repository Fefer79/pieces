import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pièces — Marketplace Pièces Auto',
  description: 'Trouvez et commandez vos pièces auto en Côte d\'Ivoire',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1976D2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body className="bg-[#FAFAFA] text-gray-900 antialiased">{children}</body>
    </html>
  )
}
