/**
 * Ciblage de l'ingestion Opisto : quelles marques, quelles catégories.
 *
 * Opisto expose ~878 catégories × 65 marques. Tout aspirer n'aurait pas de sens :
 * on ne précommande pas un capot depuis la France pour Abidjan. Ce fichier porte
 * les deux filtres, et la raison de chacun.
 *
 * ── MARQUES ─────────────────────────────────────────────────────────────────
 * `demandScore` = nombre d'annonces du catalogue Pièces couvrant la marque
 * (`catalog_item_fitments`, relevé du 2026-09-13 sur la prod). C'est le seul
 * signal de demande RÉEL dont on dispose : le parc véhicules en base est
 * aujourd'hui limité à la flotte SITEX, et `part_requests` ne compte qu'une
 * ligne. Le classement reflète donc ce que les vendeurs d'Abidjan référencent,
 * pas encore ce que les acheteurs demandent.
 *
 * ⚠ Biais connu : 83 % de ces fitments viennent d'un seul importateur
 * (GLOBAL_AUTO_CI), si bien que le score reflète aussi son mix. Renault en fait
 * les frais (27 annonces) alors que la marque est très présente dans le parc
 * ivoirien — et que c'est le premier stock d'Opisto. À rééquilibrer dès que les
 * premières `part_requests` donneront un signal de demande propre.
 *
 * Rafraîchir le classement : `pnpm -F ingest demand:brands`.
 *
 * ── CATÉGORIES ──────────────────────────────────────────────────────────────
 * Retenues sur le ratio valeur/poids et la rotation. Une pièce importée porte
 * son fret et sa douane (cf. `import-pricing.ts`) : sous ~50 €/kg de valeur, le
 * transport mange la marge et le prix affiché décroche du marché local. On écarte
 * donc la carrosserie (capots, ailes, pare-chocs), volumineuse et peu chère, au
 * profit de l'organe mécanique et électronique.
 */

export type OpistoBrandTarget = {
  /** Marque telle qu'écrite dans `catalog_item_fitments.brand`. */
  brand: string
  /** Segment d'URL Opisto. */
  slug: string
  /** Annonces Pièces couvrant la marque au 2026-09-13. */
  demandScore: number
  /** Pourquoi cette marque est dans la liste. */
  rationale: string
}

/** Marques cibles, de la plus demandée à la moins demandée. */
export const OPISTO_BRAND_TARGETS: OpistoBrandTarget[] = [
  { brand: 'TOYOTA', slug: 'toyota', demandScore: 620, rationale: '1re marque du parc ivoirien, 1er stock local' },
  { brand: 'PEUGEOT', slug: 'peugeot', demandScore: 556, rationale: 'parc francophone ; 2e stock Opisto' },
  { brand: 'MITSUBISHI', slug: 'mitsubishi', demandScore: 381, rationale: 'utilitaires et 4x4 très représentés' },
  { brand: 'HYUNDAI', slug: 'hyundai', demandScore: 380, rationale: 'importé officiellement (Tractafric/Africauto)' },
  { brand: 'BMW', slug: 'bmw', demandScore: 324, rationale: 'pièces chères : ratio valeur/poids idéal à l’import' },
  { brand: 'FORD', slug: 'ford', demandScore: 279, rationale: 'réseau Tractafric' },
  { brand: 'CITROEN', slug: 'citroen', demandScore: 268, rationale: 'parc francophone ; 3e stock Opisto' },
  { brand: 'MAZDA', slug: 'mazda', demandScore: 245, rationale: 'stock Opisto faible (10 combos) — à surveiller' },
  { brand: 'NISSAN', slug: 'nissan', demandScore: 220, rationale: 'réseau ATC Comafrique' },
  { brand: 'KIA', slug: 'kia', demandScore: 204, rationale: 'forte croissance du parc' },
  { brand: 'MERCEDES-BENZ', slug: 'mercedes', demandScore: 180, rationale: 'VP et utilitaires ; slug Opisto « mercedes »' },
  { brand: 'HONDA', slug: 'honda', demandScore: 117, rationale: 'parc importé d’occasion' },
  { brand: 'VOLKSWAGEN', slug: 'volkswagen', demandScore: 111, rationale: 'parc importé' },
  {
    brand: 'SUZUKI',
    slug: 'suzuki',
    demandScore: 61,
    // Seule marque dont la demande est ATTESTÉE et non déduite.
    rationale: 'flotte SITEX (39 véhicules) : 100 % Suzuki — demande client réelle',
  },
  {
    brand: 'RENAULT',
    slug: 'renault',
    demandScore: 27,
    rationale: 'score sous-évalué par le biais GLOBAL_AUTO ; 1er stock Opisto (584 combos)',
  },
]

