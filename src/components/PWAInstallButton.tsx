/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Hide if already running inside installed standalone PWA
  if (isInstalled) {
    return null;
  }

  // Chromium / Desktop / Android flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition shadow-xs whitespace-nowrap cursor-pointer"
        title="Install Hays + Sons Restoration Document Suite to Desktop / Mobile"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition whitespace-nowrap cursor-pointer"
          title="Install on iOS"
        >
          <Smartphone className="w-3.5 h-3.5 text-slate-600" />
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Install on iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                1. Tap the <strong className="text-slate-900">Share</strong> button in the Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong>.<br />
                3. Launch directly from your home screen for offline restoration access.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-md bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
