import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duffelService } from "@/services/duffelService";
import type { Trip } from "@/types/duffel";
import {
  AirlineLogo,
  CardSkeletons,
  EmptyState,
  ErrorBox,
  PageHeader,
  ProductTile,
  Stat,
  StatusBadge,
  formatDate,
  formatMoney,
  useDuffelStatus,
} from "./shared";

export default function MyTripsPage() {
  const { data: status } = useDuffelStatus();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["duffel", "trips", scope],
    queryFn: () => duffelService.listTrips(scope),
    placeholderData: keepPreviousData, // keep the current list on screen while the other scope loads
  });

  const nextTrip = data?.upcoming.find((t) => t.starts_at);
  const activeBookings = data ? data.upcoming.flatMap((t) => t.bookings).filter((b) => b.booking_status !== "cancelled").length : 0;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="My Trips"
        subtitle="Flights, hotels and cars grouped by trip"
        actions={
          <div className="flex gap-2">
            {status?.permissions.admin_read && (
              <div className="inline-flex rounded-full border bg-background p-0.5" role="group" aria-label="Whose trips">
                {([["mine", "My trips"], ["all", "All users"]] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={scope === v}
                    onClick={() => setScope(v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${scope === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            <Button asChild><Link to="/travel/duffel/search">Plan a new trip</Link></Button>
          </div>
        }
      />
      {isLoading && !data && <CardSkeletons count={2} />}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && (
        <div className={`space-y-6 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={scope === "all" ? "Upcoming trips (all users)" : "Upcoming trips"} value={data.upcoming.length} />
            <Stat label="Active reservations" value={activeBookings} />
            <Stat label="Next departure" value={nextTrip ? formatDate(nextTrip.starts_at) : "—"} hint={nextTrip?.name} />
          </div>
          <Section title="Upcoming" trips={data.upcoming} empty="No upcoming trips" hint="Book a flight, hotel or car to start a trip." showOwner={scope === "all"} />
          <Section title="Previous" trips={data.previous} empty="No previous trips" showOwner={scope === "all"} />
        </div>
      )}
    </div>
  );
}

function Section({ title, trips, empty, hint, showOwner }: { title: string; trips: Trip[]; empty: string; hint?: string; showOwner?: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title} · {trips.length}</h2>
      {trips.length === 0 && <EmptyState title={empty} hint={hint} />}
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {trips.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{t.name}</h3>
                {showOwner && (
                  <div className="truncate text-xs text-muted-foreground">
                    {t.is_mine ? "Your trip" : `Traveler: ${t.owner_name ?? t.owner_email ?? "Unknown user"}`}
                  </div>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {formatDate(t.starts_at)}{t.ends_at ? ` – ${formatDate(t.ends_at)}` : ""}
              </span>
            </div>
            <ul className="divide-y">
              {t.bookings.length === 0 && <li className="p-4 text-xs text-muted-foreground">No reservations yet</li>}
              {t.bookings.map((b) => (
                <li key={b.id}>
                  <Link to={`/travel/duffel/bookings/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                    {b.product_type === "flight" && b.carrier ? <AirlineLogo carrier={b.carrier} size={36} /> : <ProductTile product={b.product_type} size={36} />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {b.product_type === "flight" && b.carrier?.name ? `${b.carrier.name} · ` : ""}{formatDate(b.starts_at)}{b.supplier_reference ? ` · ${b.supplier_reference}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">{formatMoney(b.total)}</div>
                      <StatusBadge value={b.booking_status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
