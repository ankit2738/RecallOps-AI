import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  GitBranch,
  History,
  PlusCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Siren,
} from "lucide-react";
import { api, type DashboardSummary, type MemoryOverview } from "../api";
import {
  Badge,
  Card,
  ErrorBanner,
  Loading,
  SectionHeader,
  StatCard,
  formatDateTime,
  severityTone,
  statusTone,
  timeAgo,
} from "../components/ui";

export default function Overview() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [memory, setMemory] = useState<MemoryOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([api.dashboard(), api.memoryOverview()])
      .then(([dashboard, memoryOverview]) => {
        setSummary(dashboard);
        setMemory(memoryOverview);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, []);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!summary) return <Loading label="Loading command center" />;

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 sm:p-8 fade-up">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
          <div>
            <Badge tone="cyan">
              <Sparkles size={11} /> Hindsight-native incident response
            </Badge>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-[1.12] tracking-tight text-slate-100 sm:text-[40px]">
              Incident response that <span className="gradient-text">remembers.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[13.5px] leading-6 text-slate-400">
              RecallOps retrieves verified historical incidents from Hindsight, lets Tom diagnose
              and Jerry challenge the fix, then writes the resolved knowledge back to memory.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button className="btn btn-primary" onClick={() => navigate("/investigate")}>
                <PlusCircle size={15} /> New investigation
              </button>
              <button className="btn btn-ghost" onClick={() => navigate("/memory")}>
                <BrainCircuit size={15} /> Open memory intelligence
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="panel-soft p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                  Hindsight engine
                </span>
                <Badge tone={summary.memory_health === "healthy" ? "green" : "red"}>
                  {summary.memory_health}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="mono text-lg font-semibold text-emerald-300">{memory?.counts.retain ?? 0}</div>
                  <div className="text-[10px] text-slate-500">retains</div>
                </div>
                <div>
                  <div className="mono text-lg font-semibold text-cyan-300">{memory?.counts.recall ?? 0}</div>
                  <div className="text-[10px] text-slate-500">recalls</div>
                </div>
                <div>
                  <div className="mono text-lg font-semibold text-violet-300">{memory?.counts.reflect ?? 0}</div>
                  <div className="text-[10px] text-slate-500">reflects</div>
                </div>
              </div>
            </div>
            <div className="panel-soft flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <Database size={16} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-slate-200">
                  {summary.memories_retained} of {summary.resolved_incidents} resolved incidents retained
                </div>
                <div className="text-[10.5px] text-slate-500">Bank: {memory?.hindsight.bank_id ?? "recallops-incidents"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open incidents" value={summary.open_incidents} hint="Needs an owner" icon={Siren} tone="red" />
        <StatCard label="Resolved" value={summary.resolved_incidents} hint="Knowledge candidates" icon={CheckCircle2} tone="green" />
        <StatCard label="Investigations" value={summary.investigations} hint="Tom + Jerry runs" icon={Search} tone="cyan" />
        <StatCard
          label="Avg confidence"
          value={`${Math.round(summary.avg_confidence * 100)}%`}
          hint="Across all investigations"
          icon={ShieldAlert}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden">
          <div className="px-5 pt-5">
            <SectionHeader
              title="Recent incidents"
              subtitle="Synthetic demo data is labelled in each row."
              right={
                <Link to="/incidents" className="btn btn-ghost !py-2 !text-[11px]">
                  View all <ArrowRight size={12} />
                </Link>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Service</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Memory</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    <td>
                      <div className="mono text-[11px] text-cyan-300">{incident.incident_code}</div>
                      <div className="mt-0.5 max-w-[260px] truncate text-[12px] font-medium text-slate-200">
                        {incident.title}
                      </div>
                    </td>
                    <td className="mono text-[11.5px] text-slate-400">{incident.service}</td>
                    <td>
                      <Badge tone={severityTone(incident.severity)}>{incident.severity}</Badge>
                    </td>
                    <td>
                      <Badge tone={statusTone(incident.status)}>{incident.status}</Badge>
                    </td>
                    <td>
                      {incident.memory_retained ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                          <Database size={12} /> retained
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600">not retained</span>
                      )}
                    </td>
                    <td className="text-[11px] text-slate-500">{timeAgo(incident.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionHeader title="Memory operations" subtitle="Every operation is recorded with status and latency." />
            <div className="space-y-2">
              {(memory?.operations ?? []).slice(0, 5).map((operation) => (
                <div key={operation.id} className="flex items-center gap-3 rounded-xl border border-slate-800/70 px-3 py-2.5">
                  <div
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      operation.operation === "retain"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : operation.operation === "recall"
                          ? "bg-cyan-400/10 text-cyan-300"
                          : "bg-violet-400/10 text-violet-300"
                    }`}
                  >
                    {operation.operation === "retain" ? <Database size={13} /> : operation.operation === "recall" ? <Search size={13} /> : <BrainCircuit size={13} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold capitalize text-slate-200">{operation.operation}</span>
                      <Badge tone={operation.status === "success" ? "green" : operation.status === "unavailable" ? "amber" : "red"}>
                        {operation.status}
                      </Badge>
                    </div>
                    <div className="truncate text-[10.5px] text-slate-500">
                      {formatDateTime(operation.created_at)} · {operation.latency_ms ?? "—"} ms
                    </div>
                  </div>
                </div>
              ))}
              {!memory?.operations.length ? (
                <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-[12px] text-slate-500">
                  No memory operations yet. Start an investigation or sync resolved incidents.
                </div>
              ) : null}
            </div>
            <Link to="/memory" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-cyan-300 hover:text-cyan-200">
              Inspect memory ledger <ArrowRight size={12} />
            </Link>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Recurring services" subtitle="Patterns that deserve preventive work." />
            <div className="space-y-2">
              {summary.recurring_services.map((item) => (
                <div key={item.service} className="flex items-center justify-between rounded-xl border border-slate-800/70 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <GitBranch size={13} className="text-amber-300" />
                    <span className="mono text-[11.5px] text-slate-200">{item.service}</span>
                  </div>
                  <Badge tone="amber">{item.incident_count} incidents</Badge>
                </div>
              ))}
              {!summary.recurring_services.length ? (
                <div className="text-[12px] text-slate-500">No recurring service pattern detected yet.</div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionHeader title="Closed learning loop" subtitle="Hindsight is not a sidebar; it is the source of every recommendation." />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Search,
              title: "1 · Recall",
              body: "A new incident is embedded and matched against prior incidents, root causes and runbooks in Hindsight.",
            },
            {
              icon: BrainCircuit,
              title: "2 · Reason",
              body: "Tom proposes a diagnosis; Jerry independently challenges blast radius and validation gaps.",
            },
            {
              icon: History,
              title: "3 · Retain",
              body: "The verified resolution is written back to Hindsight so the next on-call engineer starts smarter.",
            },
          ].map((step) => (
            <div key={step.title} className="rounded-xl border border-slate-800/70 bg-slate-900/25 p-4">
              <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <step.icon size={15} />
              </div>
              <div className="text-[12.5px] font-semibold text-slate-200">{step.title}</div>
              <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{step.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
