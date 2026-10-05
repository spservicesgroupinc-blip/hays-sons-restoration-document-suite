/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GanttTask, EstimateProject } from '../types/xactimate';

/**
 * Builds restoration milestone tasks from project line items
 */
export function generateScheduleFromEstimate(project: EstimateProject): GanttTask[] {
  const categoriesPresent = new Set(project.lineItems.map((i) => i.category.toUpperCase()));

  const tasks: GanttTask[] = [];

  // 1. Emergency Mitigation
  if (categoriesPresent.has('WTR') || categoriesPresent.has('TMP') || categoriesPresent.has('DMO')) {
    tasks.push({
      id: 'TASK-1',
      name: 'Emergency Mitigation & Water Extraction',
      phase: 'Phase 1 · Emergency Response',
      trade: 'Mitigation Services',
      categoryCodes: ['WTR', 'TMP', 'DMO'].filter((c) => categoriesPresent.has(c)),
      startDay: 0,
      durationDays: 3,
      progressPercent: 100,
      isCriticalPath: true,
      isPinned: true,
      dependencies: [],
      assignedTeam: 'Hays + Sons Rapid Response Crew',
    });
  }

  // 2. Structural Drying & Psychrometric Monitoring
  if (categoriesPresent.has('WTR')) {
    tasks.push({
      id: 'TASK-2',
      name: 'Structural Dehumidification & Dryout',
      phase: 'Phase 2 · Environmental Clearance',
      trade: 'Drying Technicians',
      categoryCodes: ['WTR'],
      startDay: 2,
      durationDays: 4,
      progressPercent: 100,
      isCriticalPath: true,
      isPinned: false,
      dependencies: ['TASK-1'],
      assignedTeam: 'Applied Structural Drying (ASD) Techs',
    });
  }

  // 3. Envelope / Roofing
  if (categoriesPresent.has('RFG') || categoriesPresent.has('SFG') || categoriesPresent.has('SID') || categoriesPresent.has('WDO')) {
    const hasPrior = tasks.length > 0;
    tasks.push({
      id: 'TASK-3',
      name: 'Roof Tear-off & Architectural Shingle Install',
      phase: 'Phase 3 · Building Envelope',
      trade: 'Roofing & Exterior',
      categoryCodes: ['RFG', 'SFG', 'SID', 'WDO'].filter((c) => categoriesPresent.has(c)),
      startDay: hasPrior ? 4 : 1,
      durationDays: 5,
      progressPercent: 65,
      isCriticalPath: false,
      isPinned: false,
      dependencies: hasPrior ? [tasks[0].id] : [],
      assignedTeam: 'Commercial Roofing Division',
    });
  }

  // 4. MEP Trades (HVAC, Electrical, Plumbing)
  if (categoriesPresent.has('ELE') || categoriesPresent.has('PLM') || categoriesPresent.has('HVC') || categoriesPresent.has('INS')) {
    const prevTask = tasks.find((t) => t.id === 'TASK-2') || tasks[0];
    const startDay = prevTask ? prevTask.startDay + prevTask.durationDays : 4;
    tasks.push({
      id: 'TASK-4',
      name: 'Rough MEP & Thermal Insulation Inspection',
      phase: 'Phase 4 · Mechanical & Utilities',
      trade: 'Licensed Trades (MEP)',
      categoryCodes: ['ELE', 'PLM', 'HVC', 'INS'].filter((c) => categoriesPresent.has(c)),
      startDay,
      durationDays: 4,
      progressPercent: 40,
      isCriticalPath: true,
      isPinned: false,
      dependencies: prevTask ? [prevTask.id] : [],
      assignedTeam: 'Subcontractor MEP Guild',
    });
  }

  // 5. Drywall & Plaster
  if (categoriesPresent.has('DRY') || categoriesPresent.has('PLA')) {
    const prevTask = tasks.find((t) => t.id === 'TASK-4') || tasks.find((t) => t.id === 'TASK-2') || tasks[0];
    const startDay = prevTask ? prevTask.startDay + prevTask.durationDays : 7;
    tasks.push({
      id: 'TASK-5',
      name: 'Drywall Hanging, Taping & Level 4 Texture',
      phase: 'Phase 5 · Structural Surfaces',
      trade: 'Drywall Specialists',
      categoryCodes: ['DRY', 'PLA'].filter((c) => categoriesPresent.has(c)),
      startDay,
      durationDays: 6,
      progressPercent: 20,
      isCriticalPath: true,
      isPinned: false,
      dependencies: prevTask ? [prevTask.id] : [],
      assignedTeam: 'Interior Finishing Unit A',
    });
  }

  // 6. Painting
  if (categoriesPresent.has('PNT')) {
    const prevTask = tasks.find((t) => t.id === 'TASK-5') || tasks[tasks.length - 1];
    const startDay = prevTask ? prevTask.startDay + prevTask.durationDays : 12;
    tasks.push({
      id: 'TASK-6',
      name: 'Prime Seal & Two-Coat Interior Painting',
      phase: 'Phase 6 · Surface Coatings',
      trade: 'Paint & Finishes',
      categoryCodes: ['PNT'],
      startDay,
      durationDays: 4,
      progressPercent: 0,
      isCriticalPath: true,
      isPinned: false,
      dependencies: prevTask ? [prevTask.id] : [],
      assignedTeam: 'Coatings Specialist Crew',
    });
  }

  // 7. Flooring & Millwork
  if (categoriesPresent.has('FLR') || categoriesPresent.has('CAB') || categoriesPresent.has('FNC') || categoriesPresent.has('TIL')) {
    const prevTask = tasks.find((t) => t.id === 'TASK-6') || tasks[tasks.length - 1];
    const startDay = prevTask ? prevTask.startDay + prevTask.durationDays : 16;
    tasks.push({
      id: 'TASK-7',
      name: 'Finish Carpentry, Cabinetry & Floor Covering',
      phase: 'Phase 7 · Millwork & Flooring',
      trade: 'Master Finish Carpenters',
      categoryCodes: ['FLR', 'CAB', 'FNC', 'TIL'].filter((c) => categoriesPresent.has(c)),
      startDay,
      durationDays: 5,
      progressPercent: 0,
      isCriticalPath: true,
      isPinned: false,
      dependencies: prevTask ? [prevTask.id] : [],
      assignedTeam: 'Custom Trim & Flooring Crew',
    });
  }

  // 8. Cleaning & Walkthrough
  const lastTask = tasks[tasks.length - 1];
  const startDay = lastTask ? lastTask.startDay + lastTask.durationDays : 21;
  tasks.push({
    id: `TASK-${tasks.length + 1}`,
    name: 'Post-Construction Detailing & Certificate of Completion',
    phase: 'Phase 8 · Inspection & Signoff',
    trade: 'Restoration Project Manager',
    categoryCodes: ['CLN'],
    startDay,
    durationDays: 2,
    progressPercent: 0,
    isCriticalPath: true,
    isPinned: false,
    dependencies: lastTask ? [lastTask.id] : [],
    assignedTeam: 'Senior Quality Assurance Auditor',
  });

  return tasks;
}
