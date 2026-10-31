import React, { useState } from 'react'
import { api } from '../services/api'
import { Atom, Play, Loader, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'

interface BenchmarkRow {
  metric: string
  classical: any
  quantum: any
  difference: string
  note: string
}

interface BenchmarkResult {
  run_timestamp: string
  execution_environment: string
  metrics_table: BenchmarkRow[]
  summary_analysis: string
  honesty_declaration: string
}

export default function BenchmarkPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [error, setError] = useState('')
  const [includeQuantum, setIncludeQuantum] = useState(true)
  const [shots, setShots] = useState(512)

  const handleRun = async () => {
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const data = await api.runBenchmark({ scenarios_to_run: 1, include_quantum: includeQuantum, shots })
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Benchmark failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-purple-400" />
          Classical vs Quantum Benchmark
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Empirical comparison of HiGHS MILP solver vs QAOA solver on identical allocation scenarios
        </p>
      </div>

      {/* Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-gray-300 font-semibold mb-4">Benchmark Configuration</h3>
        <div className="flex flex-wrap gap-5 items-end">
          <div>
            <label className="text-gray-400 text-sm block mb-1">QAOA Shots</label>
            <select
              value={shots}
              onChange={e => setShots(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value={256}>256</option>
              <option value={512}>512</option>
              <option value={1024}>1024</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeQ"
              checked={includeQuantum}
              onChange={e => setIncludeQuantum(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="includeQ" className="text-gray-300 text-sm">Include Quantum (QAOA)</label>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm"
          >
            {running ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running Benchmark...' : 'Run Benchmark'}
          </button>
        </div>
        {running && (
          <div className="mt-4 flex items-center gap-3 text-purple-300 text-sm">
            <Atom className="w-4 h-4 animate-pulse" />
            Running classical MILP solver... then QAOA with {shots} shots... This may take 15-60 seconds.
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 flex gap-2 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-300 font-semibold">Benchmark Completed</p>
              <p className="text-gray-400 text-sm">
                {new Date(result.run_timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {result.execution_environment}
              </p>
            </div>
          </div>

          {/* Metrics Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs uppercase tracking-wider">Metric</th>
                    <th className="text-center px-4 py-3 text-blue-400 text-xs uppercase tracking-wider">Classical (MILP)</th>
                    <th className="text-center px-4 py-3 text-purple-400 text-xs uppercase tracking-wider">Quantum (QAOA)</th>
                    <th className="text-center px-4 py-3 text-gray-400 text-xs uppercase tracking-wider">Difference</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-xs uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {result.metrics_table.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-800/20">
                      <td className="px-4 py-3 text-gray-300 font-medium">{row.metric}</td>
                      <td className="px-4 py-3 text-center text-blue-300 font-mono">{String(row.classical)}</td>
                      <td className="px-4 py-3 text-center text-purple-300 font-mono">{String(row.quantum)}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{row.difference}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Analysis Summary</h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{result.summary_analysis}</p>
          </div>

          {/* Honesty declaration */}
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4 text-amber-300 text-xs">
            <strong>Honesty Declaration:</strong> {result.honesty_declaration}
          </div>
        </div>
      )}
    </div>
  )
}
