#!/usr/bin/env node
/**
 * Fusionne les sources de prospection vendeurs en un jeu de données unique.
 *
 * Sources :
 *  1. _bmad-output/planning-artifacts/facebook-vendeurs/vendeurs-facebook.csv  (fiabilité haute)
 *  2. _bmad-output/planning-artifacts/data/abidjan-osm-2026-05-27.json         (géo sûre, tél rare)
 *  3. docs/prospection/_sources-brutes.md — bloc Yelloci                        (annuaire, tél fixe)
 *  4. _bmad-output/planning-artifacts/ingest-sources-recensement.md §4.2        (acteurs connus)
 *
 * Sortie : docs/prospection/prospects-vendeurs-2026-08.csv
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'docs/prospection/prospects-vendeurs-2026-08.csv')

// ---------------------------------------------------------------- utilitaires

/** +225XXXXXXXXXX ; renvoie '' si le numéro n'est pas exploitable. */
function normalizePhone(raw) {
  if (!raw) return ''
  let d = String(raw).replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  if (d.startsWith('225')) d = d.slice(3)
  if (d.startsWith('00225')) d = d.slice(5)
  if (d.length === 8) {
    // Migration 2021 : on préfixe l'ancien numéro à 8 chiffres (fixe 27, Orange 07, MTN 05, Moov 01).
    const p = d[0] === '2' ? '27' : /^[789]/.test(d[0]) ? '07' : /^[456]/.test(d[0]) ? '05' : '01'
    d = p + d
  }
  if (d.length !== 10) return ''
  return `+225${d}`
}

function splitPhones(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[;/]|\bou\b/i)
    .map(normalizePhone)
    .filter(Boolean)
}

const strip = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(ets|etablissement|etablissements|ste|societe|sarl|sa|cie|et cie)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Noms OSM génériques : ce sont des échoppes, pas des raisons sociales. */
const GENERIC = /^(vente|magasin|boutique|pieces?|piece|ferraille|import|vmagasin|vented)\b/i
function isGenericName(name) {
  const n = strip(name)
  if (!n) return true
  if (/^(pieces? auto|pieces? detachees?|pieces? autos|auto pieces|ktm|bosch|bosh service|dxi)$/.test(n)) return true
  return GENERIC.test(name.trim()) && !/chez|ets\b/i.test(name)
}

// Hors cible : concessions de marque, garages purs, spécialistes non-pièces, brokers étrangers.
const OUT_OF_SCOPE = [
  [/cfao|tractafric|premoto|setaci|africauto|babi motors|rimco motors|bia cote|nissan cote|toyota (cote|abidjan)|citro|peugeot abidjan|hyundai$|bmw abidjan|mini abidjan|ford abidjan|mazda abidjan|mitsubishi motors|veo$|coscharis/i, 'Concession / distributeur de marque'],
  [/pare.?brise|auto glass|car glass|vitrage/i, 'Vitrage — hors pièces mécaniques'],
  [/accessoires? (auto|fr)|boomstore|auto afrika|auto style|chic auto|moné|mone accessoires|roi des ecrans|roi des accessoires|carstore|enjoliveur|tapis/i, 'Accessoires / tuning / multimédia'],
  [/ci pieces$|outillage/i, 'Outillage atelier'],
  [/z-?tech|export trade|balora|xinruida|universelle import/i, 'Acteur étranger / broker export'],
  [/kul digital|toyota cote d/i, 'Signal marché, pas un vendeur'],
  [/soluxecar|noor auto design|auto hertz|slf automobile|securitev|clim auto|auto clima/i, 'Garage / service, pas grossiste'],
  [/pneumatique|jantes|pneus?$/i, 'Pneumatiques uniquement'],
]

function classify(name, categorie) {
  const hay = `${name} ${categorie || ''}`
  for (const [re, motif] of OUT_OF_SCOPE) if (re.test(hay)) return motif
  return null
}

