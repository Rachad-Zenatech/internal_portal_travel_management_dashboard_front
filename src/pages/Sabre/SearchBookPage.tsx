import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { BedDouble, Car, Lock, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sabreService } from "@/services/sabreService";
import type { SabreFlightSearch, SabreOffer, SabreSearchResponse } from "@/types/sabre";
import {
  EMPTY_FILTERS,
  applyFilters,
  buildFacets,
  sortOffers,
  type OfferFilters,
  type SortKey,
} from "@/utils/sabreFilters";
import BookingDialog from "./BookingDialog";
import FilterBar from "./FilterBar";
import OfferCard from "./OfferCard";
import SearchForm, { DEFAULT_SEARCH, type SearchFormValues } from "./SearchForm";
import { EmptyState, ErrorBox, PageHeader, formatDuration, formatMoney, useSabreStatus } from "./shared";

const TABS = [
  { value: "flights", label: "Flights", icon: Plane, capability: "flight_search" },
  { value: "hotels", label: "Hotels", icon: BedDouble, capability: "hotel_search" },
  { value: "cars", label: "Rental cars", icon: Car, capability: "vehicle_search" },
];

function Unavailable({ label, reason }: { label: string; reason: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed bg-card p-6">
      <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="space-y-1 text-sm">
        <div className="font-semibold">{label} isn't available in the Sabre sandbox here</div>
        <div className="text-muted-foreground">{reason ?? "Free access could not be established."}</div>
        <div className="text-xs text-muted-foreground">Nothing is shown rather than invented results.</div>
      </div>
    </div>
  );
}

function useExpired(iso?: string) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!iso) return setExpired(false);
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return setExpired(true);
    setExpired(false);
    const t = setTimeout(() => setExpired(true), ms);
    return () => clearTimeout(t);
  }, [iso]);
  return expired;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading flights">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border bg-muted/40" />
      ))}
    </div>
  );
}

