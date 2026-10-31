import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Activity, AlertTriangle, Shield, Zap } from 'lucide-react'

const DEMO_USERS = [
  { username: 'dispatcher1', role: 'EMS Dispatcher', icon: Shield, color: 'from-blue-600 to-blue-800' },
  { username: 'admin1', role: 'System Administrator', icon: Zap, color: 'from-purple-600 to-purple-800' },
  { username: 'coordinator1', role: 'Hospital Coordinator', icon: Activity, color: 'from-green-600 to-green-800' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualUsername, setManualUsername] = useState('')
  const [manualPassword, setManualPassword] = useState('')

  const handleLogin = async (username: string, password: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.login(username, password)
      localStorage.setItem('q_resq_user', JSON.stringify(res.user))
      navigate('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLogin(manualUsername, manualPassword)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/50">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-gray-950 animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Q-ResQ</h1>
          <p className="text-red-400 font-semibold text-sm mt-1 tracking-widest uppercase">Every Second Matters. Every Resource Counts.</p>
          <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto">
            AI-Powered Emergency Medical Services Resource Allocation & Hospital Coordination Platform
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded border border-purple-700">⚛ Quantum AI</span>
            <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-700">QUBITNOVA</span>
          </div>
        </div>

        {/* Safety Notice */}
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 mb-6 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-xs">
            <strong>PROTOTYPE / HACKATHON DEMO:</strong> This system uses simulated data. 
            Not for real emergency response operations.
          </p>
        </div>

        {/* Demo account selection */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">Demo Accounts — Select a Username</p>
          <div className="space-y-3">
            {DEMO_USERS.map(({ username, role, icon: Icon, color }) => (
              <button
                key={username}
                type="button"
                onClick={() => setManualUsername(username)}
                disabled={loading}
                className={`w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${color} hover:opacity-90 transition-all duration-150 disabled:opacity-50 group ${manualUsername === username ? 'ring-2 ring-white' : ''}`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">{role}</p>
                  <p className="text-white/70 text-xs">@{username}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual login */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <form onSubmit={handleManualLogin} className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={manualUsername}
              onChange={e => setManualUsername(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={manualPassword}
              onChange={e => setManualPassword(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-gray-500 text-xs mt-3">Use the demo password configured by the local server administrator.</p>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          Hackathon Project · QUBITNOVA · Quantum AI &amp; Software Track
        </p>
      </div>
    </div>
  )
}
