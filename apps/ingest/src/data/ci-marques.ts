// Marques importées officiellement en CI via CFAO Motors, Tractafric, ATC Comafrique.
// popularityCi: 100 = top fleet (Toyota, Hyundai), 50 = mainstream, 20 = niche.

export type CiMarque = {
  name: string
  slug: string
  country: string | null
  popularityCi: number
  distributor: string
}

export const CI_MARQUES: CiMarque[] = [
  { name: 'Toyota', slug: 'toyota', country: 'JP', popularityCi: 100, distributor: 'CFAO Motors' },
  { name: 'Hyundai', slug: 'hyundai', country: 'KR', popularityCi: 95, distributor: 'Tractafric/Africauto' },
  { name: 'Kia', slug: 'kia', country: 'KR', popularityCi: 80, distributor: 'Africauto (historique)' },
  { name: 'Nissan', slug: 'nissan', country: 'JP', popularityCi: 80, distributor: 'ATC Comafrique' },
  { name: 'Peugeot', slug: 'peugeot', country: 'FR', popularityCi: 75, distributor: 'CFAO Motors' },
  { name: 'Renault', slug: 'renault', country: 'FR', popularityCi: 70, distributor: 'historique' },
  { name: 'Mercedes-Benz', slug: 'mercedes-benz', country: 'DE', popularityCi: 70, distributor: 'CFAO Motors (depuis 2021)' },
  { name: 'BMW', slug: 'bmw', country: 'DE', popularityCi: 55, distributor: 'Tractafric/Alliance Automobiles' },
  { name: 'Mitsubishi', slug: 'mitsubishi', country: 'JP', popularityCi: 65, distributor: 'CFAO Motors' },
  { name: 'Suzuki', slug: 'suzuki', country: 'JP', popularityCi: 50, distributor: 'CFAO Motors' },
  { name: 'Mazda', slug: 'mazda', country: 'JP', popularityCi: 50, distributor: 'Tractafric/Africauto' },
  { name: 'Honda', slug: 'honda', country: 'JP', popularityCi: 45, distributor: 'parc importé' },
  { name: 'Ford', slug: 'ford', country: 'US', popularityCi: 55, distributor: 'Tractafric' },
  { name: 'Citroen', slug: 'citroen', country: 'FR', popularityCi: 40, distributor: 'CFAO Motors' },
  { name: 'Isuzu', slug: 'isuzu', country: 'JP', popularityCi: 60, distributor: 'utilitaires/PL' },
  { name: 'Land Rover', slug: 'land-rover', country: 'GB', popularityCi: 35, distributor: 'parc importé' },
  { name: 'Volkswagen', slug: 'volkswagen', country: 'DE', popularityCi: 35, distributor: 'parc importé' },
  { name: 'Daihatsu', slug: 'daihatsu', country: 'JP', popularityCi: 30, distributor: 'parc importé occasion' },
  { name: 'Chevrolet', slug: 'chevrolet', country: 'US', popularityCi: 30, distributor: 'parc importé' },
  { name: 'Opel', slug: 'opel', country: 'DE', popularityCi: 25, distributor: 'parc importé' },
  { name: 'MINI', slug: 'mini', country: 'GB', popularityCi: 20, distributor: 'Tractafric/Alliance' },
  { name: 'Chery', slug: 'chery', country: 'CN', popularityCi: 25, distributor: 'Tractafric' },
  { name: 'JAC', slug: 'jac', country: 'CN', popularityCi: 20, distributor: 'Tractafric' },
  { name: 'FAW', slug: 'faw', country: 'CN', popularityCi: 20, distributor: 'Tractafric' },
  { name: 'Hino', slug: 'hino', country: 'JP', popularityCi: 30, distributor: 'CFAO Motors (PL)' },
]
