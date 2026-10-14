import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import type { TravelVehicle, VehicleSeat, VehicleSpecLookupResult } from "@/types/travel";
import {
  Car,
  Users,
  Search,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Package,
  Sparkles,
  ShieldCheck,
  MapPin,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EXECUTIVE_TRAVELERS = [
  "Michael Vance (CEO)",
  "Vanessa (Executive Assistant)",
  "Sajjad (VP Engineering)",
  "Jim (VP Operations)",
  "Simon (VP Hardware)",
  "Phil (VP Flight Testing)",
  "Linda (VP Partnerships)",
  "Marcus Vance (Ops Chauffeur)",
];

export default function VehicleLibraryPage() {
  const queryClient = useQueryClient();

  // Trip / Event Filter State
  const [selectedTripFilter, setSelectedTripFilter] = useState<string>("all");

  // Query Events / Trips
  const { data: eventsList = [] } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  // Query Vehicles (filtered by trip if selected)
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["travelVehicles", selectedTripFilter],
    queryFn: () =>
      travelService.getVehicles(selectedTripFilter !== "all" ? selectedTripFilter : undefined),
  });

  // Free Spec Lookup State
  const [lookupMake, setLookupMake] = useState("Cadillac");
  const [lookupModel, setLookupModel] = useState("Escalade ESV");
  const [lookupVin, setLookupVin] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<VehicleSpecLookupResult | null>(null);

  // Seat Assignment Dialog State
  const [selectedVehicle, setSelectedVehicle] = useState<TravelVehicle | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<{ row: number; seat: VehicleSeat } | null>(null);
  const [assigneeName, setAssigneeName] = useState<string>("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Fetch attendees for the specific trip of the selected vehicle
  const { data: selectedVehicleEvent } = useQuery({
    queryKey: ["travelEventDetails", selectedVehicle?.assigned_event_id],
    queryFn: () =>
      selectedVehicle?.assigned_event_id
        ? travelService.getEvent(selectedVehicle.assigned_event_id)
        : Promise.resolve(null),
    enabled: !!selectedVehicle?.assigned_event_id,
  });

  // Compute available travelers for this specific vehicle/trip
  const tripAttendees = (selectedVehicleEvent?.attendees || []).map(
    (a) => `${a.attendee_name} (${a.role_in_event || "Traveler"} - ${a.attendance_status})`
  );

  const availableAssignees = [
    ...tripAttendees,
    ...EXECUTIVE_TRAVELERS.filter((exec) => !tripAttendees.some((att) => att.includes(exec.split(" ")[0]))),
    "Pelican Drone Case #1 (Sensors)",
    "Pelican LiPo Battery Case (Hazmat/Dry)",
    "Available (Vacant Seat)",
  ];

  // Add Vehicle Dialog State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_name: "Executive Suburban 1",
    make: "Chevrolet",
    model: "Suburban High Country",
    year: 2026,
    rental_agency: "National Emerald Club",
    vehicle_class: "Full-Size Extended SUV",
    seating_capacity: 8,
    cargo_cases_capacity: 6,
    assigned_event_id: eventsList[0]?.id || "",
    assigned_driver: "Pat (Operations)",
    daily_rate_usd: 210,
    total_cost_usd: 1050,
    status: "active_on_road" as const,
  });

  // Seat Assignment Mutation
  const assignSeatMutation = useMutation({
    mutationFn: ({
      vehicleId,
      rowNumber,
      seatPosition,
      passengerName,
      action,
    }: {
      vehicleId: string;
      rowNumber: number;
      seatPosition: string;
      passengerName: string;
      action: "assign" | "unassign";
    }) =>
      travelService.assignVehicleSeat(vehicleId, {
        passenger_name: passengerName,
        row_number: rowNumber,
        seat_position: seatPosition,
        action,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      setIsAssignModalOpen(false);
      setSelectedSeat(null);
    },
  });

  // Create Vehicle Mutation
  const createVehicleMutation = useMutation({
    mutationFn: (payload: Partial<TravelVehicle>) => travelService.createVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      setIsAddVehicleOpen(false);
    },
  });

  // Delete Vehicle Mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => travelService.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
    },
  });

  // Trigger Free Vehicle Spec Lookup
  const handleFreeSpecLookup = async (makeToUse?: string, modelToUse?: string) => {
    setIsLookingUp(true);
    try {
      const res = await travelService.lookupVehicleSpecs({
        make: makeToUse || lookupMake,
        model: modelToUse || lookupModel,
        vin: lookupVin || undefined,
      });
      setLookupResult(res);
    } catch (e) {
      console.error("Free vehicle lookup failed", e);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Quick preset click
  const handlePresetSelect = (make: string, model: string) => {
    setLookupMake(make);
    setLookupModel(model);
    setLookupVin("");
    handleFreeSpecLookup(make, model);
  };

  // Add lookup result directly to fleet
  const handleAddLookupResultToFleet = () => {
    if (!lookupResult) return;
    createVehicleMutation.mutate({
      vehicle_name: `${lookupResult.make} ${lookupResult.model} Fleet Unit`,
      make: lookupResult.make,
      model: lookupResult.model,
      year: 2026,
      rental_agency: lookupResult.rental_tier.split("/")[0].trim() || "Hertz",
      vehicle_class: lookupResult.vehicle_class,
      seating_capacity: lookupResult.amount_of_seats,
      cargo_cases_capacity: lookupResult.cargo_pelican_capacity,
      assigned_event_id: (selectedTripFilter !== "all" ? selectedTripFilter : eventsList[0]?.id) || null,
      assigned_driver: "Unassigned Driver",
      seat_layout: lookupResult.default_seat_layout,
      daily_rate_usd: 195,
      total_cost_usd: 975,
      status: "available",
      notes: `Imported via Free Spec Library (${lookupResult.source}). Capacity: ${lookupResult.amount_of_seats} passengers.`,
    });
  };

  // Seat Badge Styling
  const getSeatBadgeColor = (type: VehicleSeat["type"]) => {
    switch (type) {
      case "driver":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "vip":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      case "crew":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "staff":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      case "cargo":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer";
    }
  };

  // Aggregated Stats
  const totalFleetSeats = vehicles.reduce((sum, v) => sum + (v.seating_capacity || 0), 0);
  const totalOccupiedSeats = vehicles.reduce((sum, v) => sum + (v.occupied_seats_count || 0), 0);
  const totalAvailableSeats = totalFleetSeats - totalOccupiedSeats;
  const totalPelicanCapacity = vehicles.reduce((sum, v) => sum + (v.cargo_cases_capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Ground Vehicle & Fleet Library</h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              <Sparkles className="h-3 w-3 mr-1" />
              Dynamic Free NHTSA Spec Engine
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Trip-based vehicle fleet management, seating capacity discovery, and seat assignments linked directly to
            each travel expedition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => handleFreeSpecLookup()}
          >
            <Search className="h-4 w-4 mr-2" />
            Spec & Seat Calculator
          </Button>
          <Button onClick={() => setIsAddVehicleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Trip / Event Selector Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Active Trip / Event Selection</div>
            <div className="text-xs text-muted-foreground">
              Filter vehicle fleet and seat assignments based on which trip the travelers are on
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedTripFilter}
            onChange={(e) => setSelectedTripFilter(e.target.value)}
            className="w-full sm:w-96 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">🌐 All Trips & Events (Entire Corporate Fleet)</option>
            {eventsList.map((evt) => (
              <option key={evt.id} value={evt.id}>
                📍 {evt.title} ({evt.location} • {evt.start_date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fleet Units for Selected Trip</CardTitle>
            <Car className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length} Vehicles</div>
            <p className="text-xs text-muted-foreground mt-1">Full-Size SUVs, Shuttles & Executive Vans</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Trip Seating Capacity</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{totalFleetSeats} Total Seats</div>
            <p className="text-xs text-muted-foreground mt-1">
              Supports traveling roster and flight crew rotations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupied vs Available</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-blue-400">{totalOccupiedSeats} Assigned</span>
              <span className="text-xs text-muted-foreground font-normal ml-2">/ {totalAvailableSeats} Free</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((totalOccupiedSeats / (totalFleetSeats || 1)) * 100)}% Seat occupancy
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pelican Case Gear Space</CardTitle>
            <Package className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{totalPelicanCapacity} Cases</div>
            <p className="text-xs text-muted-foreground mt-1">Dedicated drone hardware & battery bays</p>
          </CardContent>
        </Card>
      </div>

      {/* Free Spec & Amount-of-Seats Discovery Engine */}
      <Card className="border-primary/30 bg-primary/5 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Dynamic Free Vehicle Library & Seat Capacity Lookup</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs w-fit">
              100% Free Public Library (U.S. NHTSA Public API)
            </Badge>
          </div>
          <CardDescription>
            Search any vehicle make, model, or 17-digit VIN to dynamically retrieve official seating capacity,
            row configuration, and trunk dimensions without paid tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Quick Model Lookups:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("Cadillac", "Escalade ESV")}
            >
              Escalade
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("Chevrolet", "Suburban")}
            >
              Suburban
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("Honda", "Odyssey")}
            >
              Honda Odyssey
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("Toyota", "Sienna")}
            >
              Toyota Sienna
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("BMW", "X7")}
            >
              BMW X7
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("Ford", "Transit 350")}
            >
              Transit 350 (15 Pax)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePresetSelect("Mercedes-Benz", "Sprinter")}
            >
              Sprinter (12 Pax)
            </Button>
          </div>

          {/* Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Vehicle Make</Label>
              <Input
                placeholder="e.g. Cadillac, Ford, Toyota"
                value={lookupMake}
                onChange={(e) => setLookupMake(e.target.value)}
                className="mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input
                placeholder="e.g. Escalade, Transit, Suburban, Odyssey"
                value={lookupModel}
                onChange={(e) => setLookupModel(e.target.value)}
                className="mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs">VIN (Optional Free NHTSA Decoder)</Label>
              <Input
                placeholder="e.g. 1GNSKCKC5PR123456"
                value={lookupVin}
                onChange={(e) => setLookupVin(e.target.value)}
                className="mt-1 bg-background"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => handleFreeSpecLookup()}
                disabled={isLookingUp || (!lookupMake && !lookupVin)}
              >
                {isLookingUp ? "Querying Free NHTSA API..." : "Calculate Seating Capacity"}
              </Button>
            </div>
          </div>

          {/* Lookup Result Box */}
          {lookupResult && (
            <div className="rounded-lg border border-primary/40 bg-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">
                      {lookupResult.make} {lookupResult.model}
                    </span>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {lookupResult.amount_of_seats} Seats Available
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Class: {lookupResult.vehicle_class} • Tier: {lookupResult.rental_tier}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">
                    Source: {lookupResult.source}
                  </Badge>
                  <Button size="sm" onClick={handleAddLookupResultToFleet} disabled={createVehicleMutation.isPending}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Deploy to Trip Fleet
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-2.5 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Amount of Seats</div>
                  <div className="text-lg font-bold text-emerald-400">{lookupResult.amount_of_seats} Seats</div>
                </div>
                <div className="p-2.5 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Seat Architecture</div>
                  <div className="font-semibold">{lookupResult.seat_configuration}</div>
                </div>
                <div className="p-2.5 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Trunk Pelican Capacity</div>
                  <div className="text-lg font-bold text-purple-400">{lookupResult.cargo_pelican_capacity} Cases</div>
                </div>
                <div className="p-2.5 rounded bg-muted/40">
                  <div className="text-xs text-muted-foreground">Luggage Allowance</div>
                  <div className="text-lg font-bold">{lookupResult.luggage_capacity_bags} Bags</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fleet Vehicles List with Visual Seat Maps */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Active Vehicles & Visual Seat Maps</h2>
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span> Driver
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-400"></span> VIP Executive
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-400"></span> Trip Attendee
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400"></span> Drone Cargo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Available Seat
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading vehicle fleet and seating matrices...</div>
        ) : vehicles.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No vehicles currently registered for this trip. Click "Add Vehicle" or use the Free Spec Lookup above to add
            one.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vehicles.map((v) => {
              const occupied = v.occupied_seats_count ?? 0;
              const available = (v.seating_capacity || 0) - occupied;

              return (
                <Card key={v.id} className="border-border/70 hover:border-border transition-colors">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold">{v.vehicle_name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {v.seating_capacity} Seats
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {v.make} {v.model} ({v.year}) • {v.rental_agency}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            available > 0
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }
                        >
                          {available > 0 ? `${available} Seats Free` : "Full Capacity"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteVehicleMutation.mutate(v.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Prominent Trip Link Badge */}
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        <strong>Assigned Trip:</strong> {v.event_title || "General Expedition / Master Fleet"}
                      </span>
                      {v.event_location && (
                        <span className="text-muted-foreground shrink-0">• {v.event_location}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span>
                        <strong>Driver:</strong> {v.assigned_driver}
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Class:</strong> {v.vehicle_class}
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Pelican Cases:</strong> {v.cargo_cases_capacity}
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Rate:</strong> ${v.daily_rate_usd}/day
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Visual Vehicle Seat Map */}
                    <div className="rounded-lg bg-muted/20 border border-border/60 p-3 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Interactive Seating Map (Click Seat to Assign)</span>
                        <span>Front / Windshield ➔</span>
                      </div>

                      {v.seat_layout && v.seat_layout.length > 0 ? (
                        <div className="space-y-2.5 pt-1">
                          {v.seat_layout.map((row) => (
                            <div key={row.row} className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground w-12 shrink-0">Row {row.row}:</span>
                              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                                {row.seats.map((seat) => (
                                  <button
                                    key={seat.position}
                                    type="button"
                                    onClick={() => {
                                      setSelectedVehicle(v);
                                      setSelectedSeat({ row: row.row, seat });
                                      setAssigneeName("");
                                      setIsAssignModalOpen(true);
                                    }}
                                    className={`px-2 py-1 rounded text-xs border font-medium transition-all text-left flex items-center gap-1.5 ${getSeatBadgeColor(
                                      seat.type
                                    )}`}
                                    title={`Seat ${seat.position}: ${seat.occupant}`}
                                  >
                                    <span className="font-bold opacity-80">{seat.position}</span>
                                    <span className="truncate max-w-[110px]">{seat.occupant}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-2 text-center">
                          Default {v.seating_capacity} seating capacity configured.
                        </div>
                      )}
                    </div>

                    {/* Passenger Manifest List */}
                    {v.current_passengers && v.current_passengers.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground font-medium">Assigned Manifest: </span>
                        <span className="text-foreground">{v.current_passengers.join(", ")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Seat Assignment Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seat Assignment: {selectedSeat?.seat.position}</DialogTitle>
            <DialogDescription>
              Assign a confirmed traveler going on{" "}
              <strong>{selectedVehicle?.event_title || "this expedition"}</strong> or designate the seat for drone
              hardware.
            </DialogDescription>
          </DialogHeader>

          {selectedSeat && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 text-sm space-y-1">
                <div>
                  <strong>Vehicle:</strong> {selectedVehicle?.vehicle_name} ({selectedVehicle?.make}{" "}
                  {selectedVehicle?.model})
                </div>
                <div>
                  <strong>Assigned Trip:</strong> {selectedVehicle?.event_title || "General Expedition"}
                </div>
                <div>
                  <strong>Current Occupant:</strong> {selectedSeat.seat.occupant}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Traveler on this Trip Roster</Label>
                <select
                  value={assigneeName || availableAssignees[0]}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {tripAttendees.length > 0 && (
                    <optgroup label={`Trip Attendees (${selectedVehicle?.event_title || "Active Trip"})`}>
                      {tripAttendees.map((att) => (
                        <option key={att} value={att.split(" (")[0]}>
                          {att}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Executive & Corporate Travelers">
                    {EXECUTIVE_TRAVELERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Dedicated Drone Gear Space">
                    <option value="Pelican Drone Case #1 (Sensors)">Pelican Drone Case #1 (Sensors)</option>
                    <option value="Pelican LiPo Battery Case (Hazmat/Dry)">Pelican LiPo Battery Case (Hazmat/Dry)</option>
                    <option value="Available (Vacant Seat)">Available (Vacant Seat)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedSeat?.seat.occupant !== "Available" && (
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (!selectedVehicle || !selectedSeat) return;
                  assignSeatMutation.mutate({
                    vehicleId: selectedVehicle.id,
                    rowNumber: selectedSeat.row,
                    seatPosition: selectedSeat.seat.position,
                    passengerName: "",
                    action: "unassign",
                  });
                }}
              >
                <UserX className="h-4 w-4 mr-1" />
                Vacate Seat
              </Button>
            )}
            <Button
              onClick={() => {
                if (!selectedVehicle || !selectedSeat) return;
                const chosen = assigneeName || availableAssignees[0].split(" (")[0];
                assignSeatMutation.mutate({
                  vehicleId: selectedVehicle.id,
                  rowNumber: selectedSeat.row,
                  seatPosition: selectedSeat.seat.position,
                  passengerName: chosen,
                  action: "assign",
                });
              }}
              disabled={assignSeatMutation.isPending}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Assign to Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Modal */}
      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Vehicle to Ground Fleet</DialogTitle>
            <DialogDescription>
              Register a new SUV, executive van, or passenger shuttle linked to a specific travel trip.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 text-sm">
            <div className="col-span-2">
              <Label className="text-xs">Assign to Trip / Event</Label>
              <select
                value={newVehicle.assigned_event_id}
                onChange={(e) => setNewVehicle({ ...newVehicle, assigned_event_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                {eventsList.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.location})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Vehicle Display Name</Label>
              <Input
                value={newVehicle.vehicle_name}
                onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Make</Label>
              <Input
                value={newVehicle.make}
                onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Seating Capacity (Amount of Seats)</Label>
              <Input
                type="number"
                min={2}
                max={20}
                value={newVehicle.seating_capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, seating_capacity: parseInt(e.target.value) || 7 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Cargo Cases Capacity</Label>
              <Input
                type="number"
                min={0}
                max={15}
                value={newVehicle.cargo_cases_capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, cargo_cases_capacity: parseInt(e.target.value) || 4 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Rental Agency</Label>
              <Input
                value={newVehicle.rental_agency}
                onChange={(e) => setNewVehicle({ ...newVehicle, rental_agency: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Assigned Driver / Lead</Label>
              <Input
                value={newVehicle.assigned_driver}
                onChange={(e) => setNewVehicle({ ...newVehicle, assigned_driver: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Daily Rate ($ USD)</Label>
              <Input
                type="number"
                value={newVehicle.daily_rate_usd}
                onChange={(e) => setNewVehicle({ ...newVehicle, daily_rate_usd: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Total Est. Cost ($ USD)</Label>
              <Input
                type="number"
                value={newVehicle.total_cost_usd}
                onChange={(e) => setNewVehicle({ ...newVehicle, total_cost_usd: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createVehicleMutation.mutate(newVehicle)}
              disabled={createVehicleMutation.isPending}
            >
              Save Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
