import {
  Emergency, EmergencyCreate, EmergencyPriority, Ambulance, Hospital, Allocation, Dispatch,
  OptimizationResponse, OptimizationRunDetail, BenchmarkResponse, DataSource,
  AuditLog, DashboardStats, User
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const err = await response.json();
      const detail = err.detail || err.message;
      errorDetail = typeof detail === 'string' ? detail : errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    if (response.status === 401 && !url.endsWith('/auth/login')) {
      localStorage.removeItem('q_resq_user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => fetchJson<{ status: string; service: string; version: string; safety_statement: string }>(`${BASE_URL}/health`),

  // Dashboard Stats
  getDashboardStats: () => fetchJson<DashboardStats>(`${BASE_URL}/dashboard/stats`),

  // Emergencies
  listEmergencies: (status?: string, priority?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Emergency[]>(`${BASE_URL}/emergencies${query}`);
  },
  getEmergencies: (status?: string, priority?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Emergency[]>(`${BASE_URL}/emergencies${query}`);
  },
  getEmergency: (id: string) => fetchJson<Emergency>(`${BASE_URL}/emergencies/${id}`),
  registerEmergency: (data: EmergencyCreate) =>
    fetchJson<Emergency>(`${BASE_URL}/emergencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  prioritizeEmergency: (id: string) =>
    fetchJson<{ emergency_id: string; calculated_priority: EmergencyPriority; priority_score: number; explanation: string }>(
      `${BASE_URL}/emergencies/${id}/prioritize`,
      { method: 'POST' }
    ),
  recalculatePriority: (id: string) =>
    fetchJson<{ emergency_id: string; calculated_priority: EmergencyPriority; priority_score: number; explanation: string }>(
      `${BASE_URL}/emergencies/${id}/prioritize`,
      { method: 'POST' }
    ),
  getAmbulanceCandidates: (id: string) => fetchJson<Ambulance[]>(`${BASE_URL}/emergencies/${id}/ambulance-candidates`),
  getHospitalCandidates: (id: string) => fetchJson<Hospital[]>(`${BASE_URL}/emergencies/${id}/hospital-candidates`),

  // Optimization & Allocation
  optimizeEmergency: (id: string) =>
    fetchJson<OptimizationResponse>(`${BASE_URL}/emergencies/${id}/optimize`, {
      method: 'POST',
    }),
  getAllocation: (id: string) => fetchJson<Allocation>(`${BASE_URL}/allocations/${id}`),
  approveAllocation: (id: string, approvedBy: string = 'EMS Dispatcher') =>
    fetchJson<Allocation>(`${BASE_URL}/allocations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    }),
  rejectAllocation: (id: string, reason: string) =>
    fetchJson<Allocation>(`${BASE_URL}/allocations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Dispatches
  confirmDispatch: (allocationId: string, notes?: string, dispatcherName: string = 'Duty Officer') =>
    fetchJson<Dispatch>(`${BASE_URL}/dispatches/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        allocation_id: allocationId,
        dispatcher_name: dispatcherName,
        notes: notes || 'Standard priority dispatch order.',
      }),
    }),
  listDispatches: () => fetchJson<Dispatch[]>(`${BASE_URL}/dispatches`),
  getDispatches: () => fetchJson<Dispatch[]>(`${BASE_URL}/dispatches`),
  updateDispatchStatus: (dispatchId: string, newStatus: string) =>
    fetchJson<{ status: string; dispatch_id: string; current_status: string }>(
      `${BASE_URL}/dispatches/${dispatchId}/status?new_status=${encodeURIComponent(newStatus)}`,
      { method: 'POST' }
    ),

  // Ambulances & Hospitals
  listAmbulances: () => fetchJson<Ambulance[]>(`${BASE_URL}/ambulances`),
  getAmbulances: () => fetchJson<Ambulance[]>(`${BASE_URL}/ambulances`),
  getAmbulance: (id: string) => fetchJson<Ambulance>(`${BASE_URL}/ambulances/${id}`),
  listHospitals: () => fetchJson<Hospital[]>(`${BASE_URL}/hospitals`),
  getHospitals: () => fetchJson<Hospital[]>(`${BASE_URL}/hospitals`),
  getHospital: (id: string) => fetchJson<Hospital>(`${BASE_URL}/hospitals/${id}`),

  // Optimization Runs & Benchmarks
  listOptimizationRuns: () => fetchJson<OptimizationRunDetail[]>(`${BASE_URL}/optimization`),
  getOptimizationRuns: () => fetchJson<OptimizationRunDetail[]>(`${BASE_URL}/optimization`),
  getOptimizationRun: (id: string) => fetchJson<OptimizationRunDetail>(`${BASE_URL}/optimization/${id}`),
  runBenchmark: (opts: { scenarios_to_run?: number; include_quantum?: boolean; shots?: number } = {}) =>
    fetchJson<BenchmarkResponse>(`${BASE_URL}/benchmark`, {
      method: 'POST',
      body: JSON.stringify({
        scenarios_to_run: opts.scenarios_to_run ?? 1,
        include_quantum: opts.include_quantum ?? true,
        shots: opts.shots ?? 512,
      }),
    }),

  // Data Sources & Audit Logs
  listDataSources: () => fetchJson<DataSource[]>(`${BASE_URL}/data-sources`),
  getDataSources: () => fetchJson<DataSource[]>(`${BASE_URL}/data-sources`),
  listAuditLogs: () => fetchJson<AuditLog[]>(`${BASE_URL}/data-sources/audit-logs`),
  getAuditLogs: () => fetchJson<AuditLog[]>(`${BASE_URL}/data-sources/audit-logs`),

  // Demo Scenarios
  loadDemoScenario: () => fetchJson<{ status: string; message: string }>(`${BASE_URL}/demo/load-scenario`, { method: 'POST' }),

  // Auth
  login: (username: string, password: string) =>
    fetchJson<{ user: User; message: string }>(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => fetchJson<{ message: string }>(`${BASE_URL}/auth/logout`, { method: 'POST' }),
  getDemoUsers: () => fetchJson<User[]>(`${BASE_URL}/auth/users`),
};
