import type { SabreOffer } from "@/types/sabre";

export type TimeBucket = "night" | "morning" | "afternoon" | "evening";
export type SortKey = "price" | "duration" | "departure" | "arrival";

export const TIME_BUCKETS: { key: TimeBucket; label: string; hours: string }[] = [
  { key: "night", label: "Night", hours: "00:00–05:59" },
  { key: "morning", label: "Morning", hours: "06:00–11:59" },
  { key: "afternoon", label: "Afternoon", hours: "12:00–17:59" },
  { key: "evening", label: "Evening", hours: "18:00–23:59" },
];

export interface OfferFilters {
  stops: "any" | "0" | "1" | "2";
  maxPrice: number | null;
  airlines: string[];
  outboundTimes: TimeBucket[];
  returnTimes: TimeBucket[];
  maxDuration: number | null;
  refundableOnly: boolean;
  bagIncluded: boolean;
}

export const EMPTY_FILTERS: OfferFilters = {
  stops: "any",
  maxPrice: null,
  airlines: [],
  outboundTimes: [],
  returnTimes: [],
  maxDuration: null,
  refundableOnly: false,
  bagIncluded: false,
};

export interface Facets {
  priceMin: number;
  priceMax: number;
  durationMin: number;
  durationMax: number;
  airlines: { code: string; name: string; count: number; fromPrice: number }[];
  stopCounts: Record<"0" | "1" | "2", number>;
  hasReturn: boolean;
  refundableCount: number;
  bagCount: number;
}

const price = (o: SabreOffer) => Number(o.total_amount);

/** Local wall-clock hour at the departure airport (the offset in the ISO string is ignored on purpose). */
export function bucketOf(iso: string | null | undefined): TimeBucket | null {
  const m = (iso ?? "").match(/T(\d{2}):/);
  if (!m) return null;
  const h = Number(m[1]);
  return h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

export function bagIncluded(o: SabreOffer): boolean {
  return o.baggage.length > 0 && o.baggage.every((b) => (b.pieces ?? 0) > 0 || (b.weight ?? 0) > 0);
}

export function buildFacets(offers: SabreOffer[]): Facets {
  const prices = offers.map(price);
  const durations = offers.map((o) => o.total_duration_minutes ?? 0).filter((d) => d > 0);
  const airlines = new Map<string, { code: string; name: string; count: number; fromPrice: number }>();
  const stopCounts = { "0": 0, "1": 0, "2": 0 };
  for (const o of offers) {
    for (const code of o.carriers) {
      const cur = airlines.get(code);
      const p = price(o);
      if (cur) {
        cur.count += 1;
        cur.fromPrice = Math.min(cur.fromPrice, p);
      } else {
        airlines.set(code, { code, name: o.carrier_names[code] ?? code, count: 1, fromPrice: p });
      }
    }
    if (o.max_stops <= 0) stopCounts["0"] += 1;
    if (o.max_stops <= 1) stopCounts["1"] += 1;
    if (o.max_stops <= 2) stopCounts["2"] += 1;
  }
  return {
    priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    durationMin: durations.length ? Math.min(...durations) : 0,
    durationMax: durations.length ? Math.max(...durations) : 0,
    airlines: [...airlines.values()].sort((a, b) => a.fromPrice - b.fromPrice),
    stopCounts,
    hasReturn: offers.some((o) => o.legs.length > 1),
    refundableCount: offers.filter((o) => o.refundable).length,
    bagCount: offers.filter(bagIncluded).length,
  };
}

export function applyFilters(offers: SabreOffer[], f: OfferFilters): SabreOffer[] {
  return offers.filter((o) => {
    if (f.stops !== "any" && o.max_stops > Number(f.stops)) return false;
    if (f.maxPrice !== null && price(o) > f.maxPrice) return false;
    if (f.airlines.length > 0 && !o.carriers.some((c) => f.airlines.includes(c))) return false;
    if (f.outboundTimes.length > 0) {
      const b = bucketOf(o.legs[0]?.departure_local);
      if (!b || !f.outboundTimes.includes(b)) return false;
    }
    if (f.returnTimes.length > 0 && o.legs.length > 1) {
      const b = bucketOf(o.legs[1]?.departure_local);
      if (!b || !f.returnTimes.includes(b)) return false;
    }
    if (f.maxDuration !== null && (o.total_duration_minutes ?? 0) > f.maxDuration) return false;
    if (f.refundableOnly && !o.refundable) return false;
    if (f.bagIncluded && !bagIncluded(o)) return false;
    return true;
  });
}

export function sortOffers(offers: SabreOffer[], key: SortKey): SabreOffer[] {
  const first = (o: SabreOffer) => o.legs[0]?.departure_local ?? "";
  const last = (o: SabreOffer) => o.legs[0]?.arrival_local ?? "";
  const by: Record<SortKey, (a: SabreOffer, b: SabreOffer) => number> = {
    price: (a, b) => price(a) - price(b),
    duration: (a, b) => (a.total_duration_minutes ?? Infinity) - (b.total_duration_minutes ?? Infinity) || price(a) - price(b),
    departure: (a, b) => first(a).localeCompare(first(b)) || price(a) - price(b),
    arrival: (a, b) => last(a).localeCompare(last(b)) || price(a) - price(b),
  };
  return [...offers].sort(by[key]);
}

export interface ActiveChip {
  id: string;
  label: string;
}

export function activeChips(f: OfferFilters, facets: Facets, currency: string): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (f.stops !== "any") chips.push({ id: "stops", label: f.stops === "0" ? "Nonstop" : `Up to ${f.stops} stop${f.stops === "1" ? "" : "s"}` });
  if (f.maxPrice !== null) chips.push({ id: "price", label: `Under ${currency} ${f.maxPrice}` });
  for (const code of f.airlines) chips.push({ id: `airline:${code}`, label: facets.airlines.find((a) => a.code === code)?.name ?? code });
  for (const t of f.outboundTimes) chips.push({ id: `out:${t}`, label: `Departs ${t}` });
  for (const t of f.returnTimes) chips.push({ id: `ret:${t}`, label: `Returns ${t}` });
  if (f.maxDuration !== null) chips.push({ id: "duration", label: `Under ${Math.floor(f.maxDuration / 60)}h ${f.maxDuration % 60}m` });
  if (f.refundableOnly) chips.push({ id: "refundable", label: "Refundable" });
  if (f.bagIncluded) chips.push({ id: "bag", label: "Checked bag" });
  return chips;
}

export function removeChip(f: OfferFilters, id: string): OfferFilters {
  if (id === "stops") return { ...f, stops: "any" };
  if (id === "price") return { ...f, maxPrice: null };
  if (id === "duration") return { ...f, maxDuration: null };
  if (id === "refundable") return { ...f, refundableOnly: false };
  if (id === "bag") return { ...f, bagIncluded: false };
  if (id.startsWith("airline:")) return { ...f, airlines: f.airlines.filter((c) => c !== id.slice(8)) };
  if (id.startsWith("out:")) return { ...f, outboundTimes: f.outboundTimes.filter((t) => t !== id.slice(4)) };
  if (id.startsWith("ret:")) return { ...f, returnTimes: f.returnTimes.filter((t) => t !== id.slice(4)) };
  return f;
}
