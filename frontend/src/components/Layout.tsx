import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  BrainCircuit,
  LayoutDashboard,
  PlusCircle,
  Settings,
  ShieldCheck,
  Siren,
  TrendingUp,
  Users,
} from "lucide-react";
import { api, type Health } from "../api";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/investigate", label: "New Investigation", icon: PlusCircle },
  { to: "/memory", label: "Memory Intelligence", icon: BrainCircuit },
  { to: "/patterns", label: "Patterns & Insights", icon: TrendingUp },
  { to: "/agents", label: "Agent Collaboration", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/incidents/")) return "Incident room";
  if (pathname.startsWith("/incidents")) return "Incidents";
  if (pathname.startsWith("/investigate")) return "New investigation";
  if (pathname.startsWith("/memory")) return "Memory intelligence";
  if (pathname.startsWith("/patterns")) return "Patterns & insights";
  if (pathname.startsWith("/agents")) return "Agent collaboration";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Overview";
}

export default function Layout() {
  const location = useLocation();
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .health()
        .then((data) => {
          if (active) {
            setHealth(data);
            setHealthError(false);
          }
        })
        .catch(() => active && setHealthError(true));
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const memoryOk = health?.hindsight.reachable;
  const bandOk = health?.band.configured && health.band.tom_verified && health.band.jerry_verified;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[262px] flex-col border-r border-slate-800/70 bg-[#080d15]/90 px-4 py-5 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 text-cyan-300 glow-ring">
            <Activity size={20} strokeWidth={2.1} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-slate-100">RecallOps AI</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Memory-native SRE
            </div>
          </div>
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-1">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Workspace
          </div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <item.icon size={16} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 space-y-2.5">
          <div className="panel-soft px-3.5 py-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Memory engine</span>
              <span className={memoryOk ? "text-emerald-300" : "text-red-300"}>
                {memoryOk ? "live" : "down"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11.5px] text-slate-300">
              <span className={`pulse-dot ${memoryOk ? "text-emerald-400" : "text-red-400"}`} />
              Hindsight {memoryOk ? "reachable" : "unavailable"}
            </div>
            <div className="mt-1 truncate text-[10.5px] text-slate-600">{health?.hindsight.bank_id || "recallops-incidents"}</div>
          </div>
          <div className="panel-soft px-3.5 py-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Band agents</span>
              <span className={bandOk ? "text-violet-300" : "text-amber-300"}>{bandOk ? "live" : "fallback"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11.5px] text-slate-300">
              <span className={`pulse-dot ${bandOk ? "text-violet-400" : "text-amber-400"}`} />
              {bandOk ? "Tom + Jerry verified" : "Tom + Jerry local"}
            </div>
            <div className="mt-1 text-[10.5px] text-slate-600">No duplicate agents created</div>
          </div>
          <div className="px-1 text-[10px] leading-4 text-slate-600">
            Synthetic demo data is clearly labelled. Live integration status is shown in Settings.
          </div>
        </div>
      </aside>

      <div className="lg:pl-[262px]">
        <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#070b12]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 lg:hidden">
                <Activity size={16} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-slate-100">{pageTitle(location.pathname)}</div>
                <div className="hidden text-[10.5px] text-slate-500 sm:block">
                  Incident response with verified historical memory
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                <ShieldCheck size={11} /> Synthetic data
              </span>
              <span
                className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider sm:flex ${
                  memoryOk
                    ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-300"
                    : "border-red-400/25 bg-red-400/8 text-red-300"
                }`}
              >
                <span className={`pulse-dot ${memoryOk ? "text-emerald-400" : "text-red-400"}`} />
                Hindsight {memoryOk ? "online" : "offline"}
              </span>
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  healthError
                    ? "border-red-400/25 bg-red-400/8 text-red-300"
                    : "border-cyan-400/20 bg-cyan-400/8 text-cyan-300"
                }`}
              >
                API {healthError ? "unreachable" : "connected"}
              </span>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                    isActive ? "bg-cyan-400/10 text-cyan-200" : "text-slate-500"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
