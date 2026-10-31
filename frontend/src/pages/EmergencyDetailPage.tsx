import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Emergency, EmergencyPriority } from '../types'
import { PriorityBadge, StatusBadge, ProvenanceBadge } from '../components/StatusBadge'
import { ExplanationCard } from '../components/ExplanationCard'
import {
  ArrowLeft, MapPin, User, Phone, Clock, Activity,
  Zap, AlertTriangle, ChevronRight
} from 'lucide-react'

export default function EmergencyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [emergency, setEmergency] = useState<Emergency | null>(null)
  const [loading, setLoading] = useState(true)
  const [prioritizing, setPrioritizing] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getEmergency(id).then(setEmergency).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleReprioritize = async () => {
    if (!id) return
    setPrioritizing(true)
    try {
      const result = await api.prioritizeEmergency(id)
      setEmergency(prev => prev ? {
        ...prev,
        calculated_priority: result.calculated_priority,
        priority_score: result.priority_score,
        priority_explanation: result.explanation
      } : null)
    } catch (e) { console.error(e) }
    finally { setPrioritizing(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!emergency) return (
    <div className="text-center text-gray-400 py-20">Emergency not found</div>
  )

  const canAllocate = ['Awaiting Allocation', 'Registered', 'Prioritizing'].includes(emergency.status)

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Emergency {emergency.id}</h1>
            {emergency.is_demo ? <ProvenanceBadge isDemo={true} /> : null}
          </div>
          <p className="text-gray-400 text-sm">{emergency.emergency_type} · Registered {new Date(emergency.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>
      </div>

      {/* Priority + Status row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
          <span className="text-gray-400 text-sm">Priority:</span>
          <PriorityBadge priority={emergency.calculated_priority} />
          <span className="text-gray-400 text-sm">Score: <strong className="text-white">{emergency.priority_score?.toFixed(1) ?? '—'}</strong></span>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
          <span className="text-gray-400 text-sm">Status:</span>
          <StatusBadge status={emergency.status} />
        </div>
        <button
          onClick={handleReprioritize}
          disabled={prioritizing}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 rounded-xl text-purple-300 text-sm disabled:opacity-50"
        >
          <Activity className={`w-4 h-4 ${prioritizing ? 'animate-spin' : ''}`} />
          Recalculate Priority
        </button>
        {canAllocate && (
          <Link
            to={`/allocation/${emergency.id}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold text-sm"
          >
            <Zap className="w-4 h-4" />
            Run Optimization
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Patient Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Patient Information
          </h3>
          <div className="space-y-3">
            <InfoRow label="Patient ID" value={emergency.patient_id ?? '—'} mono />
            <InfoRow label="Name" value={emergency.patient_name || '—'} />
            <InfoRow label="Age" value={emergency.patient_age?.toString() ?? '—'} />
            <InfoRow label="Gender" value={emergency.patient_gender || '—'} />
            <InfoRow label="Patient Count" value={emergency.patient_count?.toString() ?? '1'} />
          </div>
        </div>

        {/* Emergency Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Emergency Details
          </h3>
          <div className="space-y-3">
            <InfoRow label="Type" value={emergency.emergency_type} />
            <InfoRow label="Reported Severity" value={emergency.reported_severity || '—'} />
            <InfoRow label="Symptoms" value={emergency.symptoms || '—'} />
            {emergency.additional_notes && (
              <InfoRow label="Notes" value={emergency.additional_notes} />
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </h3>
          <div className="space-y-3">
            {emergency.address && <InfoRow label="Address" value={emergency.address} />}
            <InfoRow label="Coordinates" value={`${emergency.latitude?.toFixed(5)}, ${emergency.longitude?.toFixed(5)}`} mono />
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Requirements
          </h3>
          <div className="mb-3">
            <p className="text-gray-400 text-xs mb-2">Required Capabilities</p>
            {emergency.required_capabilities && emergency.required_capabilities.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {emergency.required_capabilities.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 text-blue-300 text-xs rounded">{c}</span>
                ))}
              </div>
            ) : <p className="text-gray-500 text-xs">None specified</p>}
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2">Required Equipment</p>
            {emergency.required_equipment && emergency.required_equipment.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {emergency.required_equipment.map(eq => (
                  <span key={eq} className="px-2 py-0.5 bg-green-900/40 border border-green-700/40 text-green-300 text-xs rounded">{eq}</span>
                ))}
              </div>
            ) : <p className="text-gray-500 text-xs">None specified</p>}
          </div>
        </div>
      </div>

      {/* Priority Explanation */}
      {emergency.priority_explanation && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Priority Calculation Explanation</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{emergency.priority_explanation}</p>
          {emergency.priority_score !== undefined && (
            <p className="text-xs text-slate-400 mt-3">
              Calculated score: <span className="font-mono text-white">{emergency.priority_score.toFixed(1)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-400 text-sm flex-shrink-0">{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono text-blue-300' : 'text-white'}`}>{value}</span>
    </div>
  )
}
