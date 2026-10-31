import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Dispatch } from '../types'
import { StatusBadge, ProvenanceBadge } from '../components/StatusBadge'
import { Navigation, RefreshCw, MapPin, Truck, Building2 } from 'lucide-react'

export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const data = await api.listDispatches()
      setDispatches(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchData() }, [])

  const active = dispatches.filter(d => ['Dispatched', 'En Route', 'On Scene', 'Transporting'].includes(d.status))
  const completed = dispatches.filter(d => d.status === 'Completed')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Dispatches</h1>
          <p className="text-gray-400 text-sm mt-1">{active.length} active · {completed.length} completed</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchData() }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dispatches.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Navigation className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No dispatches yet.</p>
          <p className="text-gray-500 text-sm mt-1">Confirm an allocation to create a dispatch record.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Active</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map(d => <DispatchCard key={d.id} dispatch={d} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Completed</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map(d => <DispatchCard key={d.id} dispatch={d} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DispatchCard({ dispatch: d }: { dispatch: Dispatch }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-blue-400 font-bold text-sm">{d.id}</p>
          <p className="text-gray-300 text-sm">Emergency: <span className="text-white font-medium">{d.emergency_id}</span></p>
        </div>
        <StatusBadge status={d.status} />
      </div>

      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-blue-400" />
          Ambulance: <span className="text-gray-200">{d.ambulance_id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-green-400" />
          Hospital: <span className="text-gray-200">{d.hospital_id}</span>
        </div>
        {d.notes && (
          <p className="text-gray-500 text-xs pt-1 border-t border-gray-800">{d.notes}</p>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
        Dispatched: {new Date(d.dispatched_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        {d.completed_at && (
          <span className="ml-3">Completed: {new Date(d.completed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
        )}
      </div>
    </div>
  )
}
