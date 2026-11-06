import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { IncidentStatus, Severity } from "../api";

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "violet" | "slate";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function severityTone(severity: Severity): "red" | "amber" | "violet" | "slate" {
  if (severity === "SEV-1") return "red";
  if (severity === "SEV-2") return "amber";
  if (severity === "SEV-3") return "violet";
  return "slate";
}

export function statusTone(status: IncidentStatus): "red" | "amber" | "green" | "slate" {
  if (status === "open") return "red";
  if (status === "investigating") return "amber";
  if (status === "resolved") return "green";
  return "slate";
}

export function memoryTone(status: string): "green" | "amber" | "red" | "slate" | "cyan" {
  if (status === "used") return "green";
  if (status === "empty") return "amber";
  if (status === "failed" || status === "unavailable") return "red";
  if (status === "disabled") return "slate";
  return "cyan";
}

export function providerLabel(provider: string): string {
  if (provider === "band") return "Band";
  if (provider.startsWith("groq")) return "Groq";
  if (provider === "local-deterministic") return "Local deterministic";
  if (provider.startsWith("local")) return "Local fallback";
  return provider;
}

export function ProviderBadge({ provider }: { provider: string }) {
  const tone = provider === "band" ? "violet" : provider.startsWith("groq") ? "cyan" : "amber";
  return <Badge tone={tone}>{providerLabel(provider)}</Badge>;
}

export function Card({
  children,
  className = "",
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return <div className={`${elevated ? "panel-soft" : "panel"} ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "cyan" | "blue" | "green" | "amber" | "violet" | "red";
}) {
  const toneClasses: Record<string, string> = {
    cyan: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
    blue: "text-blue-300 bg-blue-400/10 border-blue-400/20",
    green: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    violet: "text-violet-300 bg-violet-400/10 border-violet-400/20",
    red: "text-red-300 bg-red-400/10 border-red-400/20",
  };
  return (
    <Card className="panel-hover p-5 fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
          <div className="stat-value mt-2 text-slate-100">{value}</div>
          {hint ? <div className="mt-2 text-[11.5px] text-slate-500">{hint}</div> : null}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl border ${toneClasses[tone]}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
    </Card>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] text-slate-500">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function ConfidenceBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color = pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-cyan-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className={compact ? "" : "w-full"}>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Confidence</span>
        <span className="mono font-semibold text-slate-200">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-slate-500">
      <Loader2 size={14} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-400/25 bg-red-400/8 px-4 py-3 text-[12px] text-red-200">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry ? (
        <button className="btn btn-ghost !px-2.5 !py-1.5 !text-[11px]" onClick={onRetry}>
          <RefreshCw size={12} />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
      {Icon ? (
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-500">
          <Icon size={19} />
        </div>
      ) : null}
      <div className="text-[13.5px] font-semibold text-slate-200">{title}</div>
      <p className="mt-1 max-w-md text-[12px] leading-5 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function KeyValue({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-800/60 py-2.5 last:border-0">
      <span className="text-[11.5px] text-slate-500">{label}</span>
      <span className={`text-right text-[12px] text-slate-200 ${mono ? "mono" : ""}`}>{value}</span>
    </div>
  );
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}
