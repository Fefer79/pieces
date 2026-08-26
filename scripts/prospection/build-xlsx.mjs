#!/usr/bin/env node
/** Génère le classeur de prospection à partir de docs/prospection/prospects-vendeurs-2026-08.csv */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(path.join(ROOT, 'apps/api/package.json'))
const ExcelJS = require('exceljs')

const NAVY = 'FF00113A', ORANGE = 'FFFF6B00', LIGHT = 'FFF3F4F6', WHITE = 'FFFFFFFF'

function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++ } else if (c === '"') q = false; else field += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const raw = parseCsv(fs.readFileSync(path.join(ROOT, 'docs/prospection/prospects-vendeurs-2026-08.csv'), 'utf8'))
const head = raw.shift()
const all = raw.filter((r) => r[0]).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])))
const density = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/prospection/_densite-osm.json'), 'utf8'))

const cibles = all.filter((p) => !p.motifHorsCible)
const hors = all.filter((p) => p.motifHorsCible)

const wb = new ExcelJS.Workbook()
wb.creator = 'Pièces — Direction commerciale'
wb.created = new Date()

function styleHeader(ws, row = 1) {
  const r = ws.getRow(row)
  r.font = { bold: true, color: { argb: WHITE }, size: 11 }
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  r.alignment = { vertical: 'middle', wrapText: true }
  r.height = 28
}

// ---------------------------------------------------------------- 1. Prospects
const STATUTS = ['À contacter', 'Appelé', 'Visité', 'Relance', 'Conclu', 'Injoignable', 'À revoir', 'Rejeté']
const TAILLES = ['Grand', 'Moyen', 'Petit']
const COMMUNES = ['Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon', 'Hors Abidjan']

const ws = wb.addWorksheet('Prospects', { views: [{ state: 'frozen', xSplit: 4, ySplit: 1 }] })
ws.columns = [
  { header: 'ID', key: 'id', width: 7 },
  { header: 'Priorité', key: 'priorite', width: 9 },
  { header: 'Score', key: 'score', width: 7 },
  { header: 'Enseigne', key: 'enseigne', width: 40 },
  { header: 'Type', key: 'type', width: 26 },
  { header: 'Segment / pièces', key: 'segment', width: 34 },
  { header: 'Marques', key: 'marques', width: 30 },
  { header: 'Commune', key: 'commune', width: 13 },
  { header: 'Zone marché', key: 'zone', width: 16 },
  { header: 'Adresse / repère', key: 'adresse', width: 42 },
  { header: 'Lat', key: 'lat', width: 10 },
  { header: 'Lng', key: 'lng', width: 10 },
  { header: 'Téléphone', key: 'tel', width: 16 },
  { header: 'Téléphone 2', key: 'tel2', width: 16 },
  { header: 'WhatsApp', key: 'whatsapp', width: 16 },
  { header: 'Email', key: 'email', width: 22 },
  { header: 'Site / page', key: 'web', width: 30 },
  { header: 'Décideur', key: 'decideur', width: 18 },
  { header: 'Fonction', key: 'fonction', width: 16 },
  { header: 'Taille stock', key: 'taille', width: 12 },
  { header: 'Formalisé (RCCM)', key: 'formalise', width: 17 },
  { header: 'Informatisé ?', key: 'informatise', width: 13 },
  { header: 'Ancienneté', key: 'anciennete', width: 11 },
  { header: 'Statut', key: 'statut', width: 14 },
  { header: 'Dernier contact', key: 'dernierContact', width: 15 },
  { header: 'Prochaine action', key: 'prochaineAction', width: 26 },
  { header: 'Date relance', key: 'relance', width: 13 },
  { header: 'Notes', key: 'notes', width: 40 },
  { header: 'Fiabilité fiche', key: 'fiabilite', width: 13 },
  { header: 'Sources', key: 'sources', width: 46 },
]
cibles.forEach((p) => ws.addRow({ ...p, statut: 'À contacter' }))
styleHeader(ws)
ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columnCount } }
for (let i = 2; i <= ws.rowCount; i++) {
  const row = ws.getRow(i)
  row.alignment = { vertical: 'top', wrapText: true }
  if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
  const prio = row.getCell('priorite')
  if (prio.value === 'A') prio.font = { bold: true, color: { argb: ORANGE } }
  const web = row.getCell('web')
  if (typeof web.value === 'string' && web.value.startsWith('http')) {
    web.value = { text: 'lien', hyperlink: web.value }
    web.font = { color: { argb: 'FF0563C1' }, underline: true }
  }
}
const dv = (col, list) => {
  for (let i = 2; i <= ws.rowCount; i++) {
    ws.getCell(`${col}${i}`).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`"${list.join(',')}"`],
    }
  }
}
dv('B', ['A', 'B', 'C'])
dv('H', COMMUNES)
dv('T', TAILLES)
dv('U', ['Oui', 'Non', 'À vérifier'])
dv('V', ['Oui', 'Non', 'Partiel'])
dv('X', STATUTS)

