'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { isLogistiqueSurface } from '@/lib/logistique-routes'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // /browse (exact) gets its own layout — no AppShell.
  // La vitrine flotte (/entreprises/*) a son propre chrome navy (voir entreprises/layout.tsx).
  //
  // ⚠ `usePathname()` renvoie l'URL du NAVIGATEUR, pas le chemin réécrit par le
  // middleware. Sur flotte.pieces.ci/ il vaut '/' alors que la page rendue est
  // /entreprises — d'où le test `pathname === '/'` ci-dessous. Même piège pour
  // logistique.pieces.ci/devis, qui vaut '/devis' : `isLogistiqueSurface` teste
  // donc les deux formes (chemin interne ET slug de sous-domaine). Sans ça, le
  // formulaire de cotation se retrouverait enveloppé dans l'AppShell.
  if (
    pathname === '/browse' ||
    pathname === '/' ||
    pathname === '/info' ||
    pathname.startsWith('/entreprises') ||
    isLogistiqueSurface(pathname)
  ) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