const ZONES = [
  ['Treichville', 5.28, 5.305, -4.025, -3.99],
  ['Marcory / Zone 4', 5.265, 5.3, -3.99, -3.955],
  ['Adjamé', 5.34, 5.38, -4.045, -4.0],
  ['Plateau', 5.31, 5.34, -4.035, -4.0],
  ['Cocody / Angré', 5.33, 5.41, -4.0, -3.93],
  ['Yopougon', 5.3, 5.4, -4.14, -4.045],
  ['Abobo', 5.4, 5.48, -4.09, -3.99],
  ['Koumassi', 5.27, 5.315, -3.96, -3.92],
  ['Port-Bouët / Vridi', 5.22, 5.28, -4.0, -3.9],
]
function zoneFromGeo(lat, lon) {
  for (const [n, a, b, c, d] of ZONES) if (lat >= a && lat <= b && lon >= c && lon <= d) return n
  return ''
}

const COMMUNE_HINTS = [
  [/adjam|bracodi|roxy|forum|stif|mirador|utb/i, 'Adjamé'],
  [/treichville|zone 3|av\.? 8|avenue 8|belleville|bd de marseille|boulevard de marseille/i, 'Treichville'],
  [/zone 4|marcory|bietry|biétry|giscard destaing|vge|premoto/i, 'Marcory'],
  [/koumassi|remblais|a\.c\.a/i, 'Koumassi'],
  [/yopougon|siporex|wassakara|ficgayo|sable|sablé|gesco|kenya|niangon/i, 'Yopougon'],
  [/cocody|angré|angre|riviera|2 plateaux|ii plateaux|palmeraie|m'badon|mbadon|abatta/i, 'Cocody'],
  [/abobo|banco|n'?dotre|providence/i, 'Abobo'],
  [/plateau/i, 'Plateau'],
  [/vridi|port.?bou/i, 'Port-Bouët'],
  [/attecoub|attécoub/i, 'Attécoubé'],
]
function communeFrom(text, zone) {
  for (const [re, c] of COMMUNE_HINTS) if (re.test(text || '')) return c
  if (zone) return zone.split(' /')[0].replace('Angré', 'Cocody')
  return ''
}

// ------------------------------------------------------------------- lecture

function parseCsv(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const prospects = []
let seq = 0
function add(p) {
  prospects.push({
    id: `P${String(++seq).padStart(3, '0')}`,
    enseigne: '', type: '', segment: '', marques: '', commune: '', zone: '',
    adresse: '', lat: '', lng: '', tel: '', tel2: '', whatsapp: '', email: '',
    web: '', taille: '', formalise: '', anciennete: '', fiabilite: '', sources: '',
    motifHorsCible: '', ...p,
  })
}

// 1 — Facebook Ad Library
{
  const rows = parseCsv(fs.readFileSync(path.join(ROOT, '_bmad-output/planning-artifacts/facebook-vendeurs/vendeurs-facebook.csv'), 'utf8'))
  const head = rows.shift()
  for (const r of rows) {
    if (!r[0]) continue
    const o = Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]))
    const phones = [...new Set([...splitPhones(o.telephone), ...splitPhones(o.whatsapp)])]
    const zone = ''
    add({
      enseigne: o.nom,
      type: o.categorie,
      segment: o.types_pieces,
      marques: o.marques_specialite,
      commune: communeFrom(o.localisation, zone),
      zone: '',
      adresse: o.localisation,
      tel: phones[0] || '', tel2: phones[1] || '',
      whatsapp: splitPhones(o.whatsapp)[0] || '',
      web: o.page_facebook || o.ad_library_url,
      taille: /gros annonceur|volume|40 ans|premium|certifi/i.test(`${o.notes} ${o.categorie}`) ? 'Moyen' : '',
      fiabilite: phones.length ? 'Haute' : 'Moyenne',
      sources: 'Facebook Ad Library (2026-05-29)',
      motifHorsCible: classify(o.nom, `${o.categorie} ${o.types_pieces}`),
    })
  }
}

