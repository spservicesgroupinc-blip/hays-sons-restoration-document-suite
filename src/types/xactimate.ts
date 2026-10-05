/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClaimInfo {
  profile: string; // e.g. "CONTRACTOR"
  claimNumber: string;
  policyNumber: string;
  catastropheCode?: string;
  typeOfLoss: string;
  dateOfLoss: string;
  dateInspected: string;
  priceList: string;
  taxRatePercent: number; // e.g. 7.0
  overheadPercent: number; // e.g. 10.0
  profitPercent: number; // e.g. 10.0
}

export interface InsuredInfo {
  name: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

export interface EstimatorInfo {
  name: string;
  company: string;
  phone: string;
  email: string;
  licenseNumber?: string;
}

export interface RoofFacet {
  id: string; // e.g. "RF1"
  label: string;
  pitch: string; // e.g. "6/12"
  surfaceArea: number; // SQ FT
  linearEave: number; // LF
  linearRake: number; // LF
  linearRidge: number; // LF
  linearValley: number; // LF
}

export interface RoomGeometry {
  id: string; // e.g. "RM1"
  name: string;
  length: number;
  width: number;
  ceilingHeight: number;
  perimeter: number;
  floorArea: number;
  wallArea: number;
  ceilingArea: number;
}

export interface EstimateLineItem {
  id: string;
  category: string; // e.g. "RFG"
  selector: string; // e.g. "300"
  description: string;
  activity: string; // "+", "-", "&", "R"
  calc: string; // e.g. "SQ", "SF", "LF", "EA"
  quantity: number;
  unit: string; // "SQ", "SF", "LF", "EA", "HR"
  unitPrice: number;
  rcv: number;
  depreciation: number;
  acv: number;
  tax: number;
  opAmount: number;
  total: number;
  facetRef?: string;
  roomRef?: string;
  f9Note?: string;
  validationStatus: 'VALID' | 'FLAGGED' | 'WARNING';
  validationMessage?: string;
}

export interface EstimateTotals {
  lineItemTotal: number;
  taxTotal: number;
  overheadTotal: number;
  profitTotal: number;
  rcvTotal: number;
  depreciationTotal: number;
  acvTotal: number;
  deductible: number;
  netClaim: number;
}

export interface EstimateProject {
  id: string;
  claim: ClaimInfo;
  insured: InsuredInfo;
  estimator: EstimatorInfo;
  roofFacets: RoofFacet[];
  rooms: RoomGeometry[];
  lineItems: EstimateLineItem[];
  totals: EstimateTotals;
  createdAt: string;
  updatedAt: string;
  generator: string;
  sourceType: 'PDF_IMPORT' | 'ESX_EXTRACT' | 'MANUAL_ENTRY';
  originalFileName?: string;
}

export interface GanttTask {
  id: string;
  name: string;
  phase: string;
  trade: string;
  categoryCodes: string[];
  startDay: number; // day offset relative to project start (e.g. 0 = Day 1)
  durationDays: number;
  progressPercent: number; // 0 - 100
  isCriticalPath: boolean;
  isPinned: boolean;
  dependencies: string[]; // ids of predecessor tasks
  assignedTeam: string;
}

export interface AppsScriptRecord {
  id: string;
  claimNumber: string;
  insuredName: string;
  address: string;
  typeOfLoss: string;
  rcvTotal: number;
  lineItemCount: number;
  profile: string;
  status: 'ESTIMATE_STAGED' | 'ESX_COMPILED' | 'IN_RESTORATION' | 'CLOSED';
  lastSyncedAt: string;
  payloadJson?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'IMPORT' | 'VALIDATION' | 'ESX_COMPILED' | 'SCHEDULE_SYNC' | 'APPS_SCRIPT_SYNC';
  description: string;
  details?: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}
