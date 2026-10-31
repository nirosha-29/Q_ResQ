"""Resource reservation and hospital capacity calculations."""

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.allocation import Allocation
from app.models.emergency import Emergency
from app.models.hospital import Hospital
from app.models.resource_reservation import ResourceReservation


_TERMINAL_EMERGENCY_STATUSES = {"Completed", "Cancelled"}


def begin_resource_transaction(db: Session) -> None:
    """Serialize resource confirmations on SQLite and rely on row locks elsewhere."""
    if db.get_bind().dialect.name == "sqlite":
        db.commit()
        db.execute(text("BEGIN IMMEDIATE"))


def remaining_hospital_capacity(db: Session, hospital: Hospital) -> tuple[int, int]:
    reservations = db.query(ResourceReservation).filter(
        ResourceReservation.hospital_id == hospital.id,
    ).all()
    reserved_allocation_ids = {reservation.allocation_id for reservation in reservations}
    reserved_beds = sum(reservation.bed_count for reservation in reservations)
    reserved_icu_beds = sum(reservation.icu_bed_count for reservation in reservations)

    legacy_allocations = db.query(Allocation, Emergency).join(
        Emergency,
        Emergency.id == Allocation.emergency_id,
    ).outerjoin(
        ResourceReservation,
        ResourceReservation.allocation_id == Allocation.id,
    ).filter(
        Allocation.hospital_id == hospital.id,
        Allocation.status == "APPROVED",
        Emergency.status.notin_(_TERMINAL_EMERGENCY_STATUSES),
        ResourceReservation.allocation_id.is_(None),
    ).all()
    for allocation, emergency in legacy_allocations:
        if allocation.id not in reserved_allocation_ids:
            reserved_beds += max(1, emergency.patient_count or 1)
            if emergency.calculated_priority == "CRITICAL":
                reserved_icu_beds += max(1, emergency.patient_count or 1)

    return (
        max(0, hospital.available_beds - reserved_beds),
        max(0, hospital.available_icu_beds - reserved_icu_beds),
    )
