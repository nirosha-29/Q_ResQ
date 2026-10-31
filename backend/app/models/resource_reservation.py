"""Confirmed ambulance and hospital capacity reservations."""

from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from app.database import Base


class ResourceReservation(Base):
    __tablename__ = "resource_reservations"

    allocation_id = Column(
        String(50),
        ForeignKey("allocations.id"),
        primary_key=True,
    )
    emergency_id = Column(
        String(50),
        ForeignKey("emergencies.id"),
        nullable=False,
        unique=True,
    )
    ambulance_id = Column(
        String(50),
        ForeignKey("ambulances.id"),
        nullable=False,
        unique=True,
    )
    hospital_id = Column(
        String(50),
        ForeignKey("hospitals.id"),
        nullable=False,
        index=True,
    )
    bed_count = Column(Integer, nullable=False)
    icu_bed_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
