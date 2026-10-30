import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { liteapiService } from "@/services/liteapiService";
import { EmptyState, ErrorBox, PageHeader, StatusBadge, formatDateTime, formatMoney, useLiteApiStatus } from "./shared";

export default function BookingsPage() {
  const navigate = useNavigate();
  const { data: status } = useLiteApiStatus();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["liteapi", "bookings", { scope, page }],
    queryFn: () => liteapiService.listBookings(scope, page, pageSize),
    placeholderData: (prev) => prev,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="Every hotel booked through LiteAPI"
        actions={
          <div className="flex gap-2">
            {status?.permissions.admin_read && (
              <Button variant={scope === "all" ? "default" : "outline"} onClick={() => { setScope(scope === "all" ? "mine" : "all"); setPage(1); }}>
                All users
              </Button>
            )}
            <Button asChild><Link to="/travel/liteapi/search">New booking</Link></Button>
          </div>
        }
      />

      {isLoading && <div className="text-sm text-muted-foreground">Loading bookings…</div>}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.items.length === 0 && <EmptyState title="No bookings yet" hint="Book a hotel from Search & Book." />}

      {data && data.items.length > 0 && (
        <div className={`space-y-2 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
          {data.items.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/travel/liteapi/bookings/${b.id}`)}
              className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{b.title}</div>
                <div className="truncate text-xs text-muted-foreground">{formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge value={b.booking_status} />
                  <StatusBadge value={b.payment_status} />
                  {b.environment !== "live" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">SANDBOX</span>}
                  {b.supplier_reference && <span className="font-mono text-xs text-muted-foreground">{b.supplier_reference}</span>}
                </div>
              </div>
              <div className="shrink-0 text-lg font-bold">{formatMoney(b.total_amount, b.currency)}</div>
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
