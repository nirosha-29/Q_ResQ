"""Allocation models representing candidate plans, alternatives, scores, and dispatcher approval."""

from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(String(50), primary_key=True, index=True)  # e.g., ALLOC-001
    emergency_id = Column(String(50), ForeignKey("emergencies.id"), nullable=False)
    ambulance_id = Column(String(50), ForeignKey("ambulances.id"), nullable=True)  # Can be None if unserved in scarcity
    hospital_id = Column(String(50), ForeignKey("hospitals.id"), nullable=True)
    
    optimization_run_id = Column(String(50), ForeignKey("optimization_runs.id"), nullable=True)
    
    plan_type = Column(String(20), default="RECOMMENDED")  # RECOMMENDED, ALTERNATIVE_1, ALTERNATIVE_2
    
    # Quantitative metrics
    suitability_score = Column(Float, default=0.0)  # 0 to 100%
    estimated_ambulance_eta_minutes = Column(Float, default=0.0)
    estimated_hospital_eta_minutes = Column(Float, default=0.0)
    total_estimated_time_minutes = Column(Float, default=0.0)
    estimated_distance_km = Column(Float, default=0.0)
    
    # Explainability details
    why_ambulance_selected = Column(Text, nullable=True)
    why_hospital_selected = Column(Text, nullable=True)
    why_this_plan = Column(Text, nullable=True)
    
    # Route geometric representation (JSON list of lat/lng pairs)
    route_geometry_json = Column(Text, default="[]")
    
    # Status and dispatcher approval
    status = Column(String(50), default="PROPOSED")  # PROPOSED, APPROVED, REJECTED, SUPERSEDED
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    emergency = relationship("Emergency", back_populates="allocations")
    ambulance = relationship("Ambulance", back_populates="allocations")
    hospital = relationship("Hospital", back_populates="allocations")
    optimization_run = relationship("OptimizationRun", back_populates="allocations")
    dispatches = relationship("Dispatch", back_populates="allocation")

    @property
    def route_geometry(self):
        try:
            return json.loads(self.route_geometry_json) if self.route_geometry_json else []
        except Exception:
            return []

    @route_geometry.setter
    def route_geometry(self, value):
        self.route_geometry_json = json.dumps(value if isinstance(value, list) else [])
