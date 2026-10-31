"""Real-time operational EMS dashboard statistics API."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.models.emergency import Emergency
from app.models.ambulance import Ambulance
from app.models.hospital import Hospital
from app.models.dispatch import Dispatch
from app.models.allocation import Allocation
from app.services.resource_service import remaining_hospital_capacity

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(require_authenticated)],
)


@router.get("/stats")
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """Computes all dashboard metrics dynamically from live database state."""
    # Active emergencies (not yet completed or cancelled)
    active_emergencies = db.query(Emergency).filter(
        Emergency.status.in_([
            "Registered", "Prioritizing", "Awaiting Allocation",
            "Allocated", "Awaiting Approval", "Dispatched",
            "En Route", "At Scene", "Transporting", "At Hospital"
        ])
    ).count()

    critical_emergencies = db.query(Emergency).filter(
        Emergency.calculated_priority == "CRITICAL",
        Emergency.status != "Completed",
        Emergency.status != "Cancelled"
    ).count()
    high_emergencies = db.query(Emergency).filter(
        Emergency.calculated_priority == "HIGH",
        Emergency.status.notin_(["Completed", "Cancelled"]),
    ).count()
    moderate_emergencies = db.query(Emergency).filter(
        Emergency.calculated_priority == "MODERATE",
        Emergency.status.notin_(["Completed", "Cancelled"]),
    ).count()

    total_emergencies = db.query(Emergency).count()
    total_ambulances = db.query(Ambulance).count()
    available_ambulances = db.query(Ambulance).filter(
        Ambulance.operational_status == "Active",
        Ambulance.availability == "Available"
    ).count()

    pending_allocations = db.query(Emergency).filter(
        Emergency.status.in_(["Awaiting Allocation", "Awaiting Approval"])
    ).count()

    active_dispatches = db.query(Dispatch).filter(
        Dispatch.status.in_(["Dispatched", "En Route", "At Scene", "Transporting", "At Hospital"])
    ).count()

    unserved_emergencies = db.query(Emergency).filter(
        Emergency.status == "Unserved"
    ).count()

    nearby_hospitals = db.query(Hospital).filter(
        Hospital.operational_status == "Active"
    ).count()
    active_hospital_rows = db.query(Hospital).filter(
        Hospital.operational_status == "Active"
    ).all()
    available_hospital_beds = 0
    available_icu_beds = 0
    for hospital in active_hospital_rows:
        beds, icu_beds = remaining_hospital_capacity(db, hospital)
        available_hospital_beds += beds
        available_icu_beds += icu_beds

    # Utilization % = (busy + dispatched / total)
    busy_ambulances = db.query(Ambulance).filter(
        Ambulance.availability.in_(["Dispatched", "Busy", "Assigned"])
    ).count()
    assigned_emergencies = db.query(Emergency).filter(
        Emergency.status.in_([
            "Awaiting Approval", "Dispatched", "En Route", "At Scene",
            "Transporting", "At Hospital",
        ])
    ).count()
    utilization_rate = round((busy_ambulances / max(1, total_ambulances)) * 100.0, 1)

    return {
        "total_emergencies": total_emergencies,
        "active_emergencies": active_emergencies,
        "critical_emergencies": critical_emergencies,
        "high_emergencies": high_emergencies,
        "moderate_emergencies": moderate_emergencies,
        "total_ambulances": total_ambulances,
        "available_ambulances": available_ambulances,
        "busy_ambulances": busy_ambulances,
        "pending_allocations": pending_allocations,
        "assigned_emergencies": assigned_emergencies,
        "active_dispatches": active_dispatches,
        "nearby_hospitals": nearby_hospitals,
        "available_hospital_beds": available_hospital_beds,
        "available_icu_beds": available_icu_beds,
        "unserved_emergencies": unserved_emergencies,
        "resource_utilization_percent": utilization_rate,
        "scarcity_active": (active_emergencies > available_ambulances) or (unserved_emergencies > 0)
    }
