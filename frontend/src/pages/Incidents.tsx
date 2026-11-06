import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Database, Search, Siren, SlidersHorizontal } from "lucide-react";
import { api, type Incident } from "../api";
import {
  Badge,
  Card,
  ErrorBanner,
  Loading,
  SectionHeader,
  severityTone,
  statusTone,
  timeAgo,
} from "../components/ui";

const FILTERS = ["all", "open", "investigating", "resolved"] as const;

export default function Incidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api
      .incidents()
      .then(setIncidents)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((incident) => {
      const matchesStatus = filter === "all" || incident.status === filter;
      const haystack = `${incident.incident_code} ${incident.title} ${incident.service} ${incident.description}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [incidents, filter, query]);

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!incidents) return <Loading label="Loading incidents" />;

  const counts = {
    all: incidents.length,
    open: incidents.filter((i) => i.status === "open").length,
    investigating: incidents.filter((i) => i.status === "investigating").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader
          title="Incident queue"
          subtitle="Every record is synthetic demo data unless explicitly marked otherwise."
          right={
            <button className="btn btn-primary !py-2 !text-[11.5px]" onClick={() => navigate("/investigate")}>
              <Siren size={13} /> New incident
            </button>
          }
        />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                  filter === item
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {item} <span className="ml-1 text-slate-500">{counts[item]}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input !pl-9"
              placeholder="Search incident, service, symptom…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-3">
          <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
            <SlidersHorizontal size={13} /> {filtered.length} matching incidents
          </div>
          <div className="text-[10.5px] uppercase tracking-wider text-slate-600">Click a row to investigate</div>
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
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr key={incident.id} className="cursor-pointer" onClick={() => navigate(`/incidents/${incident.id}`)}>
                  <td>
                    <div className="mono text-[11px] text-cyan-300">{incident.incident_code}</div>
                    <div className="mt-0.5 max-w-[360px] truncate text-[12.5px] font-medium text-slate-200">
                      {incident.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-600">{incident.is_synthetic ? "synthetic" : "real"}</span>
                      {incident.memory_retained ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/80">
                          <Database size={10} /> retained
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="mono text-[11.5px] text-slate-400">{incident.service}</td>
                  <td>
                    <Badge tone={severityTone(incident.severity)}>{incident.severity}</Badge>
                  </td>
                  <td>
                    <Badge tone={statusTone(incident.status)}>{incident.status}</Badge>
                  </td>
                  <td className="text-[11px] text-slate-500">{incident.memory_retained ? "yes" : "no"}</td>
                  <td className="text-[11px] text-slate-500">{timeAgo(incident.started_at)}</td>
                  <td>
                    <ArrowUpRight size={14} className="text-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <div className="px-5 py-10 text-center text-[12px] text-slate-500">No incidents match this filter.</div>
        ) : null}
      </Card>
    </div>
  );
}