// 2 — OpenStreetMap
{
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, '_bmad-output/planning-artifacts/data/abidjan-osm-2026-05-27.json'), 'utf8'))
  const els = data.elements || data
  for (const e of els) {
    const t = e.tags || {}
    if (t.shop !== 'car_parts' || !t.name) continue
    if (isGenericName(t.name)) continue
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
    const zone = lat ? zoneFromGeo(lat, lon) : ''
    const adresse = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'], t['addr:city']].filter(Boolean).join(' ')
    const phones = splitPhones(t.phone || t['contact:phone'])
    add({
      enseigne: t.name,
      type: 'Magasin de pièces (relevé terrain OSM)',
      marques: (t.brand || '').replace(/;/g, ', '),
      commune: communeFrom(`${adresse} ${zone}`, zone),
      zone, adresse,
      lat: lat?.toFixed(5) || '', lng: lon?.toFixed(5) || '',
      tel: phones[0] || '', tel2: phones[1] || '',
      email: t.email || '', web: t.website || '',
      fiabilite: phones.length ? 'Haute' : 'À vérifier',
      sources: `OpenStreetMap ${e.type}/${e.id} (2026-05-27)`,
      motifHorsCible: classify(t.name, t.brand || ''),
    })
  }
}

// 3 — Annuaire Yelloci (bloc recopié dans _sources-brutes.md)
{
  const md = fs.readFileSync(path.join(ROOT, 'docs/prospection/_sources-brutes.md'), 'utf8')
  const block = md.split('## Reste à collecter')[0]
  for (const line of block.split('\n')) {
    if (!line.includes('|') || line.startsWith('#') || line.startsWith('URL')) continue
    const parts = line.split('|').map((s) => s.trim())
    if (parts.length < 3) continue
    const [nom, adresse, tel, annee] = parts
    if (!/^\+?225|^0\d/.test(tel || '')) continue
    const phones = splitPhones(tel)
    add({
      enseigne: nom,
      type: 'Entreprise enregistrée (annuaire)',
      commune: communeFrom(adresse, ''),
      adresse,
      tel: phones[0] || '', tel2: phones[1] || '',
      anciennete: annee && /^\d{4}$/.test(annee) ? annee : '',
      formalise: 'Oui (immatriculée)',
      taille: annee && Number(annee) < 1990 ? 'Grand' : '',
      fiabilite: phones.length ? 'Moyenne' : 'À vérifier',
      sources: 'Annuaire Yelloci (2026-08-25)',
      motifHorsCible: classify(nom, adresse),
    })
  }
}

// 4 — Acteurs du recensement interne non encore captés
const RECENSEMENT = [
  ['MAPA-CI', 'Treichville avenue 8 rue 24 ; succursale Adjamé face gare Stif', 'Treichville', 'Distributeur pièces & produits d\'entretien', 'Grand'],
  ['SAM — Service Auto Méca', 'Abidjan (s-automeca.com)', '', 'Distributeur pièces VL & PL', 'Moyen'],
  ['Planète Auto', 'Cocody Riviera 2', 'Cocody', 'Magasin enseigne', 'Moyen'],
  ['Auto Mecanic CI', 'Yopougon carrefour Siporex', 'Yopougon', 'Mécanique + vente de pièces', 'Petit'],
  ['Stephen Pièces Auto', 'Yopougon, face Uniwax', 'Yopougon', 'Magasin de pièces', 'Petit'],
  ['Établissement 2KDL', '2 Plateaux Agban', 'Cocody', 'Magasin toutes marques', 'Moyen'],
  ['Établissement A.R', 'Abidjan (réf. Assonvon Motors)', '', 'Magasin de pièces', 'Petit'],
  ['Abidjan Casse Auto (A.C.A.)', 'Koumassi, lot 1130 îlot 84', 'Koumassi', 'Casse — pièces d\'occasion', 'Moyen'],
  ['Lakasse', 'Abidjan (plateforme + show-room)', '', 'Pièces d\'occasion en ligne', 'Petit'],
  ['EasyPieces', 'Abidjan', '', 'Vente de pièces sur devis', 'Petit'],
  ['Casse Voiture Map', 'Abidjan', '', 'Casse — pièces d\'occasion', 'Petit'],
]
for (const [nom, adresse, commune, segment, taille] of RECENSEMENT) {
  add({
    enseigne: nom, adresse, commune: commune || communeFrom(adresse, ''),
    type: 'Acteur identifié (recensement interne)', segment, taille,
    fiabilite: 'À vérifier',
    sources: 'ingest-sources-recensement.md §4.2 (2026-05)',
    motifHorsCible: classify(nom, segment),
  })
}

