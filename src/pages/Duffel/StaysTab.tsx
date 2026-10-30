import { useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duffelService } from "@/services/duffelService";
import type { SandboxPreset, StayRate, StayResult } from "@/types/duffel";
import { ChildAges, LocationPicker, type PickedLocation } from "./inputs";
import {
  AccessRequired,
  CardSkeletons,
  EmptyState,
  ErrorBox,
  Field,
  Note,
  formatDateTime,
  formatMoney,
  humanize,
  Pill,
  todayISO,
  usePersistedState,
} from "./shared";

interface FormState {
  place: PickedLocation;
  radius_km: number;
  check_in_date: string;
  check_out_date: string;
  rooms: number;
  adults: number;
  child_ages: number[];
}

const defaultForm: FormState = {
  place: { label: "", latitude: null, longitude: null },
  radius_km: 5,
  check_in_date: todayISO(30),
  check_out_date: todayISO(32),
  rooms: 1,
  adults: 2,
  child_ages: [],
};

export default function StaysTab({
  preset,
  onSelect,
  blockedMessage,
}: {
  preset?: SandboxPreset;
  onSelect: (sessionId: string, rateId: string) => void;
  blockedMessage?: string | null;
}) {
  const [form, setForm] = usePersistedState<FormState>("duffel.stays.form", defaultForm);
  const [sessionId, setSessionId] = usePersistedState<string>("duffel.stays.session", "");
  const [results, setResults] = useState<StayResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(blockedMessage ?? null);
  const [expired, setExpired] = useState(false);
  const [minScore, setMinScore] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [amenity, setAmenity] = useState("");
  const [sort, setSort] = useState<"price" | "rating">("price");

  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });
  const nights = Math.round((new Date(form.check_out_date).getTime() - new Date(form.check_in_date).getTime()) / 86400000);

  const formError = useMemo(() => {
    if (form.place.latitude == null || form.place.longitude == null) return "Choose a destination from the suggestions";
    if (form.check_in_date < todayISO()) return "Check-in is in the past";
    if (nights < 1) return "Check-out must be after check-in";
    if (nights > 99) return "Maximum 99 nights";
    if (form.adults < form.rooms) return "At least one adult per room";
    if (form.child_ages.some((a) => a < 0 || a > 17)) return "Child ages must be 0–17";
    return null;
  }, [form, nights]);

  async function search(f: FormState = form) {
    setLoading(true);
    setError(null);
    setExpired(false);
    try {
      const res = await duffelService.searchStays({
        location: { latitude: f.place.latitude!, longitude: f.place.longitude!, label: f.place.label },
        radius_km: f.radius_km,
        check_in_date: f.check_in_date,
        check_out_date: f.check_out_date,
        rooms: f.rooms,
        adults: f.adults,
        child_ages: f.child_ages,
      });
      if (res.status === "access_required") {
        setBlocked(res.message);
        setResults([]);
        return;
      }
      setBlocked(null);
      setSessionId(res.session_id);
      setResults(res.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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

  function sandboxForm(): FormState | null {
    if (!preset) return null;
    const p = preset.stays;
    return {
      place: { label: p.location.label, latitude: p.location.latitude, longitude: p.location.longitude },
      radius_km: p.radius_km,
      check_in_date: p.check_in_date,
      check_out_date: p.check_out_date,
      rooms: p.rooms,
      adults: p.adults,
      child_ages: [],
    };
  }

  function useSandbox() {
    const f = sandboxForm();
    if (f) setForm(f);
  }

  function runSandbox() {
    const f = sandboxForm();
    if (!f) return;
    setForm(f);
    void search(f);
  }

  const shown = useMemo(() => {
    let list = results ?? [];
    if (minScore) list = list.filter((r) => (r.accommodation.review_score ?? 0) >= Number(minScore));
    if (maxPrice) list = list.filter((r) => Number(r.from_price.total?.amount ?? Infinity) <= Number(maxPrice));
    if (amenity.trim()) list = list.filter((r) => r.accommodation.amenities.some((a) => a?.toLowerCase().includes(amenity.trim().toLowerCase())));
    return [...list].sort((a, b) =>
      sort === "price"
        ? Number(a.from_price.total?.amount) - Number(b.from_price.total?.amount)
        : (b.accommodation.rating ?? 0) - (a.accommodation.rating ?? 0),
    );
  }, [results, minScore, maxPrice, amenity, sort]);

  if (blocked) return <AccessRequired product="stay" message={blocked} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2"><LocationPicker label="Destination" value={form.place} onChange={(place) => set({ place })} /></div>
        <Field label="Search radius (km)"><Input type="number" min={1} max={100} value={form.radius_km} onChange={(e) => set({ radius_km: Number(e.target.value) })} /></Field>
        <Field label="Rooms"><Input type="number" min={1} max={9} value={form.rooms} onChange={(e) => set({ rooms: Number(e.target.value) })} /></Field>
        <Field label="Check-in"><Input type="date" min={todayISO()} value={form.check_in_date} onChange={(e) => set({ check_in_date: e.target.value })} /></Field>
        <Field label={`Check-out${nights > 0 ? ` (${nights} night${nights > 1 ? "s" : ""})` : ""}`}><Input type="date" min={form.check_in_date} value={form.check_out_date} onChange={(e) => set({ check_out_date: e.target.value })} /></Field>
        <Field label="Adults (all rooms)"><Input type="number" min={1} max={9} value={form.adults} onChange={(e) => set({ adults: Number(e.target.value) })} /></Field>
        <div className="md:col-span-2"><ChildAges ages={form.child_ages} onChange={(a) => set({ child_ages: a })} /></div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-4">
          <Button size="lg" className="h-9 px-5" disabled={!!formError || loading} onClick={() => search()}><Search className="size-4" /> {loading ? "Searching…" : "Search hotels"}</Button>
          {preset?.enabled && <button type="button" onClick={useSandbox} className="ml-auto text-xs font-medium text-primary hover:underline">Try the sandbox test hotels</button>}
          {formError && <span className="text-xs text-muted-foreground">{formError}</span>}
        </div>
      </div>
      {preset?.enabled && <Note>{preset.stays.note} The preset only fills the form; your own destination is never replaced silently.</Note>}
      {error && <ErrorBox message={error} onRetry={() => search()} />}
      {expired && <Note>Your previous search expired. Search again for current rates.</Note>}
      {loading && <CardSkeletons />}

      {results && !loading && (
        <>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-card p-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Sort by</div>
              <div className="flex gap-2"><Pill active={sort === "price"} onClick={() => setSort("price")}>Lowest price</Pill><Pill active={sort === "rating"} onClick={() => setSort("rating")}>Star rating</Pill></div>
            </div>
            <Field className="w-36" label="Min review score"><Input className="h-8" type="number" step="0.1" value={minScore} onChange={(e) => setMinScore(e.target.value)} /></Field>
            <Field className="w-36" label="Max from-price"><Input className="h-8" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></Field>
            <Field className="w-44" label="Amenity contains"><Input className="h-8" value={amenity} placeholder="e.g. wifi" onChange={(e) => setAmenity(e.target.value)} /></Field>
          </div>
          <Note>Search prices are <b>“from” prices</b> for the cheapest rate. The final price is confirmed only when you select a rate and the supplier issues a quote.</Note>
          {results.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="font-semibold">No properties returned</div>
              {preset?.enabled ? (
                <>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
                    This is the Duffel <b>sandbox</b>: test hotels only appear at the documented test coordinates.
                  </p>
                  <Button className="mt-4" onClick={runSandbox}><Search className="size-4" /> Search the sandbox test hotels</Button>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Try a larger radius or different dates.</p>
              )}
            </div>
          )}
          {results.length > 0 && shown.length === 0 && <EmptyState title="No properties match the filters" />}
          <div className="space-y-3">
            {shown.map((r) => <StayCard key={r.provider_ref} result={r} sessionId={sessionId} onSelect={onSelect} />)}
          </div>
        </>
      )}
    </div>
  );
}

