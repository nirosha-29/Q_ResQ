"""Emergency models including requirements and priority calculations."""

from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(String(50), primary_key=True, index=True)  # e.g., E-2026-001 or E001
    patient_id = Column(String(50), nullable=True)
    patient_name = Column(String(100), nullable=False)
    patient_age = Column(Integer, nullable=False)
    patient_gender = Column(String(20), nullable=False)
    patient_count = Column(Integer, default=1)
    
    emergency_type = Column(String(50), nullable=False)  # Cardiac, Trauma, Road Accident, Stroke, etc.
    symptoms = Column(Text, nullable=False)
    reported_severity = Column(String(20), nullable=False)  # Critical, High, Moderate, Low
    additional_notes = Column(Text, nullable=True)
    
    # Location
    address = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Calculated priority
    calculated_priority = Column(String(20), nullable=True)  # CRITICAL, HIGH, MODERATE, LOW
    priority_score = Column(Float, nullable=True)  # 0.0 - 100.0
    priority_explanation = Column(Text, nullable=True)
    
    # Operational Status
    status = Column(
        String(50),
        default="Registered"
    )  # Registered, Prioritizing, Awaiting Allocation, Allocated, Awaiting Approval, Dispatched, En Route, At Scene, Transporting, At Hospital, Completed, Cancelled, Unserved
    
    is_demo = Column(Integer, default=0)  # 1 for simulated/demo data, 0 for real
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    requirements = relationship("EmergencyRequirement", back_populates="emergency", uselist=False, cascade="all, delete-orphan")
    allocations = relationship("Allocation", back_populates="emergency", cascade="all, delete-orphan")
    dispatches = relationship("Dispatch", back_populates="emergency", cascade="all, delete-orphan")


class EmergencyRequirement(Base):
    __tablename__ = "emergency_requirements"

    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(String(50), ForeignKey("emergencies.id"), nullable=False, unique=True)
    
    # Stored as JSON serialized lists
    capabilities_json = Column(Text, default="[]")  # e.g., ["BLS", "ALS", "Cardiac"]
    equipment_json = Column(Text, default="[]")     # e.g., ["Oxygen", "Defibrillator", "ECG"]
    
    emergency = relationship("Emergency", back_populates="requirements")

    @property
    def capabilities(self):
        try:
            return json.loads(self.capabilities_json) if self.capabilities_json else []
        except Exception:
            return []

    @capabilities.setter
    def capabilities(self, value):
        self.capabilities_json = json.dumps(value if isinstance(value, list) else [])

    @property
    def equipment(self):
        try:
            return json.loads(self.equipment_json) if self.equipment_json else []
        except Exception:
            return []

    @equipment.setter
    def equipment(self, value):
        self.equipment_json = json.dumps(value if isinstance(value, list) else [])
