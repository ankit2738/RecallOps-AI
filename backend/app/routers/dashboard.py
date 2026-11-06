from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.deps import get_memory_service
from backend.app.models import Incident, Investigation
from backend.app.schemas import DashboardSummary, IncidentOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), memory=Depends(get_memory_service)):
    incidents = db.scalars(select(Incident).order_by(Incident.started_at.desc())).all()
    investigations = db.scalars(select(Investigation)).all()
    avg_confidence = (
        round(sum(i.confidence for i in investigations) / len(investigations), 3)
        if investigations
        else 0.0
    )
    by_service: dict[str, int] = defaultdict(int)
    for incident in incidents:
        by_service[incident.service] += 1
    recurring = [
        {"service": service, "incident_count": count}
        for service, count in sorted(by_service.items(), key=lambda item: item[1], reverse=True)
        if count > 1
    ]
    health = memory.status()
    return {
        "total_incidents": len(incidents),
        "open_incidents": len([i for i in incidents if i.status != "resolved"]),
        "resolved_incidents": len([i for i in incidents if i.status == "resolved"]),
        "investigations": len(investigations),
        "memories_retained": len([i for i in incidents if i.memory_retained]),
        "memory_health": "healthy" if health["reachable"] else "unavailable",
        "avg_confidence": avg_confidence,
        "recurring_services": recurring[:5],
        "recent_incidents": [
            IncidentOut.model_validate(incident) for incident in incidents[:6]
        ],
    }
