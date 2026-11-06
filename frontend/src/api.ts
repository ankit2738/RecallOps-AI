export type Severity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";
export type IncidentStatus = "open" | "investigating" | "resolved";

export interface Incident {
  id: number;
  incident_code: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  symptoms: string[];
  root_cause: string | null;
  resolution_summary: string | null;
  resolution_steps: string[];
  started_at: string;
  resolved_at: string | null;
  is_synthetic: boolean;
  memory_retained: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: number;
  agent_name: string;
  role: string;
  provider: string;
  status: string;
  input_summary: string;
  output: Record<string, unknown>;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface RecalledMemory {
  id?: string | null;
  text: string;
  type?: string | null;
  context?: string | null;
  metadata?: Record<string, string>;
  score?: number | null;
  scores?: Record<string, number>;
}

export interface Investigation {
  id: number;
  incident_id: number;
  status: string;
  memory_enabled: boolean;
  memory_status: string;
  summary: string | null;
  root_cause_hypothesis: string | null;
  confidence: number;
  recommended_actions: Array<{ step: string; rationale?: string; priority?: string }>;
  evidence: Array<Record<string, unknown>>;
  recalled_memories: RecalledMemory[];
  llm_provider: string;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  agent_runs: AgentRun[];
}

export interface MemoryOperation {
  id: number;
  incident_id: number | null;
  investigation_id: number | null;
  operation: "retain" | "recall" | "reflect";
  bank_id: string;
  status: string;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface Health {
  status: string;
  app: string;
  environment: string;
  timestamp: string;
  database: { ok: boolean; detail: string };
  hindsight: { configured: boolean; reachable: boolean; bank_id: string; api_url: string; detail: string };
  llm: { configured: boolean; source: string; model: string; base_url: string };
  band: { configured: boolean; tom_verified: boolean; jerry_verified: boolean; detail: string };
  memory_sync: SyncState;
}

export interface SyncState {
  running: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface MemoryOverview {
  hindsight: { configured: boolean; reachable: boolean; bank_id: string; api_url: string; detail: string };
  llm: { configured: boolean; source: string; model: string };
  counts: { retain: number; recall: number; reflect: number };
  sync: SyncState;
  operations: MemoryOperation[];
}

export interface DashboardSummary {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  investigations: number;
  memories_retained: number;
  memory_health: string;
  avg_confidence: number;
  recurring_services: Array<{ service: string; incident_count: number }>;
  recent_incidents: Incident[];
}

export interface Patterns {
  recurring_services: Array<{
    service: string;
    incident_count: number;
    open_count: number;
    resolved_count: number;
    incident_codes: string[];
    root_causes: string[];
    latest_incident: string;
    recommendation: string;
  }>;
  top_root_causes: Array<{ root_cause: string; count: number }>;
  memory: { successful_retains: number; successful_recalls: number; incidents_retained: number };
  totals: { incidents: number; services: number; recurring_services: number };
}

export interface MemoryComparison {
  memory_on: { runs: number; avg_confidence: number; avg_memories: number };
  memory_off: { runs: number; avg_confidence: number; avg_memories: number };
  delta_confidence: number;
}

export interface AgentStatus {
  configured: boolean;
  tom_verified: boolean;
  jerry_verified: boolean;
  detail: string;
  provider_note: string;
  recent_runs: AgentRun[];
}

export interface RecallResult {
  status: string;
  operation_id?: number;
  memories: RecalledMemory[];
  count?: number;
  latency_ms?: number;
  error?: string;
}

export interface ReflectResult {
  status: string;
  operation_id?: number;
  text: string | null;
  based_on?: Record<string, unknown>;
  latency_ms?: number;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),
  dashboard: () => request<DashboardSummary>("/api/dashboard/summary"),
  incidents: (params: { status?: string; service?: string; severity?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value && query.set(key, value));
    return request<Incident[]>(`/api/incidents?${query.toString()}`);
  },
  incident: (id: number) => request<Incident>(`/api/incidents/${id}`),
  createIncident: (payload: {
    title: string;
    service: string;
    severity: string;
    description: string;
    symptoms: string[];
    status?: string;
  }) =>
    request<Incident>("/api/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  investigate: (id: number, memoryEnabled: boolean) =>
    request<Investigation>(`/api/incidents/${id}/investigate`, {
      method: "POST",
      body: JSON.stringify({ memory_enabled: memoryEnabled }),
    }),
  compare: (id: number) =>
    request<{
      incident_id: number;
      delta_confidence: number;
      memories_used: number;
      memory_off: Investigation;
      memory_on: Investigation;
    }>(`/api/incidents/${id}/compare`, { method: "POST" }),
  resolve: (
    id: number,
    payload: {
      root_cause: string;
      resolution_summary: string;
      resolution_steps: string[];
      retain_to_memory: boolean;
    },
  ) =>
    request<{ incident: Incident; memory: { status: string; error?: string } | null }>(
      `/api/incidents/${id}/resolve`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  incidentInvestigations: (id: number) => request<Investigation[]>(`/api/incidents/${id}/investigations`),
  investigations: () => request<Investigation[]>("/api/investigations"),
  memoryOverview: () => request<MemoryOverview>("/api/memory/overview"),
  recall: (query: string) =>
    request<RecallResult>("/api/memory/recall", {
      method: "POST",
      body: JSON.stringify({ query, max_tokens: 2048 }),
    }),
  reflect: (query: string) =>
    request<ReflectResult>("/api/memory/reflect", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),
  syncMemory: (force = false) =>
    request<{ started: boolean; detail?: string; state: SyncState }>(`/api/memory/sync?force=${force}`, {
      method: "POST",
    }),
  syncStatus: () => request<SyncState>("/api/memory/sync/status"),
  retainIncident: (id: number) =>
    request<{ status: string; error?: string }>(`/api/memory/retain/${id}`, { method: "POST" }),
  patterns: () => request<Patterns>("/api/analytics/patterns"),
  comparison: () => request<MemoryComparison>("/api/analytics/comparison"),
  agentStatus: () => request<AgentStatus>("/api/agents/status"),
  agentRuns: () => request<AgentRun[]>("/api/agents/runs"),
};
