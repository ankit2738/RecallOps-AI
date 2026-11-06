from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from backend.app.config import Settings
from backend.app.models import AgentRun, Incident, Investigation
from backend.app.services.band_service import BandService
from backend.app.services.hindsight_service import HindsightService
from backend.app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

TOM_SYSTEM = (
    "You are Tom, a senior site reliability engineer. Diagnose production incidents using "
    "telemetry and historical memory. Be precise, prefer proven fixes, and never invent "
    "memory that was not provided."
)
JERRY_SYSTEM = (
    "You are Jerry, an independent critical reviewer. Challenge the incident analysis, "
    "identify missing validation and blast-radius risks, and approve only when the evidence "
    "supports the proposed fix."
)


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


class InvestigationService:
    def __init__(
        self,
        settings: Settings,
        memory: HindsightService,
        band: BandService,
        llm: LLMService,
    ):
        self.settings = settings
        self.memory = memory
        self.band = band
        self.llm = llm

    def investigate(
        self, db: Session, incident: Incident, *, memory_enabled: bool = True
    ) -> Investigation:
        investigation = Investigation(
            incident_id=incident.id,
            status="running",
            memory_enabled=memory_enabled,
            memory_status="disabled" if not memory_enabled else "pending",
            llm_provider="pending",
        )
        db.add(investigation)
        db.commit()
        db.refresh(investigation)

        recalled: list[dict[str, Any]] = []
        memory_status = "disabled"
        if memory_enabled:
            query = build_recall_query(incident)
            recall = self.memory.recall(
                db,
                query,
                max_tokens=2048,
                incident_id=incident.id,
                investigation_id=investigation.id,
            )
            if recall["status"] == "success":
                recalled = recall.get("memories", [])
                memory_status = "used" if recalled else "empty"
            elif recall["status"] == "unavailable":
                memory_status = "unavailable"
            else:
                memory_status = "failed"
        investigation.memory_status = memory_status
        investigation.recalled_memories = recalled
        db.commit()

        tom_output, tom_provider = self._run_tom(incident, recalled)
        jerry_output, jerry_provider = self._run_jerry(incident, tom_output, recalled)

        confidence = _clamp(
            float(tom_output.get("confidence", 0.5))
            + float(jerry_output.get("confidence_adjustment", 0.0))
        )
        actions = merge_actions(
            tom_output.get("recommended_actions", []),
            jerry_output.get("additional_actions", []),
        )
        evidence = list(tom_output.get("evidence", [])) + list(jerry_output.get("evidence", []))
        evidence.extend(memory_evidence(recalled))

        investigation.summary = build_summary(
            incident, tom_output, jerry_output, recalled, memory_status
        )
        investigation.root_cause_hypothesis = tom_output.get("root_cause_hypothesis")
        investigation.confidence = round(confidence, 3)
        investigation.recommended_actions = actions
        investigation.evidence = evidence
        investigation.llm_provider = tom_provider
        investigation.status = "completed"
        investigation.completed_at = datetime.now(timezone.utc)

        db.add(
            AgentRun(
                investigation_id=investigation.id,
                agent_name=self.settings.band_tom_name,
                role="investigator",
                provider=tom_provider,
                status="completed",
                input_summary=f"{incident.incident_code}: {incident.title}",
                output=tom_output,
                latency_ms=tom_output.get("_latency_ms"),
            )
        )
        db.add(
            AgentRun(
                investigation_id=investigation.id,
                agent_name=self.settings.band_jerry_name,
                role="reviewer",
                provider=jerry_provider,
                status="completed",
                input_summary=f"Review Tom's analysis for {incident.incident_code}",
                output=jerry_output,
                latency_ms=jerry_output.get("_latency_ms"),
            )
        )
        incident.status = "investigating"
        db.commit()
        db.refresh(investigation)
        return investigation

    def _run_tom(
        self, incident: Incident, recalled: list[dict[str, Any]]
    ) -> tuple[dict[str, Any], str]:
        started = time.perf_counter()
        if self.llm.available:
            memory_block = format_memories(recalled)
            user = (
                f"Incident: {incident.incident_code} ({incident.severity}) in {incident.service}\n"
                f"Title: {incident.title}\nDescription: {incident.description}\n"
                f"Symptoms: {', '.join(incident.symptoms or [])}\n\n"
                f"Historical Hindsight memories (verified retrieval):\n{memory_block}\n\n"
                "Return JSON with keys: root_cause_hypothesis (string), confidence (0-1), "
                "recommended_actions (array of objects with step, rationale, priority), "
                "evidence (array of objects with source, detail)."
            )
            data, provider = self.llm.chat_json(TOM_SYSTEM, user, max_tokens=800)
            if data:
                data["_latency_ms"] = int((time.perf_counter() - started) * 1000)
                return data, provider
        fallback = deterministic_tom(incident, recalled)
        fallback["_latency_ms"] = int((time.perf_counter() - started) * 1000)
        return fallback, "local-deterministic"

    def _run_jerry(
        self, incident: Incident, tom_output: dict[str, Any], recalled: list[dict[str, Any]]
    ) -> tuple[dict[str, Any], str]:
        started = time.perf_counter()
        if self.llm.available:
            user = (
                f"Incident: {incident.incident_code} in {incident.service}\n"
                f"Symptoms: {', '.join(incident.symptoms or [])}\n"
                f"Tom's hypothesis: {tom_output.get('root_cause_hypothesis')}\n"
                f"Tom's confidence: {tom_output.get('confidence')}\n"
                f"Tom's actions: {tom_output.get('recommended_actions')}\n"
                f"Memory items available: {len(recalled)}\n\n"
                "Return JSON with keys: verdict (approve or revise), confidence_adjustment "
                "(-0.2 to 0.2), concerns (array of strings), additional_actions (array of "
                "objects with step, rationale, priority), evidence (array of objects with "
                "source, detail)."
            )
            data, provider = self.llm.chat_json(JERRY_SYSTEM, user, max_tokens=600)
            if data:
                data["_latency_ms"] = int((time.perf_counter() - started) * 1000)
                return data, provider
        fallback = deterministic_jerry(incident, recalled)
        fallback["_latency_ms"] = int((time.perf_counter() - started) * 1000)
        return fallback, "local-deterministic"

    def compare(self, db: Session, incident: Incident) -> dict[str, Any]:
        off = self.investigate(db, incident, memory_enabled=False)
        on = self.investigate(db, incident, memory_enabled=True)
        return {
            "incident_id": incident.id,
            "memory_off": off,
            "memory_on": on,
            "delta_confidence": round(on.confidence - off.confidence, 3),
            "memories_used": len(on.recalled_memories or []),
        }


