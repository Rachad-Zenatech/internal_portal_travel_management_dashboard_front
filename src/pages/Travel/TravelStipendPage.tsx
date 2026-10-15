import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import {
  Wallet,
  Plus,
  Trash2,
  Send,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  UserCheck,
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
import type { TravelerStipend } from "@/types/travel";

export default function TravelStipendPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"by_event" | "flat">("by_event");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [collapsedEvents, setCollapsedEvents] = useState<Record<string, boolean>>({});

  // Form states
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [dailyRate, setDailyRate] = useState(90.0);
  const [totalDays, setTotalDays] = useState(5);
  const [currency, setCurrency] = useState("USD");
  const [destinationTier, setDestinationTier] = useState("Tier 1 - High Cost Metro");
  const [paymentMethod, setPaymentMethod] = useState("direct_deposit");
  const [stipendStatus, setStipendStatus] = useState<"pending" | "approved" | "disbursed">("approved");
  const [notes, setNotes] = useState("");

  // Queries
  const { data: stipends = [], isLoading: isLoadingStipends } = useQuery({
    queryKey: ["travelStipends"],
    queryFn: travelService.getStipends,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  // Fetch attendees for selected event in create modal
  const { data: selectedEventData } = useQuery({
    queryKey: ["travelEventDetails", selectedEventId],
    queryFn: () => travelService.getEvent(selectedEventId),
    enabled: !!selectedEventId,
  });

  // Mutations
  const createStipendMutation = useMutation({
    mutationFn: travelService.createStipend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelStipends"] });
      queryClient.invalidateQueries({ queryKey: ["travelEvents"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsCreateModalOpen(false);
      resetForm();
    },
  });

  const disburseMutation = useMutation({
    mutationFn: (id: string) => travelService.disburseStipend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelStipends"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
    },
  });

  const deleteStipendMutation = useMutation({
    mutationFn: (id: string) => travelService.deleteStipend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelStipends"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
    },
  });

  const resetForm = () => {
    setSelectedEventId("");
    setRecipientName("");
    setRecipientEmail("");
    setDailyRate(90.0);
    setTotalDays(5);
    setCurrency("USD");
    setDestinationTier("Tier 1 - High Cost Metro");
    setPaymentMethod("direct_deposit");
    setStipendStatus("approved");
    setNotes("");
  };

  const calculatedTotal = dailyRate * totalDays;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createStipendMutation.mutate({
      event_id: selectedEventId || undefined,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      daily_rate: Number(dailyRate),
      total_days: Number(totalDays),
      total_amount: Number(calculatedTotal),
      currency,
      destination_tier: destinationTier,
      payment_method: paymentMethod,
      status: stipendStatus,
      notes,
    });
  };

  const openModalForEvent = (eventId?: string) => {
    resetForm();
    if (eventId && eventId !== "unassigned") {
      setSelectedEventId(eventId);
      const ev = events.find((e) => e.id === eventId);
      if (ev?.start_date && ev?.end_date) {
        try {
          const d1 = new Date(ev.start_date);
          const d2 = new Date(ev.end_date);
          const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          setTotalDays(days);
        } catch {
          // ignore date parse errors
        }
      }
    }
    setIsCreateModalOpen(true);
  };

  const toggleEventCollapse = (eventId: string) => {
    setCollapsedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  // Filtered stipends list
  const filteredStipends = useMemo(() => {
    return stipends.filter((s) => {
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      const matchEvent =
        filterEventId === "all" ||
        (filterEventId === "unassigned" ? !s.event_id : s.event_id === filterEventId);
      return matchStatus && matchEvent;
    });
  }, [stipends, filterStatus, filterEventId]);

  // Group filtered stipends by event
  const eventSections = useMemo(() => {
    const map = new Map<string, TravelerStipend[]>();
    filteredStipends.forEach((s) => {
      const key = s.event_id || "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    const result: Array<{
      eventId: string;
      title: string;
      location?: string | null;
      venue?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      status?: string | null;
      stipends: TravelerStipend[];
      totalAmount: number;
      disbursedAmount: number;
      pendingAmount: number;
    }> = [];

    // Registered events
    events.forEach((ev) => {
      if (filterEventId !== "all" && filterEventId !== ev.id) return;
      const evStipends = map.get(ev.id) || [];
      // If filtering by status and event has no matching stipends, omit from list
      if (filterStatus !== "all" && evStipends.length === 0) return;

      const totalAmount = evStipends.reduce((acc, s) => acc + (s.total_amount || 0), 0);
      const disbursedAmount = evStipends
        .filter((s) => s.status === "disbursed")
        .reduce((acc, s) => acc + (s.total_amount || 0), 0);
      const pendingAmount = evStipends
        .filter((s) => s.status !== "disbursed")
        .reduce((acc, s) => acc + (s.total_amount || 0), 0);

      result.push({
        eventId: ev.id,
        title: ev.title,
        location: ev.location,
        venue: ev.venue,
        startDate: ev.start_date,
        endDate: ev.end_date,
        status: ev.status,
        stipends: evStipends,
        totalAmount,
        disbursedAmount,
        pendingAmount,
      });
    });

    // Unassigned stipends
    const unassignedStipends = map.get("unassigned") || [];
    if (unassignedStipends.length > 0 && (filterEventId === "all" || filterEventId === "unassigned")) {
      const totalAmount = unassignedStipends.reduce((acc, s) => acc + (s.total_amount || 0), 0);
      const disbursedAmount = unassignedStipends
        .filter((s) => s.status === "disbursed")
        .reduce((acc, s) => acc + (s.total_amount || 0), 0);
      const pendingAmount = unassignedStipends
        .filter((s) => s.status !== "disbursed")
        .reduce((acc, s) => acc + (s.total_amount || 0), 0);

      result.push({
        eventId: "unassigned",
        title: "General Travel (Unassigned / Operational Payouts)",
        location: "Various Locations",
        venue: "Headquarters",
        startDate: null,
        endDate: null,
        status: "general",
        stipends: unassignedStipends,
        totalAmount,
        disbursedAmount,
        pendingAmount,
      });
    }

    return result;
  }, [events, filteredStipends, filterEventId, filterStatus]);

  // Overall KPIs
  const totalDisbursed = stipends
    .filter((s) => s.status === "disbursed")
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalPending = stipends
    .filter((s) => s.status !== "disbursed")
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const eventsWithStipendsCount = new Set(
    stipends.filter((s) => s.event_id).map((s) => s.event_id)
  ).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Stipends by Events
            </h1>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800">
              Per-Diem Allowance Ledger
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Authorize daily per-diem allowances, track traveler disbursements by event, and manage direct deposits or corporate cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openModalForEvent()} className="gap-2 bg-primary text-primary-foreground shadow-xs text-xs">
            <Plus className="w-4 h-4" />
            <span>New User Stipend</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Disbursed</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{stipends.filter((s) => s.status === "disbursed").length} completed settlements</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pending / Approved Payouts</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{stipends.filter((s) => s.status !== "disbursed").length} awaiting settlement</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Events with Active Stipends</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {eventsWithStipendsCount} / {events.length} Events
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Expeditions with per-diem funding</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Active Recipients</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {stipends.length} Travelers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Pilots, crew & technical leads</span>
          </CardContent>
        </Card>
      </div>

      {/* View Switcher & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-card border border-border rounded-lg shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md bg-muted/30 p-0.5">
            <Button
              size="sm"
              variant={viewMode === "by_event" ? "default" : "ghost"}
              onClick={() => setViewMode("by_event")}
              className="text-xs h-7 gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>By Event</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "flat" ? "default" : "ghost"}
              onClick={() => setViewMode("flat")}
              className="text-xs h-7 gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flat Ledger</span>
            </Button>
          </div>

          {/* Filter by Event */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Event:</span>
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs max-w-[200px] truncate"
            >
              <option value="all">All Events ({events.length})</option>
              <option value="unassigned">Unassigned ({stipends.filter((s) => !s.event_id).length})</option>
              {events.map((ev) => {
                const count = stipends.filter((s) => s.event_id === ev.id).length;
                return (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
            {["all", "disbursed", "approved", "pending"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={filterStatus === st ? "secondary" : "ghost"}
                onClick={() => setFilterStatus(st)}
                className="text-xs capitalize h-7 px-2.5"
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {(filterEventId !== "all" || filterStatus !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterEventId("all");
              setFilterStatus("all");
            }}
            className="text-xs h-7 text-muted-foreground hover:text-foreground self-start lg:self-center"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* VIEW MODE 1: GROUPED BY EVENT */}
      {viewMode === "by_event" && (
        <div className="space-y-4">
          {isLoadingStipends || isLoadingEvents ? (
            <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
              Loading event stipends...
            </div>
          ) : eventSections.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-card">
              No events match the selected filters.
            </div>
          ) : (
            eventSections.map((sec) => {
              const isCollapsed = !!collapsedEvents[sec.eventId];
              return (
                <Card key={sec.eventId} className="border-border shadow-xs overflow-hidden">
                  {/* Event Section Header */}
                  <div className="p-4 bg-muted/20 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-bold text-foreground">
                          {sec.title}
                        </h2>
                        {sec.status && (
                          <Badge
                            variant="outline"
                            className={
                              sec.status === "confirmed" || sec.status === "ongoing"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[11px]"
                                : "bg-muted text-muted-foreground text-[11px]"
                            }
                          >
                            {sec.status.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {sec.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                            {sec.location}
                          </span>
                        )}
                        {sec.startDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                            {sec.startDate} {sec.endDate ? `→ ${sec.endDate}` : ""}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Users className="w-3.5 h-3.5" />
                          {sec.stipends.length} {sec.stipends.length === 1 ? "Traveler" : "Travelers"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0 flex-wrap">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">Event Stipend Total</span>
                        <span className="text-base font-bold text-foreground">
                          ${sec.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          Disbursed: ${sec.disbursedAmount.toFixed(0)} • Pending: ${sec.pendingAmount.toFixed(0)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModalForEvent(sec.eventId)}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          <span>Add Stipend</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleEventCollapse(sec.eventId)}
                          className="h-8 w-8 p-0 text-muted-foreground"
                          title={isCollapsed ? "Expand" : "Collapse"}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Event Stipends List */}
                  {!isCollapsed && (
                    <CardContent className="p-0">
                      {sec.stipends.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                          <p>No traveler stipends authorized yet for this expedition.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModalForEvent(sec.eventId)}
                            className="h-7 text-xs gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Stipend</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {sec.stipends.map((stipend) => (
                            <div
                              key={stipend.id}
                              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-muted/10 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">
                                    {stipend.recipient_name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      stipend.status === "disbursed"
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                        : stipend.status === "approved"
                                        ? "bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800"
                                        : "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800"
                                    }
                                  >
                                    {stipend.status.toUpperCase()}
                                  </Badge>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                                    {stipend.payment_method.replace("_", " ").toUpperCase()}
                                  </span>
                                </div>

                                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <span>{stipend.recipient_email}</span>
                                  <span>Tier: {stipend.destination_tier}</span>
                                </div>

                                <div className="text-[11px] text-muted-foreground/80 flex items-center gap-3 pt-0.5 flex-wrap">
                                  <span>
                                    Rate: ${stipend.daily_rate}/day × {stipend.total_days} days
                                  </span>
                                  {stipend.disbursed_at && (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      Disbursed on {new Date(stipend.disbursed_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {stipend.notes && <span>• {stipend.notes}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                                <div className="text-right">
                                  <span className="text-[11px] text-muted-foreground block">Total Stipend</span>
                                  <span className="text-lg font-bold text-foreground">
                                    ${(stipend.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {stipend.status !== "disbursed" && (
                                    <Button
                                      size="sm"
                                      onClick={() => disburseMutation.mutate(stipend.id)}
                                      disabled={disburseMutation.isPending}
                                      className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>Disburse</span>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteStipendMutation.mutate(stipend.id)}
                                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: FLAT LEDGER */}
      {viewMode === "flat" && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span>All Traveler Stipends Ledger</span>
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Showing {filteredStipends.length} entries
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoadingStipends ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading stipends...</div>
            ) : filteredStipends.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No stipends match the current filter. Click "New User Stipend" to create one.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStipends.map((stipend) => (
                  <div
                    key={stipend.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {stipend.recipient_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            stipend.status === "disbursed"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                              : stipend.status === "approved"
                              ? "bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800"
                              : "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800"
                          }
                        >
                          {stipend.status.toUpperCase()}
                        </Badge>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                          {stipend.payment_method.replace("_", " ").toUpperCase()}
                        </span>
                      </div>

                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>{stipend.recipient_email}</span>
                        <span>Tier: {stipend.destination_tier}</span>
                        {stipend.event_title && (
                          <span className="text-primary font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expedition: {stipend.event_title}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground/80 flex items-center gap-3 pt-0.5">
                        <span>
                          Rate: ${stipend.daily_rate}/day × {stipend.total_days} days
                        </span>
                        {stipend.disbursed_at && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Disbursed on {new Date(stipend.disbursed_at).toLocaleDateString()}
                          </span>
                        )}
                        {stipend.notes && <span>• {stipend.notes}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">Total Stipend</span>
                        <span className="text-lg font-bold text-foreground">
                          ${(stipend.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {stipend.status !== "disbursed" && (
                          <Button
                            size="sm"
                            onClick={() => disburseMutation.mutate(stipend.id)}
                            disabled={disburseMutation.isPending}
                            className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          >
                            <Send className="w-3 h-3" />
                            <span>Disburse</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteStipendMutation.mutate(stipend.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: Create User Stipend */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Authorize User Stipend ("Stipend for Who")</DialogTitle>
            <DialogDescription>
              Assign per-diem allowance to a traveler, pilot, or expedition attendee.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Associated Event */}
            <div>
              <Label className="text-xs font-semibold">Associated Expedition Event</Label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  const evId = e.target.value;
                  setSelectedEventId(evId);
                  const ev = events.find((item) => item.id === evId);
                  if (ev?.start_date && ev?.end_date) {
                    try {
                      const d1 = new Date(ev.start_date);
                      const d2 = new Date(ev.end_date);
                      const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                      setTotalDays(days);
                    } catch {}
                  }
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs mt-1"
              >
                <option value="">None / General Operational Payout</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.location} • {ev.start_date})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Attendee Select (if an event is chosen and attendees exist) */}
            {selectedEventId && selectedEventData?.attendees && selectedEventData.attendees.length > 0 && (
              <div className="p-2.5 bg-accent/40 rounded-lg border border-border/80 space-y-1">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Choose from Event Attendee Roster</span>
                </Label>
                <select
                  onChange={(e) => {
                    const attId = e.target.value;
                    if (!attId) return;
                    const att = selectedEventData.attendees.find((a) => a.id === attId);
                    if (att) {
                      setRecipientName(att.attendee_name);
                      setRecipientEmail(att.attendee_email);
                      if (att.stipend_amount > 0 && totalDays > 0) {
                        const calculatedDaily = Math.round((att.stipend_amount / totalDays) * 100) / 100;
                        setDailyRate(calculatedDaily > 0 ? calculatedDaily : 90);
                      }
                    }
                  }}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
                  defaultValue=""
                >
                  <option value="">-- Click to autofill with registered attendee --</option>
                  {selectedEventData.attendees.map((att) => (
                    <option key={att.id} value={att.id}>
                      {att.attendee_name} ({att.attendee_email}) - {att.role_in_event}
                      {att.stipend_amount > 0 ? ` [Per-diem: $${att.stipend_amount}]` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Selecting an attendee automatically fills their name, email, and per-diem rate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recipient Full Name</Label>
                <Input
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Recipient Email</Label>
                <Input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. name@company.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Daily Rate ($/day)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Total Travel Days</Label>
                <Input
                  type="number"
                  required
                  value={totalDays}
                  onChange={(e) => setTotalDays(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Calculated Preview */}
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Calculated Per-Diem Payout:</span>
              <span className="font-bold text-sm text-primary">
                ${calculatedTotal.toFixed(2)} USD
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Payment Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="direct_deposit">Direct Deposit / ACH</option>
                  <option value="corporate_card">Corporate Card Allowance</option>
                  <option value="cash_advance">Cash Advance</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Initial Status</Label>
                <select
                  value={stipendStatus}
                  onChange={(e) => setStipendStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Review</option>
                  <option value="disbursed">Disbursed Immediately</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes / Accounting Memo</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Meals & incidentals allowance, hotel meal deduction memo..."
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={createStipendMutation.isPending} className="text-xs">
                {createStipendMutation.isPending ? "Authorizing..." : "Authorize Stipend"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
