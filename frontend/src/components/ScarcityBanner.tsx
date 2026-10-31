import React from 'react';
import { AlertOctagon, Info } from 'lucide-react';

interface ScarcityBannerProps {
  emergenciesCount?: number;
  availableAmbulancesCount?: number;
  unservedCount?: number;
  unservedIds?: string[];
  note?: string;
}

export const ScarcityBanner: React.FC<ScarcityBannerProps> = ({
  emergenciesCount = 3,
  availableAmbulancesCount = 2,
  unservedCount = 1,
  unservedIds = [],
  note,
}) => {
  return (
    <div className="bg-red-950/40 border-l-4 border-red-500 p-4 rounded-r-lg border-y border-r border-red-900/40 mb-6 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertOctagon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-red-200 uppercase tracking-wide">
              Resource Scarcity Active &mdash; Constrained Fleet Capacity
            </h4>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 font-bold">
              {emergenciesCount} Emergencies &gt; {availableAmbulancesCount} Ambulances
            </span>
          </div>

          <p className="text-xs text-red-200/90 mt-1.5 leading-relaxed">
            {note || (
              <>
                Fleet resources are mathematically constrained: available emergency vehicles ({availableAmbulancesCount}) cannot simultaneously service all active calls ({emergenciesCount}). The optimization engine has triaged and prioritized higher life-threat incidents (Critical/High), queueing <strong>{unservedCount} lower-severity emergency</strong> until active units clear or secondary mutual-aid resources become available.
              </>
            )}
          </p>

          {unservedIds.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-300 bg-amber-950/60 p-2 rounded border border-amber-800/60">
              <Info className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <span>
                <strong>Queued Unserved Emergency:</strong> {unservedIds.join(', ')} (Scheduled for immediate re-allocation upon first ambulance clearance).
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
