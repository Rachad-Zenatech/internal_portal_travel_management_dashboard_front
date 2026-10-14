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
import {
  ALL_VEHICLE_MAKES,
  getModelsForMake,
  getDefaultRateForMake,
  resolveVehicleSpecs,
  formatVehicleName,
} from "@/data/vehicleCatalog";



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

  // Fetch executive & staff personnel dynamically from PostgreSQL
  const { data: dbExecutives = [] } = useQuery({
    queryKey: ["travelExecutives"],
    queryFn: travelService.getExecutives,
  });

  // Fetch corporate vehicle catalog & rate benchmarks dynamically from PostgreSQL
  const { data: dbVehicleCatalog } = useQuery({
    queryKey: ["dbVehicleCatalog"],
    queryFn: travelService.getVehicleCatalog,
  });

  const availableMakes = dbVehicleCatalog?.makes?.map((m) => m.make) || ALL_VEHICLE_MAKES;
  const commonModels = dbVehicleCatalog?.common_models || [];

  const dynamicExecTravelers = dbExecutives.map(
    (e) => `${e.name} (${e.title || "Company Personnel"})`
  );

  // Compute available travelers for this specific vehicle/trip
  const tripAttendees = (selectedVehicleEvent?.attendees || []).map(
    (a) => `${a.attendee_name} (${a.role_in_event || "Traveler"} - ${a.attendance_status})`
  );

  const availableAssignees = [
    ...tripAttendees,
    ...dynamicExecTravelers.filter((exec) => !tripAttendees.some((att) => att.includes(exec.split(" ")[0]))),
    "Pelican Drone Case #1 (Sensors)",
    "Pelican LiPo Battery Case (Hazmat/Dry)",
    "Available (Vacant Seat)",
  ];

  // Add Vehicle Dialog State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAutoDetectingSpecs, setIsAutoDetectingSpecs] = useState(false);
  const [dynamicNhtsaModels, setDynamicNhtsaModels] = useState<string[]>([]);

  // Reassign Driver Modal State for existing fleet vehicles
  const [isReassignDriverModalOpen, setIsReassignDriverModalOpen] = useState(false);
  const [reassignDriverVehicle, setReassignDriverVehicle] = useState<TravelVehicle | null>(null);
  const [reassignDriverName, setReassignDriverName] = useState("");

  const [newVehicle, setNewVehicle] = useState({
    vehicle_name: formatVehicleName("Chevrolet", "Suburban High Country", 8),
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

  // Fetch event details for the event currently selected in Add Vehicle modal
  const { data: addVehicleSelectedEvent } = useQuery({
    queryKey: ["travelEventDetails", newVehicle.assigned_event_id],
    queryFn: () =>
      newVehicle.assigned_event_id
        ? travelService.getEvent(newVehicle.assigned_event_id)
        : Promise.resolve(null),
    enabled: !!newVehicle.assigned_event_id,
  });

  // Fetch event details for the vehicle being reassigned a driver
  const { data: reassignVehicleEvent } = useQuery({
    queryKey: ["travelEventDetails", reassignDriverVehicle?.assigned_event_id],
    queryFn: () =>
      reassignDriverVehicle?.assigned_event_id
        ? travelService.getEvent(reassignDriverVehicle.assigned_event_id)
        : Promise.resolve(null),
    enabled: !!reassignDriverVehicle?.assigned_event_id,
  });

  // Dedicated fleet operations chauffeurs & dispatchers
  const DEDICATED_CHAUFFEURS = [
    { name: "Marcus Vance", label: "Marcus Vance (Tactical Fleet Ops Chauffeur)" },
    { name: "Pat (Operations)", label: "Pat (Ground Dispatch Coordinator)" },
    { name: "Professional Executive Chauffeur", label: "Professional Chauffeur (Hertz / National)" },
    { name: "VIP Chauffeur Service", label: "VIP Executive Chauffeur (Enterprise)" },
  ];

  // Candidates for Add Vehicle dialog driver autocomplete (deduplicated by lowercase name)
  const addVehicleDriverCandidates = Array.from(
    new Map(
      [
        ...DEDICATED_CHAUFFEURS,
        ...(addVehicleSelectedEvent?.event?.coordinator_name
          ? [{ name: addVehicleSelectedEvent.event.coordinator_name, label: `${addVehicleSelectedEvent.event.coordinator_name} (Trip Coordinator)` }]
          : []),
        ...(addVehicleSelectedEvent?.attendees || []).map((a) => ({
          name: a.attendee_name,
          label: `${a.attendee_name} (${a.role_in_event || "Trip Attendee"})`,
        })),
        ...dbExecutives.map((e) => ({
          name: e.name,
          label: `${e.name} (${e.title || "Executive Staff"})`,
        })),
      ].map((item) => [item.name.toLowerCase(), item])
    ).values()
  );

  // Candidates for Reassign Driver dialog autocomplete
  const reassignDriverCandidates = Array.from(
    new Map(
      [
        ...DEDICATED_CHAUFFEURS,
        ...(reassignVehicleEvent?.event?.coordinator_name
          ? [{ name: reassignVehicleEvent.event.coordinator_name, label: `${reassignVehicleEvent.event.coordinator_name} (Trip Coordinator)` }]
          : []),
        ...(reassignVehicleEvent?.attendees || []).map((a) => ({
          name: a.attendee_name,
          label: `${a.attendee_name} (${a.role_in_event || "Trip Attendee"})`,
        })),
        ...dbExecutives.map((e) => ({
          name: e.name,
          label: `${e.name} (${e.title || "Executive Staff"})`,
        })),
      ].map((item) => [item.name.toLowerCase(), item])
    ).values()
  );

  // Current make benchmark rate information from PostgreSQL or catalog
  const dbMakeInfo = dbVehicleCatalog?.makes?.find(
    (m) => m.make.toLowerCase() === newVehicle.make.trim().toLowerCase()
  );
  const currentMakeRateInfo = dbMakeInfo
    ? {
        defaultDailyRate: dbMakeInfo.default_daily_rate,
        rateRange: dbMakeInfo.rate_range,
        suggestedRates: dbMakeInfo.suggested_rates,
      }
    : getDefaultRateForMake(newVehicle.make);

  // Available models for currently selected make from PostgreSQL or catalog
  const dbModelsForMake = (dbVehicleCatalog?.models || [])
    .filter((m) => m.make.toLowerCase() === newVehicle.make.trim().toLowerCase())
    .map((m) => ({
      model: m.model,
      seats: m.seating_capacity,
      cargoCases: m.cargo_cases_capacity,
      vehicleClass: m.vehicle_class,
      dailyRate: m.default_daily_rate,
      agency: m.preferred_agency,
    }));
  const catalogModelsForMake = dbModelsForMake.length > 0 ? dbModelsForMake : getModelsForMake(newVehicle.make);

  const availableModelOptions = Array.from(
    new Set([
      ...catalogModelsForMake.map((m) => m.model),
      ...dynamicNhtsaModels,
      ...commonModels,
    ])
  );

  // 1. User types or chooses Make -> automatically suggests rate & loads models & updates vehicle name
  const handleMakeChange = (makeVal: string) => {
    const dbFound = dbVehicleCatalog?.makes?.find((m) => m.make.toLowerCase() === makeVal.trim().toLowerCase());
    const rateData = dbFound
      ? {
          defaultDailyRate: dbFound.default_daily_rate,
          rateRange: dbFound.rate_range,
          suggestedRates: dbFound.suggested_rates,
        }
      : getDefaultRateForMake(makeVal);

    setNewVehicle((prev) => ({
      ...prev,
      make: makeVal,
      vehicle_name: formatVehicleName(makeVal, prev.model, prev.seating_capacity),
      daily_rate_usd: rateData.defaultDailyRate,
      total_cost_usd: rateData.defaultDailyRate * 5,
    }));

    // Dynamically fetch NHTSA models for this make if length >= 3
    if (makeVal.trim().length >= 3) {
      travelService
        .getVehicleModels(makeVal.trim())
        .then((models) => {
          if (Array.isArray(models) && models.length > 0) {
            setDynamicNhtsaModels(models);
          }
        })
        .catch(() => {});
    } else {
      setDynamicNhtsaModels([]);
    }

  };

  // 2. User types or chooses Model -> AUTOMATICALLY sets seating capacity, cargo & vehicle name!
  const handleModelChange = (modelVal: string) => {
    const cleanModel = modelVal.trim();
    const resolved = resolveVehicleSpecs(newVehicle.make, cleanModel);

    if (resolved && cleanModel.length >= 2) {
      setNewVehicle((prev) => ({
        ...prev,
        model: modelVal,
        seating_capacity: resolved.seats,
        cargo_cases_capacity: resolved.cargoCases,
        vehicle_class: resolved.vehicleClass,
        vehicle_name: formatVehicleName(newVehicle.make, modelVal, resolved.seats),
        daily_rate_usd: resolved.dailyRate || prev.daily_rate_usd,
        total_cost_usd: (resolved.dailyRate || prev.daily_rate_usd) * 5,
        rental_agency: resolved.agency || prev.rental_agency,
      }));
    } else {
      setNewVehicle((prev) => ({
        ...prev,
        model: modelVal,
        vehicle_name: formatVehicleName(newVehicle.make, modelVal, prev.seating_capacity),
      }));
    }

    // Debounced live NHTSA query for custom or specific trims
    if (newVehicle.make && cleanModel.length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const live = await travelService.lookupVehicleSpecs({
            make: newVehicle.make,
            model: cleanModel,
          });
          if (live && live.amount_of_seats) {
            setNewVehicle((prev) => ({
              ...prev,
              seating_capacity: live.amount_of_seats,
              cargo_cases_capacity: live.cargo_pelican_capacity,
              vehicle_class: live.vehicle_class,
              vehicle_name: formatVehicleName(newVehicle.make, cleanModel, live.amount_of_seats),
              seat_layout: live.default_seat_layout,
            }));
          }
        } catch {
          // Keep local catalog result
        }
      }, 500);
      return () => clearTimeout(timer);
    }
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
        vehicle_name: formatVehicleName(res.make, res.model || prev.model, res.amount_of_seats),
        seat_layout: res.default_seat_layout,
      }));
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
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsAddVehicleOpen(false);
      toast.success("Vehicle registered and driver assigned to Seat 1A!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create vehicle");
    },
  });

  // Assign/Reassign Driver Mutation
  const assignDriverMutation = useMutation({
    mutationFn: ({ vehicleId, driverName }: { vehicleId: string; driverName: string }) =>
      travelService.assignVehicleDriver(vehicleId, driverName),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsReassignDriverModalOpen(false);
      setReassignDriverVehicle(null);
      toast.success(res.message || "Assigned driver updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update assigned driver");
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
                      <span className="flex items-center gap-1.5">
                        <strong className="text-foreground/80">Driver:</strong>
                        <span className="font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 text-[11px]">
                          {v.assigned_driver || "Unassigned"}
                        </span>
                        {!isAttendeeView && (
                          <button
                            type="button"
                            onClick={() => {
                              setReassignDriverVehicle(v);
                              setReassignDriverName(v.assigned_driver || "");
                              setIsReassignDriverModalOpen(true);
                            }}
                            className="text-[11px] text-primary hover:underline font-semibold ml-0.5 cursor-pointer"
                            title="Reassign or change designated vehicle driver"
                          >
                            Reassign
                          </button>
                        )}
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
                  <optgroup label="Executive & Corporate Travelers (from Database)">
                    {dynamicExecTravelers.map((t) => (
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Vehicle Display Name</Label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  ⚡ Auto-named from Make + Model + Capacity
                </span>
              </div>
              <Input
                value={newVehicle.vehicle_name}
                onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_name: e.target.value })}
                className="mt-1 h-10 font-semibold text-foreground"
                placeholder="e.g. Chevrolet Suburban High Country (8 Seats)"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Make</Label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {availableMakes.length}+ Global Brands (PostgreSQL DB)
                </span>
              </div>
              <Input
                list="all-vehicle-makes-list"
                value={newVehicle.make}
                onChange={(e) => handleMakeChange(e.target.value)}
                className="mt-1 h-10"
                placeholder="e.g. Chevrolet, Ford, Cadillac..."
              />
              <datalist id="all-vehicle-makes-list">
                {availableMakes.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                <span>⚡ Rate benchmark:</span>
                <span className="font-semibold text-primary">
                  ${currentMakeRateInfo.defaultDailyRate}/day ({currentMakeRateInfo.rateRange})
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Model</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ⚡ Auto-sets seats & cargo
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoDetectSpecs()}
                    disabled={isAutoDetectingSpecs}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
                    title="Query Vehicle Spec Library for Seating & Pelican Capacity"
                  >
                    <Sparkles className="h-3 w-3" />
                    {isAutoDetectingSpecs ? "Detecting..." : "Detect"}
                  </button>
                </div>
              </div>
              <Input
                list="dynamic-models-list"
                value={newVehicle.model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="mt-1 h-10"
                placeholder={
                  newVehicle.make
                    ? `Pick or type a ${newVehicle.make} model...`
                    : "e.g. Suburban High Country"
                }
              />
              <datalist id="dynamic-models-list">
                {/* 1. Curated models for this make with detailed capacity badges */}
                {catalogModelsForMake.map((m) => (
                  <option
                    key={m.model}
                    value={m.model}
                    label={`${m.seats} Seats • ${m.cargoCases} Pelican Cases • $${m.dailyRate}/day`}
                  />
                ))}
                {/* 2. Additional models from catalog and NHTSA API */}
                {availableModelOptions
                  .filter((dm) => !catalogModelsForMake.some((cm) => cm.model.toLowerCase() === dm.toLowerCase()))
                  .map((dm) => (
                    <option key={dm} value={dm} label={`${newVehicle.make} Model`} />
                  ))}
              </datalist>
              <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                <span>Selected:</span>
                <span className="font-semibold text-foreground">
                  {newVehicle.model || "None selected"} ({newVehicle.seating_capacity} Seats)
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Seating Capacity (Amount of Seats)</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  ✓ Auto-set ({newVehicle.seating_capacity} Seats)
                </span>
              </div>
              <Input
                type="number"
                min={2}
                max={20}
                value={newVehicle.seating_capacity}
                onChange={(e) => {
                  const cap = parseInt(e.target.value) || 0;
                  setNewVehicle((prev) => ({
                    ...prev,
                    seating_capacity: cap,
                    vehicle_name: formatVehicleName(prev.make, prev.model, cap),
                  }));
                }}
                className="mt-1 h-10 font-semibold"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Cargo Cases Capacity</Label>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Pelican / Flight Cases
                </span>
              </div>
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
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Assigned Driver / Lead</Label>
                <span className="text-[10px] text-primary font-medium">
                  ⚡ Auto-assigns to Seat 1A
                </span>
              </div>
              <Input
                list="add-vehicle-drivers-list"
                value={newVehicle.assigned_driver}
                onChange={(e) => setNewVehicle({ ...newVehicle, assigned_driver: e.target.value })}
                className="mt-1 h-10 font-medium"
                placeholder="Type or select driver from trip roster or fleet..."
              />
              <datalist id="add-vehicle-drivers-list">
                {addVehicleDriverCandidates.map((d) => (
                  <option key={d.name} value={d.name} label={d.label} />
                ))}
              </datalist>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-muted-foreground mr-0.5">Quick pick:</span>
                {DEDICATED_CHAUFFEURS.slice(0, 2).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setNewVehicle({ ...newVehicle, assigned_driver: c.name })}
                    className={`px-2 py-0.5 rounded-md border transition-all ${
                      newVehicle.assigned_driver === c.name
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                {addVehicleSelectedEvent?.event?.coordinator_name && (
                  <button
                    type="button"
                    onClick={() => setNewVehicle({ ...newVehicle, assigned_driver: addVehicleSelectedEvent.event.coordinator_name! })}
                    className={`px-2 py-0.5 rounded-md border transition-all ${
                      newVehicle.assigned_driver === addVehicleSelectedEvent.event.coordinator_name
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                    }`}
                  >
                    Coord: {addVehicleSelectedEvent.event.coordinator_name.split(" ")[0]}
                  </button>
                )}
                {addVehicleSelectedEvent?.attendees && addVehicleSelectedEvent.attendees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNewVehicle({ ...newVehicle, assigned_driver: addVehicleSelectedEvent.attendees[0].attendee_name })}
                    className={`px-2 py-0.5 rounded-md border transition-all ${
                      newVehicle.assigned_driver === addVehicleSelectedEvent.attendees[0].attendee_name
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                    }`}
                  >
                    Attendee: {addVehicleSelectedEvent.attendees[0].attendee_name.split(" ")[0]}
                  </button>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Daily Rate ($ USD)</Label>
                <span className="text-[11px] text-primary font-medium">
                  ⚡ Auto-suggested
                </span>
              </div>
              <Input
                list="suggested-rates-list"
                type="number"
                value={newVehicle.daily_rate_usd}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 0;
                  setNewVehicle({ ...newVehicle, daily_rate_usd: rate, total_cost_usd: rate * 5 });
                }}
                className="mt-1 h-10"
              />
              <datalist id="suggested-rates-list">
                {currentMakeRateInfo.suggestedRates.map((r, i) => (
                  <option
                    key={r}
                    value={r}
                    label={`$${r}/day (${i === 0 ? "Fleet Discount" : i === 1 ? "Standard Corporate" : i === 2 ? "High Demand" : "VIP Chauffeur"})`}
                  />
                ))}
              </datalist>
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

      {/* Reassign Vehicle Driver Modal */}
      <Dialog open={isReassignDriverModalOpen} onOpenChange={setIsReassignDriverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <span>Assign / Change Vehicle Driver</span>
            </DialogTitle>
            <DialogDescription>
              Assign a certified lead, confirmed trip attendee, or professional chauffeur to drive{" "}
              <strong>{reassignDriverVehicle?.vehicle_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {reassignDriverVehicle && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1.5 border border-border/50">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>{reassignDriverVehicle.vehicle_name}</span>
                  <Badge variant="outline">{reassignDriverVehicle.seating_capacity} Seats</Badge>
                </div>
                <div className="text-muted-foreground">
                  Current Driver: <strong className="text-foreground">{reassignDriverVehicle.assigned_driver || "Unassigned"}</strong>
                </div>
                <div className="text-muted-foreground">
                  Assigned Trip: <strong className="text-foreground">{reassignDriverVehicle.event_title || "General Expedition"}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Select or Type Driver Name</Label>
                  <span className="text-[11px] text-primary font-medium">⚡ Syncs with Seat 1A</span>
                </div>
                <Input
                  list="reassign-driver-autocomplete-list"
                  value={reassignDriverName}
                  onChange={(e) => setReassignDriverName(e.target.value)}
                  placeholder="Search attendee, executive, or chauffeur..."
                  className="h-10 text-xs font-medium"
                />
                <datalist id="reassign-driver-autocomplete-list">
                  {reassignDriverCandidates.map((d) => (
                    <option key={d.name} value={d.name} label={d.label} />
                  ))}
                </datalist>

                {/* Quick select pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-[11px] text-muted-foreground mr-0.5">Quick pick:</span>
                  {DEDICATED_CHAUFFEURS.slice(0, 2).map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setReassignDriverName(c.name)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        reassignDriverName === c.name
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {reassignVehicleEvent?.event?.coordinator_name && (
                    <button
                      type="button"
                      onClick={() => setReassignDriverName(reassignVehicleEvent.event.coordinator_name!)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        reassignDriverName === reassignVehicleEvent.event.coordinator_name
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                      }`}
                    >
                      Coord: {reassignVehicleEvent.event.coordinator_name.split(" ")[0]}
                    </button>
                  )}
                  {reassignVehicleEvent?.attendees && reassignVehicleEvent.attendees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReassignDriverName(reassignVehicleEvent.attendees[0].attendee_name)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                        reassignDriverName === reassignVehicleEvent.attendees[0].attendee_name
                          ? "bg-primary text-primary-foreground border-primary font-semibold"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                      }`}
                    >
                      Attendee: {reassignVehicleEvent.attendees[0].attendee_name.split(" ")[0]}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setReassignDriverName("Unassigned Driver")}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    Clear Driver
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-primary/10 border border-primary/20 text-[11px] text-primary flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Updating the driver automatically allocates them into <strong>Row 1 Seat 1A (Driver Seat)</strong> on the interactive seating matrix and updates the passenger manifest.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReassignDriverModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!reassignDriverVehicle) return;
                    assignDriverMutation.mutate({
                      vehicleId: reassignDriverVehicle.id,
                      driverName: reassignDriverName.trim() || "Unassigned Driver",
                    });
                  }}
                  disabled={assignDriverMutation.isPending}
                  className="text-xs font-semibold"
                >
                  {assignDriverMutation.isPending ? "Assigning..." : "Save Assigned Driver"}
                </Button>
              </DialogFooter>
            </div>
          )}
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
