import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Hospital } from '../types'
import { ProvenanceBadge } from '../components/StatusBadge'
import { ArrowLeft, Building2, MapPin, BedDouble, Shield, Activity } from 'lucide-react'

export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.getHospital(id).then(setHospital).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!hospital) return <div className="text-center text-gray-400 py-20">Hospital not found</div>

  const occupancy = hospital.total_bed_capacity
    ? Math.round((hospital.current_occupancy || 0) / hospital.total_bed_capacity * 100)
    : 0

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{hospital.name}</h1>
            {hospital.is_demo && <ProvenanceBadge isDemo={true} />}
          </div>
          <p className="text-gray-400 text-sm">{hospital.id} · {hospital.city}, {hospital.state}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <Building2 className="w-4 h-4" /> Hospital Information
          </h3>
          <div className="space-y-2.5 text-sm">
            <InfoRow label="Name" value={hospital.name} />
            <InfoRow label="Operational Status" value={hospital.operational_status} />
            <InfoRow label="ED Status" value={hospital.emergency_department_status} />
            <InfoRow label="Data Source" value={hospital.source || '—'} />
            <InfoRow label="Verification" value={hospital.verification_status || '—'} />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <MapPin className="w-4 h-4" /> Location
          </h3>
          <div className="space-y-2.5 text-sm">
            <InfoRow label="Address" value={hospital.address || '—'} />
            <InfoRow label="City" value={hospital.city || '—'} />
            <InfoRow label="State" value={hospital.state || '—'} />
            <InfoRow label="PIN" value={hospital.pin || '—'} />
            <InfoRow label="Coordinates" value={`${hospital.latitude?.toFixed(5)}, ${hospital.longitude?.toFixed(5)}`} mono />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <BedDouble className="w-4 h-4" /> Capacity
          </h3>
          {/* Occupancy bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Current Occupancy</span>
              <span className={occupancy > 85 ? 'text-red-400' : occupancy > 70 ? 'text-yellow-400' : 'text-green-400'}>
                {occupancy}%
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${occupancy > 85 ? 'bg-red-500' : occupancy > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${occupancy}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Capacity', value: hospital.total_bed_capacity },
              { label: 'Current Occupancy', value: hospital.current_occupancy },
              { label: 'Available Beds', value: hospital.available_beds, highlight: true, color: 'text-green-400' },
              { label: 'ICU Capacity', value: hospital.icu_capacity },
              { label: 'Available ICU', value: hospital.available_icu_beds, highlight: true, color: 'text-red-400' },
            ].map(({ label, value, highlight, color }) => (
              <div key={label} className="bg-gray-800/50 rounded-lg p-2 text-center">
                <p className={`font-bold text-lg ${highlight ? color : 'text-white'}`}>{value ?? '—'}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">
            <Shield className="w-4 h-4" /> Capabilities
          </h3>
          {hospital.capabilities && hospital.capabilities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {hospital.capabilities.map(c => (
                <span key={c} className="px-2 py-1 bg-green-900/40 border border-green-700/40 text-green-300 text-xs rounded">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No capabilities listed</p>
          )}
          <div className="mt-4 text-xs text-gray-500">
            Data freshness: <span className={`${hospital.data_freshness_status === 'Fresh' ? 'text-green-400' : 'text-yellow-400'}`}>
              {hospital.data_freshness_status || 'Unknown'}
            </span>
          </div>
        </div>
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
