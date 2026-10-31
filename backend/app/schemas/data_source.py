"""Schemas for data sources, freshness, and audit trail."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DataSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    data_type: str
    provider: str
    status: str
    last_retrieved: datetime
    record_count: int
    coverage_area: str
    verification_status: str
    is_real: bool
    notes: Optional[str] = None


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    entity_id: str
    actor_id: str
    actor_role: str
    details: str
    timestamp: datetime
