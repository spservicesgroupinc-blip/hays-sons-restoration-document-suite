/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Geometry for the Hays+Sons "Production Checklist" production form.
 *
 * Every coordinate was measured from the printed reference form
 * (`productiontemplate.pdf`, US Letter 612 x 792) and is expressed in PDF points
 * with the ORIGIN AT THE TOP-LEFT, matching the coordinate space the generator
 * draws in. These numbers are not eyeballed: `.verify/compare.py` renders the
 * generated PDF and the reference side by side and reports ink overlap plus
 * per-span position deltas, so any drift is caught numerically.
 *
 * Template anatomy:
 *   - a checkbox gutter on the left, modelled as `CheckboxColumn`s: abutting
 *     boxes whose shared borders are the `edges` list. The "Estimates and
 *     Required Documentation" block prints a heavier (1pt) column than the rest
 *     of the form (0.5pt), and six of the boxes carry a full-width highlight
 *     band instead of side borders — those tops are listed in `open`.
 *   - a second, narrower column of four boxes at x 342.15..365.90 for the
 *     "Copy of / Scope", "Pictures/Matterport", "Two Copies of APPROVED
 *     estimate" and "Building Permit Enclosed?" rows.
 *   - a ruled fill line under every field. In the reference each rule is a
 *     filled rectangle that hangs *below* its `y`, `weight` points deep, which
 *     is why the generator fills rectangles rather than stroking a centred line.
 *   - section banners: a yellow band with a bold dark-red caption
 *     ("IPC Requirements" is printed in red with no band, as in the reference)
 *   - body text is Helvetica-Bold 7pt; the title is Helvetica-Bold 11pt
 */

/** A horizontal rule (a field fill line or a divider). */
export interface FormRule {
  x0: number;
  x1: number;
  /** Top edge of the printed rule, in top-origin points. */
  y: number;
  /** Rule thickness; the reference prints 0.5pt lines unless noted. */
  weight?: number;
}

/** A highlight band. */
export interface FormBand {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color?: [number, number, number];
}

/** One line of caption text. */
export interface FormCaption {
  text: string;
  x: number;
  /** Baseline in top-origin points. */
  baseline: number;
  color?: [number, number, number];
  size?: number;
}

/**
 * Values that may be merged onto the form's fill lines. A row with no `values`
 * prints only its printed content, leaving the line blank - exactly how the
 * reference reads when a detail is not yet captured.
 */
export type ChecklistFieldId =
  | 'jobNumber'
  | 'claimNumber'
  | 'deductibleAmount'
  | 'deductibleCollected'
  | 'deductibleExplanation'
  | 'email'
  | 'phone'
  | 'altPhone'
  | 'xactimateVersion'
  | 'permitAnswer'
  | 'mortgageAuthorization'
  | 'coverageExplanation'
  | 'gcVerification'
  | 'authUploadNote'
  | 'customerLetterNote'
  | 'insuranceCompany'
  | 'agentName'
  | 'agentPhone'
  | 'adjusterName'
  | 'adjusterPhone'
  | 'adjusterEmail'
  | 'dashStatus'
  | 'programClaim'
  | 'checkSent'
  | 'checkToWhom'
  | 'checkPayableTo'
  | 'mortgageOnCheck'
  | 'mortgageCompany'
  | 'depreciationWithheld'
  | 'depreciationAmount'
  | 'contractAmount'
  | 'estimator'
  | 'projectManager'
  | 'startDate'
  | 'finishDate'
  | 'managerInitials'
  | 'pmNotes';

/** A fill-in value merged onto a line. */
export interface FormValueSlot {
  field: ChecklistFieldId;
  /**
   * Left edge at which the merged value starts. When `align` is 'right' this is
   * the RIGHT edge of the run the value is justified against, which is needed
   * wherever the printed caption overhangs its fill line (for example the
   * "Deductible Amount" line, whose caption runs past where the line starts).
   */
  x: number;
  /**
   * Baseline for this slot. Carried per slot rather than per field because a
   * form line can print the same value twice (the deductible amount appears on
   * both the deductible line and the depreciation line) and the two lines sit
   * at different heights.
   */
  baseline: number;
  align?: 'left' | 'right';
  bold?: boolean;
}

