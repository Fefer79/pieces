import PDFDocument from 'pdfkit'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'

const COLOR_INK = '#0F1115'
const COLOR_MUTED = '#6B6F76'
const COLOR_ACCENT = '#002366'
const COLOR_BORDER = '#E5E7EB'
const TVA_RATE_DEFAULT = 18

function fcfa(n: number): string {
  return `${n.toLocaleString('fr-FR').replace(/\u00A0/g, ' ')} FCFA`
}

function dateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function invoiceNumberFor(now: Date, seq: number): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `PCS-${y}${m}-${String(seq).padStart(5, '0')}`
}

/**
 * Decompose TTC into HT + TVA. Order amounts are stored TTC (the price the
 * client pays). We round HT to nearest unit and reconstruct TVA.
 */
function splitTtc(totalTtc: number, ratePct = TVA_RATE_DEFAULT): { ht: number; tva: number } {
  const ht = Math.round(totalTtc / (1 + ratePct / 100))
  const tva = totalTtc - ht
  return { ht, tva }
}

/**
 * Issue (or fetch) an invoice for a paid order. Idempotent: returns existing
 * invoice if already issued.
 */
export async function getOrCreateInvoiceForOrder(orderId: string) {
  const existing = await prisma.invoice.findUnique({ where: { orderId } })
  if (existing) return existing

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  if (!order.paidAt) {
    throw new AppError('ORDER_NOT_PAID', 400, {
      message: 'Une facture ne peut être émise que pour une commande payée',
    })
  }

  const totalTtc = order.totalAmount
  const { ht, tva } = splitTtc(totalTtc)

  // Sequence: count invoices issued this year+month + 1
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const countThisMonth = await prisma.invoice.count({
    where: { issuedAt: { gte: startOfMonth } },
  })
  const invoiceNumber = invoiceNumberFor(now, countThisMonth + 1)

  return prisma.invoice.create({
    data: {
      orderId,
      enterpriseId: order.enterpriseId,
      invoiceNumber,
      subtotalHt: ht,
      tvaRate: TVA_RATE_DEFAULT,
      tvaAmount: tva,
      totalTtc,
    },
  })
}

export async function listInvoicesForEnterprise(
  enterpriseId: string,
  userId: string,
  filter?: { year?: number; month?: number },
) {
  await assertMember(enterpriseId, userId)
  const where: { enterpriseId: string; issuedAt?: { gte: Date; lt: Date } } = { enterpriseId }
  if (filter?.year && filter?.month) {
    const start = new Date(filter.year, filter.month - 1, 1)
    const end = new Date(filter.year, filter.month, 1)
    where.issuedAt = { gte: start, lt: end }
  }
  return prisma.invoice.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    include: {
      order: {
        select: {
          id: true,
          shareToken: true,
          paidAt: true,
          vehicleId: true,
          vehicle: { select: { brand: true, model: true, year: true, plate: true } },
        },
      },
    },
  })
}

export async function getInvoicePdf(invoiceId: string, userId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          items: true,
          initiator: { select: { name: true, phone: true, email: true } },
          vehicle: { select: { brand: true, model: true, year: true, plate: true } },
          enterprise: { select: { name: true, commune: true, address: true, rccm: true } },
        },
      },
    },
  })
  if (!invoice) throw new AppError('INVOICE_NOT_FOUND', 404, { message: 'Facture introuvable' })
  if (invoice.enterpriseId) {
    await assertMember(invoice.enterpriseId, userId)
  } else if (invoice.order.initiatorId !== userId) {
    throw new AppError('INVOICE_FORBIDDEN', 403, { message: 'Accès refusé à cette facture' })
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(20).text('Pièces.', 50, 50)
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8).text('Facture normalisée', 50, 72)
    doc
      .fillColor(COLOR_INK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(invoice.invoiceNumber, 400, 50, { align: 'right', width: 145 })
    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(`Émise le ${dateFr(invoice.issuedAt)}`, 400, 65, { align: 'right', width: 145 })

    doc.moveDown(2)

    // FNE banner
    const fneY = 110
    if (invoice.fneValidationNumber) {
      doc
        .rect(50, fneY, 495, 30)
        .fillAndStroke('#E8F5E9', COLOR_BORDER)
      doc
        .fillColor('#1B5E20')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(`Numéro de validation DGI : ${invoice.fneValidationNumber}`, 60, fneY + 10)
    } else {
      doc.rect(50, fneY, 495, 30).fillAndStroke('#FFF4E5', COLOR_BORDER)
      doc
        .fillColor('#7A4F00')
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text(
          "Intégration FNE-CI en cours — cette facture vaut justificatif commercial. " +
            "Le numéro de validation DGI sera ajouté rétroactivement à l'activation FNE.",
          60,
          fneY + 8,
          { width: 480 },
        )
    }

    // Émetteur / destinataire
    let y = fneY + 50
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('ÉMETTEUR', 50, y)
    doc.fillColor(COLOR_INK).font('Helvetica').fontSize(10).text('Pièces.ci SAS', 50, y + 14)
    doc.fontSize(9).fillColor(COLOR_MUTED).text('Marketplace pièces auto', 50, y + 28)
    doc.text('Abidjan, Côte d\'Ivoire', 50, y + 40)
    doc.text('contact@pieces.ci', 50, y + 52)

    const e = invoice.order.enterprise
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('DESTINATAIRE', 300, y)
    if (e) {
      doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(10).text(e.name, 300, y + 14)
      doc.fontSize(9).font('Helvetica').fillColor(COLOR_MUTED)
      if (e.address) doc.text(e.address, 300, y + 28)
      if (e.commune) doc.text(e.commune, 300, y + 40)
      if (e.rccm) doc.text(`RCCM : ${e.rccm}`, 300, y + 52)
    } else {
      const i = invoice.order.initiator
      doc.fillColor(COLOR_INK).font('Helvetica').fontSize(10).text(i.name ?? i.phone ?? i.email ?? '—', 300, y + 14)
    }

    // Order ref + vehicle
    y += 90
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('COMMANDE', 50, y)
    doc.fillColor(COLOR_INK).font('Helvetica').fontSize(9).text(
      `${invoice.order.shareToken.slice(0, 8)}… · payée le ${invoice.order.paidAt ? dateFr(invoice.order.paidAt) : '—'}`,
      50,
      y + 12,
    )
    if (invoice.order.vehicle) {
      const v = invoice.order.vehicle
      doc.text(
        `Véhicule : ${v.brand} ${v.model} ${v.year}${v.plate ? ` · ${v.plate}` : ''}`,
        50,
        y + 26,
      )
    }

    // Items table
    y += 56
    doc.rect(50, y, 495, 20).fillAndStroke('#F3F4F6', COLOR_BORDER)
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('DÉSIGNATION', 60, y + 6)
    doc.text('QTÉ', 350, y + 6, { width: 40, align: 'right' })
    doc.text('PRIX TTC', 400, y + 6, { width: 60, align: 'right' })
    doc.text('TOTAL', 470, y + 6, { width: 65, align: 'right' })

    y += 24
    for (const it of invoice.order.items) {
      doc.fillColor(COLOR_INK).font('Helvetica').fontSize(9).text(it.name, 60, y, { width: 280 })
      doc.text(String(it.quantity), 350, y, { width: 40, align: 'right' })
      doc.text(fcfa(it.priceSnapshot), 400, y, { width: 60, align: 'right' })
      doc.text(fcfa(it.priceSnapshot * it.quantity), 470, y, { width: 65, align: 'right' })
      y += 18
    }

    // Totals
    y += 10
    doc.moveTo(350, y).lineTo(545, y).strokeColor(COLOR_BORDER).stroke()
    y += 8
    const labor = invoice.order.laborCost ?? 0
    const delivery = invoice.order.deliveryFee
    if (labor > 0) {
      doc.fillColor(COLOR_MUTED).fontSize(9).text('Main-d\'œuvre', 350, y, { width: 110, align: 'right' })
      doc.fillColor(COLOR_INK).text(fcfa(labor), 470, y, { width: 65, align: 'right' })
      y += 14
    }
    if (delivery > 0) {
      doc.fillColor(COLOR_MUTED).text('Livraison', 350, y, { width: 110, align: 'right' })
      doc.fillColor(COLOR_INK).text(fcfa(delivery), 470, y, { width: 65, align: 'right' })
      y += 14
    }
    doc.fillColor(COLOR_MUTED).text('Sous-total HT', 350, y, { width: 110, align: 'right' })
    doc.fillColor(COLOR_INK).text(fcfa(invoice.subtotalHt), 470, y, { width: 65, align: 'right' })
    y += 14
    doc.fillColor(COLOR_MUTED).text(`TVA ${invoice.tvaRate} %`, 350, y, { width: 110, align: 'right' })
    doc.fillColor(COLOR_INK).text(fcfa(invoice.tvaAmount), 470, y, { width: 65, align: 'right' })
    y += 16
    doc.rect(350, y - 4, 195, 22).fillAndStroke(COLOR_ACCENT, COLOR_ACCENT)
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('TOTAL TTC', 360, y + 2, { width: 100, align: 'right' })
    doc.text(fcfa(invoice.totalTtc), 470, y + 2, { width: 65, align: 'right' })

    // Footer
    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(7)
      .text(
        'Pièces.ci · marketplace pièces auto Côte d\'Ivoire · TVA 18 % incluse · ' +
          'Conditions générales sur pieces.ci/cgu',
        50,
        780,
        { width: 495, align: 'center' },
      )

    doc.end()
  })
}

