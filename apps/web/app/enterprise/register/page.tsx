import { redirect } from 'next/navigation'

// Ancienne URL diffusée dans des liens externes : on renvoie vers le dashboard,
// qui affiche le formulaire « Créer mon entreprise » quand l'utilisateur n'a pas encore de flotte.
export default function EnterpriseRegisterPage() {
  redirect('/enterprise/dashboard')
}
