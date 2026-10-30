import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, BadgeCheck, ChevronDown, Info, Luggage, Plane, RotateCcw, Search, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duffelService } from "@/services/duffelService";
import type { Carrier, Condition, FlightOffer, FlightSearchCriteria, FlightSlice, SandboxPreset } from "@/types/duffel";
import { ChildAges, PlaceInput, useOutsideClose } from "./inputs";
import {
  AccessRequired,
  AirlineLogo,
  CardSkeletons,
  EmptyState,
  ErrorBox,
  Field,
  Note,
  formatDuration,
  formatLocal,
  formatMoney,
  humanize,
  localTime,
  Pill,
  todayISO,
  useExpiry,
  usePersistedState,
} from "./shared";

interface FormState {
  trip_type: "one_way" | "round_trip";
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departure_date: string;
  return_date: string;
  adults: number;
  child_ages: number[];
  cabin_class: string;
}

const defaultForm: FormState = {
  trip_type: "round_trip",
  origin: "",
  originLabel: "",
  destination: "",
  destinationLabel: "",
  departure_date: todayISO(30),
  return_date: todayISO(34),
  adults: 1,
  child_ages: [],
  cabin_class: "economy",
};

const TIME_BANDS: Record<string, { label: string; range: [number, number] }> = {
  any: { label: "Any time", range: [0, 24] },
  morning: { label: "Morning", range: [5, 12] },
  afternoon: { label: "Afternoon", range: [12, 18] },
  evening: { label: "Evening", range: [18, 24] },
  night: { label: "Night", range: [0, 5] },
};

type Sort = "price" | "duration" | "departure";

/** Marketing carriers for a slice (de-duplicated, keeps logo + name). */
function sliceCarriers(s: FlightSlice): Carrier[] {
  const seen = new Map<string, Carrier>();
  s.segments.forEach((g) => {
    const c = g.marketing_carrier;
    if (c) seen.set(c.iata_code ?? c.name ?? "", c);
  });
  return Array.from(seen.values());
}

