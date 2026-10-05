/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { EstimateProject } from '../types/xactimate';

/**
 * Generates an executive narrative proposal or scope of work PDF from an EstimateProject
 */
export function generateProposalPdf(
  project: EstimateProject,
  mode: 'PROPOSAL' | 'WORK_ORDER' | 'AUDIT_REPORT' = 'PROPOSAL'
): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 40;

  // Helper for adding footer with page numbers
  const addFooter = (currentPage: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Hays + Sons Restoration Document Suite · Claim: ${project.claim.claimNumber} · Profile: ${project.claim.profile}`,
      margin,
      pageHeight - 24
    );
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 24);
  };

  // 1. Header Banner & Logo geometry
  // Red vertical bar
  doc.setFillColor(220, 38, 38); // #DC2626
  doc.rect(margin, y, 10, 30, 'F');
  // Plus crossbar
  doc.setFillColor(26, 26, 26); // #1A1A1A
  doc.rect(margin + 10, y + 10, 36, 10, 'F');
  // Plus stem
  doc.rect(margin + 26, y, 10, 30, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Hays+Sons', margin + 56, y + 18);

  // Sublabel
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Restoration Document Suite', margin + 56, y + 29);

  // Document Type Banner (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38); // Brand Red
  const title =
    mode === 'PROPOSAL'
      ? 'SCOPE OF REPAIR PROPOSAL'
      : mode === 'WORK_ORDER'
      ? 'OPERATIONAL SUBCONTRACTOR WORK ORDER'
      : 'XACTIMATE ESX COMPLIANCE AUDIT';
  doc.text(title, pageWidth - margin, y + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, y + 29, { align: 'right' });

  y += 46;

  // Thin separator line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 18;

  // 2. Claim, Insured & Spatial Summary Grid
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin, y, pageWidth - margin * 2, 78, 'F');
  doc.rect(margin, y, pageWidth - margin * 2, 78, 'S');

  doc.setFontSize(9);
  // Column 1: Claim Info
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CLAIM & POLICY', margin + 12, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Claim #: ${project.claim.claimNumber}`, margin + 12, y + 30);
  doc.text(`Policy #: ${project.claim.policyNumber}`, margin + 12, y + 44);
  doc.text(`Loss Type: ${project.claim.typeOfLoss}`, margin + 12, y + 58);
  doc.text(`Price List: ${project.claim.priceList}`, margin + 12, y + 70);

  // Column 2: Loss Location & Insured
  const col2X = margin + 180;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('INSURED & PROPERTY', col2X, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Insured: ${project.insured.name}`, col2X, y + 30);
  doc.text(`Address: ${project.insured.propertyAddress}`, col2X, y + 44);
  doc.text(`${project.insured.city}, ${project.insured.state} ${project.insured.zip}`, col2X, y + 58);
  doc.text(`Phone: ${project.insured.phone || 'On file'}`, col2X, y + 70);

  // Column 3: Spatial Sketch Parameters
  const col3X = margin + 370;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('SPATIAL PARAMETERS', col3X, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const totalRoofSq = project.roofFacets.reduce((acc, f) => acc + f.surfaceArea, 0) / 100;
  const primaryPitch = project.roofFacets[0]?.pitch || '6/12';
  const totalEave = project.roofFacets.reduce((acc, f) => acc + f.linearEave, 0);
  doc.text(`Roof Pitch: ${primaryPitch}`, col3X, y + 30);
  doc.text(`Roof Area: ${totalRoofSq.toFixed(1)} SQ (${totalRoofSq > 0 ? (totalRoofSq * 100).toFixed(0) : 0} SF)`, col3X, y + 44);
  doc.text(`Linear Eave: ${totalEave} LF`, col3X, y + 58);
  doc.text(`Profile: ${project.claim.profile}`, col3X, y + 70);

  y += 94;

  // 3. Line Items Table Header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ITEMIZED SCOPE OF WORK', margin, y);

  y += 10;

  // Table Columns
  const tableHeaders = [
    { title: '#', x: margin, w: 20 },
    { title: 'CAT/SEL', x: margin + 22, w: 70 },
    { title: 'DESCRIPTION', x: margin + 94, w: 230 },
    { title: 'QTY', x: margin + 326, w: 42, align: 'right' },
    { title: 'UNIT', x: margin + 372, w: 32 },
    { title: 'UNIT PRICE', x: margin + 406, w: 58, align: 'right' },
    { title: 'RCV TOTAL', x: pageWidth - margin, w: 68, align: 'right' },
  ];

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  tableHeaders.forEach((th) => {
    if (th.align === 'right') {
      doc.text(th.title, th.x, y + 13, { align: 'right' });
    } else {
      doc.text(th.title, th.x + 4, y + 13);
    }
  });

  y += 24;

  // Render Table Rows
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  for (let i = 0; i < project.lineItems.length; i++) {
    const item = project.lineItems[i];

    // Page overflow check
    if (y > pageHeight - 90) {
      doc.addPage();
      y = 40;
    }

    // Row zebra background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 8, pageWidth - margin * 2, item.f9Note ? 30 : 18, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.text(String(i + 1), margin + 4, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(`${item.category} ${item.selector}`, margin + 26, y + 4);

    doc.setFont('helvetica', 'normal');
    // Truncate long descriptions
    const desc = item.description.length > 52 ? item.description.slice(0, 50) + '...' : item.description;
    doc.text(desc, margin + 98, y + 4);

    doc.text(item.quantity.toFixed(2), margin + 364, y + 4, { align: 'right' });
    doc.text(item.unit, margin + 376, y + 4);
    doc.text(`$${item.unitPrice.toFixed(2)}`, margin + 460, y + 4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(`$${(item.rcv || item.total).toFixed(2)}`, pageWidth - margin - 4, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // F9 Note rendering
    if (item.f9Note) {
      y += 12;
      doc.setTextColor(220, 38, 38); // Red note marker
      doc.setFont('helvetica', 'bold');
      doc.text('F9 Note: ', margin + 98, y + 4);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      const noteText = item.f9Note.length > 80 ? item.f9Note.slice(0, 78) + '...' : item.f9Note;
      doc.text(noteText, margin + 138, y + 4);
      doc.setFont('helvetica', 'normal');
    }

    y += 18;
  }

  // 4. Financial Recap Summary Box
  if (y > pageHeight - 140) {
    doc.addPage();
    y = 40;
  } else {
    y += 14;
  }

  const recapX = pageWidth - margin - 220;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(recapX, y, 220, 110, 'F');
  doc.rect(recapX, y, 220, 110, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  let rY = y + 14;
  const addRecapLine = (label: string, value: number, isBold = false, isAccent = false) => {
    if (isBold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');

    if (isAccent) doc.setTextColor(220, 38, 38);
    else doc.setTextColor(15, 23, 42);

    doc.text(label, recapX + 10, rY);
    doc.text(`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, recapX + 210, rY, {
      align: 'right',
    });
    rY += 13;
  };

  addRecapLine('Line Item Scope Total:', project.totals.lineItemTotal);
  addRecapLine('Material Sales Tax:', project.totals.taxTotal);
  addRecapLine('Overhead & Profit (10/10):', project.totals.overheadTotal + project.totals.profitTotal);
  addRecapLine('Replacement Cost Value (RCV):', project.totals.rcvTotal, true);
  addRecapLine('Less Depreciation:', -project.totals.depreciationTotal);
  addRecapLine('Actual Cash Value (ACV):', project.totals.acvTotal);
  addRecapLine('Less Deductible:', -project.totals.deductible);
  addRecapLine('Net Claim Settlement:', project.totals.netClaim, true, true);

  // 5. Signature and Certification Block
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Estimator Certification & Scope Acceptance:', margin, y + 20);
  doc.line(margin, y + 60, margin + 220, y + 60);
  doc.text(`${project.estimator.name} · ${project.estimator.company}`, margin, y + 72);
  doc.text('IICRC & Haag Certified Restoration Professional', margin, y + 84);

  // Add footers across all pages
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    addFooter(p, pageCount);
  }

  return doc;
}
