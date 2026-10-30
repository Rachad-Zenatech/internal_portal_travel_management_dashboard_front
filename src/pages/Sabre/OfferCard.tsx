import { useState } from "react";
import { ChevronDown, Luggage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AirlineLogo } from "@/components/Flight/AirlineLogo";
import type { SabreBaggage, SabreLeg, SabreOffer, SabreSegment } from "@/types/sabre";
import { formatDuration, formatMoney, humanize, localParts } from "./shared";

function baggageText(b?: SabreBaggage): string {
  if (!b) return "Baggage not provided";
  if (b.pieces !== null && b.pieces !== undefined) return b.pieces === 0 ? "No checked bag" : `${b.pieces} checked bag${b.pieces > 1 ? "s" : ""}`;
  if (b.weight) return `${b.weight} ${b.unit ?? ""} checked`.trim();
  return b.description ?? "Baggage not provided";
}

function Time({ iso, align = "left" }: { iso: string | null; align?: "left" | "right" }) {
  const p = localParts(iso);
  if (!p) return <span>—</span>;
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="text-lg font-bold leading-tight tabular-nums">{p.time}</div>
      <div className="text-[11px] text-muted-foreground">{p.date}</div>
    </div>
  );
}

function LegRow({ leg, carrierNames }: { leg: SabreLeg; carrierNames: Record<string, string | null> }) {
  const via = leg.segments.slice(0, -1).map((s) => s.destination).join(", ");
  const code = leg.segments[0]?.marketing_carrier ?? "";
  return (
    <div className="grid grid-cols-[2.5rem_1fr] items-center gap-3">
      <AirlineLogo airlineName={carrierNames[code] ?? code} flightNumber={leg.segments[0]?.flight_number} size={36} />
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div>
          <Time iso={leg.departure_local} />
          <div className="mt-0.5 text-xs font-semibold">{leg.origin}</div>
        </div>
        <div className="px-1 text-center">
          <div className="text-[11px] text-muted-foreground">{formatDuration(leg.duration_minutes)}</div>
          <div className="relative my-1 h-px bg-border">
            {leg.stops > 0 && <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500" />}
          </div>
          <div className={`text-[11px] font-medium ${leg.stops === 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
            {leg.stops === 0 ? "Nonstop" : `${leg.stops} stop${leg.stops > 1 ? "s" : ""} · ${via}`}
          </div>
        </div>
        <div>
          <Time iso={leg.arrival_local} align="right" />
          <div className="mt-0.5 text-right text-xs font-semibold">{leg.destination}</div>
        </div>
      </div>
    </div>
  );
}

function SegmentRow({ seg, bag }: { seg: SabreSegment; bag?: SabreBaggage }) {
  const dep = localParts(seg.departure_local);
  const arr = localParts(seg.arrival_local);
  return (
    <div className="space-y-1.5 rounded-lg border bg-background p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 font-semibold">
        <AirlineLogo airlineName={seg.marketing_carrier ?? ""} flightNumber={seg.flight_number} size={20} />
        {seg.flight_number}
        {seg.operating_carrier && seg.operating_carrier !== seg.marketing_carrier && (
          <span className="font-normal text-muted-foreground">operated by {seg.operating_carrier}</span>
        )}
        {seg.aircraft && <span className="font-normal text-muted-foreground">· {seg.aircraft}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="font-medium">{seg.origin}{seg.origin_terminal ? ` · Terminal ${seg.origin_terminal}` : ""}</div>
          <div className="text-muted-foreground">{dep ? `${dep.time} · ${dep.date} (${dep.offset})` : "—"}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">{seg.destination}{seg.destination_terminal ? ` · Terminal ${seg.destination_terminal}` : ""}</div>
          <div className="text-muted-foreground">{arr ? `${arr.time} · ${arr.date} (${arr.offset})` : "—"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{formatDuration(seg.duration_minutes)}</span>
        <span className="flex items-center gap-1"><Luggage className="size-3" />{baggageText(bag)}</span>
      </div>
      {seg.layover_minutes_after !== null && (
        <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {formatDuration(seg.layover_minutes_after)} layover in {seg.destination}
        </div>
      )}
    </div>
  );
}

interface Props {
  offer: SabreOffer;
  expired: boolean;
  tags?: string[];
  onBook: (offer: SabreOffer) => void;
}

export default function OfferCard({ offer, expired, tags = [], onBook }: Props) {
  const [open, setOpen] = useState(false);
  const bagBySegment = new Map(offer.baggage.map((b) => [b.segment_index, b]));
  const names = offer.carriers.map((c) => offer.carrier_names[c] ?? c).join(" + ");
  const bagOk = offer.baggage.length > 0 && offer.baggage.every((b) => (b.pieces ?? 0) > 0 || (b.weight ?? 0) > 0);

  return (
    <article className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md ${expired ? "opacity-60" : ""}`}>
      <div className="grid sm:grid-cols-[1fr_13rem]">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{names}</span>
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{t}</span>
            ))}
          </div>
          {offer.legs.map((leg) => <LegRow key={leg.direction} leg={leg} carrierNames={offer.carrier_names} />)}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{offer.refundable === null ? "Refundability not provided" : offer.refundable ? "Refundable" : "Non-refundable"}</span>
            <span className="flex items-center gap-1"><Luggage className="size-3" />{bagOk ? "Checked bag included" : "No checked bag included"}</span>
            {offer.cabin && <span>{humanize(offer.cabin)}</span>}
            {offer.seats_available ? <span>{offer.seats_available} seats left</span> : null}
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 border-t bg-muted/30 p-4 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0">
          <div className="sm:text-right">
            <div className="text-2xl font-bold tracking-tight">{formatMoney(offer.total_amount, offer.currency)}</div>
            <div className="text-[11px] text-muted-foreground">
              total{offer.taxes_amount ? ` · ${formatMoney(offer.taxes_amount, offer.currency)} taxes` : ""}
            </div>
          </div>
          <Button size="sm" disabled={expired} onClick={() => onBook(offer)}>Book</Button>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs font-semibold text-primary hover:bg-muted/40"
      >
        {open ? "Hide flight details" : "Flight details, layovers & baggage"}
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t bg-muted/20 p-4 sm:p-5">
          {offer.legs.map((leg) => (
            <div key={leg.direction} className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {humanize(leg.direction)} · {leg.origin} → {leg.destination}
              </div>
              {leg.segments.map((s) => <SegmentRow key={s.segment_index} seg={s} bag={bagBySegment.get(s.segment_index)} />)}
            </div>
          ))}
          {offer.last_ticket_date && (
            <div className="text-[11px] text-muted-foreground">
              Sabre ticketing deadline for this fare: {offer.last_ticket_date}{offer.last_ticket_time ? ` ${offer.last_ticket_time}` : ""}. This is not a price guarantee.
            </div>
          )}
        </div>
      )}
    </article>
  );
}
