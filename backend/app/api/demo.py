"""API route to trigger the official Hackathon Scenario."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.auth import require_authenticated
from app.database import get_db
from app.integrations.demo_provider import DemoProvider

router = APIRouter(
    prefix="/api/demo",
    tags=["Hackathon Demo"],
    dependencies=[Depends(require_authenticated)],
)


@router.post("/load-scenario")
def load_hackathon_scenario(db: Session = Depends(get_db)):
    """Loads the complete hackathon scenario:
    - 3 simultaneous emergencies: E001 (Critical Cardiac), E002 (High Priority Trauma), E003 (Moderate Respiratory)
    - 2 ambulances: A001 (ALS Cardiac) & A002 (BLS Trauma)
    - 3 hospitals: H001, H002, H003
    - Enforces Scarcity (3 emergencies, 2 ambulances).
    """
    result = DemoProvider.load_hackathon_scenario(db)
    return result
