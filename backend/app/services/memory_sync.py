from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from backend.app.database import SessionLocal
from backend.app.models import Incident, MemoryOperation

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_state: dict[str, Any] = {
    "running": False,
    "total": 0,
    "processed": 0,
    "succeeded": 0,
    "failed": 0,
    "last_error": None,
    "started_at": None,
    "finished_at": None,
}


def sync_state() -> dict[str, Any]:
    with _lock:
        return dict(_state)


def _set(**kwargs: Any) -> None:
    with _lock:
        _state.update(kwargs)


def sync_resolved_incidents(memory_service, *, force: bool = False, throttle: float = 32.0) -> None:
    db = SessionLocal()
    try:
        incidents = db.scalars(
            select(Incident).where(Incident.status == "resolved").order_by(Incident.id)
        ).all()
        pending = [i for i in incidents if force or not i.memory_retained]
        _set(
            running=True,
            total=len(pending),
            processed=0,
            succeeded=0,
            failed=0,
            last_error=None,
            started_at=datetime.now(timezone.utc).isoformat(),
            finished_at=None,
        )
        for index, incident in enumerate(pending):
            result = memory_service.retain_incident(db, incident)
            if result["status"] == "success":
                _set(processed=index + 1, succeeded=sync_state()["succeeded"] + 1)
            else:
                error = str(result.get("error") or "")
                if "429" in error or "rate limit" in error.lower():
                    time.sleep(65)
                    result = memory_service.retain_incident(db, incident)
                if result["status"] == "success":
                    _set(processed=index + 1, succeeded=sync_state()["succeeded"] + 1)
                else:
                    _set(
                        processed=index + 1,
                        failed=sync_state()["failed"] + 1,
                        last_error=error[:500] or "unknown error",
                    )
            if index < len(pending) - 1:
                time.sleep(throttle)
        _set(running=False, finished_at=datetime.now(timezone.utc).isoformat())
    except Exception as exc:  # noqa: BLE001
        logger.exception("Memory sync failed")
        _set(
            running=False,
            last_error=f"{type(exc).__name__}: {str(exc)[:500]}",
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
    finally:
        db.close()


def start_sync_in_background(memory_service, *, force: bool = False) -> bool:
    with _lock:
        if _state["running"]:
            return False
    thread = threading.Thread(
        target=sync_resolved_incidents,
        kwargs={"memory_service": memory_service, "force": force},
        daemon=True,
        name="recallops-memory-sync",
    )
    thread.start()
    return True


def recent_memory_counts(db) -> dict[str, int]:
    operations = db.scalars(select(MemoryOperation)).all()
    counts: dict[str, int] = {"retain": 0, "recall": 0, "reflect": 0}
    for op in operations:
        if op.operation in counts and op.status == "success":
            counts[op.operation] += 1
    return counts
