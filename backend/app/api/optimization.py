"""API routes for optimization run inspection, QUBO parameters, and QAOA circuits."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.models.optimization import OptimizationRun
from app.schemas.optimization import OptimizationRunDetailOut

router = APIRouter(
    prefix="/api/optimization",
    tags=["Optimization Runs"],
    dependencies=[Depends(require_authenticated)],
)


def format_opt_run_out(r: OptimizationRun) -> OptimizationRunDetailOut:
    return OptimizationRunDetailOut(
        id=r.id,
        triggered_by=r.triggered_by,
        scenario_name=r.scenario_name,
        emergencies_count=r.emergencies_count,
        ambulances_count=r.ambulances_count,
        hospitals_count=r.hospitals_count,
        input_summary=r.input_summary,
        classical_objective=r.classical_objective,
        classical_runtime_ms=r.classical_runtime_ms,
        classical_served_count=r.classical_served_count,
        classical_unserved_count=r.classical_unserved_count,
        classical_violations_count=r.classical_violations_count,
        classical_details=r.classical_details,
        quantum_executed=r.quantum_executed,
        quantum_fallback_activated=r.quantum_fallback_activated,
        quantum_objective=r.quantum_objective,
        quantum_runtime_ms=r.quantum_runtime_ms,
        quantum_served_count=r.quantum_served_count,
        quantum_unserved_count=r.quantum_unserved_count,
        quantum_violations_count=r.quantum_violations_count,
        quantum_details=r.quantum_details,
        num_qubits=r.num_qubits,
        qubo_size=r.qubo_size,
        circuit_depth=r.circuit_depth,
        circuit_gates_count=r.circuit_gates_count,
        optimal_gamma=r.optimal_gamma,
        optimal_beta=r.optimal_beta,
        comparison_summary=r.comparison_summary,
        created_at=r.created_at
    )


@router.get("", response_model=List[OptimizationRunDetailOut])
def list_optimization_runs(db: Session = Depends(get_db)):
    runs = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(20).all()
    return [format_opt_run_out(r) for r in runs]


@router.get("/{run_id}", response_model=OptimizationRunDetailOut)
def get_optimization_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Optimization run not found")
    return format_opt_run_out(run)
