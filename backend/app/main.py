from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.app.config import get_settings
from backend.app.database import SessionLocal, init_db
from backend.app.deps import get_band_service, get_memory_service
from backend.app.routers import agents, analytics, dashboard, incidents, investigations, memory
from backend.app.services.memory_sync import start_sync_in_background, sync_state
from backend.app.services.seed import seed_database

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("recallops")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        counts = seed_database(db)
        logger.info("Seed complete: %s", counts)
        memory_service = get_memory_service()
        health = memory_service.status()
        logger.info("Hindsight health: %s", health)
        if health["reachable"]:
            ok, detail = memory_service.ensure_bank()
            logger.info("Hindsight bank: %s (%s)", ok, detail)
            if os.getenv("RECALLOPS_AUTO_SYNC", "true").lower() in {"1", "true", "yes"}:
                started = start_sync_in_background(memory_service)
                logger.info("Hindsight background sync started: %s", started)
    finally:
        db.close()
    yield


app = FastAPI(
    title="RecallOps AI",
    description=(
        "Incident response with real Hindsight memory, Tom/Jerry agent collaboration and "
        "explicit memory-on vs memory-off comparison."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)
app.include_router(investigations.router)
app.include_router(memory.router)
app.include_router(agents.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_type": type(exc).__name__},
    )


@app.get("/api/health")
def health():
    db_ok = True
    db_detail = "connected"
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        db_ok = False
        db_detail = type(exc).__name__
    finally:
        db.close()
    memory_health = get_memory_service().status()
    band_status = get_band_service().status()
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.app_name,
        "environment": settings.environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {"ok": db_ok, "detail": db_detail},
        "hindsight": memory_health,
        "llm": {
            "configured": settings.groq_configured,
            "source": settings.groq_key_source,
            "model": settings.groq_model,
            "base_url": settings.groq_base_url,
        },
        "band": {
            "configured": band_status.configured,
            "tom_verified": band_status.tom_verified,
            "jerry_verified": band_status.jerry_verified,
            "detail": band_status.detail,
        },
        "memory_sync": sync_state(),
    }


@app.get("/api")
def api_root():
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "health": "/api/health",
        "memory": "Hindsight retain/recall/reflect",
        "agents": "Tom investigates, Jerry reviews",
    }
