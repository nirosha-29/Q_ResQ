"""Direct route function integration tests verifying full EMS lifecycle."""

import pytest
from fastapi import HTTPException
from app.database import SessionLocal, engine, Base
from app.main import health_check
from app.api.demo import load_hackathon_scenario
from app.api.emergencies import (
    register_emergency, list_emergencies, get_emergency,
    recalculate_priority, get_ambulance_candidates, get_hospital_candidates
)
from app.api.allocations import optimize_emergency_allocation, approve_allocation
from app.api.dispatches import confirm_dispatch, list_dispatches
from app.api.dashboard import get_dashboard_statistics
from app.api.benchmark import execute_benchmark
from app.schemas.emergency import EmergencyCreate
from app.schemas.allocation import AllocationApprovalRequest, DispatchConfirmRequest
from app.schemas.optimization import BenchmarkRequest
from app.models.user import User


@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_health_check_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    assert res["service"] == "Q-ResQ"
    assert "safety_statement" in res


def test_demo_scenario_and_listing(db_session):
    # Load 3 emergencies, 2 ambulances, 3 hospitals
    load_res = load_hackathon_scenario(db=db_session)
    assert load_res["status"] == "success"

    emergencies = list_emergencies(db=db_session)
    e_ids = [e.id for e in emergencies]
    assert "E001" in e_ids
    assert "E002" in e_ids
    assert "E003" in e_ids


def test_full_allocation_and_dispatch_workflow(db_session):
    # 1. Reset scenario
    load_hackathon_scenario(db=db_session)

    # 2. Check candidate discovery for E001
    amb_cands = get_ambulance_candidates("E001", db=db_session)
    assert len(amb_cands) >= 2
    assert amb_cands[0].suitability_score > 0

    hosp_cands = get_hospital_candidates("E001", db=db_session)
    assert {hospital.id for hospital in hosp_cands} == {"H001", "H002", "H003"}

    # 3. Execute Optimization for E001 (with fleet scarcity active)
    opt_res = optimize_emergency_allocation("E001", db=db_session)
    assert opt_res.optimization_run_id is not None
    assert opt_res.scarcity_detected is True
    assert len(opt_res.unserved_emergencies) >= 1
    assert opt_res.quantum_fallback_activated is True
    assert opt_res.quantum_result["num_qubits"] == 18

    rec_alloc = opt_res.recommended_allocation
    assert rec_alloc is not None
    assert rec_alloc.emergency_id == "E001"
    assert rec_alloc.ambulance_id is not None
    assert rec_alloc.hospital_id is not None
    assert rec_alloc.status == "PROPOSED"

    dispatch_request = DispatchConfirmRequest(
        allocation_id=rec_alloc.id,
        dispatcher_id="DISPATCHER-OFFICER-01",
        notes="This must be rejected before dispatcher approval."
    )
    with pytest.raises(HTTPException) as approval_error:
        confirm_dispatch(dispatch_request, db=db_session)
    assert approval_error.value.status_code == 400
    assert "must be approved" in approval_error.value.detail

    # 4. Human dispatcher approval
    approve_req = AllocationApprovalRequest(approved_by="Lead Dispatcher")
    dispatcher = db_session.query(User).filter(User.username == "dispatcher1").first()
    approved_alloc = approve_allocation(
        rec_alloc.id,
        approve_req,
        db=db_session,
        dispatcher=dispatcher,
    )
    assert approved_alloc.status == "APPROVED"
    assert approved_alloc.approved_by == dispatcher.full_name

    # 5. Confirm dispatch with pre-dispatch re-validation
    disp_req = DispatchConfirmRequest(
        allocation_id=rec_alloc.id,
        dispatcher_id="DISPATCHER-OFFICER-01",
        notes="High priority emergency response dispatched."
    )
    dispatch_record = confirm_dispatch(disp_req, db=db_session, dispatcher=dispatcher)
    assert dispatch_record.status == "Dispatched"
    assert dispatch_record.ambulance_id == rec_alloc.ambulance_id

    # 6. Verify Dashboard live statistics update
    stats = get_dashboard_statistics(db=db_session)
    assert stats["active_dispatches"] >= 1
    assert stats["available_ambulances"] >= 0


def test_registration_calculates_priority_and_stores_requirements(db_session):
    payload = EmergencyCreate(
        patient_name="Registration Test",
        patient_age=42,
        patient_gender="Other",
        patient_count=1,
        emergency_type="Cardiac",
        symptoms="Chest pain and difficulty breathing",
        reported_severity="Critical",
        address="Test location, Bengaluru",
        latitude=12.9716,
        longitude=77.5946,
        required_capabilities=["ALS", "Cardiac"],
        required_equipment=["ECG", "Defibrillator"],
        is_demo=0
    )

    emergency = register_emergency(payload, db=db_session)

    assert emergency.calculated_priority == "CRITICAL"
    assert emergency.priority_score > 0
    assert emergency.status == "Awaiting Allocation"
    assert emergency.required_capabilities == ["ALS", "Cardiac"]
    assert emergency.required_equipment == ["ECG", "Defibrillator"]


def test_benchmark_empirical_execution(db_session):
    bench_req = BenchmarkRequest(scenarios_to_run=1, include_quantum=True, shots=256)
    bench_res = execute_benchmark(bench_req, db=db_session)
    assert len(bench_res.metrics_table) >= 5
    assert "QAOA" in bench_res.summary_analysis or "MILP" in bench_res.summary_analysis