/** One row of the form. */
export interface FormRow {
  captions: FormCaption[];
  rules?: FormRule[];
  bands?: FormBand[];
  values?: FormValueSlot[];
}

/** A section banner. */
export interface FormSection {
  caption: FormCaption;
  /** Extra captions printed on the same banner line. */
  extraCaptions?: FormCaption[];
  band?: FormBand;
}

/**
 * A printed column of abutting checkbox boxes.
 *
 * `edges` holds the top edge of every box in page order, so consecutive pairs
 * form one box and the shared border is printed once - which is what stops the
 * borders from doubling up the way overlapping boxes do.
 */
export interface CheckboxColumn {
  /** Outer left and right edges. */
  left: number;
  right: number;
  /** Border thickness of the printed boxes. */
  weight: number;
  /** Box top edges, in page order. */
  edges: number[];
  /**
   * Box tops whose left/right borders the reference does not print, because a
   * full-width highlight band runs through the gutter on those rows.
   */
  open?: number[];
}

/** Page and type constants taken from the reference form. */
export const CHECKLIST_PAGE = {
  width: 612,
  height: 792,
  titleLeft: 236.6,
  titleBaseline: 87.53,
  titleSize: 11,
  /** The heavy rule the reference prints beneath the title. */
  titleRule: { x0: 236.6, x1: 346.65, y: 88.78, weight: 1 },
  bodySize: 7,
  ruleWeight: 0.5,
} as const;

/** RGB colours used by the reference form. */
export const CHECKLIST_COLORS = {
  ink: [0, 0, 0] as [number, number, number],
  sectionRed: [192, 0, 0] as [number, number, number],
  accentRed: [238, 0, 0] as [number, number, number],
  highlight: [255, 255, 0] as [number, number, number],
} as const;

/**
 * The checkbox columns, left gutter first. The four boxes of the right-hand
 * column are printed at the same edge positions as the gutter rows they sit
 * beside, so they share the `edges` values of the "Estimates" block.
 */
export const CHECKLIST_COLUMNS: CheckboxColumn[] = [
  {
    left: 27.75,
    right: 46.53,
    weight: 0.5,
    edges: [111.78, 128.3, 142.3, 159.05, 173.05, 187.05, 201.08],
    open: [142.3],
  },
  {
    left: 27.5,
    right: 46.78,
    weight: 1,
    edges: [215.08, 232.08, 246.58, 263.58, 288.35, 302.85],
  },
  {
    left: 27.75,
    right: 46.53,
    weight: 0.5,
    edges: [
      317.35, 334.1, 350.6, 364.62, 378.62, 392.62, 409.37, 425.87, 440.4, 456.4,
      470.4, 487.15, 501.15, 515.17, 531.67, 545.67, 559.67, 573.67, 592.7, 606.7,
      637.2, 651.2,
    ],
    open: [364.62, 487.15, 606.7],
  },
  {
    left: 342.15,
    right: 365.9,
    weight: 1,
    edges: [215.08, 232.08, 246.58, 263.58, 288.35],
  },
];

/**
 * The small red checkbox the form prints after "complete or signed off on by the
 * GM." In the reference it is an inlined bitmap; the mark is reproduced as the
 * hairline square it renders as, at its measured position and colour (#c00000).
 */
export const CHECKLIST_GM_CHECK = {
  x: 179.99,
  y: 328.21,
  width: 3.5,
  height: 4.25,
  weight: 0.125,
} as const;

