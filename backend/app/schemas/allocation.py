"""Pydantic schemas for allocations, recommendations, and plans."""

from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from app.schemas.emergency import EmergencyOut
from app.schemas.ambulance import AmbulanceOut
from app.schemas.hospital import HospitalOut


class AllocationOut(BaseModel):
    id: str
    emergency_id: str
    ambulance_id: Optional[str] = None
    hospital_id: Optional[str] = None
    optimization_run_id: Optional[str] = None
    plan_type: str  # RECOMMENDED, ALTERNATIVE_1, ALTERNATIVE_2
    suitability_score: float
    estimated_ambulance_eta_minutes: float
    estimated_hospital_eta_minutes: float
    total_estimated_time_minutes: float
    estimated_distance_km: float
    why_ambulance_selected: Optional[str] = None
    why_hospital_selected: Optional[str] = None
    why_this_plan: Optional[str] = None
    route_geometry: List[List[float]] = []  # list of [lat, lng]
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    # Full nested objects for detailed display
    emergency: Optional[EmergencyOut] = None
    ambulance: Optional[AmbulanceOut] = None
    hospital: Optional[HospitalOut] = None
    model_config = {"from_attributes": True}


class AllocationApprovalRequest(BaseModel):
    approved_by: str = "EMS Dispatcher"
    override_reason: Optional[str] = None


class AllocationRejectionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class DispatchConfirmRequest(BaseModel):
    allocation_id: str
    dispatcher_id: str = "DISP-USER-01"
    dispatcher_name: str = "Lead Dispatcher - Bengaluru EMS"
    notes: Optional[str] = None


class DispatchOut(BaseModel):
    id: str
    allocation_id: str
    emergency_id: str
    ambulance_id: str
    hospital_id: str
    dispatcher_id: str
    dispatcher_name: str
    status: str
    notes: Optional[str] = None
    dispatched_at: datetime
    arrived_at_scene: Optional[datetime] = None
    departed_scene: Optional[datetime] = None
    arrived_at_hospital: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    emergency: Optional[EmergencyOut] = None
    ambulance: Optional[AmbulanceOut] = None
    hospital: Optional[HospitalOut] = None
    model_config = {"from_attributes": True}


class OptimizationResponse(BaseModel):
    optimization_run_id: str
    timestamp: datetime
    scarcity_detected: bool
    scarcity_details: Optional[str] = None
    
    classical_result: Dict[str, Any]
    quantum_result: Dict[str, Any]
    quantum_fallback_activated: bool
    
    # Plans for the targeted emergency (or multiple emergencies if batch)
    recommended_allocation: Optional[AllocationOut] = None
    alternative_allocations: List[AllocationOut] = []
    
    all_allocations: List[AllocationOut] = []
    unserved_emergencies: List[str] = []
