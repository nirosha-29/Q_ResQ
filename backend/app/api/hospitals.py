"""API routes for Hospital facilities."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.models.hospital import Hospital
from app.schemas.hospital import HospitalOut
from app.services.resource_service import remaining_hospital_capacity

router = APIRouter(
    prefix="/api/hospitals",
    tags=["Hospitals"],
    dependencies=[Depends(require_authenticated)],
)


def format_hospital_out(h: Hospital, db: Session) -> HospitalOut:
    available_beds, available_icu_beds = remaining_hospital_capacity(db, h)
    return HospitalOut(
        id=h.id,
        name=h.name,
        address=h.address,
        city=h.city,
        state=h.state,
        pin=h.pin,
        latitude=h.latitude,
        longitude=h.longitude,
        operational_status=h.operational_status,
        emergency_department_status=h.emergency_department_status,
        total_bed_capacity=h.total_bed_capacity,
        icu_capacity=h.icu_capacity,
        current_occupancy=h.current_occupancy,
        available_beds=available_beds,
        available_icu_beds=available_icu_beds,
        capabilities=h.capabilities,
        source=h.source,
        data_freshness_status=h.data_freshness_status,
        verification_status=h.verification_status,
        is_demo=h.is_demo,
        last_updated=h.last_updated
    )


@router.get("", response_model=List[HospitalOut])
def list_hospitals(
    specialty: Optional[str] = None,
    operational_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Hospital)
    if operational_status:
        query = query.filter(Hospital.operational_status == operational_status)
    hospitals = query.all()
    
    if specialty:
        spec_lower = specialty.lower()
        hospitals = [h for h in hospitals if any(spec_lower in c.lower() for c in h.capabilities)]
        
    return [format_hospital_out(h, db) for h in hospitals]


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital(hospital_id: str, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return format_hospital_out(hosp, db)
