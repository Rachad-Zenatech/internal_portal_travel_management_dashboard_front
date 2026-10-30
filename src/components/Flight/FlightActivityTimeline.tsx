import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowLeftRight,
  Eye,
  Bookmark,
  Bot,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Plane,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import type { FlightActivityEvent } from "@/types/flight";

const EVENT_STYLE: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  TAB_OPENED: { icon: MousePointerClick, tone: "bg-muted text-muted-foreground", label: "Opened" },
  SEARCH_SUBMITTED: { icon: Search, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400", label: "Search" },
  SEARCH_COMPLETED: { icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", label: "Results" },
  SEARCH_FAILED: { icon: AlertTriangle, tone: "bg-destructive/10 text-destructive", label: "Search failed" },
  CRITERIA_CHANGED: { icon: SlidersHorizontal, tone: "bg-muted text-muted-foreground", label: "Changed" },
  FILTER_CHANGED: { icon: SlidersHorizontal, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400", label: "Filter" },
  SORT_CHANGED: { icon: ArrowUpDown, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400", label: "Sort" },
  ROUTE_SWAPPED: { icon: ArrowLeftRight, tone: "bg-muted text-muted-foreground", label: "Route" },
  FLIGHT_DETAILS_VIEWED: { icon: Eye, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400", label: "Viewed" },
  FLIGHT_SAVED: { icon: Bookmark, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400", label: "Saved" },
  FLIGHT_ANALYZED_WITH_AI: { icon: Bot, tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400", label: "AI" },
  BOOKING_STARTED: { icon: Plane, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400", label: "Booking" },
  BOOKING_SESSION_CREATED: { icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", label: "Session" },
  BOOKING_LINK_OPENED: { icon: ExternalLink, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400", label: "Airline site" },
  BOOKING_FAILED: { icon: AlertTriangle, tone: "bg-destructive/10 text-destructive", label: "Booking failed" },
  SESSION_OPENED: { icon: Eye, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400", label: "Tracker" },
};

const FALLBACK = { icon: MousePointerClick, tone: "bg-muted text-muted-foreground", label: "Action" };

const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

interface Props {
  /** Current visit, newest first. */
  events: FlightActivityEvent[];
  /** Earlier visits, newest first. */
  history?: FlightActivityEvent[];
}

function Row({ ev, last }: { ev: FlightActivityEvent; last: boolean }) {
  const style = EVENT_STYLE[ev.event_type] ?? FALLBACK;
  const Icon = style.icon;
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden className="absolute left-3.5 top-7 bottom-0 w-px bg-border" />}
      <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{style.label}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{timeFmt(ev.occurred_at)}</span>
        </div>
        <div className="break-words text-xs text-foreground">{ev.summary}</div>
      </div>
    </li>
  );
}

export function FlightActivityTimeline({ events, history = [] }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">This visit</div>
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Every step you take here — searches, filters, flights you open, save or book — appears in this timeline.
          </div>
        ) : (
          <ol>{events.map((ev, i) => <Row key={ev.id} ev={ev} last={i === events.length - 1} />)}</ol>
        )}
      </div>

      {history.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Earlier activity</div>
          <ol>
            {history.map((ev, i) => (
              <div key={ev.id}>
                {(i === 0 || dateFmt(history[i - 1].occurred_at) !== dateFmt(ev.occurred_at)) && (
                  <div className="mb-1.5 pl-10 text-[10px] font-semibold text-muted-foreground">{dateFmt(ev.occurred_at)}</div>
                )}
                <Row ev={ev} last={i === history.length - 1} />
              </div>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
