/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EstimateProject, GanttTask } from '../types/xactimate';
import { generateScheduleFromEstimate } from '../services/scheduleEngine';
import { GoogleAppsScriptService } from '../services/googleAppsScriptService';
import {
  Calendar,
  AlertCircle,
  Pin,
  Clock,
  CheckCircle,
  Plus,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface GanttScheduleViewProps {
  project: EstimateProject;
}

export const GanttScheduleView: React.FC<GanttScheduleViewProps> = ({ project }) => {
  const [tasks, setTasks] = useState<GanttTask[]>(() => generateScheduleFromEstimate(project));
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [todayOffsetDay, setTodayOffsetDay] = useState(5); // Day 5 is simulated current day

  // Timeline scale: 30 days total
  const totalDays = 30;
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Filter tasks
  const displayedTasks = showCriticalOnly
    ? tasks.filter((t) => t.isCriticalPath)
    : tasks;

  // Toggle critical path flag
  const toggleCritical = (taskId: string) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, isCriticalPath: !t.isCriticalPath } : t))
    );
  };

  // Toggle pinned state
  const togglePinned = (taskId: string) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, isPinned: !t.isPinned } : t))
    );
  };

  // Update progress
  const updateProgress = (taskId: string, percent: number) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, progressPercent: Math.min(100, Math.max(0, percent)) } : t))
    );
  };

  // Reset to auto-derived schedule from estimate
  const handleRegenerate = () => {
    const fresh = generateScheduleFromEstimate(project);
    setTasks(fresh);
    GoogleAppsScriptService.addAuditLog({
      action: 'SCHEDULE_SYNC',
      description: `Re-indexed XactSchedule Gantt for Claim ${project.claim.claimNumber}`,
      status: 'SUCCESS',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>XactSchedule</span>
              <span aria-hidden="true">·</span>
              <span>Restoration Milestones</span>
              <span aria-hidden="true">·</span>
              <span>Critical Path Method (CPM)</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Restoration Operational Gantt Schedule
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Sequences trade dependencies derived directly from estimate scope categories (Mitigation → Envelope → MEP → Drywall → Finishes → Closeout).
            </p>
          </div>

          {/* Schedule Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition cursor-pointer flex items-center gap-1.5 ${
                showCriticalOnly
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>{showCriticalOnly ? 'Show All Trades' : 'Critical Path Only'}</span>
            </button>

            <button
              onClick={handleRegenerate}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-derive from Scope</span>
            </button>
          </div>
        </div>

        {/* Legend bar adhering strictly to specs */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-xs bg-[#334155]"></div>
            <span>Standard Task (#334155)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-xs bg-[#DC2626]"></div>
            <span>Critical Path (#DC2626)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-xs bg-[#334155] border-2 border-dashed border-[#F59E0B]"></div>
            <span>Pinned Task (#F59E0B)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-[#F1F5F9] border border-slate-300"></div>
            <span>Weekend Shading (#F1F5F9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-3 bg-[#DC2626]"></div>
            <span>Today Marker (Day {todayOffsetDay})</span>
          </div>
        </div>
      </div>

      {/* Gantt Matrix Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Timeline Header Row */}
            <div className="grid grid-cols-12 border-b border-slate-200 bg-[#F8FAFC]">
              {/* Left Column Header (4 cols) */}
              <div className="col-span-4 p-3 border-r border-slate-200 font-semibold text-xs text-slate-800 flex items-center justify-between">
                <span>Milestone Task / Assigned Trade</span>
                <span className="text-[10px] text-slate-400 font-normal">Progress & Status</span>
              </div>

              {/* Right Timeline Days Header (8 cols) */}
              <div className="col-span-8 grid grid-cols-30 text-[10px] font-mono text-center text-slate-500 py-2">
                {daysArray.map((day) => {
                  const isWeekend = day % 7 === 6 || day % 7 === 0;
                  const isToday = day === todayOffsetDay;
                  return (
                    <div
                      key={day}
                      className={`relative py-1 border-r border-[#E2E8F0] ${
                        isWeekend ? 'bg-[#F1F5F9] font-medium' : ''
                      }`}
                    >
                      {isToday && (
                        <div
                          className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#DC2626]"
                          title="Today Marker"
                        />
                      )}
                      <span>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-slate-100">
              {displayedTasks.map((task) => {
                // Calculate position on 30-day grid
                const leftPercent = (task.startDay / totalDays) * 100;
                const widthPercent = (task.durationDays / totalDays) * 100;

                return (
                  <div key={task.id} className="grid grid-cols-12 hover:bg-slate-50/80 transition group">
                    {/* Left Column: Task info */}
                    <div className="col-span-4 p-3 border-r border-slate-200 bg-[#F8FAFC]/50 flex flex-col justify-center space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-red-700 transition">
                          {task.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleCritical(task.id)}
                            className={`p-1 rounded cursor-pointer ${
                              task.isCriticalPath ? 'text-red-600' : 'text-slate-300 hover:text-slate-600'
                            }`}
                            title="Toggle Critical Path"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => togglePinned(task.id)}
                            className={`p-1 rounded cursor-pointer ${
                              task.isPinned ? 'text-amber-500' : 'text-slate-300 hover:text-slate-600'
                            }`}
                            title="Toggle Pinned Milestone"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{task.trade}</span>
                        <span className="font-mono tabular-nums">
                          Day {task.startDay + 1} - {task.startDay + task.durationDays} ({task.durationDays}d)
                        </span>
                      </div>

                      {/* Interactive Progress Slider */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={task.progressPercent}
                          onChange={(e) => updateProgress(task.id, parseInt(e.target.value))}
                          className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                        />
                        <span className="text-[10px] font-mono tabular-nums font-semibold text-slate-700">
                          {task.progressPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Visual Timeline Bar */}
                    <div className="col-span-8 relative py-3 px-1 flex items-center">
                      {/* Weekend background stripes behind bars */}
                      <div className="absolute inset-0 grid grid-cols-30 pointer-events-none">
                        {daysArray.map((day) => {
                          const isWeekend = day % 7 === 6 || day % 7 === 0;
                          return (
                            <div
                              key={day}
                              className={`border-r border-[#E2E8F0] ${
                                isWeekend ? 'bg-[#F1F5F9]/70' : ''
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Today marker vertical hairline */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#DC2626] z-10 pointer-events-none"
                        style={{ left: `${(todayOffsetDay / totalDays) * 100}%` }}
                      />

                      {/* The Gantt Bar */}
                      <div
                        className={`relative h-7 rounded-sm shadow-xs transition-all flex items-center overflow-hidden z-20 cursor-pointer ${
                          task.isCriticalPath ? 'bg-[#DC2626]' : 'bg-[#334155]'
                        } ${task.isPinned ? 'border-2 border-dashed border-[#F59E0B]' : ''}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.max(widthPercent, 3.5)}%`,
                        }}
                        title={`${task.name}: ${task.progressPercent}% Complete (${task.durationDays} days)`}
                      >
                        {/* Progress overlay: white at 30% or 32% opacity */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white"
                          style={{
                            width: `${task.progressPercent}%`,
                            opacity: task.isCriticalPath ? 0.32 : 0.3,
                          }}
                        />

                        {/* Bar Label */}
                        <span className="relative z-10 px-2 text-[10px] font-semibold text-white truncate">
                          {task.durationDays}d · {task.progressPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schedule Summary Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Total Estimated Duration: <strong className="text-slate-900 font-mono">24 Working Days</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Critical Path Tasks: <strong className="text-red-600 font-mono">{tasks.filter((t) => t.isCriticalPath).length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Overall Completion: <strong className="text-slate-900 font-mono">
                {Math.round(tasks.reduce((acc, t) => acc + t.progressPercent, 0) / tasks.length)}%
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Simulate Today Marker:</span>
            <input
              type="number"
              min="1"
              max="30"
              value={todayOffsetDay}
              onChange={(e) => setTodayOffsetDay(parseInt(e.target.value) || 1)}
              className="w-14 px-1.5 py-0.5 border border-slate-300 rounded font-mono text-center text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
