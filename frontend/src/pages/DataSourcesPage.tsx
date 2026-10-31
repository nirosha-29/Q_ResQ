import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Database, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  data_type: string
  provider: string
  status: string
  last_retrieved: string
  record_count: number
  coverage_area: string
  verification_status: string
  is_real: boolean
  notes?: string
}

interface AuditLog {
  id: number
  event_type: string
  entity_id: string
  actor_id: string
  actor_role: string
  details: string
  timestamp: string
}

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const [srcs, logs] = await Promise.all([
        api.listDataSources(),
        api.listAuditLogs()
      ])
      setSources(srcs)
      setAuditLogs(logs)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Sources & Audit Trail</h1>
          <p className="text-gray-400 text-sm mt-1">Data provenance, freshness, and system audit log</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData() }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Safety / Disclaimer Banner */}
      <div className="bg-amber-950/20 border border-amber-700/40 rounded-xl p-4 text-amber-300 text-sm">
        <strong>⚠ Prototype Data Notice:</strong> All data in Q-ResQ is simulated for hackathon demonstration purposes.
        Live GPS locations, real-time bed occupancy, and actual ambulance availability are NOT integrated.
        This system must NOT be used for real emergency operations.
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Data Sources */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <h3 className="text-white font-semibold">Data Sources</h3>
              <span className="text-gray-500 text-sm">({sources.length})</span>
            </div>
            {sources.length === 0 ? (
              <p className="text-gray-500 text-sm p-5">No data sources registered</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3">Source</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Provider</th>
                      <th className="text-left px-4 py-3">Records</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Real Data?</th>
                      <th className="text-left px-4 py-3">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {sources.map(s => (
                      <tr key={s.id} className="hover:bg-gray-800/20">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{s.name}</p>
                          <p className="text-gray-500 text-xs">{s.coverage_area}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{s.data_type}</td>
                        <td className="px-4 py-3 text-gray-300">{s.provider}</td>
                        <td className="px-4 py-3 text-gray-300">{s.record_count}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            s.status === 'Active' ? 'bg-green-900/40 text-green-400' :
                            s.status === 'Stale' ? 'bg-yellow-900/40 text-yellow-400' :
                            'bg-red-900/40 text-red-400'
                          }`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.is_real ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Live</span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-400 text-xs"><AlertCircle className="w-3 h-3" /> Demo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(s.last_retrieved).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Log */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold">Audit Trail</h3>
              <span className="text-gray-500 text-sm">({auditLogs.length} events)</span>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-sm p-5">No audit events</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
                {auditLogs.slice().reverse().map(log => (
                  <div key={log.id} className="px-5 py-3 hover:bg-gray-800/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 text-xs rounded font-mono">{log.event_type}</span>
                          <span className="text-gray-500 text-xs">by {log.actor_id} ({log.actor_role})</span>
                        </div>
                        <p className="text-gray-300 text-sm">{log.details}</p>
                        <p className="text-gray-500 text-xs mt-0.5">Entity: {log.entity_id}</p>
                      </div>
                      <p className="text-gray-500 text-xs flex-shrink-0">
                        {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
