import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  AlertTriangle,
  Plane,
  Luggage,
  Search,
  DollarSign,
  UserCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { travelService } from "@/services/travelService";
import type { WeeklyTravelRoster, TravelBooking } from "@/types/travel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function WeeklyTravelMatrixPage() {
  const [rosterData, setRosterData] = useState<WeeklyTravelRoster | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("all"); // 'all', 'executive', 'central'
  const [droneFilterOnly, setDroneFilterOnly] = useState<boolean>(false);
  const [conflictFilterOnly, setConflictFilterOnly] = useState<boolean>(false);
  const [selectedTraveler, setSelectedTraveler] = useState<TravelBooking | null>(null);

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    try {
      const res = await travelService.getWeeklyRoster();
      if (res) {
        setRosterData(res);
      }
    } catch (err) {
      console.error("Failed to load weekly travel roster", err);
    }
  };

  const travelers = rosterData?.travelers || [];
  const summary = rosterData?.summary || {
    total_active_travelers: 0,
    executive_tier_count: 0,
    central_team_count: 0,
    conflict_count: 0,
    drone_luggage_manifests: 0,
    total_weekly_spend_usd: 0,
    primary_airports: [],
  };

  const filteredTravelers = travelers.filter((t) => {
    const matchesSearch =
      t.traveler_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.origin_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.carrier_airline.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier =
      tierFilter === "all"
        ? true
        : tierFilter === "executive"
        ? t.routing_tier?.includes("VIP") || t.booked_by_name?.includes("Vanessa")
        : !t.routing_tier?.includes("VIP") && !t.booked_by_name?.includes("Vanessa");

    const matchesDrone = droneFilterOnly ? t.requires_drone_luggage : true;
    const matchesConflict = conflictFilterOnly ? t.has_schedule_conflict : true;

    return matchesSearch && matchesTier && matchesDrone && matchesConflict;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Weekly 20–30 Traveler Operational Matrix
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Centralized coordination of active personnel traveling this week. Separates Executive Assistant VIP bookings
            (CEO, Rachad, Alvin, Sajjad, Jim, Simon, Phil, Linda) from Central Travel Department trade show & drone engineering deployments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-background text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-medium">
            Active Rotation: 20–30 Travelers / Week
          </Badge>
          <Button
            onClick={loadRoster}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sync Time Zones</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase">Active Travelers</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.total_active_travelers}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Across 8 hub cities</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase">Executive VIP (EAs)</span>
              <UserCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.executive_tier_count}</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              Vanessa & Pat Routed
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase">Central Travel Dept</span>
              <Plane className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.central_team_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Tech crews & trade shows</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase">Drone Cargo Cases</span>
              <Luggage className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{summary.drone_luggage_manifests}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Pelican & LiPo Compliant
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase">Schedule Conflicts</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.conflict_count}</div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
              Overlap Alerts Flagged
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-semibold uppercase">Committed Spend</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${(summary.total_weekly_spend_usd / 1000).toFixed(1)}k
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Live Pre-Trip Commit</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Conflict Notice Banner (if any conflicts exist) */}
      {summary.conflict_count > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-200">
              Schedule & Time Zone Conflict Warning Detected
            </div>
            <p className="text-amber-800 dark:text-amber-300">
              {summary.conflict_count} traveler(s) have meeting overlaps across time zones or tight ground transfers.
              Filter by "Show Conflicts Only" below to review details and re-route flight legs.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search traveler, PNR, city, airline..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Tier buttons */}
          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              onClick={() => setTierFilter("all")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                tierFilter === "all" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Travelers ({travelers.length})
            </button>
            <button
              onClick={() => setTierFilter("executive")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                tierFilter === "executive" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Executive Tier (VIP EAs)
            </button>
            <button
              onClick={() => setTierFilter("central")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                tierFilter === "central" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Central Travel Dept
            </button>
          </div>

          {/* Toggle buttons */}
          <Button
            variant={droneFilterOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setDroneFilterOnly(!droneFilterOnly)}
            className="h-8 text-xs gap-1"
          >
            <Luggage className="w-3.5 h-3.5" />
            <span>Drone Gear</span>
          </Button>

          <Button
            variant={conflictFilterOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setConflictFilterOnly(!conflictFilterOnly)}
            className="h-8 text-xs gap-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Conflicts Only</span>
          </Button>
        </div>
      </div>

      {/* 20-30 Traveler Matrix Table */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Traveler & Role</th>
                  <th className="py-3 px-4">Routing Tier / Booked By</th>
                  <th className="py-3 px-4">Route & Dates</th>
                  <th className="py-3 px-4">Time Zone Offset</th>
                  <th className="py-3 px-4">Carrier & Cabin / Seat</th>
                  <th className="py-3 px-4">Special Cargo / Drones</th>
                  <th className="py-3 px-4">Spend (USD)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTravelers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No travelers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTravelers.map((t) => {
                    const isEa = t.routing_tier?.includes("VIP") || t.booked_by_name?.includes("Vanessa");
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          t.has_schedule_conflict ? "bg-rose-500/5" : ""
                        }`}
                      >
                        {/* Traveler */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            {isEa && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                            <span>{t.traveler_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{t.traveler_email}</div>
                          {t.has_schedule_conflict && (
                            <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{t.conflict_details || "Calendar Overlap Detected"}</span>
                            </div>
                          )}
                        </td>

                        {/* Routing Tier */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              isEa
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300"
                                : "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-300"
                            }`}
                          >
                            {isEa ? "EA: " + t.booked_by_name : "Central: " + t.booked_by_name}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            PNR: {t.booking_reference}
                          </div>
                        </td>

                        {/* Route */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">
                            {t.origin_city} → {t.destination_city}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span>
                              {new Date(t.departure_date).toLocaleDateString()} -{" "}
                              {new Date(t.return_date).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Timezone */}
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] font-mono bg-background">
                            <Clock className="w-3 h-3 mr-1 text-indigo-500" />
                            {t.time_zone_diff_label || "0 hrs"}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {t.time_zone_destination.split("/")[1] || "EDT"}
                          </div>
                        </td>

                        {/* Carrier & Seat */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{t.carrier_airline}</div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Seat: {t.seat_assignment || "Assigned at gate"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{t.flight_numbers}</div>
                        </td>

                        {/* Special Cargo / Drones */}
                        <td className="py-3.5 px-4">
                          {t.requires_drone_luggage ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1 w-fit">
                                <Luggage className="w-3 h-3" />
                                <span>Drone Gear</span>
                              </Badge>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {t.pelican_case_tag || "PELICAN-AIR-1615"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Standard Luggage</span>
                          )}
                        </td>

                        {/* Spend */}
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          ${t.total_cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300 font-semibold"
                          >
                            {t.sync_status === "synced_live" ? "Synced Live" : t.status}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTraveler(t)}
                            className="h-7 text-xs"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Slideout / Modal for Traveler */}
      {selectedTraveler && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Plane className="w-4 h-4 text-indigo-500" />
                  <span>{selectedTraveler.traveler_name}</span>
                </h3>
                <p className="text-xs text-muted-foreground">{selectedTraveler.traveler_email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTraveler(null)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[11px]">PNR Reference:</span>
                  <strong className="text-foreground font-mono text-sm">{selectedTraveler.booking_reference}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Booked By / Tier:</span>
                  <strong className="text-foreground">{selectedTraveler.booked_by_name} ({selectedTraveler.routing_tier})</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Airline:</span>
                  <strong className="text-foreground">{selectedTraveler.carrier_airline}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Seat Pod:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedTraveler.seat_assignment}</strong>
                </div>
              </div>

              <div>
                <span className="font-semibold text-foreground block mb-1">Hotel Lodging & Car Rental:</span>
                <p className="p-2.5 rounded-md bg-muted/20 border border-border/50 text-foreground">
                  🏨 {selectedTraveler.hotel_name || "The Ritz-Carlton / Four Seasons Hotel Block"}<br />
                  🚗 {selectedTraveler.car_rental_details || "Hertz President's Circle Luxury Full-Size SUV"}
                </p>
              </div>

              {selectedTraveler.requires_drone_luggage && (
                <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200">
                  <strong>Special Cargo Manifest:</strong> Pelican case tag {selectedTraveler.pelican_case_tag}. IATA Sub-100Wh LiPo compliant battery transport registered.
                </div>
              )}

              {selectedTraveler.has_schedule_conflict && (
                <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200">
                  <strong>Schedule Conflict Notice:</strong> {selectedTraveler.conflict_details}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                onClick={() => setSelectedTraveler(null)}
                size="sm"
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
