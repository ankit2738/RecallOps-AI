import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrainCircuit, Loader2, PlusCircle, Sparkles, Wand2 } from "lucide-react";
import { api } from "../api";
import { Badge, Card, ErrorBanner, SectionHeader } from "../components/ui";

const DEMO = {
  title: "Payment API latency spike during peak traffic",
  service: "payments-api",
  severity: "SEV-1",
  description:
    "p99 latency for POST /v1/payments is 3.8 s and the 5xx rate is 9%. Pods report database connection acquisition timeouts and active connections are pinned at the configured maximum during peak traffic. No deployment occurred in the last 24 hours.",
  symptoms: "p99 latency 3.8s, 5xx rate 9%, connection acquisition timeout, active DB connections at maximum",
};

export default function NewInvestigation() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...DEMO, memory: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setStage("Creating incident record…");
      const incident = await api.createIncident({
        title: form.title,
        service: form.service,
        severity: form.severity,
        description: form.description,
        symptoms: form.symptoms.split(",").map((symptom) => symptom.trim()).filter(Boolean),
      });
      setStage(form.memory ? "Recalling Hindsight memories and running Tom + Jerry…" : "Running Tom + Jerry without memory…");
      await api.investigate(incident.id, form.memory);
      navigate(`/incidents/${incident.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
      setStage("");
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
      <Card className="p-6">
        <SectionHeader
          title="Investigate a new incident"
          subtitle="Create the record, recall verified history, then let Tom diagnose and Jerry review."
          right={<Badge tone="cyan"><Sparkles size={11} /> Hindsight-assisted</Badge>}
        />
        {error ? <div className="mb-4"><ErrorBanner message={error} /></div> : null}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Incident title</label>
            <input
              className="input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Service</label>
              <input
                className="input"
                value={form.service}
                onChange={(event) => setForm({ ...form, service: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Severity</label>
              <select
                className="select"
                value={form.severity}
                onChange={(event) => setForm({ ...form, severity: event.target.value })}
              >
                <option value="SEV-1">SEV-1 · Critical</option>
                <option value="SEV-2">SEV-2 · Major</option>
                <option value="SEV-3">SEV-3 · Minor</option>
                <option value="SEV-4">SEV-4 · Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Symptoms (comma separated)</label>
            <input
              className="input"
              value={form.symptoms}
              onChange={(event) => setForm({ ...form, symptoms: event.target.value })}
            />
          </div>
          <div>
            <label className="label">Telemetry description</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3.5">
            <input
              type="checkbox"
              checked={form.memory}
              onChange={(event) => setForm({ ...form, memory: event.target.checked })}
              className="mt-0.5 accent-cyan-400"
            />
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-200">
                <BrainCircuit size={13} className="text-cyan-300" /> Use Hindsight memory
              </div>
              <div className="mt-0.5 text-[10.5px] leading-4 text-slate-500">
                When enabled, historical incidents and verified runbooks are recalled before Tom reasons.
                Disable it to see the memory-off baseline.
              </div>
            </div>
          </label>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
            {loading ? stage || "Investigating…" : "Create & investigate"}
          </button>
        </form>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <SectionHeader title="Demo scenario" subtitle="A realistic synthetic incident for a live run." />
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
            <div className="flex items-center justify-between">
              <span className="mono text-[10.5px] text-cyan-300">INC-007 · payments-api</span>
              <Badge tone="red">SEV-1</Badge>
            </div>
            <div className="mt-2 text-[12.5px] font-semibold text-slate-200">{DEMO.title}</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{DEMO.description}</p>
          </div>
          <button
            className="btn btn-ghost mt-3 w-full"
            onClick={() => setForm({ ...DEMO, memory: true })}
            type="button"
          >
            <Wand2 size={13} /> Load demo incident
          </button>
        </Card>

        <Card className="p-5">
          <SectionHeader title="What happens next" />
          <ol className="space-y-3">
            {[
              "The incident is persisted with a unique INC code.",
              "Hindsight recall queries prior incidents and runbooks.",
              "Tom proposes a root cause, confidence and actions.",
              "Jerry reviews independently and can revise the plan.",
              "The result is stored; resolving retains the fix in memory.",
            ].map((step, index) => (
              <li key={step} className="flex gap-2.5 text-[11.5px] leading-5 text-slate-400">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-800 text-[10px] font-bold text-cyan-300">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
