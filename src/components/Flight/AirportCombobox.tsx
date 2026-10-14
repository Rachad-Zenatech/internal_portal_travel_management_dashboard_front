import React, { useState, useEffect, useRef } from "react";
import { Plane, Search, Check, Building2 } from "lucide-react";
import { flightService } from "@/services/flightService";
import type { Airport } from "@/types/flight";

interface AirportComboboxProps {
  label: string;
  value: string; // IATA code, e.g. "YYZ"
  onChange: (airport: Airport) => void;
  placeholder?: string;
  defaultAirports?: Airport[];
}

export const AirportCombobox: React.FC<AirportComboboxProps> = ({
  label,
  value,
  onChange,
  placeholder = "Search airport or city...",
  defaultAirports = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [airports, setAirports] = useState<Airport[]>(defaultAirports);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync selected airport from value
  useEffect(() => {
    if (value && (!selectedAirport || selectedAirport.iata !== value)) {
      flightService.searchAirports(value).then((res) => {
        if (res && res.length > 0) {
          const match = res.find((a) => a.iata.toUpperCase() === value.toUpperCase()) || res[0];
          setSelectedAirport(match);
        }
      });
    }
  }, [value]);

  // Search when query changes
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await flightService.searchAirports(query);
        setAirports(results || []);
      } catch (err) {
        console.error("Airport search error", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>

      {/* Input button trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setQuery("");
        }}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-background border border-border rounded-xl text-left hover:border-primary/50 transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-xs"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div className="truncate">
            {selectedAirport ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground tracking-tight">
                  {selectedAirport.iata}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {selectedAirport.city}, {selectedAirport.country}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-80 md:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search bar inside popup */}
          <div className="p-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type city or airport code (e.g. YYZ, YVR, New York)..."
              className="w-full bg-transparent text-sm text-foreground focus:outline-hidden placeholder:text-muted-foreground"
            />
          </div>

          {/* Results list */}
          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-border/40">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Searching airports...</div>
            ) : airports.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No matching airports found</div>
            ) : (
              airports.map((airport) => {
                const isSelected = selectedAirport?.iata === airport.iata;
                return (
                  <button
                    key={airport.iata}
                    type="button"
                    onClick={() => {
                      setSelectedAirport(airport);
                      onChange(airport);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors hover:bg-muted ${
                      isSelected ? "bg-primary/10 text-primary" : "text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="px-2 py-1 text-xs font-mono font-bold bg-muted rounded-md text-foreground border border-border/80 shrink-0">
                        {airport.iata}
                      </span>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{airport.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3 inline" />
                          <span>{airport.city}, {airport.country}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
