"""Data source registry, freshness tracking, and audit logging models."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from app.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String(50), primary_key=True, index=True)  # e.g., OSM-OVERPASS, OSRM-ROUTING, SIMULATED-FLEET
    name = Column(String(150), nullable=False)
    data_type = Column(String(100), nullable=False)  # Hospitals & Facilities, Routing & ETAs, Ambulance Telemetry
    provider = Column(String(150), nullable=False)  # OpenStreetMap, Project OSRM, Q-ResQ Simulation Engine
    status = Column(String(50), default="OPERATIONAL")  # OPERATIONAL, DEGRADED, SIMULATED_FALLBACK, OFFLINE
    
    last_retrieved = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    record_count = Column(Integer, default=0)
    coverage_area = Column(String(150), default="Bengaluru Metropolitan Area")
    verification_status = Column(String(100), default="Public Open Data")
    is_real = Column(Boolean, default=True)  # True if real external public data, False if synthetic/demo
    notes = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)  # EMERGENCY_REGISTERED, PRIORITY_CALCULATED, OPTIMIZATION_RUN, ALLOCATION_APPROVED, DISPATCH_CONFIRMED, REVALIDATION_FAILED
    entity_id = Column(String(100), nullable=False)
    actor_id = Column(String(100), default="SYSTEM")
    actor_role = Column(String(50), default="EMS Dispatcher")
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
