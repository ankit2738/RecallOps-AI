import { useEffect, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  api,
  type MemoryOperation,
  type MemoryOverview,
  type RecallResult,
  type ReflectResult,
  type SyncState,
} from "../api";
import {
  Badge,
  Card,
  ErrorBanner,
  KeyValue,
  Loading,
  SectionHeader,
  formatDateTime,
  formatMs,
} from "../components/ui";

export default function MemoryIntelligence() {
  const [overview, setOverview] = useState<MemoryOverview | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("payments-api latency connection pool exhaustion");
  const [recall, setRecall] = useState<RecallResult | null>(null);
  const [reflectQuery, setReflectQuery] = useState("What runbook should we use for a payments-api pool exhaustion incident?");
  const [reflect, setReflect] = useState<ReflectResult | null>(null);

  const load = () => {
    setError(null);
    Promise.all([api.memoryOverview(), api.syncStatus()])
      .then(([memory, syncState]) => {
        setOverview(memory);
        setSync(syncState);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!sync?.running) return;
    const timer = window.setInterval(() => {
      api.syncStatus().then(setSync).catch(() => undefined);
      api.memoryOverview().then(setOverview).catch(() => undefined);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [sync?.running]);

  const startSync = async (force = false) => {
    setBusy("sync");
    try {
      const result = await api.syncMemory(force);
      setSync(result.state);
      setTimeout(load, 800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runRecall = async () => {
    setBusy("recall");
    setRecall(null);
    try {
      setRecall(await api.recall(query));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runReflect = async () => {
    setBusy("reflect");
    setReflect(null);
    try {
      setReflect(await api.reflect(reflectQuery));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!overview) return <Loading label="Loading memory engine" />;

  const progress = sync && sync.total > 0 ? Math.round((sync.processed / sync.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Hindsight",
            value: overview.hindsight.reachable ? "Live" : "Down",
            hint: overview.hindsight.api_url,
            icon: Server,
            tone: overview.hindsight.reachable ? "text-emerald-300 bg-emerald-400/10" : "text-red-300 bg-red-400/10",
          },
          {
            label: "Memory bank",
            value: overview.hindsight.bank_id,
            hint: "Isolated incident brain",
            icon: Database,
            tone: "text-cyan-300 bg-cyan-400/10",
          },
          {
            label: "Retains",
            value: overview.counts.retain,
            hint: "Verified write-backs",
            icon: BrainCircuit,
            tone: "text-violet-300 bg-violet-400/10",
          },
          {
            label: "Recalls",
            value: overview.counts.recall,
            hint: "Historical retrievals",
            icon: Search,
            tone: "text-blue-300 bg-blue-400/10",
          },
        ].map((stat) => (
          <Card key={stat.label} className="panel-hover p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{stat.label}</div>
                <div className="mt-2 truncate text-[19px] font-bold tracking-tight text-slate-100">{stat.value}</div>
                <div className="mt-1 truncate text-[10.5px] text-slate-600">{stat.hint}</div>
              </div>
              <div className={`grid h-8 w-8 place-items-center rounded-lg ${stat.tone}`}>
                <stat.icon size={15} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Retain resolved incidents"
            subtitle="Backfill verified incident knowledge into Hindsight. Operations are throttled to respect free-tier limits."
            right={
              <button className="btn btn-primary !py-2 !text-[11px]" disabled={busy === "sync" || sync?.running} onClick={() => startSync(false)}>
                {busy === "sync" || sync?.running ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sync memory
              </button>
            }
          />
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${sync?.failed ? "bg-amber-400" : "bg-cyan-400"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-800/70 py-2">
              <div className="mono text-base font-semibold text-slate-200">{sync?.processed ?? 0}/{sync?.total ?? 0}</div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">processed</div>
            </div>
            <div className="rounded-lg border border-slate-800/70 py-2">
              <div className="mono text-base font-semibold text-emerald-300">{sync?.succeeded ?? 0}</div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">retained</div>
            </div>
            <div className="rounded-lg border border-slate-800/70 py-2">
              <div className="mono text-base font-semibold text-amber-300">{sync?.failed ?? 0}</div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">failed</div>
            </div>
          </div>
          {sync?.last_error ? (
            <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[10.5px] leading-4 text-amber-200">
              Last error: {sync.last_error}
            </div>
          ) : null}
          {sync?.running ? (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-cyan-300">
              <Loader2 size={12} className="animate-spin" /> Sync running in the background.
            </div>
          ) : null}
          <div className="mt-4 border-t border-slate-800/70 pt-3">
            <KeyValue label="LLM source" value={overview.llm.source} />
            <KeyValue label="Model" value={overview.llm.model} mono />
            <KeyValue label="Bank detail" value={overview.hindsight.detail} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Recall playground" subtitle="Query Hindsight directly. No LLM is required for recall." />
          <div className="flex gap-2">
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Describe the incident…" />
            <button className="btn btn-blue" onClick={runRecall} disabled={busy === "recall"}>
              {busy === "recall" ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Recall
            </button>
          </div>
          {recall ? (
            <div className="mt-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={recall.status === "success" ? "green" : "red"}>{recall.status}</Badge>
                <span className="text-[10.5px] text-slate-500">
                  {recall.memories.length} memories · {formatMs(recall.latency_ms)}
                </span>
              </div>
              <div className="max-h-[260px] space-y-2 overflow-y-auto scroll-thin pr-1">
                {recall.memories.map((memory, index) => (
                  <div key={`${memory.id}-${index}`} className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] leading-5 text-slate-300">{memory.text}</p>
                      {typeof memory.score === "number" ? (
                        <span className="mono shrink-0 text-[9.5px] text-cyan-300">{memory.score.toFixed(2)}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!recall.memories.length ? (
                  <div className="rounded-lg border border-dashed border-slate-800 px-3 py-5 text-center text-[11px] text-slate-500">
                    No memories matched this query.
                  </div>
                ) : null}
              </div>
              {recall.error ? <div className="mt-2 text-[10.5px] text-red-300">{recall.error}</div> : null}
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Reflect"
          subtitle="Ask Hindsight to synthesize a runbook across memories. This operation uses the memory LLM and may be quota-limited."
          right={
            <button className="btn btn-ghost !py-2 !text-[11px]" onClick={runReflect} disabled={busy === "reflect"}>
              {busy === "reflect" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Run reflection
            </button>
          }
        />
        <input className="input" value={reflectQuery} onChange={(event) => setReflectQuery(event.target.value)} />
        {reflect ? (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={reflect.status === "success" ? "green" : reflect.status === "unavailable" ? "amber" : "red"}>
                {reflect.status}
              </Badge>
              <span className="text-[10.5px] text-slate-500">{formatMs(reflect.latency_ms)}</span>
            </div>
            {reflect.text ? (
              <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 font-sans text-[11.5px] leading-6 text-slate-300">
                {reflect.text}
              </pre>
            ) : (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-[11px] text-amber-200">
                {reflect.error || "Reflection did not return text."}
              </div>
            )}
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHeader title="Memory operation ledger" subtitle="Every Hindsight call, including failures, with timestamp and latency." />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Op</th>
                <th>Status</th>
                <th>Bank</th>
                <th>Latency</th>
                <th>Timestamp</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {overview.operations.map((operation: MemoryOperation) => (
                <tr key={operation.id}>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize text-slate-200">
                      {operation.operation === "retain" ? <Database size={11} /> : operation.operation === "recall" ? <Search size={11} /> : <BrainCircuit size={11} />}
                      {operation.operation}
                    </span>
                  </td>
                  <td>
                    {operation.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-300">
                        <CheckCircle2 size={11} /> success
                      </span>
                    ) : operation.status === "unavailable" ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-amber-300">
                        <XCircle size={11} /> unavailable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-red-300">
                        <XCircle size={11} /> {operation.status}
                      </span>
                    )}
                  </td>
                  <td className="mono text-[10.5px] text-slate-400">{operation.bank_id}</td>
                  <td className="mono text-[10.5px] text-slate-400">{formatMs(operation.latency_ms)}</td>
                  <td className="text-[10.5px] text-slate-500">{formatDateTime(operation.created_at)}</td>
                  <td className="max-w-[360px]">
                    <span className="line-clamp-2 text-[10.5px] text-slate-500">
                      {operation.error || describeOperation(operation)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!overview.operations.length ? (
          <div className="px-5 py-8 text-center text-[12px] text-slate-500">No operations recorded yet.</div>
        ) : null}
      </Card>
    </div>
  );
}

function describeOperation(operation: MemoryOperation): string {
  const request = operation.request_payload || {};
  const response = operation.response_payload || {};
  if (operation.operation === "recall") return `query: ${String(request.query ?? "").slice(0, 120)}`;
  if (operation.operation === "reflect") return `query: ${String(request.query ?? "").slice(0, 120)}`;
  const items = response.items_count ?? response.items ?? "";
  return `content: ${String(request.content ?? "").slice(0, 120)}${items ? ` · ${items} items` : ""}`;
}
