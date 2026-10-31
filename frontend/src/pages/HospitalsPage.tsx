import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Hospital } from '../types'
import { ProvenanceBadge } from '../components/StatusBadge'
import { Building2, Search, RefreshCw, ChevronRight, BedDouble } from 'lucide-react'

export default function HospitalsPage() {
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await api.listHospitals()
      setHospitals(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = hospitals.filter(h =>
    !search ||
    h.id.toLowerCase().includes(search.toLowerCase()) ||
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.city || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalBeds = hospitals.reduce((s, h) => s + (h.available_beds || 0), 0)
  const totalICU = hospitals.reduce((s, h) => s + (h.available_icu_beds || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hospital Registry</h1>
          <p className="text-gray-400 text-sm mt-1">{hospitals.length} hospitals · {totalBeds} available beds · {totalICU} ICU beds</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Hospitals', value: hospitals.length, color: 'text-white' },
          { label: 'Available Beds', value: totalBeds, color: 'text-green-400' },
          { label: 'Available ICU Beds', value: totalICU, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search hospitals by name, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm outline-none flex-1"
          />
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData() }}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(h => {
            const occupancy = h.total_bed_capacity ? Math.round((h.current_occupancy || 0) / h.total_bed_capacity * 100) : 0
            return (
              <div
                key={h.id}
                onClick={() => navigate(`/hospitals/${h.id}`)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-600/50 hover:bg-gray-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-900/40 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-mono text-green-400 text-xs font-bold">{h.id}</p>
                      <p className="text-white text-sm font-semibold leading-tight max-w-[160px]">{h.name}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    h.operational_status === 'Active' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                  }`}>{h.operational_status}</span>
                </div>

                <p className="text-gray-400 text-xs mb-3">{h.city}, {h.state}</p>

                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Occupancy</span>
                    <span>{occupancy}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancy > 85 ? 'bg-red-500' : occupancy > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-green-400 font-bold">{h.available_beds ?? '—'}</p>
                    <p className="text-gray-500 text-xs">Available Beds</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-red-400 font-bold">{h.available_icu_beds ?? '—'}</p>
                    <p className="text-gray-500 text-xs">ICU Beds</p>
                  </div>
                </div>

                {/* Capabilities */}
                {h.capabilities && h.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {h.capabilities.slice(0, 3).map(c => (
                      <span key={c} className="px-1.5 py-0.5 bg-green-900/30 text-green-300 text-xs rounded border border-green-700/30">{c}</span>
                    ))}
                    {h.capabilities.length > 3 && (
                      <span className="text-gray-500 text-xs px-1">+{h.capabilities.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      h.emergency_department_status === 'Open' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                    }`}>ED: {h.emergency_department_status}</span>
                    {h.is_demo && <ProvenanceBadge isDemo={true} />}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
