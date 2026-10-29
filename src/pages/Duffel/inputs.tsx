import { useEffect, useRef, useState } from "react";
import { Building2, Loader2, MapPin, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { duffelService } from "@/services/duffelService";
import type { GeoLocation, PlaceSuggestion } from "@/types/duffel";
import { Field } from "./shared";

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });
  return ref;
}

/** Airport / city autocomplete backed by Duffel Places (via the backend). Only a selected suggestion yields a valid code. */
export function PlaceInput({
  label,
  code,
  display,
  onChange,
}: {
  label: string;
  code: string;
  display: string;
  onChange: (code: string, display: string) => void;
}) {
  const [text, setText] = useState(display);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const debounced = useDebounced(text);
  const ref = useOutsideClose(() => setOpen(false));

  useEffect(() => setText(display), [display]);
  useEffect(() => {
    if (!open || debounced.trim().length < 2 || debounced === display) return;
    let live = true;
    setBusy(true);
    duffelService
      .suggestPlaces(debounced.trim())
      .then((r) => live && (setItems(r), setFailed(false)))
      .catch(() => live && setFailed(true))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [debounced, open, display]);

  return (
    <div ref={ref} className="relative">
      <Field label={label}>
        <div className="relative">
          <Input
            className="h-9 pr-14"
            value={text}
            placeholder="City or airport"
            autoComplete="off"
            aria-invalid={!code && text.length > 0}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              if (code) onChange("", e.target.value);
            }}
          />
          {code && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">{code}</span>}
        </div>
      </Field>
      {open && text.trim().length >= 2 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-lg">
          {busy && <li className="p-2 text-xs text-muted-foreground">Searching...</li>}
          {failed && <li className="p-2 text-xs text-destructive">Lookup failed. Try again.</li>}
          {!busy && !failed && items.length === 0 && debounced.trim().length >= 2 && <li className="p-2 text-xs text-muted-foreground">No matches</li>}
          {items.map((p) => (
            <li key={`${p.type}-${p.iata_code}`}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => {
                  const d = `${p.city_name ?? p.name} (${p.iata_code})${p.type === "airport" ? ` – ${p.name}` : " – all airports"}`;
                  onChange(p.iata_code, d);
                  setText(d);
                  setOpen(false);
                }}
              >
                {p.type === "city" ? <Building2 className="size-4 shrink-0" /> : <Plane className="size-4 shrink-0" />}
                <span className="truncate">{p.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{p.iata_code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface PickedLocation {
  label: string;
  latitude: number | null;
  longitude: number | null;
  country_code?: string | null;
}

/**
 * Destination picker for hotels/cars. Duffel has no geocoding endpoint, so suggestions come from the backend location
 * service (airports, plus an optional geocoder). A location is only valid once a suggestion has been picked.
 */
export function LocationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PickedLocation;
  onChange: (v: PickedLocation) => void;
}) {
  const [text, setText] = useState(value.label);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GeoLocation[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const debounced = useDebounced(text, 200);
  const ref = useOutsideClose(() => setOpen(false));
  const selected = value.latitude != null && value.longitude != null;

  useEffect(() => setText(value.label), [value.label]);
  useEffect(() => {
    // Search while typing; stop once a suggestion has been chosen (coordinates set) and the text is unchanged.
    if (!open || selected || debounced.trim().length < 2) {
      setBusy(false);
      return;
    }
    let live = true;
    setBusy(true);
    setFailed(false);
    duffelService
      .searchLocations(debounced.trim())
      .then((r) => live && setItems(r))
      .catch(() => live && (setFailed(true), setItems([])))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [debounced, open, selected]);

  // While the debounce timer is still running the list is stale: show the loading row immediately.
  const pending = !selected && text.trim().length >= 2 && text !== debounced;
  const loading = busy || pending;

  return (
    <div ref={ref} className="relative">
      <Field label={label}>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            value={text}
            placeholder="City or airport"
            autoComplete="off"
            aria-invalid={!selected && text.length > 0}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              onChange({ label: e.target.value, latitude: null, longitude: null, country_code: null });
            }}
          />
        </div>
      </Field>
      {open && !selected && text.trim().length >= 2 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-popover p-1 text-sm shadow-lg" role="listbox">
          {loading && (
            <li className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading available airports…
            </li>
          )}
          {!loading && failed && <li className="p-2 text-xs text-destructive">Couldn’t load locations. Please try again.</li>}
          {!loading && !failed && items.length === 0 && <li className="p-2 text-xs text-muted-foreground">No airports or cities found. Try another spelling.</li>}
          {!loading &&
            items.map((p, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    onChange({ label: p.label, latitude: p.latitude, longitude: p.longitude, country_code: p.country_code ?? null });
                    setText(p.label);
                    setOpen(false);
                  }}
                >
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{p.label}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function ChildAges({ ages, onChange, min = 0, max = 17 }: { ages: number[]; onChange: (a: number[]) => void; min?: number; max?: number }) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Children ({min}–{max})</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Fewer children" disabled={ages.length === 0} onClick={() => onChange(ages.slice(0, -1))} className="flex size-7 items-center justify-center rounded-full border text-base hover:bg-muted disabled:opacity-40">−</button>
          <span className="w-4 text-center text-sm font-semibold">{ages.length}</span>
          <button type="button" aria-label="More children" disabled={ages.length >= 8} onClick={() => onChange([...ages, Math.min(max, Math.max(min, 8))])} className="flex size-7 items-center justify-center rounded-full border text-base hover:bg-muted disabled:opacity-40">+</button>
        </div>
      </div>
      {ages.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {ages.map((a, i) => (
            <label key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              Child {i + 1}
              <select
                className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={a}
                onChange={(e) => onChange(ages.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              >
                {options.map((n) => <option key={n} value={n}>{n} yr{n === 1 ? "" : "s"}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Round "HH:MM" to the nearest 15 minutes (23:53 -> 23:45 so it never rolls into the next day). */
export function snapTo15(hhmm: string): string {
  const m = hhmm.match(/^(\d{2}):(\d{2})/);
  if (!m) return hhmm;
  const total = Math.min(23 * 60 + 45, Math.round((Number(m[1]) * 60 + Number(m[2])) / 15) * 15);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
