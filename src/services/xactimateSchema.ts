/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EstimateProject,
  EstimateLineItem,
  ClaimInfo,
  InsuredInfo,
  EstimatorInfo,
  RoofFacet,
  RoomGeometry,
  EstimateTotals,
} from '../types/xactimate';

/**
 * Standard Verisk Xactware Category Dictionary
 * Used for validation, trade grouping, and restoration sequencing
 */
export const XACTWARE_CATEGORIES: Record<string, { name: string; trade: string; defaultUnit: string }> = {
  RFG: { name: 'Roofing', trade: 'Envelope & Roofing', defaultUnit: 'SQ' },
  DRY: { name: 'Drywall', trade: 'Drywall & Texture', defaultUnit: 'SF' },
  WTR: { name: 'Water Extraction & Remediation', trade: 'Mitigation & Dryout', defaultUnit: 'EA' },
  PNT: { name: 'Painting', trade: 'Paint & Finishes', defaultUnit: 'SF' },
  DMO: { name: 'Demolition & Debris Removal', trade: 'Emergency Tear-out', defaultUnit: 'EA' },
  CAB: { name: 'Cabinetry', trade: 'Finish Carpentry', defaultUnit: 'LF' },
  FLR: { name: 'Floor Covering', trade: 'Flooring & Tile', defaultUnit: 'SF' },
  TIL: { name: 'Tile & Marble', trade: 'Flooring & Tile', defaultUnit: 'SF' },
  ELE: { name: 'Electrical', trade: 'MEP Systems', defaultUnit: 'EA' },
  PLM: { name: 'Plumbing', trade: 'MEP Systems', defaultUnit: 'EA' },
  HVC: { name: 'Heat, Vent & Air Conditioning', trade: 'MEP Systems', defaultUnit: 'EA' },
  INS: { name: 'Insulation', trade: 'Thermal & Acoustics', defaultUnit: 'SF' },
  SID: { name: 'Siding', trade: 'Envelope & Exterior', defaultUnit: 'SF' },
  SFG: { name: 'Soffit, Fascia & Gutters', trade: 'Envelope & Exterior', defaultUnit: 'LF' },
  WDO: { name: 'Windows & Glazing', trade: 'Envelope & Windows', defaultUnit: 'EA' },
  FNC: { name: 'Finish Carpentry / Trim', trade: 'Finish Carpentry', defaultUnit: 'LF' },
  CLN: { name: 'Cleaning & Decontamination', trade: 'Cleaning & Punchlist', defaultUnit: 'SF' },
  APL: { name: 'Appliances', trade: 'Fixtures & Appliances', defaultUnit: 'EA' },
  FPL: { name: 'Fireplaces', trade: 'Specialty Finishes', defaultUnit: 'EA' },
  MAS: { name: 'Masonry', trade: 'Structural Masonry', defaultUnit: 'SF' },
  PLA: { name: 'Plaster', trade: 'Drywall & Plaster', defaultUnit: 'SF' },
  TMP: { name: 'Temporary Repairs & Board-up', trade: 'Emergency Services', defaultUnit: 'EA' },
  LIT: { name: 'Light Fixtures', trade: 'MEP Systems', defaultUnit: 'EA' },
  GLS: { name: 'Glass & Glazing', trade: 'Envelope & Windows', defaultUnit: 'SF' },
};

/**
 * Escapes characters for strict XML formatting
 */
function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validates a line item against standard Xactware conventions
 */
export function validateLineItem(item: Partial<EstimateLineItem>): {
  status: 'VALID' | 'FLAGGED' | 'WARNING';
  message: string;
} {
  const cat = (item.category || '').toUpperCase().trim();
  const sel = (item.selector || '').trim();

  if (!cat) {
    return {
      status: 'FLAGGED',
      message: 'Missing category code (e.g., RFG, DRY, WTR). Flagged for estimator review.',
    };
  }

  if (!XACTWARE_CATEGORIES[cat]) {
    return {
      status: 'FLAGGED',
      message: `Non-standard category code '${cat}'. Flagged for manual review to prevent XML sequence failure.`,
    };
  }

  if (!sel) {
    return {
      status: 'WARNING',
      message: `Missing selector code for '${cat}'. Standard selector (e.g. 300, 1/2) recommended.`,
    };
  }

  if (item.quantity === undefined || item.quantity <= 0) {
    return {
      status: 'WARNING',
      message: 'Quantity is zero or unspecified. Verify measurement.',
    };
  }

  return { status: 'VALID', message: 'Conforms to Xactware standard taxonomy.' };
}

