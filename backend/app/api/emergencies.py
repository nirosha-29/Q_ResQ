"""API routes for Emergency intake, registration, candidate discovery, and prioritization."""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.models.emergency import Emergency, EmergencyRequirement
from app.models.ambulance import Ambulance
from app.models.hospital import Hospital
from app.models.data_source import AuditLog
from app.schemas.emergency import EmergencyCreate, EmergencyOut, PriorityCalculationResult
from app.schemas.ambulance import AmbulanceOut
from app.schemas.hospital import HospitalOut
from app.services.priority_engine import PriorityEngine
from app.services.routing_service import RoutingService
from app.services.matching_engine import MatchingEngine
from app.services.resource_service import remaining_hospital_capacity
from app.integrations.demo_provider import DemoProvider

router = APIRouter(
    prefix="/api/emergencies",
    tags=["Emergencies"],
    dependencies=[Depends(require_authenticated)],
)


def format_emergency_out(e: Emergency) -> EmergencyOut:
    req = e.requirements
    return EmergencyOut(
        id=e.id,
        patient_id=e.patient_id,
        patient_name=e.patient_name,
        patient_age=e.patient_age,
        patient_gender=e.patient_gender,
        patient_count=e.patient_count or 1,
        emergency_type=e.emergency_type,
        symptoms=e.symptoms,
        reported_severity=e.reported_severity,
        additional_notes=e.additional_notes,
        address=e.address,
        latitude=e.latitude,
        longitude=e.longitude,
        calculated_priority=e.calculated_priority,
        priority_score=e.priority_score,
        priority_explanation=e.priority_explanation,
        status=e.status,
        is_demo=e.is_demo or 0,
        created_at=e.created_at,
        updated_at=e.updated_at,
        required_capabilities=req.capabilities if req else [],
        required_equipment=req.equipment if req else []
    )


@router.post("", response_model=EmergencyOut)
def register_emergency(payload: EmergencyCreate, db: Session = Depends(get_db)):
    """Registers emergency, computes priority, creates requirements, and logs audit."""
    emergency_id = f"E-{uuid.uuid4().hex[:8].upper()}"
    patient_id = payload.patient_id or f"PT-{uuid.uuid4().hex[:8].upper()}"

    # Calculate explainable priority
    priority, score, explanation = PriorityEngine.calculate_priority(
        emergency_type=payload.emergency_type,
        reported_severity=payload.reported_severity,
        symptoms=payload.symptoms,
        patient_count=payload.patient_count,
        required_capabilities=payload.required_capabilities
    )

    emergency = Emergency(
        id=emergency_id,
        patient_id=patient_id,
        patient_name=payload.patient_name,
        patient_age=payload.patient_age,
        patient_gender=payload.patient_gender,
        patient_count=payload.patient_count,
        emergency_type=payload.emergency_type,
        symptoms=payload.symptoms,
        reported_severity=payload.reported_severity,
        additional_notes=payload.additional_notes,
        address=payload.address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        calculated_priority=priority,
        priority_score=score,
        priority_explanation=explanation,
        status="Awaiting Allocation",
        is_demo=payload.is_demo
    )
    db.add(emergency)

    requirements = EmergencyRequirement(
        emergency_id=emergency_id,
        capabilities=payload.required_capabilities,
        equipment=payload.required_equipment
    )
    db.add(requirements)

    audit = AuditLog(
        event_type="EMERGENCY_REGISTERED",
        entity_id=emergency_id,
        actor_id="DISPATCHER-01",
        actor_role="Dispatcher",
        details=f"Registered emergency for {payload.patient_name} ({payload.emergency_type}). Priority: {priority} (Score {score})."
    )
    db.add(audit)
    db.commit()
    db.refresh(emergency)

    return format_emergency_out(emergency)


@router.get("", response_model=List[EmergencyOut])
def list_emergencies(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Emergency)
    if status:
        query = query.filter(Emergency.status == status)
    if priority:
        query = query.filter(Emergency.calculated_priority == priority)
    
    # Sort with active / critical first
    emergencies = query.order_by(Emergency.created_at.desc()).all()
    return [format_emergency_out(e) for e in emergencies]


@router.get("/{emergency_id}", response_model=EmergencyOut)
def get_emergency(emergency_id: str, db: Session = Depends(get_db)):
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")
    return format_emergency_out(emergency)


@router.post("/{emergency_id}/prioritize", response_model=PriorityCalculationResult)
def recalculate_priority(emergency_id: str, db: Session = Depends(get_db)):
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    req = emergency.requirements
    req_caps = req.capabilities if req else []

    priority, score, explanation = PriorityEngine.calculate_priority(
        emergency_type=emergency.emergency_type,
        reported_severity=emergency.reported_severity,
        symptoms=emergency.symptoms,
        patient_count=emergency.patient_count or 1,
        required_capabilities=req_caps
    )

    emergency.calculated_priority = priority
    emergency.priority_score = score
    emergency.priority_explanation = explanation
    emergency.updated_at = datetime.now(timezone.utc)
    db.commit()

    return PriorityCalculationResult(
        emergency_id=emergency_id,
        calculated_priority=priority,
        priority_score=score,
        explanation=explanation
    )


