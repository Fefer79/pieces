import PDFDocument from 'pdfkit'
import { getVendorContract, VENDOR_CONTRACT_EFFECTIVE_DATE } from 'shared/contracts'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

const NAVY = '#00113A'
const ORANGE = '#FF6B00'
const INK = '#1A1A1A'
const MUTED = '#6B6F76'
const BORDER = '#E5E7EB'

const MARGIN = 56
const PAGE_WIDTH = 595.28 // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

function dateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

/**
 * Génère le PDF du contrat d'adhésion vendeur depuis la source unique
 * (`VENDOR_CONTRACT`). Si le contrat est signé, le bloc signature est rempli ;
 * sinon il reste vierge (à signer en ligne ou à la main).
 */
export async function generateVendorContractPdf(token: string): Promise<Buffer> {
  const contract = await prisma.vendorContract.findUnique({
    where: { token },
    select: {
      contractVersion: true,
      commissionModel: true,
      status: true,
      sellerName: true,
      shopName: true,
      phone: true,
      signedName: true,
      signedAt: true,
      acceptedIp: true,
      createdAt: true,
    },
  })
  if (!contract) {
    throw new AppError('CONTRACT_NOT_FOUND', 404, { message: 'Contrat introuvable' })
  }

  const contractContent = getVendorContract(contract.commissionModel)

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ---- Header -------------------------------------------------------------
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(24).text('Pièces', MARGIN, MARGIN, { continued: true })
    doc.fillColor(ORANGE).text('.')
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(contractContent.editor.description, MARGIN, MARGIN + 30)

    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(`Version ${contract.contractVersion}`, MARGIN, MARGIN, {
        width: CONTENT_WIDTH,
        align: 'right',
      })
      .text(`En vigueur le ${dateFr(new Date(VENDOR_CONTRACT_EFFECTIVE_DATE))}`, MARGIN, MARGIN + 11, {
        width: CONTENT_WIDTH,
        align: 'right',
      })

    let y = MARGIN + 56
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(BORDER).lineWidth(1).stroke()
    y += 22

    // ---- Title --------------------------------------------------------------
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text(contractContent.title, MARGIN, y, {
      width: CONTENT_WIDTH,
    })
    y = doc.y + 4
    doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(contractContent.subtitle, MARGIN, y, {
      width: CONTENT_WIDTH,
    })
    y = doc.y + 6

    // ---- Parties ------------------------------------------------------------
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('Entre les soussignés :', MARGIN, y)
    y = doc.y + 4
    doc.font('Helvetica').fontSize(9).fillColor(INK)
    doc.text(
      `Pièces, exploitant de la marketplace pieces.ci (« la Plateforme »), d’une part ;`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH },
    )
    const seller = contract.shopName
      ? `${contract.sellerName} — ${contract.shopName}`
      : contract.sellerName
    doc.text(
      `${seller}${contract.phone ? ` (${contract.phone})` : ''} (« le Vendeur »), d’autre part.`,
      MARGIN,
      doc.y + 2,
      { width: CONTENT_WIDTH },
    )
    y = doc.y + 10

    // ---- Préambule ----------------------------------------------------------
    doc.font('Helvetica').fontSize(9.5).fillColor(INK)
    for (const para of contractContent.preamble) {
      doc.text(para, MARGIN, y, { width: CONTENT_WIDTH, align: 'justify' })
      y = doc.y + 7
    }

    // ---- Articles -----------------------------------------------------------
    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - MARGIN - 30) {
        doc.addPage()
        return MARGIN
      }
      return doc.y
    }

    for (const art of contractContent.articles) {
      y = ensureSpace(48)
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`Article ${art.number} — ${art.title}`, MARGIN, y + 6, { width: CONTENT_WIDTH })
      y = doc.y + 4

      doc.font('Helvetica').fontSize(9.5).fillColor(INK)
      for (const para of art.paragraphs) {
        doc.text(para, MARGIN, y, { width: CONTENT_WIDTH, align: 'justify' })
        y = doc.y + 5
      }

      if (art.bullets) {
        for (const bullet of art.bullets) {
          y = ensureSpace(20)
          doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(9.5).text('▸', MARGIN + 6, y, {
            width: 12,
            continued: false,
          })
          doc
            .fillColor(INK)
            .font('Helvetica')
            .fontSize(9.5)
            .text(bullet, MARGIN + 22, y, { width: CONTENT_WIDTH - 22, align: 'justify' })
          doc.moveDown(0.3)
        }
      }
      doc.moveDown(0.4)
    }

    // ---- Clôture ------------------------------------------------------------
    y = ensureSpace(40)
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
    for (const para of contractContent.closing) {
      doc.text(para, MARGIN, y + 6, { width: CONTENT_WIDTH, align: 'justify' })
      y = doc.y + 6
    }

    // ---- Signature ----------------------------------------------------------
    ensureSpace(140)
    y = doc.y + 14
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(BORDER).lineWidth(1).stroke()
    y += 16

    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text('Acceptation du Vendeur', MARGIN, y)
    y = doc.y + 8

    if (contract.status === 'ACCEPTED' && contract.signedAt) {
      doc.fillColor(INK).font('Helvetica').fontSize(9.5)
      doc.text(`Signé électroniquement par : `, MARGIN, y, { continued: true })
      doc.font('Helvetica-Bold').text(contract.signedName ?? seller)
      doc.font('Helvetica').text(`Le ${dateFr(contract.signedAt)} à ${contract.signedAt.toLocaleTimeString('fr-FR')}`, MARGIN, doc.y + 3)
      if (contract.acceptedIp) {
        doc.fillColor(MUTED).fontSize(8).text(`Adresse IP : ${contract.acceptedIp}`, MARGIN, doc.y + 3)
      }
      doc
        .fillColor(ORANGE)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('✓ Contrat accepté et conservé à titre de preuve.', MARGIN, doc.y + 6)
    } else {
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(9)
        .text(
          'Lu et approuvé — le Vendeur accepte les présentes conditions en signant en ligne via son lien personnel, ou ci-dessous :',
          MARGIN,
          y,
          { width: CONTENT_WIDTH },
        )
      y = doc.y + 30
      doc.fillColor(INK).fontSize(9)
      doc.text('Nom : ______________________________', MARGIN, y)
      doc.text('Date : ____________________', MARGIN + 280, y)
      doc.text('Signature : ______________________________', MARGIN, y + 28)
    }

    // ---- Footer (numérotation) ---------------------------------------------
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `Pièces — ${contractContent.editor.contact}   ·   Contrat d’adhésion vendeur v${contract.contractVersion}   ·   Page ${i - range.start + 1}/${range.count}`,
          MARGIN,
          doc.page.height - MARGIN + 8,
          { width: CONTENT_WIDTH, align: 'center' },
        )
    }

    doc.end()
  })
}
