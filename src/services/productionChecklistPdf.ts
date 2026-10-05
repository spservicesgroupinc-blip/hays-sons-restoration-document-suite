/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hays + Sons "Production Checklist" PDF generator.
 *
 * The layout is a 1:1 reproduction of the printed production form held in
 * `productiontemplate.pdf`: same page size, same checkbox columns, same ruled
 * fill lines, same yellow section banners, same type sizes and positions. It is
 * verified against that reference by `.verify/compare.py`, which renders both
 * documents and measures ink overlap plus per-text-span position deltas.
 *
 * The printed form itself stays intact; job data is typed onto the form's fill
 * lines, and any detail the app does not hold is left blank - exactly like a
 * paper form that has not been completed yet.
 */

import { jsPDF } from 'jspdf';
import { EstimateProject } from '../types/xactimate';
import { HAYS_SONS_LOGO_PNG_BASE64 } from '../assets/haysSonsLogo';
import {
  CHECKLIST_COLORS,
  CHECKLIST_COLUMNS,
  CHECKLIST_GM_CHECK,
  CHECKLIST_PAGE,
  CHECKLIST_ROWS,
  CHECKLIST_SECTIONS,
  CheckboxColumn,
  ChecklistFieldId,
  FormBand,
  FormCaption,
  FormRule,
  FormValueSlot,
} from './productionChecklistTemplate';

/** Logo placement measured from the reference form (top-origin points). */
const LOGO = { x: 433, y: 21.6, width: 153, height: 57.4 } as const;

/** Data URL for the inlined brand mark. */
const LOGO_DATA_URL = `data:image/png;base64,${HAYS_SONS_LOGO_PNG_BASE64}`;

/** Printable title, kept as a constant so the form reads identically. */
export const CHECKLIST_TITLE = 'Production Checklist';

/** Values merged onto the form's fill lines. */
export type ProductionChecklistValues = Record<ChecklistFieldId, string>;

