from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.database import get_db
from backend.app.deps import get_memory_service
from backend.app.models import Incident, MemoryOperation
from backend.app.schemas import (
    MemoryOperationOut,
    MemoryStatusOut,
    RecallRequest,
    ReflectRequest,
)
from backend.app.services.memory_sync import (
    recent_memory_counts,
    start_sync_in_background,
    sync_state,
)

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("/status", response_model=MemoryStatusOut)
def memory_status(db: Session = Depends(get_db), memory=Depends(get_memory_service)):
    status = memory.status()
    return {
        **status,
        "detail": status["detail"],
    }


@router.get("/overview")
def memory_overview(db: Session = Depends(get_db), memory=Depends(get_memory_service)):
    settings = get_settings()
    health = memory.status()
    operations = db.scalars(
        select(MemoryOperation).order_by(MemoryOperation.created_at.desc()).limit(50)
    ).all()
    return {
        "hindsight": health,
        "llm": {
            "configured": settings.groq_configured,
            "source": settings.groq_key_source,
            "model": settings.groq_model,
        },
        "counts": recent_memory_counts(db),
        "sync": sync_state(),
        "operations": [MemoryOperationOut.model_validate(op).model_dump() for op in operations],
    }


@router.post("/recall")
def recall(
    payload: RecallRequest,
    db: Session = Depends(get_db),
    memory=Depends(get_memory_service),
):
    return memory.recall(db, payload.query, max_tokens=payload.max_tokens)


@router.post("/reflect")
def reflect(
    payload: ReflectRequest,
    db: Session = Depends(get_db),
    memory=Depends(get_memory_service),
):
    return memory.reflect(db, payload.query)


@router.get("/operations", response_model=list[MemoryOperationOut])
def list_operations(
    db: Session = Depends(get_db),
    operation: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = select(MemoryOperation).order_by(MemoryOperation.created_at.desc()).limit(limit)
    if operation:
        query = query.where(MemoryOperation.operation == operation)
    if status:
        query = query.where(MemoryOperation.status == status)
    return db.scalars(query).all()


@router.post("/sync")
def sync_memories(memory=Depends(get_memory_service), force: bool = False):
    started = start_sync_in_background(memory, force=force)
    if not started:
        return {"started": False, "detail": "Sync already running", "state": sync_state()}
    return {"started": True, "state": sync_state()}


@router.get("/sync/status")
def sync_status():
    return sync_state()


@router.post("/retain/{incident_id}")
def retain_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    memory=Depends(get_memory_service),
):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return memory.retain_incident(db, incident)
