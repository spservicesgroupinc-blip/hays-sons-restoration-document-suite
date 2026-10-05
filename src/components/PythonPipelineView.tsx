/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PYTHON_ESX_CONVERTER_SCRIPT } from '../services/pythonScriptGenerator';
import {
  Terminal,
  Download,
  Copy,
  Check,
  CheckCircle2,
  FileCode,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export const PythonPipelineView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  // Copy python script
  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_ESX_CONVERTER_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download python script
  const handleDownload = () => {
    const blob = new Blob([PYTHON_ESX_CONVERTER_SCRIPT], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esx_converter.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>CLI Pipeline</span>
              <span aria-hidden="true">·</span>
              <span>Python 3.10+</span>
              <span aria-hidden="true">·</span>
              <span>Verisk Architectural Compliance</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Production Python Conversion Engine (esx_converter.py)
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Standalone, executable InsurTech script leveraging <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">zipfile</code> (ZIP_DEFLATED), <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">xml.etree.ElementTree</code>, and <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">pdfplumber</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Code' : 'Copy Script'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download esx_converter.py</span>
            </button>
          </div>
        </div>

        {/* 4 Architectural Directives Card */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Container Integrity</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Enforces true PKZIP compression (<code className="font-mono text-[10px]">ZIP_DEFLATED</code>) at Level 9. Never outputs disguised raw XML.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Strict XML Sequence</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Order: <code className="font-mono text-[10px]">ADMINISTRATIVE_DATA</code> → <code className="font-mono text-[10px]">SKETCH_DATA</code> → <code className="font-mono text-[10px]">ESTIMATE_SCOPE</code> → <code className="font-mono text-[10px]">SUMMARY_TOTALS</code>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Profile Enforcement</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Sets <code className="font-mono text-[10px]">&lt;PROFILE&gt;CONTRACTOR&lt;/PROFILE&gt;</code> to prevent read-only carrier locking upon ingestion.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>4. MAX_PATH Sanitation</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Filenames sanitized to short alphanumeric strings (e.g. <code className="font-mono text-[10px]">CLM88901.esx</code>) with zero spaces.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal CLI Usage Guide */}
      <div className="bg-slate-900 text-slate-200 rounded-lg p-6 shadow-xs border border-slate-800 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>CLI Terminal Usage:</span>
        </div>
        <div className="space-y-1 text-slate-300">
          <p className="text-slate-500"># 1. Install prerequisites</p>
          <p className="text-emerald-400">pip install pdfplumber reportlab</p>
          <p className="text-slate-500 pt-2"># 2. Workflow 1: Convert static PDF repair estimate to Xactimate ESX</p>
          <p className="text-emerald-400">python esx_converter.py pdf2esx estimate.pdf -o CLM88901.esx</p>
          <p className="text-slate-500 pt-2"># 3. Workflow 2: Extract live ESX archive and render PDF proposal report</p>
          <p className="text-emerald-400">python esx_converter.py esx2pdf CLM88901.esx -o Proposal_CLM88901.pdf</p>
        </div>
      </div>

      {/* Script Source Viewer */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-600" />
            <span className="font-mono font-semibold text-xs text-slate-900">esx_converter.py (Complete Production Source)</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">Python 3.10+ · Pure ElementTree</span>
        </div>

        <pre className="p-6 bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-[600px] leading-relaxed">
          {PYTHON_ESX_CONVERTER_SCRIPT}
        </pre>
      </div>
    </div>
  );
};
