"""Optimization runs, QUBO formulation, quantum experiments, and benchmark results."""

from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(String(50), primary_key=True, index=True)  # e.g., OPT-2026-001
    triggered_by = Column(String(100), default="EMS Dispatcher")
    scenario_name = Column(String(100), default="Live Incident Allocation")
    
    # Input summary
    emergencies_count = Column(Integer, default=0)
    ambulances_count = Column(Integer, default=0)
    hospitals_count = Column(Integer, default=0)
    input_summary_json = Column(Text, default="{}")
    
    # Classical Optimization Metrics
    classical_objective = Column(Float, default=0.0)
    classical_runtime_ms = Column(Float, default=0.0)
    classical_served_count = Column(Integer, default=0)
    classical_unserved_count = Column(Integer, default=0)
    classical_violations_count = Column(Integer, default=0)
    classical_details_json = Column(Text, default="{}")
    
    # Quantum Optimization Metrics
    quantum_executed = Column(Boolean, default=False)
    quantum_fallback_activated = Column(Boolean, default=False)
    quantum_objective = Column(Float, nullable=True)
    quantum_runtime_ms = Column(Float, nullable=True)
    quantum_served_count = Column(Integer, nullable=True)
    quantum_unserved_count = Column(Integer, nullable=True)
    quantum_violations_count = Column(Integer, nullable=True)
    quantum_details_json = Column(Text, default="{}")
    
    # QUBO and QAOA Technical Specs
    num_qubits = Column(Integer, default=0)
    qubo_size = Column(Integer, default=0)
    qubo_matrix_json = Column(Text, default="{}")
    circuit_depth = Column(Integer, default=0)
    circuit_gates_count = Column(Integer, default=0)
    optimal_gamma = Column(Float, nullable=True)
    optimal_beta = Column(Float, nullable=True)
    
    # Comparison and Conclusion
    comparison_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    allocations = relationship("Allocation", back_populates="optimization_run")

    @property
    def input_summary(self):
        try:
            return json.loads(self.input_summary_json) if self.input_summary_json else {}
        except Exception:
            return {}

    @property
    def classical_details(self):
        try:
            return json.loads(self.classical_details_json) if self.classical_details_json else {}
        except Exception:
            return {}

    @property
    def quantum_details(self):
        try:
            return json.loads(self.quantum_details_json) if self.quantum_details_json else {}
        except Exception:
            return {}