export const DEFAULT_BRAND_SLUGS: string[] = OPISTO_BRAND_TARGETS.map((b) => b.slug)

/** Marque Pièces correspondant à un slug Opisto. */
export function brandForSlug(slug: string): OpistoBrandTarget | undefined {
  return OPISTO_BRAND_TARGETS.find((b) => b.slug === slug)
}

export type OpistoCategoryTarget = {
  /** Segment d'URL Opisto. */
  slug: string
  /** Libellé stocké dans `CatalogItem.category`. */
  label: string
}

/**
 * Catégories prioritaires — organes à forte valeur et forte rotation.
 * Les deux dernières (boîte, moteur) sont lourdes mais assez chères pour
 * absorber un groupage maritime ; `computeImportQuote` s'en charge.
 */
export const OPISTO_CATEGORY_TARGETS: OpistoCategoryTarget[] = [
  { slug: 'alternateur', label: 'Alternateur' },
  { slug: 'demarreur', label: 'Démarreur' },
  { slug: 'calculateur-moteur', label: 'Calculateur moteur' },
  { slug: 'boitier-bsi', label: 'Boîtier BSI' },
  { slug: 'boitier-papillon', label: 'Boîtier papillon' },
  { slug: 'compresseur-clim', label: 'Compresseur de climatisation' },
  { slug: 'turbo', label: 'Turbo' },
  { slug: 'injecteurs', label: 'Injecteurs' },
  { slug: 'injecteurs-common-rail', label: 'Injecteurs common rail' },
  { slug: 'pompe-injection', label: 'Pompe à injection' },
  { slug: 'debitmetre', label: 'Débitmètre' },
  { slug: 'vanne-egr', label: 'Vanne EGR' },
  { slug: 'bobine-allumage', label: 'Bobine d’allumage' },
  { slug: 'capteur-pmh', label: 'Capteur PMH' },
  { slug: 'compteur', label: 'Compteur' },
  { slug: 'embrayage', label: 'Embrayage' },
  { slug: 'volant-moteur', label: 'Volant moteur' },
  { slug: 'colonne-de-direction', label: 'Colonne de direction' },
  { slug: 'cremaillere-assistee', label: 'Crémaillère assistée' },
  { slug: 'optique-avant-principal-gauche-feuxphare', label: 'Optique avant gauche' },
  { slug: 'optique-avant-principal-droit-feuxphare', label: 'Optique avant droit' },
  { slug: 'feu-arriere-principal-gauche-feux', label: 'Feu arrière gauche' },
  { slug: 'feu-arriere-principal-droit-feux', label: 'Feu arrière droit' },
  { slug: 'retroviseur-gauche', label: 'Rétroviseur gauche' },
  { slug: 'retroviseur-droit', label: 'Rétroviseur droit' },
  { slug: 'radiateur-eau', label: 'Radiateur d’eau' },
  { slug: 'radiateur-clim', label: 'Radiateur de climatisation' },
  { slug: 'amortisseurs-avant', label: 'Amortisseurs avant' },
  { slug: 'amortisseurs-arriere', label: 'Amortisseurs arrière' },
  { slug: 'boite-de-vitesses', label: 'Boîte de vitesses' },
  { slug: 'moteur', label: 'Moteur' },
]

export const DEFAULT_CATEGORY_SLUGS: string[] = OPISTO_CATEGORY_TARGETS.map((c) => c.slug)

/** Libellé de catégorie pour un slug ; repli sur le slug humanisé. */
export function categoryLabelForSlug(slug: string): string {
  const found = OPISTO_CATEGORY_TARGETS.find((c) => c.slug === slug)
  if (found) return found.label
  const words = slug.split('-')
  const first = words[0] ?? slug
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ')
}
