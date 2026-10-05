/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EstimateProject,
  EstimateLineItem,
} from '../types/xactimate';
import {
  generateProjectDataXml,
  generateManifestMeta,
  recalculateTotals,
  XACTWARE_CATEGORIES,
} from '../services/xactimateSchema';
import { compileEsxArchive, downloadEsxFile } from '../services/esxArchive';
import { parseEstimateText, extractTextFromPdfFile } from '../services/pdfEstimateParser';
import { GoogleAppsScriptService } from '../services/googleAppsScriptService';
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface PdfToEsxViewProps {
  project: EstimateProject;
  onProjectChange: (project: EstimateProject) => void;
  onNavigateToSchedule: () => void;
}

export const PdfToEsxView: React.FC<PdfToEsxViewProps> = ({
  project,
  onProjectChange,
  onNavigateToSchedule,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'scope' | 'spatial' | 'admin' | 'xml'>('scope');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileSuccess, setCompileSuccess] = useState<string | null>(null);
  const [copiedXml, setCopiedXml] = useState(false);
  const [rawTextModal, setRawTextModal] = useState(false);
  const [rawTextContent, setRawTextContent] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);

  // XML string for live preview
  const projectXml = generateProjectDataXml(project);
  const manifestMeta = generateManifestMeta(project);

  // Validation summary
  const flaggedItems = project.lineItems.filter((i) => i.validationStatus === 'FLAGGED');
  const warningItems = project.lineItems.filter((i) => i.validationStatus === 'WARNING');
  const isValid = flaggedItems.length === 0;

  // File drop handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPdfFile(file);
      } else {
        text = await file.text();
      }
      const newProj = parseEstimateText(text, file.name);
      onProjectChange(newProj);
      GoogleAppsScriptService.addAuditLog({
        action: 'IMPORT',
        description: `Ingested PDF estimate: ${file.name}`,
        details: `Identified Claim ${newProj.claim.claimNumber} with ${newProj.lineItems.length} line items.`,
        status: 'SUCCESS',
      });
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Compile ESX container
  const handleCompileEsx = async () => {
    setIsCompiling(true);
    setCompileSuccess(null);
    try {
      const { blob, filename } = await compileEsxArchive(project);
      downloadEsxFile(blob, filename);

      // Save to Google Apps Script database
      await GoogleAppsScriptService.saveProjectRecord(project, 'ESX_COMPILED');

      setCompileSuccess(`Successfully compiled and downloaded ${filename}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Compilation failed: ${message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // Quick preset loader
  const handleLoadPreset = (type: 'ROOF' | 'WATER') => {
    const sampleText =
      type === 'ROOF'
        ? `HAYS + SONS RESTORATION ESTIMATE
Claim #: CLM-88901
Policy #: HO-982410-IN
Date of Loss: 2026-02-14
Date Inspected: 2026-02-16
Profile: CONTRACTOR
Insured: David & Sarah Montgomery
Property Address: 4820 Meridian Hills Blvd, Indianapolis, IN 46228
Estimator: James Callahan
Price List: ININ8X_MAR26

Roof - Main Slope South (Pitch 6/12)
1. RFG 300 28.50 SQ 288.65 8226.53 30 yr. - lam. - comp. shingle rfg. - w/out felt
Note: Hail strike density exceeds 12 hits per 100 sq ft test square. Complete slope replacement warranted.
2. RFG FELT15 28.50 SQ 38.20 1088.70 Roofing felt - 15 lb. synthetic underlayment
3. RFG IWS 5.00 SQ 94.50 472.50 Ice & water barrier / self-adhering membrane
Note: Required by Indiana Residential Code R905.1.2 at all eaves and valleys.
4. SFG GUT 142.00 LF 12.80 1817.60 Gutter / downspout - aluminum - 5"
Note: Impact denting along south eave run.
5. DMO RFG 28.50 SQ 58.00 1653.00 Tear off, haul and dispose of comp shingles`
        : `HAYS + SONS RESTORATION ESTIMATE
Claim #: CLM-88902
Policy #: POL-WTR-44019
Date of Loss: 2026-02-20
Date Inspected: 2026-02-21
Profile: CONTRACTOR
Insured: Katherine Sullivan
Property Address: 11200 Lake Shore Dr E, Carmel, IN 46033
Estimator: Sarah Higgins
Price List: ININ8X_MAR26

Living Room
1. WTR EXT 520.00 SF 0.92 478.40 Water extraction from hard surface floor
Note: Standing water identified post second-floor supply line rupture.
2. WTR DRY 4.00 EA 145.00 580.00 Dehumidifier (per 24 hour period) - Extra Large LGR
Note: 4-day structural drying chamber cycle monitored with psychrometric logs.
3. DRY 1/2 310.00 SF 2.85 883.50 1/2" drywall - hung, taped, floated, ready for paint
Note: IICRC S500 standard requiring flood cut 12" above wicking boundary.
4. PNT 2C 640.00 SF 0.98 627.20 Paint the surface - two coats (walls and trim)
5. CLN DUST 520.00 SF 0.35 182.00 Post-remediation HEPA vacuuming & cleaning`;

    const newProj = parseEstimateText(sampleText, `${type}_SAMPLE_ESTIMATE.txt`);
    onProjectChange(newProj);
  };

  // Add line item
  const handleAddLineItem = () => {
    const newItem: EstimateLineItem = {
      id: String(project.lineItems.length + 1),
      category: 'RFG',
      selector: '300',
      description: '30 yr. - lam. - comp. shingle rfg. - w/out felt',
      activity: '&',
      calc: 'SQ',
      quantity: 10.0,
      unit: 'SQ',
      unitPrice: 285.0,
      rcv: 2850.0,
      depreciation: 0,
      acv: 2850.0,
      tax: 99.75,
      opAmount: 570.0,
      total: 3519.75,
      facetRef: 'RF1',
      validationStatus: 'VALID',
    };
    const updated = {
      ...project,
      lineItems: [...project.lineItems, newItem],
    };
    updated.totals = recalculateTotals(updated);
    onProjectChange(updated);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    const items = [...project.lineItems];
    items.splice(index, 1);
    const updated = { ...project, lineItems: items };
    updated.totals = recalculateTotals(updated);
    onProjectChange(updated);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof EstimateLineItem, value: any) => {
    const items = [...project.lineItems];
    const item = { ...items[index], [field]: value };

    // Recalculate item RCV and Total if qty or unit price change
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const p = field === 'unitPrice' ? parseFloat(value) || 0 : item.unitPrice;
      item.rcv = q * p;
      item.acv = item.rcv - (item.depreciation || 0);
      item.tax = item.rcv * 0.035;
      item.opAmount = item.rcv * 0.2;
      item.total = item.rcv + item.tax + item.opAmount;
    }

    // Category validation
    if (field === 'category') {
      const cat = String(value).toUpperCase();
      item.category = cat;
      item.validationStatus = XACTWARE_CATEGORIES[cat] ? 'VALID' : 'FLAGGED';
      item.validationMessage = XACTWARE_CATEGORIES[cat]
        ? undefined
        : `Unrecognized category '${cat}'. Flagged for review.`;
    }

    items[index] = item;
    const updated = { ...project, lineItems: items };
    updated.totals = recalculateTotals(updated);
    onProjectChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Ingestion Control */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Workflow 1</span>
              <span aria-hidden="true">·</span>
              <span>PDF Ingestion</span>
              <span aria-hidden="true">·</span>
              <span>PKZIP Serialization</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              PDF Estimate to Xactimate ESX Pipeline
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Extract itemized scope lines, isolate room geometries, bind F9 explanatory notes, and
              compile a strict XSD-compliant <code className="text-red-700 bg-red-50 px-1 py-0.5 rounded text-xs font-mono">.esx</code> container for Verisk Xactimate ingestion.
            </p>
          </div>

          {/* Quick Presets & Upload Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleLoadPreset('ROOF')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer"
            >
              Load Hail & Roof Scope
            </button>
            <button
              onClick={() => handleLoadPreset('WATER')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer"
            >
              Load Water Mitigation Scope
            </button>
            <button
              onClick={() => setRawTextModal(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-300 transition cursor-pointer"
            >
              Paste Estimate Text
            </button>
          </div>
        </div>

        {/* Upload Drop Zone */}
        <div className="mt-5 border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50 rounded-lg p-5 text-center transition">
          <input
            type="file"
            id="estimate-pdf-input"
            accept=".pdf,.txt,.doc"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="estimate-pdf-input"
            className="cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <Upload className={`w-8 h-8 ${isParsingFile ? 'text-red-600 animate-bounce' : 'text-slate-400'}`} />
            <div className="text-sm font-semibold text-slate-800">
              {isParsingFile ? 'Extracting administrative tags and line items...' : 'Upload Static PDF Estimate or Inspection Report'}
            </div>
            <p className="text-xs text-slate-500">
              Parses claim numbers, insured metadata, category/selector codes, quantities, and F9 notes automatically.
            </p>
          </label>
        </div>

        {/* Compile Status Feedback */}
        {compileSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{compileSuccess}</span>
            </div>
            <button
              onClick={onNavigateToSchedule}
              className="font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View XactSchedule Gantt</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Workbench Card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Sub-navigation tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-slate-50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('scope')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeSubTab === 'scope'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Itemized Scope ({project.lineItems.length})
            </button>
            <button
              onClick={() => setActiveSubTab('spatial')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeSubTab === 'spatial'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spatial Sketch Geometry
            </button>
            <button
              onClick={() => setActiveSubTab('admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeSubTab === 'admin'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Claim & Policy Context
            </button>
            <button
              onClick={() => setActiveSubTab('xml')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeSubTab === 'xml'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Schema XML
            </button>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-3">
            {/* Validation badge */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {isValid ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Schema Verified</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700" title={`${flaggedItems.length} items flagged`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{flaggedItems.length} Unmapped Code(s)</span>
                </span>
              )}
            </div>

            {/* Compile Button */}
            <button
              onClick={handleCompileEsx}
              disabled={isCompiling}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isCompiling ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Compile & Download .esx Container</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Scope Line Items Table */}
        {activeSubTab === 'scope' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Itemized Scope Line Items
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category and selector codes mapped to standard Verisk pricing catalogs with F9 note bindings.
                </p>
              </div>

              <button
                onClick={handleAddLineItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Scope Item</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 w-20">CAT</th>
                    <th className="py-2.5 px-3 w-24">SEL</th>
                    <th className="py-2.5 px-3">Description & F9 Explanatory Note</th>
                    <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                    <th className="py-2.5 px-3 w-16">Unit</th>
                    <th className="py-2.5 px-3 w-24 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 w-28 text-right">RCV Total</th>
                    <th className="py-2.5 px-3 w-24">Binding</th>
                    <th className="py-2.5 px-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.lineItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition group">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                          className="w-16 font-mono font-semibold uppercase px-1.5 py-0.5 border border-slate-200 rounded text-slate-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.selector}
                          onChange={(e) => handleUpdateItem(idx, 'selector', e.target.value)}
                          className="w-20 font-mono px-1.5 py-0.5 border border-slate-200 rounded text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 space-y-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className="w-full px-1.5 py-0.5 border border-slate-200 rounded text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider shrink-0">F9:</span>
                          <input
                            type="text"
                            value={item.f9Note || ''}
                            placeholder="Add adjuster justification / code requirement note..."
                            onChange={(e) => handleUpdateItem(idx, 'f9Note', e.target.value)}
                            className="w-full text-[11px] text-slate-600 italic px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-red-500"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                          className="w-18 text-right font-mono tabular-nums px-1.5 py-0.5 border border-slate-200 rounded focus:border-red-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                          className="w-12 font-mono uppercase px-1.5 py-0.5 border border-slate-200 rounded"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                          className="w-20 text-right font-mono tabular-nums px-1.5 py-0.5 border border-slate-200 rounded focus:border-red-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        ${(item.rcv || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {item.facetRef ? `Roof ${item.facetRef}` : item.roomRef ? `Room ${item.roomRef}` : 'General'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Strip */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
                <div>
                  <span className="text-slate-500 block">Line Items Total:</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    ${project.totals.lineItemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Material Sales Tax:</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    ${project.totals.taxTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Overhead & Profit (10/10):</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    ${(project.totals.overheadTotal + project.totals.profitTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Replacement Cost (RCV):</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-red-600">
                    ${project.totals.rcvTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Target Profile:</span>
                <select
                  value={project.claim.profile}
                  onChange={(e) => {
                    const updated = {
                      ...project,
                      claim: { ...project.claim, profile: e.target.value },
                    };
                    onProjectChange(updated);
                  }}
                  className="text-xs font-semibold font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:border-red-500"
                >
                  <option value="CONTRACTOR">CONTRACTOR (Default)</option>
                  <option value="STATE_FARM">STATE_FARM</option>
                  <option value="ALLSTATE">ALLSTATE</option>
                  <option value="LIBERTY_MUTUAL">LIBERTY_MUTUAL</option>
                  <option value="TRAVELERS">TRAVELERS</option>
                  <option value="USAA">USAA</option>
                  <option value="FARMERS">FARMERS</option>
                  <option value="CHUBB">CHUBB</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Spatial Sketch Geometry */}
        {activeSubTab === 'spatial' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Spatial Sketch Geometry Parameters
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Roof facets and interior room boundaries bound to scope calculation variables.
              </p>
            </div>

            {/* Roof Facets */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-semibold text-xs text-slate-800">
                Roof Facet Geometry
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.roofFacets.map((facet, fIdx) => (
                  <div key={facet.id} className="p-4 border border-slate-200 rounded-lg bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-xs">
                        {facet.label} ({facet.id})
                      </span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                        Pitch: {facet.pitch}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Surface Area:</span>
                        <input
                          type="number"
                          value={facet.surfaceArea}
                          onChange={(e) => {
                            const facets = [...project.roofFacets];
                            facets[fIdx].surfaceArea = parseFloat(e.target.value) || 0;
                            onProjectChange({ ...project, roofFacets: facets });
                          }}
                          className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono tabular-nums text-xs"
                        />
                        <span className="text-[10px] text-slate-400">
                          = {(facet.surfaceArea / 100).toFixed(2)} SQ
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Linear Eave (LF):</span>
                        <input
                          type="number"
                          value={facet.linearEave}
                          onChange={(e) => {
                            const facets = [...project.roofFacets];
                            facets[fIdx].linearEave = parseFloat(e.target.value) || 0;
                            onProjectChange({ ...project, roofFacets: facets });
                          }}
                          className="w-full mt-1 px-2 py-1 border border-slate-200 rounded font-mono tabular-nums text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Geometry */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-semibold text-xs text-slate-800">
                Floor Plan / Room Dimensions
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.rooms.map((room, rIdx) => (
                  <div key={room.id} className="p-4 border border-slate-200 rounded-lg bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-xs">
                        {room.name} ({room.id})
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {room.length}&apos; × {room.width}&apos; × {room.ceilingHeight}&apos;
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Floor Area:</span>
                        <span className="font-mono font-semibold tabular-nums text-slate-800">
                          {room.floorArea} SF
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Wall Area:</span>
                        <span className="font-mono font-semibold tabular-nums text-slate-800">
                          {room.wallArea} SF
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Perimeter:</span>
                        <span className="font-mono font-semibold tabular-nums text-slate-800">
                          {room.perimeter} LF
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Claim & Policy Context */}
        {activeSubTab === 'admin' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Administrative & Policy Context
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Carrier identifiers, claim credentials, and loss dates serialized into the &lt;ADMINISTRATIVE_DATA&gt; branch.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4 p-5 border border-slate-200 rounded-lg bg-slate-50">
                <h4 className="font-bold text-slate-900">Claim Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Claim Number:</label>
                    <input
                      type="text"
                      value={project.claim.claimNumber}
                      onChange={(e) => {
                        const updated = {
                          ...project,
                          claim: { ...project.claim, claimNumber: e.target.value },
                        };
                        onProjectChange(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Policy Number:</label>
                    <input
                      type="text"
                      value={project.claim.policyNumber}
                      onChange={(e) => {
                        const updated = {
                          ...project,
                          claim: { ...project.claim, policyNumber: e.target.value },
                        };
                        onProjectChange(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Type of Loss:</label>
                    <input
                      type="text"
                      value={project.claim.typeOfLoss}
                      onChange={(e) => {
                        const updated = {
                          ...project,
                          claim: { ...project.claim, typeOfLoss: e.target.value },
                        };
                        onProjectChange(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Price List:</label>
                    <input
                      type="text"
                      value={project.claim.priceList}
                      onChange={(e) => {
                        const updated = {
                          ...project,
                          claim: { ...project.claim, priceList: e.target.value },
                        };
                        onProjectChange(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5 border border-slate-200 rounded-lg bg-slate-50">
                <h4 className="font-bold text-slate-900">Insured Policyholder</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Insured Full Name:</label>
                    <input
                      type="text"
                      value={project.insured.name}
                      onChange={(e) => {
                        const updated = {
                          ...project,
                          insured: { ...project.insured, name: e.target.value },
                        };
                        onProjectChange(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Loss Property Address:</label>
                    <input
                      type="text"
                      value={project.insured.propertyAddress}
                      onChange={(e) => {
                        const updated = {
                          ...project,
                          insured: { ...project.insured, propertyAddress: e.target.value },
                        };
                        onProjectChange(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-600 block mb-1">City:</label>
                      <input
                        type="text"
                        value={project.insured.city}
                        onChange={(e) => {
                          const updated = {
                            ...project,
                            insured: { ...project.insured, city: e.target.value },
                          };
                          onProjectChange(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1">State:</label>
                      <input
                        type="text"
                        value={project.insured.state}
                        onChange={(e) => {
                          const updated = {
                            ...project,
                            insured: { ...project.insured, state: e.target.value },
                          };
                          onProjectChange(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1">Zip:</label>
                      <input
                        type="text"
                        value={project.insured.zip}
                        onChange={(e) => {
                          const updated = {
                            ...project,
                            insured: { ...project.insured, zip: e.target.value },
                          };
                          onProjectChange(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Live Schema XML Preview */}
        {activeSubTab === 'xml' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Container Schema Serialization (project_data.xml)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-compiled XML payload ready for PKZIP packaging into .esx archive.
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(projectXml);
                  setCopiedXml(true);
                  setTimeout(() => setCopiedXml(false), 2000);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer"
              >
                {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedXml ? 'Copied XML' : 'Copy XML'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-200 text-xs font-mono rounded-lg overflow-x-auto max-h-96 leading-relaxed">
              {projectXml}
            </pre>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-700 block mb-2">manifest.meta:</span>
              <pre className="p-3 bg-slate-100 text-slate-800 text-xs font-mono rounded-md">
                {manifestMeta}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Raw Text Input Modal */}
      {rawTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Paste Raw Estimate Text</h3>
              <button
                onClick={() => setRawTextModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Paste copied text from a PDF estimate, email, or OCR scan. The parser will detect claim metadata, room groupings, line items, and F9 notes.
            </p>
            <textarea
              rows={10}
              value={rawTextContent}
              onChange={(e) => setRawTextContent(e.target.value)}
              placeholder="Paste estimate lines (e.g. Claim #: CLM-12345, RFG 300 24.50 SQ 285.40 ...)"
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRawTextModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rawTextContent.trim()) {
                    const parsed = parseEstimateText(rawTextContent, 'PASTED_TEXT.txt');
                    onProjectChange(parsed);
                    setRawTextModal(false);
                    setRawTextContent('');
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition"
              >
                Ingest & Parse Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
