from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    service: str = Field(min_length=2, max_length=120)
    severity: str = Field(default="SEV-3", pattern=r"^SEV-[1-4]$")
    status: str = Field(default="open", pattern=r"^(open|investigating|resolved)$")
    description: str = Field(min_length=10)
    symptoms: list[str] = Field(default_factory=list)
    started_at: datetime | None = None
    is_synthetic: bool = True


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    service: str | None = Field(default=None, min_length=2, max_length=120)
    severity: str | None = Field(default=None, pattern=r"^SEV-[1-4]$")
    status: str | None = Field(default=None, pattern=r"^(open|investigating|resolved)$")
    description: str | None = Field(default=None, min_length=10)
    symptoms: list[str] | None = None
    root_cause: str | None = None
    resolution_summary: str | None = None
    resolution_steps: list[str] | None = None


class IncidentOut(IncidentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_code: str
    root_cause: str | None = None
    resolution_summary: str | None = None
    resolution_steps: list[str] = Field(default_factory=list)
    resolved_at: datetime | None = None
    memory_retained: bool = False
    created_at: datetime
    updated_at: datetime


class InvestigationRequest(BaseModel):
    memory_enabled: bool = True
    force_refresh: bool = False


class AgentRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    agent_name: str
    role: str
    provider: str
    status: str
    input_summary: str
    output: dict[str, Any]
    latency_ms: int | None = None
    error: str | None = None
    created_at: datetime


class InvestigationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_id: int
    status: str
    memory_enabled: bool
    memory_status: str
    summary: str | None = None
    root_cause_hypothesis: str | None = None
    confidence: float
    recommended_actions: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    recalled_memories: list[dict[str, Any]]
    llm_provider: str
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
    agent_runs: list[AgentRunOut] = Field(default_factory=list)


class MemoryOperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_id: int | None = None
    investigation_id: int | None = None
    operation: str
    bank_id: str
    status: str
    request_payload: dict[str, Any]
    response_payload: dict[str, Any]
    latency_ms: int | None = None
    error: str | None = None
    created_at: datetime


class RecallRequest(BaseModel):
    query: str = Field(min_length=3)
    max_tokens: int = Field(default=2048, ge=256, le=8192)


class ReflectRequest(BaseModel):
    query: str = Field(min_length=3)


class ResolveRequest(BaseModel):
    root_cause: str = Field(min_length=3)
    resolution_summary: str = Field(min_length=3)
    resolution_steps: list[str] = Field(default_factory=list)
    retain_to_memory: bool = True


class MemoryStatusOut(BaseModel):
    configured: bool
    reachable: bool
    bank_id: str
    api_url: str
    detail: str
    tom_provider: str | None = None
    jerry_provider: str | None = None


class DashboardSummary(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    investigations: int
    memories_retained: int
    memory_health: str
    avg_confidence: float
    recurring_services: list[dict[str, Any]]
    recent_incidents: list[IncidentOut]