/** The five section banners, in page order. */
export const CHECKLIST_SECTIONS: FormSection[] = [
  {
    // Printed in red with no highlight band, exactly as in the reference.
    caption: { text: 'Homeowner Information', x: 33.28, baseline: 110.28, color: CHECKLIST_COLORS.sectionRed },
  },
  {
    caption: { text: 'Estimates and Required Documentation', x: 33.28, baseline: 213.33, color: CHECKLIST_COLORS.sectionRed },
    band: { x0: 28, y0: 201.08, x1: 537.23, y1: 215.08 },
  },
  {
    caption: { text: 'IPC  Requirements', x: 33.28, baseline: 315.85, color: CHECKLIST_COLORS.sectionRed },
  },
  {
    caption: { text: 'Agent/Adjuster Information', x: 33.28, baseline: 377.12, color: CHECKLIST_COLORS.sectionRed },
    extraCaptions: [
      { text: '- If blank or unknown, please capture information!', x: 126.05, baseline: 377.12 },
    ],
    band: { x0: 28, y0: 364.62, x1: 537.23, y1: 378.62 },
  },
  {
    caption: { text: 'Claim/Check Information', x: 33.28, baseline: 499.65, color: CHECKLIST_COLORS.sectionRed },
    band: { x0: 28, y0: 487.15, x1: 594.76, y1: 501.15 },
  },
];

/**
 * Rows in page order. The checkbox columns are supplied separately above, so the
 * rows below carry only field captions, rules and merge slots.
 */
