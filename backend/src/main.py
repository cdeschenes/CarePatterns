"""
CarePatterns — FastAPI application factory.

Startup sequence
----------------
1. All ORM models are imported (registers them with Base.metadata).
2. Base.metadata.create_all() creates any missing tables.
3. Built-in themes are seeded if the themes table is empty.
4. CORS middleware permits the configured frontend origin only.
5. All API routers are registered under /api/v1.
6. A /health endpoint is exposed without authentication for container health checks.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.database import Base, SessionLocal, engine, run_migrations

# Import all models so Base.metadata knows about every table before create_all().
import src.models  # noqa: F401

from src.routers import items, schedules, log_entries, reminders, reports, themes
from src.routers.themes import seed_builtin_themes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed reference data on startup."""
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)

    # Seed built-in themes once (idempotent — no-op if themes already exist)
    db = SessionLocal()
    try:
        seed_builtin_themes(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="CarePatterns",
    description=(
        "Mobile-first habit and care tracking API. "
        "Tracks medications, procedures, goals, and custom care activities."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow requests from the configured frontend origin only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers — all protected by require_auth inside each router
app.include_router(items.router, prefix="/api/v1")
app.include_router(schedules.router, prefix="/api/v1")
app.include_router(log_entries.router, prefix="/api/v1")
app.include_router(reminders.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(themes.router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Health check endpoint. No authentication required.

    Returns {"status": "ok"} when the application is running.
    Used by Docker health checks and monitoring tools.
    """
    return {"status": "ok"}
