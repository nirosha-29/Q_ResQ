"""Re-validation service for final human dispatcher confirmation."""

from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app.models.allocation import Allocation
from app.models.ambulance import Ambulance
from app.models.hospital import Hospital
from app.models.emergency import Emergency
from app.models.resource_reservation import ResourceReservation


class ValidationService:
    @staticmethod
    def validate_for_dispatch(db: Session, allocation_id: str) -> Tuple[bool, Optional[str]]:
        """Pre-dispatch validation check.
        
        Guarantees that:
        1. Allocation exists and has been explicitly approved by a dispatcher.
        2. Emergency has not been cancelled or already serviced.
        3. Ambulance is still active and not assigned elsewhere.
        4. Hospital Emergency Department is not closed or diverting.
        """
        allocation = db.query(Allocation).filter(Allocation.id == allocation_id).first()
        if not allocation:
            return False, "Allocation record not found."

        if allocation.status != "APPROVED":
            return False, "Allocation must be approved by a dispatcher before dispatch."

        reservation = db.query(ResourceReservation).filter(
            ResourceReservation.allocation_id == allocation.id,
            ResourceReservation.emergency_id == allocation.emergency_id,
            ResourceReservation.ambulance_id == allocation.ambulance_id,
            ResourceReservation.hospital_id == allocation.hospital_id,
        ).first()
        if not reservation:
            return False, "The allocation no longer holds its required resource reservation."

        emergency = db.query(Emergency).filter(Emergency.id == allocation.emergency_id).first()
        if not emergency:
            return False, "Associated emergency record not found."
            
        if emergency.status in ["Dispatched", "En Route", "Completed", "Cancelled"]:
            return False, f"Emergency status is currently '{emergency.status}'. Cannot re-dispatch."

        if not allocation.ambulance_id:
            return False, "No ambulance assigned in this allocation (unserved due to resource scarcity)."

        ambulance = db.query(Ambulance).filter(Ambulance.id == allocation.ambulance_id).first()
        if not ambulance:
            return False, f"Ambulance {allocation.ambulance_id} does not exist in registry."

        if ambulance.operational_status != "Active":
            return False, f"Ambulance {ambulance.id} operational status changed to '{ambulance.operational_status}'. Re-optimization required."

        if ambulance.availability != "Assigned":
            return False, f"Ambulance {ambulance.id} availability changed to '{ambulance.availability}'. Re-optimization required."

        hospital = db.query(Hospital).filter(Hospital.id == allocation.hospital_id).first()
        if not hospital:
            return False, f"Hospital {allocation.hospital_id} does not exist in facility registry."

        if hospital.operational_status != "Active":
            return False, f"Hospital {hospital.name} operational status changed to '{hospital.operational_status}'. Re-optimization required."

        if hospital.emergency_department_status != "Open":
            return False, f"Hospital {hospital.name} ED status is '{hospital.emergency_department_status}'. Re-optimization required."

        return True, None