// -------------------------------------------------------------- 2. Hors cible
const wh = wb.addWorksheet('Hors cible', { views: [{ state: 'frozen', ySplit: 1 }] })
wh.columns = [
  { header: 'ID', key: 'id', width: 7 },
  { header: 'Enseigne', key: 'enseigne', width: 44 },
  { header: 'Motif d\'exclusion', key: 'motifHorsCible', width: 34 },
  { header: 'Commune', key: 'commune', width: 13 },
  { header: 'Adresse', key: 'adresse', width: 44 },
  { header: 'Téléphone', key: 'tel', width: 16 },
  { header: 'Intérêt secondaire', key: 'interet', width: 40 },
  { header: 'Sources', key: 'sources', width: 44 },
]
hors.forEach((p) => wh.addRow({
  ...p,
  interet: /Concession/.test(p.motifHorsCible) ? 'Fournisseur amont / partenariat pièces d\'origine'
    : /Garage/.test(p.motifHorsCible) ? 'Prescripteur : achète pour ses clients'
      : /Vitrage|Pneumatiques|Accessoires|Outillage/.test(p.motifHorsCible) ? 'Élargissement catalogue plus tard'
        : '',
}))
styleHeader(wh)
wh.autoFilter = { from: 'A1', to: { row: 1, column: wh.columnCount } }
for (let i = 2; i <= wh.rowCount; i++) wh.getRow(i).alignment = { vertical: 'top', wrapText: true }

// ----------------------------------------------------------------- 3. Scoring
const wsc = wb.addWorksheet('Scoring')
wsc.columns = [
  { header: 'Critère', key: 'c', width: 34 },
  { header: 'Poids', key: 'p', width: 8 },
  { header: 'Comment le noter', key: 'h', width: 78 },
]
;[
  ['Profondeur de stock', 30, 'Grand entrepôt / plusieurs milliers de références = 30 · magasin bien achalandé = 20 · échoppe = 8. Signal terrain : nombre de rayonnages, présence d\'une réserve, délai pour sortir une référence rare.'],
  ['Accessibilité du décideur', 20, 'Le patron reçoit et décide sur place = 20 · on parle à un vendeur qui doit demander = 10 · aucun contact identifié = 0.'],
  ['Formalisation', 15, 'RCCM + facture = 15 · activité ancienne mais informelle = 10 · pas de trace = 4. Conditionne le KYC et le reversement escrow.'],
  ['Zone / logistique', 15, 'Treichville, Marcory-Zone 4 = 15 · Adjamé = 13 · Koumassi, Cocody, Plateau = 10 · Yopougon = 8 · Abobo = 6. Plus la zone est centrale, plus la livraison est rapide et bon marché.'],
  ['Digitalisation', 10, 'Déjà actif en ligne (page qui vend, annonces payantes) = 10 · site vitrine = 6 · rien = 2. Un vendeur déjà en ligne comprend la proposition en deux minutes.'],
  ['Largeur de gamme', 10, '4 marques ou plus / « toutes marques » = 10 · 1 à 3 marques = 6 · inconnu = 3.'],
].forEach((r) => wsc.addRow({ c: r[0], p: r[1], h: r[2] }))
wsc.addRow({})
wsc.addRow({ c: 'Seuils', p: '', h: 'A = 70 et plus (à visiter en premier) · B = 45 à 69 (deuxième vague) · C = moins de 45 (à qualifier par téléphone avant déplacement)' })
wsc.addRow({ c: 'Score initial', p: '', h: 'Calculé automatiquement sur les signaux publics. Il vaut ce que valent ces signaux : la note se corrige après la visite, en écrasant la colonne Score.' })
styleHeader(wsc)
wsc.getColumn('h').alignment = { wrapText: true, vertical: 'top' }

