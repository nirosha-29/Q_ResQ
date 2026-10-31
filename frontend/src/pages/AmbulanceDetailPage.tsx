import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Ambulance } from '../types'
import { ProvenanceBadge } from '../components/StatusBadge'
import { ArrowLeft, Truck, Users, MapPin, Settings, Shield } from 'lucide-react'

export default function AmbulanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ambulance, setAmbulance] = useState<Ambulance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.getAmbulance(id).then(setAmbulance).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ambulance) return <div className="text-center text-gray-400 py-20">Ambulance not found</div>

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Ambulance {ambulance.id}</h1>
            {ambulance.is_demo && <ProvenanceBadge isDemo={true} />}
          </div>
          <p className="text-gray-400 text-sm">{ambulance.vehicle_type} · {ambulance.vehicle_number}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <Truck className="w-4 h-4" /> Vehicle Information
          </h3>
          <div className="space-y-2.5 text-sm">
            <InfoRow label="Unit ID" value={ambulance.id} mono />
            <InfoRow label="Vehicle Number" value={ambulance.vehicle_number} />
            <InfoRow label="Type" value={ambulance.vehicle_type} />
            <InfoRow label="Provider" value={ambulance.provider || '—'} />
            <InfoRow label="Operational Status" value={ambulance.operational_status} />
            <InfoRow label="Availability" value={ambulance.availability} />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <MapPin className="w-4 h-4" /> Location
          </h3>
          <div className="space-y-2.5 text-sm">
            <InfoRow label="Base" value={ambulance.base_location || '—'} />
            <InfoRow label="Current Location" value={ambulance.current_location_name || '—'} />
            <InfoRow label="Coordinates" value={`${ambulance.latitude?.toFixed(5)}, ${ambulance.longitude?.toFixed(5)}`} mono />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <Shield className="w-4 h-4" /> Capabilities & Equipment
          </h3>
          <div className="mb-3">
            <p className="text-gray-500 text-xs mb-2">Capabilities</p>
            <div className="flex flex-wrap gap-1">
              {(ambulance.capabilities || []).map(c => (
                <span key={c} className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/30 text-blue-300 text-xs rounded">{c}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-2">Equipment</p>
            <div className="flex flex-wrap gap-1">
              {(ambulance.equipment || []).map(e => (
                <span key={e} className="px-2 py-0.5 bg-green-900/40 border border-green-700/30 text-green-300 text-xs rounded">{e}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <Users className="w-4 h-4" /> Crew Members
          </h3>
          {ambulance.crew_members && ambulance.crew_members.length > 0 ? (
            <div className="space-y-3">
              {ambulance.crew_members.map(cm => (
                <div key={cm.id} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{cm.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${cm.shift_status === 'On Duty' ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {cm.shift_status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{cm.role} · {cm.qualification}</p>
                  {cm.certification && <p className="text-gray-500 text-xs">{cm.certification}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No crew assigned</p>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 text-sm">
        <Settings className="w-4 h-4 text-gray-500" />
        <span className="text-gray-400">Data Source:</span>
        <span className="text-gray-300">{ambulance.data_source || '—'}</span>
        <span className="text-gray-400">Verification:</span>
        <span className="text-gray-300">{ambulance.verification_status || '—'}</span>
        <span className="text-gray-400">Last Updated:</span>
        <span className="text-gray-300">{ambulance.last_updated ? new Date(ambulance.last_updated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className={mono ? 'font-mono text-blue-300' : 'text-white'}>{value}</span>
    </div>
  )
}
