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
} from "lucide-react";
import { toast } from "sonner";
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

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  const { data: eventDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["travelEventDetails", selectedEventId],
    queryFn: () => (selectedEventId ? travelService.getEvent(selectedEventId) : null),
    enabled: !!selectedEventId,
  });

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
      custodian_name: lugCustodianName || (eventDetails?.event?.coordinator_name || "Alex Rivera"),
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/60 text-xs">
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
              </Card>

              {/* "Who is Going" Attendee Roster */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span>Attendee Flight & Role Roster ("Who is Going")</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {eventDetails.attendees.length} assigned flight crew, combat pilots, and engineers.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {eventDetails.attendees.filter((a) => a.attendance_status === "confirmed").length} Confirmed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {eventDetails.attendees.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                      No team members added yet. Click "Add Attendee" to roster pilots and crew.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {eventDetails.attendees.map((attendee) => (
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
                              {attendee.flight_details && (
                                <span className="inline-flex items-center gap-1 text-foreground/80">
                                  <Plane className="w-3 h-3 text-sky-500" />
                                  {attendee.flight_details}
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
                              variant="ghost"
                              onClick={() => removeAttendeeMutation.mutate(attendee.id)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
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
                  placeholder="e.g. Alex Rivera"
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
                  placeholder="e.g. alex.rivera@zenatech.com"
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
    </div>
  );
}
