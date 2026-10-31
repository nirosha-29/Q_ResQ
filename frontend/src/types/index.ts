export type EmergencyPriority = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type EmergencyStatus =
  | 'Registered'
  | 'Prioritizing'
  | 'Awaiting Allocation'
  | 'Allocated'
  | 'Awaiting Approval'
  | 'Dispatched'
  | 'En Route'
  | 'At Scene'
  | 'Transporting'
  | 'At Hospital'
  | 'Completed'
  | 'Cancelled'
  | 'Unserved';

export interface EmergencyRequirement {
  capabilities: string[];
  equipment: string[];
}

export interface Emergency {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  patient_count: number;
  emergency_type: string;
  symptoms: string;
  reported_severity: string;
  additional_notes?: string;
  address: string;
  latitude: number;
  longitude: number;
  calculated_priority?: EmergencyPriority;
  priority_score?: number;
  priority_explanation?: string;
  status: EmergencyStatus;
  is_demo: number;
  created_at: string;
  updated_at: string;
  required_capabilities: string[];
  required_equipment: string[];
}

export interface EmergencyCreate {
  patient_id?: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  patient_count: number;
  emergency_type: string;
  symptoms: string;
  reported_severity: string;
  additional_notes?: string;
  address: string;
  latitude: number;
  longitude: number;
  required_capabilities: string[];
  required_equipment: string[];
  is_demo?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  role: string;
  qualification: string;
  certification: string;
  shift_status: string;
  capabilities: string[];
  is_demo: number;
}

export interface Ambulance {
  id: string;
  provider: string;
  vehicle_number: string;
  vehicle_type: string;
  base_location: string;
  current_location_name: string;
  latitude: number;
  longitude: number;
  operational_status: string;
  availability: string;
  capabilities: string[];
  equipment: string[];
  data_source: string;
  verification_status: string;
  is_demo: number;
  last_updated: string;
  crew_members: CrewMember[];
  distance_km?: number;
  estimated_response_minutes?: number;
  suitability_score?: number;
  selection_reasons?: string[];
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  latitude: number;
  longitude: number;
  operational_status: string;
  emergency_department_status: string;
  total_bed_capacity: number;
  icu_capacity: number;
  current_occupancy: number;
  available_beds: number;
  available_icu_beds: number;
  capabilities: string[];
  source: string;
  data_freshness_status: string;
  verification_status: string;
  is_demo: number;
  last_updated: string;
  distance_km?: number;
  estimated_eta_minutes?: number;
  suitability_score?: number;
  selection_reasons?: string[];
}

export interface Allocation {
  id: string;
  emergency_id: string;
  ambulance_id?: string;
  hospital_id?: string;
  optimization_run_id?: string;
  plan_type: 'RECOMMENDED' | 'ALTERNATIVE_1' | 'ALTERNATIVE_2';
  suitability_score: number;
  estimated_ambulance_eta_minutes: number;
  estimated_hospital_eta_minutes: number;
  total_estimated_time_minutes: number;
  estimated_distance_km: number;
  why_ambulance_selected?: string;
  why_hospital_selected?: string;
  why_this_plan?: string;
  route_geometry: [number, number][];
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  emergency?: Emergency;
  ambulance?: Ambulance;
  hospital?: Hospital;
}

export interface Dispatch {
  id: string;
  allocation_id: string;
  emergency_id: string;
  ambulance_id: string;
  hospital_id: string;
  dispatcher_id: string;
  dispatcher_name: string;
  status: string;
  notes?: string;
  dispatched_at: string;
  arrived_at_scene?: string;
  departed_scene?: string;
  arrived_at_hospital?: string;
  completed_at?: string;
  emergency?: Emergency;
  ambulance?: Ambulance;
  hospital?: Hospital;
}

export interface OptimizationResponse {
  optimization_run_id: string;
  timestamp: string;
  scarcity_detected: boolean;
  scarcity_details?: string;
  classical_result: {
    objective_value: number;
    runtime_ms: number;
    served_count: number;
    unserved_count: number;
    violations_count: number;
    assignments: any[];
    unserved_emergencies: string[];
    scarcity: boolean;
    solver?: string;
  };
  quantum_result: {
    executed: boolean;
    fallback?: boolean;
    reason?: string;
    objective_value?: number;
    runtime_ms?: number;
    served_count?: number;
    unserved_count?: number;
    violations_count?: number;
    num_qubits?: number;
    circuit_depth?: number;
    circuit_gates_count?: number;
    optimal_gamma?: number;
    optimal_beta?: number;
    details?: any;
  };
  quantum_fallback_activated: boolean;
  recommended_allocation?: Allocation;
  alternative_allocations: Allocation[];
  all_allocations: Allocation[];
  unserved_emergencies: string[];
}

export interface OptimizationRunDetail {
  id: string;
  triggered_by: string;
  scenario_name: string;
  emergencies_count: number;
  ambulances_count: number;
  hospitals_count: number;
  input_summary: any;
  classical_objective: number;
  classical_runtime_ms: number;
  classical_served_count: number;
  classical_unserved_count: number;
  classical_violations_count: number;
  classical_details: any;
  quantum_executed: boolean;
  quantum_fallback_activated: boolean;
  quantum_objective?: number;
  quantum_runtime_ms?: number;
  quantum_served_count?: number;
  quantum_unserved_count?: number;
  quantum_violations_count?: number;
  num_qubits: number;
  qubo_size: number;
  circuit_depth: number;
  circuit_gates_count: number;
  optimal_gamma?: number;
  optimal_beta?: number;
  comparison_summary?: string;
  created_at: string;
}

export interface BenchmarkMetricRow {
  metric: string;
  classical: any;
  quantum: any;
  difference: string;
  note: string;
}

export interface BenchmarkResponse {
  run_timestamp: string;
  execution_environment: string;
  metrics_table: BenchmarkMetricRow[];
  summary_analysis: string;
  honesty_declaration: string;
}

export interface DataSource {
  id: string;
  name: string;
  data_type: string;
  provider: string;
  status: string;
  last_retrieved: string;
  record_count: number;
  coverage_area: string;
  verification_status: string;
  is_real: boolean;
  notes?: string;
}

export interface AuditLog {
  id: number;
  event_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  total_emergencies: number;
  active_emergencies: number;
  critical_emergencies: number;
  high_emergencies: number;
  moderate_emergencies: number;
  total_ambulances: number;
  available_ambulances: number;
  busy_ambulances: number;
  pending_allocations: number;
  assigned_emergencies: number;
  active_dispatches: number;
  nearby_hospitals: number;
  available_hospital_beds: number;
  available_icu_beds: number;
  unserved_emergencies: number;
  resource_utilization_percent: number;
  scarcity_active: boolean;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}
