/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { PdfToEsxView } from './components/PdfToEsxView';
import { EsxToPdfView } from './components/EsxToPdfView';
import { GanttScheduleView } from './components/GanttScheduleView';
import { AppsScriptDatabaseView } from './components/AppsScriptDatabaseView';
import { PythonPipelineView } from './components/PythonPipelineView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EstimateProject } from './types/xactimate';
import { recalculateTotals } from './services/xactimateSchema';

// Initial production-grounded restoration project
export const INITIAL_PROJECT: EstimateProject = {
  id: 'PRJ_CLM88901_2026',
  claim: {
    profile: 'CONTRACTOR',
    claimNumber: 'CLM88901',
    policyNumber: 'HO-982410-IN',
    catastropheCode: 'CAT-26H-IN',
    typeOfLoss: 'Wind / Hail Damage',
    dateOfLoss: '2026-02-14',
    dateInspected: '2026-02-16',
    priceList: 'ININ8X_MAR26',
    taxRatePercent: 7.0,
    overheadPercent: 10.0,
    profitPercent: 10.0,
  },
  insured: {
    name: 'David & Sarah Montgomery',
    propertyAddress: '4820 Meridian Hills Blvd',
    city: 'Indianapolis',
    state: 'IN',
    zip: '46228',
    phone: '(317) 555-0149',
    email: 'd.montgomery@comcast.net',
  },
  estimator: {
    name: 'James Callahan',
    company: 'Hays + Sons Complete Restoration',
    phone: '800-429-7766',
    email: 'jcallahan@haysandsons.com',
    licenseNumber: 'IN-EST-88419',
  },
  roofFacets: [
    {
      id: 'RF1',
      label: 'Main Roof Slope South',
      pitch: '6/12',
      surfaceArea: 1850,
      linearEave: 94,
      linearRake: 42,
      linearRidge: 46,
      linearValley: 24,
    },
    {
      id: 'RF2',
      label: 'Main Roof Slope North',
      pitch: '6/12',
      surfaceArea: 1620,
      linearEave: 88,
      linearRake: 38,
      linearRidge: 46,
      linearValley: 0,
    },
  ],
  rooms: [
    {
      id: 'RM1',
      name: 'Living Room',
      length: 19.5,
      width: 15.0,
      ceilingHeight: 9.0,
      perimeter: 69.0,
      floorArea: 292.5,
      wallArea: 621.0,
      ceilingArea: 292.5,
    },
    {
      id: 'RM2',
      name: 'Kitchen / Dining',
      length: 16.0,
      width: 14.0,
      ceilingHeight: 9.0,
      perimeter: 60.0,
      floorArea: 224.0,
      wallArea: 540.0,
      ceilingArea: 224.0,
    },
  ],
  lineItems: [
    {
      id: '1',
      category: 'RFG',
      selector: '300',
      description: '30 yr. - lam. - comp. shingle rfg. - w/out felt',
      activity: '&',
      calc: 'SQ',
      quantity: 34.7,
      unit: 'SQ',
      unitPrice: 288.65,
      rcv: 10016.16,
      depreciation: 0,
      acv: 10016.16,
      tax: 350.57,
      opAmount: 2003.23,
      total: 12369.96,
      facetRef: 'RF1',
      f9Note: 'Hail strike density exceeds 12 hits per 100 sq ft test square. Complete slope replacement warranted.',
      validationStatus: 'VALID',
    },
    {
      id: '2',
      category: 'RFG',
      selector: 'FELT15',
      description: 'Roofing felt - 15 lb. synthetic underlayment',
      activity: '+',
      calc: 'SQ',
      quantity: 34.7,
      unit: 'SQ',
      unitPrice: 38.2,
      rcv: 1325.54,
      depreciation: 0,
      acv: 1325.54,
      tax: 46.39,
      opAmount: 265.11,
      total: 1637.04,
      facetRef: 'RF1',
      validationStatus: 'VALID',
    },
    {
      id: '3',
      category: 'RFG',
      selector: 'IWS',
      description: 'Ice & water barrier / self-adhering membrane',
      activity: '+',
      calc: 'SQ',
      quantity: 6.0,
      unit: 'SQ',
      unitPrice: 94.5,
      rcv: 567.0,
      depreciation: 0,
      acv: 567.0,
      tax: 19.85,
      opAmount: 113.4,
      total: 700.25,
      facetRef: 'RF1',
      f9Note: 'Required by Indiana Residential Code R905.1.2 at all eaves and valleys.',
      validationStatus: 'VALID',
    },
    {
      id: '4',
      category: 'SFG',
      selector: 'GUT',
      description: 'Gutter / downspout - aluminum - 5"',
      activity: '&',
      calc: 'LF',
      quantity: 182.0,
      unit: 'LF',
      unitPrice: 12.8,
      rcv: 2329.6,
      depreciation: 0,
      acv: 2329.6,
      tax: 81.54,
      opAmount: 465.92,
      total: 2877.06,
      facetRef: 'RF1',
      f9Note: 'Impact denting along front eave run.',
      validationStatus: 'VALID',
    },
    {
      id: '5',
      category: 'DMO',
      selector: 'RFG',
      description: 'Tear off, haul and dispose of comp shingles',
      activity: '-',
      calc: 'SQ',
      quantity: 34.7,
      unit: 'SQ',
      unitPrice: 58.0,
      rcv: 2012.6,
      depreciation: 0,
      acv: 2012.6,
      tax: 0,
      opAmount: 402.52,
      total: 2415.12,
      facetRef: 'RF1',
      validationStatus: 'VALID',
    },
  ],
  totals: {
    lineItemTotal: 16250.9,
    taxTotal: 498.35,
    overheadTotal: 1674.93,
    profitTotal: 1674.93,
    rcvTotal: 20099.11,
    depreciationTotal: 0,
    acvTotal: 20099.11,
    deductible: 1000.0,
    netClaim: 19099.11,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  generator: 'HaysSons_XactSchedule_Architect',
  sourceType: 'PDF_IMPORT',
  originalFileName: 'MONTGOMERY_HAIL_ESTIMATE_2026.pdf',
};

// Calculate initial totals
INITIAL_PROJECT.totals = recalculateTotals(INITIAL_PROJECT);

/**
 * Allow a tab to be opened directly with `?tab=esx2pdf`, so a screen can be
 * linked to (and smoke-tested) without clicking through the app first.
 */
const TAB_IDS: ActiveTab[] = ['pdf2esx', 'esx2pdf', 'schedule', 'database', 'python'];

function initialTabFromUrl(): ActiveTab {
  if (typeof window === 'undefined') return 'pdf2esx';
  const requested = new URLSearchParams(window.location.search).get('tab');
  return TAB_IDS.includes(requested as ActiveTab) ? (requested as ActiveTab) : 'pdf2esx';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => initialTabFromUrl());
  const [project, setProject] = useState<EstimateProject>(INITIAL_PROJECT);
  const [hasAppsScriptUrl, setHasAppsScriptUrl] = useState(false);

  useEffect(() => {
    const url = localStorage.getItem('hays_sons_appscript_url');
    setHasAppsScriptUrl(Boolean(url && url.trim().length > 0));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-red-600 selection:text-white">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeProfile={project.claim.profile}
        hasAppsScriptUrl={hasAppsScriptUrl}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'pdf2esx' && (
          <PdfToEsxView
            project={project}
            onProjectChange={setProject}
            onNavigateToSchedule={() => setActiveTab('schedule')}
          />
        )}

        {activeTab === 'esx2pdf' && (
          <EsxToPdfView
            project={project}
            onProjectChange={setProject}
            onNavigateToSchedule={() => setActiveTab('schedule')}
          />
        )}

        {activeTab === 'schedule' && (
          <GanttScheduleView project={project} />
        )}

        {activeTab === 'database' && (
          <AppsScriptDatabaseView />
        )}

        {activeTab === 'python' && (
          <PythonPipelineView />
        )}
      </main>

      {/* Quiet Professional Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Hays+Sons</span>
            <span aria-hidden="true">·</span>
            <span>Restoration Document Suite</span>
            <span aria-hidden="true">·</span>
            <span>Verisk Xactimate ESX Engine</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Google Apps Script Database Sync</span>
            <span aria-hidden="true">·</span>
            <span>IICRC & Haag Aligned</span>
            <span aria-hidden="true">·</span>
            <span>All Rights Reserved</span>
          </div>
        </div>
      </footer>

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
