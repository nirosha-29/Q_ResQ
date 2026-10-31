"""Hospital and capacity models."""

from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(50), primary_key=True, index=True)  # e.g., H001 or HOSP-BLR-01
    name = Column(String(200), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), default="Bengaluru")
    state = Column(String(100), default="Karnataka")
    pin = Column(String(20), default="560001")
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    operational_status = Column(String(50), default="Active")  # Active, Diverting, Overwhelmed
    emergency_department_status = Column(String(50), default="Open")  # Open, Full, Diverting
    
    # Capacity numbers
    total_bed_capacity = Column(Integer, default=200)
    icu_capacity = Column(Integer, default=30)
    current_occupancy = Column(Integer, default=150)
    available_beds = Column(Integer, default=50)
    available_icu_beds = Column(Integer, default=8)
    
    # Capabilities list in JSON
    capabilities_json = Column(Text, default="[]")
    
    # Verification & source tracking
    source = Column(String(100), default="OpenStreetMap / ABDM Public Registry")
    data_freshness_status = Column(String(50), default="Live integration unavailable")  # Live, Cached, Live integration unavailable
    verification_status = Column(String(50), default="Verified")
    is_demo = Column(Integer, default=0)  # 0 for real public data, 1 for simulated scenario
    
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    allocations = relationship("Allocation", back_populates="hospital")
    dispatches = relationship("Dispatch", back_populates="hospital")

    @property
    def capabilities(self):
        try:
            return json.loads(self.capabilities_json) if self.capabilities_json else []
        except Exception:
            return []

    @capabilities.setter
    def capabilities(self, value):
        self.capabilities_json = json.dumps(value if isinstance(value, list) else [])
