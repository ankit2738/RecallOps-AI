from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.deps import get_band_service
from backend.app.models import AgentRun
from backend.app.schemas import AgentRunOut

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/status")
def agent_status(band=Depends(get_band_service), db: Session = Depends(get_db)):
    status = band.status(refresh=True)
    runs = db.scalars(select(AgentRun).order_by(AgentRun.created_at.desc()).limit(10)).all()
    return {
        "configured": status.configured,
        "tom_verified": status.tom_verified,
        "jerry_verified": status.jerry_verified,
        "detail": status.detail,
        "tom_agent_id": None,
        "jerry_agent_id": None,
        "tom_identity": status.tom_identity,
        "jerry_identity": status.jerry_identity,
        "provider_note": (
            "Band agents are verified and used."
            if status.configured and status.tom_verified and status.jerry_verified
            else "Band credentials are not configured on this machine. Tom and Jerry run as "
            "clearly labelled local fallbacks; no agents were created."
        ),
        "recent_runs": [AgentRunOut.model_validate(run).model_dump() for run in runs],
    }


@router.get("/runs", response_model=list[AgentRunOut])
def list_agent_runs(
    db: Session = Depends(get_db), limit: int = Query(default=100, ge=1, le=500)
):
    return db.scalars(select(AgentRun).order_by(AgentRun.created_at.desc()).limit(limit)).all()
