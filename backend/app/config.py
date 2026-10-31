"""Application configuration module for Q-ResQ."""

import os
from typing import List
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "Q-ResQ"
    PROJECT_TITLE: str = "AI-Powered Emergency Medical Services Resource Allocation and Hospital Coordination Platform"
    TEAM_NAME: str = "QUBITNOVA"
    TRACK: str = "Quantum AI & Software"
    VERSION: str = "1.0.0"
    TIMEZONE: str = "Asia/Kolkata"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEMO_PASSWORD: str = os.getenv(
        "Q_RESQ_DEMO_PASSWORD",
        "demo123" if os.getenv("ENVIRONMENT", "development").lower() != "production" else "",
    )
    SESSION_COOKIE_SECURE: bool = os.getenv(
        "SESSION_COOKIE_SECURE",
        "true" if os.getenv("ENVIRONMENT", "development").lower() == "production" else "false",
    ).lower() == "true"
    SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", "28800"))
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    ).split(",")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./q_resq.db")
    
    # External APIs (with graceful fallbacks)
    OSRM_ROUTING_URL: str = os.getenv("OSRM_ROUTING_URL", "https://router.project-osrm.org")
    OVERPASS_API_URL: str = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
    
    # Optimization parameters
    DEFAULT_PENALTY_UNSERVED: float = 1000.0
    DEFAULT_WEIGHT_TIME: float = 1.0
    DEFAULT_WEIGHT_PRIORITY: float = 2.5
    DEFAULT_WEIGHT_CAPABILITY_MISMATCH: float = 500.0
    
    # Quantum parameters
    QAOA_LAYERS: int = int(os.getenv("QAOA_LAYERS", "2"))
    QAOA_SHOTS: int = int(os.getenv("QAOA_SHOTS", "1024"))
    MAX_QUANTUM_QUBITS: int = int(os.getenv("MAX_QUANTUM_QUBITS", "16"))
    QUANTUM_TIMEOUT_SECONDS: float = float(os.getenv("QUANTUM_TIMEOUT_SECONDS", "10.0"))
    
    # Safety notice
    SAFETY_STATEMENT: str = (
        "Q-ResQ is a decision-support prototype for emergency resource coordination. "
        "It does not provide medical diagnosis or autonomously dispatch real emergency vehicles. "
        "Real-world deployment would require authorized data integrations, clinical validation, "
        "security controls, regulatory compliance, and operational approval."
    )


settings = Settings()