const toMoney = (value: number): string =>
  `$${(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * The printed form has a bare "Job Number:" line, so the job number is derived
 * the way the rest of the suite refers to a job: the claim number, with the
 * internal project id appended when it carries extra information.
 */
function composeJobNumber(project: EstimateProject): string {
  const claim = (project.claim.claimNumber || '').trim();
  const projectId = (project.id || '').trim();
  if (claim && projectId && !projectId.includes(claim)) {
    return `${claim}-${projectId.replace(/^PRJ[_-]?/i, '')}`;
  }
  return claim || projectId;
}

/** Every mergeable value the form supports, built from the loaded claim data. */
export function buildChecklistValues(project: EstimateProject): ProductionChecklistValues {
  const deductible = project.totals.deductible;
  const depreciation = project.totals.depreciationTotal;
  const collected = deductible > 0 ? 'Yes' : 'No';

  return {
    jobNumber: composeJobNumber(project),
    claimNumber: project.claim.claimNumber,
    deductibleAmount: toMoney(deductible),
    deductibleCollected: collected,
    deductibleExplanation: '',
    email: project.insured.email,
    phone: project.insured.phone,
    altPhone: '',
    xactimateVersion: project.claim.priceList,
    permitAnswer: '',
    mortgageAuthorization: '',
    coverageExplanation: '',
    gcVerification: '',
    authUploadNote: '',
    customerLetterNote: '',
    // The carrier identity is not modelled separately in the estimate schema;
    // the estimator's company is printed on the authority line instead so the
    // field is never fabricated.
    insuranceCompany: project.estimator.company,
    agentName: '',
    agentPhone: '',
    adjusterName: '',
    adjusterPhone: '',
    adjusterEmail: '',
    dashStatus: '',
    programClaim: '',
    checkSent: '',
    checkToWhom: '',
    checkPayableTo: '',
    mortgageOnCheck: '',
    mortgageCompany: '',
    depreciationWithheld: depreciation > 0 ? 'Yes' : 'No',
    // The "If yes, amount?" line of "Is Depreciation being withheld?".
    depreciationAmount: depreciation > 0 ? toMoney(depreciation) : '',
    contractAmount: toMoney(project.totals.rcvTotal),
    estimator: project.estimator.name,
    projectManager: '',
    startDate: project.claim.dateInspected,
    finishDate: '',
    managerInitials: '',
    pmNotes: '',
  };
}

/** Optional context for the document header. */
export interface ProductionChecklistOptions {
  /** Branch or company caption printed beneath the brand mark. */
  branch?: string;
  /**
   * Print the form without merging any job data. Used by the verification
   * harness to diff the form's printed geometry against the reference; the UI
   * always renders the filled checklist.
   */
  blank?: boolean;
}

/**
 * Render the production checklist into a jsPDF document.
 *
 * jsPDF's `unit: 'pt'` + `format: 'letter'` canvas matches the reference page
 * exactly, and every coordinate in the template module is already top-origin,
 * so the geometry is used verbatim.
 */
export function generateProductionChecklistPdf(
  project: EstimateProject,
  options: ProductionChecklistOptions = {}
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  // Keep geometry at full float precision; jsPDF otherwise rounds every
  // coordinate to two decimals, which nudges rules off the reference.
  (doc.internal as unknown as { floatPrecision: number }).floatPrecision = 16;

  try {
    doc.addImage(LOGO_DATA_URL, 'PNG', LOGO.x, LOGO.y, LOGO.width, LOGO.height);
  } catch {
    // Never fail the document over the brand mark.
    drawLogoFallback(doc);
  }

  if (options.branch && options.branch.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...CHECKLIST_COLORS.ink);
    doc.text(options.branch.trim(), LOGO.x + LOGO.width, LOGO.y + LOGO.height + 6, { align: 'right' });
  }

  // Highlights go down first so every printed rule, caption and merged value
  // sits on top of the yellow the way it does on the reference form.
  for (const section of CHECKLIST_SECTIONS) {
    if (section.band) {
      drawBand(doc, section.band);
    }
  }
  for (const row of CHECKLIST_ROWS) {
    for (const band of row.bands ?? []) {
      drawBand(doc, band);
    }
  }

  for (const column of CHECKLIST_COLUMNS) {
    drawColumn(doc, column);
  }

  drawTitle(doc);
  drawGmCheck(doc);

  for (const section of CHECKLIST_SECTIONS) {
    drawCaption(doc, section.caption);
    for (const extra of section.extraCaptions ?? []) {
      drawCaption(doc, extra);
    }
  }

  const values = buildChecklistValues(project);
  const merge = options.blank ? ({} as Partial<ProductionChecklistValues>) : values;
  for (const row of CHECKLIST_ROWS) {
    for (const rule of row.rules ?? []) {
      drawRule(doc, rule);
    }
    for (const caption of row.captions) {
      drawCaption(doc, caption);
    }
    for (const slot of row.values ?? []) {
      drawValue(doc, slot, merge[slot.field] ?? '');
    }
  }

  return doc;
}

/** Vector H+ mark + wordmark, used only when the logo asset cannot be embedded. */
function drawLogoFallback(doc: jsPDF): void {
  const box = LOGO;
  const barW = box.width * 0.1;
  const barH = box.height * 0.52;
  doc.setFillColor(220, 38, 38);
  doc.rect(box.x, box.y + 2, barW, barH, 'F');
  doc.setFillColor(26, 26, 26);
  doc.rect(box.x + barW, box.y + 2 + barH * 0.33, box.width * 0.2, barH * 0.34, 'F');
  doc.rect(box.x + barW + box.width * 0.1, box.y + 2, barW * 0.72, barH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(15, 23, 42);
  doc.text('Hays+Sons', box.x + box.width * 0.34, box.y + box.height * 0.45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Your Disaster Recovery Professionals', box.x + box.width * 0.34, box.y + box.height * 0.72);
}

/** Title plus the rule the reference prints directly beneath it. */
function drawTitle(doc: jsPDF): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(CHECKLIST_PAGE.titleSize);
  doc.setTextColor(...CHECKLIST_COLORS.ink);
  doc.text(CHECKLIST_TITLE, CHECKLIST_PAGE.titleLeft, CHECKLIST_PAGE.titleBaseline);
  drawRule(doc, CHECKLIST_PAGE.titleRule as FormRule);
}

/**
 * The small red checkbox printed after "complete or signed off on by the GM."
 * The reference inlines it as a bitmap, so it is redrawn as the hairline square
 * it renders as.
 */
function drawGmCheck(doc: jsPDF): void {
  const check = CHECKLIST_GM_CHECK;
  doc.setDrawColor(
    CHECKLIST_COLORS.sectionRed[0],
    CHECKLIST_COLORS.sectionRed[1],
    CHECKLIST_COLORS.sectionRed[2]
  );
  doc.setLineWidth(check.weight);
  doc.rect(check.x, check.y, check.width, check.height, 'S');
}

/**
 * Print one column of abutting checkbox boxes.
 *
 * Every edge in `edges` is a shared border, so it is drawn once; the side
 * borders are then filled between consecutive edges. Boxes listed in `open`
 * carry a highlight band through the gutter instead of sides, exactly as the
 * reference prints them.
 */
function drawColumn(doc: jsPDF, column: CheckboxColumn): void {
  const open = new Set(column.open ?? []);
  doc.setFillColor(CHECKLIST_COLORS.ink[0], CHECKLIST_COLORS.ink[1], CHECKLIST_COLORS.ink[2]);

  for (let i = 0; i < column.edges.length; i++) {
    const top = column.edges[i];
    doc.rect(column.left, top, column.right - column.left, column.weight, 'F');

    const next = column.edges[i + 1];
    if (next === undefined || open.has(top)) continue;
    const height = next - top - column.weight;
    if (height <= 0) continue;
    doc.rect(column.left, top + column.weight, column.weight, height, 'F');
    doc.rect(column.right - column.weight, top + column.weight, column.weight, height, 'F');
  }
}

function drawBand(doc: jsPDF, band: FormBand): void {
  const color = band.color ?? CHECKLIST_COLORS.highlight;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0, 'F');
}

/**
 * Draw a fill line. The reference prints each rule as a filled rectangle that
 * hangs below its `y`, so the rule is filled rather than stroked - a centred
 * stroke would sit half a line width too high.
 */
function drawRule(doc: jsPDF, rule: FormRule): void {
  const weight = rule.weight ?? CHECKLIST_PAGE.ruleWeight;
  doc.setFillColor(CHECKLIST_COLORS.ink[0], CHECKLIST_COLORS.ink[1], CHECKLIST_COLORS.ink[2]);
  doc.rect(rule.x0, rule.y, rule.x1 - rule.x0, weight, 'F');
}

function drawCaption(doc: jsPDF, caption: FormCaption): void {
  const color = caption.color ?? CHECKLIST_COLORS.ink;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(caption.size ?? CHECKLIST_PAGE.bodySize);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(caption.text, caption.x, caption.baseline);
}

/** Draw a merged value on its fill line. */
function drawValue(doc: jsPDF, slot: FormValueSlot, value: string): void {
  if (!value) return;
  doc.setFont('helvetica', slot.bold ? 'bold' : 'normal');
  doc.setFontSize(CHECKLIST_PAGE.bodySize);
  doc.setTextColor(...CHECKLIST_COLORS.ink);
  if (slot.align === 'right') {
    // Justified against the end of the run, so long values grow leftwards and
    // never collide with the printed caption beside them.
    doc.text(value, slot.x, slot.baseline, { align: 'right' });
  } else {
    doc.text(value, slot.x, slot.baseline);
  }
}
