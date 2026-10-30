import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sabreService } from "@/services/sabreService";
import type { SabreStatus } from "@/types/sabre";

export const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function useSabreStatus() {
  return useQuery<SabreStatus>({
    queryKey: ["sabre", "status"],
    queryFn: () => sabreService.getStatus(),
    staleTime: 60_000,
  });
}

/** Persistent sandbox indicator, shown at the top of every Sabre page. */
export function SandboxBadge() {
  const { data } = useSabreStatus();
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <FlaskConical className="size-4" /> {data?.banner ?? "Sabre sandbox — sample data, nothing is booked"}
      {data && !data.configured && <span className="font-normal">· {data.config_error}</span>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="space-y-3">
      <SandboxBadge />
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && <Button size="xs" variant="outline" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <div className="font-medium text-foreground">{title}</div>
      {hint && <div className="mt-1">{hint}</div>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

/** Amount with its explicit currency code, e.g. "USD 680.14". */
export function formatMoney(amount: string | number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

export function formatDuration(mins?: number | null): string {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Sabre gives local airport time with its UTC offset (2026-12-14T09:15:00-05:00). The wall-clock time is shown
 * exactly as the airport sees it; nothing is converted to the browser's time zone.
 */
export function localParts(iso?: string | null): { date: string; time: string; offset: string } | null {
  const m = (iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?([+-]\d{2}:\d{2}|Z)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, off] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return { date, time: `${hh}:${mm}`, offset: off && off !== "Z" ? `UTC${off.replace(":00", "").replace(/^([+-])0/, "$1")}` : "UTC" };
}

export function humanize(s?: string | null): string {
  return (s ?? "—").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
