from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from hindsight_client import Hindsight
from sqlalchemy.orm import Session

from backend.app.config import Settings
from backend.app.models import Incident, MemoryOperation

logger = logging.getLogger(__name__)


def _dump(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    return value


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        import json

        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)


class HindsightService:
    """Real Hindsight retain / recall / reflect integration.

    Every call is persisted to memory_operations with status, latency and error
    so the UI can distinguish verified memory operations from unavailable ones.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.bank_id = settings.hindsight_bank_id

    def _new_client(self) -> Hindsight | None:
        """Create a client per operation.

        The SDK wraps an aiohttp session bound to the event loop of the thread that
        creates it. Reusing one instance across FastAPI worker threads causes
        ``Timeout context manager should be used inside a task``. A fresh client per
        call is safe and is closed immediately afterwards.
        """
        if not self.settings.hindsight_configured:
            return None
        return Hindsight(
            base_url=self.settings.hindsight_api_url,
            api_key=self.settings.hindsight_api_key,
            timeout=self.settings.hindsight_timeout,
            max_attempts=1,
        )

    @staticmethod
    def _close(client: Hindsight | None) -> None:
        if client is None:
            return
        try:
            client.close()
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass

    def health(self) -> tuple[bool, str]:
        if not self.settings.hindsight_configured:
            return False, "Hindsight API URL is not configured"
        try:
            response = httpx.get(
                f"{self.settings.hindsight_api_url.rstrip('/')}/health",
                timeout=5.0,
            )
            if response.status_code < 400:
                return True, f"HTTP {response.status_code}"
            return False, f"health endpoint returned HTTP {response.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, f"{type(exc).__name__}: {str(exc)[:200]}"

    def ensure_bank(self) -> tuple[bool, str]:
        client = self._new_client()
        if not client:
            return False, "Hindsight client unavailable"
        try:
            client.create_bank(
                bank_id=self.bank_id,
                name="RecallOps Incident Memory",
                mission=(
                    "Remember production incidents, root causes, resolutions and verified "
                    "runbooks so SRE agents can recommend proven fixes for new incidents."
                ),
                disposition_skepticism=3,
                disposition_literalism=3,
                disposition_empathy=2,
                enable_observations=True,
            )
            return True, "bank ready"
        except Exception as exc:  # noqa: BLE001
            message = str(exc)
            # A bank that already exists is a success for our purposes.
            if "already" in message.lower() or "409" in message or "exists" in message.lower():
                return True, "bank already exists"
            logger.warning("Hindsight create_bank failed: %s", message[:300])
            return False, message[:300]
        finally:
            self._close(client)

    def _record(
        self,
        db: Session,
        *,
        operation: str,
        status: str,
        request_payload: dict[str, Any],
        response_payload: dict[str, Any] | None = None,
        latency_ms: int | None = None,
        error: str | None = None,
        incident_id: int | None = None,
        investigation_id: int | None = None,
    ) -> MemoryOperation:
        op = MemoryOperation(
            incident_id=incident_id,
            investigation_id=investigation_id,
            operation=operation,
            bank_id=self.bank_id,
            status=status,
            request_payload=_json_safe(request_payload),
            response_payload=_json_safe(response_payload or {}),
            latency_ms=latency_ms,
            error=error,
        )
        db.add(op)
        db.commit()
        db.refresh(op)
        return op

    def retain_incident(self, db: Session, incident: Incident) -> dict[str, Any]:
        content = build_incident_memory(incident)
        request_payload = {
            "bank_id": self.bank_id,
            "content": content,
            "context": f"{incident.incident_code} {incident.service} {incident.severity}",
            "metadata": {
                "incident_code": incident.incident_code,
                "service": incident.service,
                "severity": incident.severity,
                "synthetic": str(incident.is_synthetic).lower(),
            },
            "tags": ["incident", incident.service.lower().replace(" ", "-")],
        }
        client = self._new_client()
        if not client:
            op = self._record(
                db,
                operation="retain",
                status="unavailable",
                request_payload=request_payload,
                error="Hindsight client is not configured",
                incident_id=incident.id,
            )
            return {"status": "unavailable", "operation_id": op.id, "error": op.error}

        started = time.perf_counter()
        try:
            response = client.retain(
                bank_id=self.bank_id,
                content=content,
                context=request_payload["context"],
                metadata=request_payload["metadata"],
                tags=request_payload["tags"],
            )
            latency = int((time.perf_counter() - started) * 1000)
            payload = _json_safe(_dump(response))
            op = self._record(
                db,
                operation="retain",
                status="success",
                request_payload=request_payload,
                response_payload=payload,
                latency_ms=latency,
                incident_id=incident.id,
            )
            incident.memory_retained = True
            db.commit()
            return {"status": "success", "operation_id": op.id, "response": payload}
        except Exception as exc:  # noqa: BLE001
            latency = int((time.perf_counter() - started) * 1000)
            op = self._record(
                db,
                operation="retain",
                status="failed",
                request_payload=request_payload,
                latency_ms=latency,
                error=f"{type(exc).__name__}: {str(exc)[:500]}",
                incident_id=incident.id,
            )
            logger.warning("Hindsight retain failed: %s", op.error)
            return {"status": "failed", "operation_id": op.id, "error": op.error}
        finally:
            self._close(client)

    def recall(
        self,
        db: Session,
        query: str,
        *,
        max_tokens: int = 2048,
        incident_id: int | None = None,
        investigation_id: int | None = None,
    ) -> dict[str, Any]:
        request_payload = {"bank_id": self.bank_id, "query": query, "max_tokens": max_tokens}
        client = self._new_client()
        if not client:
            op = self._record(
                db,
                operation="recall",
                status="unavailable",
                request_payload=request_payload,
                error="Hindsight client is not configured",
                incident_id=incident_id,
                investigation_id=investigation_id,
            )
            return {"status": "unavailable", "operation_id": op.id, "memories": [], "error": op.error}

        started = time.perf_counter()
        try:
            response = client.recall(
                bank_id=self.bank_id,
                query=query,
                max_tokens=max_tokens,
                budget="low",
            )
            latency = int((time.perf_counter() - started) * 1000)
            payload = _json_safe(_dump(response))
            memories = extract_memories(payload)
            op = self._record(
                db,
                operation="recall",
                status="success",
                request_payload=request_payload,
                response_payload=payload,
                latency_ms=latency,
                incident_id=incident_id,
                investigation_id=investigation_id,
            )
            return {
                "status": "success",
                "operation_id": op.id,
                "memories": memories,
                "count": len(memories),
                "latency_ms": latency,
            }
        except Exception as exc:  # noqa: BLE001
            latency = int((time.perf_counter() - started) * 1000)
            op = self._record(
                db,
                operation="recall",
                status="failed",
                request_payload=request_payload,
                latency_ms=latency,
                error=f"{type(exc).__name__}: {str(exc)[:500]}",
                incident_id=incident_id,
                investigation_id=investigation_id,
            )
            logger.warning("Hindsight recall failed: %s", op.error)
            return {
                "status": "failed",
                "operation_id": op.id,
                "memories": [],
                "error": op.error,
            }
        finally:
            self._close(client)

    def reflect(
        self,
        db: Session,
        query: str,
        *,
        incident_id: int | None = None,
        investigation_id: int | None = None,
    ) -> dict[str, Any]:
        request_payload = {"bank_id": self.bank_id, "query": query}
        client = self._new_client()
        if not client:
            op = self._record(
                db,
                operation="reflect",
                status="unavailable",
                request_payload=request_payload,
                error="Hindsight client is not configured",
                incident_id=incident_id,
                investigation_id=investigation_id,
            )
            return {"status": "unavailable", "operation_id": op.id, "text": None, "error": op.error}

        started = time.perf_counter()
        try:
            response = client.reflect(bank_id=self.bank_id, query=query, budget="low")
            latency = int((time.perf_counter() - started) * 1000)
            payload = _json_safe(_dump(response))
            op = self._record(
                db,
                operation="reflect",
                status="success",
                request_payload=request_payload,
                response_payload=payload,
                latency_ms=latency,
                incident_id=incident_id,
                investigation_id=investigation_id,
            )
            return {
                "status": "success",
                "operation_id": op.id,
                "text": payload.get("text"),
                "based_on": payload.get("based_on"),
                "latency_ms": latency,
            }
        except Exception as exc:  # noqa: BLE001
            latency = int((time.perf_counter() - started) * 1000)
            op = self._record(
                db,
                operation="reflect",
                status="failed",
                request_payload=request_payload,
                latency_ms=latency,
                error=f"{type(exc).__name__}: {str(exc)[:500]}",
                incident_id=incident_id,
                investigation_id=investigation_id,
            )
            logger.warning("Hindsight reflect failed: %s", op.error)
            return {"status": "failed", "operation_id": op.id, "text": None, "error": op.error}
        finally:
            self._close(client)

    def status(self) -> dict[str, Any]:
        reachable, detail = self.health()
        return {
            "configured": self.settings.hindsight_configured,
            "reachable": reachable,
            "bank_id": self.bank_id,
            "api_url": self.settings.hindsight_api_url,
            "detail": detail,
        }


def extract_memories(payload: dict[str, Any]) -> list[dict[str, Any]]:
    results = payload.get("results") or payload.get("memories") or []
    memories: list[dict[str, Any]] = []
    for item in results:
        if not isinstance(item, dict):
            continue
        scores = item.get("scores") if isinstance(item.get("scores"), dict) else {}
        memories.append(
            {
                "id": item.get("id") or item.get("memory_id"),
                "text": item.get("text") or item.get("content") or "",
                "type": item.get("type"),
                "context": item.get("context"),
                "occurred_start": item.get("occurred_start"),
                "metadata": item.get("metadata") or {},
                "tags": item.get("tags") or [],
                "score": scores.get("final") or scores.get("semantic") or scores.get("rerank"),
                "scores": scores,
            }
        )
    return memories


def build_incident_memory(incident: Incident) -> str:
    steps = "\n".join(f"- {step}" for step in (incident.resolution_steps or []))
    return (
        f"Production incident {incident.incident_code} ({incident.severity}) in service "
        f"{incident.service}.\n"
        f"Title: {incident.title}\n"
        f"Status: {incident.status}\n"
        f"Symptoms: {', '.join(incident.symptoms or [])}\n"
        f"Description: {incident.description}\n"
        f"Root cause: {incident.root_cause or 'not recorded'}\n"
        f"Resolution summary: {incident.resolution_summary or 'not recorded'}\n"
        f"Resolution steps:\n{steps or '- not recorded'}\n"
        f"Data provenance: {'synthetic demo data' if incident.is_synthetic else 'real data'}."
    )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