function StayCard({ result, sessionId, onSelect }: { result: StayResult; sessionId: string; onSelect: (s: string, rate: string) => void }) {
  const a = result.accommodation;
  const [rates, setRates] = useState<StayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRates((await duffelService.getStayRates(sessionId, result.search_result_id)).result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4 md:flex-row">
        {a.photos[0] ? <img src={a.photos[0]} alt="" className="h-40 w-full rounded-xl object-cover md:w-60" loading="lazy" /> : <div className="flex h-40 w-full items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground md:w-60">No photo supplied</div>}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{a.name}</h3>
            {a.rating != null && <span className="flex items-center text-amber-500">{Array.from({ length: Math.round(a.rating) }).map((_, i) => <Star key={i} className="size-3 fill-current" />)}</span>}
            {a.review_score != null && <Badge variant="secondary">{a.review_score}{a.review_count ? ` · ${a.review_count} reviews` : ""}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">{[a.address?.line_one, a.address?.city_name, a.address?.country_code].filter(Boolean).join(", ")}</div>
          {a.description && <p className="line-clamp-2 text-xs">{a.description}</p>}
          <div className="flex flex-wrap gap-1">{a.amenities.slice(0, 8).map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2 md:w-48">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">From (cheapest rate, total stay)</div>
            <div className="text-xl font-bold">{formatMoney(result.from_price.total)}</div>
            {result.from_price.due_at_accommodation && <div className="text-xs text-muted-foreground">incl. {formatMoney(result.from_price.due_at_accommodation)} payable at the property</div>}
          </div>
          <Button onClick={load} disabled={loading}>{loading ? "Loading..." : rates ? "Refresh rooms" : "View rooms & rates"}</Button>
        </div>
      </div>
      {error && <div className="px-4 pb-4"><ErrorBox message={error} onRetry={load} /></div>}
      {rates && (
        <div className="space-y-3 border-t bg-muted/20 p-4">
          {a.check_in_information && (
            <div className="text-xs text-muted-foreground">
              Check-in {a.check_in_information.check_in_after_time ? `from ${a.check_in_information.check_in_after_time}` : ""}{a.check_in_information.check_out_before_time ? ` · check-out by ${a.check_in_information.check_out_before_time}` : ""}
            </div>
          )}
          {(rates.accommodation.rooms ?? []).map((room, i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                {room.photos[0] && <img src={room.photos[0]} alt="" className="h-14 w-20 rounded object-cover" loading="lazy" />}
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-xs text-muted-foreground">{room.beds.map((b) => `${b.count}× ${humanize(b.type)}`).join(", ")}</div>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {room.rates.map((r) => <RateRow key={r.rate_id} rate={r} onSelect={() => onSelect(sessionId, r.rate_id)} />)}
              </div>
            </div>
          ))}
          {(rates.accommodation.rooms ?? []).length === 0 && <EmptyState title="No bookable rates right now" />}
        </div>
      )}
    </div>
  );
}

function RateRow({ rate, onSelect }: { rate: StayRate; onSelect: () => void }) {
  const free = rate.cancellation_timeline.find((t) => t.refund && Number(t.refund.amount) > 0);
  return (
    <div className="flex flex-col gap-2 rounded-md border p-2 text-xs md:flex-row md:items-center">
      <div className="flex-1 space-y-0.5">
        <div className="font-medium">{rate.name ?? "Rate"} {rate.board_type && <Badge variant="secondary">{humanize(rate.board_type)}</Badge>} {rate.payment_type && <Badge variant="outline">{humanize(rate.payment_type)}</Badge>}</div>
        {rate.description && <div className="text-muted-foreground">{rate.description}</div>}
        <div className="text-muted-foreground">
          {free ? `Refundable until ${formatDateTime(free.before)} (${formatMoney(free.refund)})` : rate.cancellation_timeline.length ? "No refund indicated by the cancellation timeline" : "Cancellation terms shown on the quote"}
        </div>
        {rate.benefits.map((b, i) => <div key={i} className="text-emerald-700">{b.title}</div>)}
        <div className="text-muted-foreground">
          Base {formatMoney(rate.base)} · Taxes {formatMoney(rate.tax)} · Fees {formatMoney(rate.fee)}
          {rate.due_at_accommodation && <b> · Payable at property: {formatMoney(rate.due_at_accommodation)}</b>}
        </div>
        {rate.quantity_available != null && rate.quantity_available <= 3 && <div className="text-amber-700">Only {rate.quantity_available} left</div>}
      </div>
      <div className="text-right">
        <div className="text-base font-bold">{formatMoney(rate.total)}</div>
        <div className="text-muted-foreground">rate price — confirmed on quote</div>
        <Button size="sm" className="mt-1" onClick={onSelect}>Select rate</Button>
      </div>
    </div>
  );
}
