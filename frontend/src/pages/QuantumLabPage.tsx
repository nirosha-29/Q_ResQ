import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { Atom, Cpu, Binary, GitBranch, Activity, Info } from 'lucide-react'

export default function QuantumLabPage() {
  const [searchParams] = useSearchParams()
  const runId = searchParams.get('run')
  const [runs, setRuns] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listOptimizationRuns().then(data => {
      setRuns(data)
      if (runId) {
        const found = data.find((r: any) => r.id === runId)
        setSelected(found || data[0] || null)
      } else {
        setSelected(data[0] || null)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [runId])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Atom className="w-7 h-7 text-purple-400" />
          Quantum Lab
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          QUBO formulation · QAOA circuit metrics · Classical vs Quantum comparison
        </p>
      </div>

      {/* Theory Card */}
      <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-5">
        <h2 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" /> How Quantum Optimization Works in Q-ResQ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
          <div className="space-y-2">
            <p className="text-purple-400 font-semibold text-xs uppercase tracking-wider">1. QUBO Formulation</p>
            <p>The allocation problem is formulated as a Quadratic Unconstrained Binary Optimization (QUBO) problem. Binary decision variable x(e,a,h) = 1 if emergency e is assigned to ambulance a and hospital h.</p>
            <p className="text-gray-500 text-xs">Objective: Minimize total weighted transit time + constraint penalties.</p>
          </div>
          <div className="space-y-2">
            <p className="text-purple-400 font-semibold text-xs uppercase tracking-wider">2. QAOA Circuit</p>
            <p>The Quantum Approximate Optimization Algorithm (QAOA) maps QUBO variables to qubits. Cost and mixing Hamiltonians are applied using parameterized quantum gates (RZZ, RX).</p>
            <p className="text-gray-500 text-xs">Optimized with COBYLA classical optimizer over 10 iterations.</p>
          </div>
          <div className="space-y-2">
            <p className="text-purple-400 font-semibold text-xs uppercase tracking-wider">3. Execution & Fallback</p>
            <p>QAOA runs on Qiskit statevector simulator (full quantum state simulation). If quantum execution fails, an honest classical fallback is activated and clearly reported.</p>
            <p className="text-gray-500 text-xs">No fabricated quantum advantage claimed.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Atom className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No optimization runs yet.</p>
          <p className="text-gray-500 text-sm mt-1">Register an emergency and run allocation to generate quantum circuit data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Run Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Optimization Runs</p>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelected(run)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selected?.id === run.id
                      ? 'bg-purple-900/40 border border-purple-700/50'
                      : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <p className="font-mono text-purple-400 text-xs font-bold">{run.id}</p>
                  <p className="text-gray-300 text-xs mt-0.5 truncate">{run.scenario_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {run.quantum_executed ? (
                      <span className="text-xs text-purple-400 flex items-center gap-0.5"><Atom className="w-3 h-3" /> Q</span>
                    ) : null}
                    <span className="text-xs text-gray-500">{new Date(run.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details Panel */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">
              {/* Overview */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Run: <span className="font-mono text-purple-400">{selected.id}</span></h3>
                <p className="text-gray-400 text-sm mb-4">{selected.scenario_name}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <StatBox label="Emergencies" value={selected.emergencies_count} color="text-red-400" />
                  <StatBox label="Ambulances" value={selected.ambulances_count} color="text-blue-400" />
                  <StatBox label="Hospitals" value={selected.hospitals_count} color="text-green-400" />
                </div>
              </div>

              {/* QUBO Details */}
              <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-purple-300 font-semibold mb-4">
                  <Binary className="w-4 h-4" /> QUBO Problem Formulation
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <MetricRow label="Number of Qubits" value={selected.num_qubits?.toString() ?? '—'} />
                    <MetricRow label="Variables (e × a × h)" value={
                      `${selected.emergencies_count} × ${selected.ambulances_count} × ${selected.hospitals_count} = ${selected.emergencies_count * selected.ambulances_count * selected.hospitals_count}`
                    } />
                    <MetricRow label="Circuit Depth" value={selected.circuit_depth?.toString() ?? '—'} />
                    <MetricRow label="Total Gates" value={selected.circuit_gates_count?.toString() ?? '—'} />
                  </div>
                  <div className="space-y-2">
                    <MetricRow label="Optimal γ (gamma)" value={selected.optimal_gamma?.toFixed(4) ?? '—'} />
                    <MetricRow label="Optimal β (beta)" value={selected.optimal_beta?.toFixed(4) ?? '—'} />
                    <MetricRow label="Quantum Executed" value={selected.quantum_executed ? 'Yes ✓' : 'No'} />
                    <MetricRow label="Fallback Activated" value={selected.quantum_fallback_activated ? 'Yes' : 'No'} />
                  </div>
                </div>
              </div>

              {/* Classical vs Quantum */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-white font-semibold mb-4">
                  <Activity className="w-4 h-4" /> Classical vs Quantum Results
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4">
                    <p className="text-blue-400 text-xs font-semibold uppercase mb-3 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" /> Classical (MILP/HiGHS)
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <MetricRow label="Objective" value={selected.classical_objective?.toFixed(2)} />
                      <MetricRow label="Runtime" value={`${selected.classical_runtime_ms?.toFixed(1)} ms`} />
                      <MetricRow label="Served" value={selected.classical_served_count?.toString()} />
                      <MetricRow label="Unserved" value={selected.classical_unserved_count?.toString()} />
                    </div>
                  </div>
                  <div className="bg-purple-950/20 border border-purple-900/30 rounded-lg p-4">
                    <p className="text-purple-400 text-xs font-semibold uppercase mb-3 flex items-center gap-1">
                      <Atom className="w-3.5 h-3.5" /> Quantum (QAOA)
                    </p>
                    {selected.quantum_executed ? (
                      <div className="space-y-1.5 text-sm">
                        <MetricRow label="Objective" value={selected.quantum_objective?.toFixed(2) ?? '—'} />
                        <MetricRow label="Runtime" value={selected.quantum_runtime_ms ? `${selected.quantum_runtime_ms.toFixed(1)} ms` : '—'} />
                        <MetricRow label="Served" value={selected.quantum_served_count?.toString() ?? '—'} />
                        <MetricRow label="Unserved" value={selected.quantum_unserved_count?.toString() ?? '—'} />
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        {selected.quantum_fallback_activated
                          ? '⚠ Fell back to classical: problem too large or QAOA timeout'
                          : 'Quantum not executed for this run'}
                      </p>
                    )}
                  </div>
                </div>

                {selected.comparison_summary && (
                  <div className="mt-4 bg-gray-800/40 rounded-lg p-3 text-gray-300 text-sm">
                    <p className="text-gray-500 text-xs mb-1">Comparison Summary</p>
                    {selected.comparison_summary}
                  </div>
                )}
              </div>

              {/* Honesty notice */}
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4 text-amber-300 text-xs">
                <strong>Transparency Note:</strong> Quantum circuits run on Qiskit's statevector simulator (exact quantum state simulation) — not physical quantum hardware. QAOA at this problem scale does not demonstrate quantum advantage. Results are honest simulations for research and educational purposes.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-white text-right">{value ?? '—'}</span>
    </div>
  )
}