/**
 * Generates schema-compliant Xactimate project_data.xml
 * Strict tag sequencing:
 * 1. ADMINISTRATIVE_DATA (PROFILE, CLAIM_INFO, INSURED, ESTIMATOR)
 * 2. SKETCH_DATA (ROOF_SKETCH, FLOOR_PLAN)
 * 3. ESTIMATE_SCOPE (LINE_ITEMs + F9_NOTEs)
 * 4. SUMMARY_TOTALS
 * 5. GENERATOR
 */
export function generateProjectDataXml(project: EstimateProject): string {
  const profile = (project.claim.profile || 'CONTRACTOR').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const timestamp = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<XACTDOC format_version="1.0" xmlns="http://www.xactware.com/schema/esx">\n`;

  // 1. ADMINISTRATIVE_DATA
  xml += `  <ADMINISTRATIVE_DATA>\n`;
  xml += `    <PROFILE>${escapeXml(profile || 'CONTRACTOR')}</PROFILE>\n`;
  xml += `    <CLAIM_INFO>\n`;
  xml += `      <CLAIM_NUMBER>${escapeXml(project.claim.claimNumber || 'PENDING')}</CLAIM_NUMBER>\n`;
  xml += `      <POLICY_NUMBER>${escapeXml(project.claim.policyNumber || 'N/A')}</POLICY_NUMBER>\n`;
  if (project.claim.catastropheCode) {
    xml += `      <CAT_CODE>${escapeXml(project.claim.catastropheCode)}</CAT_CODE>\n`;
  }
  xml += `      <LOSS_TYPE>${escapeXml(project.claim.typeOfLoss || 'Property Damage')}</LOSS_TYPE>\n`;
  xml += `      <DATE_OF_LOSS>${escapeXml(project.claim.dateOfLoss || '2026-01-01')}</DATE_OF_LOSS>\n`;
  xml += `      <DATE_INSPECTED>${escapeXml(project.claim.dateInspected || '2026-01-02')}</DATE_INSPECTED>\n`;
  xml += `      <PRICE_LIST>${escapeXml(project.claim.priceList || 'ININ8X_MAR26')}</PRICE_LIST>\n`;
  xml += `      <TAX_RATE>${escapeXml(project.claim.taxRatePercent ?? 7.0)}</TAX_RATE>\n`;
  xml += `      <OVERHEAD_PERCENT>${escapeXml(project.claim.overheadPercent ?? 10.0)}</OVERHEAD_PERCENT>\n`;
  xml += `      <PROFIT_PERCENT>${escapeXml(project.claim.profitPercent ?? 10.0)}</PROFIT_PERCENT>\n`;
  xml += `    </CLAIM_INFO>\n`;

  xml += `    <INSURED>\n`;
  xml += `      <NAME>${escapeXml(project.insured.name || 'Insured Client')}</NAME>\n`;
  xml += `      <ADDRESS>${escapeXml(project.insured.propertyAddress || 'Loss Address')}</ADDRESS>\n`;
  xml += `      <CITY>${escapeXml(project.insured.city || 'Indianapolis')}</CITY>\n`;
  xml += `      <STATE>${escapeXml(project.insured.state || 'IN')}</STATE>\n`;
  xml += `      <ZIP>${escapeXml(project.insured.zip || '46204')}</ZIP>\n`;
  xml += `      <PHONE>${escapeXml(project.insured.phone || '')}</PHONE>\n`;
  xml += `      <EMAIL>${escapeXml(project.insured.email || '')}</EMAIL>\n`;
  xml += `    </INSURED>\n`;

  xml += `    <ESTIMATOR>\n`;
  xml += `      <NAME>${escapeXml(project.estimator.name || 'Hays + Sons Senior Estimator')}</NAME>\n`;
  xml += `      <COMPANY>${escapeXml(project.estimator.company || 'Hays + Sons Complete Restoration')}</COMPANY>\n`;
  xml += `      <PHONE>${escapeXml(project.estimator.phone || '800-429-7766')}</PHONE>\n`;
  xml += `      <EMAIL>${escapeXml(project.estimator.email || 'estimates@haysandsons.com')}</EMAIL>\n`;
  if (project.estimator.licenseNumber) {
    xml += `      <LICENSE>${escapeXml(project.estimator.licenseNumber)}</LICENSE>\n`;
  }
  xml += `    </ESTIMATOR>\n`;
  xml += `  </ADMINISTRATIVE_DATA>\n`;

  // 2. SKETCH_DATA
  xml += `  <SKETCH_DATA>\n`;
  xml += `    <ROOF_SKETCH>\n`;
  for (const facet of project.roofFacets) {
    xml += `      <ROOF_FACET id="${escapeXml(facet.id)}" label="${escapeXml(facet.label)}" pitch="${escapeXml(facet.pitch)}" surface_area="${facet.surfaceArea}" linear_eave="${facet.linearEave}" linear_rake="${facet.linearRake}" linear_ridge="${facet.linearRidge}" linear_valley="${facet.linearValley}" />\n`;
  }
  xml += `    </ROOF_SKETCH>\n`;

  xml += `    <FLOOR_PLAN>\n`;
  for (const room of project.rooms) {
    xml += `      <ROOM id="${escapeXml(room.id)}" name="${escapeXml(room.name)}" length="${room.length}" width="${room.width}" ceiling_height="${room.ceilingHeight}" perimeter="${room.perimeter}" floor_area="${room.floorArea}" wall_area="${room.wallArea}" ceiling_area="${room.ceilingArea}" />\n`;
  }
  xml += `    </FLOOR_PLAN>\n`;
  xml += `  </SKETCH_DATA>\n`;

  // 3. ESTIMATE_SCOPE
  xml += `  <ESTIMATE_SCOPE>\n`;
  for (let i = 0; i < project.lineItems.length; i++) {
    const item = project.lineItems[i];
    const itemNum = i + 1;
    const cat = escapeXml(item.category.toUpperCase());
    const sel = escapeXml(item.selector);
    const act = escapeXml(item.activity || '&');
    const calc = escapeXml(item.calc || item.unit || 'EA');
    const qty = Number(item.quantity || 0).toFixed(2);
    const unit = escapeXml(item.unit || 'EA');
    const unitPrice = Number(item.unitPrice || 0).toFixed(2);
    const rcv = Number(item.rcv || 0).toFixed(2);
    const dep = Number(item.depreciation || 0).toFixed(2);
    const acv = Number(item.acv || 0).toFixed(2);
    const tax = Number(item.tax || 0).toFixed(2);
    const op = Number(item.opAmount || 0).toFixed(2);
    const total = Number(item.total || 0).toFixed(2);
    const facetRef = item.facetRef ? ` facet_ref="${escapeXml(item.facetRef)}"` : '';
    const roomRef = item.roomRef ? ` room_ref="${escapeXml(item.roomRef)}"` : '';

    xml += `    <LINE_ITEM id="${itemNum}" cat="${cat}" sel="${sel}" act="${act}" calc="${calc}" qty="${qty}" unit="${unit}" unit_price="${unitPrice}" rcv="${rcv}" dep="${dep}" acv="${acv}" tax="${tax}" op="${op}" total="${total}"${facetRef}${roomRef}>\n`;
    xml += `      <DESC>${escapeXml(item.description)}</DESC>\n`;
    if (item.f9Note && item.f9Note.trim().length > 0) {
      xml += `      <F9_NOTE>${escapeXml(item.f9Note.trim())}</F9_NOTE>\n`;
    }
    xml += `    </LINE_ITEM>\n`;
  }
  xml += `  </ESTIMATE_SCOPE>\n`;

  // 4. SUMMARY_TOTALS
  xml += `  <SUMMARY_TOTALS>\n`;
  xml += `    <LINE_ITEM_TOTAL>${project.totals.lineItemTotal.toFixed(2)}</LINE_ITEM_TOTAL>\n`;
  xml += `    <TAX_TOTAL>${project.totals.taxTotal.toFixed(2)}</TAX_TOTAL>\n`;
  xml += `    <OVERHEAD_TOTAL>${project.totals.overheadTotal.toFixed(2)}</OVERHEAD_TOTAL>\n`;
  xml += `    <PROFIT_TOTAL>${project.totals.profitTotal.toFixed(2)}</PROFIT_TOTAL>\n`;
  xml += `    <REPLACEMENT_COST_VALUE>${project.totals.rcvTotal.toFixed(2)}</REPLACEMENT_COST_VALUE>\n`;
  xml += `    <DEPRECIATION_TOTAL>${project.totals.depreciationTotal.toFixed(2)}</DEPRECIATION_TOTAL>\n`;
  xml += `    <ACTUAL_CASH_VALUE>${project.totals.acvTotal.toFixed(2)}</ACTUAL_CASH_VALUE>\n`;
  xml += `    <DEDUCTIBLE>${project.totals.deductible.toFixed(2)}</DEDUCTIBLE>\n`;
  xml += `    <NET_CLAIM>${project.totals.netClaim.toFixed(2)}</NET_CLAIM>\n`;
  xml += `  </SUMMARY_TOTALS>\n`;

  // 5. GENERATOR
  xml += `  <GENERATOR>\n`;
  xml += `    <NAME>HaysSons_XactSchedule_Architect</NAME>\n`;
  xml += `    <ENGINE_VERSION>2026.4.1</ENGINE_VERSION>\n`;
  xml += `    <TIMESTAMP>${timestamp}</TIMESTAMP>\n`;
  xml += `    <STANDARDS_PROFILE>Verisk_ESX_v1.0_Compliant</STANDARDS_PROFILE>\n`;
  xml += `  </GENERATOR>\n`;
  xml += `</XACTDOC>\n`;

  return xml;
}

/**
 * Generates manifest.meta for package container
 */
export function generateManifestMeta(project: EstimateProject): string {
  const sanitizedClaim = (project.claim.claimNumber || 'CLM_UNSPECIFIED').replace(/[^A-Za-z0-9]/g, '');
  return `ARCHIVE_TYPE=XACTIMATE_ESX
VERSION=1.0
PROFILE=${(project.claim.profile || 'CONTRACTOR').toUpperCase()}
CLAIM_NUMBER=${sanitizedClaim}
INSURED=${project.insured.name || 'Insured'}
GENERATOR=HaysSons_XactSchedule_Architect
TIMESTAMP=${new Date().toISOString()}
LINE_ITEMS_COUNT=${project.lineItems.length}
RCV_TOTAL=${project.totals.rcvTotal.toFixed(2)}
CHECKSUM=${Math.random().toString(36).substring(2, 10).toUpperCase()}
`;
}

/**
 * Parses XML into EstimateProject structure
 */
export function parseProjectDataXml(xmlString: string): EstimateProject {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML Schema Syntax Error: ${parseError.textContent}`);
  }

  const getText = (selector: string, root: Element | Document = doc): string => {
    const el = root.querySelector(selector);
    return el ? el.textContent || '' : '';
  };

  const profile = getText('ADMINISTRATIVE_DATA PROFILE') || 'CONTRACTOR';
  const claim: ClaimInfo = {
    profile,
    claimNumber: getText('CLAIM_INFO CLAIM_NUMBER') || 'UNSPECIFIED',
    policyNumber: getText('CLAIM_INFO POLICY_NUMBER') || '',
    catastropheCode: getText('CLAIM_INFO CAT_CODE') || undefined,
    typeOfLoss: getText('CLAIM_INFO LOSS_TYPE') || 'Property Damage',
    dateOfLoss: getText('CLAIM_INFO DATE_OF_LOSS') || '2026-01-01',
    dateInspected: getText('CLAIM_INFO DATE_INSPECTED') || '2026-01-02',
    priceList: getText('CLAIM_INFO PRICE_LIST') || 'ININ8X_MAR26',
    taxRatePercent: parseFloat(getText('CLAIM_INFO TAX_RATE')) || 7.0,
    overheadPercent: parseFloat(getText('CLAIM_INFO OVERHEAD_PERCENT')) || 10.0,
    profitPercent: parseFloat(getText('CLAIM_INFO PROFIT_PERCENT')) || 10.0,
  };

  const insured: InsuredInfo = {
    name: getText('INSURED NAME') || 'Insured Client',
    propertyAddress: getText('INSURED ADDRESS') || 'Loss Address',
    city: getText('INSURED CITY') || '',
    state: getText('INSURED STATE') || '',
    zip: getText('INSURED ZIP') || '',
    phone: getText('INSURED PHONE') || '',
    email: getText('INSURED EMAIL') || '',
  };

  const estimator: EstimatorInfo = {
    name: getText('ESTIMATOR NAME') || 'Hays + Sons Senior Estimator',
    company: getText('ESTIMATOR COMPANY') || 'Hays + Sons Complete Restoration',
    phone: getText('ESTIMATOR PHONE') || '800-429-7766',
    email: getText('ESTIMATOR EMAIL') || 'estimates@haysandsons.com',
    licenseNumber: getText('ESTIMATOR LICENSE') || undefined,
  };

  // Roof Facets
  const roofFacets: RoofFacet[] = [];
  const facetNodes = doc.querySelectorAll('ROOF_SKETCH ROOF_FACET');
  facetNodes.forEach((node) => {
    roofFacets.push({
      id: node.getAttribute('id') || `RF${roofFacets.length + 1}`,
      label: node.getAttribute('label') || `Facet ${roofFacets.length + 1}`,
      pitch: node.getAttribute('pitch') || '6/12',
      surfaceArea: parseFloat(node.getAttribute('surface_area') || '0'),
      linearEave: parseFloat(node.getAttribute('linear_eave') || '0'),
      linearRake: parseFloat(node.getAttribute('linear_rake') || '0'),
      linearRidge: parseFloat(node.getAttribute('linear_ridge') || '0'),
      linearValley: parseFloat(node.getAttribute('linear_valley') || '0'),
    });
  });

  // Rooms
  const rooms: RoomGeometry[] = [];
  const roomNodes = doc.querySelectorAll('FLOOR_PLAN ROOM');
  roomNodes.forEach((node) => {
    rooms.push({
      id: node.getAttribute('id') || `RM${rooms.length + 1}`,
      name: node.getAttribute('name') || `Room ${rooms.length + 1}`,
      length: parseFloat(node.getAttribute('length') || '0'),
      width: parseFloat(node.getAttribute('width') || '0'),
      ceilingHeight: parseFloat(node.getAttribute('ceiling_height') || '8'),
      perimeter: parseFloat(node.getAttribute('perimeter') || '0'),
      floorArea: parseFloat(node.getAttribute('floor_area') || '0'),
      wallArea: parseFloat(node.getAttribute('wall_area') || '0'),
      ceilingArea: parseFloat(node.getAttribute('ceiling_area') || '0'),
    });
  });

  // Line Items
  const lineItems: EstimateLineItem[] = [];
  const lineItemNodes = doc.querySelectorAll('ESTIMATE_SCOPE LINE_ITEM');
  lineItemNodes.forEach((node, idx) => {
    const cat = (node.getAttribute('cat') || 'GEN').toUpperCase();
    const sel = node.getAttribute('sel') || '100';
    const desc = getText('DESC', node) || 'Scope Line Item';
    const f9Note = getText('F9_NOTE', node) || undefined;
    const qty = parseFloat(node.getAttribute('qty') || '1');
    const unitPrice = parseFloat(node.getAttribute('unit_price') || '0');
    const rcv = parseFloat(node.getAttribute('rcv') || String(qty * unitPrice));
    const dep = parseFloat(node.getAttribute('dep') || '0');
    const acv = parseFloat(node.getAttribute('acv') || String(rcv - dep));
    const tax = parseFloat(node.getAttribute('tax') || '0');
    const opAmount = parseFloat(node.getAttribute('op') || '0');
    const total = parseFloat(node.getAttribute('total') || String(rcv + tax + opAmount));

    const item: EstimateLineItem = {
      id: node.getAttribute('id') || String(idx + 1),
      category: cat,
      selector: sel,
      description: desc,
      activity: node.getAttribute('act') || '&',
      calc: node.getAttribute('calc') || node.getAttribute('unit') || 'EA',
      quantity: qty,
      unit: node.getAttribute('unit') || 'EA',
      unitPrice,
      rcv,
      depreciation: dep,
      acv,
      tax,
      opAmount,
      total,
      facetRef: node.getAttribute('facet_ref') || undefined,
      roomRef: node.getAttribute('room_ref') || undefined,
      f9Note,
      validationStatus: 'VALID',
      validationMessage: undefined,
    };

    const val = validateLineItem(item);
    item.validationStatus = val.status;
    item.validationMessage = val.message;
    lineItems.push(item);
  });

  // Calculate or read totals
  let lineItemTotal = parseFloat(getText('SUMMARY_TOTALS LINE_ITEM_TOTAL'));
  let taxTotal = parseFloat(getText('SUMMARY_TOTALS TAX_TOTAL'));
  let overheadTotal = parseFloat(getText('SUMMARY_TOTALS OVERHEAD_TOTAL'));
  let profitTotal = parseFloat(getText('SUMMARY_TOTALS PROFIT_TOTAL'));
  let rcvTotal = parseFloat(getText('SUMMARY_TOTALS REPLACEMENT_COST_VALUE'));
  let depreciationTotal = parseFloat(getText('SUMMARY_TOTALS DEPRECIATION_TOTAL'));
  let acvTotal = parseFloat(getText('SUMMARY_TOTALS ACTUAL_CASH_VALUE'));
  let deductible = parseFloat(getText('SUMMARY_TOTALS DEDUCTIBLE')) || 1000.0;
  let netClaim = parseFloat(getText('SUMMARY_TOTALS NET_CLAIM'));

  if (isNaN(lineItemTotal) || lineItemTotal === 0) {
    lineItemTotal = lineItems.reduce((acc, i) => acc + (i.rcv || 0), 0);
    taxTotal = lineItems.reduce((acc, i) => acc + (i.tax || 0), 0);
    overheadTotal = lineItems.reduce((acc, i) => acc + (i.opAmount / 2 || 0), 0);
    profitTotal = lineItems.reduce((acc, i) => acc + (i.opAmount / 2 || 0), 0);
    rcvTotal = lineItemTotal + taxTotal + overheadTotal + profitTotal;
    depreciationTotal = lineItems.reduce((acc, i) => acc + (i.depreciation || 0), 0);
    acvTotal = rcvTotal - depreciationTotal;
    netClaim = Math.max(0, acvTotal - deductible);
  }

  const totals: EstimateTotals = {
    lineItemTotal,
    taxTotal,
    overheadTotal,
    profitTotal,
    rcvTotal,
    depreciationTotal,
    acvTotal,
    deductible,
    netClaim,
  };

  return {
    id: `PRJ_${claim.claimNumber.replace(/[^A-Za-z0-9]/g, '')}_${Date.now()}`,
    claim,
    insured,
    estimator,
    roofFacets,
    rooms,
    lineItems,
    totals,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generator: getText('GENERATOR NAME') || 'HaysSons_XactSchedule_Architect',
    sourceType: 'ESX_EXTRACT',
  };
}

/**
 * Calculates updated totals for an estimate project
 */
export function recalculateTotals(project: EstimateProject): EstimateTotals {
  const lineItemTotal = project.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxRate = (project.claim.taxRatePercent || 7.0) / 100;
  const taxTotal = lineItemTotal * taxRate * 0.45; // estimated material tax fraction
  const overheadRate = (project.claim.overheadPercent || 10.0) / 100;
  const profitRate = (project.claim.profitPercent || 10.0) / 100;
  const overheadTotal = (lineItemTotal + taxTotal) * overheadRate;
  const profitTotal = (lineItemTotal + taxTotal) * profitRate;
  const rcvTotal = lineItemTotal + taxTotal + overheadTotal + profitTotal;
  const depreciationTotal = project.lineItems.reduce((sum, item) => sum + (item.depreciation || 0), 0);
  const acvTotal = rcvTotal - depreciationTotal;
  const deductible = project.totals?.deductible ?? 1000.0;
  const netClaim = Math.max(0, acvTotal - deductible);

  return {
    lineItemTotal,
    taxTotal,
    overheadTotal,
    profitTotal,
    rcvTotal,
    depreciationTotal,
    acvTotal,
    deductible,
    netClaim,
  };
}