function FlightsTab() {
  const [form, setForm] = useState<SearchFormValues>(DEFAULT_SEARCH);
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("price");
  const [bookFor, setBookFor] = useState<SabreOffer | null>(null);

  const search = useMutation<SabreSearchResponse, Error, SabreFlightSearch>({
    mutationFn: (c) => sabreService.searchFlights(c),
    onSuccess: () => { setFilters(EMPTY_FILTERS); setSort("price"); },
  });
  const result = search.data;
  const expired = useExpired(result?.expires_at);

  const run = () =>
    search.mutate({
      trip_type: form.trip_type,
      origin: form.origin,
      destination: form.destination,
      departure_date: form.departure_date,
      return_date: form.trip_type === "round_trip" ? form.return_date : undefined,
      adults: form.adults,
      children: form.children,
      infants: form.infants,
      cabin: form.cabin,
      airlines: [],
    });

  const offers = useMemo(() => result?.offers ?? [], [result]);
  const facets = useMemo(() => buildFacets(offers), [offers]);
  const currency = result?.currencies[0] ?? "";
  const priceEnabled = (result?.currencies.length ?? 0) === 1;
  const filtered = useMemo(() => applyFilters(offers, filters), [offers, filters]);
  const sorted = useMemo(() => sortOffers(filtered, sort), [filtered, sort]);
  const cheapest = useMemo(() => sortOffers(filtered, "price")[0], [filtered]);
  const fastest = useMemo(() => sortOffers(filtered, "duration")[0], [filtered]);

  const openBooking = (offer: SabreOffer) => setBookFor(offer);

  const sortTabs: { key: SortKey; label: string; hint: string }[] = [
    { key: "price", label: "Cheapest", hint: cheapest ? formatMoney(cheapest.total_amount, cheapest.currency) : "—" },
    { key: "duration", label: "Fastest", hint: fastest ? formatDuration(fastest.total_duration_minutes) : "—" },
    { key: "departure", label: "Earliest", hint: "departure" },
    { key: "arrival", label: "Earliest", hint: "arrival" },
  ];

  return (
    <div className="space-y-5">
      <SearchForm values={form} onChange={setForm} onSubmit={run} loading={search.isPending} />

      {search.error && <ErrorBox message={search.error.message} onRetry={run} />}
      {search.isPending && <ResultsSkeleton />}

      {!search.isPending && !result && !search.error && (
        <EmptyState title="Where to next?" hint="Pick your route and dates above to see sandbox fares. Filters appear once results load." />
      )}

      {result && !search.isPending && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-base font-semibold">
                {sorted.length} flight{sorted.length === 1 ? "" : "s"}
                {filtered.length !== offers.length && <span className="font-normal text-muted-foreground"> of {offers.length}</span>}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {result.currencies.join(", ") || "—"} · sandbox sample data · searched {new Date(result.searched_at).toLocaleTimeString()} · prices are not re-validated
              </div>
            </div>
          </div>

          <FilterBar facets={facets} filters={filters} currency={currency} priceEnabled={priceEnabled} onChange={setFilters} />

          <div role="tablist" aria-label="Sort flights" className="grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/40 p-1 sm:grid-cols-4">
            {sortTabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={sort === t.key}
                onClick={() => setSort(t.key)}
                className={`rounded-lg px-3 py-2 text-left transition-all ${sort === t.key ? "bg-card shadow-sm" : "hover:bg-card/60"}`}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-[11px] text-muted-foreground">{t.hint}</div>
              </button>
            ))}
          </div>

          {expired && <ErrorBox message="These results have expired. Search again to see current offers." onRetry={run} />}

          {sorted.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed p-8 text-center text-sm">
              <div className="font-medium">
                {offers.length === 0 ? "No flights found for this route and date" : "No flights match your filters"}
              </div>
              <div className="text-muted-foreground">
                {offers.length === 0 ? "Try different dates or nearby airports." : "Relax a filter to see more options."}
              </div>
              {offers.length > 0 && <Button size="sm" variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>}
            </div>
          ) : (
            sorted.map((o) => {
              const tags = [o === cheapest ? "Cheapest" : "", o === fastest ? "Fastest" : "", o.max_stops === 0 ? "Nonstop" : ""].filter(Boolean);
              return <OfferCard key={o.offer_id} offer={o} expired={expired} tags={tags} onBook={openBooking} />;
            })
          )}
        </div>
      )}

      <BookingDialog
        open={!!bookFor}
        onClose={() => setBookFor(null)}
        offer={bookFor}
        sessionId={result?.session_id ?? ""}
        party={{ adults: search.variables?.adults ?? 1, children: search.variables?.children ?? 0, infants: search.variables?.infants ?? 0 }}
      />
    </div>
  );
}

export default function SearchBookPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "flights";
  const { data: status } = useSabreStatus();
  const cap = (key: string) => status?.capabilities.find((c) => c.key === key);
  const booking = cap("flight_booking");

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Search & Book"
        subtitle="Search Sabre sandbox flights and book them (held in the sandbox, not ticketed)"
        actions={
          <div className="flex gap-2">
            {status?.permissions.diagnostics && <Button asChild variant="outline" size="sm"><Link to="/travel/sabre/diagnostics">Diagnostics</Link></Button>}
            <Button asChild variant="outline" size="sm"><Link to="/travel/sabre/bookings">My bookings</Link></Button>
          </div>
        }
      />
      {status && !status.configured && <ErrorBox message={`Sabre is not configured: ${status.config_error}`} />}

      <div role="tablist" aria-label="Travel product" className="flex gap-1 border-b">
        {TABS.map((t) => {
          const c = cap(t.capability);
          const locked = !!c && !c.enabled;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={tab === t.value}
              onClick={() => setParams({ tab: t.value }, { replace: true })}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === t.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" /> {t.label}
              {locked && <Lock className="size-3" aria-label="Unavailable" />}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "flights" && <FlightsTab />}
        {tab === "hotels" && <Unavailable label="Hotels" reason={cap("hotel_search")?.reason ?? null} />}
        {tab === "cars" && <Unavailable label="Rental cars" reason={cap("vehicle_search")?.reason ?? null} />}
      </div>

      {tab === "flights" && booking && !booking.enabled && (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <span><b className="text-foreground">Booking isn't available.</b> {booking.reason}</span>
        </p>
      )}
    </div>
  );
}
