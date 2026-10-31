import React from 'react';
import { HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface ExplanationCardProps {
  whyThisPlan?: string;
  whyAmbulanceSelected?: string;
  whyHospitalSelected?: string;
  suitabilityScore?: number;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  whyThisPlan,
  whyAmbulanceSelected,
  whyHospitalSelected,
  suitabilityScore = 92.0,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
          <HelpCircle className="h-4 w-4 text-sky-400" />
          <span>EXPLAINABLE DISPATCH RATIONALE</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950 border border-sky-700/60 text-sky-300 font-mono text-xs font-bold">
          <span>Suitability:</span>
          <span>{suitabilityScore.toFixed(1)}%</span>
        </div>
      </div>

      {/* Main explanation text */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 mb-4 text-xs text-slate-200 leading-relaxed">
        <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1">
          Optimization Solver Synthesis
        </div>
        <p className="text-slate-300">
          {whyThisPlan || 'Optimal resource pair selected to minimize response time while matching clinical capabilities.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Ambulance Selection Reasons */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
          <div className="font-semibold text-sky-400 flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Why Ambulance Selected</span>
          </div>
          <p className="text-slate-300 leading-normal">
            {whyAmbulanceSelected || 'Closest unit with matching life-support certification, verified equipment, and immediate readiness.'}
          </p>
        </div>

        {/* Hospital Selection Reasons */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
          <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Why Hospital Selected</span>
          </div>
          <p className="text-slate-300 leading-normal">
            {whyHospitalSelected || 'Designated acute emergency receiving department with verified specialty care capability and optimal transit time.'}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <span>Synthesized dynamically from objective metrics, capability matrices, and real-time operational constraints.</span>
      </div>
    </div>
  );
};
