import { useState } from "react";
import {
  Plane,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Luggage,
  Leaf,
  Sparkles,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FlightSearchResultItem } from "@/types/flight";
import { AirlineLogo, getAirlineMeta } from "./AirlineLogo";

export const formatFlightTime = (timeStr: string) => {
  if (!timeStr) return "";
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(?:AM|PM|a\.m\.|p\.m\.)(?:\s*\+\d+)?/i);
  if (ampmMatch) {
    const rawH = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const isPm = /pm|p\.m\./i.test(timeStr);
    const period = isPm ? "PM" : "AM";
    const offset = timeStr.match(/\+\d+/)?.[0] || "";
    return `${rawH}:${m} ${period}${offset ? ` ${offset}` : ""}`;
  }
  if (timeStr.includes("T")) {
    const timePart = timeStr.split("T")[1]?.slice(0, 5);
    if (timePart) {
      const [h, m] = timePart.split(":").map(Number);
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${m < 10 ? "0" + m : m} ${period}`;
    }
  }
  return timeStr.replace(/^\d{4}-\d{2}-\d{2}\s*/, "") || timeStr;
};

export const formatFlightDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const clean = dateStr.trim().split(" ")[0].split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export { getAirlineMeta };

interface FlightCardProps {
  flight: FlightSearchResultItem;
  onSelect: (flight: FlightSearchResultItem) => void;
  onSave?: (flight: FlightSearchResultItem) => void;
  onAnalyzeWithAi?: (flight: FlightSearchResultItem) => void;
  isSaved?: boolean;
  isCheapest?: boolean;
  compact?: boolean;
  onToggleDetails?: (flight: FlightSearchResultItem, expanded: boolean) => void;
}

export function FlightCard({
  flight,
  onSelect,
  onSave,
  onAnalyzeWithAi,
  isSaved = false,
  isCheapest = false,
  compact = false,
  onToggleDetails,
}: FlightCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <Card
      className={`border-border hover:border-primary/50 transition-all bg-card shadow-xs rounded-2xl overflow-hidden ${
        isCheapest ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : ""
      } ${compact ? "text-xs" : ""}`}
    >
      {/* Lowest Fare Banner */}
      {isCheapest && (
        <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20 px-4 py-1 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Cheapest Round Trip Deal
          </span>
          <span className="text-[10px] font-medium opacity-80">
            Verified lowest fare on Google Flights
          </span>
        </div>
      )}

      <CardContent className={compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* ROUTE LEGS CONTAINER (Outbound and Return) */}
          <div className="flex-1 space-y-3">
            {/* OUTBOUND LEG */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 py-1">
              {/* 1. Leg Tag & Date */}
              <div className="w-24 shrink-0 flex md:flex-col items-center md:items-start justify-between md:justify-center">
                <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  Depart
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {formatFlightDate(flight.outbound.departure_time)}
                </span>
              </div>

              {/* 2. Airline Identity & Flight Number */}
              <div className="flex items-center gap-2.5 w-40 sm:w-44 shrink-0">
                <AirlineLogo airlineName={flight.outbound.airline_name} flightNumber={flight.outbound.flight_numbers} />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {flight.outbound.airline_name}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {flight.outbound.flight_numbers}
                  </div>
                </div>
              </div>

              {/* 3. Schedule & Timeline (Dep -> Vector -> Arr) */}
              <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-between sm:justify-start">
                {/* Departure */}
                <div className="text-left min-w-[100px] shrink-0">
                  <div className="text-base sm:text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
                    {formatFlightTime(flight.outbound.departure_time)}
                  </div>
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    {flight.outbound.origin_airport}
                  </span>
                </div>

                {/* Graphic Timeline Vector */}
                <div className="flex flex-col items-center flex-1 min-w-[90px] max-w-[140px] shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    {Math.floor(flight.outbound.total_duration_minutes / 60)}h{" "}
                    {flight.outbound.total_duration_minutes % 60}m
                  </span>
                  <div className="w-full flex items-center relative my-1">
                    <div className="w-2 h-2 rounded-full border-2 border-primary bg-card shrink-0" />
                    <div className="flex-1 h-[2px] bg-border relative mx-0.5">
                      {flight.outbound.stops_count > 0 && (
                        <div
                          className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 border border-background"
                          title={`${flight.outbound.stops_count} stop`}
                        />
                      )}
                    </div>
                    <div className="text-primary/80 shrink-0">
                      <Plane className="w-3.5 h-3.5 rotate-45" />
                    </div>
                    <div className="flex-1 h-[2px] bg-border relative mx-0.5" />
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.2 rounded-full whitespace-nowrap ${
                      flight.outbound.stops_count === 0
                        ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
                        : "text-amber-700 bg-amber-500/10 dark:text-amber-400"
                    }`}
                  >
                    {flight.outbound.stops_count === 0 ? "Nonstop" : `${flight.outbound.stops_count} stop`}
                  </span>
                </div>

                {/* Arrival */}
                <div className="text-left min-w-[100px] shrink-0">
                  <div className="text-base sm:text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
                    {formatFlightTime(flight.outbound.arrival_time)}
                  </div>
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    {flight.outbound.destination_airport}
                  </span>
                </div>
              </div>
            </div>

            {/* RETURN LEG (IF ROUND TRIP) */}
            {flight.return_flight && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 pt-3 border-t border-border/50 py-1">
                {/* 1. Leg Tag & Date */}
                <div className="w-24 shrink-0 flex md:flex-col items-center md:items-start justify-between md:justify-center">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Return
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    {formatFlightDate(flight.return_flight.departure_time)}
                  </span>
                </div>

                {/* 2. Airline Identity & Flight Number */}
                <div className="flex items-center gap-2.5 w-40 sm:w-44 shrink-0">
                  <AirlineLogo airlineName={flight.return_flight.airline_name} flightNumber={flight.return_flight.flight_numbers} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">
                      {flight.return_flight.airline_name}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {flight.return_flight.flight_numbers}
                    </div>
                  </div>
                </div>

                {/* 3. Schedule & Timeline (Dep -> Vector -> Arr) */}
                <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-between sm:justify-start">
                  {/* Departure */}
                  <div className="text-left min-w-[100px] shrink-0">
                    <div className="text-base sm:text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
                      {formatFlightTime(flight.return_flight.departure_time)}
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                      {flight.return_flight.origin_airport}
                    </span>
                  </div>

                  {/* Graphic Timeline Vector */}
                  <div className="flex flex-col items-center flex-1 min-w-[90px] max-w-[140px] shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                      {Math.floor(flight.return_flight.total_duration_minutes / 60)}h{" "}
                      {flight.return_flight.total_duration_minutes % 60}m
                    </span>
                    <div className="w-full flex items-center relative my-1">
                      <div className="w-2 h-2 rounded-full border-2 border-blue-500 bg-card shrink-0" />
                      <div className="flex-1 h-[2px] bg-border relative mx-0.5">
                        {flight.return_flight.stops_count > 0 && (
                          <div
                            className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 border border-background"
                            title={`${flight.return_flight.stops_count} stop`}
                          />
                        )}
                      </div>
                      <div className="text-blue-500/80 shrink-0">
                        <Plane className="w-3.5 h-3.5 rotate-45" />
                      </div>
                      <div className="flex-1 h-[2px] bg-border relative mx-0.5" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full whitespace-nowrap ${
                        flight.return_flight.stops_count === 0
                          ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
                          : "text-amber-700 bg-amber-500/10 dark:text-amber-400"
                      }`}
                    >
                      {flight.return_flight.stops_count === 0 ? "Nonstop" : `${flight.return_flight.stops_count} stop`}
                    </span>
                  </div>

                  {/* Arrival */}
                  <div className="text-left min-w-[100px] shrink-0">
                    <div className="text-base sm:text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
                      {formatFlightTime(flight.return_flight.arrival_time)}
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                      {flight.return_flight.destination_airport}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PRICE & CALL TO ACTION (RIGHT PANEL) */}
          <div className="lg:w-56 shrink-0 flex flex-col justify-between items-start lg:items-end pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:border-border/60 lg:pl-5 gap-3">
            <div className="text-left lg:text-right w-full">
              <div className="flex items-baseline gap-1 lg:justify-end">
                <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  ${flight.price.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-muted-foreground">{flight.currency}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {flight.trip_type === "round_trip" ? "Round trip total" : "One-way total"}
              </p>
              {flight.trip_type === "round_trip" && flight.departure_price && flight.return_price && (
                <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium lg:text-right">
                  <span>Outbound ${flight.departure_price.toFixed(2)}</span>
                  <span className="mx-1">+</span>
                  <span>Return ${flight.return_price.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1 lg:justify-end flex-wrap">
                {flight.flight_category ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold gap-1 ${
                      flight.flight_category.toLowerCase().includes("top")
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30"
                    }`}
                  >
                    {flight.flight_category.toLowerCase().includes("top") ? (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        Top Flight
                      </>
                    ) : (
                      <>
                        <Plane className="w-2.5 h-2.5 text-slate-500" />
                        Other Flight
                      </>
                    )}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                  Live Google Fare
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
              {/* Optional Analyze with AI Assistant */}
              {onAnalyzeWithAi && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAnalyzeWithAi(flight)}
                  className="text-xs gap-1 h-9 px-2.5 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  title="Ask Travel Bot to analyze this flight"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ask Bot</span>
                </Button>
              )}

              {/* Save Option */}
              {onSave && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSave(flight)}
                  disabled={isSaved}
                  className={`text-xs gap-1.5 h-9 px-3 shrink-0 rounded-xl ${
                    isSaved ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : ""
                  }`}
                  title="Bookmark flight option"
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}

              {/* Continue to Booking */}
              <Button
                size="sm"
                onClick={() => onSelect(flight)}
                className="text-xs gap-1.5 h-9 flex-1 lg:flex-none font-semibold px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Select Flight</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* MICRO DETAILS & SEGMENTS EXPANDER */}
        <div className="mt-3.5 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              onToggleDetails?.(flight, !isExpanded);
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 hover:text-foreground text-[11px] font-medium"
          >
            <span>{isExpanded ? "Hide Details" : "View Details & Layovers"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Luggage className="w-3 h-3" />
              <span>{flight.baggage_info || "Carry-on included"}</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-3 h-3" />
              <span>{flight.emissions_info || "~160 kg CO2"}</span>
            </span>
          </div>
        </div>

        {/* EXPANDED SEGMENTS VIEW */}
        {isExpanded && (
          <div className="mt-3 p-3.5 bg-muted/30 rounded-xl border border-border/60 space-y-3">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider">
              Outbound Segments
            </div>

            {flight.outbound.segments.map((seg, idx) => (
              <div key={idx} className="flex items-start justify-between text-xs pb-2 border-b border-border/40 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <AirlineLogo airlineName={seg.marketing_airline} flightNumber={seg.flight_number} size={20} />
                    {seg.marketing_airline} • {seg.flight_number}
                  </div>
                  <div className="text-muted-foreground">
                    {seg.departure_airport} → {seg.arrival_airport} ({seg.aircraft || "Modern Jet"})
                  </div>
                  {seg.layover_minutes_after && (
                    <div className="text-amber-500 font-medium text-[11px]">
                      ⏱ {seg.layover_minutes_after}m layover in {seg.layover_airport_after}
                    </div>
                  )}
                </div>
                <div className="text-right text-muted-foreground font-mono">
                  <div>Dep: {formatFlightTime(seg.departure_time)}</div>
                  <div>Arr: {formatFlightTime(seg.arrival_time)}</div>
                </div>
              </div>
            ))}

            {/* Return flight if round trip */}
            {flight.return_flight && (
              <div className="pt-2 border-t border-border/60">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Return Segments
                </div>
                {flight.return_flight.segments.map((seg, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs pb-2 border-b border-border/40 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <AirlineLogo airlineName={seg.marketing_airline} flightNumber={seg.flight_number} size={20} />
                        {seg.marketing_airline} • {seg.flight_number}
                      </div>
                      <div className="text-muted-foreground">
                        {seg.departure_airport} → {seg.arrival_airport} ({seg.aircraft || "Modern Jet"})
                      </div>
                    </div>
                    <div className="text-right text-muted-foreground font-mono">
                      <div>Dep: {formatFlightTime(seg.departure_time)}</div>
                      <div>Arr: {formatFlightTime(seg.arrival_time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
