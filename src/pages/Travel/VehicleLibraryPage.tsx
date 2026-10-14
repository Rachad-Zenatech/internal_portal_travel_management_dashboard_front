import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import { useAuth } from "@/lib/AuthContext";
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
  ShieldCheck,
  MapPin,
  Filter,
  Eye,
  Compass,
  CheckCircle2,
  AlertCircle,
  Radio,
  Megaphone,
  Send,
  Bell,
  Clock,
  LogOut,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
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
  "Rachad Quintyne (Lead Architect)",
  "Alvin Tsang (Engineering Lead)",
  "Sajjad (VP Engineering)",
  "Jim (VP Operations)",
  "Simon (VP Hardware)",
  "Phil (VP Flight Testing)",
  "Linda (VP Partnerships)",
  "Marcus Vance (Ops Chauffeur)",
];

interface FleetPreset {
  category: string;
  name: string;
  make: string;
  model: string;
  seating_capacity: number;
  cargo_cases_capacity: number;
  vehicle_class: string;
  rental_agency: string;
  daily_rate_usd: number;
  description: string;
}

const FLEET_PRESETS: FleetPreset[] = [
  // Full-Size Extended SUVs
  {
    category: "Full-Size Extended SUVs (7-8 Seats)",
    name: "Executive Suburban 1",
    make: "Chevrolet",
    model: "Suburban High Country",
    seating_capacity: 8,
    cargo_cases_capacity: 6,
    vehicle_class: "Full-Size Extended SUV",
    rental_agency: "National Emerald Club",
    daily_rate_usd: 210,
    description: "8 Seats • 6 Pelican Cases • Executive VIP",
  },
  {
    category: "Full-Size Extended SUVs (7-8 Seats)",
    name: "VIP Escalade ESV",
    make: "Cadillac",
    model: "Escalade ESV Premium",
    seating_capacity: 7,
    cargo_cases_capacity: 5,
    vehicle_class: "Luxury Extended SUV",
    rental_agency: "Hertz President's Circle",
    daily_rate_usd: 275,
    description: "7 Seats • 5 Pelican Cases • VIP Chauffeur",
  },
  {
    category: "Full-Size Extended SUVs (7-8 Seats)",
    name: "Ops Yukon XL",
    make: "GMC",
    model: "Yukon XL Denali",
    seating_capacity: 8,
    cargo_cases_capacity: 6,
    vehicle_class: "Full-Size Extended SUV",
    rental_agency: "Avis Preferred",
    daily_rate_usd: 220,
    description: "8 Seats • 6 Pelican Cases • Heavy Duty",
  },
  {
    category: "Full-Size Extended SUVs (7-8 Seats)",
    name: "Expedition MAX Team",
    make: "Ford",
    model: "Expedition MAX Limited",
    seating_capacity: 8,
    cargo_cases_capacity: 6,
    vehicle_class: "Full-Size Extended SUV",
    rental_agency: "Enterprise Plus",
    daily_rate_usd: 205,
    description: "8 Seats • 6 Pelican Cases • Spacious Crew",
  },
  {
    category: "Full-Size Extended SUVs (7-8 Seats)",
    name: "Navigator L Reserve",
    make: "Lincoln",
    model: "Navigator L Reserve",
    seating_capacity: 7,
    cargo_cases_capacity: 5,
    vehicle_class: "Luxury Extended SUV",
    rental_agency: "Sixt Executive",
    daily_rate_usd: 265,
    description: "7 Seats • 5 Pelican Cases • Executive Shuttle",
  },

  // High-Capacity Passenger Vans & Shuttles
  {
    category: "High-Capacity Passenger Shuttles (12-15 Seats)",
    name: "Flight Crew Transit 350",
    make: "Ford",
    model: "Transit 350 XLT Passenger Van",
    seating_capacity: 15,
    cargo_cases_capacity: 10,
    vehicle_class: "15-Passenger Extended Van",
    rental_agency: "Enterprise Commercial",
    daily_rate_usd: 240,
    description: "15 Seats • 10 Pelican Cases • Full Flight Crew",
  },
  {
    category: "High-Capacity Passenger Shuttles (12-15 Seats)",
    name: "Avionics Transit 250",
    make: "Ford",
    model: "Transit 250 Passenger Wagon",
    seating_capacity: 12,
    cargo_cases_capacity: 8,
    vehicle_class: "12-Passenger Shuttle Van",
    rental_agency: "Budget Van Fleet",
    daily_rate_usd: 215,
    description: "12 Seats • 8 Pelican Cases • Field Ops",
  },
  {
    category: "High-Capacity Passenger Shuttles (12-15 Seats)",
    name: "Executive Sprinter Shuttle",
    make: "Mercedes-Benz",
    model: "Sprinter 2500 Passenger",
    seating_capacity: 12,
    cargo_cases_capacity: 8,
    vehicle_class: "Luxury Passenger Shuttle",
    rental_agency: "Blacklane / Executive Fleet",
    daily_rate_usd: 320,
    description: "12 Seats • 8 Pelican Cases • High Roof Shuttle",
  },
  {
    category: "High-Capacity Passenger Shuttles (12-15 Seats)",
    name: "Express Heavy Passenger 3500",
    make: "Chevrolet",
    model: "Express 3500 Passenger",
    seating_capacity: 15,
    cargo_cases_capacity: 10,
    vehicle_class: "15-Passenger Commercial Van",
    rental_agency: "Hertz Commercial",
    daily_rate_usd: 230,
    description: "15 Seats • 10 Pelican Cases • Event Shuttle",
  },

  // Minivans & Executive Crossovers
  {
    category: "Minivans & Luxury Crossovers (6-8 Seats)",
    name: "Support Sienna Hybrid",
    make: "Toyota",
    model: "Sienna Limited AWD Hybrid",
    seating_capacity: 8,
    cargo_cases_capacity: 5,
    vehicle_class: "Minivan Hybrid",
    rental_agency: "National Emerald Club",
    daily_rate_usd: 165,
    description: "8 Seats • 5 Pelican Cases • High Efficiency",
  },
  {
    category: "Minivans & Luxury Crossovers (6-8 Seats)",
    name: "Staff Pacifica Van",
    make: "Chrysler",
    model: "Pacifica Touring L",
    seating_capacity: 7,
    cargo_cases_capacity: 5,
    vehicle_class: "Passenger Minivan",
    rental_agency: "Avis Preferred",
    daily_rate_usd: 170,
    description: "7 Seats • 5 Pelican Cases • Stow'n Go",
  },
  {
    category: "Minivans & Luxury Crossovers (6-8 Seats)",
    name: "VIP Tesla Model X",
    make: "Tesla",
    model: "Model X Plaid",
    seating_capacity: 6,
    cargo_cases_capacity: 3,
    vehicle_class: "Electric Luxury SUV",
    rental_agency: "Hertz EV Fleet",
    daily_rate_usd: 290,
    description: "6 Seats • 3 Pelican Cases • Zero Emission VIP",
  },
];

