"""API routes for Ambulance resources."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.models.ambulance import Ambulance
from app.schemas.ambulance import AmbulanceOut

router = APIRouter(
    prefix="/api/ambulances",
    tags=["Ambulances"],
    dependencies=[Depends(require_authenticated)],
)


def format_ambulance_out(amb: Ambulance) -> AmbulanceOut:
    return AmbulanceOut(
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
        ]
    )


@router.get("", response_model=List[AmbulanceOut])
def list_ambulances(
    status: Optional[str] = None,
    availability: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ambulance)
    if status:
        query = query.filter(Ambulance.operational_status == status)
    if availability:
        query = query.filter(Ambulance.availability == availability)
    ambulances = query.all()
    return [format_ambulance_out(a) for a in ambulances]


@router.get("/{ambulance_id}", response_model=AmbulanceOut)
def get_ambulance(ambulance_id: str, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return format_ambulance_out(amb)
