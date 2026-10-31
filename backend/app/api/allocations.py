"""API endpoints for optimization execution, allocations, recommendations, and approvals."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated, require_dispatcher
from app.database import get_db
from app.models.emergency import Emergency
from app.models.ambulance import Ambulance
from app.models.hospital import Hospital
from app.models.allocation import Allocation
from app.models.resource_reservation import ResourceReservation
from app.models.optimization import OptimizationRun
from app.models.data_source import AuditLog
from app.models.user import User
from app.schemas.allocation import (
    AllocationOut, AllocationApprovalRequest, AllocationRejectionRequest,
    OptimizationResponse
)
from app.api.emergencies import format_emergency_out
from app.services.routing_service import RoutingService
from app.services.matching_engine import MatchingEngine
from app.services.explanation_service import ExplanationService
from app.quantum.hybrid_pipeline import HybridOptimizationPipeline
from app.integrations.demo_provider import DemoProvider
from app.services.resource_service import begin_resource_transaction, remaining_hospital_capacity

router = APIRouter(
    tags=["Allocations & Optimization"],
    dependencies=[Depends(require_authenticated)],
)


def format_allocation_out(alloc: Allocation, db: Session) -> AllocationOut:
    e_out = format_emergency_out(alloc.emergency) if alloc.emergency else None
    
    amb_out = None
    if alloc.ambulance:
        amb = alloc.ambulance
        amb_out = {
            "id": amb.id,
            "provider": amb.provider,
            "vehicle_number": amb.vehicle_number,
            "vehicle_type": amb.vehicle_type,
            "base_location": amb.base_location,
            "current_location_name": amb.current_location_name,
            "latitude": amb.latitude,
            "longitude": amb.longitude,
            "operational_status": amb.operational_status,
            "availability": amb.availability,
            "capabilities": amb.capabilities,
            "equipment": amb.equipment,
            "data_source": amb.data_source,
            "verification_status": amb.verification_status,
            "is_demo": amb.is_demo,
            "last_updated": amb.last_updated,
            "crew_members": [
                {
                    "id": cm.id,
                    "name": cm.name,
                    "role": cm.role,
                    "qualification": cm.qualification,
                    "certification": cm.certification,
                    "shift_status": cm.shift_status,
                    "capabilities": cm.capabilities,
                    "is_demo": cm.is_demo
                } for cm in amb.crew_members
            ]
        }

    hosp_out = None
    if alloc.hospital:
        h = alloc.hospital
        available_beds, available_icu_beds = remaining_hospital_capacity(db, h)
        hosp_out = {
            "id": h.id,
            "name": h.name,
            "address": h.address,
            "city": h.city,
            "state": h.state,
            "pin": h.pin,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "operational_status": h.operational_status,
            "emergency_department_status": h.emergency_department_status,
            "total_bed_capacity": h.total_bed_capacity,
            "icu_capacity": h.icu_capacity,
            "current_occupancy": h.current_occupancy,
            "available_beds": available_beds,
            "available_icu_beds": available_icu_beds,
            "capabilities": h.capabilities,
            "source": h.source,
            "data_freshness_status": h.data_freshness_status,
            "verification_status": h.verification_status,
            "is_demo": h.is_demo,
            "last_updated": h.last_updated
        }

    return AllocationOut(
        id=alloc.id,
        emergency_id=alloc.emergency_id,
        ambulance_id=alloc.ambulance_id,
        hospital_id=alloc.hospital_id,
        optimization_run_id=alloc.optimization_run_id,
        plan_type=alloc.plan_type,
        suitability_score=alloc.suitability_score,
        estimated_ambulance_eta_minutes=alloc.estimated_ambulance_eta_minutes,
        estimated_hospital_eta_minutes=alloc.estimated_hospital_eta_minutes,
        total_estimated_time_minutes=alloc.total_estimated_time_minutes,
        estimated_distance_km=alloc.estimated_distance_km,
        why_ambulance_selected=alloc.why_ambulance_selected,
        why_hospital_selected=alloc.why_hospital_selected,
        why_this_plan=alloc.why_this_plan,
        route_geometry=alloc.route_geometry,
        status=alloc.status,
        approved_by=alloc.approved_by,
        approved_at=alloc.approved_at,
        created_at=alloc.created_at,
        emergency=e_out,
        ambulance=amb_out,
        hospital=hosp_out
    )


@router.post("/api/emergencies/{emergency_id}/optimize", response_model=OptimizationResponse)
def optimize_emergency_allocation(emergency_id: str, db: Session = Depends(get_db)):
    """Executes the complete Hybrid Quantum-Classical optimization workflow.
    
    Considers the targeted emergency along with any concurrent pending emergencies
    to accurately capture fleet-wide resource scarcity.
    """
    target_emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not target_emergency:
        raise HTTPException(status_code=404, detail="Target emergency not found")
    if target_emergency.status in {
        "Dispatched", "En Route", "At Scene", "Transporting", "At Hospital",
        "Completed", "Cancelled",
    }:
        raise HTTPException(status_code=409, detail="This emergency is no longer eligible for allocation.")
    if db.query(ResourceReservation).filter(
        ResourceReservation.emergency_id == target_emergency.id,
    ).first():
        raise HTTPException(status_code=409, detail="This emergency already has an approved resource reservation.")

    # Find concurrent unallocated emergencies to evaluate fleet competition
    concurrent_emergencies = db.query(Emergency).filter(
        Emergency.status.in_([
            "Awaiting Allocation", "Prioritizing", "Registered",
            "Awaiting Approval", "Unserved",
        ])
    ).all()

    # Ensure target_emergency is included
    emergencies_pool = {
        e.id: e for e in concurrent_emergencies
        if not db.query(ResourceReservation).filter(
            ResourceReservation.emergency_id == e.id,
        ).first()
    }
    emergencies_pool[target_emergency.id] = target_emergency
    active_emergencies = list(emergencies_pool.values())

    # Get available/active ambulances
    registered_available_ambulances = db.query(Ambulance).filter(
        Ambulance.operational_status == "Active",
        Ambulance.availability == "Available"
    ).all()
    available_ambulances = [
        ambulance for ambulance in registered_available_ambulances
        if MatchingEngine.has_dispatchable_crew(ambulance)
    ]

    # Get active hospitals
    hospital_query = db.query(Hospital).filter(Hospital.operational_status == "Active")
    if target_emergency.is_demo:
        hospital_query = hospital_query.filter(Hospital.id.in_(DemoProvider.HACKATHON_HOSPITAL_IDS))
    candidate_hospitals = hospital_query.all()
    hospital_capacity = {
        hospital.id: remaining_hospital_capacity(db, hospital)
        for hospital in candidate_hospitals
    }

    # Build cost & ETA matrices using routing and matching engines
    cost_matrix: Dict[tuple, float] = {}
    eta_matrix: Dict[tuple, Dict[str, float]] = {}
    route_cache: Dict[tuple, List[List[float]]] = {}

    for em in active_emergencies:
        p_weight = 2.0 if em.calculated_priority == "CRITICAL" else (1.4 if em.calculated_priority == "HIGH" else 1.0)
        for amb in available_ambulances:
            amb_route = RoutingService.calculate_route(
                amb.latitude, amb.longitude,
                em.latitude, em.longitude,
                em.calculated_priority or "MODERATE"
            )
            amb_dist = amb_route["distance_km"]
            amb_eta = amb_route["estimated_minutes"]
            amb_score, _ = MatchingEngine.evaluate_ambulance(amb, em, amb_dist, amb_eta)

            for hosp in candidate_hospitals:
                available_beds, available_icu_beds = hospital_capacity[hosp.id]
                required_beds = max(1, em.patient_count or 1)
                if (
                    hosp.emergency_department_status != "Open"
                    or available_beds < required_beds
                    or (
                        em.calculated_priority == "CRITICAL"
                        and available_icu_beds < required_beds
                    )
                ):
                    continue
                hosp_route = RoutingService.calculate_route(
                    em.latitude, em.longitude,
                    hosp.latitude, hosp.longitude,
                    em.calculated_priority or "MODERATE"
                )
                hosp_dist = hosp_route["distance_km"]
                hosp_eta = hosp_route["estimated_minutes"]
                hosp_score, _ = MatchingEngine.evaluate_hospital(hosp, em, hosp_dist, hosp_eta)

                total_time = amb_eta + hosp_eta
                total_dist = amb_dist + hosp_dist
                suitability_avg = (amb_score + hosp_score) / 2.0

                # Optimization cost: minimize transit time while maximizing priority and suitability
                cost = (total_time * 2.0) - (suitability_avg * 0.8 * p_weight)
                key = (em.id, amb.id, hosp.id)
                cost_matrix[key] = round(cost, 2)
                eta_matrix[key] = {
                    "amb_eta": amb_eta,
                    "hosp_eta": hosp_eta,
                    "total_eta": total_time,
                    "distance": round(total_dist, 2),
                    "amb_score": amb_score,
                    "hosp_score": hosp_score,
                    "avg_score": suitability_avg
                }
                
                # Combine route points for Leaflet map: Amb -> Emergency -> Hospital
                combined_geometry = amb_route["geometry"] + hosp_route["geometry"]
                route_cache[key] = combined_geometry

    # Format input payloads
    emergencies_input = [
        {
            "id": e.id,
            "calculated_priority": e.calculated_priority,
            "priority_score": e.priority_score or 50.0,
            "patient_count": e.patient_count or 1,
            "requires_icu": e.calculated_priority == "CRITICAL",
        } for e in active_emergencies
    ]
    ambulances_input = [{"id": a.id} for a in available_ambulances]
    hospitals_input = [
        {
            "id": hospital.id,
            "available_beds": hospital_capacity[hospital.id][0],
            "available_icu_beds": hospital_capacity[hospital.id][1],
        }
        for hospital in candidate_hospitals
    ]

    # Execute Hybrid Optimization Pipeline
    hybrid_result = HybridOptimizationPipeline.run_optimization(
        emergencies=emergencies_input,
        ambulances=ambulances_input,
        hospitals=hospitals_input,
        cost_matrix=cost_matrix,
        eta_matrix=eta_matrix,
        execute_quantum=True
    )

    # Persist Optimization Run Record
    opt_run_id = f"OPT-{uuid.uuid4().hex[:8].upper()}"
    opt_run = OptimizationRun(
        id=opt_run_id,
        triggered_by="EMS Dispatcher",
        scenario_name=f"Allocation for {target_emergency.id} ({len(active_emergencies)} active emergencies)",
        emergencies_count=len(active_emergencies),
        ambulances_count=len(available_ambulances),
        hospitals_count=len(candidate_hospitals),
        classical_objective=hybrid_result["classical"].get("objective_value", 0.0),
        classical_runtime_ms=hybrid_result["classical"].get("runtime_ms", 0.0),
        classical_served_count=hybrid_result["classical"].get("served_count", 0),
        classical_unserved_count=hybrid_result["classical"].get("unserved_count", 0),
        classical_violations_count=hybrid_result["classical"].get("violations_count", 0),
        quantum_executed=hybrid_result["quantum"].get("executed", False),
        quantum_fallback_activated=hybrid_result.get("quantum_fallback_activated", False),
        quantum_objective=hybrid_result["quantum"].get("objective_value"),
        quantum_runtime_ms=hybrid_result["quantum"].get("runtime_ms"),
        quantum_served_count=hybrid_result["quantum"].get("served_count"),
        quantum_unserved_count=hybrid_result["quantum"].get("unserved_count"),
        quantum_violations_count=hybrid_result["quantum"].get("violations_count"),
        num_qubits=hybrid_result.get("qubo_details", {}).get("num_qubits", 0),
        circuit_depth=hybrid_result["quantum"].get("circuit_depth", 0),
        circuit_gates_count=hybrid_result["quantum"].get("circuit_gates_count", 0),
        optimal_gamma=hybrid_result["quantum"].get("optimal_gamma"),
        optimal_beta=hybrid_result["quantum"].get("optimal_beta"),
        comparison_summary=hybrid_result.get("comparison_summary")
    )
    db.add(opt_run)
    db.commit()

    # Generate Allocation objects for each served emergency
    created_allocations: List[Allocation] = []
    assignments = hybrid_result["classical"].get("assignments", [])
    for existing in db.query(Allocation).filter(
        Allocation.emergency_id.in_([emergency.id for emergency in active_emergencies]),
        Allocation.status == "PROPOSED",
    ).all():
        existing.status = "SUPERSEDED"

    for assign in assignments:
        em_id = assign["emergency_id"]
        amb_id = assign["ambulance_id"]
        hosp_id = assign["hospital_id"]

        em_obj = db.query(Emergency).filter(Emergency.id == em_id).first()
        amb_obj = db.query(Ambulance).filter(Ambulance.id == amb_id).first()
        hosp_obj = db.query(Hospital).filter(Hospital.id == hosp_id).first()

        eta_info = eta_matrix.get((em_id, amb_id, hosp_id), {})
        _, amb_reasons = MatchingEngine.evaluate_ambulance(
            amb_obj, em_obj,
            RoutingService.haversine_distance_km(amb_obj.latitude, amb_obj.longitude, em_obj.latitude, em_obj.longitude),
            eta_info.get("amb_eta", 10.0)
        )
        _, hosp_reasons = MatchingEngine.evaluate_hospital(
            hosp_obj, em_obj,
            RoutingService.haversine_distance_km(em_obj.latitude, em_obj.longitude, hosp_obj.latitude, hosp_obj.longitude),
            eta_info.get("hosp_eta", 12.0)
        )

        why_plan = ExplanationService.generate_plan_explanation(
            ambulance_id=amb_id,
            ambulance_reasons=amb_reasons,
            hospital_name=hosp_obj.name,
            hospital_reasons=hosp_reasons,
            emergency_priority=em_obj.calculated_priority or "MODERATE",
            is_scarcity=hybrid_result.get("scarcity_detected", False),
            unserved_count=len(hybrid_result["classical"].get("unserved_emergencies", []))
        )

        alloc_id = f"ALLOC-{uuid.uuid4().hex[:8].upper()}"
        alloc = Allocation(
            id=alloc_id,
            emergency_id=em_id,
            ambulance_id=amb_id,
            hospital_id=hosp_id,
            optimization_run_id=opt_run_id,
            plan_type="RECOMMENDED",
            suitability_score=eta_info.get("avg_score", 85.0),
            estimated_ambulance_eta_minutes=eta_info.get("amb_eta", 10.0),
            estimated_hospital_eta_minutes=eta_info.get("hosp_eta", 12.0),
            total_estimated_time_minutes=eta_info.get("total_eta", 22.0),
            estimated_distance_km=eta_info.get("distance", 8.0),
            why_ambulance_selected="; ".join(amb_reasons[:2]),
            why_hospital_selected="; ".join(hosp_reasons[:2]),
            why_this_plan=why_plan,
            route_geometry=route_cache.get((em_id, amb_id, hosp_id), []),
            status="PROPOSED"
        )
        db.add(alloc)
        created_allocations.append(alloc)

        # Update emergency status
        em_obj.status = "Awaiting Approval"

    # Also handle unserved emergencies
    for unserved_em_id in hybrid_result["classical"].get("unserved_emergencies", []):
        u_em = db.query(Emergency).filter(Emergency.id == unserved_em_id).first()
        if u_em:
            u_em.status = "Unserved"
            # Create an unserved allocation record showing scarcity
            u_alloc = Allocation(
                id=f"ALLOC-UNSERVED-{uuid.uuid4().hex[:6].upper()}",
                emergency_id=unserved_em_id,
                ambulance_id=None,
                hospital_id=None,
                optimization_run_id=opt_run_id,
                plan_type="RECOMMENDED",
                suitability_score=0.0,
                estimated_ambulance_eta_minutes=0.0,
                estimated_hospital_eta_minutes=0.0,
                total_estimated_time_minutes=0.0,
                estimated_distance_km=0.0,
                why_this_plan=(
                    "Unallocated: no active ambulance is currently available."
                    if not available_ambulances else
                    "Unallocated: no hospital has sufficient suitable capacity."
                    if not cost_matrix else
                    "Unallocated: available resources were assigned to higher-priority feasible emergencies."
                ),
                status="PROPOSED"
            )
            db.add(u_alloc)
            created_allocations.append(u_alloc)

    # Generate Alternative Options for the target emergency (Section 26)
    target_alloc = next((a for a in created_allocations if a.emergency_id == target_emergency.id and a.ambulance_id), None)
    alternative_outs: List[AllocationOut] = []

    if target_alloc:
        # Find 1 or 2 alternative hospital/ambulance combinations
        alt_candidates = []
        for a in available_ambulances:
            for h in candidate_hospitals:
                if a.id == target_alloc.ambulance_id and h.id == target_alloc.hospital_id:
                    continue
                info = eta_matrix.get((target_emergency.id, a.id, h.id))
                if info:
                    alt_candidates.append((a, h, info))

        # Sort alternatives by suitability score
        alt_candidates.sort(key=lambda x: x[2]["avg_score"], reverse=True)
        for idx, (alt_amb, alt_hosp, alt_info) in enumerate(alt_candidates[:2]):
            plan_name = f"ALTERNATIVE_{idx + 1}"
            alt_alloc = Allocation(
                id=f"ALLOC-ALT-{uuid.uuid4().hex[:6].upper()}",
                emergency_id=target_emergency.id,
                ambulance_id=alt_amb.id,
                hospital_id=alt_hosp.id,
                optimization_run_id=opt_run_id,
                plan_type=plan_name,
                suitability_score=alt_info["avg_score"],
                estimated_ambulance_eta_minutes=alt_info["amb_eta"],
                estimated_hospital_eta_minutes=alt_info["hosp_eta"],
                total_estimated_time_minutes=alt_info["total_eta"],
                estimated_distance_km=alt_info["distance"],
                why_ambulance_selected=f"Alternative unit {alt_amb.id} ({alt_amb.vehicle_type})",
                why_hospital_selected=f"Secondary receiving facility {alt_hosp.name}",
                why_this_plan=f"Alternative dispatch routing with total ETA {alt_info['total_eta']:.1f} mins.",
                route_geometry=route_cache.get((target_emergency.id, alt_amb.id, alt_hosp.id), []),
                status="SUPERSEDED"
            )
            db.add(alt_alloc)
            db.commit()
            alternative_outs.append(format_allocation_out(alt_alloc, db))

    db.commit()

    # Find the target allocation out
    target_alloc_out = format_allocation_out(target_alloc, db) if target_alloc else None
    all_alloc_outs = [format_allocation_out(a, db) for a in created_allocations]

    scarcity_note = None
    if hybrid_result.get("scarcity_detected"):
        unserved_cnt = len(hybrid_result["classical"].get("unserved_emergencies", []))
        scarcity_note = f"Resource scarcity detected: {len(active_emergencies)} active emergency calls vs {len(available_ambulances)} available ambulances. {unserved_cnt} emergency queued as unserved."

    return OptimizationResponse(
        optimization_run_id=opt_run_id,
        timestamp=datetime.now(timezone.utc),
        scarcity_detected=hybrid_result.get("scarcity_detected", False),
        scarcity_details=scarcity_note,
        classical_result=hybrid_result["classical"],
        quantum_result=hybrid_result["quantum"],
        quantum_fallback_activated=hybrid_result.get("quantum_fallback_activated", False),
        recommended_allocation=target_alloc_out,
        alternative_allocations=alternative_outs,
        all_allocations=all_alloc_outs,
        unserved_emergencies=hybrid_result["classical"].get("unserved_emergencies", [])
    )


@router.get("/api/allocations/{allocation_id}", response_model=AllocationOut)
def get_allocation(allocation_id: str, db: Session = Depends(get_db)):
    alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    return format_allocation_out(alloc, db)


@router.post(
    "/api/allocations/{allocation_id}/approve",
    response_model=AllocationOut,
    dependencies=[Depends(require_dispatcher)],
)
def approve_allocation(
    allocation_id: str,
    payload: AllocationApprovalRequest,
    db: Session = Depends(get_db),
    dispatcher: User = Depends(require_dispatcher),
):
    """Validates and reserves resources atomically when a dispatcher approves a proposal."""
    begin_resource_transaction(db)
    try:
        alloc = db.query(Allocation).filter(
            Allocation.id == allocation_id,
        ).with_for_update().first()
        if not alloc:
            raise HTTPException(status_code=404, detail="Allocation not found")
        if alloc.status != "PROPOSED":
            raise HTTPException(status_code=409, detail="Only proposed allocations can be approved.")
        if not alloc.ambulance_id or not alloc.hospital_id:
            raise HTTPException(
                status_code=409,
                detail="An allocation without an assigned ambulance and hospital cannot be approved.",
            )

        emergency = db.query(Emergency).filter(
            Emergency.id == alloc.emergency_id,
        ).with_for_update().first()
        ambulance = db.query(Ambulance).filter(
            Ambulance.id == alloc.ambulance_id,
        ).with_for_update().first()
        hospital = db.query(Hospital).filter(
            Hospital.id == alloc.hospital_id,
        ).with_for_update().first()
        if not emergency or not ambulance or not hospital:
            raise HTTPException(status_code=409, detail="A proposed resource is no longer available.")
        if emergency.status in {
            "Dispatched", "En Route", "At Scene", "Transporting", "At Hospital",
            "Completed", "Cancelled",
        }:
            raise HTTPException(status_code=409, detail="This emergency is no longer eligible for approval.")
        if ambulance.operational_status != "Active" or ambulance.availability != "Available":
            raise HTTPException(status_code=409, detail=f"Ambulance {ambulance.id} is no longer available.")
        if hospital.operational_status != "Active" or hospital.emergency_department_status != "Open":
            raise HTTPException(
                status_code=409,
                detail=f"Hospital {hospital.name} is no longer receiving emergencies.",
            )
        if db.query(ResourceReservation).filter(
            ResourceReservation.ambulance_id == ambulance.id,
        ).first():
            raise HTTPException(status_code=409, detail=f"Ambulance {ambulance.id} is already reserved.")
        if db.query(Allocation).join(
            Emergency,
            Emergency.id == Allocation.emergency_id,
        ).filter(
            Allocation.ambulance_id == ambulance.id,
            Allocation.status == "APPROVED",
            Allocation.id != alloc.id,
            Emergency.status.notin_(["Completed", "Cancelled"]),
        ).first():
            raise HTTPException(status_code=409, detail=f"Ambulance {ambulance.id} is already assigned.")

        available_beds, available_icu_beds = remaining_hospital_capacity(db, hospital)
        bed_count = max(1, emergency.patient_count or 1)
        icu_bed_count = bed_count if emergency.calculated_priority == "CRITICAL" else 0
        if available_beds < bed_count:
            raise HTTPException(status_code=409, detail=f"Hospital {hospital.name} has insufficient available beds.")
        if available_icu_beds < icu_bed_count:
            raise HTTPException(status_code=409, detail=f"Hospital {hospital.name} has insufficient ICU capacity.")

        db.add(ResourceReservation(
            allocation_id=alloc.id,
            emergency_id=emergency.id,
            ambulance_id=ambulance.id,
            hospital_id=hospital.id,
            bed_count=bed_count,
            icu_bed_count=icu_bed_count,
        ))
        db.flush()
        alloc.status = "APPROVED"
        alloc.approved_by = dispatcher.full_name
        alloc.approved_at = datetime.now(timezone.utc)
        ambulance.availability = "Assigned"
        db.add(AuditLog(
            event_type="ALLOCATION_APPROVED",
            entity_id=allocation_id,
            actor_id=str(dispatcher.id),
            actor_role=dispatcher.role,
            details=f"Allocation {allocation_id} approved for Emergency {alloc.emergency_id}. Assigned Ambulance {alloc.ambulance_id} -> Hospital {alloc.hospital_id}."
        ))
        db.commit()
        db.refresh(alloc)
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A required ambulance or emergency is already reserved by another allocation.",
        ) from error

    return format_allocation_out(alloc, db)


@router.post(
    "/api/allocations/{allocation_id}/reject",
    response_model=AllocationOut,
    dependencies=[Depends(require_dispatcher)],
)
def reject_allocation(
    allocation_id: str,
    payload: AllocationRejectionRequest,
    db: Session = Depends(get_db),
    dispatcher: User = Depends(require_dispatcher),
):
    alloc = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if alloc.status != "PROPOSED" or not alloc.ambulance_id:
        raise HTTPException(status_code=409, detail="Only a proposed allocation can be rejected.")

    alloc.status = "REJECTED"
    alloc.rejection_reason = payload.reason
    emergency = db.query(Emergency).filter(Emergency.id == alloc.emergency_id).first()
    if emergency and emergency.status == "Awaiting Approval":
        emergency.status = "Awaiting Allocation"
    db.add(AuditLog(
        event_type="ALLOCATION_REJECTED",
        entity_id=allocation_id,
        actor_id=str(dispatcher.id),
        actor_role=dispatcher.role,
        details=f"Allocation {allocation_id} rejected: {payload.reason}",
    ))
    db.commit()
    db.refresh(alloc)
    return format_allocation_out(alloc, db)
