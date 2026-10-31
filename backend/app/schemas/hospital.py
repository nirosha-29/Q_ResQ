"""Pydantic schemas for hospitals and candidate matching."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class HospitalOut(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    name: str
    address: str
    city: str
    state: str
    pin: str
    latitude: float
    longitude: float
    operational_status: str
    emergency_department_status: str
    total_bed_capacity: int
    icu_capacity: int
    current_occupancy: int
    available_beds: int
    available_icu_beds: int
    capabilities: List[str] = []
    source: str
    data_freshness_status: str
    verification_status: str
    is_demo: int = 0
    last_updated: datetime
    
    # Dynamic values calculated for candidate selection
    distance_km: Optional[float] = None
    estimated_eta_minutes: Optional[float] = None
    suitability_score: Optional[float] = None
    selection_reasons: List[str] = Field(default_factory=list)
