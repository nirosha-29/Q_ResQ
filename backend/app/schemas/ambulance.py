"""Pydantic schemas for ambulances and crew members."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CrewMemberOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    role: str
    qualification: str
    certification: str
    shift_status: str
    capabilities: List[str] = []
    is_demo: int = 1


class AmbulanceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    provider: str
    vehicle_number: str
    vehicle_type: str
    base_location: str
    current_location_name: str
    latitude: float
    longitude: float
    operational_status: str
    availability: str
    capabilities: List[str] = []
    equipment: List[str] = []
    data_source: str
    verification_status: str
    is_demo: int = 1
    last_updated: datetime
    crew_members: List[CrewMemberOut] = []
    
    # Dynamic properties calculated for specific emergency
    distance_km: Optional[float] = None
    estimated_response_minutes: Optional[float] = None
    suitability_score: Optional[float] = None
    selection_reasons: List[str] = Field(default_factory=list)
