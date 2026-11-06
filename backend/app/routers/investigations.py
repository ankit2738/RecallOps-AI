from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Investigation
from backend.app.schemas import InvestigationOut

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


@router.get("", response_model=list[InvestigationOut])
def list_investigations(
    db: Session = Depends(get_db), limit: int = Query(default=50, ge=1, le=200)
):
    return db.scalars(
        select(Investigation).order_by(Investigation.created_at.desc()).limit(limit)
    ).all()


@router.get("/{investigation_id}", response_model=InvestigationOut)
def get_investigation(investigation_id: int, db: Session = Depends(get_db)):
    investigation = db.get(Investigation, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation
