import PDFDocument from 'pdfkit'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

const COLOR_INK = '#0F1115'
const COLOR_MUTED = '#6B6F76'
const COLOR_ACCENT = '#002366'
const COLOR_BORDER = '#E5E7EB'

function fcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/\u00A0/g, ' ')} FCFA`
}

function dateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function generateDevisPdf(orderId: string, requesterId: string): Promise<Buffer> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      initiator: { select: { id: true, name: true, phone: true, email: true } },
      vehicle: { select: { brand: true, model: true, year: true, plate: true, vin: true } },
      enterprise: { select: { name: true, commune: true, address: true, rccm: true } },
    },
  })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })

  const ownsDirectly = order.initiatorId === requesterId
  let isEnterpriseMember = false
  if (order.enterpriseId) {
    const membership = await prisma.enterpriseMember.findUnique({
      where: { uq_enterprise_member: { enterpriseId: order.enterpriseId, userId: requesterId } },
      select: { id: true },
    })
    isEnterpriseMember = membership !== null
  }
  if (!ownsDirectly && !isEnterpriseMember) {
    throw new AppError('ORDER_FORBIDDEN', 403, { message: 'Accès refusé à ce devis' })
  }

  const itemsTotal = order.items.reduce((s, it) => s + (it.priceSnapshot ?? 0), 0)
  const labor = order.laborCost ?? 0
  const delivery = order.deliveryFee ?? 0
  const grandTotal = order.totalAmount

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ---- Header ---------------------------------------------------------
    doc.fillColor(COLOR_ACCENT).font('Helvetica-Bold').fontSize(22).text('Pièces', 50, 50)
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(9)
      .text('Marketplace de pièces auto — Côte d\'Ivoire', 50, 75)

    doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(18)
      .text('DEVIS', 400, 50, { align: 'right' })
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(9)
      .text(`N° ${order.shareToken.slice(0, 10).toUpperCase()}`, 400, 73, { align: 'right' })
      .text(`Émis le ${dateFr(order.createdAt)}`, 400, 87, { align: 'right' })

    doc.moveTo(50, 110).lineTo(545, 110).strokeColor(COLOR_BORDER).stroke()

    // ---- Customer / Enterprise block -----------------------------------
    let y = 130
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8)
      .text('CLIENT', 50, y)
    y += 14
    doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(11)
    if (order.enterprise) {
      doc.text(order.enterprise.name, 50, y)
      y += 14
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_MUTED)
      if (order.enterprise.commune) {
        doc.text(`${order.enterprise.commune}${order.enterprise.address ? ` — ${order.enterprise.address}` : ''}`, 50, y)
        y += 13
      }
      if (order.enterprise.rccm) {
        doc.text(`RCCM : ${order.enterprise.rccm}`, 50, y)
        y += 13
      }
    } else {
      doc.text(order.initiator.name ?? 'Client particulier', 50, y)
      y += 14
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_MUTED)
      if (order.initiator.phone) { doc.text(order.initiator.phone, 50, y); y += 13 }
      if (order.initiator.email) { doc.text(order.initiator.email, 50, y); y += 13 }
    }

    // ---- Vehicle block (right column) ----------------------------------
    if (order.vehicle) {
      doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8).text('VÉHICULE', 320, 130)
      doc.fillColor(COLOR_INK).font('Helvetica-Bold').fontSize(11)
        .text(`${order.vehicle.brand} ${order.vehicle.model} ${order.vehicle.year}`, 320, 144)
      doc.font('Helvetica').fontSize(10).fillColor(COLOR_MUTED)
      let yv = 158
      if (order.vehicle.plate) { doc.text(`Plaque : ${order.vehicle.plate}`, 320, yv); yv += 13 }
      if (order.vehicle.vin) { doc.text(`VIN : ${order.vehicle.vin}`, 320, yv) }
    }

    y = Math.max(y, 210)

    // ---- Items table ---------------------------------------------------
    doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOR_BORDER).stroke()
    y += 10
    doc.fillColor(COLOR_MUTED).font('Helvetica-Bold').fontSize(8)
      .text('PIÈCE', 50, y, { width: 230 })
      .text('FOURNISSEUR', 285, y, { width: 130 })
      .text('PRIX UNIT.', 420, y, { width: 125, align: 'right' })
    y += 16
    doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOR_BORDER).stroke()
    y += 8

    doc.font('Helvetica').fontSize(10).fillColor(COLOR_INK)
    for (const item of order.items) {
      const rowHeight = 20
      doc.text(item.name, 50, y, { width: 230, ellipsis: true })
      doc.fillColor(COLOR_MUTED).text(item.vendorShopName ?? '—', 285, y, { width: 130, ellipsis: true })
      doc.fillColor(COLOR_INK).text(fcfa(item.priceSnapshot ?? 0), 420, y, { width: 125, align: 'right' })
      y += rowHeight
      if (y > 720) {
        doc.addPage()
        y = 50
      }
    }

    // ---- Totals breakdown ----------------------------------------------
    y += 10
    doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOR_BORDER).stroke()
    y += 12

    function totalLine(label: string, amount: number, bold = false) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(bold ? 12 : 10)
         .fillColor(bold ? COLOR_INK : COLOR_MUTED)
         .text(label, 320, y, { width: 100, align: 'right' })
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(COLOR_INK)
         .text(fcfa(amount), 420, y, { width: 125, align: 'right' })
      y += bold ? 22 : 18
    }

    totalLine('Sous-total pièces', itemsTotal)
    if (labor > 0) totalLine('Main d\'œuvre', labor)
    if (delivery > 0) totalLine('Livraison', delivery)
    doc.moveTo(320, y).lineTo(545, y).strokeColor(COLOR_BORDER).stroke()
    y += 8
    totalLine('TOTAL', grandTotal, true)

    // ---- Footer --------------------------------------------------------
    const footerY = 770
    doc.fillColor(COLOR_MUTED).font('Helvetica').fontSize(8)
      .text(
        'Devis valable 7 jours à compter de la date d\'émission. Prix exprimés en FCFA, livraison sous 24-48h dans Abidjan.',
        50, footerY, { width: 495, align: 'center' },
      )
      .text('pieces.ci — generated automatically', 50, footerY + 14, { width: 495, align: 'center' })

    doc.end()
  })
}