const COMMON_MAKES = [
  "Chevrolet",
  "Cadillac",
  "GMC",
  "Ford",
  "Lincoln",
  "Mercedes-Benz",
  "Toyota",
  "Chrysler",
  "Tesla",
  "Audi",
  "BMW",
  "Nissan",
];

const COMMON_MODELS = [
  "Suburban High Country",
  "Tahoe Premier",
  "Escalade ESV Premium",
  "Yukon XL Denali",
  "Expedition MAX Limited",
  "Navigator L Reserve",
  "Transit 350 XLT Passenger Van",
  "Transit 250 Passenger Wagon",
  "Sprinter 2500 Passenger",
  "Express 3500 Passenger",
  "Sienna Limited AWD Hybrid",
  "Pacifica Touring L",
  "Model X Plaid",
];

export default function VehicleLibraryPage() {
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();

  // Determine if logged-in user is CEO, EA, Lead, or Admin
  const isActualLeader = Boolean(
    user?.is_super_admin ||
    roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "CEO", "EA", "COORDINATOR", "MANAGER"].includes(r.code)
    ) ||
    user?.email?.toLowerCase().includes("ceo") ||
    user?.email?.toLowerCase().includes("vanessa") ||
    user?.email?.toLowerCase().includes("admin") ||
    user?.email?.toLowerCase().includes("rachad") ||
    user?.email?.toLowerCase().includes("alvin") ||
    user?.job_title?.toLowerCase().includes("ceo") ||
    user?.job_title?.toLowerCase().includes("vp") ||
    user?.job_title?.toLowerCase().includes("lead") ||
    user?.job_title?.toLowerCase().includes("director")
  );

  // Perspective mode: Leaders can toggle to "Attendee Trip Mode" to test what regular crew members see
  const [perspectiveMode, setPerspectiveMode] = useState<"leadership" | "attendee">(
    isActualLeader ? "leadership" : "attendee"
  );

  // Synchronize initial mode
  useEffect(() => {
    if (!isActualLeader) {
      setPerspectiveMode("attendee");
    }
  }, [isActualLeader]);

  // Trip / Event Filter State
  const [selectedTripFilter, setSelectedTripFilter] = useState<string>("all");

  // Query Events / Trips
  const { data: eventsList = [] } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  // Query Vehicles (filtered by trip and user role/email)
  const isAttendeeView = perspectiveMode === "attendee";
  const effectiveEmail = isAttendeeView
    ? user?.email || "alex.rivera@zenatech.com"
    : undefined;
  const effectiveName = isAttendeeView
    ? user?.full_name || "Alex Rivera"
    : undefined;

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["travelVehicles", selectedTripFilter, perspectiveMode, effectiveEmail],
    queryFn: () =>
      travelService.getVehicles({
        eventId: selectedTripFilter !== "all" ? selectedTripFilter : undefined,
        userEmail: effectiveEmail,
        userName: effectiveName,
        isAdminOverride: !isAttendeeView,
      }),
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
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>("");
  const [isAutoDetectingSpecs, setIsAutoDetectingSpecs] = useState(false);
  const [autoDetectNotice, setAutoDetectNotice] = useState<string | null>(null);

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
    seat_layout: undefined as any,
  });

  const handleSelectPreset = (indexStr: string) => {
    setSelectedPresetIndex(indexStr);
    if (!indexStr) return;
    const idx = parseInt(indexStr, 10);
    const preset = FLEET_PRESETS[idx];
    if (!preset) return;

    setNewVehicle((prev) => ({
      ...prev,
      vehicle_name: preset.name,
      make: preset.make,
      model: preset.model,
      vehicle_class: preset.vehicle_class,
      seating_capacity: preset.seating_capacity,
      cargo_cases_capacity: preset.cargo_cases_capacity,
      rental_agency: preset.rental_agency,
      daily_rate_usd: preset.daily_rate_usd,
      total_cost_usd: preset.daily_rate_usd * 5,
    }));

    setAutoDetectNotice(
      `✓ Auto-completed from Library: ${preset.seating_capacity} Seats • ${preset.cargo_cases_capacity} Pelican Cases • ${preset.vehicle_class}`
    );
    toast.success(`Loaded "${preset.name}" (${preset.seating_capacity} seats) from Vehicle Library`);
  };

  const handleAutoDetectSpecs = async (makeToUse?: string, modelToUse?: string) => {
    const mk = (makeToUse || newVehicle.make).trim();
    const mdl = (modelToUse || newVehicle.model).trim();
    if (!mk) {
      toast.error("Please enter a vehicle Make first to detect specs");
      return;
    }
    setIsAutoDetectingSpecs(true);
    try {
      const res = await travelService.lookupVehicleSpecs({ make: mk, model: mdl });
      setNewVehicle((prev) => ({
        ...prev,
        make: res.make,
        model: res.model || prev.model,
        seating_capacity: res.amount_of_seats,
        cargo_cases_capacity: res.cargo_pelican_capacity,
        vehicle_class: res.vehicle_class,
        seat_layout: res.default_seat_layout,
      }));
      setAutoDetectNotice(
        `✓ Resolved from Vehicle Library (${res.source}): ${res.amount_of_seats} Seats • ${res.cargo_pelican_capacity} Pelican Cases • ${res.seat_configuration}`
      );
      toast.success(`Auto-detected specs for ${res.make} ${res.model}: ${res.amount_of_seats} Seats!`);
    } catch (err) {
      console.error("Auto-detect failed", err);
      toast.error("Could not automatically resolve specs. You can still set capacity manually.");
    } finally {
      setIsAutoDetectingSpecs(false);
    }
  };

  // Departure Broadcast Dialog State
  const [broadcastVehicle, setBroadcastVehicle] = useState<TravelVehicle | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [depStatus, setDepStatus] = useState<"loading_up" | "leaving_soon" | "en_route" | "arrived" | "cancelled">("loading_up");
  const [depLocation, setDepLocation] = useState("Main Venue Exit / West Paddock Bay");
  const [depTime, setDepTime] = useState("In 10 minutes");
  const [depMessage, setDepMessage] = useState("");

  // Broadcast Departure Mutation
  const broadcastDepartureMutation = useMutation({
    mutationFn: ({ vehicleId, payload }: { vehicleId: string; payload: any }) =>
      travelService.broadcastVehicleDeparture(vehicleId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsBroadcastModalOpen(false);
      toast.success(res.message || "Departure notification broadcasted to all trip attendees!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to broadcast departure notification");
    },
  });

  // Check-In to Vehicle Mutation
  const checkInMutation = useMutation({
    mutationFn: ({ vehicleId, payload }: { vehicleId: string; payload: any }) =>
      travelService.checkInToVehicle(vehicleId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["travelEventDetails"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      toast.success(res.message || "You have updated your vehicle check-in!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to check in to vehicle");
    },
  });

  const handleOpenBroadcastModal = (vehicle: TravelVehicle) => {
    setBroadcastVehicle(vehicle);
    setDepStatus(
      (vehicle.departure_status as any) && vehicle.departure_status !== "idle"
        ? (vehicle.departure_status as any)
        : "loading_up"
    );
    setDepLocation(vehicle.departure_location || "Main Paddock Gate / Bay 3");
    setDepTime(vehicle.departure_time || "In 10 minutes");
    setDepMessage(
      vehicle.departure_message ||
        `Loading gear and pelican cases now. Leaving for the hotel in 10 minutes! Check in to reserve a seat.`
    );
    setIsBroadcastModalOpen(true);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastVehicle) return;
    broadcastDepartureMutation.mutate({
      vehicleId: broadcastVehicle.id,
      payload: {
        departure_status: depStatus,
        departure_location: depLocation,
        departure_time: depTime,
        message: depMessage,
        broadcaster_name: user?.full_name || broadcastVehicle.assigned_driver || "Assigned Driver",
        broadcaster_email: user?.email,
      },
    });
  };

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

  // Find if user has a vehicle seat assigned in any loaded vehicle
  const myRidingVehicle = vehicles.find((v) => v.user_assigned_seat);

  // Seat Badge Styling
  const getSeatBadgeColor = (seat: VehicleSeat, isUserAssigned: boolean) => {
    if (isUserAssigned) {
      return "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md ring-2 ring-amber-400 animate-pulse";
    }
    switch (seat.type) {
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
        return isAttendeeView
          ? "bg-muted/40 text-muted-foreground border-border/40"
          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer";
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
            <Badge
              variant="outline"
              className={
                isAttendeeView
                  ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                  : "border-purple-500/40 text-purple-400 bg-purple-500/10"
              }
            >
              {isAttendeeView ? (
                <>
                  <Compass className="h-3 w-3 mr-1" /> My Trip Vehicles
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3 w-3 mr-1" /> Global Dispatch Mode
                </>
              )}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {isAttendeeView
              ? "Showing ground transport and your assigned seat for the specific trip you are traveling on."
              : "Global fleet management across all trips, VIP executives, and multi-passenger crew shuttles."}
          </p>
        </div>

        {/* Action Buttons & Perspective Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Executive/Attendee Toggle for Leadership */}
          {isActualLeader && (
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setPerspectiveMode("leadership")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  perspectiveMode === "leadership"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Leadership Dispatch
              </button>
              <button
                type="button"
                onClick={() => setPerspectiveMode("attendee")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  perspectiveMode === "attendee"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Attendee Trip View
              </button>
            </div>
          )}

          {!isAttendeeView && (
            <>
              <Button
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => handleFreeSpecLookup()}
              >
                <Search className="h-4 w-4 mr-2" />
                Spec Calculator
              </Button>
              <Button onClick={() => setIsAddVehicleOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Attendee Personal Transport Callout Banner */}
      {isAttendeeView && (
        <Card className="border-blue-500/40 bg-blue-500/10 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Your Designated Trip Transport</span>
                  <Badge variant="outline" className="border-blue-400/30 text-blue-300 text-[10px]">
                    Attendee Access
                  </Badge>
                </div>
                {myRidingVehicle ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You are assigned to <strong>{myRidingVehicle.vehicle_name}</strong> (
                    {myRidingVehicle.make} {myRidingVehicle.model}) • Driver:{" "}
                    <strong>{myRidingVehicle.assigned_driver}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You have access to ground transport for your trip. Your exact seat will be highlighted below once
                    assigned by the trip coordinator.
                  </p>
                )}
              </div>
            </div>
            {myRidingVehicle?.user_assigned_seat && (
              <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 flex items-center gap-2 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <div className="text-xs">
                  <span className="text-muted-foreground">Your Seat: </span>
                  <strong className="text-amber-300">
                    Row {myRidingVehicle.user_assigned_seat.row}, Seat {myRidingVehicle.user_assigned_seat.position}
                  </strong>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trip / Event Selector Banner (Visible to Leadership or multi-trip attendees) */}
      {!isAttendeeView && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Dispatch Filter by Expedition / Trip</div>
              <div className="text-xs text-muted-foreground">
                Filter ground vehicles to inspect transport readiness for a specific event
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTripFilter}
              onChange={(e) => setSelectedTripFilter(e.target.value)}
              className="w-full sm:w-96 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">🌐 All Trips & Events (Global Master Fleet)</option>
              {eventsList.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  📍 {evt.title} ({evt.location} • {evt.start_date})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isAttendeeView ? "Vehicles on Your Trip" : "Active Fleet Units"}
            </CardTitle>
            <Car className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length} Vehicles</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAttendeeView ? "Assigned specifically for your team" : "Full-Size SUVs, Shuttles & Executive Vans"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seating Capacity</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{totalFleetSeats} Total Seats</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAttendeeView ? "Trip traveler capacity" : "Supports traveling roster and flight crew rotations"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Seat Occupancy</CardTitle>
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

      {/* Free Spec & Amount-of-Seats Discovery Engine (Only for Dispatchers) */}
      {!isAttendeeView && (
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
                    <Button
                      size="sm"
                      onClick={handleAddLookupResultToFleet}
                      disabled={createVehicleMutation.isPending}
                    >
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
      )}

      {/* Fleet Vehicles List with Visual Seat Maps */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {isAttendeeView ? "Your Trip Transport Fleet" : "Active Vehicles & Visual Seat Maps"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAttendeeView
                ? "View your designated vehicle and seat. Contact the coordinator or driver for adjustments."
                : "Click any seat to reassign travelers from the trip roster or allocate Pelican drone crates."}
            </p>
          </div>
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
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
            <p className="font-semibold text-foreground">No vehicles found</p>
            <p className="text-xs mt-1">
              {isAttendeeView
                ? "You are not currently assigned to any ground transport vehicle for this event. Please check with your trip coordinator."
                : "No vehicles registered. Click 'Add Vehicle' or use the Free Spec Lookup above to deploy one."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vehicles.map((v) => {
              const occupied = v.occupied_seats_count ?? 0;
              const available = (v.seating_capacity || 0) - occupied;
              const hasMySeat = Boolean(v.user_assigned_seat);

              return (
                <Card
                  key={v.id}
                  className={`border transition-all ${
                    hasMySeat
                      ? "border-amber-500/50 shadow-md ring-1 ring-amber-500/30 bg-amber-500/[0.02]"
                      : "border-border/70 hover:border-border"
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold">{v.vehicle_name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {v.seating_capacity} Seats
                          </Badge>
                          {hasMySeat && (
                            <Badge className="bg-amber-500 text-slate-950 font-bold border-amber-400 text-xs">
                              ★ Your Assigned Vehicle
                            </Badge>
                          )}
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
                        {!isAttendeeView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteVehicleMutation.mutate(v.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
                    {/* Departure / Loading Notification Banner */}
                    {v.departure_status && v.departure_status !== "idle" && (
                      <div
                        className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                          v.departure_status === "loading_up"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : v.departure_status === "leaving_soon"
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                            : v.departure_status === "en_route"
                            ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                            : v.departure_status === "arrived"
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                            : "bg-muted/40 border-border text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5 uppercase tracking-wide">
                            <Radio className="h-3.5 w-3.5 animate-pulse text-primary" />
                            {v.departure_status === "loading_up" && "Loading Up Now — Boarding Open"}
                            {v.departure_status === "leaving_soon" && "Final Call — Departing Soon!"}
                            {v.departure_status === "en_route" && "En Route to Destination"}
                            {v.departure_status === "arrived" && "Arrived at Destination"}
                            {v.departure_status === "cancelled" && "Departure Delayed"}
                          </span>
                          {v.departure_time && (
                            <span className="flex items-center gap-1 text-[11px] font-medium opacity-90">
                              <Clock className="h-3 w-3" />
                              {v.departure_time}
                            </span>
                          )}
                        </div>

                        {v.departure_location && (
                          <div className="flex items-center gap-1 text-[11px] text-foreground font-medium">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span>Pickup / Meeting Spot: <strong>{v.departure_location}</strong></span>
                          </div>
                        )}

                        {v.departure_message && (
                          <p className="text-[11px] text-foreground/90 italic bg-background/50 p-1.5 rounded border border-border/40">
                            "{v.departure_message}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                          <span>Broadcast by: {v.departure_updated_by || v.assigned_driver}</span>
                          <span>{available} seats open</span>
                        </div>
                      </div>
                    )}

                    {/* Visual Vehicle Seat Map */}
                    <div className="rounded-lg bg-muted/20 border border-border/60 p-3 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>
                          {isAttendeeView ? "Seating Architecture (Click Seat to Claim)" : "Interactive Seating Map (Click Seat to Assign)"}
                        </span>
                        <span>Front / Windshield ➔</span>
                      </div>

                      {v.seat_layout && v.seat_layout.length > 0 ? (
                        <div className="space-y-2.5 pt-1">
                          {v.seat_layout.map((row) => (
                            <div key={row.row} className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground w-12 shrink-0">Row {row.row}:</span>
                              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                                {row.seats.map((seat) => {
                                  const isUserSeat =
                                    v.user_assigned_seat?.row === row.row &&
                                    v.user_assigned_seat?.position === seat.position;
                                  const isSeatAvailable =
                                    (seat.occupant || "").toLowerCase() === "available" ||
                                    (seat.occupant || "").toLowerCase() === "empty" ||
                                    !seat.occupant;

                                  return (
                                    <button
                                      key={seat.position}
                                      type="button"
                                      onClick={() => {
                                        if (isAttendeeView) {
                                          if (isSeatAvailable) {
                                            checkInMutation.mutate({
                                              vehicleId: v.id,
                                              payload: {
                                                passenger_name: effectiveName || "Traveler",
                                                seat_position: seat.position,
                                                row_number: row.row,
                                                action: "check_in",
                                              },
                                            });
                                          } else if (isUserSeat) {
                                            checkInMutation.mutate({
                                              vehicleId: v.id,
                                              payload: {
                                                passenger_name: effectiveName || "Traveler",
                                                action: "check_out",
                                              },
                                            });
                                          }
                                          return;
                                        }
                                        setSelectedVehicle(v);
                                        setSelectedSeat({ row: row.row, seat });
                                        setAssigneeName("");
                                        setIsAssignModalOpen(true);
                                      }}
                                      className={`px-2 py-1 rounded text-xs border font-medium transition-all text-left flex items-center gap-1.5 ${getSeatBadgeColor(
                                        seat,
                                        isUserSeat
                                      )} ${isAttendeeView && isSeatAvailable ? "hover:scale-105 hover:border-emerald-400 cursor-pointer" : ""}`}
                                      title={`Seat ${seat.position}: ${seat.occupant}`}
                                    >
                                      <span className="font-bold opacity-80">{seat.position}</span>
                                      <span className="truncate max-w-[110px]">
                                        {isUserSeat ? "★ You" : seat.occupant}
                                      </span>
                                    </button>
                                  );
                                })}
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

                    {/* Action Bar: Check-In to Car & Broadcast Departure */}
                    {(() => {
                      const isCurrentPassenger = Boolean(
                        hasMySeat ||
                          (v.current_passengers || []).some(
                            (p) =>
                              p.toLowerCase().includes((effectiveName || "").toLowerCase()) ||
                              (effectiveName && p.toLowerCase().includes(effectiveName.split(" ")[0].toLowerCase()))
                          )
                      );

                      const canBroadcastThisVehicle = Boolean(
                        isActualLeader ||
                          !isAttendeeView ||
                          (v.assigned_driver &&
                            effectiveName &&
                            v.assigned_driver.toLowerCase().includes(effectiveName.toLowerCase().split(" ")[0]))
                      );

                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                          {/* Check-In / Boarding Button for Travelers */}
                          <div className="flex items-center gap-2">
                            {isCurrentPassenger ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs py-1 px-2.5 flex items-center gap-1">
                                  <CheckCheck className="h-3.5 w-3.5" />
                                  <span>Checked In (Riding This Car)</span>
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    checkInMutation.mutate({
                                      vehicleId: v.id,
                                      payload: {
                                        passenger_name: effectiveName || "Traveler",
                                        action: "check_out",
                                      },
                                    })
                                  }
                                  disabled={checkInMutation.isPending}
                                  className="text-xs h-8 text-muted-foreground hover:text-destructive"
                                >
                                  <LogOut className="h-3 w-3 mr-1" />
                                  Leave Car
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                disabled={available <= 0 || checkInMutation.isPending}
                                onClick={() =>
                                  checkInMutation.mutate({
                                    vehicleId: v.id,
                                    payload: {
                                      passenger_name: effectiveName || "Traveler",
                                      action: "check_in",
                                    },
                                  })
                                }
                                className={`text-xs h-8 gap-1.5 font-semibold shadow-xs ${
                                  available > 0
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "opacity-60 cursor-not-allowed"
                                }`}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>{available > 0 ? "Check In to This Car" : "Car is Full"}</span>
                              </Button>
                            )}
                          </div>

                          {/* Driver Departure Broadcast Button */}
                          {(canBroadcastThisVehicle || !isAttendeeView) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenBroadcastModal(v)}
                              className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 ml-auto"
                            >
                              <Megaphone className="h-3.5 w-3.5" />
                              <span>Broadcast Departure</span>
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Seat Assignment Dialog (Only for Dispatchers / Leadership) */}
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
        <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Car className="h-5 w-5" />
              </div>
              <span>Add Vehicle to Ground Fleet</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Register a new SUV, executive van, or passenger shuttle linked to a specific travel trip.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Library Auto-Complete Preset Bar */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2.5 mt-1 shadow-xs">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                ⚡ Auto-Complete from Vehicle Spec Library
              </Label>
              <Badge variant="outline" className="text-xs font-semibold bg-primary/10 border-primary/30 text-primary px-2.5 py-0.5">
                1-Click Presets
              </Badge>
            </div>
            <select
              value={selectedPresetIndex}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full rounded-lg border border-primary/30 bg-background px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="">-- Choose a vehicle preset from library to auto-fill --</option>
              {Object.entries(
                FLEET_PRESETS.reduce<Record<string, { preset: FleetPreset; index: number }[]>>((acc, p, idx) => {
                  acc[p.category] = acc[p.category] || [];
                  acc[p.category].push({ preset: p, index: idx });
                  return acc;
                }, {})
              ).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map(({ preset, index }) => (
                    <option key={preset.name} value={String(index)}>
                      {preset.make} {preset.model} ({preset.seating_capacity} Seats • {preset.cargo_cases_capacity} Cases • ${preset.daily_rate_usd}/day)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {autoDetectNotice && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 pt-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{autoDetectNotice}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 text-sm">
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs font-medium">Assign to Trip / Event</Label>
              <select
                value={newVehicle.assigned_event_id}
                onChange={(e) => setNewVehicle({ ...newVehicle, assigned_event_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 h-10"
              >
                {eventsList.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.location})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs font-medium">Vehicle Display Name</Label>
              <Input
                value={newVehicle.vehicle_name}
                onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_name: e.target.value })}
                className="mt-1 h-10"
                placeholder="e.g. Executive Suburban 1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Make</Label>
              <Input
                list="preset-makes-list"
                value={newVehicle.make}
                onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                className="mt-1 h-10"
                placeholder="e.g. Chevrolet"
              />
              <datalist id="preset-makes-list">
                {COMMON_MAKES.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Model</Label>
                <button
                  type="button"
                  onClick={() => handleAutoDetectSpecs()}
                  disabled={isAutoDetectingSpecs}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
                  title="Query Vehicle Spec Library for Seating & Pelican Capacity"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isAutoDetectingSpecs ? "Detecting..." : "Auto-Detect Specs"}
                </button>
              </div>
              <Input
                list="preset-models-list"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="mt-1 h-10"
                placeholder="e.g. Suburban High Country"
              />
              <datalist id="preset-models-list">
                {COMMON_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-xs font-medium">Seating Capacity (Amount of Seats)</Label>
              <Input
                type="number"
                min={2}
                max={20}
                value={newVehicle.seating_capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, seating_capacity: parseInt(e.target.value) || 7 })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Cargo Cases Capacity</Label>
              <Input
                type="number"
                min={0}
                max={15}
                value={newVehicle.cargo_cases_capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, cargo_cases_capacity: parseInt(e.target.value) || 4 })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Rental Agency</Label>
              <Input
                value={newVehicle.rental_agency}
                onChange={(e) => setNewVehicle({ ...newVehicle, rental_agency: e.target.value })}
                className="mt-1 h-10"
                placeholder="e.g. National Emerald Club"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Assigned Driver / Lead</Label>
              <Input
                value={newVehicle.assigned_driver}
                onChange={(e) => setNewVehicle({ ...newVehicle, assigned_driver: e.target.value })}
                className="mt-1 h-10"
                placeholder="e.g. Pat (Operations)"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Daily Rate ($ USD)</Label>
              <Input
                type="number"
                value={newVehicle.daily_rate_usd}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  setNewVehicle({ ...newVehicle, daily_rate_usd: rate, total_cost_usd: rate * 5 });
                }}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Total Est. Cost ($ USD)</Label>
              <Input
                type="number"
                value={newVehicle.total_cost_usd}
                onChange={(e) => setNewVehicle({ ...newVehicle, total_cost_usd: parseFloat(e.target.value) || 0 })}
                className="mt-1 h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button variant="outline" className="px-5" onClick={() => setIsAddVehicleOpen(false)}>
              Cancel
            </Button>
            <Button
              className="px-6"
              onClick={() => {
                createVehicleMutation.mutate({
                  ...newVehicle,
                  assigned_event_id: newVehicle.assigned_event_id || eventsList[0]?.id || null,
                });
              }}
              disabled={createVehicleMutation.isPending}
            >
              Save Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Vehicle Departure / Loading Alert Modal */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <span>Broadcast Departure Alert</span>
            </DialogTitle>
            <DialogDescription>
              Notify everyone registered for{" "}
              <strong>{broadcastVehicle?.event_title || "this trip"}</strong> that you are loading up or departing so they can check into this vehicle.
            </DialogDescription>
          </DialogHeader>

          {broadcastVehicle && (
            <form onSubmit={handleSendBroadcast} className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1 border border-border/50">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>{broadcastVehicle.vehicle_name}</span>
                  <Badge variant="outline">{broadcastVehicle.seating_capacity} Total Seats</Badge>
                </div>
                <div className="text-muted-foreground">
                  Assigned Driver: <strong className="text-foreground">{broadcastVehicle.assigned_driver}</strong>
                </div>
                <div className="text-muted-foreground">
                  Trip / Event: <strong className="text-foreground">{broadcastVehicle.event_title || "General Expedition"}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Departure Status</Label>
                <select
                  value={depStatus}
                  onChange={(e) => setDepStatus(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs"
                >
                  <option value="loading_up">🟢 Loading Up / Boarding Open (Leaving in 10-15m)</option>
                  <option value="leaving_soon">🟡 Final Call — Leaving in 5 Minutes!</option>
                  <option value="en_route">🔵 En Route / Wheels Up (Departed Venue)</option>
                  <option value="arrived">🏁 Arrived at Destination</option>
                  <option value="cancelled">🛑 Departure Delayed / Rescheduled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pickup / Loading Spot</Label>
                <Input
                  required
                  value={depLocation}
                  onChange={(e) => setDepLocation(e.target.value)}
                  placeholder="e.g. Main Convention Gate / West Paddock Bay 3"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Departure Countdown / Time</Label>
                <Input
                  required
                  value={depTime}
                  onChange={(e) => setDepTime(e.target.value)}
                  placeholder="e.g. In 10 minutes (17:45)"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Custom Broadcast Message</Label>
                <Input
                  value={depMessage}
                  onChange={(e) => setDepMessage(e.target.value)}
                  placeholder="e.g. Loading gear and pelican cases. Check in now if you need a ride!"
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 rounded bg-primary/10 border border-primary/20 text-[11px] text-primary flex items-start gap-2">
                <Bell className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This notification will be dispatched instantly to all travelers registered on{" "}
                  <strong>{broadcastVehicle.event_title || "this trip"}</strong> so they can view seats and check in.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={broadcastDepartureMutation.isPending}
                  className="text-xs gap-1.5 font-semibold bg-primary text-primary-foreground"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {broadcastDepartureMutation.isPending ? "Broadcasting..." : "Send Departure Alert"}
                  </span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