// -------------------------------------------------------- 4. Zones & tournées
const wz = wb.addWorksheet('Zones & tournées')
wz.columns = [
  { header: 'Zone marché', key: 'z', width: 20 },
  { header: 'Prospects nommés', key: 'n', width: 17 },
  { header: 'Échoppes relevées (OSM)', key: 'd', width: 22 },
  { header: 'Zone de livraison', key: 'l', width: 18 },
  { header: 'Ce qu\'on y trouve', key: 'q', width: 52 },
  { header: 'Tournée conseillée', key: 't', width: 46 },
]
const LIVRAISON = { Treichville: 'Centre', Marcory: 'Centre', Adjamé: 'Centre', Plateau: 'Centre', Cocody: 'Centre', Attécoubé: 'Centre', Yopougon: 'Intermédiaire', Abobo: 'Intermédiaire', Koumassi: 'Intermédiaire', 'Port-Bouët': 'Intermédiaire' }
const PROFIL = {
  Treichville: ['Distributeurs structurés, avenue 8 / rue 24, importateurs historiques', 'Journée 1 — la plus rentable : entreprises immatriculées, décideurs présents le matin'],
  Marcory: ['Magasins enseigne Zone 4 / Zone 4C, clientèle haut de gamme', 'Journée 2 — enchaîner avec Biétry et le Bd du Gabon'],
  Adjamé: ['Marché historique Roxy / Forum / Stif, prix négociés, qualité variable', 'Journée 3 — venir tôt (7h-10h), prévoir un interprète et beaucoup de temps'],
  Koumassi: ['Casses et pièces d\'occasion importée (A.C.A. et alentours)', 'Demi-journée — cibler les casses structurées, pas les échoppes'],
  Yopougon: ['Très forte densité d\'échoppes, gros volume mais petits stocks', 'Demi-journée par cluster (Siporex, Ficgayo, Wassakara)'],
  Cocody: ['Magasins enseigne Angré / Riviera, clientèle premium', 'Demi-journée, rendez-vous pris à l\'avance'],
  Abobo: ['Casses et pièces d\'occasion, faible formalisation', 'À qualifier par téléphone avant tout déplacement'],
  Plateau: ['Quelques importateurs, bureaux plus que magasins', 'Sur rendez-vous uniquement'],
  'Port-Bouët': ['Zone industrielle Vridi, import et poids lourd', 'Sur rendez-vous uniquement'],
}
const counts = {}
cibles.forEach((p) => { const k = p.commune || 'Non renseigné'; counts[k] = (counts[k] || 0) + 1 })
const densByCommune = { Treichville: density['Treichville'], Marcory: density['Marcory / Zone 4'], Adjamé: density['Adjamé'], Cocody: density['Cocody / Angré'], Yopougon: density['Yopougon'], Abobo: density['Abobo'], Koumassi: density['Koumassi'], Plateau: density['Plateau'] }
Object.keys(PROFIL).forEach((z) => wz.addRow({
  z, n: counts[z] || 0, d: densByCommune[z] ?? '—', l: LIVRAISON[z] || '—',
  q: PROFIL[z][0], t: PROFIL[z][1],
}))
if (counts['Non renseigné']) wz.addRow({ z: 'Commune à préciser', n: counts['Non renseigné'], d: '—', l: '—', q: 'Fiches sans localisation exploitable', t: 'Qualifier par téléphone' })
styleHeader(wz)
wz.eachRow((r, i) => { if (i > 1) r.alignment = { vertical: 'top', wrapText: true } })

