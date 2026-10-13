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
  Sparkles,
} from "lucide-react";
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
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Special Luggage</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {eventDetails.special_luggage?.length || 0} Hard Cases
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
    </div>
  );
}