// ------------------------------------------------------- dédoublonnage + score

const byPhone = new Map(), byName = new Map(), merged = []
for (const p of prospects) {
  const keyP = p.tel || null
  const keyN = strip(p.enseigne)
  const existing = (keyP && byPhone.get(keyP)) || byName.get(keyN)
  if (existing) {
    for (const k of ['tel', 'tel2', 'whatsapp', 'email', 'web', 'lat', 'lng', 'marques', 'segment', 'taille', 'anciennete', 'formalise', 'commune', 'zone'])
      if (!existing[k] && p[k]) existing[k] = p[k]
    if (!existing.adresse.includes(p.adresse) && p.adresse) existing.adresse += ` / ${p.adresse}`
    existing.sources += ` + ${p.sources}`
    if (p.fiabilite === 'Haute') existing.fiabilite = 'Haute'
    continue
  }
  if (keyP) byPhone.set(keyP, p)
  byName.set(keyN, p)
  merged.push(p)
}

function score(p) {
  let s = 0
  s += p.taille === 'Grand' ? 30 : p.taille === 'Moyen' ? 20 : p.taille === 'Petit' ? 8 : 12 // profondeur de stock
  s += p.tel ? 20 : p.web ? 8 : 0                                                            // accessibilité du décideur
  s += p.formalise?.startsWith('Oui') ? 15 : p.anciennete ? 10 : 4                            // formalisation
  const zoneScore = { 'Treichville': 15, 'Marcory': 15, 'Adjamé': 13, 'Koumassi': 10, 'Cocody': 10, 'Plateau': 10, 'Yopougon': 8, 'Abobo': 6 }
  s += zoneScore[p.commune] ?? 5                                                              // zone / logistique
  s += /facebook/i.test(p.sources) ? 10 : p.web ? 6 : 2                                       // digitalisation
  const nbMarques = p.marques ? p.marques.split(',').length : 0
  s += nbMarques >= 4 ? 10 : nbMarques >= 1 ? 6 : /toutes marques|multimarque/i.test(`${p.marques} ${p.segment}`) ? 8 : 3
  return Math.min(100, s)
}

for (const p of merged) {
  p.score = score(p)
  p.priorite = p.score >= 70 ? 'A' : p.score >= 45 ? 'B' : 'C'
}
merged.sort((a, b) => b.score - a.score || a.enseigne.localeCompare(b.enseigne))

// --------------------------------------------------------------------- sortie

const COLS = ['id', 'priorite', 'score', 'enseigne', 'type', 'segment', 'marques', 'commune', 'zone', 'adresse',
  'lat', 'lng', 'tel', 'tel2', 'whatsapp', 'email', 'web', 'taille', 'formalise', 'anciennete',
  'fiabilite', 'sources', 'motifHorsCible']
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
fs.writeFileSync(OUT, [COLS.join(','), ...merged.map((p) => COLS.map((c) => esc(p[c])).join(','))].join('\n') + '\n')

// densité des échoppes non nommées (OSM) par zone, pour l'onglet tournées
const data = JSON.parse(fs.readFileSync(path.join(ROOT, '_bmad-output/planning-artifacts/data/abidjan-osm-2026-05-27.json'), 'utf8'))
const density = {}
for (const e of data.elements || data) {
  const t = e.tags || {}
  if (t.shop !== 'car_parts') continue
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
  if (!lat) continue
  const z = zoneFromGeo(lat, lon) || 'Autre'
  density[z] = (density[z] || 0) + 1
}
fs.writeFileSync(path.join(ROOT, 'docs/prospection/_densite-osm.json'), JSON.stringify(density, null, 2))

const cible = merged.filter((p) => !p.motifHorsCible)
console.log(`${merged.length} fiches (${cible.length} cibles / ${merged.length - cible.length} hors cible)`)
console.log('Priorités :', ['A', 'B', 'C'].map((k) => `${k}=${cible.filter((p) => p.priorite === k).length}`).join(' '))
console.log('Avec téléphone :', cible.filter((p) => p.tel).length)
console.log('→', path.relative(ROOT, OUT))
