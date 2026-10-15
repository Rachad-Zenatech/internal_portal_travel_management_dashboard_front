import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import type { EventAttendee } from "@/types/travel";
import {
  Calendar,
  Users,
  MapPin,
  Plus,
  Trash2,
  Plane,
  Hotel,
  Package,
  Luggage,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Car,
  Radio,
  Megaphone,
  Send,
  Bell,
  Clock,
  UserCheck,
  CheckCheck,
  LogOut,
  Copy,
  Check,
  ArrowRight,
  Ticket,
  Search,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TravelEventsPage() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddAttendeeModalOpen, setIsAddAttendeeModalOpen] = useState(false);
  const [isAddLuggageModalOpen, setIsAddLuggageModalOpen] = useState(false);

  // Form states for new special luggage
  const [lugCaseCode, setLugCaseCode] = useState("PEL-1650-01");
  const [lugCaseName, setLugCaseName] = useState("Pelican 1650 Drone Frame Case");
  const [lugClassification, setLugClassification] = useState("oversized_hard_case");
  const [lugCarrierAirline, setLugCarrierAirline] = useState("Delta Air Lines");
  const [lugBaggageTag, setLugBaggageTag] = useState("");
  const [lugTrackingNo, setLugTrackingNo] = useState("");
  const [lugDimensions, setLugDimensions] = useState("75 x 48 x 32");
  const [lugGrossWeightKg, setLugGrossWeightKg] = useState(21.5);
  const [lugMaxAllowanceKg, setLugMaxAllowanceKg] = useState(23.0);
  const [lugExcessFee, setLugExcessFee] = useState(0.0);
  const [lugIataLipoCompliant, setLugIataLipoCompliant] = useState(true);
  const [lugCarnet, setLugCarnet] = useState("");
  const [lugCustodianName, setLugCustodianName] = useState("");
  const [lugCustodianEmail, setLugCustodianEmail] = useState("");
  const [lugStatus, setLugStatus] = useState<
    "packed" | "checked_in" | "in_transit" | "customs_inspected" | "delivered_at_venue" | "returned"
  >("packed");
  const [lugHandlingInstructions, setLugHandlingInstructions] = useState(
    "Fragile carbon-fiber combat frames. Keep upright in climate-controlled cargo."
  );

  // Form states for new event
  const [newTitle, setNewTitle] = useState("");
  const [newEventType, setNewEventType] = useState("drone_combat");
  const [newLocation, setNewLocation] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newCoordinator, setNewCoordinator] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Form states for new attendee
  const [attName, setAttName] = useState("");
  const [attEmail, setAttEmail] = useState("");
  const [attRole, setAttRole] = useState("Lead Combat Pilot");
  const [attStatus, setAttStatus] = useState<"confirmed" | "tentative" | "declined">("confirmed");
  const [attFlight, setAttFlight] = useState("");
  const [attLodging, setAttLodging] = useState("");
  const [attStipend, setAttStipend] = useState(450.0);
  const [attLuggage, setAttLuggage] = useState("");
  const [attNotes, setAttNotes] = useState("");

  // Flight Manifest & Co-Traveler Plane States
  const [flightSearchTerm, setFlightSearchTerm] = useState("");
  const [flightFilterAirline, setFlightFilterAirline] = useState<string>("all");
  const [isEditFlightModalOpen, setIsEditFlightModalOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<EventAttendee | null>(null);
  const [editCarrierAirline, setEditCarrierAirline] = useState("Air Canada");
  const [editFlightNumbers, setEditFlightNumbers] = useState("");
  const [editSeatAssignment, setEditSeatAssignment] = useState("");
  const [editBookingRef, setEditBookingRef] = useState("");
  const [editOriginCity, setEditOriginCity] = useState("");
  const [editDestinationCity, setEditDestinationCity] = useState("");
  const [editLodging, setEditLodging] = useState("");
  const [activeManifestTab, setActiveManifestTab] = useState<"flights" | "roster">("flights");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingAsAttendeeId, setViewingAsAttendeeId] = useState<string | null>(null);

  const { user } = useAuth();
  const [broadcastVehicle, setBroadcastVehicle] = useState<any>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [depStatus, setDepStatus] = useState<"loading_up" | "leaving_soon" | "en_route" | "arrived" | "cancelled">("loading_up");
  const [depLocation, setDepLocation] = useState("Main Venue Exit / West Gate");
  const [depTime, setDepTime] = useState("In 10 minutes");
  const [depMessage, setDepMessage] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  const { data: eventDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["travelEventDetails", selectedEventId],
    queryFn: () => (selectedEventId ? travelService.getEvent(selectedEventId) : null),
    enabled: !!selectedEventId,
  });

  const { data: eventVehicles = [] } = useQuery({
    queryKey: ["travelVehiclesForEvent", selectedEventId],
    queryFn: () =>
      selectedEventId
        ? travelService.getVehicles({ eventId: selectedEventId, isAdminOverride: true })
        : Promise.resolve([]),
    enabled: !!selectedEventId,
  });

  const broadcastDepartureMutation = useMutation({
    mutationFn: ({ vehicleId, payload }: { vehicleId: string; payload: any }) =>
      travelService.broadcastVehicleDeparture(vehicleId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["travelVehiclesForEvent", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsBroadcastModalOpen(false);
      toast.success(res.message || "Departure alert sent to all trip attendees!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to broadcast departure notification");
    },
  });

  const checkInMutation = useMutation({
    mutationFn: ({ vehicleId, payload }: { vehicleId: string; payload: any }) =>
      travelService.checkInToVehicle(vehicleId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["travelVehiclesForEvent", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["travelVehicles"] });
      toast.success(res.message || "You have updated your vehicle check-in!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to check in to vehicle");
    },
  });

  const updateFlightMutation = useMutation({
    mutationFn: ({ attendeeId, payload }: { attendeeId: string; payload: any }) =>
      travelService.updateAttendeeFlight(attendeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEventDetails", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["travelEvents"] });
      setIsEditFlightModalOpen(false);
      toast.success("Flight booking and plane info updated!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update flight booking");
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Flight information copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenEditFlight = (att: EventAttendee) => {
    setEditingAttendee(att);
    setEditCarrierAirline(att.carrier_airline || "Air Canada");
    setEditFlightNumbers(att.flight_numbers || att.flight_details || "");
    setEditSeatAssignment(att.seat_assignment || "");
    setEditBookingRef(att.booking_reference || "");
    setEditOriginCity(att.origin_city || "");
    setEditDestinationCity(att.destination_city || eventDetails?.event?.location || "");
    setEditLodging(att.lodging_details || "");
    setIsEditFlightModalOpen(true);
  };

  const handleSubmitEditFlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendee) return;
    updateFlightMutation.mutate({
      attendeeId: editingAttendee.id,
      payload: {
        carrier_airline: editCarrierAirline,
        flight_numbers: editFlightNumbers,
        seat_assignment: editSeatAssignment,
        booking_reference: editBookingRef,
        origin_city: editOriginCity,
        destination_city: editDestinationCity,
        lodging_details: editLodging,
      },
    });
  };

  const handleOpenBroadcastModal = (vehicle: any) => {
    setBroadcastVehicle(vehicle);
    setDepStatus(
      vehicle.departure_status && vehicle.departure_status !== "idle"
        ? vehicle.departure_status
        : "loading_up"
    );
    setDepLocation(vehicle.departure_location || "Main Venue Exit / West Gate");
    setDepTime(vehicle.departure_time || "In 10 minutes");
    setDepMessage(
      vehicle.departure_message ||
        `Loading gear and equipment now. Leaving the event in 10 minutes! Check in to reserve a seat.`
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

  const createEventMutation = useMutation({
    mutationFn: travelService.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEvents"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsCreateModalOpen(false);
      resetEventForm();
    },
  });

  const addAttendeeMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<EventAttendee> }) =>
      travelService.addAttendee(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEventDetails", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["travelEvents"] });
      setIsAddAttendeeModalOpen(false);
      resetAttendeeForm();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: travelService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEvents"] });
      if (selectedEventId) setSelectedEventId(null);
    },
  });

  const removeAttendeeMutation = useMutation({
    mutationFn: travelService.removeAttendee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEventDetails", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["travelEvents"] });
    },
  });

  const createLuggageMutation = useMutation({
    mutationFn: travelService.createSpecialLuggage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEventDetails", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["specialLuggage"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsAddLuggageModalOpen(false);
      resetLuggageForm();
      toast.success("Special luggage added to event manifest!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to add special luggage");
    },
  });

  const deleteLuggageMutation = useMutation({
    mutationFn: travelService.deleteSpecialLuggage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelEventDetails", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["specialLuggage"] });
      toast.success("Special luggage removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to remove luggage");
    },
  });

  const resetEventForm = () => {
    setNewTitle("");
    setNewEventType("drone_combat");
    setNewLocation("");
    setNewVenue("");
    setNewStartDate("");
    setNewEndDate("");
    setNewCoordinator("");
    setNewDescription("");
  };

  const resetAttendeeForm = () => {
    setAttName("");
    setAttEmail("");
    setAttRole("Lead Combat Pilot");
    setAttStatus("confirmed");
    setAttFlight("");
    setAttLodging("");
    setAttStipend(450.0);
    setAttLuggage("");
    setAttNotes("");
  };

  const resetLuggageForm = () => {
    setLugCaseCode(`PEL-${Math.floor(1000 + Math.random() * 9000)}`);
    setLugCaseName("Pelican 1650 Drone Frame Case");
    setLugClassification("oversized_hard_case");
    setLugCarrierAirline("Delta Air Lines");
    setLugBaggageTag("");
    setLugTrackingNo("");
    setLugDimensions("75 x 48 x 32");
    setLugGrossWeightKg(21.5);
    setLugMaxAllowanceKg(23.0);
    setLugExcessFee(0.0);
    setLugIataLipoCompliant(true);
    setLugCarnet("");
    setLugCustodianName("");
    setLugCustodianEmail("");
    setLugStatus("packed");
    setLugHandlingInstructions("Fragile electronics. Keep upright in climate-controlled cargo.");
  };

  const handleCreateLuggage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast.error("Please select an expedition event first");
      return;
    }
    createLuggageMutation.mutate({
      event_id: selectedEventId,
      case_code: lugCaseCode,
      case_name: lugCaseName,
      luggage_classification: lugClassification,
      carrier_airline: lugCarrierAirline,
      baggage_tag_number: lugBaggageTag,
      tracking_number: lugTrackingNo,
      dimensions_cm: lugDimensions,
      gross_weight_kg: Number(lugGrossWeightKg),
      max_airline_allowance_kg: Number(lugMaxAllowanceKg),
      excess_baggage_fee: Number(lugExcessFee),
      iata_lipo_compliant: Boolean(lugIataLipoCompliant),
      carnet_customs_declaration: lugCarnet,
      custodian_name: lugCustodianName || eventDetails?.event?.coordinator_name || user?.full_name || "Unassigned",
      custodian_email: lugCustodianEmail,
      status: lugStatus,
      handling_instructions: lugHandlingInstructions,
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEventMutation.mutate({
      title: newTitle,
      event_type: newEventType,
      location: newLocation,
      venue: newVenue,
      start_date: newStartDate,
      end_date: newEndDate,
      coordinator_name: newCoordinator,
      description: newDescription,
      status: "confirmed",
    });
  };

  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    addAttendeeMutation.mutate({
      eventId: selectedEventId,
      data: {
        attendee_name: attName,
        attendee_email: attEmail,
        role_in_event: attRole,
        attendance_status: attStatus,
        flight_details: attFlight,
        lodging_details: attLodging,
        stipend_amount: Number(attStipend),
        special_luggage_assigned: attLuggage,
        notes: attNotes,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Travel Events & Roster</h1>
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-200 dark:border-indigo-800">
              Who Is Going
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage official travel expeditions, drone dogfight competitions, flight arrangements, and team attendee rosters.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          <span>New Expedition Event</span>
        </Button>
      </div>

      {/* Grid of Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Events List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scheduled Expeditions ({events.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading travel events...</div>
          ) : events.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No expeditions scheduled yet. Click "New Expedition Event" to add one.
            </Card>
          ) : (
            events.map((event) => {
              const isSelected = selectedEventId === event.id || (!selectedEventId && events[0]?.id === event.id);
              if (!selectedEventId && events[0]?.id === event.id) {
                // Auto-select first event
                setSelectedEventId(event.id);
              }
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-border hover:border-border/80 hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      {event.event_type.replace("_", " ").toUpperCase()}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        event.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                          : "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800"
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">{event.title}</h3>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>
                        {event.start_date} → {event.end_date}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50 text-xs font-medium text-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        {event.attendees_count || 0} attending
                      </span>
                      <span>${(event.total_budget_allocated || 0).toLocaleString()} budget</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Event Details & "Who is Going" Roster */}
        <div className="lg:col-span-2">
          {isLoadingDetails ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Loading event details...</Card>
          ) : eventDetails ? (
            <div className="space-y-6">
              {/* Event Header Banner */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs uppercase bg-primary/10 text-primary border-primary/20">
                          {eventDetails.event.event_type.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {eventDetails.event.id.slice(0, 8)}...
                        </span>
                      </div>
                      <CardTitle className="text-xl font-bold">{eventDetails.event.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {eventDetails.event.venue ? `${eventDetails.event.venue}, ` : ""}
                          {eventDetails.event.location}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddAttendeeModalOpen(true)}
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Attendee</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteEventMutation.mutate(eventDetails.event.id)}
                        className="text-xs px-2.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground">{eventDetails.event.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Dates</span>
                      <span className="font-medium text-foreground">
                        {eventDetails.event.start_date} to {eventDetails.event.end_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Coordinator</span>
                      <span className="font-medium text-foreground">
                        {eventDetails.event.coordinator_name || "Unassigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Allocated Budget</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        ${(eventDetails.budgets?.[0]?.total_allocated || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Trip Transport</span>
                      <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                        <Car className="w-3.5 h-3.5 text-primary" />
                        <span>{eventVehicles.length} Vehicles</span>
                      </span>
                    </div>
                    <div
                      onClick={() => setIsAddLuggageModalOpen(true)}
                      className="cursor-pointer p-1.5 -m-1.5 rounded-lg border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all group"
                      title="Click to register special luggage for this expedition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground block text-[11px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium transition-colors">
                          Special Luggage
                        </span>
                        <Plus className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mt-0.5">
                        <Luggage className="w-3.5 h-3.5" />
                        <span>{eventDetails.special_luggage?.length || 0} Hard Cases</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 ml-1">
                          + Add
                        </span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>              {/* Trip Flight & Plane Coordination Manifest & Attendee Roster */}
              {(() => {
                const allAttendees = eventDetails.attendees || [];
                const activeViewerAttendee =
                  allAttendees.find((a) =>
                    viewingAsAttendeeId
                      ? a.id === viewingAsAttendeeId
                      : user?.email && a.attendee_email?.toLowerCase() === user?.email?.toLowerCase()
                  ) ||
                  allAttendees.find((a) => a.flight_numbers || a.carrier_airline) ||
                  allAttendees[0];

                const samePlaneCompanions =
                  activeViewerAttendee &&
                  (activeViewerAttendee.flight_numbers || activeViewerAttendee.carrier_airline)
                    ? allAttendees.filter(
                        (a) =>
                          a.id !== activeViewerAttendee.id &&
                          ((activeViewerAttendee.flight_numbers &&
                            a.flight_numbers &&
                            a.flight_numbers.replace(/\s+/g, "").toUpperCase() ===
                              activeViewerAttendee.flight_numbers.replace(/\s+/g, "").toUpperCase()) ||
                            (a.carrier_airline &&
                              activeViewerAttendee.carrier_airline &&
                              a.carrier_airline.toLowerCase() ===
                                activeViewerAttendee.carrier_airline.toLowerCase() &&
                              a.flight_numbers &&
                              activeViewerAttendee.flight_numbers &&
                              a.flight_numbers.slice(0, 5) ===
                                activeViewerAttendee.flight_numbers.slice(0, 5)))
                      )
                    : [];

                const attendeesWithFlights = allAttendees.filter(
                  (a) => a.flight_numbers || a.carrier_airline || a.booking_reference
                );

                const getAirlineBadgeStyle = (airline?: string | null) => {
                  const al = (airline || "").toLowerCase();
                  if (al.includes("delta")) {
                    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800";
                  }
                  if (al.includes("united")) {
                    return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800";
                  }
                  if (al.includes("air canada")) {
                    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800";
                  }
                  if (al.includes("american")) {
                    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800";
                  }
                  return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800";
                };

                const filteredAttendees = allAttendees.filter((attendee) => {
                  const matchesSearch =
                    !flightSearchTerm ||
                    attendee.attendee_name.toLowerCase().includes(flightSearchTerm.toLowerCase()) ||
                    attendee.attendee_email.toLowerCase().includes(flightSearchTerm.toLowerCase()) ||
                    (attendee.carrier_airline &&
                      attendee.carrier_airline.toLowerCase().includes(flightSearchTerm.toLowerCase())) ||
                    (attendee.flight_numbers &&
                      attendee.flight_numbers.toLowerCase().includes(flightSearchTerm.toLowerCase())) ||
                    (attendee.seat_assignment &&
                      attendee.seat_assignment.toLowerCase().includes(flightSearchTerm.toLowerCase())) ||
                    (attendee.booking_reference &&
                      attendee.booking_reference.toLowerCase().includes(flightSearchTerm.toLowerCase()));

                  if (!matchesSearch) return false;

                  if (flightFilterAirline === "same_plane") {
                    return (
                      attendee.id === activeViewerAttendee?.id ||
                      samePlaneCompanions.some((c) => c.id === attendee.id)
                    );
                  }
                  if (flightFilterAirline !== "all") {
                    return attendee.carrier_airline
                      ?.toLowerCase()
                      .includes(flightFilterAirline.toLowerCase());
                  }
                  return true;
                });

                return (
                  <Card className="border-border shadow-xs overflow-hidden">
                    {/* Header with Switchable Tabs */}
                    <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Plane className="w-5 h-5 text-sky-500" />
                            <CardTitle className="text-base font-bold text-foreground">
                              Trip Plane & Flight Coordination Manifest
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 text-[11px]"
                            >
                              {attendeesWithFlights.length} Flights Booked
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-0.5">
                            Real-time airline bookings, plane numbers, seat assignments, and co-traveler flight schedules for{" "}
                            <strong>{eventDetails.event.title}</strong>.
                          </CardDescription>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                          <div className="flex bg-muted p-1 rounded-lg border border-border text-xs">
                            <button
                              type="button"
                              onClick={() => setActiveManifestTab("flights")}
                              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                                activeManifestTab === "flights"
                                  ? "bg-background text-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Plane className="w-3.5 h-3.5 text-sky-500" />
                              <span>Flight Manifest ({attendeesWithFlights.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveManifestTab("roster")}
                              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                                activeManifestTab === "roster"
                                  ? "bg-background text-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Team Roster ({allAttendees.length})</span>
                            </button>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setIsAddAttendeeModalOpen(true)}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Traveler</span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-5">
                      {activeManifestTab === "flights" ? (
                        <>
                          {/* Viewer's Personal Flight & Boarding Pass Card */}
                          {activeViewerAttendee && (
                            <div className="rounded-xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/5 via-background to-indigo-500/5 p-4 shadow-xs relative overflow-hidden">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold shrink-0">
                                    <Ticket className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                        Your Flight & Boarding Pass
                                      </span>
                                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300">
                                        Confirmed
                                      </Badge>
                                    </div>
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                      <span>{activeViewerAttendee.attendee_name}</span>
                                      <span className="text-xs font-normal text-muted-foreground">
                                        ({activeViewerAttendee.role_in_event})
                                      </span>
                                    </h4>
                                  </div>
                                </div>

                                {/* Traveler Perspective Switcher */}
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                                    Viewing as:
                                  </span>
                                  <select
                                    value={activeViewerAttendee.id}
                                    onChange={(e) => setViewingAsAttendeeId(e.target.value)}
                                    className="text-xs rounded-md border border-input bg-background/80 px-2 py-1 shadow-xs focus:ring-1 focus:ring-sky-500"
                                  >
                                    {allAttendees.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.attendee_name} {a.flight_numbers ? `(${a.carrier_airline || "Flight"} ${a.flight_numbers})` : "(No flight)"}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Flight Details Row */}
                              {activeViewerAttendee.flight_numbers || activeViewerAttendee.carrier_airline ? (
                                <div className="mt-3.5 space-y-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card/60 p-3 rounded-lg border border-border/60">
                                    <div>
                                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                                        Carrier Airline
                                      </span>
                                      <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] font-semibold px-2 py-0.5 ${getAirlineBadgeStyle(
                                            activeViewerAttendee.carrier_airline
                                          )}`}
                                        >
                                          {activeViewerAttendee.carrier_airline || "Commercial Airline"}
                                        </Badge>
                                      </span>
                                    </div>

                                    <div>
                                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                                        Flight & Plane
                                      </span>
                                      <span className="text-sm font-bold text-foreground tracking-tight block mt-0.5">
                                        {activeViewerAttendee.flight_numbers || "Pending Flight"}
                                      </span>
                                    </div>

                                    <div>
                                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                                        Seat Assignment
                                      </span>
                                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 inline-block mt-0.5">
                                        💺 {activeViewerAttendee.seat_assignment || "Assigned at Gate"}
                                      </span>
                                    </div>

                                    <div>
                                      <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                                        Booking Ref (PNR)
                                      </span>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <code className="text-xs font-bold font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                                          {activeViewerAttendee.booking_reference || "N/A"}
                                        </code>
                                        {activeViewerAttendee.booking_reference && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              copyToClipboard(
                                                activeViewerAttendee.booking_reference!,
                                                `pnr-${activeViewerAttendee.id}`
                                              )
                                            }
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                            title="Copy Booking Reference"
                                          >
                                            {copiedId === `pnr-${activeViewerAttendee.id}` ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Route & Dates Bar */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {activeViewerAttendee.origin_city || "Departure Airport"}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5 text-sky-500" />
                                      <span className="font-semibold text-foreground">
                                        {activeViewerAttendee.destination_city || eventDetails.event.location}
                                      </span>
                                      {activeViewerAttendee.departure_date && (
                                        <span className="text-[11px] bg-muted px-2 py-0.5 rounded">
                                          📅 {activeViewerAttendee.departure_date}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenEditFlight(activeViewerAttendee)}
                                        className="h-7 text-xs gap-1 border-sky-500/30 hover:bg-sky-500/10"
                                      >
                                        <Edit3 className="w-3 h-3 text-sky-500" />
                                        <span>Update Plane / Seat</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          copyToClipboard(
                                            `${activeViewerAttendee.attendee_name} • ${activeViewerAttendee.carrier_airline} ${activeViewerAttendee.flight_numbers} • Seat ${activeViewerAttendee.seat_assignment} • Ref: ${activeViewerAttendee.booking_reference} • Route: ${activeViewerAttendee.origin_city} ➔ ${activeViewerAttendee.destination_city}`,
                                            `all-${activeViewerAttendee.id}`
                                          )
                                        }
                                        className="h-7 text-xs gap-1"
                                      >
                                        {copiedId === `all-${activeViewerAttendee.id}` ? (
                                          <Check className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>Share My Flight</span>
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Same-Plane Co-Travelers Banner */}
                                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                    <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      <span>
                                        Traveling on this exact plane with you ({samePlaneCompanions.length}{" "}
                                        {samePlaneCompanions.length === 1 ? "colleague" : "colleagues"}):
                                      </span>
                                    </div>
                                    {samePlaneCompanions.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {samePlaneCompanions.map((comp) => (
                                          <div
                                            key={comp.id}
                                            className="inline-flex items-center gap-1.5 bg-background/90 px-2.5 py-1 rounded-md border border-emerald-500/30 text-[11px] shadow-xs"
                                          >
                                            <span className="font-bold text-foreground">
                                              {comp.attendee_name}
                                            </span>
                                            <span className="text-muted-foreground">
                                              ({comp.role_in_event})
                                            </span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                              Seat {comp.seat_assignment || "Assigned"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground text-[11px]">
                                        You are currently the only registered traveler on flight{" "}
                                        <strong>{activeViewerAttendee.flight_numbers}</strong>. Other team members are rostered on parallel flights below.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  <div>
                                    <span className="font-semibold text-amber-700 dark:text-amber-400 block">
                                      No flight booked for {activeViewerAttendee.attendee_name} yet
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">
                                      Register your plane flight number, airline, and seat assignment to coordinate with other attendees.
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenEditFlight(activeViewerAttendee)}
                                    className="gap-1.5 shrink-0 bg-primary text-primary-foreground"
                                  >
                                    <Plane className="w-3.5 h-3.5" />
                                    <span>Register Flight Details</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Co-Travelers' Plane Information Section */}
                          <div className="space-y-3 pt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                  <Users className="w-4 h-4 text-primary" />
                                  <span>Co-Travelers' Plane Information</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {filteredAttendees.length} Shown
                                  </Badge>
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  View flight schedules, airline carriers, seat assignments, and luggage for everyone on this trip.
                                </p>
                              </div>

                              {/* Search & Filter Controls */}
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    value={flightSearchTerm}
                                    onChange={(e) => setFlightSearchTerm(e.target.value)}
                                    placeholder="Filter by name, flight #, seat..."
                                    className="h-8 pl-8 text-xs w-[180px] sm:w-[210px]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Filter Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs pb-1">
                              <button
                                type="button"
                                onClick={() => setFlightFilterAirline("all")}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                  flightFilterAirline === "all"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                All Flights ({allAttendees.length})
                              </button>
                              {samePlaneCompanions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFlightFilterAirline("same_plane")}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                                    flightFilterAirline === "same_plane"
                                      ? "bg-emerald-600 text-white"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  <span>✈️ Same Plane As You</span>
                                  <span className="font-bold">({samePlaneCompanions.length + 1})</span>
                                </button>
                              )}
                              {["Delta", "United", "Air Canada"].map((carrier) => {
                                const count = allAttendees.filter((a) =>
                                  a.carrier_airline?.toLowerCase().includes(carrier.toLowerCase())
                                ).length;
                                if (count === 0) return null;
                                return (
                                  <button
                                    key={carrier}
                                    type="button"
                                    onClick={() => setFlightFilterAirline(carrier)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                      flightFilterAirline.toLowerCase() === carrier.toLowerCase()
                                        ? "bg-foreground text-background font-semibold"
                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {carrier} ({count})
                                  </button>
                                );
                              })}
                            </div>

                            {/* Plane Cards Grid */}
                            {filteredAttendees.length === 0 ? (
                              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                                No attendees match your flight search query.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredAttendees.map((attendee) => {
                                  const isSameFlight =
                                    activeViewerAttendee &&
                                    attendee.id !== activeViewerAttendee.id &&
                                    samePlaneCompanions.some((c) => c.id === attendee.id);
                                  const isMe = attendee.id === activeViewerAttendee?.id;

                                  return (
                                    <div
                                      key={attendee.id}
                                      className={`rounded-xl p-3.5 border transition-all text-xs flex flex-col justify-between gap-3 ${
                                        isMe
                                          ? "bg-sky-500/5 border-sky-500/40 shadow-xs"
                                          : isSameFlight
                                          ? "bg-emerald-500/5 border-emerald-500/30"
                                          : "bg-card border-border hover:border-border/80"
                                      }`}
                                    >
                                      <div className="space-y-2">
                                        {/* Top Row: Name, Status & Tags */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-sm text-foreground">
                                                {attendee.attendee_name}
                                              </span>
                                              {isMe && (
                                                <Badge className="bg-sky-500 text-white text-[10px] py-0 px-1.5">
                                                  You
                                                </Badge>
                                              )}
                                              {isSameFlight && (
                                                <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">
                                                  ✈️ Same Plane
                                                </Badge>
                                              )}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground block">
                                              {attendee.role_in_event} • {attendee.attendee_email}
                                            </span>
                                          </div>

                                          <Badge
                                            variant="outline"
                                            className={
                                              attendee.attendance_status === "confirmed"
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px]"
                                                : "bg-amber-500/10 text-amber-600 border-amber-300 text-[10px]"
                                            }
                                          >
                                            {attendee.attendance_status}
                                          </Badge>
                                        </div>

                                        {/* Flight Information Block */}
                                        {attendee.flight_numbers || attendee.carrier_airline ? (
                                          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-1.5">
                                                <Badge
                                                  variant="outline"
                                                  className={`text-[10px] font-semibold ${getAirlineBadgeStyle(
                                                    attendee.carrier_airline
                                                  )}`}
                                                >
                                                  {attendee.carrier_airline || "Airline"}
                                                </Badge>
                                                <span className="font-bold text-foreground tracking-tight text-xs">
                                                  {attendee.flight_numbers}
                                                </span>
                                              </div>
                                              <span className="font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded text-[11px] border border-sky-500/20">
                                                Seat {attendee.seat_assignment || "Unassigned"}
                                              </span>
                                            </div>

                                            {/* Route & Booking Ref */}
                                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-0.5">
                                              <div className="flex items-center gap-1 font-medium">
                                                <span>{attendee.origin_city || "Origin"}</span>
                                                <ArrowRight className="w-3 h-3 text-sky-500" />
                                                <span>{attendee.destination_city || eventDetails.event.location}</span>
                                              </div>
                                              {attendee.booking_reference && (
                                                <div className="flex items-center gap-1">
                                                  <span className="text-[10px] text-muted-foreground">Ref:</span>
                                                  <code className="font-mono font-semibold text-foreground bg-background px-1 py-0.2 rounded border">
                                                    {attendee.booking_reference}
                                                  </code>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="p-2.5 rounded-lg border border-dashed text-center text-muted-foreground text-[11px]">
                                            No flight registered yet. Click "Update Flight" to add reservation.
                                          </div>
                                        )}

                                        {/* Lodging & Luggage Badges */}
                                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                                          {attendee.lodging_details && (
                                            <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                                              <Hotel className="w-3 h-3 text-amber-500" />
                                              <span>{attendee.lodging_details}</span>
                                            </span>
                                          )}
                                          {attendee.special_luggage_assigned && (
                                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-medium">
                                              <Package className="w-3 h-3" />
                                              <span>{attendee.special_luggage_assigned}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Card Footer Actions */}
                                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                                        <div className="text-[11px] text-muted-foreground">
                                          Stipend: <strong className="text-foreground">${(attendee.stipend_amount || 0).toFixed(2)}</strong>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {attendee.flight_numbers && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                copyToClipboard(
                                                  `${attendee.attendee_name} • ${attendee.carrier_airline || "Flight"} ${attendee.flight_numbers} • Seat ${attendee.seat_assignment || "TBD"} • Ref: ${attendee.booking_reference || "N/A"}`,
                                                  `card-${attendee.id}`
                                                )
                                              }
                                              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                                              title="Copy Flight Summary"
                                            >
                                              {copiedId === `card-${attendee.id}` ? (
                                                <Check className="w-3 h-3 text-emerald-500" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                              <span>Copy Flight</span>
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenEditFlight(attendee)}
                                            className="h-7 px-2 text-[11px] gap-1"
                                          >
                                            <Edit3 className="w-3 h-3 text-primary" />
                                            <span>Update Flight</span>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Traditional Attendee Roster Table View */
                        <div className="divide-y divide-border">
                          {allAttendees.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                              No team members added yet. Click "Add Traveler" to roster pilots and crew.
                            </div>
                          ) : (
                            allAttendees.map((attendee) => (
                              <div
                                key={attendee.id}
                                className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground text-sm">
                                      {attendee.attendee_name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={
                                        attendee.attendance_status === "confirmed"
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                          : "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800"
                                      }
                                    >
                                      {attendee.attendance_status}
                                    </Badge>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                      {attendee.role_in_event}
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span>{attendee.attendee_email}</span>
                                    {attendee.flight_numbers && (
                                      <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                                        <Plane className="w-3 h-3 text-sky-500" />
                                        <span>
                                          {attendee.carrier_airline} {attendee.flight_numbers} (Seat {attendee.seat_assignment || "TBD"})
                                        </span>
                                      </span>
                                    )}
                                    {attendee.lodging_details && (
                                      <span className="inline-flex items-center gap-1 text-foreground/80">
                                        <Hotel className="w-3 h-3 text-amber-500" />
                                        {attendee.lodging_details}
                                      </span>
                                    )}
                                  </div>
                                  {attendee.special_luggage_assigned && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-medium pt-0.5">
                                      <Package className="w-3 h-3" />
                                      <span>Assigned Luggage: {attendee.special_luggage_assigned}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-center">
                                  <div className="text-right">
                                    <span className="text-[11px] text-muted-foreground block">Per-Diem Stipend</span>
                                    <span className="font-semibold text-foreground">
                                      ${(attendee.stipend_amount || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEditFlight(attendee)}
                                    className="h-8 text-xs gap-1"
                                  >
                                    <Edit3 className="w-3 h-3 text-primary" />
                                    <span>Edit Flight</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeAttendeeMutation.mutate(attendee.id)}
                                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Trip Ground Transport & Departure Boarding Section */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Car className="w-4 h-4 text-primary" />
                        <span>Trip Ground Transport & Vehicle Boarding</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Assigned convoy vehicles for this event. Drivers can broadcast departure alerts when loading up or leaving, and any traveler can check in to the car.
                      </CardDescription>
                    </div>
                    <a
                      href="/travel/vehicles"
                      className="text-xs text-primary hover:underline font-medium flex items-center gap-1 self-start sm:self-auto shrink-0"
                    >
                      <span>Manage Full Fleet</span>
                      <span>➔</span>
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {eventVehicles.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 bg-muted/20 text-xs">
                      <Car className="w-8 h-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No ground vehicles assigned to this trip yet</p>
                      <p className="text-muted-foreground max-w-md">
                        Assign SUVs, passenger vans, or executive transport to this expedition so pilots and flight crew can check in and ride along.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="mt-2 text-xs"
                      >
                        <a href="/travel/vehicles">Deploy Vehicle to this Event</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {eventVehicles.map((veh: any) => {
                        const occupied = veh.occupied_seats_count ?? (veh.current_passengers?.length || 0);
                        const available = (veh.seating_capacity || 0) - occupied;
                        const userName = user?.full_name || "Traveler";
                        const isCheckedIn = (veh.current_passengers || []).some(
                          (p: string) =>
                            p.toLowerCase().includes(userName.toLowerCase()) ||
                            (user?.email && p.toLowerCase().includes(user.email.split("@")[0].toLowerCase()))
                        );

                        return (
                          <div
                            key={veh.id}
                            className={`p-4 rounded-xl border transition-all text-xs space-y-3 ${
                              isCheckedIn
                                ? "bg-amber-500/[0.04] border-amber-500/40 ring-1 ring-amber-500/30"
                                : "bg-card border-border/80 hover:border-border"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">{veh.vehicle_name}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {veh.seating_capacity} Seats
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-[11px] mt-0.5">
                                  {veh.make} {veh.model} • Driver: <strong className="text-foreground">{veh.assigned_driver}</strong>
                                </p>
                              </div>
                              <Badge
                                className={
                                  available > 0
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                }
                              >
                                {available > 0 ? `${available} Seats Free` : "Full"}
                              </Badge>
                            </div>

                            {/* Departure status banner */}
                            {veh.departure_status && veh.departure_status !== "idle" ? (
                              <div
                                className={`p-2.5 rounded-lg border space-y-1 ${
                                  veh.departure_status === "loading_up"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : veh.departure_status === "leaving_soon"
                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                                    : veh.departure_status === "en_route"
                                    ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                                    : "bg-muted/40 border-border text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                                    <Radio className="h-3 w-3 animate-pulse" />
                                    {veh.departure_status === "loading_up" && "Loading Up Now"}
                                    {veh.departure_status === "leaving_soon" && "Final Call — Departing Soon!"}
                                    {veh.departure_status === "en_route" && "En Route"}
                                    {veh.departure_status === "arrived" && "Arrived"}
                                  </span>
                                  {veh.departure_time && (
                                    <span className="flex items-center gap-1 text-[10px] font-medium opacity-90">
                                      <Clock className="h-3 w-3" />
                                      {veh.departure_time}
                                    </span>
                                  )}
                                </div>
                                {veh.departure_location && (
                                  <div className="flex items-center gap-1 text-[11px] text-foreground font-medium">
                                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                                    <span>Pickup: {veh.departure_location}</span>
                                  </div>
                                )}
                                {veh.departure_message && (
                                  <p className="text-[10px] text-foreground/80 italic">
                                    "{veh.departure_message}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="p-2 rounded bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                                <span>No active departure alert</span>
                                <span>Ready for dispatch</span>
                              </div>
                            )}

                            {/* Passenger list */}
                            {veh.current_passengers && veh.current_passengers.length > 0 && (
                              <div className="text-[11px] text-muted-foreground">
                                <span className="font-semibold text-foreground">Checked-In ({veh.current_passengers.length}): </span>
                                <span>{veh.current_passengers.join(", ")}</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                              {isCheckedIn ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] py-0.5">
                                    <CheckCheck className="h-3 w-3 mr-1 inline" />
                                    Checked In
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      checkInMutation.mutate({
                                        vehicleId: veh.id,
                                        payload: {
                                          passenger_name: userName,
                                          action: "check_out",
                                        },
                                      })
                                    }
                                    disabled={checkInMutation.isPending}
                                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-destructive"
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
                                      vehicleId: veh.id,
                                      payload: {
                                        passenger_name: userName,
                                        action: "check_in",
                                      },
                                    })
                                  }
                                  className={`text-xs h-7 px-2.5 font-semibold ${
                                    available > 0
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                      : "opacity-50 cursor-not-allowed"
                                  }`}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  <span>{available > 0 ? "Check In to Car" : "Full"}</span>
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBroadcastModal(veh)}
                                className="text-xs h-7 px-2.5 gap-1 border-primary/40 text-primary hover:bg-primary/10 ml-auto"
                              >
                                <Megaphone className="h-3 w-3" />
                                <span>Broadcast Departure</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Special Luggage & Hard Case Manifest Section */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Luggage className="w-4 h-4 text-indigo-500" />
                        <span>Special Luggage & Hard Case Manifest</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pelican flight cases, LiPo containment boxes, and sensitive drone telemetry equipment registered for this expedition.
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddLuggageModalOpen(true)}
                      className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Special Luggage</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {(!eventDetails.special_luggage || eventDetails.special_luggage.length === 0) ? (
                    <div className="p-8 text-center border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 bg-muted/20">
                      <Luggage className="w-8 h-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No special luggage logged yet</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Assign flight hard cases, lithium battery containment boxes, or drone telemetry gear directly to this expedition manifest.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddLuggageModalOpen(true)}
                        className="mt-2 text-xs gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register First Hard Case</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {eventDetails.special_luggage.map((lug) => (
                        <div
                          key={lug.id}
                          className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-semibold px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                {lug.case_code}
                              </span>
                              <span className="font-semibold text-foreground text-sm">
                                {lug.case_name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-medium bg-secondary text-secondary-foreground"
                              >
                                {lug.luggage_classification.replace(/_/g, " ")}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  lug.iata_lipo_compliant
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 flex items-center gap-1"
                                    : "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800 flex items-center gap-1"
                                }
                              >
                                {lug.iata_lipo_compliant ? (
                                  <>
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>IATA LiPo Compliant</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Check LiPo Req</span>
                                  </>
                                )}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  lug.status === "delivered_at_venue" || lug.status === "customs_inspected"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                    : lug.status === "in_transit"
                                    ? "bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800"
                                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                                }
                              >
                                {lug.status.replace(/_/g, " ").toUpperCase()}
                              </Badge>
                            </div>

                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              {lug.carrier_airline && (
                                <span className="inline-flex items-center gap-1 text-foreground/80">
                                  <Plane className="w-3 h-3 text-sky-500" />
                                  <span>{lug.carrier_airline}</span>
                                </span>
                              )}
                              {lug.baggage_tag_number && (
                                <span>Tag: <span className="font-mono text-foreground/90 font-medium">{lug.baggage_tag_number}</span></span>
                              )}
                              {lug.tracking_number && (
                                <span>Tracking: <span className="font-mono text-foreground/90">{lug.tracking_number}</span></span>
                              )}
                              {lug.dimensions_cm && (
                                <span>Dims: {lug.dimensions_cm} cm</span>
                              )}
                              {lug.custodian_name && (
                                <span>Custodian: <strong className="text-foreground/90">{lug.custodian_name}</strong></span>
                              )}
                              {lug.carnet_customs_declaration && (
                                <span>Carnet: <span className="font-mono text-foreground/90">{lug.carnet_customs_declaration}</span></span>
                              )}
                            </div>

                            {lug.handling_instructions && (
                              <p className="text-[11px] text-muted-foreground/90 italic bg-accent/40 px-2 py-1 rounded inline-block">
                                Instructions: {lug.handling_instructions}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-4 self-end lg:self-center shrink-0">
                            <div className="text-right">
                              <span className="text-[11px] text-muted-foreground block flex items-center justify-end gap-1">
                                <Scale className="w-3 h-3" />
                                Gross Weight
                              </span>
                              <span className={`font-semibold text-sm ${lug.gross_weight_kg > lug.max_airline_allowance_kg ? 'text-rose-500' : 'text-foreground'}`}>
                                {lug.gross_weight_kg} kg
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                max {lug.max_airline_allowance_kg} kg
                                {lug.excess_baggage_fee > 0 && ` (+$${lug.excess_baggage_fee})`}
                              </span>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteLuggageMutation.mutate(lug.id)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                              title="Delete Special Luggage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              Select an expedition event from the left list to view attendees, flight details, and cargo.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Create Event */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Travel Expedition Event</DialogTitle>
            <DialogDescription>
              Schedule a travel event, conference, or drone play-fight tournament.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <Label className="text-xs">Event Title</Label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 2026 Drone Dogfight Championship"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Event Type</Label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="drone_combat">Drone Combat / Dogfight</option>
                  <option value="fpv_play_fight">FPV Play-Fight Match</option>
                  <option value="flight_test">Flight Field Testing</option>
                  <option value="conference">Robotics Conference</option>
                  <option value="exhibition">Public Tech Demo</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Coordinator Name</Label>
                <Input
                  value={newCoordinator}
                  onChange={(e) => setNewCoordinator(e.target.value)}
                  placeholder="e.g. Captain Marcus Vance"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Destination City & Region</Label>
                <Input
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Las Vegas, NV"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Venue</Label>
                <Input
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  placeholder="e.g. Sphere Drone Pavilion"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description & Mission Objective</Label>
              <Textarea
                rows={3}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Details about mission goals, equipment loadout, travel authorizations..."
                className="text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending} className="text-xs">
                {createEventMutation.isPending ? "Creating..." : "Save Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Attendee */}
      <Dialog open={isAddAttendeeModalOpen} onOpenChange={setIsAddAttendeeModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Attendee ("Who is Going")</DialogTitle>
            <DialogDescription>
              Assign a pilot, engineer, or team member to this expedition with flight & lodging details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAttendee} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Attendee Full Name</Label>
                <Input
                  required
                  value={attName}
                  onChange={(e) => setAttName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={attEmail}
                  onChange={(e) => setAttEmail(e.target.value)}
                  placeholder="e.g. employee@zenatech.com"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role in Event</Label>
                <select
                  value={attRole}
                  onChange={(e) => setAttRole(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="Lead Combat Pilot">Lead Combat Pilot</option>
                  <option value="Combat Co-Pilot">Combat Co-Pilot</option>
                  <option value="Avionics & Telemetry Engineer">Avionics & Telemetry Engineer</option>
                  <option value="Pit Safety Officer">Pit Safety Officer</option>
                  <option value="Flight Mechanics Crew">Flight Mechanics Crew</option>
                  <option value="Team Coordinator">Team Coordinator</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Attendance Status</Label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="tentative">Tentative / Pending</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Flight Reservation</Label>
                <Input
                  value={attFlight}
                  onChange={(e) => setAttFlight(e.target.value)}
                  placeholder="e.g. Delta DL 1420 (JFK->LAS)"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Lodging / Hotel Room</Label>
                <Input
                  value={attLodging}
                  onChange={(e) => setAttLodging(e.target.value)}
                  placeholder="e.g. Bellagio Suite 204"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Per-Diem Stipend ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={attStipend}
                  onChange={(e) => setAttStipend(Number(e.target.value))}
                  placeholder="450.00"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Assigned Luggage Tag</Label>
                <Input
                  value={attLuggage}
                  onChange={(e) => setAttLuggage(e.target.value)}
                  placeholder="e.g. PELICAN-AIR-COMBAT-01"
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes / Special Requirements</Label>
              <Input
                value={attNotes}
                onChange={(e) => setAttNotes(e.target.value)}
                placeholder="Special baggage allowance, dietary preferences, or badge credentials"
                className="text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddAttendeeModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={addAttendeeMutation.isPending} className="text-xs">
                {addAttendeeMutation.isPending ? "Adding..." : "Add Attendee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Special Luggage */}
      <Dialog open={isAddLuggageModalOpen} onOpenChange={setIsAddLuggageModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Luggage className="w-5 h-5 text-indigo-500" />
              <span>Add Special Luggage & Flight Hard Cases</span>
            </DialogTitle>
            <DialogDescription>
              Register Pelican cases, LiPo battery containment boxes, or sensitive telemetry gear for this expedition.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLuggage} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Case Code / Asset ID</Label>
                <Input
                  required
                  value={lugCaseCode}
                  onChange={(e) => setLugCaseCode(e.target.value)}
                  placeholder="e.g. PEL-1650-01"
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Case Name / Descriptor</Label>
                <Input
                  required
                  value={lugCaseName}
                  onChange={(e) => setLugCaseName(e.target.value)}
                  placeholder="e.g. Pelican 1650 Drone Frame Case"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Luggage Classification</Label>
                <select
                  value={lugClassification}
                  onChange={(e) => setLugClassification(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="oversized_hard_case">Oversized Hard Case (Pelican)</option>
                  <option value="lithium_battery_box">Lithium LiPo Battery Box</option>
                  <option value="fragile_telemetry_unit">Fragile Telemetry / Avionics Unit</option>
                  <option value="spare_parts_container">Spare Parts & Tool Container</option>
                  <option value="ground_station_rack">Ground Station Command Rack</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Carrier Airline</Label>
                <Input
                  value={lugCarrierAirline}
                  onChange={(e) => setLugCarrierAirline(e.target.value)}
                  placeholder="e.g. Delta Air Lines / United"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Baggage Tag # (Air Waybill)</Label>
                <Input
                  value={lugBaggageTag}
                  onChange={(e) => setLugBaggageTag(e.target.value)}
                  placeholder="e.g. DL-7821902"
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Tracking Number</Label>
                <Input
                  value={lugTrackingNo}
                  onChange={(e) => setLugTrackingNo(e.target.value)}
                  placeholder="e.g. 1Z9999999999999999"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Dimensions (L x W x H cm)</Label>
                <Input
                  value={lugDimensions}
                  onChange={(e) => setLugDimensions(e.target.value)}
                  placeholder="e.g. 75 x 48 x 32"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Gross Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={lugGrossWeightKg}
                  onChange={(e) => setLugGrossWeightKg(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Airline Allowance (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={lugMaxAllowanceKg}
                  onChange={(e) => setLugMaxAllowanceKg(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Excess Baggage Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lugExcessFee}
                  onChange={(e) => setLugExcessFee(Number(e.target.value))}
                  placeholder="0.00"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Manifest Status</Label>
                <select
                  value={lugStatus}
                  onChange={(e) => setLugStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="packed">Packed & Sealed</option>
                  <option value="checked_in">Checked In at Counter</option>
                  <option value="in_transit">In Transit (Air Cargo)</option>
                  <option value="customs_inspected">Customs Inspected</option>
                  <option value="delivered_at_venue">Delivered at Venue</option>
                  <option value="returned">Returned / Repatriated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Custodian Name</Label>
                <Input
                  value={lugCustodianName}
                  onChange={(e) => setLugCustodianName(e.target.value)}
                  placeholder={eventDetails?.event?.coordinator_name || "Responsible Pilot / Lead"}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Custodian Email</Label>
                <Input
                  type="email"
                  value={lugCustodianEmail}
                  onChange={(e) => setLugCustodianEmail(e.target.value)}
                  placeholder="custodian@zenatech.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <Label className="text-xs">ATA Carnet / Customs Declaration</Label>
                <Input
                  value={lugCarnet}
                  onChange={(e) => setLugCarnet(e.target.value)}
                  placeholder="e.g. US-CARNET-2026-99"
                  className="text-xs"
                />
              </div>
              <div className="pt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="iata_compliance"
                  checked={lugIataLipoCompliant}
                  onChange={(e) => setLugIataLipoCompliant(e.target.checked)}
                  className="rounded border-input text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <Label htmlFor="iata_compliance" className="text-xs font-medium cursor-pointer">
                  IATA DGR LiPo Battery Compliant (&lt;100Wh)
                </Label>
              </div>
            </div>

            <div>
              <Label className="text-xs">Special Handling Instructions</Label>
              <Textarea
                rows={2}
                value={lugHandlingInstructions}
                onChange={(e) => setLugHandlingInstructions(e.target.value)}
                placeholder="Fragile carbon-fiber combat frames. Keep upright in climate-controlled cargo."
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddLuggageModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLuggageMutation.isPending}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createLuggageMutation.isPending ? "Registering..." : "Add to Manifest"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Broadcast Vehicle Departure Alert */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <span>Broadcast Departure / Loading Alert</span>
            </DialogTitle>
            <DialogDescription>
              Notify all attendees on{" "}
              <strong>{eventDetails?.event?.title || "this trip"}</strong> that you are loading up or leaving so anyone who wants to leave can check into this car.
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
                  Expedition Event: <strong className="text-foreground">{eventDetails?.event?.title || "Current Event"}</strong>
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
                  This alert will be delivered instantly to all team members attending{" "}
                  <strong>{eventDetails?.event?.title || "this event"}</strong> so they can view seats and check in.
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

      {/* Update Flight & Plane Details Modal */}
      <Dialog open={isEditFlightModalOpen} onOpenChange={setIsEditFlightModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plane className="w-5 h-5 text-sky-500" />
              <span>Update Plane Flight & Reservation</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update airline, flight numbers, seat assignment, and booking confirmation for{" "}
              <strong className="text-foreground">{editingAttendee?.attendee_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {editingAttendee && (
            <form onSubmit={handleSubmitEditFlight} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Airline Carrier</Label>
                  <select
                    value={editCarrierAirline}
                    onChange={(e) => setEditCarrierAirline(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Air Canada">🍁 Air Canada</option>
                    <option value="Delta Air Lines">🔺 Delta Air Lines</option>
                    <option value="United Airlines">🌐 United Airlines</option>
                    <option value="American Airlines">🦅 American Airlines</option>
                    <option value="Southwest Airlines">💛 Southwest Airlines</option>
                    <option value="WestJet">✈️ WestJet</option>
                    <option value="Alaska Airlines">🏔️ Alaska Airlines</option>
                    <option value="British Airways">🇬🇧 British Airways</option>
                    <option value="Lufthansa">🇩🇪 Lufthansa</option>
                    <option value="Charter / Private Flight">🛩️ Charter / Private Flight</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Flight Number & Plane</Label>
                  <Input
                    required
                    value={editFlightNumbers}
                    onChange={(e) => setEditFlightNumbers(e.target.value)}
                    placeholder="e.g. DL 1420 or AC 185"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Seat Assignment</Label>
                  <Input
                    value={editSeatAssignment}
                    onChange={(e) => setEditSeatAssignment(e.target.value)}
                    placeholder="e.g. 14A (Window) or 2B"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Booking Reference (PNR)</Label>
                  <Input
                    value={editBookingRef}
                    onChange={(e) => setEditBookingRef(e.target.value)}
                    placeholder="e.g. DL-881022 or 6-character PNR"
                    className="text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Departure / Origin Airport</Label>
                  <Input
                    value={editOriginCity}
                    onChange={(e) => setEditOriginCity(e.target.value)}
                    placeholder="e.g. New York (JFK) or Toronto (YYZ)"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Arrival / Destination Airport</Label>
                  <Input
                    value={editDestinationCity}
                    onChange={(e) => setEditDestinationCity(e.target.value)}
                    placeholder="e.g. Las Vegas (LAS) or Montreal (YUL)"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Hotel / Lodging Details</Label>
                <Input
                  value={editLodging}
                  onChange={(e) => setEditLodging(e.target.value)}
                  placeholder="e.g. Hilton Grand Vacations - Room 402"
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 rounded bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-700 dark:text-sky-300 flex items-start gap-2">
                <Plane className="h-4 w-4 shrink-0 mt-0.5 text-sky-500" />
                <span>
                  Updating this reservation will immediately update the <strong>Trip Flight Manifest</strong>, allowing
                  you and your co-travelers on this flight to see each other's plane information.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditFlightModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateFlightMutation.isPending}
                  className="text-xs gap-1.5 font-semibold bg-primary text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{updateFlightMutation.isPending ? "Saving Plane Info..." : "Save Flight Details"}</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
