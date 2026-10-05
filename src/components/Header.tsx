/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { Cloud, ShieldCheck } from 'lucide-react';

export type ActiveTab = 'pdf2esx' | 'esx2pdf' | 'schedule' | 'database' | 'python';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeProfile: string;
  hasAppsScriptUrl: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  activeProfile,
  hasAppsScriptUrl,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'pdf2esx', label: 'PDF to ESX' },
    { id: 'esx2pdf', label: 'ESX to PDF' },
    { id: 'schedule', label: 'XactSchedule' },
    { id: 'database', label: 'Apps Script DB' },
    { id: 'python', label: 'Python Engine' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Brand element */}
        <div className="flex items-center shrink-0">
          <BrandLogo size="md" />
        </div>

        {/* Zone 2: 4-6 text navigation links with clean active underline / text state */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`transition-colors cursor-pointer py-1 border-b-2 text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-red-600 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Profile status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Profile:</span>
            <span className="font-semibold text-slate-800">{activeProfile}</span>
          </div>

          {/* Apps Script sync indicator */}
          <button
            onClick={() => onTabChange('database')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer transition ${
              hasAppsScriptUrl
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            title="Google Apps Script backend database sync status"
          >
            <Cloud className={`w-3.5 h-3.5 ${hasAppsScriptUrl ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{hasAppsScriptUrl ? 'Apps Script Connected' : 'Apps Script Local'}</span>
          </button>

          <PWAInstallButton />
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50 gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === item.id
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
