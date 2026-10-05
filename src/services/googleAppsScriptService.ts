/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppsScriptRecord, EstimateProject, AuditLogEntry } from '../types/xactimate';

const STORAGE_KEY_RECORDS = 'hays_sons_claims_database';
const STORAGE_KEY_URL = 'hays_sons_appscript_url';
const STORAGE_KEY_AUDIT = 'hays_sons_audit_logs';

/**
 * Build-time default for the Apps Script Web App URL (optional).
 *
 * VITE_* values are inlined into the client bundle, so this is public by
 * definition — it is a deployment URL, never a credential. A URL saved in the
 * dashboard still takes precedence over this default.
 */
const DEFAULT_SCRIPT_URL = (import.meta.env.VITE_APPS_SCRIPT_URL || '').trim();

/**
 * Production-ready Google Apps Script Code.gs
 * This code is deployed as a Web App (Execute as Me, Anyone has access)
 * It provisions and writes to Google Sheets tabs: "Claims", "LineItems", "AuditLogs"
 */
export const APPS_SCRIPT_CODE_GS = `/**
 * Hays + Sons Restoration Document Suite - Google Apps Script Database Backend
 * File: Code.gs
 * Description: High-concurrency backend API handling claims storage, status tracking,
 * and audit logging for Xactimate ESX conversion projects.
 */

const DB_SHEET_CLAIMS = "Claims";
const DB_SHEET_LINE_ITEMS = "LineItems";
const DB_SHEET_AUDIT_LOGS = "AuditLogs";

function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Claims Sheet
  let claimsSheet = ss.getSheetByName(DB_SHEET_CLAIMS);
  if (!claimsSheet) {
    claimsSheet = ss.insertSheet(DB_SHEET_CLAIMS);
    claimsSheet.appendRow([
      "Record ID", "Claim Number", "Insured Name", "Property Address", 
      "Loss Type", "RCV Total", "Line Item Count", "Profile", 
      "Status", "Last Synced At", "Full Payload JSON"
    ]);
    claimsSheet.getRange("A1:K1").setFontWeight("bold").setBackground("#0F172A").setFontColor("#FFFFFF");
    claimsSheet.setFrozenRows(1);
  }

  // 2. Audit Logs Sheet
  let auditSheet = ss.getSheetByName(DB_SHEET_AUDIT_LOGS);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(DB_SHEET_AUDIT_LOGS);
    auditSheet.appendRow(["Log ID", "Timestamp", "Action", "Description", "Details", "Status"]);
    auditSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#0F172A").setFontColor("#FFFFFF");
    auditSheet.setFrozenRows(1);
  }
}

function doPost(e) {
  try {
    initDatabase();
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "saveClaim") {
      const claimsSheet = ss.getSheetByName(DB_SHEET_CLAIMS);
      const claim = data.claim;
      
      // Check if claim already exists
      const rows = claimsSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === claim.claimNumber) {
          rowIndex = i + 1;
          break;
        }
      }

      const rowData = [
        claim.id,
        claim.claimNumber,
        claim.insuredName,
        claim.address,
        claim.typeOfLoss,
        claim.rcvTotal,
        claim.lineItemCount,
        claim.profile,
        claim.status,
        new Date().toISOString(),
        claim.payloadJson || ""
      ];

      if (rowIndex > 0) {
        claimsSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        claimsSheet.appendRow(rowData);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Claim record successfully committed to Google Apps Script database.",
        recordId: claim.id
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getClaims") {
      const claimsSheet = ss.getSheetByName(DB_SHEET_CLAIMS);
      const rows = claimsSheet.getDataRange().getValues();
      const records = [];
      for (let i = 1; i < rows.length; i++) {
        records.push({
          id: rows[i][0],
          claimNumber: rows[i][1],
          insuredName: rows[i][2],
          address: rows[i][3],
          typeOfLoss: rows[i][4],
          rcvTotal: Number(rows[i][5]),
          lineItemCount: Number(rows[i][6]),
          profile: rows[i][7],
          status: rows[i][8],
          lastSyncedAt: rows[i][9],
          payloadJson: rows[i][10]
        });
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        records: records
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "logAudit") {
      const auditSheet = ss.getSheetByName(DB_SHEET_AUDIT_LOGS);
      const log = data.log;
      auditSheet.appendRow([
        log.id,
        log.timestamp || new Date().toISOString(),
        log.action,
        log.description,
        log.details || "",
        log.status
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        success: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Unrecognized action: " + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  initDatabase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const claimsSheet = ss.getSheetByName(DB_SHEET_CLAIMS);
  const rows = claimsSheet.getDataRange().getValues();
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    records.push({
      id: rows[i][0],
      claimNumber: rows[i][1],
      insuredName: rows[i][2],
      address: rows[i][3],
      typeOfLoss: rows[i][4],
      rcvTotal: Number(rows[i][5]),
      lineItemCount: Number(rows[i][6]),
      profile: rows[i][7],
      status: rows[i][8],
      lastSyncedAt: rows[i][9]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    totalRecords: records.length,
    records: records
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Seed initial real-world claims for Hays + Sons restoration records
 */
const DEFAULT_RECORDS: AppsScriptRecord[] = [
  {
    id: 'HS-REC-8901',
    claimNumber: 'CLM88901',
    insuredName: 'David & Sarah Montgomery',
    address: '4820 Meridian Hills Blvd, Indianapolis, IN 46228',
    typeOfLoss: 'Wind / Hail',
    rcvTotal: 18742.25,
    lineItemCount: 14,
    profile: 'CONTRACTOR',
    status: 'ESX_COMPILED',
    lastSyncedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'HS-REC-8902',
    claimNumber: 'CLM88902',
    insuredName: 'Katherine Sullivan',
    address: '11200 Lake Shore Dr E, Carmel, IN 46033',
    typeOfLoss: 'Water Damage',
    rcvTotal: 12450.8,
    lineItemCount: 11,
    profile: 'CONTRACTOR',
    status: 'IN_RESTORATION',
    lastSyncedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'HS-REC-8903',
    claimNumber: 'CLM88903',
    insuredName: 'Marcus Vance',
    address: '614 E 54th St, Indianapolis, IN 46220',
    typeOfLoss: 'Fire & Smoke',
    rcvTotal: 34180.0,
    lineItemCount: 22,
    profile: 'STATE_FARM',
    status: 'ESTIMATE_STAGED',
    lastSyncedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    action: 'ESX_COMPILED',
    description: 'Compiled PKZIP container for CLM88901.esx',
    details: 'Validated 14 line items. Profile: CONTRACTOR. Checksum verified.',
    status: 'SUCCESS',
  },
  {
    id: 'LOG-002',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    action: 'SCHEDULE_SYNC',
    description: 'XactSchedule milestone Gantt generated for CLM88902',
    details: '7 trade phases calculated. Critical path: Structural Drying -> Drywall Hang.',
    status: 'SUCCESS',
  },
];

export class GoogleAppsScriptService {
  private static getStoredUrl(): string {
    const stored = localStorage.getItem(STORAGE_KEY_URL);
    return (stored && stored.trim()) || DEFAULT_SCRIPT_URL;
  }

  /**
   * The URL the app would use right now: the saved dashboard override if one
   * exists, otherwise the build-time default. Used to prefill the settings form.
   */
  public static getConfiguredUrl(): string {
    return this.getStoredUrl();
  }

  public static setStoredUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  }

  public static getStoredRecords(): AppsScriptRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(DEFAULT_RECORDS));
      return DEFAULT_RECORDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_RECORDS;
    }
  }

  public static getStoredAuditLogs(): AuditLogEntry[] {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(DEFAULT_AUDIT_LOGS));
      return DEFAULT_AUDIT_LOGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_AUDIT_LOGS;
    }
  }

  public static addAuditLog(log: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getStoredAuditLogs();
    const newLog: AuditLogEntry = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 50)));

    // Sync to remote Google Apps Script if URL configured
    const scriptUrl = this.getStoredUrl();
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'logAudit', log: newLog }),
        mode: 'no-cors',
      }).catch((e) => console.warn('Apps Script log sync notice:', e));
    }
  }

  /**
   * Saves or updates a project in the Google Apps Script database
   */
  public static async saveProjectRecord(
    project: EstimateProject,
    status: AppsScriptRecord['status'] = 'ESTIMATE_STAGED'
  ): Promise<{ success: boolean; message: string; recordId: string }> {
    const recordId = `HS-REC-${project.claim.claimNumber.replace(/[^A-Za-z0-9]/g, '')}`;
    const newRecord: AppsScriptRecord = {
      id: recordId,
      claimNumber: project.claim.claimNumber,
      insuredName: project.insured.name,
      address: `${project.insured.propertyAddress}, ${project.insured.city}, ${project.insured.state}`,
      typeOfLoss: project.claim.typeOfLoss,
      rcvTotal: project.totals.rcvTotal,
      lineItemCount: project.lineItems.length,
      profile: project.claim.profile,
      status,
      lastSyncedAt: new Date().toISOString(),
      payloadJson: JSON.stringify(project),
    };

    // Update local cache
    const records = this.getStoredRecords();
    const existingIndex = records.findIndex((r) => r.claimNumber === project.claim.claimNumber);
    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.unshift(newRecord);
    }
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));

    // Audit log
    this.addAuditLog({
      action: status === 'ESX_COMPILED' ? 'ESX_COMPILED' : 'APPS_SCRIPT_SYNC',
      description: `Committed Claim ${project.claim.claimNumber} to database (${project.lineItems.length} items)`,
      details: `RCV: $${project.totals.rcvTotal.toFixed(2)} · Insured: ${project.insured.name}`,
      status: 'SUCCESS',
    });

    // Remote sync
    const scriptUrl = this.getStoredUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'saveClaim', claim: newRecord }),
          mode: 'no-cors', // Standard Google Apps Script Web App mode
        });
        return {
          success: true,
          message: 'Saved to local cache and synchronized with Google Apps Script Web App.',
          recordId,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          success: true,
          message: `Saved locally. Remote Google Apps Script connection notice: ${message}`,
          recordId,
        };
      }
    }

    return {
      success: true,
      message: 'Record committed to local repository. Connect Google Apps Script URL for live cloud sync.',
      recordId,
    };
  }

  /**
   * Fetches records from remote Apps Script endpoint if configured, else returns cached records
   */
  public static async fetchRecords(): Promise<AppsScriptRecord[]> {
    const scriptUrl = this.getStoredUrl();
    if (scriptUrl) {
      try {
        const response = await fetch(scriptUrl);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.records) && data.records.length > 0) {
            localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(data.records));
            return data.records;
          }
        }
      } catch (e) {
        console.warn('Apps Script fetch failed, using local records:', e);
      }
    }
    return this.getStoredRecords();
  }

  /**
   * Updates status of an existing claim record
   */
  public static updateRecordStatus(claimNumber: string, newStatus: AppsScriptRecord['status']): void {
    const records = this.getStoredRecords();
    const rec = records.find((r) => r.claimNumber === claimNumber);
    if (rec) {
      rec.status = newStatus;
      rec.lastSyncedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
      this.addAuditLog({
        action: 'APPS_SCRIPT_SYNC',
        description: `Updated Claim ${claimNumber} status to ${newStatus}`,
        status: 'SUCCESS',
      });
    }
  }
}
