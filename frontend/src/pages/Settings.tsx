import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  KeyRound,
  Server,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import { api, type Health } from "../api";
import { Badge, Card, ErrorBanner, KeyValue, Loading, SectionHeader } from "../components/ui";

export default function Settings() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api
      .health()
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!health) return <Loading label="Loading environment" />;

  const rows = [
    { label: "API", ok: health.status === "ok", value: health.status, detail: "FastAPI + SQLite" },
    { label: "Database", ok: health.database.ok, value: health.database.detail, detail: "Relational incident store" },
    {
      label: "Hindsight",
      ok: health.hindsight.reachable,
      value: health.hindsight.reachable ? "reachable" : "unavailable",
      detail: health.hindsight.api_url,
    },
    {
      label: "LLM",
      ok: health.llm.configured,
      value: health.llm.configured ? health.llm.source : "not configured",
      detail: health.llm.model,
    },
    {
      label: "Band",
      ok: health.band.configured && health.band.tom_verified && health.band.jerry_verified,
      value: health.band.configured ? "configured" : "not configured",
      detail: health.band.detail,
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader title="Runtime status" subtitle="Live checks from the backend. Secrets are never returned to the browser." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{row.label}</span>
                {row.ok ? <CheckCircle2 size={13} className="text-emerald-400" /> : <XCircle size={13} className="text-amber-400" />}
              </div>
              <div className="mt-2 text-[12px] font-semibold text-slate-200">{row.value}</div>
              <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600">{row.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Hindsight deployment" subtitle="Reproducible local server with free-tier-safe settings." />
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
            <pre className="overflow-x-auto text-[10.5px] leading-5 text-slate-400">
{`# 1. Start the memory server (compose file in repo root)
HINDSIGHT_API_LLM_API_KEY=<your-groq-key> \\
  docker compose -f docker-compose.hindsight.yml up -d

# 2. Health
curl http://localhost:8888/health

# 3. Backfill resolved incidents from the app
curl -X POST http://127.0.0.1:8000/api/memory/sync`}
            </pre>
          </div>
          <div className="mt-3 space-y-1">
            <KeyValue label="API URL" value={health.hindsight.api_url} mono />
            <KeyValue label="Bank" value={health.hindsight.bank_id} mono />
            <KeyValue label="Service tier" value="on_demand (required for free Groq orgs)" />
            <KeyValue label="Memory model" value="openai/gpt-oss-20b (free-tier default)" mono />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2.5 text-[10.5px] leading-4 text-cyan-100/80">
            <Terminal size={13} className="mt-0.5 shrink-0" />
            The compose file pins the worker id and preserves the named volume
            <span className="mono mx-1">recallops-hindsight-data</span>. Recreating the service does not wipe memory.
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Configuration keys" subtitle="Set these in .env or the shell. Never commit real values." />
          <div className="space-y-1">
            <KeyValue label="GROQ_API_KEY" value={health.llm.configured ? "configured (redacted)" : "missing"} />
            <KeyValue label="GROQ_BASE_URL" value={health.llm.base_url} mono />
            <KeyValue label="GROQ_MODEL" value={health.llm.model} mono />
            <KeyValue label="HINDSIGHT_API_URL" value={health.hindsight.api_url} mono />
            <KeyValue label="HINDSIGHT_API_KEY" value="optional for local server" />
            <KeyValue label="BAND_TOM_API_KEY" value="optional" />
            <KeyValue label="BAND_JERRY_API_KEY" value="optional" />
            <KeyValue label="BAND_CHAT_ID" value="optional" />
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 text-[10.5px] leading-4 text-amber-100/80">
            <KeyRound size={13} className="mt-0.5 shrink-0" />
            Credential values are never printed, returned by the API or committed. The browser only sees
            booleans and non-secret configuration.
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader title="What is verified vs fallback" subtitle="Honest integration states are part of the product." />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Status</th>
                <th>How to read it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-slate-200">Hindsight retain</td>
                <td><Badge tone={health.hindsight.reachable ? "green" : "red"}>{health.hindsight.reachable ? "verified" : "unavailable"}</Badge></td>
                <td className="text-slate-500">Real SDK call recorded in the memory ledger with latency and response.</td>
              </tr>
              <tr>
                <td className="text-slate-200">Hindsight recall</td>
                <td><Badge tone={health.hindsight.reachable ? "green" : "red"}>{health.hindsight.reachable ? "verified" : "unavailable"}</Badge></td>
                <td className="text-slate-500">Returns actual stored memories; the UI shows the retrieved text and scores.</td>
              </tr>
              <tr>
                <td className="text-slate-200">Hindsight reflect</td>
                <td><Badge tone="amber">quota-dependent</Badge></td>
                <td className="text-slate-500">Real SDK call. Free-tier daily quotas can block it; the exact error is surfaced.</td>
              </tr>
              <tr>
                <td className="text-slate-200">Tom / Jerry via Band</td>
                <td><Badge tone={health.band.configured ? "violet" : "amber"}>{health.band.configured ? "configured" : "local fallback"}</Badge></td>
                <td className="text-slate-500">Without Band credentials, runs are explicitly labelled local fallback. No agents are created.</td>
              </tr>
              <tr>
                <td className="text-slate-200">Groq LLM</td>
                <td><Badge tone={health.llm.configured ? "cyan" : "red"}>{health.llm.configured ? health.llm.source : "missing"}</Badge></td>
                <td className="text-slate-500">Falls back to deterministic analysis if the model is rate-limited or unavailable.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Safety and provenance" />
          <div className="space-y-2.5">
            {[
              { icon: ShieldCheck, text: "All seeded incidents are synthetic and labelled in the UI." },
              { icon: Database, text: "Memory operations are append-only records; failures are never hidden." },
              { icon: Server, text: "The Hindsight named volume is preserved across container recreation." },
              { icon: KeyRound, text: "No secret is exposed through the API, logs, UI or submission bundle." },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-2 text-[11px] leading-5 text-slate-400">
                <item.icon size={13} className="mt-0.5 shrink-0 text-cyan-300" />
                {item.text}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Event requirements" subtitle="Discrepancy flagged, not silently resolved." />
          <div className="space-y-2 text-[11px] leading-5 text-slate-400">
            <p>
              The registered event is <span className="text-slate-200">Hack With Bangalore 4.0</span>. The
              supplied problem-statement document is titled HackwithHyderabad 3.0. Confirm event-specific
              rules with the organizer before submission.
            </p>
            <p>
              Challenge: <span className="text-slate-200">AI Agents That Learn Using Hindsight</span>.
              Selected problem: Engineering &amp; DevOps — Incident Response Agent.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a className="btn btn-ghost !py-2 !text-[10.5px]" href="https://github.com/vectorize-io/hindsight" target="_blank" rel="noreferrer">
                <ExternalLink size={12} /> Hindsight GitHub
              </a>
              <a className="btn btn-ghost !py-2 !text-[10.5px]" href="https://hindsight.vectorize.io/" target="_blank" rel="noreferrer">
                <ExternalLink size={12} /> Hindsight docs
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
