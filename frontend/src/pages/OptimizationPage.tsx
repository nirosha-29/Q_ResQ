import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Cpu, RefreshCw, ChevronRight, CheckCircle, AlertCircle, Atom } from 'lucide-react'

interface OptRun {
  id: string
  triggered_by: string
  scenario_name: string
  emergencies_count: number
  ambulances_count: number
  hospitals_count: number
  classical_objective: number
  classical_runtime_ms: number
  classical_served_count: number
  classical_unserved_count: number
  quantum_executed: boolean
  quantum_fallback_activated: boolean
  quantum_objective?: number
  quantum_runtime_ms?: number
  num_qubits: number
  circuit_depth: number
  comparison_summary?: string
  created_at: string
}

export default function OptimizationPage() {
  const [runs, setRuns] = useState<OptRun[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchRuns = async () => {
    try {
      const data = await api.listOptimizationRuns()
      setRuns(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchRuns() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Optimization Runs</h1>
          <p className="text-gray-400 text-sm mt-1">Classical vs Quantum solver comparison history</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setRefreshing(true); fetchRuns() }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/benchmark"
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-white text-sm font-semibold"
          >
            <Atom className="w-4 h-4" />
            Run Benchmark
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Cpu className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No optimization runs yet.</p>
          <p className="text-gray-500 text-sm mt-1">Register an emergency and run optimization to see results here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map(run => (
            <div key={run.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-purple-400 font-bold text-sm">{run.id}</span>
                    {run.quantum_executed ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-900/40 border border-purple-700/40 text-purple-300 text-xs rounded">
                        <Atom className="w-3 h-3" /> Quantum Executed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                        <AlertCircle className="w-3 h-3" /> Classical Only
                      </span>
                    )}
                    {run.quantum_fallback_activated && (
                      <span className="px-2 py-0.5 bg-amber-900/40 text-amber-400 text-xs rounded border border-amber-700/40">Fallback Active</span>
                    )}
                  </div>
                  <p className="text-white text-sm font-medium">{run.scenario_name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {run.emergencies_count} emergencies · {run.ambulances_count} ambulances · {run.hospitals_count} hospitals ·{' '}
                    {new Date(run.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
                <Link
                  to={`/quantum?run=${run.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 rounded-lg text-purple-300 text-xs"
                >
                  Quantum Details <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Comparison table */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4">
                  <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5" /> Classical Solver (HiGHS MILP)
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <MetricRow label="Objective Value" value={run.classical_objective?.toFixed(2)} />
                    <MetricRow label="Runtime" value={`${run.classical_runtime_ms?.toFixed(1)} ms`} />
                    <MetricRow label="Served" value={run.classical_served_count?.toString()} good />
                    <MetricRow label="Unserved" value={run.classical_unserved_count?.toString()} bad={run.classical_unserved_count > 0} />
                  </div>
                </div>

                <div className="bg-purple-950/20 border border-purple-900/30 rounded-lg p-4">
                  <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Atom className="w-3.5 h-3.5" /> Quantum Solver (QAOA)
                  </p>
                  {run.quantum_executed ? (
                    <div className="space-y-1.5 text-sm">
                      <MetricRow label="Objective Value" value={run.quantum_objective?.toFixed(2) ?? '—'} />
                      <MetricRow label="Runtime" value={run.quantum_runtime_ms ? `${run.quantum_runtime_ms.toFixed(1)} ms` : '—'} />
                      <MetricRow label="Qubits" value={run.num_qubits?.toString() ?? '—'} />
                      <MetricRow label="Circuit Depth" value={run.circuit_depth?.toString() ?? '—'} />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      {run.quantum_fallback_activated
                        ? 'Quantum execution fell back to classical simulation'
                        : 'Quantum not executed for this run'}
                    </p>
                  )}
                </div>
              </div>

              {run.comparison_summary && (
                <div className="mt-3 bg-gray-800/30 rounded-lg px-4 py-2 text-gray-300 text-sm">
                  {run.comparison_summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricRow({ label, value, good, bad }: { label: string; value?: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={good ? 'text-green-400 font-medium' : bad ? 'text-red-400 font-medium' : 'text-white'}>
        {value ?? '—'}
      </span>
    </div>
  )
}
