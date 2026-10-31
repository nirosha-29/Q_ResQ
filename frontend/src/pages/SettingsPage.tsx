import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, User, Info, Shield, Atom } from 'lucide-react'
import { api } from '../services/api'

export default function SettingsPage() {
  const navigate = useNavigate()
  const userRaw = localStorage.getItem('q_resq_user')
  const user = userRaw ? JSON.parse(userRaw) : null

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch (error) {
      alert(error instanceof Error ? `Logout could not reach the server: ${error.message}` : 'Logout could not reach the server.')
    } finally {
      localStorage.removeItem('q_resq_user')
      navigate('/login')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-400" />
          Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">Account and system configuration</p>
      </div>

      {/* Current User */}
      {user && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <User className="w-4 h-4" /> Current Session
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-900/40 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold">{user.full_name}</p>
              <p className="text-gray-400 text-sm">@{user.username} · {user.role}</p>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800/40 rounded-lg text-red-400 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}

      {/* Project Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
          <Info className="w-4 h-4" /> Project Information
        </h3>
        <div className="space-y-2 text-sm">
          <InfoRow label="Project" value="Q-ResQ" />
          <InfoRow label="Team" value="QUBITNOVA" />
          <InfoRow label="Track" value="Quantum AI & Software" />
          <InfoRow label="Tagline" value="Every Second Matters. Every Resource Counts." />
          <InfoRow label="Backend" value="Python 3.14 + FastAPI + SQLAlchemy" />
          <InfoRow label="Frontend" value="React 18 + TypeScript + Vite + Tailwind" />
          <InfoRow label="Classical Solver" value="SciPy MILP (HiGHS)" />
          <InfoRow label="Quantum Solver" value="Qiskit QAOA (Statevector Simulator)" />
        </div>
      </div>

      {/* Safety Statement */}
      <div className="bg-amber-950/20 border border-amber-700/40 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-amber-400 font-semibold mb-3">
          <Shield className="w-4 h-4" /> Safety & Limitations Statement
        </h3>
        <div className="space-y-2 text-amber-300 text-sm">
          <p>• This is a <strong>hackathon prototype</strong>. All data is simulated.</p>
          <p>• No live GPS, real-time ambulance data, or actual hospital bed availability is integrated.</p>
          <p>• QAOA runs on Qiskit statevector simulator, not real quantum hardware.</p>
          <p>• No quantum advantage is claimed for practical EMS at current scale.</p>
          <p>• <strong>This system must NOT be used for real emergency dispatch decisions.</strong></p>
        </div>
      </div>

      {/* Quantum Notice */}
      <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-5">
        <h3 className="flex items-center gap-2 text-purple-300 font-semibold mb-3">
          <Atom className="w-4 h-4" /> Quantum Computing Note
        </h3>
        <p className="text-gray-300 text-sm">
          The quantum optimization uses Qiskit's statevector simulator for exact quantum state simulation.
          QAOA (Quantum Approximate Optimization Algorithm) is applied to the QUBO-formulated resource allocation problem.
          At small scales (≤12 variables), this provides educational demonstration of quantum optimization workflow.
          Honest comparison with classical MILP is provided without fabricated speedups.
        </p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
