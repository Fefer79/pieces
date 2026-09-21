/**
 * Générations véhicules Opisto : code châssis → plage d'années.
 *
 * POURQUOI CE FICHIER — 3 588 pièces Opisto n'ont pas d'année : la casse ne
 * renseigne pas la date de mise en circulation, et la fiche produit ne la porte
 * pas non plus (vérifié sur 40 fiches, « Non renseignée » à chaque fois). En
 * revanche le libellé du véhicule donneur porte le code châssis — « TOYOTA
 * AVENSIS BERLINA (T25) », « HYUNDAI ACCENT (LC) » — qui désigne exactement une
 * génération, donc une plage d'années.
 *
 * La dérivation par motorisation a été essayée et rejetée : un même couple
 * cylindrée-carburant existe sur trois générations, donc l'union des plages du
 * référentiel donne « Corolla 1980-2026 ». Sur une pièce d'occasion, une plage
 * fausse est pire que pas de plage — elle fait remonter un boîtier de Corolla
 * E12 pour une Corolla de 2020.
 *
 * ⚠ RELECTURE OBLIGATOIRE — `verified: false` signifie « proposé, non vérifié ».
 * Le backfill IGNORE toute ligne non vérifiée : le fichier tel quel n'écrit rien.
 * Pour valider une ligne, confronter la plage à une source constructeur ou
 * TecDoc, corriger si besoin, puis passer `verified: true`.
 *
 * Les 45 clés ci-dessous couvrent 1 509 des 1 924 fitments porteurs d'un code.
 * `codes` liste les jetons tels qu'ils apparaissent entre parenthèses dans le
 * libellé, underscores retirés : « (JT, TE, TD) » et « (_E12_) » se ramènent
 * respectivement à JT/TE/TD et E12. Chez Peugeot, « S1 »/« S2 » ne sont pas des
 * codes châssis mais les phases — d'où une entrée par modèle.
 */
export type OpistoGeneration = {
  /** Marque canonique du référentiel Pièces. */
  brand: string
  /** Modèle canonique du référentiel Pièces (cf. `VEHICLE_BRANDS`). */
  model: string
  /** Jetons de code châssis, en capitales, sans underscore. */
  codes: string[]
  yearFrom: number
  yearTo: number
  /** Passe à `true` après confrontation à une source constructeur. */
  verified: boolean
  /** Volume de fitments concernés au moment de l'extraction (aide au tri). */
  hits: number
}

