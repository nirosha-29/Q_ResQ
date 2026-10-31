"""API endpoints for Dispatch confirmation, re-validation, and active case monitoring."""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated, require_dispatcher
from app.database import get_db
from app.models.allocation import Allocation
from app.models.dispatch import Dispatch
from app.models.ambulance import Ambulance
from app.models.emergency import Emergency
from app.models.hospital import Hospital
from app.models.data_source import AuditLog
from app.models.resource_reservation import ResourceReservation
from app.models.user import User
from app.schemas.allocation import DispatchConfirmRequest, DispatchOut
from app.api.emergencies import format_emergency_out
from app.api.auth import require_dispatcher
from app.services.validation_service import ValidationService
from app.services.resource_service import begin_resource_transaction

router = APIRouter(
    prefix="/api/dispatches",
    tags=["Dispatches"],
    dependencies=[Depends(require_authenticated)],
)


def format_dispatch_out(d: Dispatch) -> DispatchOut:
    e_out = format_emergency_out(d.emergency) if d.emergency else None
    
    amb_out = None
    if d.ambulance:
        amb = d.ambulance
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
            "crew_members": []
        }

    hosp_out = None
    if d.hospital:
        h = d.hospital
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
            "available_beds": h.available_beds,
            "available_icu_beds": h.available_icu_beds,
            "capabilities": h.capabilities,
            "source": h.source,
            "data_freshness_status": h.data_freshness_status,
            "verification_status": h.verification_status,
            "is_demo": h.is_demo,
            "last_updated": h.last_updated
        }

    return DispatchOut(
        id=d.id,
        allocation_id=d.allocation_id,
        emergency_id=d.emergency_id,
        ambulance_id=d.ambulance_id,
        hospital_id=d.hospital_id,
        dispatcher_id=d.dispatcher_id,
        dispatcher_name=d.dispatcher_name,
        status=d.status,
        notes=d.notes,
        dispatched_at=d.dispatched_at,
        arrived_at_scene=d.arrived_at_scene,
        departed_scene=d.departed_scene,
        arrived_at_hospital=d.arrived_at_hospital,
        completed_at=d.completed_at,
        emergency=e_out,
        ambulance=amb_out,
        hospital=hosp_out
    )


@router.post("/confirm", response_model=DispatchOut, dependencies=[Depends(require_dispatcher)])
def confirm_dispatch(
    payload: DispatchConfirmRequest,
    db: Session = Depends(get_db),
    dispatcher: User = Depends(require_dispatcher),
):
    """Revalidates resource conditions and issues confirmed dispatch order."""
    begin_resource_transaction(db)
    # 1. Perform strict pre-dispatch revalidation
    is_valid, error_msg = ValidationService.validate_for_dispatch(db, payload.allocation_id)
    if not is_valid:
        # Log failure
        audit_fail = AuditLog(
            event_type="REVALIDATION_FAILED",
            entity_id=payload.allocation_id,
            actor_id=payload.dispatcher_id,
            actor_role="Dispatcher",
            details=f"Pre-dispatch validation failed: {error_msg}"
        )
        db.add(audit_fail)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Resource state changed. Re-optimization required: {error_msg}"
        )

    alloc = db.query(Allocation).filter(
        Allocation.id == payload.allocation_id,
    ).with_for_update().first()
    emergency = db.query(Emergency).filter(Emergency.id == alloc.emergency_id).first()
    ambulance = db.query(Ambulance).filter(Ambulance.id == alloc.ambulance_id).first()

    # 2. Create Dispatch
    disp_id = f"DISP-{uuid.uuid4().hex[:8].upper()}"
    dispatch = Dispatch(
        id=disp_id,
        allocation_id=alloc.id,
        emergency_id=alloc.emergency_id,
        ambulance_id=alloc.ambulance_id,
        hospital_id=alloc.hospital_id,
        dispatcher_id=str(dispatcher.id),
        dispatcher_name=dispatcher.full_name,
        status="Dispatched",
        notes=payload.notes,
        dispatched_at=datetime.now(timezone.utc)
    )
    db.add(dispatch)

    # 3. Update status of emergency, ambulance, and allocation
    emergency.status = "Dispatched"
    emergency.updated_at = datetime.now(timezone.utc)
    ambulance.availability = "Dispatched"
    ambulance.last_updated = datetime.now(timezone.utc)
    alloc.status = "APPROVED"

    # 4. Log audit trail
    audit = AuditLog(
        event_type="DISPATCH_CONFIRMED",
        entity_id=disp_id,
        actor_id=str(dispatcher.id),
        actor_role=dispatcher.role,
        details=f"Dispatch {disp_id} confirmed for {emergency.id}. Unit {ambulance.id} en route to scene. Receiving facility: {alloc.hospital.name if alloc.hospital else alloc.hospital_id}."
    )
    db.add(audit)
    db.commit()
    db.refresh(dispatch)

    return format_dispatch_out(dispatch)


