import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duffelService } from "@/services/duffelService";
import type { Booking } from "@/types/duffel";
import {
  AirlineLogo,
  CardSkeletons,
  EmptyState,
  ErrorBox,
  PageHeader,
  Pill,
  ProductTile,
  StatusBadge,
  formatDateTime,
  formatMoney,
  humanize,
  useDuffelStatus,
} from "./shared";

const PRODUCTS: [string, string][] = [["", "All"], ["flight", "Flights"], ["stay", "Hotels"], ["car", "Cars"]];
const STATUSES: [string, string][] = [["", "Any status"], ["confirmed", "Confirmed"], ["pending", "Pending"], ["cancelled", "Cancelled"]];

function BookingLead({ b }: { b: Booking }) {
  if (b.product_type === "flight" && b.carriers.length > 0) {
    return (
      <div className="flex shrink-0 -space-x-2">
        {b.carriers.slice(0, 3).map((c) => <AirlineLogo key={c.iata_code ?? c.name} carrier={c} size={40} />)}
      </div>
    );
  }
  return <ProductTile product={b.product_type} size={40} />;
}

export default function BookingsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: status } = useDuffelStatus();
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [product, setProduct] = useState("");
  const [bstatus, setBstatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const legacyId = params.get("id"); // old links: /bookings?id=… -> details page

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["duffel", "bookings", { applied, product, bstatus, from, to, scope, page }],
    queryFn: () =>
      duffelService.listBookings({
        q: applied || undefined,
        product: product || undefined,
        status: bstatus || undefined,
        date_from: from ? `${from}T00:00:00Z` : undefined,
        date_to: to ? `${to}T23:59:59Z` : undefined,
        scope,
        page,
        page_size: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  if (legacyId) return <Navigate to={`/travel/duffel/bookings/${legacyId}`} replace />;

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const reset = () => setPage(1);
  const filtered = !!(applied || product || bstatus || from || to);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="Every flight, hotel and rental car booked through Duffel"
        actions={<Button asChild><Link to="/travel/duffel/search">New booking</Link></Button>}
      />

      <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(q); reset(); }}>
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input className="pl-8" autoComplete="off" placeholder="Search by title or confirmation reference" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-4" />
            <Input className="w-36" type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} aria-label="Starts after" />
            –
            <Input className="w-36" type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} aria-label="Starts before" />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {PRODUCTS.map(([v, l]) => <Pill key={v} active={product === v} onClick={() => { setProduct(v); reset(); }}>{l}</Pill>)}
          <span className="mx-1 h-5 w-px bg-border" />
          {STATUSES.map(([v, l]) => <Pill key={v} active={bstatus === v} onClick={() => { setBstatus(v); reset(); }}>{l}</Pill>)}
          {status?.permissions.admin_read && (
            <>
              <span className="mx-1 h-5 w-px bg-border" />
              <Pill active={scope === "all"} onClick={() => { setScope(scope === "all" ? "mine" : "all"); reset(); }}>All users</Pill>
            </>
          )}
        </div>
      </div>

      {isLoading && <CardSkeletons />}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.items.length === 0 && (
        <EmptyState title={filtered ? "No bookings match your filters" : "No bookings yet"} hint={filtered ? "Clear a filter to see more." : "Book a flight, hotel or car from Search & Book."} />
      )}

      {data && data.items.length > 0 && (
        <div className={`space-y-2 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
          <div className="text-xs text-muted-foreground">{data.total} booking{data.total > 1 ? "s" : ""}</div>
          {data.items.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/travel/duffel/bookings/${b.id}`)}
              className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <BookingLead b={b} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{b.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {b.product_type === "flight" && b.carriers.length > 0 ? `${b.carriers.map((c) => c.name).join(" + ")} · ` : `${humanize(b.product_type)} · `}
                  {formatDateTime(b.starts_at)}{b.ends_at ? ` → ${formatDateTime(b.ends_at)}` : ""}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge value={b.booking_status} />
                  <StatusBadge value={b.payment_status} />
                  {b.environment === "test" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">SANDBOX</span>}
                  {b.supplier_reference && <span className="font-mono text-xs text-muted-foreground">{b.supplier_reference}</span>}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold">{formatMoney(b.total)}</div>
              </div>
              <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
            </button>
          ))}
        </div>
      )}

      {data && data.total > pageSize && (
        <div className="flex items-center justify-between text-xs">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
