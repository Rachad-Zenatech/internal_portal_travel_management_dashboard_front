import type { ReactNode } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AirlineLogo } from "@/components/Flight/AirlineLogo";
import { EMPTY_FILTERS, TIME_BUCKETS, type Facets, type OfferFilters, type TimeBucket } from "@/utils/sabreFilters";
import { formatDuration, formatMoney } from "./shared";

interface Props {
  facets: Facets;
  filters: OfferFilters;
  currency: string;
  priceEnabled: boolean;
  onChange: (next: OfferFilters) => void;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** One filter: a pill that shows its current value and opens a small panel. */
function Pill({ label, summary, active, children, width = "w-72" }: { label: string; summary?: string; active: boolean; children: ReactNode; width?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
            active ? "border-primary bg-primary/10 font-semibold text-primary" : "bg-card hover:border-primary/50"
          }`}
        >
          {label}
          {summary && <span className="font-normal">· {summary}</span>}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={`${width} space-y-3`}>{children}</PopoverContent>
    </Popover>
  );
}

function Option({ checked, onClick, children, disabled }: { checked: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
        checked ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function TimeGrid({ title, value, onChange }: { title: string; value: TimeBucket[]; onChange: (v: TimeBucket[]) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {TIME_BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            aria-pressed={value.includes(b.key)}
            onClick={() => onChange(toggle(value, b.key))}
            className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${value.includes(b.key) ? "border-primary bg-primary/10" : "hover:border-primary/50"}`}
          >
            <div className="text-sm font-medium">{b.label}</div>
            <div className="text-[10px] text-muted-foreground">{b.hours}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const STOP_LABEL = { "0": "Nonstop", "1": "≤ 1 stop", "2": "≤ 2 stops" } as const;

export default function FilterBar({ facets, filters, currency, priceEnabled, onChange }: Props) {
  const set = <K extends keyof OfferFilters>(k: K, v: OfferFilters[K]) => onChange({ ...filters, [k]: v });
  const changed = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const priceValue = filters.maxPrice ?? facets.priceMax;
  const durationValue = filters.maxDuration ?? facets.durationMax;
  const timesCount = filters.outboundTimes.length + filters.returnTimes.length;
  const moreCount = Number(filters.refundableOnly) + Number(filters.bagIncluded);
  const airlineNames = filters.airlines.map((c) => facets.airlines.find((a) => a.code === c)?.name ?? c);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
      <Pill label="Stops" active={filters.stops !== "any"} summary={filters.stops === "any" ? undefined : STOP_LABEL[filters.stops]} width="w-60">
        <div role="radiogroup" className="-m-1 space-y-0.5">
          <Option checked={filters.stops === "any"} onClick={() => set("stops", "any")}>Any number of stops</Option>
          {(["0", "1", "2"] as const).map((k) => (
            <Option key={k} checked={filters.stops === k} disabled={facets.stopCounts[k] === 0} onClick={() => set("stops", k)}>
              <span>{STOP_LABEL[k]}</span><span className="text-xs text-muted-foreground">{facets.stopCounts[k]}</span>
            </Option>
          ))}
        </div>
      </Pill>

      <Pill label="Price" active={filters.maxPrice !== null} summary={filters.maxPrice !== null ? `≤ ${formatMoney(filters.maxPrice, currency).replace(/\.00$/, "")}` : undefined}>
        {priceEnabled && facets.priceMax > facets.priceMin ? (
          <>
            <div className="text-sm font-semibold">Up to {formatMoney(priceValue, currency)}</div>
            <input
              type="range"
              aria-label="Maximum price"
              className="w-full accent-[var(--primary)]"
              min={facets.priceMin}
              max={facets.priceMax}
              step={Math.max(1, Math.round((facets.priceMax - facets.priceMin) / 100))}
              value={priceValue}
              onChange={(e) => { const v = Number(e.target.value); set("maxPrice", v >= facets.priceMax ? null : v); }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatMoney(facets.priceMin, currency)}</span><span>{formatMoney(facets.priceMax, currency)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{priceEnabled ? "All offers cost the same." : "Unavailable: results use more than one currency."}</p>
        )}
      </Pill>

      <Pill
        label="Airlines"
        active={filters.airlines.length > 0}
        summary={filters.airlines.length === 0 ? undefined : filters.airlines.length === 1 ? airlineNames[0] : `${filters.airlines.length} selected`}
        width="w-80"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Airlines</span>
          {filters.airlines.length > 0 && <button type="button" className="text-xs font-semibold text-primary" onClick={() => set("airlines", [])}>Clear</button>}
        </div>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {facets.airlines.map((a) => (
            <label key={a.code} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={filters.airlines.includes(a.code)} onCheckedChange={() => set("airlines", toggle(filters.airlines, a.code))} />
              <AirlineLogo airlineName={a.name} flightNumber={`${a.code} 1`} size={24} />
              <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">from {formatMoney(a.fromPrice, currency).replace(/\.00$/, "")}</span>
            </label>
          ))}
        </div>
      </Pill>

      <Pill label="Times" active={timesCount > 0} summary={timesCount > 0 ? `${timesCount} selected` : undefined} width="w-80">
        <TimeGrid title="Departure" value={filters.outboundTimes} onChange={(v) => set("outboundTimes", v)} />
        {facets.hasReturn && <TimeGrid title="Return departure" value={filters.returnTimes} onChange={(v) => set("returnTimes", v)} />}
      </Pill>

      {facets.durationMax > facets.durationMin && (
        <Pill label="Duration" active={filters.maxDuration !== null} summary={filters.maxDuration !== null ? `≤ ${formatDuration(filters.maxDuration)}` : undefined}>
          <div className="text-sm font-semibold">Total travel time up to {formatDuration(durationValue)}</div>
          <input
            type="range"
            aria-label="Maximum total travel time"
            className="w-full accent-[var(--primary)]"
            min={facets.durationMin}
            max={facets.durationMax}
            step={15}
            value={durationValue}
            onChange={(e) => { const v = Number(e.target.value); set("maxDuration", v >= facets.durationMax ? null : v); }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatDuration(facets.durationMin)}</span><span>{formatDuration(facets.durationMax)}</span>
          </div>
        </Pill>
      )}

      <Pill label="More" active={moreCount > 0} summary={moreCount > 0 ? `${moreCount} on` : undefined} width="w-64">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox checked={filters.refundableOnly} onCheckedChange={(c) => set("refundableOnly", c === true)} />
          Refundable fares only <span className="ml-auto text-xs text-muted-foreground">{facets.refundableCount}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox checked={filters.bagIncluded} onCheckedChange={(c) => set("bagIncluded", c === true)} />
          Checked bag included <span className="ml-auto text-xs text-muted-foreground">{facets.bagCount}</span>
        </label>
      </Pill>

      {changed && (
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => onChange(EMPTY_FILTERS)}>
          <RotateCcw className="size-3.5" /> Reset
        </Button>
      )}
    </div>
  );
}