// ------------------------------------------------------- 5. Compte-rendu visite
const wcr = wb.addWorksheet('Compte-rendu de visite', { views: [{ state: 'frozen', ySplit: 1 }] })
wcr.columns = [
  { header: 'Date', key: 'date', width: 12 },
  { header: 'ID prospect', key: 'id', width: 11 },
  { header: 'Enseigne', key: 'enseigne', width: 30 },
  { header: 'Interlocuteur', key: 'qui', width: 20 },
  { header: 'Rôle réel (décide ? oui/non)', key: 'role', width: 18 },
  { header: 'Références en stock (estimation)', key: 'refs', width: 20 },
  { header: 'Familles couvertes', key: 'familles', width: 26 },
  { header: 'Marques dominantes', key: 'marques', width: 22 },
  { header: 'Neuf / occasion / ré-usiné', key: 'condition', width: 20 },
  { header: 'Gestion du stock (cahier / Excel / logiciel)', key: 'gestion', width: 24 },
  { header: 'Livre-t-il déjà ?', key: 'livraison', width: 16 },
  { header: 'Vend-il déjà en ligne ?', key: 'enligne', width: 18 },
  { header: 'Paiement accepté (cash / mobile money / virement)', key: 'paiement', width: 26 },
  { header: 'Objections entendues', key: 'objections', width: 40 },
  { header: 'Commission évoquée (%)', key: 'commission', width: 18 },
  { header: 'Niveau d\'engagement obtenu', key: 'engagement', width: 26 },
  { header: 'Prochaine étape + date', key: 'suite', width: 28 },
  { header: 'Score revu (0-100)', key: 'score', width: 15 },
]
styleHeader(wcr)
for (let i = 2; i <= 60; i++) {
  wcr.getCell(`P${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Essai 10 références,Mandat Liaison (photos du stock),Contrat signé,Nouveau rendez-vous,Refus"'] }
  wcr.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Oui,Non"'] }
  wcr.getCell(`J${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Cahier,Excel,Logiciel,Rien"'] }
}

// --------------------------------------------------------- 6. Sources & méthode
const wsr = wb.addWorksheet('Sources & méthode')
wsr.columns = [
  { header: 'Bloc', key: 'b', width: 34 },
  { header: 'Volume', key: 'v', width: 10 },
  { header: 'Capté le', key: 'd', width: 12 },
  { header: 'Fiabilité', key: 'f', width: 12 },
  { header: 'Limites connues', key: 'l', width: 80 },
]
;[
  ['Facebook Ad Library', '48 fiches', '2026-05-29', 'Haute', 'Numéros issus d\'annonces payantes, donc actifs. Adresses souvent approximatives (« Abidjan », un repère de quartier). Biais : ne voit que les vendeurs qui font de la publicité.'],
  ['OpenStreetMap Abidjan', '171 enseignes nommées sur 287 points', '2026-05-27', 'À vérifier', 'Position GPS fiable, nom relevé sur l\'enseigne. Presque aucun téléphone. Les points au nom générique (« Vente de pièces détachées ») sont comptés comme densité mais pas listés comme prospects.'],
  ['Annuaire Yelloci', '58 entreprises (pages 1 à 3 sur 6)', '2026-08-25', 'Moyenne', 'Entreprises immatriculées avec adresse postale. Les numéros à 8 chiffres ont été reconstitués selon la migration 2021 (fixe → 27, Orange → 07, MTN → 05, Moov → 01) : à confirmer au premier appel. Pages 4 à 6 non collectées.'],
  ['Recensement interne', '11 acteurs', '2026-05', 'À vérifier', 'Acteurs connus de l\'équipe, coordonnées à compléter sur le terrain.'],
].forEach((r) => wsr.addRow({ b: r[0], v: r[1], d: r[2], f: r[3], l: r[4] }))
wsr.addRow({})
wsr.addRow({ b: 'Dédoublonnage', v: '', d: '', f: '', l: 'En cascade : téléphone normalisé +225XXXXXXXXXX, puis nom normalisé (sans accents, sans Ets/Ste/SARL). Les fiches fusionnées cumulent leurs sources dans la colonne Sources.' })
wsr.addRow({ b: 'Regénérer le fichier', v: '', d: '', f: '', l: 'node scripts/prospection/build-prospects.mjs puis node scripts/prospection/build-xlsx.mjs. Les saisies terrain faites dans ce classeur seraient écrasées : travailler sur une copie ou ne regénérer qu\'avant diffusion.' })
wsr.addRow({ b: 'Ce que le fichier n\'est pas', v: '', d: '', f: '', l: 'Un recensement exhaustif du marché. C\'est le meilleur point de départ constructible à partir de sources publiques : les colonnes vides sont du travail de terrain, pas des oublis.' })
styleHeader(wsr)
wsr.getColumn('l').alignment = { wrapText: true, vertical: 'top' }

const out = path.join(ROOT, 'docs/prospection/prospection-vendeurs-2026-08.xlsx')
await wb.xlsx.writeFile(out)
console.log(`${cibles.length} cibles + ${hors.length} hors cible → ${path.relative(ROOT, out)}`)
