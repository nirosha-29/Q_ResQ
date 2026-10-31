"""Ambulance and crew models."""

from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(String(50), primary_key=True, index=True)  # e.g., AMB-BLR-01 or A001
    provider = Column(String(100), nullable=False)  # e.g., GVK EMRI 108, Manipal Ambulance Network
    vehicle_number = Column(String(50), nullable=False)  # e.g., KA-01-EA-1080
    vehicle_type = Column(String(50), nullable=False)  # BLS, ALS, Critical Care, Cardiac, Neonatal, Trauma, Other
    
    base_location = Column(String(255), nullable=False)
    current_location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    operational_status = Column(String(50), default="Active")  # Active, Maintenance, Out of Service
    availability = Column(String(50), default="Available")    # Available, Dispatched, Busy, Maintenance
    
    # JSON arrays of capabilities and equipment
    capabilities_json = Column(Text, default="[]")  # e.g. ["BLS", "ALS", "Cardiac"]
    equipment_json = Column(Text, default="[]")     # e.g. ["Oxygen", "Defibrillator", "ECG", "Ventilator"]
    
    data_source = Column(String(100), default="SIMULATED")  # OSM, PUBLIC_REGISTRY, SIMULATED
    verification_status = Column(String(50), default="Verified")  # Verified, Unverified, Live integration unavailable
    is_demo = Column(Integer, default=1)
    
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    crew_members = relationship("CrewMember", back_populates="ambulance", cascade="all, delete-orphan")
    allocations = relationship("Allocation", back_populates="ambulance")
    dispatches = relationship("Dispatch", back_populates="ambulance")

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


class CrewMember(Base):
    __tablename__ = "crew_members"

    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(String(50), ForeignKey("ambulances.id"), nullable=False)
    
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)  # Driver, EMT, Paramedic, Nurse, Doctor, Critical Care Paramedic
    qualification = Column(String(100), nullable=False)
    certification = Column(String(100), nullable=False)
    shift_status = Column(String(50), default="On-Duty")  # On-Duty, Off-Duty, On-Break
    capabilities_json = Column(Text, default="[]")
    is_demo = Column(Integer, default=1)

    ambulance = relationship("Ambulance", back_populates="crew_members")

    @property
    def capabilities(self):
        try:
            return json.loads(self.capabilities_json) if self.capabilities_json else []
        except Exception:
            return []

    @capabilities.setter
    def capabilities(self, value):
        self.capabilities_json = json.dumps(value if isinstance(value, list) else [])
