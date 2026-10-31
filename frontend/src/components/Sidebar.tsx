import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertCircle, PlusCircle, Truck, Building2,
  Cpu, Atom, BarChart3, Radio, Database, Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'EMS Dashboard', icon: LayoutDashboard },
    { to: '/emergencies/new', label: 'Register Intake', icon: PlusCircle, badge: 'New' },
    { to: '/emergencies', label: 'Active Emergencies', icon: AlertCircle },
    { to: '/ambulances', label: 'Ambulance Fleet', icon: Truck },
    { to: '/hospitals', label: 'Hospital Registry', icon: Building2 },
    { to: '/optimization', label: 'Optimization Center', icon: Cpu },
    { to: '/quantum', label: 'Quantum Lab (QAOA)', icon: Atom, badge: 'QUBO' },
    { to: '/benchmark', label: 'Empirical Benchmark', icon: BarChart3 },
    { to: '/dispatches', label: 'Dispatches & Tracking', icon: Radio },
    { to: '/data-sources', label: 'Data Sources & Freshness', icon: Database },
    { to: '/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-slate-800">
        <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
          Command Operations
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span>Engine Status</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          HiGHS MILP &bull; Qiskit QAOA
        </div>
      </div>
    </aside>
  );
};
