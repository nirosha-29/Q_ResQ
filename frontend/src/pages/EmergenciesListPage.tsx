import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Emergency } from '../types'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import { Plus, Search, Filter, RefreshCw, AlertTriangle } from 'lucide-react'

const STATUSES = ['', 'Awaiting Allocation', 'Awaiting Approval', 'Dispatched', 'En Route', 'Completed', 'Cancelled', 'Unserved']
const PRIORITIES = ['', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW']

export default function EmergenciesListPage() {
  const navigate = useNavigate()
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchEmergencies = async () => {
    try {
      const data = await api.listEmergencies(
        statusFilter || undefined,
        priorityFilter || undefined
      )
      setEmergencies(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchEmergencies() }, [statusFilter, priorityFilter])

  const filtered = emergencies.filter(e =>
    !search ||
    e.id.toLowerCase().includes(search.toLowerCase()) ||
    (e.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
    e.emergency_type.toLowerCase().includes(search.toLowerCase()) ||
    (e.address || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleRefresh = () => {
    setRefreshing(true)
    fetchEmergencies()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Emergency Registry</h1>
          <p className="text-gray-400 text-sm mt-1">All registered emergencies — {emergencies.length} total</p>
        </div>
        <Link
          to="/emergencies/new"
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Emergency
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, name, type, address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            {PRIORITIES.map(p => <option key={p} value={p}>{p || 'All Priorities'}</option>)}
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No emergencies found</p>
            <Link to="/emergencies/new" className="mt-3 text-red-400 hover:text-red-300 text-sm underline">
              Register a new emergency
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Patient</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Registered</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(e => (
                  <tr
                    key={e.id}
                    className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/emergencies/${e.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-blue-400 font-semibold">{e.id}</span>
                      {e.is_demo ? <span className="ml-1 text-xs text-amber-500">DEMO</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{e.patient_name || 'Unknown'}</p>
                      <p className="text-gray-400 text-xs">Age {e.patient_age ?? '?'} · {e.patient_gender || '?'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-200">{e.emergency_type}</td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={e.calculated_priority} />
                      <p className="text-xs text-gray-500 mt-0.5">Score: {e.priority_score?.toFixed(0) ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-[180px] truncate">
                      {e.address || `${e.latitude?.toFixed(4)}, ${e.longitude?.toFixed(4)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2" onClick={ev => ev.stopPropagation()}>
                        <Link
                          to={`/emergencies/${e.id}`}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs border border-blue-600/30"
                        >
                          Details
                        </Link>
                        {(e.status === 'Awaiting Allocation' || e.status === 'Registered') && (
                          <Link
                            to={`/allocation/${e.id}`}
                            className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs border border-green-600/30"
                          >
                            Allocate
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
