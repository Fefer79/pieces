// Modèles français présents sur le parc CI mais absents/incomplets sur NHTSA
// (les marques françaises ont quitté le marché US dans les années 80-90).
// Source : connaissance du parc CI + sites distributeurs CFAO Motors.

export type FrenchModel = {
  makeSlug: string
  name: string
  yearStart: number
  yearEnd: number | null
}

export const CI_FRENCH_MODELS: FrenchModel[] = [
  // Peugeot — distribué par CFAO Motors CI
  { makeSlug: 'peugeot', name: '206', yearStart: 1998, yearEnd: 2010 },
  { makeSlug: 'peugeot', name: '207', yearStart: 2006, yearEnd: 2014 },
  { makeSlug: 'peugeot', name: '208', yearStart: 2012, yearEnd: null },
  { makeSlug: 'peugeot', name: '301', yearStart: 2012, yearEnd: null },
  { makeSlug: 'peugeot', name: '307', yearStart: 2001, yearEnd: 2008 },
  { makeSlug: 'peugeot', name: '308', yearStart: 2007, yearEnd: null },
  { makeSlug: 'peugeot', name: '406', yearStart: 1995, yearEnd: 2004 },
  { makeSlug: 'peugeot', name: '407', yearStart: 2004, yearEnd: 2011 },
  { makeSlug: 'peugeot', name: '408', yearStart: 2010, yearEnd: null },
  { makeSlug: 'peugeot', name: '508', yearStart: 2011, yearEnd: null },
  { makeSlug: 'peugeot', name: '2008', yearStart: 2013, yearEnd: null },
  { makeSlug: 'peugeot', name: '3008', yearStart: 2008, yearEnd: null },
  { makeSlug: 'peugeot', name: '5008', yearStart: 2009, yearEnd: null },
  { makeSlug: 'peugeot', name: 'Partner', yearStart: 1996, yearEnd: null },
  { makeSlug: 'peugeot', name: 'Expert', yearStart: 1995, yearEnd: null },
  { makeSlug: 'peugeot', name: 'Boxer', yearStart: 1994, yearEnd: null },
  { makeSlug: 'peugeot', name: 'Bipper', yearStart: 2008, yearEnd: null },
  { makeSlug: 'peugeot', name: 'Landtrek', yearStart: 2020, yearEnd: null },

  // Renault — historique CI
  { makeSlug: 'renault', name: 'Clio', yearStart: 1990, yearEnd: null },
  { makeSlug: 'renault', name: 'Megane', yearStart: 1995, yearEnd: null },
  { makeSlug: 'renault', name: 'Logan', yearStart: 2004, yearEnd: null },
  { makeSlug: 'renault', name: 'Sandero', yearStart: 2007, yearEnd: null },
  { makeSlug: 'renault', name: 'Duster', yearStart: 2010, yearEnd: null },
  { makeSlug: 'renault', name: 'Symbol', yearStart: 1999, yearEnd: null },
  { makeSlug: 'renault', name: 'Kangoo', yearStart: 1997, yearEnd: null },
  { makeSlug: 'renault', name: 'Trafic', yearStart: 1980, yearEnd: null },
  { makeSlug: 'renault', name: 'Master', yearStart: 1980, yearEnd: null },
  { makeSlug: 'renault', name: 'Express', yearStart: 1985, yearEnd: 2000 },
  { makeSlug: 'renault', name: 'Captur', yearStart: 2013, yearEnd: null },
  { makeSlug: 'renault', name: 'Koleos', yearStart: 2008, yearEnd: null },
  { makeSlug: 'renault', name: 'Laguna', yearStart: 1993, yearEnd: 2015 },
  { makeSlug: 'renault', name: 'Twingo', yearStart: 1993, yearEnd: null },
  { makeSlug: 'renault', name: 'Talisman', yearStart: 2015, yearEnd: null },

  // Citroen — distribué par CFAO Motors CI
  { makeSlug: 'citroen', name: 'C3', yearStart: 2002, yearEnd: null },
  { makeSlug: 'citroen', name: 'C4', yearStart: 2004, yearEnd: null },
  { makeSlug: 'citroen', name: 'C5', yearStart: 2001, yearEnd: null },
  { makeSlug: 'citroen', name: 'C-Elysee', yearStart: 2012, yearEnd: null },
  { makeSlug: 'citroen', name: 'Berlingo', yearStart: 1996, yearEnd: null },
  { makeSlug: 'citroen', name: 'Jumpy', yearStart: 1994, yearEnd: null },
  { makeSlug: 'citroen', name: 'Jumper', yearStart: 1994, yearEnd: null },
  { makeSlug: 'citroen', name: 'Xsara', yearStart: 1997, yearEnd: 2010 },
  { makeSlug: 'citroen', name: 'Xantia', yearStart: 1993, yearEnd: 2001 },
  { makeSlug: 'citroen', name: 'Saxo', yearStart: 1996, yearEnd: 2003 },
  { makeSlug: 'citroen', name: 'C-Crosser', yearStart: 2007, yearEnd: 2012 },

  // Chery (absent NHTSA, distribué via Tractafric)
  { makeSlug: 'chery', name: 'Tiggo 2', yearStart: 2017, yearEnd: null },
  { makeSlug: 'chery', name: 'Tiggo 3', yearStart: 2014, yearEnd: null },
  { makeSlug: 'chery', name: 'Tiggo 4', yearStart: 2017, yearEnd: null },
  { makeSlug: 'chery', name: 'Tiggo 7', yearStart: 2017, yearEnd: null },
  { makeSlug: 'chery', name: 'Tiggo 8', yearStart: 2019, yearEnd: null },
  { makeSlug: 'chery', name: 'Arrizo 5', yearStart: 2016, yearEnd: null },
  { makeSlug: 'chery', name: 'QQ', yearStart: 2003, yearEnd: 2017 },
]
