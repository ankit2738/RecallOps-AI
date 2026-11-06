import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldQuestion,
  Sparkles,
  Users,
} from "lucide-react";
import { api, type AgentStatus } from "../api";
import {
  Badge,
  Card,
  ErrorBanner,
  Loading,
  ProviderBadge,
  SectionHeader,
  formatDateTime,
} from "../components/ui";

export default function AgentCollaboration() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api
      .agentStatus()
      .then(setStatus)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!status) return <Loading label="Checking agent connections" />;

  const live = status.configured && status.tom_verified && status.jerry_verified;
  const tomProvider = status.recent_runs.find((run) => run.agent_name === "Tom")?.provider ?? "local-fallback";
  const jerryProvider = status.recent_runs.find((run) => run.agent_name === "Jerry")?.provider ?? "local-fallback";

  return (
    <div className="space-y-5">
      <Card className={`p-5 ${live ? "border-violet-400/25" : "border-amber-400/25"}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${live ? "bg-violet-400/10 text-violet-300" : "bg-amber-400/10 text-amber-300"}`}>
              {live ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-slate-100">
                  {live ? "Band agents verified" : "Band credentials not configured"}
                </h2>
                <Badge tone={live ? "violet" : "amber"}>{live ? "live" : "local fallback"}</Badge>
              </div>
              <p className="mt-1 max-w-3xl text-[11.5px] leading-5 text-slate-400">{status.provider_note}</p>
              <p className="mt-1 text-[10.5px] text-slate-600">{status.detail}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-[10.5px] text-slate-500">
            <Users size={13} /> Existing registrations only · no duplicates created
          </div>
        </div>
      </Card>

      <Card className="border-amber-400/20 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-300">
            <AlertTriangle size={15} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-amber-200">Groq application LLM not configured</span>
              <Badge tone="amber">deterministic fallback</Badge>
            </div>
            <p className="mt-1 max-w-4xl text-[10.5px] leading-4 text-slate-400">
              Tom and Jerry are running on the local deterministic fallback. Hindsight memory extraction may
              still use its own Groq key. Set <span className="mono text-slate-300">GROQ_API_KEY</span> to enable
              Groq-backed investigations. The provider badges below remain the source of truth.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-slate-100">Tom</div>
                <div className="text-[10.5px] uppercase tracking-[0.1em] text-slate-500">Investigator</div>
              </div>
            </div>
            <ProviderBadge provider={tomProvider} />
          </div>
          <p className="mt-3 text-[11.5px] leading-5 text-slate-400">
            Recalls historical incidents, proposes the root-cause hypothesis, assigns a confidence
            score and produces a prioritized action plan. Tom never invents memory that Hindsight did
            not return.
          </p>
          <div className="mt-3 space-y-1.5 text-[10.5px] text-slate-500">
            <div className="flex items-center gap-1.5"><ArrowRight size={11} className="text-cyan-300" /> Memory-first diagnosis</div>
            <div className="flex items-center gap-1.5"><ArrowRight size={11} className="text-cyan-300" /> Evidence and action plan</div>
            <div className="flex items-center gap-1.5"><ArrowRight size={11} className="text-cyan-300" /> Confident but auditable</div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                <ShieldQuestion size={20} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-slate-100">Jerry</div>
                <div className="text-[10.5px] uppercase tracking-[0.1em] text-slate-500">Critical reviewer</div>
              </div>
            </div>
            <ProviderBadge provider={jerryProvider} />
          </div>
          <p className="mt-3 text-[11.5px] leading-5 text-slate-400">
            Independently reviews Tom's diagnosis, challenges blast radius and validation gaps, and
            adjusts confidence. Jerry can approve, revise or add missing preventive actions.
          </p>
          <div className="mt-3 space-y-1.5 text-[10.5px] text-slate-500">
            <div className="flex items-center gap-1.5"><ArrowRight size={11} className="text-violet-300" /> Independent challenge</div>
            <div className="flex items-center gap-1.5"><ArrowRight size={11} className="text-violet-300" /> Rollback and validation checks</div>
            <div className="flex items-center gap-1.5"><ArrowRight size={11} className="text-violet-300" /> Preventive follow-through</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="p-5">
          <SectionHeader title="Recent agent activity" subtitle="Provider labels distinguish verified Band calls from local fallback runs." />
          <div className="space-y-3">
            {status.recent_runs.map((run) => (
              <div key={run.id} className="rounded-xl border border-slate-800/80 bg-slate-900/25 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`grid h-7 w-7 place-items-center rounded-lg ${run.agent_name === "Tom" ? "bg-cyan-400/10 text-cyan-300" : "bg-violet-400/10 text-violet-300"}`}>
                      <Bot size={13} />
                    </div>
                    <div>
                      <div className="text-[11.5px] font-semibold text-slate-200">{run.agent_name}</div>
                      <div className="text-[9.5px] capitalize text-slate-500">{run.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProviderBadge provider={run.provider} />
                    <Badge tone={run.status === "completed" ? "green" : "amber"}>{run.status}</Badge>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[10.5px] leading-4 text-slate-500">{run.input_summary}</p>
                <div className="mt-2 flex items-center gap-3 text-[9.5px] text-slate-600">
                  <span className="inline-flex items-center gap-1"><Clock size={10} /> {run.latency_ms ?? "—"} ms</span>
                  <span className="inline-flex items-center gap-1"><MessageSquare size={10} /> {formatDateTime(run.created_at)}</span>
                </div>
              </div>
            ))}
            {!status.recent_runs.length ? (
              <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-[11.5px] text-slate-500">
                No agent runs yet. Run an investigation to populate the collaboration feed.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="How Band slots in" subtitle="The workflow is wired for existing agents and stays honest when credentials are absent." />
          <div className="space-y-3">
            {[
              {
                title: "Existing registrations",
                body: "Tom and Jerry are verified through the Band REST identity endpoint. RecallOps never creates agents.",
              },
              {
                title: "Investigation handoff",
                body: "Tom receives the incident plus recalled memories. Jerry receives Tom's proposal and the memory count for independent review.",
              },
              {
                title: "Failure honesty",
                body: "If Band is not configured, runs are stored with a local-fallback provider label. They are never presented as Band output.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-800/70 background p-3.5">
                <div className="text-[11.5px] font-semibold text-slate-200">{item.title}</div>
                <p className="mt-1 text-[10.5px] leading-4 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-600">Configuration keys</div>
            <pre className="mt-1.5 overflow-x-auto text-[10px] leading-5 text-slate-400">
{`BAND_TOM_API_KEY
BAND_JERRY_API_KEY
BAND_TOM_AGENT_ID
BAND_JERRY_AGENT_ID`}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
