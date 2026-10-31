import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Ambulance } from '../types'
import { StatusBadge, ProvenanceBadge } from '../components/StatusBadge'
import { Truck, Search, RefreshCw, ChevronRight, Users } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-500',
  'On Scene': 'bg-yellow-500',
  Transporting: 'bg-blue-500',
  Maintenance: 'bg-gray-500',
  Offline: 'bg-red-500',
}

export default function AmbulancesPage() {
  const navigate = useNavigate()
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await api.listAmbulances()
      setAmbulances(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = ambulances.filter(a =>
    !search ||
    a.id.toLowerCase().includes(search.toLowerCase()) ||
    a.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    (a.provider || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.current_location_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: ambulances.length,
    active: ambulances.filter(a => a.operational_status === 'Active').length,
    available: ambulances.filter(a => a.availability === 'Available').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ambulance Fleet</h1>
          <p className="text-gray-400 text-sm mt-1">Fleet monitor — {stats.active} active, {stats.available} available</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Fleet', value: stats.total, color: 'text-white' },
          { label: 'Active Units', value: stats.active, color: 'text-green-400' },
          { label: 'Available', value: stats.available, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by unit ID, number, provider, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm outline-none flex-1"
          />
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData() }}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(amb => (
            <div
              key={amb.id}
              onClick={() => navigate(`/ambulances/${amb.id}`)}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-600/50 hover:bg-gray-800/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-900/40 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-mono text-blue-400 font-bold">{amb.id}</p>
                    <p className="text-white text-sm font-medium">{amb.vehicle_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[amb.operational_status] || 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-400">{amb.operational_status}</span>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <p className="text-gray-300 text-sm"><span className="text-gray-500">Type:</span> {amb.vehicle_type}</p>
                <p className="text-gray-300 text-sm"><span className="text-gray-500">Location:</span> {amb.current_location_name || 'Unknown'}</p>
                <p className="text-gray-300 text-sm"><span className="text-gray-500">Provider:</span> {amb.provider || '—'}</p>
              </div>

              {/* Capabilities */}
              {amb.capabilities && amb.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {amb.capabilities.slice(0, 4).map(c => (
                    <span key={c} className="px-1.5 py-0.5 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-700/30">{c}</span>
                  ))}
                  {amb.capabilities.length > 4 && (
                    <span className="px-1.5 py-0.5 text-gray-500 text-xs">+{amb.capabilities.length - 4}</span>
                  )}
                </div>
              )}

              {/* Crew */}
              {amb.crew_members && amb.crew_members.length > 0 && (
                <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                  <Users className="w-3.5 h-3.5" />
                  <span>{amb.crew_members.length} crew: {amb.crew_members.map(c => c.role).join(', ')}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    amb.availability === 'Available' ? 'bg-green-900/40 text-green-400' :
                    'bg-yellow-900/40 text-yellow-400'
                  }`}>{amb.availability}</span>
                  {amb.is_demo ? <ProvenanceBadge isDemo={true} /> : null}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
