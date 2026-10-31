"""Schemas for optimization runs, QAOA metrics, and benchmarks."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class OptimizationRunDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    triggered_by: str
    scenario_name: str
    emergencies_count: int
    ambulances_count: int
    hospitals_count: int
    input_summary: Dict[str, Any] = {}
    
    classical_objective: float
    classical_runtime_ms: float
    classical_served_count: int
    classical_unserved_count: int
    classical_violations_count: int
    classical_details: Dict[str, Any] = {}
    
    quantum_executed: bool
    quantum_fallback_activated: bool
    quantum_objective: Optional[float] = None
    quantum_runtime_ms: Optional[float] = None
    quantum_served_count: Optional[int] = None
    quantum_unserved_count: Optional[int] = None
    quantum_violations_count: Optional[int] = None
    quantum_details: Dict[str, Any] = {}
    
    num_qubits: int
    qubo_size: int
    circuit_depth: int
    circuit_gates_count: int
    optimal_gamma: Optional[float] = None
    optimal_beta: Optional[float] = None
    
    comparison_summary: Optional[str] = None
    created_at: datetime


class BenchmarkRequest(BaseModel):
    scenarios_to_run: int = 1
    include_quantum: bool = True
    shots: int = 1024


class BenchmarkMetricRow(BaseModel):
    metric: str
    classical: Any
    quantum: Any
    difference: str
    note: str


class BenchmarkResponse(BaseModel):
    run_timestamp: datetime
    execution_environment: str
    metrics_table: List[BenchmarkMetricRow]
    summary_analysis: str
    honesty_declaration: str = "Quantum measurements are real simulation executions using Qiskit statevector/aer or fallback simulator. No fabricated speedups."
