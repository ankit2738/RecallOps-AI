from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    service: Mapped[str] = mapped_column(String(120), index=True)
    severity: Mapped[str] = mapped_column(String(16), index=True, default="SEV-3")
    status: Mapped[str] = mapped_column(String(24), index=True, default="open")
    description: Mapped[str] = mapped_column(Text)
    symptoms: Mapped[list[str]] = mapped_column(JSON, default=list)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_steps: Mapped[list[str]] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)
    memory_retained: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    investigations: Mapped[list["Investigation"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )
    memory_operations: Mapped[list["MemoryOperation"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default="running")
    memory_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    memory_status: Mapped[str] = mapped_column(String(32), default="unknown")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    root_cause_hypothesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_actions: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    evidence: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    recalled_memories: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    llm_provider: Mapped[str] = mapped_column(String(48), default="deterministic")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    incident: Mapped["Incident"] = relationship(back_populates="investigations")
    agent_runs: Mapped[list["AgentRun"]] = relationship(
        back_populates="investigation", cascade="all, delete-orphan"
    )


class MemoryOperation(Base):
    __tablename__ = "memory_operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int | None] = mapped_column(
        ForeignKey("incidents.id"), nullable=True, index=True
    )
    investigation_id: Mapped[int | None] = mapped_column(
        ForeignKey("investigations.id"), nullable=True, index=True
    )
    operation: Mapped[str] = mapped_column(String(24), index=True)
    bank_id: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    request_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    response_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    incident: Mapped["Incident | None"] = relationship(back_populates="memory_operations")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    investigation_id: Mapped[int] = mapped_column(ForeignKey("investigations.id"), index=True)
    agent_name: Mapped[str] = mapped_column(String(64))
    role: Mapped[str] = mapped_column(String(64))
    provider: Mapped[str] = mapped_column(String(48), default="local-fallback")
    status: Mapped[str] = mapped_column(String(24), default="completed")
    input_summary: Mapped[str] = mapped_column(Text)
    output: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    investigation: Mapped["Investigation"] = relationship(back_populates="agent_runs")
