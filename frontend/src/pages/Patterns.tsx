import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrainCircuit, GitBranch, Lightbulb, Repeat2, TrendingUp } from "lucide-react";
import { api, type MemoryComparison, type Patterns as PatternsData } from "../api";
import {
  Badge,
  Card,
  ErrorBanner,
  Loading,
  SectionHeader,
  StatCard,
} from "../components/ui";

export default function Patterns() {
  const [patterns, setPatterns] = useState<PatternsData | null>(null);
  const [comparison, setComparison] = useState<MemoryComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([api.patterns(), api.comparison()])
      .then(([patternData, comparisonData]) => {
        setPatterns(patternData);
        setComparison(comparisonData);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!patterns) return <Loading label="Analyzing recurring failures" />;

  const serviceData = patterns.recurring_services.map((item) => ({
    name: item.service,
    incidents: item.incident_count,
  }));

  const comparisonData = comparison
    ? [
        { name: "Memory OFF", confidence: Math.round(comparison.memory_off.avg_confidence * 100) },
        { name: "Memory ON", confidence: Math.round(comparison.memory_on.avg_confidence * 100) },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recurring services" value={patterns.totals.recurring_services} hint="At least two incidents" icon={Repeat2} tone="amber" />
        <StatCard label="Services observed" value={patterns.totals.services} hint="Across all incidents" icon={GitBranch} tone="cyan" />
        <StatCard label="Verified retains" value={patterns.memory.successful_retains} hint="Hindsight write-backs" icon={BrainCircuit} tone="violet" />
        <StatCard label="Historical recalls" value={patterns.memory.successful_recalls} hint="Successful retrievals" icon={TrendingUp} tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <Card className="p-5">
          <SectionHeader title="Failure concentration by service" subtitle="Services with more than one incident in the demo dataset." />
          <div className="h-[240px] w-full">
            {serviceData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid stroke="#1c2a3a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8ca0b8", fontSize: 10 }} axisLine={{ stroke: "#1c2a3a" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(34,211,238,0.05)" }}
                    contentStyle={{
                      background: "#0d1420",
                      border: "1px solid #26384c",
                      borderRadius: 10,
                      fontSize: 11,
                      color: "#e6edf6",
                    }}
                  />
                  <Bar dataKey="incidents" radius={[6, 6, 0, 0]} maxBarSize={52} isAnimationActive={false}>
                    {serviceData.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "#22d3ee" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-[12px] text-slate-500">No recurring services yet.</div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Measured memory impact" subtitle="Average investigation confidence, grouped by memory mode." />
          <div className="h-[180px] w-full">
            {comparisonData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid stroke="#1c2a3a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8ca0b8", fontSize: 10 }} axisLine={{ stroke: "#1c2a3a" }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d1420", border: "1px solid #26384c", borderRadius: 10, fontSize: 11, color: "#e6edf6" }}
                  />
                  <Bar dataKey="confidence" radius={[6, 6, 0, 0]} maxBarSize={70} isAnimationActive={false}>
                    <Cell fill="#64748b" />
                    <Cell fill="#22d3ee" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-[12px] text-slate-500">Run a comparison to populate this chart.</div>
            )}
          </div>
          {comparison ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-800/70 p-2.5 text-center">
                <div className="mono text-base font-semibold text-slate-300">{comparison.memory_off.runs}</div>
                <div className="text-[9.5px] uppercase tracking-wider text-slate-600">memory-off runs</div>
              </div>
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2.5 text-center">
                <div className="mono text-base font-semibold text-cyan-300">{comparison.memory_on.runs}</div>
                <div className="text-[9.5px] uppercase tracking-wider text-slate-500">memory-on runs</div>
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-[10.5px] leading-4 text-slate-600">
            Counts memory-ON runs where Hindsight recall succeeded. A failed recall run is recorded
            separately and excluded from this average. No benchmark numbers are fabricated.
          </p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <Card className="p-5">
          <SectionHeader title="Recurring failure patterns" subtitle="Candidates for a preventive fix, not just another runbook." />
          <div className="space-y-3">
            {patterns.recurring_services.map((item) => (
              <div key={item.service} className="rounded-xl border border-slate-800/80 bg-slate-900/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="mono text-[12px] font-semibold text-slate-200">{item.service}</span>
                    <Badge tone="amber">{item.incident_count} incidents</Badge>
                    {item.open_count ? <Badge tone="red">{item.open_count} open</Badge> : null}
                  </div>
                  <div className="flex gap-1.5">
                    {item.incident_codes.map((code) => (
                      <span key={code} className="mono rounded border border-slate-800 px-1.5 py-0.5 text-[9.5px] text-slate-500">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-[11.5px] text-slate-400">{item.latest_incident}</div>
                {item.root_causes.length ? (
                  <div className="mt-2 space-y-1">
                    {item.root_causes.map((cause) => (
                      <div key={cause} className="text-[10.5px] leading-4 text-slate-500">
                        <span className="text-amber-300/80">root cause · </span>
                        {cause}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-amber-400/5 px-2.5 py-2 text-[10.5px] leading-4 text-amber-200/80">
                  <Lightbulb size={12} className="mt-0.5 shrink-0" />
                  {item.recommendation}
                </div>
              </div>
            ))}
            {!patterns.recurring_services.length ? (
              <div className="text-[12px] text-slate-500">No recurring pattern detected in the current dataset.</div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Top root causes" subtitle="Extracted from resolved incident records." />
          <div className="space-y-2">
            {patterns.top_root_causes.map((item, index) => (
              <div key={item.root_cause} className="flex items-start gap-3 rounded-xl border border-slate-800/70 px-3 py-2.5">
                <span className="mono mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-800 text-[10px] font-bold text-cyan-300">
                  {index + 1}
                </span>
                <div className="text-[11px] leading-5 text-slate-400">{item.root_cause}</div>
              </div>
            ))}
            {!patterns.top_root_causes.length ? (
              <div className="text-[12px] text-slate-500">Resolve incidents to populate root causes.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