export const CHECKLIST_ROWS: FormRow[] = [
  // ---------------- Homeowner Information ----------------
  {
    captions: [
      { text: 'Job', x: 51.78, baseline: 118.8 },
      { text: 'Number:', x: 51.78, baseline: 126.8 },
    ],
    rules: [{ x0: 149.1, x1: 342.7, y: 111.78 }],
    values: [{ field: 'jobNumber', x: 151.1, baseline: 118.8, bold: true }],
  },
  {
    captions: [
      { text: 'Deductible Amount', x: 51.78, baseline: 140.8 },
      { text: 'Has deductible been collected?', x: 306.38, baseline: 140.8 },
    ],
    rules: [
      { x0: 95.6, x1: 257.6, y: 128.3 },
      { x0: 416.7, x1: 463.45, y: 142.3 },
    ],
    values: [
      { field: 'deductibleAmount', x: 255.6, baseline: 140.8, align: 'right' },
      { field: 'deductibleCollected', x: 461.5, baseline: 140.8, align: 'right' },
    ],
  },
  {
    // The reference prints this caption on two lines.
    captions: [
      { text: 'If no,', x: 51.78, baseline: 149.3 },
      { text: 'explain:', x: 51.78, baseline: 157.3 },
    ],
    rules: [{ x0: 127.8, x1: 257.6, y: 142.3 }],
    bands: [{ x0: 46.28, y0: 142.3, x1: 95.55, y1: 159.05 }],
    values: [{ field: 'deductibleExplanation', x: 129.8, baseline: 149.3 }],
  },
  {
    captions: [{ text: 'Email Address', x: 51.78, baseline: 171.3 }],
    rules: [{ x0: 95.6, x1: 416.67, y: 159.05 }],
    values: [{ field: 'email', x: 414.67, baseline: 171.3, align: 'right' }],
  },
  {
    captions: [{ text: 'Phone Number', x: 51.78, baseline: 185.3 }],
    rules: [{ x0: 127.8, x1: 365.4, y: 173.05 }],
    values: [{ field: 'phone', x: 363.4, baseline: 185.3, align: 'right' }],
  },
  {
    captions: [{ text: 'Alt. Phone Number', x: 51.78, baseline: 199.33 }],
    rules: [{ x0: 127.8, x1: 365.4, y: 187.05 }],
    values: [{ field: 'altPhone', x: 129.8, baseline: 199.33 }],
  },
  {
    // The rule the reference prints across the foot of the Homeowner block.
    captions: [],
    rules: [{ x0: 127.8, x1: 365.4, y: 201.08 }],
  },

  // ---------------- Estimates and Required Documentation ----------------
  {
    captions: [{ text: 'Preliminary Report with Correct Information', x: 51.78, baseline: 230.58 }],
    rules: [{ x0: 132.55, x1: 197.58, y: 231.33, weight: 0.75 }],
  },
  {
    captions: [{ text: 'Repair Authorization/Contract', x: 51.78, baseline: 245.08 }],
  },
  {
    captions: [
      { text: 'Pictures/Matterport in DASH', x: 370.65, baseline: 245.08 },
      { text: 'Copy of', x: 370.65, baseline: 222.58 },
      { text: 'Scope', x: 370.65, baseline: 230.58 },
    ],
  },
  {
    captions: [
      { text: 'Two Copies of APPROVED estimate – INCLUDE', x: 370.65, baseline: 254.08 },
      { text: 'ADJUSTER ESTIMATE, if applicable', x: 370.65, baseline: 261.9 },
    ],
    // The highlight follows the two printed lines, so the second is narrower
    // than the first rather than one tall block.
    bands: [
      { x0: 370.65, y0: 247.58, x1: 529.23, y1: 255.58 },
      { x0: 370.65, y0: 255.58, x1: 490.2, y1: 263.58 },
    ],
  },
  {
    captions: [
      { text: 'Building Permit Enclosed?', x: 370.65, baseline: 278.85, color: CHECKLIST_COLORS.sectionRed },
      { text: 'Signed Mortgage Authorization Required & Enclosed?', x: 51.78, baseline: 286.85 },
      { text: '/ County?', x: 370.65, baseline: 286.85, color: CHECKLIST_COLORS.sectionRed },
      { text: 'Y or ', x: 474.2, baseline: 286.85 },
      { text: 'N ', x: 489.95, baseline: 286.85, color: CHECKLIST_COLORS.accentRed },
      { text: '      /  ', x: 496.95, baseline: 286.85 },
      // The reference prints the version line as underscored text, not a rule.
      { text: 'Xactimate Version? ________x1__________', x: 51.78, baseline: 262.07 },
    ],
    rules: [{ x0: 469, x1: 537.23, y: 288.35 }],
    bands: [
      { x0: 370.65, y0: 272.33, x1: 459.95, y1: 280.35 },
      { x0: 370.65, y0: 280.35, x1: 402.92, y1: 288.35 },
    ],
    values: [
      { field: 'permitAnswer', x: 471, baseline: 286.85 },
      // Starts where the printed underscores start, not on top of the caption.
      { field: 'xactimateVersion', x: 118.7, baseline: 262.07 },
    ],
  },
  {
    captions: [{ text: 'If NO for any item, please explain:', x: 51.78, baseline: 301.35 }],
    rules: [{ x0: 257.6, x1: 537.23, y: 302.85 }],
    bands: [
      { x0: 46.78, y0: 288.35, x1: 257.61, y1: 289.35 },
      { x0: 46.28, y0: 289.35, x1: 257.61, y1: 302.85 },
    ],
    values: [{ field: 'coverageExplanation', x: 259.6, baseline: 301.35 }],
  },

  // ---------------- IPC Requirements ----------------
  {
    // The reference breaks this sentence across two lines and prints a signature
    // run at the end of the first line.
    captions: [
      { text: 'All items on this checklist are complete and verified by the GM. If no, add this checklist to the “Exceptions” folder until', x: 51.78, baseline: 324.35 },
      { text: 'complete or signed off on by the GM.', x: 51.78, baseline: 332.6 },
      { text: '  ______________________', x: 184.33, baseline: 332.6 },
    ],
    bands: [{ x0: 179.08, y0: 326.1, x1: 184.33, y1: 334.1 }],
    values: [{ field: 'gcVerification', x: 188.2, baseline: 332.6 }],
  },
  {
    captions: [{ text: 'Upload Necessary Authorizations to Appropriate Insurance Company –  Upload Repair Auth for all Contractor', x: 51.78, baseline: 341.1 }],
    rules: [{ x0: 51.78, x1: 416.67, y: 341.85, weight: 0.75 }],
    bands: [
      { x0: 51.78, y0: 334.6, x1: 416.67, y1: 342.6 },
      { x0: 51.78, y0: 342.6, x1: 201.58, y1: 350.6 },
    ],
    values: [{ field: 'authUploadNote', x: 414.67, baseline: 341.1, align: 'right' }],
  },
  {
    captions: [
      { text: 'Connection, Innovation Property, and IMACC', x: 51.78, baseline: 349.1 },
      { text: 'New Customer Letter Emailed w/ Link', x: 51.78, baseline: 363.12 },
    ],
    rules: [{ x0: 51.78, x1: 201.58, y: 349.85, weight: 0.75 }],
    values: [{ field: 'customerLetterNote', x: 203.58, baseline: 363.12 }],
  },

  // ---------------- Agent/Adjuster Information ----------------
  {
    captions: [{ text: 'Insurance Company Name', x: 51.78, baseline: 391.12 }],
    rules: [{ x0: 257.6, x1: 468.95, y: 392.62 }],
    values: [{ field: 'insuranceCompany', x: 467, baseline: 391.12, align: 'right' }],
  },
  {
    captions: [
      { text: 'Agent', x: 51.78, baseline: 399.62 },
      { text: 'Name', x: 51.78, baseline: 407.62 },
    ],
    rules: [{ x0: 95.6, x1: 342.65, y: 409.37 }],
    values: [{ field: 'agentName', x: 97.6, baseline: 407.62 }],
  },
  {
    captions: [
      { text: 'Agent Phone', x: 51.78, baseline: 416.37 },
      { text: 'Number', x: 51.78, baseline: 424.37 },
    ],
    rules: [{ x0: 127.8, x1: 416.67, y: 425.87 }],
    values: [{ field: 'agentPhone', x: 414.67, baseline: 424.37, align: 'right' }],
  },
  {
    captions: [{ text: 'Adjuster Name', x: 51.78, baseline: 438.4 }],
    rules: [{ x0: 127.8, x1: 342.65, y: 439.9 }],
    values: [{ field: 'adjusterName', x: 340.65, baseline: 438.4, align: 'right' }],
  },
  {
    captions: [
      { text: 'Adjuster Phone', x: 51.78, baseline: 446.9 },
      { text: 'Number', x: 51.78, baseline: 454.9 },
    ],
    rules: [{ x0: 127.8, x1: 416.67, y: 456.4 }],
    values: [{ field: 'adjusterPhone', x: 414.67, baseline: 454.9, align: 'right' }],
  },
  {
    captions: [
      { text: 'Adjuster Email', x: 51.78, baseline: 468.9 },
      { text: 'Above information is', x: 51.78, baseline: 477.4 },
      { text: 'Listed  in DASH', x: 51.78, baseline: 485.65 },
    ],
    rules: [{ x0: 127.8, x1: 257.6, y: 470.4 }],
    values: [
      { field: 'adjusterEmail', x: 129.8, baseline: 468.9 },
      { field: 'dashStatus', x: 255.6, baseline: 477.4, align: 'right' },
    ],
  },

  // ---------------- Claim/Check Information ----------------
  {
    captions: [
      { text: 'Claim #', x: 51.78, baseline: 513.67 },
      { text: 'Program Claim?', x: 382.65, baseline: 513.67 },
      { text: 'To', x: 382.65, baseline: 522.17 },
      { text: 'whom?', x: 382.65, baseline: 530.17 },
    ],
    rules: [
      { x0: 343.4, x1: 376.9, y: 501.4 },
      { x0: 95.6, x1: 377.4, y: 515.17 },
      { x0: 473.7, x1: 594.76, y: 515.17 },
    ],
    values: [
      { field: 'claimNumber', x: 97.6, baseline: 513.67, bold: true },
      { field: 'programClaim', x: 592.8, baseline: 513.67, align: 'right' },
    ],
  },
  {
    captions: [
      { text: 'Has the check been sent?', x: 51.78, baseline: 530.17 },
      { text: 'Who is the check payable to?', x: 51.78, baseline: 544.17 },
    ],
    rules: [
      { x0: 421.9, x1: 594.76, y: 531.67 },
      { x0: 257.6, x1: 342.65, y: 531.67 },
    ],
    values: [
      { field: 'checkSent', x: 340.65, baseline: 530.17, align: 'right' },
      { field: 'checkToWhom', x: 592.8, baseline: 530.17, align: 'right' },
    ],
  },
  {
    captions: [],
    rules: [{ x0: 257.6, x1: 594.76, y: 545.67 }],
    values: [{ field: 'checkPayableTo', x: 592.8, baseline: 544.17, align: 'right' }],
  },
  {
    captions: [
      { text: 'Mortgage on check?', x: 51.78, baseline: 558.17 },
      { text: 'If yes, name of mortgage co.?', x: 262.85, baseline: 558.17 },
    ],
    rules: [
      { x0: 127.8, x1: 257.6, y: 559.67 },
      { x0: 421.9, x1: 537.23, y: 559.67 },
    ],
    values: [
      { field: 'mortgageOnCheck', x: 255.6, baseline: 558.17, align: 'right' },
      { field: 'mortgageCompany', x: 535.23, baseline: 558.17, align: 'right' },
    ],
  },
  {
    captions: [
      { text: 'Is Depreciation being withheld?', x: 51.78, baseline: 572.17 },
      { text: 'If yes, amount?', x: 370.65, baseline: 572.17 },
    ],
    rules: [
      { x0: 257.6, x1: 342.65, y: 573.67 },
      { x0: 469, x1: 594.76, y: 573.67 },
    ],
    values: [
      { field: 'depreciationWithheld', x: 340.65, baseline: 572.17, align: 'right' },
      { field: 'depreciationAmount', x: 592.8, baseline: 572.17, align: 'right' },
    ],
  },
  {
    captions: [{ text: 'Contract Amount $', x: 51.78, baseline: 591.2 }],
    rules: [{ x0: 127.8, x1: 342.65, y: 592.7 }],
    values: [{ field: 'contractAmount', x: 129.8, baseline: 591.2, bold: true }],
  },
  {
    captions: [{ text: 'Estimator:', x: 51.78, baseline: 605.2 }],
    rules: [{ x0: 95.6, x1: 409.17, y: 606.7 }],
    values: [{ field: 'estimator', x: 97.6, baseline: 605.2 }],
  },

  // ---------------- Project manager footer ----------------
  {
    captions: [{ text: 'Project Manager:', x: 51.78, baseline: 621.7 }],
    rules: [{ x0: 127.8, x1: 416.67, y: 623.2 }],
    values: [{ field: 'projectManager', x: 129.8, baseline: 621.7 }],
  },
  {
    captions: [
      { text: 'Start Date', x: 51.78, baseline: 635.7 },
      { text: 'Finish Date', x: 322.13, baseline: 635.7 },
      { text: 'Manager', x: 427.42, baseline: 635.7 },
    ],
    rules: [
      { x0: 95.6, x1: 257.6, y: 637.2 },
      { x0: 365.4, x1: 421.9, y: 637.2 },
      { x0: 463.45, x1: 537.23, y: 637.2 },
    ],
    values: [
      { field: 'startDate', x: 97.6, baseline: 635.7 },
      { field: 'finishDate', x: 367.4, baseline: 635.7 },
      { field: 'managerInitials', x: 465.45, baseline: 635.7 },
    ],
  },
  {
    captions: [{ text: 'Project Manager Notes:', x: 51.78, baseline: 649.7 }],
    rules: [{ x0: 257.6, x1: 635, y: 651.2 }],
    values: [{ field: 'pmNotes', x: 259.6, baseline: 649.7 }],
  },
  {
    captions: [],
    rules: [{ x0: 37.1, x1: 536.2, y: 670, weight: 0.75 }],
  },
];
