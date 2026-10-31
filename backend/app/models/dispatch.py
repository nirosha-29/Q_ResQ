"""Dispatch execution model for confirmed assignments."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(String(50), primary_key=True, index=True)  # e.g., DISP-001
    allocation_id = Column(String(50), ForeignKey("allocations.id"), nullable=False)
    emergency_id = Column(String(50), ForeignKey("emergencies.id"), nullable=False)
    ambulance_id = Column(String(50), ForeignKey("ambulances.id"), nullable=False)
    hospital_id = Column(String(50), ForeignKey("hospitals.id"), nullable=False)
    
    dispatcher_id = Column(String(50), default="DISPATCHER-01")
    dispatcher_name = Column(String(100), default="Senior Officer - Bengaluru EMS")
    
    # Status progression
    status = Column(
        String(50),
        default="Dispatched"
    )  # Dispatched, En Route, At Scene, Transporting, At Hospital, Completed, Cancelled
    
    notes = Column(Text, nullable=True)
    dispatched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    arrived_at_scene = Column(DateTime, nullable=True)
    departed_scene = Column(DateTime, nullable=True)
    arrived_at_hospital = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    allocation = relationship("Allocation", back_populates="dispatches")
    emergency = relationship("Emergency", back_populates="dispatches")
    ambulance = relationship("Ambulance", back_populates="dispatches")
    hospital = relationship("Hospital", back_populates="dispatches")
