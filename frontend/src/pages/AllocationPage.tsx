import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert, Truck, Building2, Cpu, CheckCircle2,
  AlertCircle, AlertTriangle, ArrowLeft, Send, Sparkles, Navigation, Layers
} from 'lucide-react';
import { api } from '../services/api';
import { Emergency, Allocation, OptimizationResponse, Ambulance, Hospital } from '../types';
import { PriorityBadge, StatusBadge, ProvenanceBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapView';
import { ExplanationCard } from '../components/ExplanationCard';
import { ScarcityBanner } from '../components/ScarcityBanner';

export const AllocationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [emergency, setEmergency] = useState<Emergency | null>(null);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [alternatives, setAlternatives] = useState<Allocation[]>([]);
  const [optimizationData, setOptimizationData] = useState<OptimizationResponse | null>(null);

  const [candidateAmbulances, setCandidateAmbulances] = useState<Ambulance[]>([]);
  const [candidateHospitals, setCandidateHospitals] = useState<Hospital[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const em = await api.getEmergency(id);
      setEmergency(em);

      // Fetch candidates in parallel
      const [ambCands, hospCands] = await Promise.all([
        api.getAmbulanceCandidates(id),
        api.getHospitalCandidates(id),
      ]);
      setCandidateAmbulances(ambCands);
      setCandidateHospitals(hospCands);

      // Trigger or fetch optimization
      await runOptimization();
    } catch (err: any) {
      setError(err.message || 'Failed to load emergency data');
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    if (!id) return;
    try {
      setOptimizing(true);
      setError(null);
      const opt = await api.optimizeEmergency(id);
      setOptimizationData(opt);

      if (opt.recommended_allocation) {
        setAllocation(opt.recommended_allocation);
      }
      setAlternatives(opt.alternative_allocations || []);
    } catch (err: any) {
      setError(err.message || 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleApprove = async () => {
    if (!allocation) return;
    try {
      setApproving(true);
      const updated = await api.approveAllocation(allocation.id, 'Senior Dispatch Officer');
      setAllocation(updated);
      setValidationAlert(null);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!allocation) return;
    const reason = window.prompt('Why are you rejecting this recommendation?');
    if (!reason?.trim()) return;
    try {
      const updated = await api.rejectAllocation(allocation.id, reason.trim());
      setAllocation(updated);
      setValidationAlert(null);
    } catch (err: unknown) {
      setValidationAlert(err instanceof Error ? err.message : 'Unable to reject allocation.');
    }
  };

  const handleConfirmDispatch = async () => {
    if (!allocation) return;
    try {
      setDispatching(true);
      setValidationAlert(null);
      const disp = await api.confirmDispatch(
        allocation.id,
        'Confirmed emergency response dispatch after clinical validation.',
        'Officer Rajesh Kumar'
      );
      alert(`DISPATCH CONFIRMED! Dispatch Order ID: ${disp.id}. Ambulance ${disp.ambulance_id} dispatched.`);
      navigate(`/dispatches`);
    } catch (err: any) {
      // Show re-validation error if resource state changed
      setValidationAlert(err.message);
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 space-y-3">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-sm font-semibold text-slate-200">Solving Hybrid Quantum-Classical Allocation...</div>
        <div className="text-xs text-slate-400">Discovering candidate ambulances, OSRM routes, hospital specialties &amp; QAOA angles.</div>
      </div>
    );
  }

  if (error || !emergency) {
    return (
      <div className="bg-red-950/80 border border-red-700 p-6 rounded-xl text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-red-200">Allocation Loading Error</h3>
        <p className="text-xs text-red-300">{error || 'Emergency record not found.'}</p>
        <Link to="/dashboard" className="inline-block px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isApproved = allocation?.status === 'APPROVED';

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/emergencies"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-white">{emergency.id}</span>
              <PriorityBadge priority={emergency.calculated_priority || emergency.reported_severity} size="sm" />
              <StatusBadge status={emergency.status} />
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {emergency.patient_name} ({emergency.patient_age}y {emergency.patient_gender}) &bull; {emergency.emergency_type}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runOptimization}
            disabled={optimizing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
          >
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span>{optimizing ? 'Re-optimizing...' : 'Re-run Optimization'}</span>
          </button>
        </div>
      </div>

      {/* Scarcity Banner if Active */}
      {optimizationData?.scarcity_detected && (
        <ScarcityBanner
          note={optimizationData.scarcity_details}
          unservedIds={optimizationData.unserved_emergencies}
        />
      )}

      {/* Pre-Dispatch Validation Error Alert */}
      {validationAlert && (
        <div className="bg-red-950 border-2 border-red-500 text-red-200 p-4 rounded-xl text-xs flex items-start gap-3 shadow-2xl animate-shake">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-red-100 uppercase tracking-wide">
              Pre-Dispatch Revalidation Alert
            </div>
            <p className="mt-1 text-red-200">{validationAlert}</p>
            <button
              onClick={runOptimization}
              className="mt-2.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
            >
              Execute Re-Optimization Now
            </button>
          </div>
        </div>
      )}

      {/* Quantum Honesty Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-slate-200">Optimization Engine Execution:</span>
          <span className="font-mono text-slate-300">
            MILP: {optimizationData?.classical_result.runtime_ms.toFixed(1)}ms &bull; QUBO Matrix: {optimizationData?.quantum_result.num_qubits || 0} qubits
          </span>
        </div>
        <div>
          {optimizationData?.quantum_fallback_activated ? (
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-[11px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
              Quantum fallback activated &mdash; Classical MILP guaranteed safety
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-300 font-mono text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              QAOA Statevector Circuit Executed Successfully
            </span>
          )}
        </div>
      </div>

      {/* Main Allocation Display */}
      {allocation ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recommended Plan Details & Decision Actions */}
          <div className="lg:col-span-7 space-y-5">
            {/* Recommended Plan Card */}
            <div className="bg-slate-900 border-2 border-sky-500/80 rounded-xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-sky-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-bl-lg">
                OPTIMAL RECOMMENDATION
              </div>

              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-sky-400" />
                <h3 className="text-base font-black text-white tracking-tight">
                  RECOMMENDED DISPATCH PLAN
                </h3>
              </div>

              {/* Resource Matching Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ambulance Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4" />
                      <span>AMBULANCE UNIT</span>
                    </div>
                    <span className="font-mono text-white">{allocation.ambulance_id || 'None'}</span>
                  </div>

                  {allocation.ambulance ? (
                    <>
                      <div className="text-sm font-bold text-slate-100">
                        {allocation.ambulance.vehicle_number} ({allocation.ambulance.vehicle_type})
                      </div>
                      <div className="text-xs text-slate-300 truncate">{allocation.ambulance.provider}</div>
                      <div className="text-xs text-slate-400">Base: {allocation.ambulance.current_location_name}</div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Scene ETA:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {allocation.estimated_ambulance_eta_minutes.toFixed(1)} mins
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-red-400 py-4 font-semibold">
                      UNSERVED: No ambulance currently assigned due to fleet scarcity.
                    </div>
                  )}
                </div>

                {/* Hospital Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      <span>RECEIVING HOSPITAL</span>
                    </div>
                    <span className="font-mono text-white">{allocation.hospital_id || 'None'}</span>
                  </div>

                  {allocation.hospital ? (
                    <>
                      <div className="text-sm font-bold text-slate-100 truncate">
                        {allocation.hospital.name}
                      </div>
                      <div className="text-xs text-slate-300 truncate">{allocation.hospital.address}</div>
                      <div className="text-xs text-slate-400">
                        ED Status: <strong className="text-emerald-400">{allocation.hospital.emergency_department_status}</strong>
                        &bull; ICU: <strong className="text-emerald-400">{allocation.hospital.available_icu_beds}</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Transit ETA:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {allocation.estimated_hospital_eta_minutes.toFixed(1)} mins
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 py-4">No receiving hospital required.</div>
                  )}
                </div>
              </div>

              {/* Transit & Score Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400 uppercase">Total Transit ETA</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {allocation.total_estimated_time_minutes.toFixed(1)} mins
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400 uppercase">Road Distance</div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {allocation.estimated_distance_km.toFixed(1)} km
                  </div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded">
                  <div className="text-[10px] text-slate-400 uppercase">Match Score</div>
                  <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                    {allocation.suitability_score.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Action Buttons: Human Approval & Dispatch Confirmation */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Dispatcher Verification: <strong className={isApproved ? 'text-emerald-400' : 'text-amber-400'}>
                    {allocation.status}
                  </strong>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {allocation.status === 'PROPOSED' ? (
                    <>
                    <button
                      onClick={handleReject}
                      disabled={approving || !allocation.ambulance_id}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={approving || !allocation.ambulance_id}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{approving ? 'APPROVING...' : 'APPROVE ALLOCATION'}</span>
                    </button>
                    </>
                  ) : isApproved ? (
                    <button
                      onClick={handleConfirmDispatch}
                      disabled={dispatching || !allocation.ambulance_id}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-xl shadow-red-900/40 transition-all disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>{dispatching ? 'REVALIDATING & DISPATCHING...' : 'CONFIRM DISPATCH ORDER'}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">
                      This recommendation is {allocation.status.toLowerCase()}. Re-run optimization for a new proposal.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Explainable Rationale */}
            <ExplanationCard
              whyThisPlan={allocation.why_this_plan}
              whyAmbulanceSelected={allocation.why_ambulance_selected}
              whyHospitalSelected={allocation.why_hospital_selected}
              suitabilityScore={allocation.suitability_score}
            />

            {/* Alternative Options (Section 26) */}
            {alternatives.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                    <Layers className="h-4 w-4 text-amber-400" />
                    <span>ALTERNATIVE DISPATCH OPTIONS ({alternatives.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Dispatcher Review &bull; Secondary Routing</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {alternatives.map((alt, idx) => (
                    <div key={alt.id} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-amber-400">ALTERNATIVE {idx + 1}</span>
                        <span className="text-slate-400 font-mono">{alt.suitability_score.toFixed(1)}%</span>
                      </div>
                      <div className="text-slate-200 font-semibold truncate">
                        Ambulance: {alt.ambulance_id} &rarr; {alt.hospital?.name || alt.hospital_id}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Total ETA: {alt.total_estimated_time_minutes.toFixed(1)} mins &bull; {alt.estimated_distance_km.toFixed(1)} km
                      </div>
                      <p className="text-[11px] text-slate-400 italic truncate">{alt.why_this_plan}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Leaflet Route Map */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Navigation className="h-4 w-4 text-orange-400" />
                  <span>RECOMMENDED TRANSIT CORRIDOR</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {allocation.route_geometry?.length > 0 ? `${allocation.route_geometry.length} Waypoints` : 'Geodesic'}
                </span>
              </div>

              <MapView
                emergencies={[emergency]}
                ambulances={allocation.ambulance ? [allocation.ambulance] : []}
                hospitals={allocation.hospital ? [allocation.hospital] : []}
                selectedRoute={allocation.route_geometry}
                center={[emergency.latitude, emergency.longitude]}
                zoom={13}
                height="450px"
              />

              <div className="mt-3 p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Corridor Origin:</span>
                  <span className="text-sky-300 font-medium">Ambulance {allocation.ambulance_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Patient Scene:</span>
                  <span className="text-red-300 font-medium">{emergency.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Receiving Facility:</span>
                  <span className="text-emerald-300 font-medium">{allocation.hospital?.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-4">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Eligible Allocation Plan Generated</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Unable to allocate resources due to fleet unavailability or severe clinical constraint mismatches.
          </p>
          <button
            onClick={runOptimization}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold"
          >
            Retry Optimization
          </button>
        </div>
      )}
    </div>
  );
};
