from __future__ import annotations

from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Incident, Investigation, MemoryOperation

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/patterns")
def patterns(db: Session = Depends(get_db)):
    incidents = db.scalars(select(Incident).order_by(Incident.started_at.desc())).all()
    by_service: dict[str, list[Incident]] = defaultdict(list)
    for incident in incidents:
        by_service[incident.service].append(incident)

    recurring = []
    for service, items in by_service.items():
        if len(items) < 2:
            continue
        resolved = [i for i in items if i.status == "resolved"]
        root_causes = []
        for item in resolved:
            if item.root_cause and item.root_cause not in root_causes:
                root_causes.append(item.root_cause)
        recurring.append(
            {
                "service": service,
                "incident_count": len(items),
                "open_count": len([i for i in items if i.status != "resolved"]),
                "resolved_count": len(resolved),
                "incident_codes": [i.incident_code for i in items],
                "root_causes": root_causes,
                "latest_incident": items[0].title,
                "recommendation": (
                    "Recurring failure pattern detected. Recall the resolved runbooks and "
                    "prioritize the preventive action that removes the shared root cause."
                ),
            }
        )
    recurring.sort(key=lambda item: item["incident_count"], reverse=True)

    root_causes = Counter(
        incident.root_cause for incident in incidents if incident.root_cause
    )
    memory_operations = db.scalars(select(MemoryOperation)).all()
    successful_retains = len(
        [op for op in memory_operations if op.operation == "retain" and op.status == "success"]
    )
    successful_recalls = len(
        [op for op in memory_operations if op.operation == "recall" and op.status == "success"]
    )
    return {
        "recurring_services": recurring,
        "top_root_causes": [
            {"root_cause": cause, "count": count}
            for cause, count in root_causes.most_common(8)
        ],
        "memory": {
            "successful_retains": successful_retains,
            "successful_recalls": successful_recalls,
            "incidents_retained": len([i for i in incidents if i.memory_retained]),
        },
        "totals": {
            "incidents": len(incidents),
            "services": len(by_service),
            "recurring_services": len(recurring),
        },
    }


@router.get("/comparison")
def comparison(db: Session = Depends(get_db)):
    investigations = db.scalars(
        select(Investigation).order_by(Investigation.created_at.desc()).limit(100)
    ).all()
    with_memory = [i for i in investigations if i.memory_enabled and i.memory_status == "used"]
    without_memory = [i for i in investigations if not i.memory_enabled]
    avg = lambda rows: round(sum(i.confidence for i in rows) / len(rows), 3) if rows else 0.0
    return {
        "memory_on": {
            "runs": len(with_memory),
            "avg_confidence": avg(with_memory),
            "avg_memories": (
                round(sum(len(i.recalled_memories or []) for i in with_memory) / len(with_memory), 1)
                if with_memory
                else 0
            ),
        },
        "memory_off": {
            "runs": len(without_memory),
            "avg_confidence": avg(without_memory),
            "avg_memories": 0,
        },
        "delta_confidence": round(avg(with_memory) - avg(without_memory), 3),
    }