export async function getMonthlyInvoicePdf(
  enterpriseId: string,
  year: number,
  month: number,
  userId: string,
): Promise<Buffer> {
  await assertMember(enterpriseId, userId)
  const enterprise = await prisma.enterprise.findUnique({ where: { id: enterpriseId } })
  if (!enterprise) throw new AppError('ENTERPRISE_NOT_FOUND', 404, { message: 'Entreprise introuvable' })

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const invoices = await prisma.invoice.findMany({
    where: { enterpriseId, issuedAt: { gte: start, lt: end } },
    orderBy: { issuedAt: 'asc' },
    include: {
      order: {
        select: {
          shareToken: true,
          vehicle: { select: { brand: true, model: true, plate: true } },
        },
      },
    },
  })

  const totals = invoices.reduce(
    (acc, inv) => ({
      ht: acc.ht + inv.subtotalHt,
      tva: acc.tva + inv.tvaAmount,
      ttc: acc.ttc + inv.totalTtc,
    }),
    { ht: 0, tva: 0, ttc: 0 },
  )

  // Upsert record so the comptable can see when the consolidated was last generated
  await prisma.enterpriseMonthlyInvoice.upsert({
    where: { uq_enterprise_monthly: { enterpriseId, year, month } },
    create: {
      enterpriseId,
      year,
      month,
      invoiceCount: invoices.length,
      totalHt: totals.ht,
      tvaAmount: totals.tva,
      totalTtc: totals.ttc,
    },
    update: {
      invoiceCount: invoices.length,
      totalHt: totals.ht,
      tvaAmount: totals.tva,
      totalTtc: totals.ttc,
      generatedAt: new Date(),
    },
  })

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const monthName = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })

    doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(20).text('Pièces.', 50, 50)
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8).text('Facture mensuelle consolidée', 50, 72)
    doc
      .fillColor(COLOR_INK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`${monthName} ${year}`, 400, 50, { align: 'right', width: 145 })
    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(`Générée le ${dateFr(new Date())}`, 400, 65, { align: 'right', width: 145 })

    let y = 110
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('ENTREPRISE', 50, y)
    doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(11).text(enterprise.name, 50, y + 14)
    doc.font('Helvetica').fillColor(COLOR_MUTED).fontSize(9)
    if (enterprise.address) doc.text(enterprise.address, 50, y + 28)
    if (enterprise.commune) doc.text(enterprise.commune, 50, y + 40)
    if (enterprise.rccm) doc.text(`RCCM : ${enterprise.rccm}`, 50, y + 52)

    // Summary box
    doc
      .rect(300, y, 245, 70)
      .fillAndStroke('#F3F4F6', COLOR_BORDER)
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('TOTAL DU MOIS', 310, y + 8)
    doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(16).text(fcfa(totals.ttc), 310, y + 22)
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(9).text(`${invoices.length} facture(s)`, 310, y + 44)
    doc.text(`HT : ${fcfa(totals.ht)} · TVA : ${fcfa(totals.tva)}`, 310, y + 56)

    // Table header
    y = 200
    doc.rect(50, y, 495, 20).fillAndStroke('#F3F4F6', COLOR_BORDER)
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8).text('DATE', 60, y + 6)
    doc.text('N° FACTURE', 110, y + 6)
    doc.text('VÉHICULE', 200, y + 6)
    doc.text('HT', 360, y + 6, { width: 50, align: 'right' })
    doc.text('TVA', 415, y + 6, { width: 50, align: 'right' })
    doc.text('TTC', 470, y + 6, { width: 65, align: 'right' })
    y += 24

    for (const inv of invoices) {
      if (y > 780) {
        doc.addPage()
        y = 50
      }
      doc.fillColor(COLOR_INK).font('Helvetica').fontSize(8)
      doc.text(inv.issuedAt.toLocaleDateString('fr-FR'), 60, y)
      doc.text(inv.invoiceNumber, 110, y)
      const v = inv.order.vehicle
      doc.text(v ? `${v.brand} ${v.model}${v.plate ? ` ${v.plate}` : ''}`.slice(0, 30) : '—', 200, y, { width: 150 })
      doc.text(fcfa(inv.subtotalHt), 360, y, { width: 50, align: 'right' })
      doc.text(fcfa(inv.tvaAmount), 415, y, { width: 50, align: 'right' })
      doc.text(fcfa(inv.totalTtc), 470, y, { width: 65, align: 'right' })
      y += 16
    }

    if (invoices.length === 0) {
      doc.fillColor(COLOR_MUTED).fontSize(10).font('Helvetica-Oblique')
        .text(`Aucune facture émise sur ${monthName} ${year}.`, 50, y + 10, { align: 'center', width: 495 })
    }

    doc
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .fontSize(7)
      .text(
        `Pièces.ci · facture mensuelle consolidée ${monthName} ${year} · ` +
          'TVA 18 % incluse · Document à conserver pour la comptabilité',
        50,
        790,
        { width: 495, align: 'center' },
      )

    doc.end()
  })
}

/**
 * FEC-like CSV export for an enterprise's month — compatible with most
 * comptable software. One line per invoice with HT/TVA/TTC.
 */
export async function exportFecCsv(
  enterpriseId: string,
  year: number,
  month: number,
  userId: string,
): Promise<string> {
  await assertMember(enterpriseId, userId)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const invoices = await prisma.invoice.findMany({
    where: { enterpriseId, issuedAt: { gte: start, lt: end } },
    orderBy: { issuedAt: 'asc' },
    include: { order: { select: { shareToken: true } } },
  })

  const rows: string[] = []
  rows.push(['Date', 'NumeroFacture', 'NumeroValidationDGI', 'Commande', 'HT', 'TauxTVA', 'TVA', 'TTC'].join(';'))
  for (const inv of invoices) {
    rows.push([
      inv.issuedAt.toISOString().slice(0, 10),
      inv.invoiceNumber,
      inv.fneValidationNumber ?? '',
      inv.order.shareToken,
      String(inv.subtotalHt),
      String(inv.tvaRate),
      String(inv.tvaAmount),
      String(inv.totalTtc),
    ].join(';'))
  }
  return rows.join('\n') + '\n'
}
