/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppsScriptRecord, AuditLogEntry } from '../types/xactimate';
import {
  GoogleAppsScriptService,
  APPS_SCRIPT_CODE_GS,
} from '../services/googleAppsScriptService';
import {
  Database,
  Cloud,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AppsScriptDatabaseViewProps {
  onSelectClaim?: (claimNumber: string) => void;
}

export const AppsScriptDatabaseView: React.FC<AppsScriptDatabaseViewProps> = () => {
  const [records, setRecords] = useState<AppsScriptRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [scriptUrl, setScriptUrl] = useState(() => GoogleAppsScriptService.getConfiguredUrl());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'claims' | 'setup' | 'audit'>('claims');

  // Load records and logs
  const loadData = () => {
    setRecords(GoogleAppsScriptService.getStoredRecords());
    setAuditLogs(GoogleAppsScriptService.getStoredAuditLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Apps Script URL
  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    GoogleAppsScriptService.setStoredUrl(scriptUrl);
    setSyncStatus('Google Apps Script URL saved successfully.');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Test sync
  const handleTestSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const fetched = await GoogleAppsScriptService.fetchRecords();
      setRecords(fetched);
      setSyncStatus('Synchronization successful. Synced with database.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSyncStatus(`Sync notice: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Update claim status
  const handleStatusChange = (claimNumber: string, status: AppsScriptRecord['status']) => {
    GoogleAppsScriptService.updateRecordStatus(claimNumber, status);
    loadData();
  };

  // Copy Code.gs
  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_GS);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Backend Architecture</span>
              <span aria-hidden="true">·</span>
              <span>Google Apps Script</span>
              <span aria-hidden="true">·</span>
              <span>Sheets Persistence</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Google Apps Script Claims Database
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Persistent InsurTech record repository backed by Google Sheets and Apps Script Web App endpoints for live claim synchronization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Database'}</span>
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Configure Apps Script</span>
            </button>
          </div>
        </div>

        {/* Sync notification */}
        {syncStatus && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-slate-50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('claims')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeTab === 'claims'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Claims Repository ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeTab === 'setup'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Apps Script Setup (Code.gs)
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Activity Log ({auditLogs.length})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Endpoint: {scriptUrl ? 'Connected' : 'Local Fallback Active'}
          </div>
        </div>

        {/* Tab 1: Claims List */}
        {activeTab === 'claims' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Claim #</th>
                    <th className="py-2.5 px-3">Insured & Property</th>
                    <th className="py-2.5 px-3">Loss Type</th>
                    <th className="py-2.5 px-3 text-right">RCV Total</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3">Profile</th>
                    <th className="py-2.5 px-3">Restoration Status</th>
                    <th className="py-2.5 px-3 text-right">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {rec.claimNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{rec.insuredName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{rec.address}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {rec.typeOfLoss}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        ${rec.rcvTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {rec.lineItemCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                        {rec.profile}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={rec.status}
                          onChange={(e) => handleStatusChange(rec.claimNumber, e.target.value as AppsScriptRecord['status'])}
                          className={`text-xs font-semibold px-2 py-1 rounded border focus:ring-1 cursor-pointer ${
                            rec.status === 'ESX_COMPILED'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : rec.status === 'IN_RESTORATION'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : rec.status === 'CLOSED'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="ESTIMATE_STAGED">ESTIMATE_STAGED</option>
                          <option value="ESX_COMPILED">ESX_COMPILED</option>
                          <option value="IN_RESTORATION">IN_RESTORATION</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(rec.lastSyncedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Google Apps Script Setup & Code.gs */}
        {activeTab === 'setup' && (
          <div className="p-6 space-y-6">
            {/* URL Configuration Form */}
            <form onSubmit={handleSaveUrl} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h3 className="font-semibold text-sm text-slate-900">
                Google Apps Script Web App Endpoint URL
              </h3>
              <p className="text-xs text-slate-600">
                Enter your deployed Google Apps Script URL (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">https://script.google.com/macros/s/AKfycb.../exec</code>).
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition cursor-pointer"
                >
                  Save URL
                </button>
              </div>
            </form>

            {/* Instructions */}
            <div className="p-4 border border-slate-200 rounded-lg bg-white space-y-2 text-xs text-slate-600">
              <h4 className="font-bold text-slate-900 text-sm">Deployment Guide (1-Minute Setup):</h4>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>Create a new spreadsheet at <strong className="text-slate-900">sheets.new</strong>.</li>
                <li>In the menu, open <strong className="text-slate-900">Extensions &gt; Apps Script</strong>.</li>
                <li>Copy the complete <code className="font-mono font-semibold text-red-700">Code.gs</code> below and paste it into the editor replacing default content.</li>
                <li>Click <strong className="text-slate-900">Deploy &gt; New deployment</strong>, select <strong className="text-slate-900">Web App</strong>.</li>
                <li>Set <strong className="text-slate-900">Execute as: Me</strong> and <strong className="text-slate-900">Who has access: Anyone</strong>.</li>
                <li>Click Deploy, copy the Web App URL, and paste it into the box above!</li>
              </ol>
            </div>

            {/* Code.gs Viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-mono">Code.gs (Ready for Deployment):</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied Code.gs' : 'Copy Code.gs'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-200 text-xs font-mono rounded-lg overflow-x-auto max-h-96 leading-relaxed">
                {APPS_SCRIPT_CODE_GS}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Audit Activity Log */}
        {activeTab === 'audit' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-36">Timestamp</th>
                    <th className="py-2.5 px-3 w-32">Action</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Technical Details</th>
                    <th className="py-2.5 px-3 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        {log.description}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {log.details || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
