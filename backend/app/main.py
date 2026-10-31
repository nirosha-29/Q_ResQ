"""Main FastAPI Application Entrypoint for Q-ResQ."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.integrations.demo_provider import DemoProvider

# Import API routers
from app.api.emergencies import router as emergencies_router
from app.api.ambulances import router as ambulances_router
from app.api.hospitals import router as hospitals_router
from app.api.allocations import router as allocations_router
from app.api.dispatches import router as dispatches_router
from app.api.optimization import router as optimization_router
from app.api.benchmark import router as benchmark_router
from app.api.data_sources import router as data_sources_router
from app.api.demo import router as demo_router
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router

# Ensure tables and seed exist on import
Base.metadata.create_all(bind=engine)
_db = SessionLocal()
try:
    DemoProvider.seed_initial_data(_db)
finally:
    _db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title=f"{settings.PROJECT_NAME} - {settings.PROJECT_TITLE}",
    description="Emergency Medical Services Resource Allocation & Hospital Coordination Platform using Hybrid Quantum-Classical Optimization",
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emergencies_router)
app.include_router(ambulances_router)
app.include_router(hospitals_router)
app.include_router(allocations_router)
app.include_router(dispatches_router)
app.include_router(optimization_router)
app.include_router(benchmark_router)
app.include_router(data_sources_router)
app.include_router(demo_router)
app.include_router(auth_router)
app.include_router(dashboard_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "team": settings.TEAM_NAME,
        "track": settings.TRACK,
        "version": settings.VERSION,
        "safety_statement": settings.SAFETY_STATEMENT
    }
