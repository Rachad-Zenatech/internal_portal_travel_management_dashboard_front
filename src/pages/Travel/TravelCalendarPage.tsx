import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import { useAuth } from "@/lib/AuthContext";
import type { EventScheduleItem, TravelEvent } from "@/types/travel";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Car,
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  Compass,
  Search,
  Building,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function TravelCalendarPage() {
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();

  // Role verification: CEO, EA, Lead, Super Admin, Coordinator
  const isActualLeader = Boolean(
    user?.is_super_admin ||
    roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "CEO", "EA", "COORDINATOR", "MANAGER"].includes(r.code)
    ) ||
    user?.email?.toLowerCase().includes("ceo") ||
    user?.email?.toLowerCase().includes("vanessa") ||
    user?.email?.toLowerCase().includes("admin") ||
    user?.job_title?.toLowerCase().includes("ceo") ||
    user?.job_title?.toLowerCase().includes("vp") ||
    user?.job_title?.toLowerCase().includes("lead") ||
    user?.job_title?.toLowerCase().includes("director")
  );

  // Perspective mode: Leaders can switch between Leadership Dispatch & Attendee Trip View
  const [perspectiveMode, setPerspectiveMode] = useState<"leadership" | "attendee">(
    isActualLeader ? "leadership" : "attendee"
  );

  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newScheduleEventId, setNewScheduleEventId] = useState("");
  const [newScheduleDate, setNewScheduleDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("08:30 AM");
  const [newEndTime, setNewEndTime] = useState("10:00 AM");
  const [newTitle, setNewTitle] = useState("");
  const [newActivityType, setNewActivityType] = useState("transport");
  const [newMeetingSpot, setNewMeetingSpot] = useState("");
  const [newSpotInstructions, setNewSpotInstructions] = useState("");
  const [newAssignedVehicle, setNewAssignedVehicle] = useState("");
  const [newTargetAudience, setNewTargetAudience] = useState("All Pilots & Support Crew");
  const [newCoordinator, setNewCoordinator] = useState(user?.full_name || "Vanessa (EA)");
  const [newNotes, setNewNotes] = useState("");

  // Query events
  const { data: eventsList = [] } = useQuery<TravelEvent[]>({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  // Active query parameters based on perspective
  const isAttendeeView = perspectiveMode === "attendee";
  const effectiveEmail = isAttendeeView
    ? user?.email || "alex.rivera@zenatech.com"
    : undefined;

  // Query schedule
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["travelCalendarSchedule", selectedEventId, perspectiveMode, effectiveEmail],
    queryFn: () =>
      travelService.getCalendarSchedule({
        eventId: selectedEventId,
        userEmail: effectiveEmail,
        isAdminOverride: !isAttendeeView,
      }),
  });

  // Query vehicles for assignment options
  const { data: vehicleList = [] } = useQuery({
    queryKey: ["travelVehiclesSimple"],
    queryFn: () => travelService.getVehicles({ isAdminOverride: true }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: Partial<EventScheduleItem>) =>
      travelService.createScheduleItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelCalendarSchedule"] });
      toast.success("Meeting spot and schedule item added successfully");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create schedule item");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => travelService.deleteScheduleItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelCalendarSchedule"] });
      toast.success("Schedule item removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to remove schedule item");
    },
  });

  const resetForm = () => {
    setNewTitle("");
    setNewMeetingSpot("");
    setNewSpotInstructions("");
    setNewAssignedVehicle("");
    setNewNotes("");
  };

  const todayDate = scheduleData?.today_date || new Date().toISOString().split("T")[0];
  const tomorrowDate = scheduleData?.tomorrow_date || "";
  const todayItems = scheduleData?.today_items || [];
  const tomorrowItems = scheduleData?.tomorrow_items || [];
  const allItems = scheduleData?.all_items || [];

  // Filtered list of all items for full calendar
  const filteredAllItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meeting_spot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.meeting_spot_instructions &&
          item.meeting_spot_instructions.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.coordinator_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesActivity =
        selectedActivityFilter === "all" || item.activity_type === selectedActivityFilter;

      return matchesSearch && matchesActivity;
    });
  }, [allItems, searchQuery, selectedActivityFilter]);

  // Unique meeting spots for directory view
  const spotDirectory = useMemo(() => {
    const map = new Map<string, EventScheduleItem>();
    allItems.forEach((item) => {
      if (!map.has(item.meeting_spot)) {
        map.set(item.meeting_spot, item);
      }
    });
    return Array.from(map.values());
  }, [allItems]);

  const handleCopySpot = (item: EventScheduleItem) => {
    const text = `📍 Meeting Spot: ${item.meeting_spot}\n⏰ Time: ${item.start_time}${
      item.end_time ? " - " + item.end_time : ""
    } (${item.schedule_date})\n📌 Event: ${item.title}\n🧭 Instructions: ${
      item.meeting_spot_instructions || "Check in with coordinator"
    }\n🚘 Assigned Transport: ${item.assigned_vehicle_name || "N/A"}\n👤 Coordinator: ${
      item.coordinator_name
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast.success("Meeting spot instructions copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadIcs = (item: EventScheduleItem) => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zenatech Travel Management//Trip Schedule//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${item.title} - ${item.meeting_spot}`,
      `DESCRIPTION:${item.meeting_spot_instructions || ""} Coordinator: ${item.coordinator_name}`,
      `LOCATION:${item.meeting_spot}`,
      `DTSTART:${item.schedule_date.replace(/-/g, "")}T090000Z`,
      `DTEND:${item.schedule_date.replace(/-/g, "")}T100000Z`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${item.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar invite (.ics) downloaded!");
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case "transport":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "dogfight":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "flight_test":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "dinner":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "briefing":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const formatActivityLabel = (type: string) => {
    switch (type) {
      case "transport":
        return "Ground Transport & Departure";
      case "dogfight":
        return "Live Combat Arena Dogfight";
      case "flight_test":
        return "Avionics Diagnostic & Flight Test";
      case "dinner":
        return "Executive Dinner & Social";
      case "briefing":
        return "Team Briefing & Logistics";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleOpenCreateModal = (defaultDate?: string) => {
    if (defaultDate) {
      setNewScheduleDate(defaultDate);
    } else {
      setNewScheduleDate(todayDate);
    }
    if (eventsList.length > 0) {
      setNewScheduleEventId(eventsList[0].id);
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Trip Calendar & Meeting Spots
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs">
                  Event Scoped
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Live daily agenda, departure times, and verified physical meeting spots for active expeditions.
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions & Perspective Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isActualLeader && (
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1 text-xs">
              <span className="px-2 text-muted-foreground font-medium">View Mode:</span>
              <Button
                size="sm"
                variant={perspectiveMode === "leadership" ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs ${
                  perspectiveMode === "leadership"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPerspectiveMode("leadership")}
              >
                Leadership Overview
              </Button>
              <Button
                size="sm"
                variant={perspectiveMode === "attendee" ? "default" : "ghost"}
                className={`h-7 px-2.5 text-xs ${
                  perspectiveMode === "attendee"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPerspectiveMode("attendee")}
              >
                Attendee Trip Mode
              </Button>
            </div>
          )}

          {/* Add Item Button (Visible to leadership or authorized coordinators) */}
          {(isActualLeader || perspectiveMode === "leadership") && (
            <Button
              onClick={() => handleOpenCreateModal()}
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-500 hover:to-sky-500 shadow-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Meeting Spot</span>
            </Button>
          )}
        </div>
      </div>

      {/* Event Filter & Active Event Badge Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Event Selector */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <Building className="h-5 w-5 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground block mb-1">Target Expedition / Trip</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="All Expeditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Attending Trips / Events</SelectItem>
                  {eventsList.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* User Scoped Status */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Attendee Context</span>
                <Badge
                  variant="outline"
                  className={
                    isAttendeeView
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]"
                      : "border-indigo-500/40 text-indigo-400 bg-indigo-500/10 text-[10px]"
                  }
                >
                  {isAttendeeView ? "Filtered To Your Trip" : "Global Dispatch Mode"}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                {user?.full_name || "Alex Rivera"} ({user?.email || "alex.rivera@zenatech.com"})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Dates Indicator */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-sky-400 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground block">Today's Active Date</span>
                <span className="text-xs font-bold text-foreground font-mono">{todayDate}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Tomorrow</span>
              <span className="text-xs font-medium text-muted-foreground font-mono">{tomorrowDate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Focus Today/Tomorrow vs Full Calendar vs Spot Directory */}
      <Tabs defaultValue="today-tomorrow" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border">
          <TabsTrigger value="today-tomorrow" className="gap-2 text-xs">
            <Compass className="h-3.5 w-3.5" />
            <span>Today & Tomorrow (Live Meeting Spots)</span>
            <Badge className="ml-1.5 h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-none">
              {todayItems.length + tomorrowItems.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all-calendar" className="gap-2 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Full Trip Timeline</span>
            <Badge className="ml-1.5 h-4 px-1.5 text-[10px] bg-muted text-muted-foreground border-none">
              {allItems.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="spots-directory" className="gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5" />
            <span>Meeting Spots Directory</span>
            <Badge className="ml-1.5 h-4 px-1.5 text-[10px] bg-muted text-muted-foreground border-none">
              {spotDirectory.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TODAY & TOMORROW DEDICATED VIEW */}
        <TabsContent value="today-tomorrow" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TODAY'S MEETING SPOTS & SCHEDULE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      Meeting Spots of Today
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                        {todayDate}
                      </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Active rendezvous points and transport departures for today's agenda.
                    </p>
                  </div>
                </div>
                {(isActualLeader || perspectiveMode === "leadership") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-500/30 hover:bg-emerald-500/10 gap-1 text-emerald-400"
                    onClick={() => handleOpenCreateModal(todayDate)}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Spot</span>
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl bg-card">
                  Loading schedule and meeting spots...
                </div>
              ) : todayItems.length === 0 ? (
                <Card className="border-dashed border-border p-8 text-center">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground">No meeting spots scheduled for today</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check the upcoming days or contact the travel coordinator.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3.5">
                  {todayItems.map((item) => (
                    <Card
                      key={item.id}
                      className="border-emerald-500/20 bg-card/80 backdrop-blur-xs hover:border-emerald-500/40 transition-all shadow-xs"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold border ${getActivityBadgeColor(
                                  item.activity_type
                                )}`}
                              >
                                {formatActivityLabel(item.activity_type)}
                              </Badge>
                              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.start_time}
                                {item.end_time ? ` - ${item.end_time}` : ""}
                              </span>
                            </div>
                            <CardTitle className="text-base font-bold text-foreground">
                              {item.title}
                            </CardTitle>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Copy rendezvous info"
                              onClick={() => handleCopySpot(item)}
                            >
                              {copiedId === item.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Download Calendar (.ics)"
                              onClick={() => handleDownloadIcs(item)}
                            >
                              <CalendarIcon className="h-3.5 w-3.5" />
                            </Button>
                            {(isActualLeader || perspectiveMode === "leadership") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                title="Delete spot"
                                onClick={() => deleteMutation.mutate(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 space-y-3">
                        {/* Physical Meeting Spot Landmark Box */}
                        <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5 flex items-start gap-2.5">
                          <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                              Meeting Location
                            </span>
                            <span className="text-xs font-bold text-foreground block">
                              {item.meeting_spot}
                            </span>
                            {item.meeting_spot_instructions && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                🧭 {item.meeting_spot_instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Transport Shuttle & Coordinator Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {item.assigned_vehicle_name && (
                            <div className="flex items-center gap-1.5 p-1.5 rounded bg-sky-500/5 border border-sky-500/20 text-sky-300">
                              <Car className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                              <span className="truncate">{item.assigned_vehicle_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/40 border text-muted-foreground">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Lead: {item.coordinator_name}</span>
                          </div>
                        </div>

                        {item.target_audience && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground/80">Attendees:</span>
                            <span>{item.target_audience}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* TOMORROW'S MEETING SPOTS & SCHEDULE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                      Meeting Spots of Tomorrow
                      <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs">
                        {tomorrowDate}
                      </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Prepare in advance: Next-day departure hubs, testing paddocks & evening meetups.
                    </p>
                  </div>
                </div>
                {(isActualLeader || perspectiveMode === "leadership") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-indigo-500/30 hover:bg-indigo-500/10 gap-1 text-indigo-400"
                    onClick={() => handleOpenCreateModal(tomorrowDate)}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Spot</span>
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl bg-card">
                  Loading tomorrow's agenda...
                </div>
              ) : tomorrowItems.length === 0 ? (
                <Card className="border-dashed border-border p-8 text-center">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground">No meeting spots scheduled for tomorrow yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Event coordinators usually publish tomorrow's departure hubs by 6:00 PM today.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3.5">
                  {tomorrowItems.map((item) => (
                    <Card
                      key={item.id}
                      className="border-indigo-500/20 bg-card/80 backdrop-blur-xs hover:border-indigo-500/40 transition-all shadow-xs"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold border ${getActivityBadgeColor(
                                  item.activity_type
                                )}`}
                              >
                                {formatActivityLabel(item.activity_type)}
                              </Badge>
                              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.start_time}
                                {item.end_time ? ` - ${item.end_time}` : ""}
                              </span>
                            </div>
                            <CardTitle className="text-base font-bold text-foreground">
                              {item.title}
                            </CardTitle>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Copy rendezvous info"
                              onClick={() => handleCopySpot(item)}
                            >
                              {copiedId === item.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Download Calendar (.ics)"
                              onClick={() => handleDownloadIcs(item)}
                            >
                              <CalendarIcon className="h-3.5 w-3.5" />
                            </Button>
                            {(isActualLeader || perspectiveMode === "leadership") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                title="Delete spot"
                                onClick={() => deleteMutation.mutate(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 space-y-3">
                        {/* Physical Meeting Spot Landmark Box */}
                        <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5 flex items-start gap-2.5">
                          <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">
                              Tomorrow's Meeting Spot
                            </span>
                            <span className="text-xs font-bold text-foreground block">
                              {item.meeting_spot}
                            </span>
                            {item.meeting_spot_instructions && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                🧭 {item.meeting_spot_instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Vehicle & Coordinator Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {item.assigned_vehicle_name && (
                            <div className="flex items-center gap-1.5 p-1.5 rounded bg-sky-500/5 border border-sky-500/20 text-sky-300">
                              <Car className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                              <span className="truncate">{item.assigned_vehicle_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/40 border text-muted-foreground">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Lead: {item.coordinator_name}</span>
                          </div>
                        </div>

                        {item.target_audience && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground/80">Attendees:</span>
                            <span>{item.target_audience}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: FULL TRIP TIMELINE & AGENDA */}
        <TabsContent value="all-calendar" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meeting spot, title, or coordinator..."
                className="pl-8 text-xs h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedActivityFilter} onValueChange={setSelectedActivityFilter}>
                <SelectTrigger className="h-9 text-xs w-[180px]">
                  <SelectValue placeholder="All Activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="transport">Ground Transport</SelectItem>
                  <SelectItem value="dogfight">Live Dogfight Arena</SelectItem>
                  <SelectItem value="flight_test">Flight Testing</SelectItem>
                  <SelectItem value="dinner">VIP Dinner</SelectItem>
                  <SelectItem value="briefing">Team Briefing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAllItems.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No schedule items match your filter criteria.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAllItems.map((item) => (
                <Card key={item.id} className="border-border hover:border-primary/40 transition-all">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0 border">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          {new Date(item.schedule_date + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {new Date(item.schedule_date + "T00:00:00").getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${getActivityBadgeColor(item.activity_type)}`}
                          >
                            {formatActivityLabel(item.activity_type)}
                          </Badge>
                          <span className="text-xs font-mono font-bold text-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {item.start_time}
                            {item.end_time ? ` - ${item.end_time}` : ""}
                          </span>
                          {item.schedule_date === todayDate && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              Today
                            </Badge>
                          )}
                          {item.schedule_date === tomorrowDate && (
                            <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px]">
                              Tomorrow
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-foreground">{item.title}</h3>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-foreground/90">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            {item.meeting_spot}
                          </span>
                          {item.assigned_vehicle_name && (
                            <span className="flex items-center gap-1 text-sky-400">
                              <Car className="h-3.5 w-3.5" />
                              {item.assigned_vehicle_name}
                            </span>
                          )}
                          <span className="text-muted-foreground/60">•</span>
                          <span>Lead: {item.coordinator_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => handleCopySpot(item)}
                      >
                        {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedId === item.id ? "Copied" : "Copy Details"}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => handleDownloadIcs(item)}
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>.ICS</span>
                      </Button>
                      {(isActualLeader || perspectiveMode === "leadership") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-400 hover:text-rose-300"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: MEETING SPOTS DIRECTORY */}
        <TabsContent value="spots-directory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spotDirectory.map((spot, idx) => (
              <Card key={idx} className="border-border bg-card hover:border-indigo-500/40 transition-all">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-xs">
                      Rendezvous Hub
                    </Badge>
                    <MapPin className="h-4 w-4 text-indigo-400" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground mt-2">
                    {spot.meeting_spot}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    {spot.meeting_spot_instructions || "Standard event meeting spot. Inquire with ground lead upon arrival."}
                  </p>
                  <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Associated Activity:</span>
                    <span className="font-semibold text-foreground">{spot.title}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-8 gap-1.5"
                    onClick={() => handleCopySpot(spot)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Instructions</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE MEETING SPOT / SCHEDULE ITEM MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-indigo-400" />
              Add Event Meeting Spot & Schedule
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish a verified rendezvous point and timetable for travelers and drone combat crews.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-2 text-xs">
            {/* Target Event */}
            <div>
              <Label className="text-xs mb-1 block">Expedition / Event</Label>
              <Select value={newScheduleEventId} onValueChange={setNewScheduleEventId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent>
                  {eventsList.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Activity Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Date (YYYY-MM-DD)</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Activity Category</Label>
                <Select value={newActivityType} onValueChange={setNewActivityType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transport">Ground Transport & Departure</SelectItem>
                    <SelectItem value="dogfight">Live Combat Arena Dogfight</SelectItem>
                    <SelectItem value="flight_test">Avionics Flight Testing</SelectItem>
                    <SelectItem value="dinner">VIP Dinner & Reception</SelectItem>
                    <SelectItem value="briefing">Team Briefing</SelectItem>
                    <SelectItem value="meeting">Executive Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start & End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Start Time (e.g. 08:30 AM)</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="08:30 AM"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">End Time (e.g. 10:00 AM)</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="10:00 AM"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="text-xs mb-1 block">Event / Activity Title</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Morning Pit Diagnostic & Sensor Calibration"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            {/* Physical Meeting Spot */}
            <div>
              <Label className="text-xs mb-1 block">Exact Meeting Spot (Landmark / Gate / Room)</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Sphere Arena West Tech Paddock - Gate B / Bench 12"
                value={newMeetingSpot}
                onChange={(e) => setNewMeetingSpot(e.target.value)}
              />
            </div>

            {/* Directions / Instructions */}
            <div>
              <Label className="text-xs mb-1 block">Meeting Spot Instructions / Directions</Label>
              <Textarea
                className="text-xs min-h-[60px]"
                placeholder="Enter via West Security Gate. Badges and safety goggles required before entering cage."
                value={newSpotInstructions}
                onChange={(e) => setNewSpotInstructions(e.target.value)}
              />
            </div>

            {/* Assigned Vehicle & Coordinator */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Assigned Transport / Shuttle</Label>
                <Select value={newAssignedVehicle} onValueChange={setNewAssignedVehicle}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="None / Walking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Walking / On-Site">Walking / On-Site</SelectItem>
                    {vehicleList.map((v) => (
                      <SelectItem key={v.id} value={v.vehicle_name}>
                        {v.vehicle_name} ({v.seating_capacity} Seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Coordinator / Lead</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. Vanessa (EA) / Marcus"
                  value={newCoordinator}
                  onChange={(e) => setNewCoordinator(e.target.value)}
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <Label className="text-xs mb-1 block">Target Audience</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. All Pilots & Support Crew / Executive Team"
                value={newTargetAudience}
                onChange={(e) => setNewTargetAudience(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={createMutation.isPending || !newTitle || !newMeetingSpot || !newScheduleDate}
              onClick={() =>
                createMutation.mutate({
                  event_id: newScheduleEventId || eventsList[0]?.id,
                  schedule_date: newScheduleDate,
                  start_time: newStartTime,
                  end_time: newEndTime,
                  title: newTitle,
                  activity_type: newActivityType,
                  meeting_spot: newMeetingSpot,
                  meeting_spot_instructions: newSpotInstructions,
                  assigned_vehicle_name: newAssignedVehicle,
                  target_audience: newTargetAudience,
                  coordinator_name: newCoordinator,
                  notes: newNotes,
                })
              }
            >
              {createMutation.isPending ? "Publishing..." : "Publish Spot & Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
