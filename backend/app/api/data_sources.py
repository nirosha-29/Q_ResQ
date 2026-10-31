"""API routes for Data Sources registry and audit logs."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.models.data_source import DataSource, AuditLog
from app.schemas.data_source import DataSourceOut, AuditLogOut

router = APIRouter(
    prefix="/api/data-sources",
    tags=["Data Sources"],
    dependencies=[Depends(require_authenticated)],
)


@router.get("", response_model=List[DataSourceOut])
def list_data_sources(db: Session = Depends(get_db)):
    sources = db.query(DataSource).all()
    return sources


@router.get("/audit-logs", response_model=List[AuditLogOut])
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
    return logs
