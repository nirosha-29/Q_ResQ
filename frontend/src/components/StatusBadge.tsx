import React from 'react';
import { EmergencyPriority, EmergencyStatus } from '../types';

interface PriorityBadgeProps {
  priority?: EmergencyPriority | string;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority = 'MODERATE', size = 'md' }) => {
  const p = priority.toUpperCase();
  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (p === 'CRITICAL') {
    colorClasses = 'bg-red-950/80 text-red-400 border-red-700/60 ring-1 ring-red-500/20';
  } else if (p === 'HIGH') {
    colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-700/60 ring-1 ring-amber-500/20';
  } else if (p === 'MODERATE') {
    colorClasses = 'bg-yellow-950/70 text-yellow-300 border-yellow-700/60';
  } else if (p === 'LOW') {
    colorClasses = 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${p === 'CRITICAL' ? 'bg-red-400 animate-pulse' : p === 'HIGH' ? 'bg-amber-400' : p === 'MODERATE' ? 'bg-yellow-400' : 'bg-emerald-400'}`}></span>
      {p}
    </span>
  );
};

interface StatusBadgeProps {
  status: EmergencyStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['Dispatched', 'En Route', 'At Scene', 'Transporting'].includes(status)) {
    badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-700/50';
  } else if (['Awaiting Allocation', 'Prioritizing'].includes(status)) {
    badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-700/50 animate-pulse';
  } else if (['Awaiting Approval', 'Allocated'].includes(status)) {
    badgeColor = 'bg-purple-950/80 text-purple-300 border-purple-700/50';
  } else if (status === 'Completed') {
    badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';
  } else if (status === 'Unserved') {
    badgeColor = 'bg-rose-950 text-rose-300 border-rose-700 font-bold';
  } else if (status === 'Available') {
    badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';
  } else if (status === 'Busy') {
    badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${badgeColor}`}>
      {status}
    </span>
  );
};

export const ProvenanceBadge: React.FC<{ isDemo?: number | boolean; sourceName?: string }> = ({ isDemo, sourceName }) => {
  if (isDemo) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-amber-950/90 text-amber-300 border border-amber-700/50" title="Simulated controlled hackathon scenario data">
        DEMO DATA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-sky-950/90 text-sky-300 border border-sky-700/50" title={`Verified public source: ${sourceName || 'Open Data'}`}>
      VERIFIED PUBLIC
    </span>
  );
};
