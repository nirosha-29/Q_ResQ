"""Authentication, concurrent intake, and resource reservation regression tests."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

from app.api.allocations import approve_allocation
from app.api.auth import router as auth_router
from app.api.dispatches import router as dispatches_router
from app.api.emergencies import router as emergencies_router
from app.database import Base, get_db
from app.integrations.demo_provider import DemoProvider
from app.models.allocation import Allocation
from app.models.user import AuthCredential, AuthSession, User
from app.schemas.allocation import AllocationApprovalRequest
from app.services.auth_service import hash_password, hash_session_token


@pytest.fixture
def auth_test_environment(tmp_path):
    engine = create_engine(
        URL.create("sqlite", database=str(tmp_path / "auth-test.db")),
        connect_args={"check_same_thread": False, "timeout": 30},
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    seed_db = test_session()
    dispatcher = User(
        username="dispatcher-test",
        full_name="Test Dispatcher",
        email="dispatcher-test@example.invalid",
        role="Dispatcher",
        is_active=True,
    )
    coordinator = User(
        username="coordinator-test",
        full_name="Test Coordinator",
        email="coordinator-test@example.invalid",
        role="Hospital Coordinator",
        is_active=True,
    )
    seed_db.add_all([dispatcher, coordinator])
    seed_db.flush()
    seed_db.add_all([
        AuthCredential(user_id=dispatcher.id, password_hash=hash_password("test-password")),
        AuthCredential(user_id=coordinator.id, password_hash=hash_password("test-password")),
    ])
    seed_db.commit()
    seed_db.close()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(emergencies_router)
    app.include_router(dispatches_router)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield app, test_session
    app.dependency_overrides.clear()
    engine.dispose()


def _emergency_payload(name: str) -> dict:
    return {
        "patient_name": name,
        "patient_age": 42,
        "patient_gender": "Other",
        "patient_count": 1,
        "emergency_type": "Respiratory",
        "symptoms": "Difficulty breathing",
        "reported_severity": "Moderate",
        "address": "Test location",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "required_capabilities": [],
        "required_equipment": [],
    }


def test_login_rejects_bad_credentials_and_unknown_users(auth_test_environment):
    app, _ = auth_test_environment
    with TestClient(app) as client:
        for username, password in [
            ("dispatcher-test", "wrong-password"),
            ("unknown-user", "test-password"),
        ]:
            response = client.post(
                "/api/auth/login",
                json={"username": username, "password": password},
            )
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid username or password"


def test_login_cookie_protects_api_and_logout_revokes_session(auth_test_environment):
    app, test_session = auth_test_environment
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "dispatcher-test", "password": "test-password"},
        )
        assert login.status_code == 200
        assert "token" not in login.json()
        assert "httponly" in login.headers["set-cookie"].lower()
        assert client.get("/api/emergencies").status_code == 200

        raw_token = client.cookies.get("q_resq_session")
        db = test_session()
        try:
            stored_session = db.query(AuthSession).first()
            assert stored_session is not None
            assert stored_session.token_hash == hash_session_token(raw_token)
            assert raw_token != stored_session.token_hash
        finally:
            db.close()

        logout = client.post("/api/auth/logout")
        assert logout.status_code == 200
        assert client.get("/api/emergencies").status_code == 401


def test_hospital_coordinator_cannot_confirm_dispatch(auth_test_environment):
    app, _ = auth_test_environment
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "coordinator-test", "password": "test-password"},
        )
        assert login.status_code == 200
        response = client.post(
            "/api/dispatches/confirm",
            json={"allocation_id": "not-used"},
        )
        assert response.status_code == 403


def test_simultaneous_emergency_registrations_get_distinct_ids(auth_test_environment):
    app, _ = auth_test_environment
    with TestClient(app) as login_client:
        login = login_client.post(
            "/api/auth/login",
            json={"username": "dispatcher-test", "password": "test-password"},
        )
        assert login.status_code == 200
        token = login_client.cookies.get("q_resq_session")

    def register(index: int) -> str:
        with TestClient(app) as client:
            client.cookies.set("q_resq_session", token)
            response = client.post(
                "/api/emergencies",
                json=_emergency_payload(f"Concurrent {index}"),
            )
            assert response.status_code == 200
            return response.json()["id"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        emergency_ids = list(executor.map(register, [1, 2]))
    assert len(set(emergency_ids)) == 2


def test_concurrent_approvals_cannot_reserve_one_ambulance_twice(auth_test_environment):
    _, test_session = auth_test_environment
    db = test_session()
    try:
        DemoProvider.load_hackathon_scenario(db)
        db.add_all([
            Allocation(
                id="ALLOC-RACE-1",
                emergency_id="E001",
                ambulance_id="A001",
                hospital_id="H001",
                status="PROPOSED",
                plan_type="RECOMMENDED",
                suitability_score=90,
                estimated_ambulance_eta_minutes=5,
                estimated_hospital_eta_minutes=5,
                total_estimated_time_minutes=10,
                estimated_distance_km=5,
                created_at=datetime.now(timezone.utc),
            ),
            Allocation(
                id="ALLOC-RACE-2",
                emergency_id="E002",
                ambulance_id="A001",
                hospital_id="H001",
                status="PROPOSED",
                plan_type="RECOMMENDED",
                suitability_score=90,
                estimated_ambulance_eta_minutes=5,
                estimated_hospital_eta_minutes=5,
                total_estimated_time_minutes=10,
                estimated_distance_km=5,
                created_at=datetime.now(timezone.utc),
            ),
        ])
        db.commit()
        db.close()
    except Exception:
        db.close()
        raise

    def approve(allocation_id: str) -> str:
        approval_db = test_session()
        try:
            dispatcher = approval_db.query(User).filter(User.username == "dispatcher-test").first()
            try:
                approve_allocation(
                    allocation_id,
                    AllocationApprovalRequest(),
                    db=approval_db,
                    dispatcher=dispatcher,
                )
                return "approved"
            except HTTPException as error:
                assert error.status_code == 409
                return "conflict"
        finally:
            approval_db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(approve, ["ALLOC-RACE-1", "ALLOC-RACE-2"]))
    assert sorted(outcomes) == ["approved", "conflict"]