export const OPISTO_GENERATIONS: OpistoGeneration[] = [
  { brand: 'TOYOTA',  model: 'Avensis',       codes: ['T25'],              yearFrom: 2003, yearTo: 2008, verified: false, hits: 99 },
  { brand: 'TOYOTA',  model: 'Corolla',       codes: ['E12'],              yearFrom: 2002, yearTo: 2007, verified: false, hits: 95 },
  { brand: 'HYUNDAI', model: 'Accent',        codes: ['LC'],               yearFrom: 1999, yearTo: 2005, verified: false, hits: 80 },
  { brand: 'SUZUKI',  model: 'SWIFT',         codes: ['MZ', 'EZ'],         yearFrom: 2005, yearTo: 2010, verified: false, hits: 96 },
  { brand: 'SUZUKI',  model: 'GRAND VITARA',  codes: ['JT', 'TE', 'TD'],   yearFrom: 2005, yearTo: 2015, verified: false, hits: 124 },
  { brand: 'HYUNDAI', model: 'Getz',          codes: ['TB'],               yearFrom: 2002, yearTo: 2009, verified: false, hits: 63 },
  { brand: 'HYUNDAI', model: 'Matrix',        codes: ['FC'],               yearFrom: 2001, yearTo: 2010, verified: false, hits: 49 },
  { brand: 'TOYOTA',  model: 'Corolla Verso', codes: ['R1'],               yearFrom: 2004, yearTo: 2009, verified: false, hits: 48 },
  { brand: 'PEUGEOT', model: '406',           codes: ['S1'],               yearFrom: 1995, yearTo: 1999, verified: false, hits: 40 },
  { brand: 'PEUGEOT', model: '406',           codes: ['S2'],               yearFrom: 1999, yearTo: 2004, verified: false, hits: 40 },
  { brand: 'SUZUKI',  model: 'IGNIS',         codes: ['MH'],               yearFrom: 2003, yearTo: 2008, verified: false, hits: 40 },
  { brand: 'SUZUKI',  model: 'SX4',           codes: ['EY'],               yearFrom: 2006, yearTo: 2014, verified: false, hits: 39 },
  { brand: 'SUZUKI',  model: 'BALENO',        codes: ['EG'],               yearFrom: 1995, yearTo: 2002, verified: false, hits: 36 },
  { brand: 'HYUNDAI', model: 'Atos',          codes: ['MX'],               yearFrom: 1997, yearTo: 2008, verified: false, hits: 34 },
  { brand: 'HYUNDAI', model: 'ELANTRA',       codes: ['XD'],               yearFrom: 2000, yearTo: 2006, verified: false, hits: 32 },
  { brand: 'TOYOTA',  model: 'Avensis',       codes: ['T27'],              yearFrom: 2009, yearTo: 2018, verified: false, hits: 32 },
  { brand: 'HYUNDAI', model: 'SONATA',        codes: ['NF'],               yearFrom: 2004, yearTo: 2009, verified: false, hits: 32 },
  { brand: 'HYUNDAI', model: 'SANTA FE',      codes: ['SM'],               yearFrom: 2000, yearTo: 2006, verified: false, hits: 31 },
  { brand: 'SUZUKI',  model: 'VITARA',        codes: ['ET'],               yearFrom: 1988, yearTo: 1999, verified: false, hits: 31 },
  { brand: 'HYUNDAI', model: 'Accent',        codes: ['MC'],               yearFrom: 2005, yearTo: 2010, verified: false, hits: 30 },
  { brand: 'HYUNDAI', model: 'Coupe',         codes: ['RD'],               yearFrom: 1996, yearTo: 2002, verified: false, hits: 29 },
  { brand: 'HYUNDAI', model: 'Tucson',        codes: ['JM'],               yearFrom: 2004, yearTo: 2010, verified: false, hits: 28 },
  { brand: 'SUZUKI',  model: 'GRAND VITARA',  codes: ['FT'],               yearFrom: 1998, yearTo: 2005, verified: false, hits: 25 },
  { brand: 'TOYOTA',  model: 'Rav4',          codes: ['A2'],               yearFrom: 2000, yearTo: 2005, verified: false, hits: 25 },
  { brand: 'TOYOTA',  model: 'Yaris',         codes: ['NCP1','NLP1','SCP1'], yearFrom: 1999, yearTo: 2005, verified: false, hits: 66 },
  { brand: 'TOYOTA',  model: 'Auris',         codes: ['E15'],              yearFrom: 2007, yearTo: 2012, verified: false, hits: 21 },
  { brand: 'HYUNDAI', model: 'Lantra',        codes: ['RD'],               yearFrom: 1995, yearTo: 2000, verified: false, hits: 20 },
  { brand: 'SUZUKI',  model: 'Liana',         codes: ['ER'],               yearFrom: 2001, yearTo: 2007, verified: false, hits: 19 },
  { brand: 'HYUNDAI', model: 'Terracan',      codes: ['HP'],               yearFrom: 2001, yearTo: 2007, verified: false, hits: 19 },
  { brand: 'SUZUKI',  model: 'JIMNY',         codes: ['FJ'],               yearFrom: 1998, yearTo: 2018, verified: false, hits: 18 },
  { brand: 'HYUNDAI', model: 'i30',           codes: ['GD'],               yearFrom: 2011, yearTo: 2017, verified: false, hits: 17 },
  { brand: 'HYUNDAI', model: 'SANTA FE',      codes: ['CM'],               yearFrom: 2006, yearTo: 2012, verified: false, hits: 16 },
  { brand: 'PEUGEOT', model: '307',           codes: ['S1'],               yearFrom: 2001, yearTo: 2005, verified: false, hits: 16 },
  { brand: 'PEUGEOT', model: '206',           codes: ['2A', 'C'],          yearFrom: 1998, yearTo: 2012, verified: false, hits: 32 },
  { brand: 'TOYOTA',  model: 'Auris',         codes: ['E18'],              yearFrom: 2012, yearTo: 2018, verified: false, hits: 15 },
  { brand: 'HYUNDAI', model: 'I40',           codes: ['VF'],               yearFrom: 2011, yearTo: 2019, verified: false, hits: 15 },
  { brand: 'PEUGEOT', model: '306',           codes: ['S2'],               yearFrom: 1997, yearTo: 2002, verified: false, hits: 15 },
  { brand: 'TOYOTA',  model: 'Rav4',          codes: ['A3'],               yearFrom: 2006, yearTo: 2012, verified: false, hits: 15 },

  // À DATER — code relevé en base, plage non établie. Laissé hors table tant que
  // la génération n'est pas identifiée avec certitude :
  //   HYUNDAI / SANTA FE / BM  (27 fitments) — « BM » désigne selon les
  //   catalogues la II (CM) ou la III ; ne pas trancher au jugé.
]
