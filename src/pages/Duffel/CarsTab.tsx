import { useEffect, useMemo, useState } from "react";
import { Briefcase, Fuel, Gauge, RotateCcw, Search, Settings2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duffelService } from "@/services/duffelService";
import type { CarRate, SandboxPreset } from "@/types/duffel";
import { LocationPicker, snapTo15, type PickedLocation } from "./inputs";
import {
  AccessRequired,
  CardSkeletons,
  EmptyState,
  ErrorBox,
  Field,
  Note,
  formatMoney,
  humanize,
  Pill,
  selectClass,
  todayISO,
  usePersistedState,
} from "./shared";

interface FormState {
  pickup: PickedLocation;
  sameReturn: boolean;
  dropoff: PickedLocation;
  radius_km: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  driver_age: number | "";
  residence_country_code: string;
}

const blank: PickedLocation = { label: "", latitude: null, longitude: null };
const defaultForm: FormState = {
  pickup: blank,
  sameReturn: true,
  dropoff: blank,
  radius_km: 5,
  pickup_date: todayISO(30),
  pickup_time: "10:00",
  dropoff_date: todayISO(32),
  dropoff_time: "10:00",
  driver_age: 30,
  residence_country_code: "CA",
};

export default function CarsTab({
  preset,
  onSelect,
  blockedMessage,
}: {
  preset?: SandboxPreset;
  onSelect: (sessionId: string, rateId: string) => void;
  blockedMessage?: string | null;
}) {
  const [form, setForm] = usePersistedState<FormState>("duffel.cars.form", defaultForm);
  const [sessionId, setSessionId] = usePersistedState<string>("duffel.cars.session", "");
  const [results, setResults] = useState<CarRate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(blockedMessage ?? null);
  const [expired, setExpired] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [transmission, setTransmission] = useState("");
  const [minSeats, setMinSeats] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<"price" | "seats">("price");
  // Where the residence country came from: filled from the pick-up location, or typed by the user (never overwritten).
  const [residenceSource, setResidenceSource] = useState<"auto" | "user" | null>(null);

  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });

  const formError = useMemo(() => {
    if (!(form.radius_km >= 1 && form.radius_km <= 10)) return "Search radius must be between 1 and 10 km";
    if (form.pickup.latitude == null) return "Choose a pick-up location from the suggestions";
    if (!form.sameReturn && form.dropoff.latitude == null) return "Choose a drop-off location from the suggestions";
    if (!form.pickup_date || !form.pickup_time) return "Choose a pick-up date and time";
    if (!form.dropoff_date || !form.dropoff_time) return "Choose a drop-off date and time";
    if (form.pickup_date < todayISO()) return "Pick-up date is in the past";
    if (`${form.dropoff_date}T${form.dropoff_time}` <= `${form.pickup_date}T${form.pickup_time}`) return "Drop-off must be after pick-up";
    if (form.driver_age === "" || form.driver_age < 18) return "Enter the driver's age (18 or older)";
    if (!/^[A-Za-z]{2}$/.test(form.residence_country_code)) return "Residence country must be a 2-letter code (e.g. CA)";
    return null;
  }, [form]);

  async function search(f: FormState = form) {
    setLoading(true);
    setError(null);
    setExpired(false);
    try {
      const res = await duffelService.searchCars({
        pickup_location: { latitude: f.pickup.latitude!, longitude: f.pickup.longitude!, label: f.pickup.label },
        dropoff_location: f.sameReturn ? null : { latitude: f.dropoff.latitude!, longitude: f.dropoff.longitude!, label: f.dropoff.label },
        radius_km: f.radius_km,
        pickup_date: f.pickup_date,
        pickup_time: f.pickup_time,
        dropoff_date: f.dropoff_date,
        dropoff_time: f.dropoff_time,
        driver_age: Number(f.driver_age),
        residence_country_code: f.residence_country_code.toUpperCase(),
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

  /** Back to a blank search: form, results, session and filters. */
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

  function resetSearch() {
    setForm({
      ...defaultForm,
      pickup_date: "",
      pickup_time: "",
      dropoff_date: "",
      dropoff_time: "",
      driver_age: "",
      residence_country_code: "",
    });
    setSessionId("");
    setResults(null);
    setError(null);
    setExpired(false);
    setResidenceSource(null);
    setSupplier("");
    setCategory("");
    setTransmission("");
    setMinSeats("");
    setMaxPrice("");
    setSort("price");
  }

  /** Form values for the documented sandbox location (never applied unless the user asks for it). */
  /** Picking a pick-up location suggests its country as the driver's residence, unless the user already chose one. */
  function pickUpChanged(pickup: PickedLocation) {
    const code = pickup.country_code?.toUpperCase();
    if (code && residenceSource !== "user") {
      setResidenceSource("auto");
      set({ pickup, residence_country_code: code });
    } else {
      set({ pickup });
    }
  }

  function sandboxForm(): FormState | null {
    if (!preset) return null;
    const p = preset.cars;
    return {
      pickup: { label: p.pickup_location.label, latitude: p.pickup_location.latitude, longitude: p.pickup_location.longitude },
      sameReturn: true,
      dropoff: blank,
      radius_km: p.radius_km,
      pickup_date: p.pickup_date,
      pickup_time: p.pickup_time,
      dropoff_date: p.dropoff_date,
      dropoff_time: p.dropoff_time,
      driver_age: p.driver_age,
      residence_country_code: p.residence_country_code,
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

  const suppliers = useMemo(() => Array.from(new Set((results ?? []).map((r) => r.supplier.name).filter(Boolean) as string[])), [results]);
  const categories = useMemo(() => Array.from(new Set((results ?? []).map((r) => r.car.category).filter(Boolean) as string[])), [results]);

  const shown = useMemo(() => {
    let list = results ?? [];
    if (supplier) list = list.filter((r) => r.supplier.name === supplier);
    if (category) list = list.filter((r) => r.car.category === category);
    if (transmission) list = list.filter((r) => r.car.transmission === transmission);
    if (minSeats) list = list.filter((r) => (r.car.max_passengers ?? 0) >= Number(minSeats));
    if (maxPrice) list = list.filter((r) => Number(r.total?.amount ?? Infinity) <= Number(maxPrice));
    return [...list].sort((a, b) => (sort === "price" ? Number(a.total?.amount) - Number(b.total?.amount) : (b.car.max_passengers ?? 0) - (a.car.max_passengers ?? 0)));
  }, [results, supplier, category, transmission, minSeats, maxPrice, sort]);

  if (blocked) return <AccessRequired product="car" message={blocked} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2"><LocationPicker label="Pick-up location" value={form.pickup} onChange={pickUpChanged} /></div>
        <div className="md:col-span-2 space-y-1.5">
          {form.sameReturn ? (
            <Field label="Drop-off location"><div className="flex h-9 items-center rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">Same as pick-up</div></Field>
          ) : (
            <LocationPicker label="Drop-off location" value={form.dropoff} onChange={(dropoff) => set({ dropoff })} />
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.sameReturn} onChange={(e) => set({ sameReturn: e.target.checked })} /> Return to the same location
          </label>
        </div>
        <Field label="Pick-up date"><Input type="date" min={todayISO()} value={form.pickup_date} onChange={(e) => set({ pickup_date: e.target.value })} /></Field>
        <Field label="Pick-up time (local)"><Input type="time" step={900} value={form.pickup_time} onChange={(e) => set({ pickup_time: e.target.value })} onBlur={(e) => e.target.value && set({ pickup_time: snapTo15(e.target.value) })} /></Field>
        <Field label="Drop-off date"><Input type="date" min={form.pickup_date} value={form.dropoff_date} onChange={(e) => set({ dropoff_date: e.target.value })} /></Field>
        <Field label="Drop-off time (local)"><Input type="time" step={900} value={form.dropoff_time} onChange={(e) => set({ dropoff_time: e.target.value })} onBlur={(e) => e.target.value && set({ dropoff_time: snapTo15(e.target.value) })} /></Field>
        <Field label="Driver age at pick-up"><Input type="number" min={18} max={99} value={form.driver_age} onChange={(e) => set({ driver_age: e.target.value === "" ? "" : Number(e.target.value) })} /></Field>
        <Field label="Country of residence (2-letter)" hint={residenceSource === "auto" ? "Filled from the pick-up location — change it if you live elsewhere" : undefined}><Input maxLength={2} autoComplete="off" value={form.residence_country_code} onChange={(e) => { setResidenceSource("user"); set({ residence_country_code: e.target.value.toUpperCase() }); }} /></Field>
        <Field label="Search radius (km, max 10)"><Input type="number" min={1} max={10} value={form.radius_km} onChange={(e) => set({ radius_km: Number(e.target.value) })} /></Field>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-4">
          <Button size="lg" className="h-9 px-5" disabled={!!formError || loading} onClick={() => search()}><Search className="size-4" /> {loading ? "Searching…" : "Search cars"}</Button>
          <Button type="button" variant="outline" className="h-9" disabled={loading} onClick={resetSearch} title="Clear the search form and results">
            <RotateCcw className="size-4" /> Reset
          </Button>
          {preset?.enabled && <button type="button" onClick={useSandbox} className="ml-auto text-xs font-medium text-primary hover:underline">Try the sandbox Test Drive</button>}
          {formError && <span className="text-xs text-muted-foreground">{formError}</span>}
        </div>
      </div>
      {preset?.enabled && !results && <Note>Sandbox mode: Duffel has no real rental cars here — results only appear for the Test Drive location. Use “Try the sandbox Test Drive” to fill it in.</Note>}
      {error && <ErrorBox message={error} onRetry={() => search()} />}
      {expired && <Note>Your previous search expired. Search again for current rates.</Note>}
      {loading && <CardSkeletons />}

      {results && !loading && (
        <>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border bg-card p-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Sort by</div>
              <div className="flex gap-2"><Pill active={sort === "price"} onClick={() => setSort("price")}>Lowest price</Pill><Pill active={sort === "seats"} onClick={() => setSort("seats")}>Most seats</Pill></div>
            </div>
            <Field className="w-40" label="Supplier"><select className={selectClass} value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="">All</option>{suppliers.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field className="w-36" label="Category"><select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{categories.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></Field>
            <Field className="w-36" label="Transmission"><select className={selectClass} value={transmission} onChange={(e) => setTransmission(e.target.value)}><option value="">Any</option><option value="automatic">Automatic</option><option value="manual">Manual</option></select></Field>
            <Field className="w-32" label="Min passengers"><Input className="h-8" type="number" value={minSeats} onChange={(e) => setMinSeats(e.target.value)} /></Field>
            <Field className="w-32" label="Max total price"><Input className="h-8" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></Field>
          </div>
          {results.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="font-semibold">No rental cars returned</div>
              {preset?.enabled ? (
                <>
                  <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
                    This is the Duffel <b>sandbox</b>: it has no real rental inventory, so searches for real cities and airports always come back empty. Test cars only exist at the Duffel Test Drive location.
                  </p>
                  <Button className="mt-4" onClick={runSandbox}><Search className="size-4" /> Search the sandbox Test Drive</Button>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Try other dates, a wider radius or a different location.</p>
              )}
            </div>
          )}
          {results.length > 0 && shown.length === 0 && <EmptyState title="No cars match the filters" />}
          <div className="grid gap-4">
            {shown.map((r) => <CarCard key={r.provider_ref} rate={r} onSelect={() => onSelect(sessionId, r.provider_ref)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function CarCard({ rate, onSelect }: { rate: CarRate; onSelect: () => void }) {
  const c = rate.car;
  const cardNeeded = rate.payment_type !== "postpaid";
  const pu = rate.pickup_location;
  const feature = "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1";
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md md:flex-row">
      {/* image */}
      <div className="flex items-center justify-center bg-muted/40 p-4 md:w-48 md:shrink-0">
        {c.image_url ? (
          <img src={c.image_url} alt={c.name ?? "Car"} className="h-24 w-full max-w-44 object-contain" loading="lazy" />
        ) : (
          <div className="flex h-24 w-full items-center justify-center text-xs text-muted-foreground">No image supplied</div>
        )}
      </div>

      {/* details */}
      <div className="min-w-0 flex-1 space-y-3 p-4 text-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-semibold" title="Vehicle as named by the supplier">{c.name ?? humanize(c.category)}</div>
            {c.code && <span className="shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground" title="ACRISS vehicle code (standard car-class code)">{c.code}</span>}
          </div>
          <div className="text-muted-foreground">
            {humanize(c.category)}{c.type ? ` · ${humanize(c.type)}` : ""} · {rate.supplier.name}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.max_passengers != null && <span className={feature}><Users className="size-3.5" />{c.max_passengers} seats</span>}
          {c.baggage && <span className={feature}><Briefcase className="size-3.5" />{c.baggage.large ?? 0} large · {c.baggage.small ?? 0} small</span>}
          {c.transmission && <span className={feature}><Settings2 className="size-3.5" />{humanize(c.transmission)}</span>}
          {c.fuel && <span className={feature}><Fuel className="size-3.5" />{humanize(c.fuel)}</span>}
          {rate.mileage?.type && <span className={feature}><Gauge className="size-3.5" />{humanize(rate.mileage.type)} mileage{rate.mileage.amount ? ` (${rate.mileage.amount} ${rate.mileage.unit ?? ""})` : ""}</span>}
          {c.air_conditioning && <span className={feature}>A/C</span>}
        </div>
        {pu && (
          <div className="space-y-0.5 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Pick-up:</span> {pu.name}{pu.address?.line_one ? `, ${pu.address.line_one}` : ""}{pu.phone_number ? ` · ${pu.phone_number}` : ""}
            </div>
            {pu.additional_information.map((i, idx) => <div key={idx}><b>{i.title}:</b> {i.text}</div>)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{humanize(rate.payment_type)}</Badge>
          {rate.payment_type === "postpaid" && <span className="text-muted-foreground">Pay at pick-up</span>}
          <span className="text-muted-foreground">Cancellation terms &amp; deposit are shown on the final quote.</span>
        </div>
      </div>

      {/* price + action */}
      <div className="flex items-center justify-between gap-3 border-t bg-muted/30 p-4 md:w-52 md:shrink-0 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0">
        <div className="md:text-right">
          <div className="text-2xl font-bold leading-none">{formatMoney(rate.total)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Rate total · confirmed on quote</div>
        </div>
        <Button className="md:w-full" disabled={cardNeeded} onClick={onSelect} title={cardNeeded ? "This rate requires card payment, which is not supported in this release" : undefined}>
          {cardNeeded ? "Card required" : "Select"}
        </Button>
      </div>
    </div>
  );
}
