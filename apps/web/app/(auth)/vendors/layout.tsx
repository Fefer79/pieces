import type { Metadata } from 'next'

// Server component (contrairement à (auth)/layout.tsx, 'use client') : seul un
// composant serveur peut exporter `metadata`. Next.js fusionne ce metadata avec
// celui de app/layout.tsx — `manifest` est ici substitué pour tout /vendors/*,
// donnant au portail GesMag (gesmag.pieces.ci) sa propre icône/nom d'app
// installable, sans dupliquer la coquille (AppShell reste porté par le layout
// (auth) parent).
export const metadata: Metadata = {
  title: 'GesMag — Gestion de magasin',
  manifest: '/manifest-vendeur.json',
}

export default function VendorsLayout({ children }: { children: React.ReactNode }) {
  return children
}
