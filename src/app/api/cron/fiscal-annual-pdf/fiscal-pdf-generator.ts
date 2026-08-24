import type { Totals } from './fiscal-helpers'

export async function buildAnnualPdfBase64(args: {
  fullName: string
  email: string
  year: number
  totals: Totals
}): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  // Header
  doc.setFontSize(22)
  doc.setTextColor(245, 158, 11)
  doc.text('MIDAS', 20, 25)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Recapitulatif annuel ${args.year}`, 20, 32)
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, 20, 38)

  doc.setDrawColor(245, 158, 11)
  doc.setLineWidth(0.5)
  doc.line(20, 42, 190, 42)

  // User
  doc.setFontSize(14)
  doc.setTextColor(40)
  doc.text('Beneficiaire', 20, 55)
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(`Nom : ${args.fullName || 'Non renseigne'}`, 20, 63)
  doc.text(`Email : ${args.email}`, 20, 70)
  doc.text(`Annee fiscale : ${args.year}`, 20, 77)

  // Totaux par source
  doc.setFontSize(14)
  doc.setTextColor(40)
  doc.text('Detail des gains plateforme', 20, 95)

  const rows: Array<[string, number]> = [
    ['Primes de bienvenue', args.totals.primes],
    ['Commissions parrainage', args.totals.parrainage],
    ['Nature Rewards', args.totals.nature],
    ['Marketplace', args.totals.marketplace],
    ['Missions / Contests / Lottery', args.totals.missions],
    ['Autres credits plateforme', args.totals.other],
  ]

  doc.setFontSize(10)
  doc.setTextColor(80)
  let y = 105
  for (const [label, amount] of rows) {
    doc.text(label, 20, y)
    doc.text(`${amount.toFixed(2)} EUR`, 170, y, { align: 'right' })
    y += 7
  }

  // Total
  y += 5
  doc.setDrawColor(200)
  doc.setLineWidth(0.2)
  doc.line(20, y, 190, y)
  y += 8
  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.text('TOTAL ANNUEL', 20, y)
  doc.setTextColor(245, 158, 11)
  doc.text(`${args.totals.annuel.toFixed(2)} EUR`, 170, y, { align: 'right' })

  // Note fiscale
  y += 15
  doc.setFontSize(10)
  doc.setTextColor(40)
  doc.text('Information fiscale', 20, y)

  doc.setFontSize(9)
  doc.setTextColor(80)
  const note = [
    "Ce document recapitule les revenus percus via la plateforme MIDAS (SASU PURAMA)",
    "pour l'annee fiscale indiquee. En France, ces revenus doivent etre declares sur",
    "impots.gouv.fr, case 5NG (BNC non professionnels), avec application d'un abattement",
    "automatique de 34%. Un seuil de declaration s'applique a partir de 3 000 EUR de",
    "revenus annuels cumules via des plateformes numeriques.",
    "",
    "Ce document n'a pas valeur de conseil fiscal. Consultez un conseiller pour votre",
    "situation personnelle. MIDAS / SASU PURAMA transmet par ailleurs les montants",
    "superieurs a 3 000 EUR a l'administration fiscale (DAS2).",
  ]
  for (const line of note) {
    doc.text(line, 20, y += 5)
  }

  // Mentions legales
  y += 15
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('SASU PURAMA — 8 Rue de la Chapelle, 25560 Frasne — France', 20, y)
  doc.text('Art. 293 B CGI — Non assujetti a la TVA', 20, y + 5)
  doc.text('https://midas.purama.dev/fiscal', 20, y + 10)

  return doc.output('datauristring')
}
