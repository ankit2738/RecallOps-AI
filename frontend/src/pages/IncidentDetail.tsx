import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  BrainCircuit,
  CheckCircle2,
  Database,
  GitCompareArrows,
  Loader2,
  Play,
  Save,
  Search,
  ShieldQuestion,
  Sparkles,
  Wrench,
} from "lucide-react";
import { api, type Incident, type Investigation } from "../api";
import {
  Badge,
  Card,
  ConfidenceBar,
  ErrorBanner,
  EmptyState,
  Loading,
  ProviderBadge,
  SectionHeader,
  formatDateTime,
  memoryTone,
  severityTone,
  statusTone,
} from "../components/ui";

type CompareResult = {
  incident_id: number;
  delta_confidence: number;
  memories_used: number;
  memory_off: Investigation;
  memory_on: Investigation;
};

export default function IncidentDetail() {
  const { id } = useParams();
  const incidentId = Number(id);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<"on" | "off" | "compare" | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ root_cause: "", resolution_summary: "", resolution_steps: "", retain: true });

  const load = () => {
    setError(null);
    Promise.all([api.incident(incidentId), api.incidentInvestigations(incidentId)])
      .then(([incidentData, investigationData]) => {
        setIncident(incidentData);
        setInvestigations(investigationData);
        setForm((current) => ({
          ...current,
          root_cause: current.root_cause || incidentData.root_cause || "",
          resolution_summary: current.resolution_summary || incidentData.resolution_summary || "",
          resolution_steps: current.resolution_steps || (incidentData.resolution_steps || []).join("\n"),
        }));
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, [incidentId]);

  const run = async (mode: "on" | "off") => {
    setRunning(mode);
    setError(null);
    try {
      await api.investigate(incidentId, mode === "on");
      setCompare(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const runCompare = async () => {
    setRunning("compare");
    setError(null);
    try {
      const result = await api.compare(incidentId);
      setCompare(result);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const submitResolve = async (event: React.FormEvent) => {
    event.preventDefault();
    setResolveMessage(null);
    try {
      const result = await api.resolve(incidentId, {
        root_cause: form.root_cause,
        resolution_summary: form.resolution_summary,
        resolution_steps: form.resolution_steps.split("\n").map((step) => step.trim()).filter(Boolean),
        retain_to_memory: form.retain,
      });
      setResolveMessage(
        result.memory?.status === "success"
          ? "Resolved and retained in Hindsight."
          : result.memory?.status === "unavailable"
            ? "Resolved. Hindsight was unavailable, so retention did not happen."
            : result.memory?.status === "failed"
              ? `Resolved, but retention failed: ${result.memory.error || "unknown error"}`
              : "Resolved.",
      );
      setShowResolve(false);
      load();
    } catch (err) {
      setResolveMessage((err as Error).message);
    }
  };

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!incident) return <Loading label="Opening incident room" />;

  const latest = investigations[0];
  const tomRun = latest?.agent_runs.find((run) => run.role === "investigator" || run.agent_name === "Tom");
  const jerryRun = latest?.agent_runs.find((run) => run.role === "reviewer" || run.agent_name === "Jerry");

  return (
    <div className="space-y-5">
      <Link to="/incidents" className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 hover:text-slate-300">
        <ArrowLeft size={13} /> Back to incidents
      </Link>

      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-[11px] font-semibold text-cyan-300">{incident.incident_code}</span>
              <Badge tone={severityTone(incident.severity)}>{incident.severity}</Badge>
              <Badge tone={statusTone(incident.status)}>{incident.status}</Badge>
              {incident.is_synthetic ? <Badge tone="slate">synthetic</Badge> : null}
              {incident.memory_retained ? (
                <Badge tone="green">
                  <Database size={10} /> memory retained
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight tracking-tight text-slate-100">
              {incident.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
              <span className="mono text-slate-400">{incident.service}</span>
              <span>Started {formatDateTime(incident.started_at)}</span>
              {incident.resolved_at ? <span className="text-emerald-400/80">Resolved {formatDateTime(incident.resolved_at)}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={running !== null} onClick={() => run("on")}>
              {running === "on" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Investigate with memory
            </button>
            <button className="btn btn-ghost" disabled={running !== null} onClick={() => run("off")}>
              {running === "off" ? <Loader2 size={14} className="animate-spin" /> : <ShieldQuestion size={14} />}
              Without memory
            </button>
            <button className="btn btn-blue" disabled={running !== null} onClick={runCompare}>
              {running === "compare" ? <Loader2 size={14} className="animate-spin" /> : <GitCompareArrows size={14} />}
              Compare ON vs OFF
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <SectionHeader title="Incident context" subtitle="Telemetry summary provided to the agents." />
            <p className="text-[12.5px] leading-6 text-slate-300">{incident.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {incident.symptoms.map((symptom) => (
                <span key={symptom} className="rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1 text-[10.5px] text-slate-400">
                  {symptom}
                </span>
              ))}
            </div>
            {incident.root_cause ? (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">Recorded root cause</div>
                <p className="mt-1 text-[12px] leading-5 text-slate-300">{incident.root_cause}</p>
              </div>
            ) : null}
          </Card>

          {latest ? (
            <Card className="p-5">
              <SectionHeader
                title="Latest investigation"
                subtitle={`Run ${latest.id} · ${formatDateTime(latest.created_at)}`}
                right={
                  <div className="flex items-center gap-2">
                    <Badge tone={latest.memory_enabled ? "cyan" : "slate"}>{latest.memory_enabled ? "memory ON" : "memory OFF"}</Badge>
                    <Badge tone={memoryTone(latest.memory_status)}>{latest.memory_status}</Badge>
                    <ProviderBadge provider={latest.llm_provider} />
                  </div>
                }
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">Root cause hypothesis</div>
                  <p className="mt-1.5 text-[13px] font-medium leading-6 text-slate-100">{latest.root_cause_hypothesis || "No hypothesis produced."}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <ConfidenceBar value={latest.confidence} />
                  <div className="mt-3 text-[10.5px] leading-5 text-slate-500">
                    {latest.recalled_memories.length} historical memories used. Jerry reviewed independently.
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-slate-400">{latest.summary}</p>

              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <Wrench size={12} /> Recommended actions
                </div>
                <div className="space-y-2">
                  {latest.recommended_actions.map((action, index) => (
                    <div key={`${action.step}-${index}`} className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-cyan-400/10 text-[10px] font-bold text-cyan-300">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-[12px] font-medium text-slate-200">{action.step}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                            <Badge tone="slate">{action.priority || "short-term"}</Badge>
                            {action.rationale ? <span>{action.rationale}</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <Database size={12} /> Recalled Hindsight memories
                </div>
                {latest.recalled_memories.length ? (
                  <div className="space-y-2">
                    {latest.recalled_memories.map((memory, index) => (
                      <div key={`${memory.id}-${index}`} className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[11.5px] leading-5 text-slate-300">{memory.text}</p>
                          {typeof memory.score === "number" ? (
                            <span className="mono shrink-0 text-[10px] text-cyan-300">{memory.score.toFixed(2)}</span>
                          ) : null}
                        </div>
                        {memory.metadata?.incident_code ? (
                          <div className="mt-1.5 text-[10px] text-slate-600">source {memory.metadata.incident_code}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 px-4 py-5 text-center text-[11.5px] text-slate-500">
                    No memories were returned for this run.
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <EmptyState
                icon={Search}
                title="No investigation yet"
                description="Run an investigation to see Tom's diagnosis, Jerry's review and the Hindsight memories that informed them."
              />
            </Card>
          )}

          {compare ? (
            <Card className="p-5">
              <SectionHeader
                title="Memory ON vs OFF"
                subtitle={`${compare.memories_used} memories used · confidence delta ${(compare.delta_confidence * 100).toFixed(0)} points`}
              />
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { label: "Memory OFF", run: compare.memory_off, tone: "slate" as const },
                  { label: "Memory ON", run: compare.memory_on, tone: "cyan" as const },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border p-4 ${
                      item.tone === "cyan" ? "border-cyan-400/25 bg-cyan-400/5" : "border-slate-800 bg-slate-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge tone={item.tone}>{item.label}</Badge>
                      <span className="mono text-[11px] text-slate-400">{Math.round(item.run.confidence * 100)}%</span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-[11.5px] leading-5 text-slate-400">{item.run.root_cause_hypothesis}</p>
                    <div className="mt-3 flex items-center gap-2 text-[10.5px] text-slate-500">
                      <Database size={11} /> {item.run.recalled_memories.length} memories
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionHeader title="Agent collaboration" subtitle="Tom investigates. Jerry challenges." />
            <div className="space-y-3">
              {[tomRun, jerryRun].filter(Boolean).map((run) => (
                <div key={run!.id} className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`grid h-7 w-7 place-items-center rounded-lg ${run!.agent_name === "Tom" ? "bg-cyan-400/10 text-cyan-300" : "bg-violet-400/10 text-violet-300"}`}>
                        {run!.agent_name === "Tom" ? <Sparkles size={13} /> : <ShieldQuestion size={13} />}
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-slate-200">{run!.agent_name}</div>
                        <div className="text-[10px] capitalize text-slate-500">{run!.role}</div>
                      </div>
                    </div>
                    <ProviderBadge provider={run!.provider} />
                  </div>
                  <p className="mt-2.5 line-clamp-3 text-[11px] leading-5 text-slate-400">
                    {String((run!.output as Record<string, unknown>).root_cause_hypothesis ?? (run!.output as Record<string, unknown>).verdict ?? "Review completed.")}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-600">{run!.latency_ms ?? "—"} ms · {run!.status}</div>
                </div>
              ))}
              {!tomRun && !jerryRun ? (
                <div className="text-[11.5px] text-slate-500">Agent runs will appear after the next investigation.</div>
              ) : null}
            </div>
            <Link to="/agents" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-cyan-300">
              Agent activity <ArrowRightLeft size={12} />
            </Link>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Resolve & learn" subtitle="Write the verified fix back into Hindsight." />
            {resolveMessage ? (
              <div className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] text-emerald-200">
                {resolveMessage}
              </div>
            ) : null}
            {incident.status === "resolved" ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-3 text-[11.5px] text-emerald-200">
                <CheckCircle2 size={14} /> This incident is resolved.
              </div>
            ) : showResolve ? (
              <form onSubmit={submitResolve} className="space-y-3">
                <div>
                  <label className="label">Root cause</label>
                  <textarea
                    className="textarea !min-h-[70px]"
                    value={form.root_cause}
                    onChange={(event) => setForm({ ...form, root_cause: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Resolution summary</label>
                  <textarea
                    className="textarea !min-h-[70px]"
                    value={form.resolution_summary}
                    onChange={(event) => setForm({ ...form, resolution_summary: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Resolution steps (one per line)</label>
                  <textarea
                    className="textarea !min-h-[90px]"
                    value={form.resolution_steps}
                    onChange={(event) => setForm({ ...form, resolution_steps: event.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-[11.5px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.retain}
                    onChange={(event) => setForm({ ...form, retain: event.target.checked })}
                    className="accent-cyan-400"
                  />
                  Retain to Hindsight immediately
                </label>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1">
                    <Save size={13} /> Resolve
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowResolve(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="btn btn-primary w-full" onClick={() => setShowResolve(true)}>
                <CheckCircle2 size={14} /> Resolve incident
              </button>
            )}
            <div className="mt-3 flex items-start gap-2 text-[10.5px] leading-4 text-slate-600">
              <BrainCircuit size={12} className="mt-0.5 shrink-0" />
              On resolve, the incident is retained as structured memory and becomes available to the next recall.
            </div>
          </Card>

          {latest?.evidence.length ? (
            <Card className="p-5">
              <SectionHeader title="Evidence trail" subtitle="Telemetry and memory citations." />
              <div className="space-y-2">
                {latest.evidence.slice(0, 6).map((item, index) => (
                  <div key={index} className="rounded-lg border border-slate-800/70 px-3 py-2 text-[10.5px] leading-4 text-slate-400">
                    <span className="mono mr-1.5 text-cyan-300/80">{String(item.source ?? "evidence")}</span>
                    {String(item.detail ?? "")}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {investigations.length > 1 ? (
        <Card className="p-5">
          <SectionHeader title="Investigation history" subtitle="Every run is preserved." />
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {investigations.map((investigation) => (
              <div key={investigation.id} className="rounded-xl border border-slate-800/70 bg-slate-900/25 p-3">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10.5px] text-slate-500">RUN-{investigation.id}</span>
                  <Badge tone={memoryTone(investigation.memory_status)}>{investigation.memory_status}</Badge>
                </div>
                <div className="mt-2 text-[11.5px] font-medium text-slate-300">
                  {investigation.root_cause_hypothesis || "No hypothesis"}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{formatDateTime(investigation.created_at)}</span>
                  <span className="mono">{Math.round(investigation.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