@router.get("/{emergency_id}/ambulance-candidates", response_model=List[AmbulanceOut])
def get_ambulance_candidates(emergency_id: str, db: Session = Depends(get_db)):
    """Returns candidate ambulances evaluated and scored for the emergency."""
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    # Fetch active ambulances
    ambulances = db.query(Ambulance).filter(Ambulance.operational_status == "Active").all()
    candidates: List[AmbulanceOut] = []

    for amb in ambulances:
        route_info = RoutingService.calculate_route(
            amb.latitude, amb.longitude,
            emergency.latitude, emergency.longitude,
            emergency.calculated_priority or "MODERATE"
        )
        dist_km = route_info["distance_km"]
        eta_mins = route_info["estimated_minutes"]

        score, reasons = MatchingEngine.evaluate_ambulance(
            ambulance=amb,
            emergency=emergency,
            distance_km=dist_km,
            eta_minutes=eta_mins
        )

        candidates.append(AmbulanceOut(
            id=amb.id,
            provider=amb.provider,
            vehicle_number=amb.vehicle_number,
            vehicle_type=amb.vehicle_type,
            base_location=amb.base_location,
            current_location_name=amb.current_location_name,
            latitude=amb.latitude,
            longitude=amb.longitude,
            operational_status=amb.operational_status,
            availability=amb.availability,
            capabilities=amb.capabilities,
            equipment=amb.equipment,
            data_source=amb.data_source,
            verification_status=amb.verification_status,
            is_demo=amb.is_demo,
            last_updated=amb.last_updated,
            crew_members=[
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
            ],
            distance_km=dist_km,
            estimated_response_minutes=eta_mins,
            suitability_score=score,
            selection_reasons=reasons
        ))

    # Sort descending by suitability score
    candidates.sort(key=lambda x: (x.suitability_score or 0.0), reverse=True)
    return candidates


@router.get("/{emergency_id}/hospital-candidates", response_model=List[HospitalOut])
def get_hospital_candidates(emergency_id: str, db: Session = Depends(get_db)):
    """Returns candidate hospitals evaluated and scored for the emergency."""
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    hospital_query = db.query(Hospital).filter(Hospital.operational_status == "Active")
    if emergency.is_demo:
        hospital_query = hospital_query.filter(Hospital.id.in_(DemoProvider.HACKATHON_HOSPITAL_IDS))
    hospitals = hospital_query.all()
    candidates: List[HospitalOut] = []

    for hosp in hospitals:
        remaining_beds, remaining_icu = remaining_hospital_capacity(db, hosp)
        required_beds = max(1, emergency.patient_count or 1)
        if (
            hosp.emergency_department_status != "Open"
            or remaining_beds < required_beds
            or (
                emergency.calculated_priority == "CRITICAL"
                and remaining_icu < required_beds
            )
        ):
            continue
        route_info = RoutingService.calculate_route(
            emergency.latitude, emergency.longitude,
            hosp.latitude, hosp.longitude,
            emergency.calculated_priority or "MODERATE"
        )
        dist_km = route_info["distance_km"]
        eta_mins = route_info["estimated_minutes"]

        score, reasons = MatchingEngine.evaluate_hospital(
            hospital=hosp,
            emergency=emergency,
            distance_km=dist_km,
            eta_minutes=eta_mins
        )

        candidates.append(HospitalOut(
            id=hosp.id,
            name=hosp.name,
            address=hosp.address,
            city=hosp.city,
            state=hosp.state,
            pin=hosp.pin,
            latitude=hosp.latitude,
            longitude=hosp.longitude,
            operational_status=hosp.operational_status,
            emergency_department_status=hosp.emergency_department_status,
            total_bed_capacity=hosp.total_bed_capacity,
            icu_capacity=hosp.icu_capacity,
            current_occupancy=hosp.current_occupancy,
            available_beds=remaining_beds,
            available_icu_beds=remaining_icu,
            capabilities=hosp.capabilities,
            source=hosp.source,
            data_freshness_status=hosp.data_freshness_status,
            verification_status=hosp.verification_status,
            is_demo=hosp.is_demo,
            last_updated=hosp.last_updated,
            distance_km=dist_km,
            estimated_eta_minutes=eta_mins,
            suitability_score=score,
            selection_reasons=reasons
        ))

    candidates.sort(key=lambda x: (x.suitability_score or 0.0), reverse=True)
    return candidates
