"""Pydantic schemas for emergency intake, requirements, and priority."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class EmergencyRequirementCreate(BaseModel):
    capabilities: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)


class EmergencyRequirementOut(BaseModel):
    model_config = {"from_attributes": True}
    capabilities: List[str] = []
    equipment: List[str] = []


class EmergencyCreate(BaseModel):
    patient_id: Optional[str] = None
    patient_name: str
    patient_age: int
    patient_gender: str
    patient_count: int = 1
    
    emergency_type: str
    symptoms: str
    reported_severity: str
    additional_notes: Optional[str] = None
    
    address: str
    latitude: float
    longitude: float
    
    required_capabilities: List[str] = Field(default_factory=list)
    required_equipment: List[str] = Field(default_factory=list)
    is_demo: int = 0


class EmergencyOut(BaseModel):
    id: str
    patient_id: Optional[str] = None
    patient_name: str
    patient_age: int
    patient_gender: str
    patient_count: int = 1
    
    emergency_type: str
    symptoms: str
    reported_severity: str
    additional_notes: Optional[str] = None
    
    address: str
    latitude: float
    longitude: float
    
    calculated_priority: Optional[str] = None
    priority_score: Optional[float] = None
    priority_explanation: Optional[str] = None
    
    status: str
    is_demo: int = 0
    created_at: datetime
    updated_at: datetime
    
    required_capabilities: List[str] = []
    required_equipment: List[str] = []
    model_config = {"from_attributes": True}


class PriorityCalculationResult(BaseModel):
    emergency_id: str
    calculated_priority: str  # CRITICAL, HIGH, MODERATE, LOW
    priority_score: float
    explanation: str
    safety_disclaimer: str = "Decision support only. Not medical diagnosis."
