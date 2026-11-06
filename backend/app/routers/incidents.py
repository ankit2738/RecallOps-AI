from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.deps import get_investigation_service, get_memory_service
from backend.app.models import Incident, Investigation
from backend.app.schemas import (
    IncidentCreate,
    IncidentOut,
    IncidentUpdate,
    InvestigationOut,
    InvestigationRequest,
    ResolveRequest,
)
from backend.app.services.seed import next_incident_code

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _get_incident(db: Session, incident_id: int) -> Incident:
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    service: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = select(Incident).order_by(Incident.started_at.desc()).limit(limit)
    if service:
        query = query.where(Incident.service == service)
    if status:
        query = query.where(Incident.status == status)
    if severity:
        query = query.where(Incident.severity == severity)
    return db.scalars(query).all()


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    incident = Incident(
        incident_code=next_incident_code(db),
        title=payload.title,
        service=payload.service,
        severity=payload.severity,
        status=payload.status,
        description=payload.description,
        symptoms=payload.symptoms,
        started_at=payload.started_at or datetime.now(timezone.utc),
        is_synthetic=payload.is_synthetic,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return _get_incident(db, incident_id)


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(incident_id: int, payload: IncidentUpdate, db: Session = Depends(get_db)):
    incident = _get_incident(db, incident_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)
    db.commit()
    db.refresh(incident)
    return incident


@router.delete("/{incident_id}", status_code=204)
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = _get_incident(db, incident_id)
    db.delete(incident)
    db.commit()


@router.get("/{incident_id}/investigations", response_model=list[InvestigationOut])
def list_incident_investigations(incident_id: int, db: Session = Depends(get_db)):
    _get_incident(db, incident_id)
    return db.scalars(
        select(Investigation)
        .where(Investigation.incident_id == incident_id)
        .order_by(Investigation.created_at.desc())
    ).all()


@router.post("/{incident_id}/investigate", response_model=InvestigationOut)
def investigate(
    incident_id: int,
    payload: InvestigationRequest,
    db: Session = Depends(get_db),
    service=Depends(get_investigation_service),
):
    incident = _get_incident(db, incident_id)
    return service.investigate(db, incident, memory_enabled=payload.memory_enabled)


@router.post("/{incident_id}/compare")
def compare_memory(
    incident_id: int,
    db: Session = Depends(get_db),
    service=Depends(get_investigation_service),
):
    incident = _get_incident(db, incident_id)
    result = service.compare(db, incident)
    return {
        "incident_id": result["incident_id"],
        "delta_confidence": result["delta_confidence"],
        "memories_used": result["memories_used"],
        "memory_off": InvestigationOut.model_validate(result["memory_off"]).model_dump(),
        "memory_on": InvestigationOut.model_validate(result["memory_on"]).model_dump(),
    }


@router.post("/{incident_id}/resolve")
def resolve_incident(
    incident_id: int,
    payload: ResolveRequest,
    db: Session = Depends(get_db),
    memory=Depends(get_memory_service),
):
    incident = _get_incident(db, incident_id)
    incident.root_cause = payload.root_cause
    incident.resolution_summary = payload.resolution_summary
    incident.resolution_steps = payload.resolution_steps
    incident.status = "resolved"
    incident.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)

    memory_result = None
    if payload.retain_to_memory:
        memory_result = memory.retain_incident(db, incident)
        db.refresh(incident)
    return {
        "incident": IncidentOut.model_validate(incident).model_dump(),
        "memory": memory_result,
    }
