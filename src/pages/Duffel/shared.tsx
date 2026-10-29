import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FlaskConical, Info, Lock, Plane, BedDouble, Car, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { duffelService } from "@/services/duffelService";
import type { DuffelStatus, Money, ProductType } from "@/types/duffel";

export const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function useDuffelStatus() {
  return useQuery<DuffelStatus>({
    queryKey: ["duffel", "status"],
    queryFn: () => duffelService.getStatus(),
    staleTime: 60_000,
  });
}

/** Persistent environment indicator. Rendered at the top of every Duffel page. */
export function SandboxBanner() {
  const { data } = useDuffelStatus();
  if (data && !data.sandbox) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <AlertTriangle className="size-4" /> LIVE MODE — bookings are real
      </div>
    );
  }
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <FlaskConical className="size-4" /> Sandbox — no real reservations
      {data && !data.configured && <span className="font-normal">· {data.config_error}</span>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="space-y-3">
      <SandboxBanner />
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Plane aria-hidden className="pointer-events-none absolute -right-4 -top-6 size-32 rotate-12 text-primary/5" />
      </div>
    </div>
  );
}

const TILE_TONES: Record<ProductType, string> = {
  flight: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  stay: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  car: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

/** Colour-coded product icon tile (flight / hotel / car) used across lists. */
export function ProductTile({ product, size = 36 }: { product: ProductType; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={`flex shrink-0 items-center justify-center rounded-xl ${TILE_TONES[product]}`}>
      <ProductIcon product={product} className="size-[50%]" />
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-xl font-bold leading-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Rounded pill toggle used for quick filters. */
export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 rounded-2xl border bg-card p-4">
          <div className="size-10 rounded-xl bg-muted" />
          <div className="flex-1 space-y-3"><div className="h-5 w-2/3 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /></div>
          <div className="h-12 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function AccessRequired({ product, message }: { product: ProductType; message?: string | null }) {
  const label = product === "stay" ? "Duffel Stays (hotels)" : product === "car" ? "Duffel Cars" : "Duffel Flights";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
      <Lock className="mt-0.5 size-5 shrink-0 text-blue-600" />
      <div className="space-y-1">
        <div className="font-semibold">Duffel access required — {label}</div>
        <p className="text-muted-foreground">
          {message ?? `${label} is not enabled for this Duffel account.`}
        </p>
        <p className="text-muted-foreground">
          Ask the Duffel account owner to request access at{" "}
          <a className="underline" href="https://duffel.com/contact-us" target="_blank" rel="noreferrer">
            duffel.com/contact-us
          </a>
          . Flights and the other products keep working in the meantime.
        </p>
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && (
        <Button size="xs" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
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

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label ?? "Loading..."}
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block space-y-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}>
      <span>{label}</span>
      {children}
      {hint && <span className="block font-normal">{hint}</span>}
    </label>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" /> <div>{children}</div>
    </div>
  );
}

export function ProductIcon({ product, className }: { product: ProductType; className?: string }) {
  const I = product === "flight" ? Plane : product === "stay" ? BedDouble : Car;
  return <I className={className ?? "size-4"} />;
}

// ---- formatting -------------------------------------------------------------
export function formatMoney(m?: Money | null): string {
  if (!m) return "—";
  const n = Number(m.amount);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: m.currency ?? "USD" }).format(n);
  } catch {
    return `${m.amount} ${m.currency ?? ""}`;
  }
}

export function formatDuration(mins?: number | null): string {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Supplier local times arrive without an offset ("2026-12-10T06:58:00"): display them as written, never shift by the browser zone. */
export function formatLocal(dt?: string | null): string {
  if (!dt) return "—";
  const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date(dt).toLocaleString();
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${d.toLocaleDateString(undefined, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })} ${m[4]}:${m[5]}`;
}

export function localTime(dt?: string | null): string {
  const m = dt?.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "—";
}

export function formatDate(dt?: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? dt : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(dt?: string | null): string {
  if (!dt) return "—";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? dt : d.toLocaleString();
}

export function humanize(s?: string | null): string {
  return (s ?? "—").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "confirmed" || value === "paid" || value === "ticketed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : value === "cancelled" || value === "failed"
        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return <Badge className={tone}>{humanize(value)}</Badge>;
}

/** Counts down to an ISO expiry and reports when it passes (offers and quotes expire). */
export function useExpiry(iso?: string | null): { expired: boolean; remaining: string } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return { expired: false, remaining: "" };
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { expired: true, remaining: "expired" };
  const min = Math.ceil(ms / 60000);
  if (min > 24 * 60) return { expired: false, remaining: "" }; // far-future expiry: nothing useful to count down
  return { expired: false, remaining: min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min` };
}

/** Search criteria + session survive navigation (opening details, switching tabs, returning). */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      sessionStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage unavailable: state still works in memory */
    }
  };
  return [value, set];
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Airline mark: supplier-provided logo, with an initials badge when there is no logo or it fails to load. */
export function AirlineLogo({ carrier, size = 36 }: { carrier?: { name: string | null; iata_code: string | null; logo_url?: string | null } | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const label = carrier?.name ?? carrier?.iata_code ?? "Airline";
  const style = { width: size, height: size };
  if (carrier?.logo_url && !failed) {
    return (
      <img
        src={carrier.logo_url}
        alt={label}
        title={label}
        style={style}
        className="shrink-0 rounded-lg border bg-white object-contain p-1"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      title={label}
      style={style}
      className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary"
    >
      {(carrier?.iata_code ?? label.slice(0, 2)).toUpperCase()}
    </span>
  );
}