export default function FlightsTab({
  preset,
  onSelect,
  accessMessage,
}: {
  preset?: SandboxPreset;
  onSelect: (sessionId: string, providerRef: string) => void;
  accessMessage?: string | null;
}) {
  const [form, setForm] = usePersistedState<FormState>("duffel.flights.form", defaultForm);
  const [sessionId, setSessionId] = usePersistedState<string>("duffel.flights.session", "");
  const [results, setResults] = useState<FlightOffer[] | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(accessMessage ?? null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showTravelers, setShowTravelers] = useState(false);
  const travelersRef = useOutsideClose(() => setShowTravelers(false));

  const [maxStops, setMaxStops] = useState<string>("any");
  const [airlines, setAirlines] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [band, setBand] = useState("any");
  const [sort, setSort] = useState<Sort>("price");

  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const travelerCount = form.adults + form.child_ages.length;

  const formError = useMemo(() => {
    if (!form.origin || !form.destination) return "Choose origin and destination from the suggestions";
    if (form.origin === form.destination) return "Origin and destination must differ";
    if (!form.departure_date) return "Choose a departure date";
    if (form.departure_date < todayISO()) return "Departure date is in the past";
    if (form.trip_type === "round_trip" && (!form.return_date || form.return_date < form.departure_date)) return "Return must be on or after departure";
    if (travelerCount > 9) return "At most 9 passengers";
    if (form.child_ages.some((a) => a < 2 || a > 17)) return "Child ages must be 2–17 (infants aren't supported yet)";
    return null;
  }, [form, travelerCount]);

  async function search() {
    setLoading(true);
    setError(null);
    setSessionExpired(false);
    setShowTravelers(false);
    try {
      const payload: FlightSearchCriteria = {
        trip_type: form.trip_type,
        origin: form.origin,
        destination: form.destination,
        departure_date: form.departure_date,
        return_date: form.trip_type === "round_trip" ? form.return_date : null,
        adults: form.adults,
        child_ages: form.child_ages,
        cabin_class: form.cabin_class,
      };
      const res = await duffelService.searchFlights(payload);
      if (res.status === "access_required") {
        setBlocked(res.message);
        setResults([]);
        return;
      }
      setBlocked(null);
      setSessionId(res.session_id);
      setResults(res.results);
      setAirlines([]);
      setMaxPrice(null);
      setMaxStops("any");
      setBand("any");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function useSandbox() {
    if (!preset) return;
    const p = preset.flights;
    setForm({
      ...form,
      trip_type: "round_trip",
      origin: p.origin,
      originLabel: `London (${p.origin}) – sandbox demo`,
      destination: p.destination,
      destinationLabel: `New York (${p.destination}) – sandbox demo`,
      departure_date: p.departure_date,
      return_date: p.return_date,
      adults: 1,
      child_ages: [],
    });
  }

  /** Back to a blank search: form, results, session, filters and messages. */
  function resetSearch() {
    setForm({ ...defaultForm, departure_date: "", return_date: "" });
    setSessionId("");
    setResults(null);
    setError(null);
    setSessionExpired(false);
    setShowTravelers(false);
    setMaxStops("any");
    setAirlines([]);
    setMaxPrice(null);
    setBand("any");
    setSort("price");
  }

  function swap() {
    set({ origin: form.destination, originLabel: form.destinationLabel, destination: form.origin, destinationLabel: form.originLabel });
  }

  // Returning to this tab (or back from details) searches Duffel again with the same criteria: saved results are never re-shown.
  useEffect(() => {
    if (!sessionId || results) return;
    if (formError) {
      setSessionId("");
      return;
    }
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Duffel's sandbox adds synthetic offers; they are hidden unless the user asks to see them.
  const testCount = (results ?? []).filter((o) => o.is_test_offer).length;
  const pool = useMemo(() => (results ?? []).filter((o) => showTest || !o.is_test_offer), [results, showTest]);

  // Airlines present in the results, with logos, for the filter chips.
  const airlineOptions = useMemo(() => {
    const m = new Map<string, Carrier>();
    pool.forEach((o) => o.slices.forEach((s) => sliceCarriers(s).forEach((c) => c.name && m.set(c.name, c))));
    return Array.from(m.values()).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [pool]);

  const priceBounds = useMemo(() => {
    const v = pool.map((r) => Number(r.total?.amount ?? 0));
    return v.length ? { min: Math.floor(Math.min(...v)), max: Math.ceil(Math.max(...v)) } : { min: 0, max: 0 };
  }, [pool]);

  const filtered = useMemo(() => {
    let list = pool;
    if (maxStops !== "any") list = list.filter((o) => o.max_stops <= Number(maxStops));
    if (airlines.length) list = list.filter((o) => o.airlines.some((a) => airlines.includes(a)));
    if (maxPrice != null) list = list.filter((o) => Number(o.total?.amount ?? Infinity) <= maxPrice);
    if (band !== "any") {
      const [a, b] = TIME_BANDS[band].range;
      list = list.filter((o) => {
        const h = Number((o.outbound_departing_at ?? "").slice(11, 13));
        return h >= a && h < b;
      });
    }
    return list;
  }, [pool, maxStops, airlines, maxPrice, band]);

  const shown = useMemo(() => {
    const sorted = [...filtered];
    sorted.sort((x, y) =>
      sort === "price"
        ? Number(x.total?.amount) - Number(y.total?.amount)
        : sort === "duration"
          ? x.total_duration_minutes - y.total_duration_minutes
          : (x.outbound_departing_at ?? "").localeCompare(y.outbound_departing_at ?? ""),
    );
    return sorted;
  }, [filtered, sort]);

  // Headline values for the sort chips ("Cheapest $227", "Fastest 7h 10m", "Earliest 06:58").
  const best = useMemo(() => {
    if (!filtered.length) return null;
    const cheapest = filtered.reduce((a, b) => (Number(b.total?.amount) < Number(a.total?.amount) ? b : a));
    const fastest = filtered.reduce((a, b) => (b.total_duration_minutes < a.total_duration_minutes ? b : a));
    const earliest = filtered.reduce((a, b) => ((b.outbound_departing_at ?? "") < (a.outbound_departing_at ?? "") ? b : a));
    return { cheapest, fastest, earliest };
  }, [filtered]);

  const filtersActive = maxStops !== "any" || airlines.length > 0 || maxPrice != null || band !== "any";
  const clearFilters = () => {
    setMaxStops("any");
    setAirlines([]);
    setMaxPrice(null);
    setBand("any");
  };

  if (blocked) return <AccessRequired product="flight" message={blocked} />;

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------ search bar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border bg-muted/50 p-0.5" role="group" aria-label="Trip type">
            {(["round_trip", "one_way"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={form.trip_type === t}
                onClick={() => set({ trip_type: t })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.trip_type === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "round_trip" ? "Round trip" : "One way"}
              </button>
            ))}
          </div>
          <div ref={travelersRef} className="relative">
            <button
              type="button"
              onClick={() => setShowTravelers(!showTravelers)}
              aria-expanded={showTravelers}
              aria-haspopup="dialog"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium hover:bg-muted"
            >
              <Users className="size-3.5" /> {travelerCount} traveler{travelerCount > 1 ? "s" : ""} · {humanize(form.cabin_class)}
              <ChevronDown className={`size-3.5 transition-transform ${showTravelers ? "rotate-180" : ""}`} />
            </button>
            {showTravelers && (
              <div role="dialog" aria-label="Travelers and cabin" className="absolute left-0 top-10 z-40 w-[22rem] max-w-[85vw] space-y-4 rounded-2xl border bg-popover p-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Adults</div>
                    <div className="text-xs text-muted-foreground">18 years and over</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Fewer adults" disabled={form.adults <= 1} onClick={() => set({ adults: form.adults - 1 })} className="flex size-7 items-center justify-center rounded-full border text-base hover:bg-muted disabled:opacity-40">−</button>
                    <span className="w-4 text-center text-sm font-semibold">{form.adults}</span>
                    <button type="button" aria-label="More adults" disabled={travelerCount >= 9} onClick={() => set({ adults: form.adults + 1 })} className="flex size-7 items-center justify-center rounded-full border text-base hover:bg-muted disabled:opacity-40">+</button>
                  </div>
                </div>
                <div className="border-t pt-3"><ChildAges ages={form.child_ages} min={2} onChange={(a) => set({ child_ages: a })} /></div>
                <div className="space-y-2 border-t pt-3">
                  <div className="text-sm font-semibold">Cabin</div>
                  <div className="flex flex-wrap gap-2">
                    {["economy", "premium_economy", "business", "first"].map((c) => (
                      <Pill key={c} active={form.cabin_class === c} onClick={() => set({ cabin_class: c })}>{humanize(c)}</Pill>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">Max 9 travelers</span>
                  <Button size="sm" onClick={() => setShowTravelers(false)}>Done</Button>
                </div>
              </div>
            )}
          </div>
          {preset?.enabled && (
            <button type="button" onClick={useSandbox} className="ml-auto text-xs font-medium text-primary hover:underline">
              Try the sandbox demo route
            </button>
          )}
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_10rem_10rem_auto_auto]">
          <PlaceInput label="From" code={form.origin} display={form.originLabel} onChange={(c, d) => set({ origin: c, originLabel: d })} />
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className="mt-[1.4rem] hidden size-8 items-center justify-center rounded-full border hover:bg-muted lg:flex"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <PlaceInput label="To" code={form.destination} display={form.destinationLabel} onChange={(c, d) => set({ destination: c, destinationLabel: d })} />
          <Field label="Depart"><Input className="h-9" type="date" min={todayISO()} value={form.departure_date} onChange={(e) => set({ departure_date: e.target.value })} /></Field>
          {form.trip_type === "round_trip" ? (
            <Field label="Return"><Input className="h-9" type="date" min={form.departure_date} value={form.return_date} onChange={(e) => set({ return_date: e.target.value })} /></Field>
          ) : (
            <div className="hidden lg:block" />
          )}
          <Button size="lg" className="h-9 px-5 lg:mt-5" disabled={!!formError || loading} onClick={() => search()}>
            <Search className="size-4" /> {loading ? "Searching…" : "Search"}
          </Button>
          <Button type="button" variant="outline" className="h-9 lg:mt-5" disabled={loading} onClick={resetSearch} title="Clear the search form and results">
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
        {formError && <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="size-3.5 shrink-0" />{formError}</p>}
      </div>

      {preset?.enabled && !results && <Note>{preset.flights.note} The demo route only fills the form; it never replaces what you choose.</Note>}
      {error && <ErrorBox message={error} onRetry={search} />}
      {sessionExpired && <Note>Your previous search expired. Run it again for fresh fares.</Note>}
      {loading && <CardSkeletons />}

      {/* ------------------------------------------------ results */}
      {results && !loading && (
        <div className="space-y-4">
          {testCount > 0 && (
            <Note>
              Duffel's sandbox adds {testCount} synthetic offer{testCount > 1 ? "s" : ""} to every search: a fake "Duffel Airways" flight and lookalikes
              that depart at the same time on any route, priced far below the real-looking fares. {showTest ? "They are shown and marked below." : "They are hidden."}{" "}
              <button type="button" className="font-semibold underline" onClick={() => setShowTest(!showTest)}>{showTest ? "Hide them" : "Show them"}</button>
            </Note>
          )}
          {results.length > 0 && best && (
            <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Sort flights">
              {([
                ["price", "Cheapest", formatMoney(best.cheapest.total), `${formatDuration(best.cheapest.total_duration_minutes)} total`],
                ["duration", "Fastest", formatDuration(best.fastest.total_duration_minutes), formatMoney(best.fastest.total)],
                ["departure", "Earliest", localTime(best.earliest.outbound_departing_at), formatMoney(best.earliest.total)],
              ] as [Sort, string, string, string][]).map(([key, title, big, small]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={sort === key}
                  onClick={() => setSort(key)}
                  className={`rounded-xl border p-3 text-left transition-all ${sort === key ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-card hover:border-primary/40"}`}
                >
                  <div className="text-xs font-medium text-muted-foreground">{title}</div>
                  <div className="text-lg font-bold leading-tight">{big}</div>
                  <div className="text-xs text-muted-foreground">{small}</div>
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3 rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Stops</span>
                {[["any", "Any"], ["0", "Nonstop"], ["1", "≤ 1 stop"]].map(([v, l]) => <Pill key={v} active={maxStops === v} onClick={() => setMaxStops(v)}>{l}</Pill>)}
                <span className="ml-2 text-xs font-semibold text-muted-foreground">Departs</span>
                {Object.entries(TIME_BANDS).map(([k, b]) => <Pill key={k} active={band === k} onClick={() => setBand(k)}>{b.label}</Pill>)}
              </div>
              {airlineOptions.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Airlines</span>
                  {airlineOptions.map((c) => (
                    <Pill key={c.name} active={airlines.includes(c.name!)} onClick={() => setAirlines(airlines.includes(c.name!) ? airlines.filter((x) => x !== c.name) : [...airlines, c.name!])}>
                      <AirlineLogo carrier={c} size={18} /> {c.name}
                    </Pill>
                  ))}
                </div>
              )}
              {priceBounds.max > priceBounds.min && (
                <label className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  Max price
                  <input
                    type="range"
                    className="max-w-xs flex-1 accent-primary"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    value={maxPrice ?? priceBounds.max}
                    onChange={(e) => setMaxPrice(Number(e.target.value) >= priceBounds.max ? null : Number(e.target.value))}
                  />
                  <span className="w-24 text-foreground">{maxPrice == null ? "No limit" : formatMoney({ amount: String(maxPrice), currency: results[0].total?.currency ?? null })}</span>
                </label>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing <b className="text-foreground">{shown.length}</b> of {results.length} fares · prices are the <b>total for all {results[0]?.passenger_count ?? travelerCount} traveler(s)</b>
                </span>
                {filtersActive && <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={clearFilters}><X className="size-3" /> Clear filters</button>}
              </div>
            </div>
          )}

          {results.length === 0 && <EmptyState title="No flights found" hint="Try different dates, nearby airports or another cabin." />}
          {results.length > 0 && shown.length === 0 && <EmptyState title="No fares match your filters" hint="Clear a filter to see more results." />}
          <div className="space-y-3">
            {shown.map((o) => (
              <FlightCard key={o.provider_ref} offer={o} cheapest={best?.cheapest.provider_ref === o.provider_ref} fastest={best?.fastest.provider_ref === o.provider_ref} onSelect={() => onSelect(sessionId, o.provider_ref)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function condText(label: string, c: Condition | null) {
  if (!c) return `${label}: not stated by the airline`;
  return `${label}: ${c.allowed ? "allowed" : "not allowed"}${c.allowed && c.penalty ? `, penalty ${formatMoney(c.penalty)}` : ""}`;
}

function SliceRow({ slice, heading }: { slice: FlightSlice; heading?: string }) {
  const carriers = sliceCarriers(slice);
  const operated = Array.from(new Set(slice.segments.filter((g) => g.operating_carrier).map((g) => g.operating_carrier!.name)));
  const bags = slice.segments[0]?.baggages ?? [];
  const checked = bags.find((b) => b.type === "checked")?.quantity ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {carriers.map((c) => <AirlineLogo key={c.iata_code ?? c.name} carrier={c} size={38} />)}
        </div>
        <div className="min-w-0 text-xs">
          <div className="truncate text-sm font-semibold">{carriers.map((c) => c.name).join(" + ") || "Airline"}</div>
          <div className="truncate text-muted-foreground">
            {heading && <span className="mr-1 font-medium text-foreground">{heading} ·</span>}
            {Array.from(new Set(slice.segments.map((g) => g.flight_number))).join(", ")} · {formatLocal(slice.departing_at)}
            {operated.length > 0 && ` · operated by ${operated.join(", ")}`}
          </div>
        </div>
        {slice.fare_brand_name && <Badge variant="outline" className="ml-auto hidden sm:inline-flex">{slice.fare_brand_name}</Badge>}
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div>
          <div className="text-xl font-bold leading-none">{localTime(slice.departing_at)}</div>
          <div className="mt-1 text-xs font-medium">{slice.origin.iata_code}</div>
        </div>
        <div className="px-1">
          <div className="text-center text-[11px] text-muted-foreground">{formatDuration(slice.duration_minutes)}</div>
          <div className="relative my-1 h-0.5 rounded bg-border">
            {slice.connections.map((_, i) => (
              <span key={i} className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-background" style={{ left: `${((i + 1) / (slice.connections.length + 1)) * 100}%` }} />
            ))}
            <Plane className="absolute -top-[7px] right-0 size-4 rotate-90 text-muted-foreground" />
          </div>
          <div className={`text-center text-[11px] ${slice.stops === 0 ? "font-medium text-emerald-600" : "text-amber-600"}`}>
            {slice.stops === 0 ? "Nonstop" : `${slice.stops} stop${slice.stops > 1 ? "s" : ""} · ${slice.connections.map((c) => c.airport.iata_code).join(", ")}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold leading-none">
            {localTime(slice.arriving_at)}
            {slice.arrival_day_offset > 0 && <sup className="ml-0.5 text-[10px] font-semibold text-amber-600">+{slice.arrival_day_offset}</sup>}
          </div>
          <div className="mt-1 text-xs font-medium">{slice.destination.iata_code}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          <Luggage className="size-3" /> {bags.length ? (checked > 0 ? `${checked} checked bag${checked > 1 ? "s" : ""}` : "No checked bag") : "Baggage not provided"}
        </span>
        {slice.segments.some((g) => g.cabin_name) && <span className="rounded-full bg-muted px-2 py-0.5">{slice.segments[0].cabin_name}</span>}
      </div>
    </div>
  );
}

function FlightCard({ offer, cheapest, fastest, onSelect }: { offer: FlightOffer; cheapest: boolean; fastest: boolean; onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  const { expired, remaining } = useExpiry(offer.expires_at);
  const refundable = offer.conditions.refund_before_departure?.allowed === true;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 space-y-4 p-4">
          {(cheapest || fastest || refundable || offer.is_test_offer) && (
            <div className="flex flex-wrap gap-1.5">
              {offer.is_test_offer && <Badge className="bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300">Duffel test offer</Badge>}
              {cheapest && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><BadgeCheck /> Cheapest</Badge>}
              {fastest && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Fastest</Badge>}
              {refundable && <Badge variant="secondary">Refundable</Badge>}
            </div>
          )}
          {offer.slices.map((s, i) => (
            <div key={i} className={i > 0 ? "border-t border-dashed pt-4" : ""}>
              <SliceRow slice={s} heading={offer.slices.length > 1 ? (i === 0 ? "Outbound" : "Return") : undefined} />
            </div>
          ))}
        </div>
        <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t bg-muted/30 p-4 md:w-56 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0">
          <div className="md:text-right">
            <div className="text-2xl font-bold leading-none">{formatMoney(offer.total)}</div>
            <div className="mt-1 text-xs text-muted-foreground">total · {offer.passenger_count} traveler{offer.passenger_count > 1 ? "s" : ""}</div>
            {offer.passenger_count > 1 && offer.average_per_passenger && (
              <div className="text-[11px] text-muted-foreground">≈ {formatMoney(offer.average_per_passenger)} avg each</div>
            )}
            {offer.expires_at && (expired || remaining) && <div className={`mt-1 text-[11px] ${expired ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{expired ? "Offer expired" : `Price held ~${remaining}`}</div>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Button disabled={expired} onClick={onSelect}>Select</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
              {open ? "Hide details" : "Flight details"} <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t bg-muted/10 p-4 text-xs">
          {offer.slices.map((s, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-semibold">{offer.slices.length > 1 ? (i === 0 ? "Outbound" : "Return") : "Itinerary"} · {s.origin.city_name ?? s.origin.iata_code} → {s.destination.city_name ?? s.destination.iata_code}</div>
              {s.segments.map((g, gi) => (
                <div key={g.id}>
                  <div className="flex gap-3 rounded-lg border bg-card p-3">
                    <AirlineLogo carrier={g.marketing_carrier} size={32} />
                    <div className="flex-1 space-y-0.5">
                      <div className="text-sm font-medium">
                        {g.marketing_carrier?.name} <span className="font-mono">{g.flight_number}</span>
                        {g.operating_carrier && <span className="font-normal text-muted-foreground"> · operated by {g.operating_carrier.name} ({g.operating_flight_number})</span>}
                      </div>
                      <div>
                        {g.origin.iata_code}{g.origin.terminal ? ` T${g.origin.terminal}` : ""} {formatLocal(g.departing_at)} → {g.destination.iata_code}{g.destination.terminal ? ` T${g.destination.terminal}` : ""} {formatLocal(g.arriving_at)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDuration(g.duration_minutes)}{g.aircraft ? ` · ${g.aircraft}` : ""}{g.cabin_name ? ` · ${g.cabin_name}` : ""} · Baggage per passenger: {g.baggages.length ? g.baggages.map((b) => `${b.quantity}× ${humanize(b.type)}`).join(", ") : "not provided"}
                      </div>
                    </div>
                  </div>
                  {s.connections[gi] && (
                    <div className="my-1.5 ml-4 border-l-2 border-amber-400 pl-3 text-amber-700 dark:text-amber-300">
                      {s.connections[gi].layover_minutes != null ? formatDuration(s.connections[gi].layover_minutes) : "Layover time unavailable"} layover in {s.connections[gi].airport.city_name ?? s.connections[gi].airport.iata_code} ({s.connections[gi].airport.iata_code})
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border bg-card p-3">
              <div className="text-sm font-semibold">Fare conditions</div>
              <div>{condText("Refund before departure", offer.conditions.refund_before_departure)}</div>
              <div>{condText("Change before departure", offer.conditions.change_before_departure)}</div>
              {offer.payment_requirements.requires_instant_payment === false && <div>Can be held; payment due {offer.payment_requirements.payment_required_by ? `by ${formatLocal(offer.payment_requirements.payment_required_by.replace("Z", ""))} UTC` : "later"}.</div>}
            </div>
            <div className="space-y-1 rounded-lg border bg-card p-3">
              <div className="text-sm font-semibold">Price breakdown (all travelers)</div>
              <div className="flex justify-between"><span>Base fare</span><span>{formatMoney(offer.base)}</span></div>
              <div className="flex justify-between"><span>Taxes &amp; fees</span><span>{formatMoney(offer.tax)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatMoney(offer.total)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
