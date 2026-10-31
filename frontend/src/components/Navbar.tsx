import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, Play, PlusCircle, UserCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  onScenarioLoaded?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onScenarioLoaded }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [loadingScenario, setLoadingScenario] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('Officer Rajesh Kumar (Dispatcher)');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format in Asia/Kolkata timezone
      const timeStr = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(now);
      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadScenario = async () => {
    try {
      setLoadingScenario(true);
      await api.loadDemoScenario();
      alert('Hackathon Demo Scenario loaded successfully! 3 emergencies, 2 ambulances, 3 hospitals.');
      if (onScenarioLoaded) onScenarioLoaded();
      navigate('/dashboard');
    } catch (err: any) {
      alert(`Failed to load scenario: ${err.message}`);
    } finally {
      setLoadingScenario(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Track info */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-white">Q-RESQ</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                    QUBITNOVA
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium tracking-wide">
                  Quantum AI &bull; EMS Coordination
                </div>
              </div>
            </Link>
          </div>

          {/* Timezone & Operational Clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-slate-300">
              <strong className="text-slate-400">IST (Asia/Kolkata):</strong> {currentTime || 'Loading...'}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {/* Load Hackathon Scenario Button */}
            <button
              onClick={handleLoadScenario}
              disabled={loadingScenario}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/50 text-purple-200 text-xs font-semibold shadow transition-all disabled:opacity-50"
              title="Loads standard hackathon demo with 3 emergencies, 2 ambulances, and 3 hospitals"
            >
              <Play className="h-3.5 w-3.5 text-purple-400 fill-current" />
              {loadingScenario ? 'Loading...' : 'LOAD HACKATHON SCENARIO'}
            </button>

            {/* Quick Register Button */}
            <Link
              to="/emergencies/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/30 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>NEW INTAKE</span>
            </Link>

            {/* User Profile Badge */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-200">{currentUser}</div>
                <div className="text-[10px] text-emerald-400">Online &bull; Command Active</div>
              </div>
              <UserCircle className="h-8 w-8 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Safety statement ribbon */}
      <div className="bg-amber-950/40 border-t border-amber-900/30 px-4 py-1 text-center text-[11px] text-amber-300/90 flex items-center justify-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
        <span>Decision-support prototype for resource coordination. Does not provide medical diagnosis or autonomous vehicle control.</span>
      </div>
    </header>
  );
};
