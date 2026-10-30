import { useState } from "react";
import { ArrowLeftRight, Minus, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AirportCombobox } from "@/components/Flight/AirportCombobox";
import type { SabreFlightSearch } from "@/types/sabre";
import { selectClass, todayISO } from "./shared";

type Cabin = SabreFlightSearch["cabin"];
const CABIN_LABEL: Record<Cabin, string> = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First",
};

export interface SearchFormValues {
  trip_type: SabreFlightSearch["trip_type"];
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  adults: number;
  children: number;
  infants: number;
  cabin: Cabin;
}

export const DEFAULT_SEARCH: SearchFormValues = {
  trip_type: "round_trip",
  origin: "YYZ",
  destination: "LAS",
  departure_date: todayISO(30),
  return_date: todayISO(35),
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "economy",
};

function Counter({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" className="size-7" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus className="size-3.5" />
        </Button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button type="button" size="icon" variant="outline" className="size-7" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface Props {
  values: SearchFormValues;
  onChange: (v: SearchFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function SearchForm({ values, onChange, onSubmit, loading }: Props) {
  const [travelersOpen, setTravelersOpen] = useState(false);
  const set = <K extends keyof SearchFormValues>(k: K, v: SearchFormValues[K]) => onChange({ ...values, [k]: v });
  const passengers = values.adults + values.children + values.infants;
  const sameAirport = values.origin === values.destination;
  const label = (t: string) => <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t}</span>;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="inline-flex rounded-xl border bg-muted/50 p-1 text-sm">
        {(["round_trip", "one_way"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={values.trip_type === t}
            onClick={() => set("trip_type", t)}
            className={`rounded-lg px-4 py-1.5 font-medium transition-all ${values.trip_type === t ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "round_trip" ? "Round trip" : "One way"}
          </button>
        ))}
      </div>

      <div className="grid items-end gap-3 lg:grid-cols-[1fr_auto_1fr_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
        <AirportCombobox label="From" value={values.origin} onChange={(a) => set("origin", a.iata)} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mx-auto hidden size-9 rounded-full lg:inline-flex"
          aria-label="Swap origin and destination"
          onClick={() => onChange({ ...values, origin: values.destination, destination: values.origin })}
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <AirportCombobox label="To" value={values.destination} onChange={(a) => set("destination", a.iata)} />
        <div>
          {label("Depart")}
          <Input type="date" min={todayISO()} value={values.departure_date}
            onChange={(e) => onChange({ ...values, departure_date: e.target.value, return_date: values.return_date < e.target.value ? e.target.value : values.return_date })} />
        </div>
        <div className={values.trip_type === "one_way" ? "opacity-40" : ""}>
          {label("Return")}
          <Input type="date" min={values.departure_date} disabled={values.trip_type === "one_way"} value={values.return_date} onChange={(e) => set("return_date", e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="h-9 gap-2 px-6" disabled={loading || sameAirport}>
          <Search className="size-4" /> {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Popover open={travelersOpen} onOpenChange={setTravelersOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Users className="size-4" /> {passengers} traveler{passengers > 1 ? "s" : ""} · {CABIN_LABEL[values.cabin]}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-1">
            <Counter label="Adults" hint="12+ years" value={values.adults} min={1} max={9 - values.children} onChange={(v) => onChange({ ...values, adults: v, infants: Math.min(values.infants, v) })} />
            <Counter label="Children" hint="2–11 years" value={values.children} min={0} max={9 - values.adults} onChange={(v) => set("children", v)} />
            <Counter label="Infants" hint="Under 2, on lap" value={values.infants} min={0} max={values.adults} onChange={(v) => set("infants", v)} />
            <div className="pt-2">
              {label("Cabin")}
              <select className={selectClass} value={values.cabin} onChange={(e) => set("cabin", e.target.value as Cabin)}>
                {Object.entries(CABIN_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <Button type="button" size="sm" className="mt-2 w-full" onClick={() => setTravelersOpen(false)}>Done</Button>
          </PopoverContent>
        </Popover>
        {sameAirport && <span className="text-xs text-destructive">Origin and destination must be different.</span>}
      </div>
    </form>
  );
}
