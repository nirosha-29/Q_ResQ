import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, ShieldAlert, Truck, Building2, Radio,
  Cpu, ArrowRight, Play, RefreshCw, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Emergency, Ambulance, Hospital, Dispatch } from '../types';
import { PriorityBadge, StatusBadge, ProvenanceBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapView';
import { ScarcityBanner } from '../components/ScarcityBanner';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [recentDispatches, setRecentDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingScenario, setLoadingScenario] = useState<boolean>(false);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string | undefined>();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, emRes, ambRes, hospRes, dispRes] = await Promise.all([
        api.getDashboardStats(),
        api.getEmergencies(),
        api.getAmbulances(),
        api.getHospitals(),
        api.getDispatches(),
      ]);
      setStats(statsRes);
      setEmergencies(emRes);
      setAmbulances(ambRes);
      setHospitals(hospRes);
      setRecentDispatches(dispRes.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const handleLoadScenario = async () => {
    try {
      setLoadingScenario(true);
      await api.loadDemoScenario();
      await loadData();
    } catch (err: any) {
      alert(`Scenario failed: ${err.message}`);
    } finally {
      setLoadingScenario(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>EMS COMMAND & COORDINATION CENTER</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time emergency intake, fleet distribution, hospital capacity, and quantum-classical allocation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLoadScenario}
            disabled={loadingScenario}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 text-purple-400 fill-current" />
            {loadingScenario ? 'Loading...' : 'LOAD HACKATHON SCENARIO'}
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Resource Scarcity Alert if Active */}
      {stats?.scarcity_active && (
        <ScarcityBanner
          emergenciesCount={stats.active_emergencies}
          availableAmbulancesCount={stats.available_ambulances}
          unservedCount={stats.unserved_emergencies}
          unservedIds={emergencies.filter(e => e.status === 'Unserved').map(e => e.id)}
        />
      )}

      {/* Operational Metric Cards (Derived from Backend) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Calls</span>
            <AlertCircle className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats?.total_emergencies ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">{stats?.active_emergencies ?? 0} active</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-orange-300 text-xs font-medium">
            <span>High Priority</span>
            <ShieldAlert className="h-4 w-4 text-orange-300" />
          </div>
          <div className="text-2xl font-black text-orange-300 mt-1.5">{stats?.high_emergencies ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active emergencies</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
            <span>Moderate Priority</span>
            <AlertCircle className="h-4 w-4 text-amber-300" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1.5">{stats?.moderate_emergencies ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active emergencies</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-red-400 text-xs font-medium">
            <span>Critical Calls</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1.5">{stats?.critical_emergencies ?? 0}</div>
          <div className="text-[10px] text-red-300/80 mt-1">High priority tier</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Available Units</span>
            <Truck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5">
            {stats?.available_ambulances ?? 0} <span className="text-xs font-normal text-slate-400">/ {stats?.total_ambulances ?? 0}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Ready for dispatch</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Busy Units</span>
            <Truck className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1.5">{stats?.busy_ambulances ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Assigned or responding</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-purple-400 text-xs font-medium">
            <span>Pending Plans</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 mt-1.5">{stats?.pending_allocations ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting approval</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-sky-400 text-xs font-medium">
            <span>Dispatched</span>
            <Radio className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-300 mt-1.5">{stats?.active_dispatches ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Units en route/scene</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Available Capacity</span>
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-200 mt-1.5">{stats?.available_hospital_beds ?? 0} beds</div>
          <div className="text-[10px] text-slate-400 mt-1">{stats?.available_icu_beds ?? 0} ICU · {stats?.nearby_hospitals ?? 0} centers</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-sky-400 text-xs font-medium">
            <span>Assigned Calls</span>
            <Radio className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-300 mt-1.5">{stats?.assigned_emergencies ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting approval or responding</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-red-400 text-xs font-medium">
            <span>Unallocated</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-300 mt-1.5">{stats?.unserved_emergencies ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Waiting on resource availability</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Fleet Util.</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1.5">
            {stats?.resource_utilization_percent ?? 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Active deployment</div>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Live Emergencies Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Leaflet Map */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>GEOGRAPHIC INCIDENT & FLEET MAP</span>
                <span className="text-[10px] text-slate-400 font-mono">(Leaflet &bull; OpenStreetMap)</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Bengaluru Sector</span>
            </div>

            <MapView
              emergencies={emergencies.filter(e => e.status !== 'Completed')}
              ambulances={ambulances}
              hospitals={hospitals}
              highlightedId={selectedEmergencyId}
              height="450px"
              onMarkerClick={(type, id) => {
                if (type === 'emergency') {
                  setSelectedEmergencyId(id);
                }
              }}
            />
          </div>
        </div>

        {/* Right Column: Emergencies Triage Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200">
                ACTIVE INTAKE QUEUE ({emergencies.length})
              </h3>
              <Link to="/emergencies" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                View All &rarr;
              </Link>
            </div>

            {emergencies.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active emergencies in queue. Click &quot;LOAD HACKATHON SCENARIO&quot; or &quot;NEW INTAKE&quot; to begin.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {emergencies.map((em) => (
                  <div
                    key={em.id}
                    onClick={() => setSelectedEmergencyId(em.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedEmergencyId === em.id
                        ? 'bg-slate-800/90 border-sky-500 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-200">{em.id}</span>
                        <PriorityBadge priority={em.calculated_priority || em.reported_severity} size="sm" />
                      </div>
                      <StatusBadge status={em.status} />
                    </div>

                    <div className="font-semibold text-slate-200 text-xs">{em.patient_name} ({em.patient_age}y)</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{em.emergency_type} &bull; {em.address}</div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <ProvenanceBadge isDemo={em.is_demo} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/allocation/${em.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold"
                      >
                        <span>Allocation Plan</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Dispatches Monitor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Radio className="h-4 w-4 text-sky-400" />
            <span>CONFIRMED ACTIVE DISPATCH MONITOR</span>
          </div>
          <Link to="/dispatches" className="text-xs text-sky-400 hover:text-sky-300 font-semibold">
            Track All Dispatches &rarr;
          </Link>
        </div>

        {recentDispatches.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center">
            No active emergency dispatches currently en route. Approve and confirm allocations to monitor live cases.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Dispatch ID</th>
                  <th className="p-2.5">Emergency</th>
                  <th className="p-2.5">Assigned Ambulance</th>
                  <th className="p-2.5">Receiving Hospital</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Dispatcher</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentDispatches.map((disp) => (
                  <tr key={disp.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-mono font-bold text-sky-400">{disp.id}</td>
                    <td className="p-2.5 font-medium text-slate-200">
                      {disp.emergency_id} &mdash; {disp.emergency?.patient_name || 'Patient'}
                    </td>
                    <td className="p-2.5 text-slate-300">
                      {disp.ambulance_id} ({disp.ambulance?.vehicle_type || 'ALS'})
                    </td>
                    <td className="p-2.5 text-slate-300 truncate max-w-[180px]">
                      {disp.hospital?.name || disp.hospital_id}
                    </td>
                    <td className="p-2.5">
                      <StatusBadge status={disp.status} />
                    </td>
                    <td className="p-2.5 text-slate-400">{disp.dispatcher_name}</td>
                    <td className="p-2.5 text-right">
                      <Link
                        to={`/dispatches`}
                        className="text-xs text-sky-400 hover:underline font-semibold"
                      >
                        Monitor
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
