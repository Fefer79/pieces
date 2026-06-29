import { redirect } from 'next/navigation'

// Ancienne page « Catalogue (legacy) » : la recherche + les filtres vivent
// désormais sur /admin/parts. On redirige pour éviter le doublon et la
// confusion (l'admin ne trouvait pas le champ de recherche ici).
export default function AdminCatalogLegacyRedirect() {
  redirect('/admin/parts')
}