@router.get("", response_model=List[DispatchOut])
def list_dispatches(db: Session = Depends(get_db)):
    dispatches = db.query(Dispatch).order_by(Dispatch.dispatched_at.desc()).all()
    return [format_dispatch_out(d) for d in dispatches]


@router.post("/{dispatch_id}/status", dependencies=[Depends(require_dispatcher)])
def update_dispatch_status(dispatch_id: str, new_status: str, db: Session = Depends(get_db)):
    """Advances dispatch lifecycle (En Route, At Scene, Transporting, At Hospital, Completed)."""
    if new_status not in {"En Route", "At Scene", "Transporting", "At Hospital", "Completed", "Cancelled"}:
        raise HTTPException(status_code=422, detail="Unsupported dispatch status.")
    begin_resource_transaction(db)
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    previous_status = dispatch.status
    dispatch.status = new_status
    now = datetime.now(timezone.utc)
    
    if new_status == "At Scene":
        dispatch.arrived_at_scene = now
    elif new_status == "Transporting":
        dispatch.departed_scene = now
    elif new_status == "At Hospital":
        dispatch.arrived_at_hospital = now
    if new_status in {"At Hospital", "Completed"} and previous_status not in {"At Hospital", "Completed"}:
        reservation = db.query(ResourceReservation).filter(
            ResourceReservation.allocation_id == dispatch.allocation_id,
        ).with_for_update().first()
        hospital = db.query(Hospital).filter(
            Hospital.id == dispatch.hospital_id,
        ).with_for_update().first()
        if reservation and hospital:
            hospital.current_occupancy += reservation.bed_count
            hospital.available_beds = max(0, hospital.available_beds - reservation.bed_count)
            hospital.available_icu_beds = max(0, hospital.available_icu_beds - reservation.icu_bed_count)
            reservation.bed_count = 0
            reservation.icu_bed_count = 0

    if new_status == "Completed":
        dispatch.completed_at = now
        amb = db.query(Ambulance).filter(Ambulance.id == dispatch.ambulance_id).first()
        if amb:
            amb.availability = "Available"
        em = db.query(Emergency).filter(Emergency.id == dispatch.emergency_id).first()
        if em:
            em.status = "Completed"
        db.query(ResourceReservation).filter(
            ResourceReservation.allocation_id == dispatch.allocation_id,
        ).delete(synchronize_session=False)
    elif new_status == "Cancelled":
        amb = db.query(Ambulance).filter(Ambulance.id == dispatch.ambulance_id).first()
        if amb:
            amb.availability = "Available"
        em = db.query(Emergency).filter(Emergency.id == dispatch.emergency_id).first()
        if em:
            em.status = "Cancelled"
        db.query(ResourceReservation).filter(
            ResourceReservation.allocation_id == dispatch.allocation_id,
        ).delete(synchronize_session=False)

    db.commit()
    return {"status": "success", "dispatch_id": dispatch_id, "current_status": new_status}