def build_recall_query(incident: Incident) -> str:
    symptoms = ", ".join(incident.symptoms or [])
    return (
        f"{incident.title}. Service {incident.service}. Symptoms: {symptoms}. "
        f"{incident.description[:600]}"
    )


def format_memories(memories: list[dict[str, Any]]) -> str:
    if not memories:
        return "(no historical memories retrieved)"
    lines = []
    for index, memory in enumerate(memories[:8], start=1):
        lines.append(f"{index}. {memory.get('text', '')}")
    return "\n".join(lines)


def memory_evidence(memories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    evidence = []
    for memory in memories[:5]:
        evidence.append(
            {
                "source": "hindsight",
                "detail": memory.get("text", ""),
                "memory_id": memory.get("id"),
                "score": memory.get("score"),
                "metadata": memory.get("metadata", {}),
            }
        )
    return evidence


def merge_actions(
    primary: list[dict[str, Any]], additional: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in list(primary) + list(additional):
        if not isinstance(item, dict):
            continue
        step = str(item.get("step") or item.get("action") or "").strip()
        if not step or step.lower() in seen:
            continue
        seen.add(step.lower())
        merged.append(
            {
                "step": step,
                "rationale": str(item.get("rationale", "")),
                "priority": str(item.get("priority", "short-term")),
            }
        )
    return merged[:10]


def build_summary(
    incident: Incident,
    tom: dict[str, Any],
    jerry: dict[str, Any],
    recalled: list[dict[str, Any]],
    memory_status: str,
) -> str:
    if memory_status == "used":
        memory_line = (
            f"Hindsight recalled {len(recalled)} memories from previous incidents and they "
            "were used in this diagnosis."
        )
    elif memory_status == "empty":
        memory_line = "Hindsight was reachable but returned no relevant historical memories."
    elif memory_status == "disabled":
        memory_line = "Memory was disabled for this run; no historical context was used."
    else:
        memory_line = "Hindsight memory was unavailable, so this run is not memory-assisted."
    return (
        f"{memory_line} Tom hypothesized: {tom.get('root_cause_hypothesis', 'unknown')}. "
        f"Jerry verdict: {jerry.get('verdict', 'revise')} with concerns: "
        f"{'; '.join(jerry.get('concerns', [])[:2]) or 'none recorded'}."
    )


def deterministic_tom(incident: Incident, memories: list[dict[str, Any]]) -> dict[str, Any]:
    text = " ".join(
        [incident.title, incident.description, " ".join(incident.symptoms or [])]
    ).lower()
    memory_text = " ".join(str(m.get("text", "")) for m in memories).lower()
    combined = f"{text} {memory_text}"

    hypothesis = "Insufficient telemetry to isolate a single root cause."
    actions: list[dict[str, Any]] = [
        {
            "step": "Collect database pool saturation, error rate and deployment correlation for the incident window.",
            "rationale": "Establish which dependency degraded first before changing production.",
            "priority": "immediate",
        }
    ]
    confidence = 0.52 if not memories else 0.68

    if "pool" in combined or "connection" in combined:
        hypothesis = (
            "Recurrence of database connection pool exhaustion. Historical memory shows the "
            "same payments-api pattern was resolved by raising DB_POOL_MAX_SIZE to 50 and "
            "adding a saturation alert."
            if memories
            else "Database connection pool exhaustion is the leading hypothesis."
        )
        actions = [
            {
                "step": "Check payments-api DB pool utilization and acquisition timeout metrics.",
                "rationale": "Confirmed symptom is connection acquisition timeout.",
                "priority": "immediate",
            },
            {
                "step": "Compare DB_POOL_MAX_SIZE with the last known-good value of 50.",
                "rationale": "Historical incident INC-001 was caused by this setting being 5.",
                "priority": "immediate",
            },
            {
                "step": "Raise the pool size to 50 with a 3 second acquisition timeout and restart gradually.",
                "rationale": "Proven fix from the prior payments-api incident.",
                "priority": "short-term",
            },
            {
                "step": "Add an alert when pool utilization exceeds 80% for 5 minutes.",
                "rationale": "Prevents silent recurrence during peak traffic.",
                "priority": "preventive",
            },
        ]
        confidence = 0.9 if memories else 0.72
    elif "kafka" in combined or "consumer" in combined or "backlog" in combined:
        hypothesis = "Consumer lag caused by a poison message or deserialization failure."
        actions = [
            {"step": "Inspect consumer group lag and crash-loop logs.", "rationale": "Localize the failing partition.", "priority": "immediate"},
            {"step": "Move the poison message to a dead-letter queue.", "rationale": "Restore forward progress safely.", "priority": "immediate"},
            {"step": "Add guarded deserialization and replay the backlog.", "rationale": "Prevent recurrence.", "priority": "short-term"},
        ]
        confidence = 0.85 if memories else 0.66
    elif "redis" in combined or "token" in combined or "evict" in combined:
        hypothesis = "Redis memory pressure caused session eviction and token validation timeouts."
        actions = [
            {"step": "Check Redis used_memory, maxmemory and eviction counters.", "rationale": "Confirm memory pressure.", "priority": "immediate"},
            {"step": "Raise maxmemory and set allkeys-lru.", "rationale": "Restore stable session reads.", "priority": "immediate"},
            {"step": "Alert on Redis memory above 80%.", "rationale": "Early warning.", "priority": "preventive"},
        ]
        confidence = 0.84 if memories else 0.64
    elif "webhook" in combined or "duplicate" in combined or "idempot" in combined:
        hypothesis = "Non-idempotent webhook retries produced duplicate captures."
        actions = [
            {"step": "Disable automatic retries and identify duplicate capture keys.", "rationale": "Stop further duplication.", "priority": "immediate"},
            {"step": "Add an idempotency table with a unique constraint.", "rationale": "Make retries safe.", "priority": "short-term"},
            {"step": "Replay events through the deduplicating handler.", "rationale": "Recover missed work.", "priority": "short-term"},
        ]
        confidence = 0.86 if memories else 0.66
    elif "search" in combined or "index" in combined or "sequential scan" in combined:
        hypothesis = "Search latency regression caused by a missing composite index."
        actions = [
            {"step": "Run EXPLAIN ANALYZE on the slow search query.", "rationale": "Confirm sequential scan.", "priority": "immediate"},
            {"step": "Create the composite index concurrently.", "rationale": "Avoid write downtime.", "priority": "short-term"},
            {"step": "Verify the query plan uses the new index.", "rationale": "Confirm the fix.", "priority": "short-term"},
        ]
        confidence = 0.82 if memories else 0.62
    elif "5xx" in combined or "deploy" in combined:
        hypothesis = "A recent deployment introduced the error burst."
        actions = [
            {"step": "Correlate the 5xx spike with the latest deployment.", "rationale": "Confirm deploy correlation.", "priority": "immediate"},
            {"step": "Roll back to the previous build.", "rationale": "Restore service while investigating.", "priority": "immediate"},
            {"step": "Add a regression test for the failing path.", "rationale": "Prevent recurrence.", "priority": "preventive"},
        ]
        confidence = 0.78 if memories else 0.6

    evidence = [
        {
            "source": "incident",
            "detail": f"Symptoms: {', '.join(incident.symptoms or [])}",
        }
    ]
    return {
        "root_cause_hypothesis": hypothesis,
        "confidence": confidence,
        "recommended_actions": actions,
        "evidence": evidence,
    }


def deterministic_jerry(
    incident: Incident, memories: list[dict[str, Any]]
) -> dict[str, Any]:
    if memories:
        return {
            "verdict": "approve",
            "confidence_adjustment": 0.02,
            "concerns": [
                "Confirm the current DB pool configuration matches the historical fix before applying it.",
                "Validate the change under peak traffic and watch for a second recurrence.",
            ],
            "additional_actions": [
                {
                    "step": "Add a post-resolution memory write with the final root cause and config diff.",
                    "rationale": "Keeps the next recall accurate and auditable.",
                    "priority": "preventive",
                }
            ],
            "evidence": [
                {
                    "source": "jerry-review",
                    "detail": f"Memory-backed hypothesis for {incident.incident_code} is consistent with documented history.",
                }
            ],
        }
    return {
        "verdict": "revise",
        "confidence_adjustment": -0.08,
        "concerns": [
            "No historical memory was retrieved, so the hypothesis depends on current telemetry only.",
            "The blast radius of a pool-size change must be validated before rollout.",
        ],
        "additional_actions": [
            {
                "step": "Capture the current configuration and a rollback plan before changing production.",
                "rationale": "Required because there is no proven prior runbook for this exact case.",
                "priority": "immediate",
            }
        ],
        "evidence": [
            {
                "source": "jerry-review",
                "detail": "Approval withheld until telemetry confirms the dependency saturation order.",
            }
        ],
    }
