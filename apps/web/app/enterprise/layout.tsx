'use client'

import { AppShell } from '@/components/app-shell'

// L'accès à l'espace Flotte est géré par le SpaceGuard de l'AppShell :
// bascule silencieuse si l'utilisateur a le rôle ENTERPRISE, interstitiel
// d'activation sinon. La redirection des non-connectés vient du middleware
// (qui reconnaît aussi la session WhatsApp, contrairement à l'ancien check
// Supabase local qui excluait ces utilisateurs).
export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
