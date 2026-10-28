import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import { toast } from "sonner";
import {
  Wallet,
  Settings,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  MapPin,
  Calendar,
  Users,
  Search,
  Check,
  X,
  Plane,
  Building,
  Edit3,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Send,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EventStipendsOverview,
  EventTravelerStipendOverview,
} from "@/types/travel";

export default function TravelStipendPage() {
  const queryClient = useQueryClient();

  // Filters & Controls
  const [scope, setScope] = useState<string>("upcoming_inprogress");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEventIdForDetails, setSelectedEventIdForDetails] = useState<string | null>(null);

  // Global Setup Modal State
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [targetEventForGlobal, setTargetEventForGlobal] = useState<EventStipendsOverview | null>(null);
  const [globalDailyRate, setGlobalDailyRate] = useState<number>(90.0);
  const [globalDays, setGlobalDays] = useState<number>(4);
  const globalCurrency = "USD";
  const [globalTier, setGlobalTier] = useState("Tier 1 - High Cost Metro");
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState("direct_deposit");
  const [globalNotes, setGlobalNotes] = useState("");
  const [globalOverwriteCustom, setGlobalOverwriteCustom] = useState(false);

  // Custom Traveler Modal State
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [targetEventForCustom, setTargetEventForCustom] = useState<EventStipendsOverview | null>(null);
  const [targetTraveler, setTargetTraveler] = useState<EventTravelerStipendOverview | null>(null);
  const [customDailyRate, setCustomDailyRate] = useState<number>(90.0);
  const [customDays, setCustomDays] = useState<number>(4);
  const [customTotalAmount, setCustomTotalAmount] = useState<number>(360.0);
  const [customTier, setCustomTier] = useState("Tier 1 - High Cost Metro");
  const [customPaymentMethod, setCustomPaymentMethod] = useState("direct_deposit");
  const [customNotes, setCustomNotes] = useState("");

  // Rejection Dialog State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState<"event" | "single">("event");
  const [rejectEventId, setRejectEventId] = useState<string>("");
  const [rejectStipendId, setRejectStipendId] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");

  // Queries
  const {
    data: eventsOverview = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["stipendsEventsOverview", scope],
    queryFn: () => travelService.getStipendsEventsOverview(scope),
  });

  const activeDetailEvent = useMemo(() => {
    if (!selectedEventIdForDetails) return null;
    return eventsOverview.find((e) => e.id === selectedEventIdForDetails) || null;
  }, [selectedEventIdForDetails, eventsOverview]);

  // Mutations
  const globalSetupMutation = useMutation({
    mutationFn: (vars: { eventId: string; data: any }) =>
      travelService.saveGlobalStipendSetup(vars.eventId, vars.data),
    onSuccess: (data: any) => {
      toast.success(
        data?.message || "Global stipend setup submitted for approval! Changes will apply once approved."
      );
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
      setGlobalModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to submit global stipend setup");
    },
  });

  const customChangeMutation = useMutation({
    mutationFn: (data: any) => travelService.saveCustomStipendChange(data),
    onSuccess: () => {
      toast.success("Custom stipend change submitted for approval! Will apply once approved.");
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
      setCustomModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to submit custom stipend change");
    },
  });

  const approveEventMutation = useMutation({
    mutationFn: (eventId: string) => travelService.approveEventStipends(eventId),
    onSuccess: () => {
      toast.success("Event stipends approved! Changes are now active.");
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to approve event stipends");
    },
  });

  const rejectEventMutation = useMutation({
    mutationFn: (vars: { eventId: string; reason?: string }) =>
      travelService.rejectEventStipends(vars.eventId, { reason: vars.reason }),
    onSuccess: () => {
      toast.success("Pending stipend changes rejected.");
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
      setRejectModalOpen(false);
      setRejectReason("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to reject event stipends");
    },
  });

  const approveSingleMutation = useMutation({
    mutationFn: (stipendId: string) => travelService.approveSingleStipend(stipendId),
    onSuccess: () => {
      toast.success("Traveler stipend approved and active!");
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to approve stipend");
    },
  });

  const rejectSingleMutation = useMutation({
    mutationFn: (vars: { stipendId: string; reason?: string }) =>
      travelService.rejectSingleStipend(vars.stipendId, { reason: vars.reason }),
    onSuccess: () => {
      toast.success("Traveler stipend change rejected.");
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
      setRejectModalOpen(false);
      setRejectReason("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to reject stipend");
    },
  });

  const disburseMutation = useMutation({
    mutationFn: (id: string) => travelService.disburseStipend(id),
    onSuccess: () => {
      toast.success("Stipend marked as disbursed!");
      queryClient.invalidateQueries({ queryKey: ["stipendsEventsOverview"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to disburse stipend");
    },
  });

  // Modal Handlers
  const handleOpenGlobalModal = (event: EventStipendsOverview) => {
    setTargetEventForGlobal(event);
    const defaultDays = event.default_stipend_days || event.duration_days || 4;
    const defaultRate = Number(event.default_daily_stipend) || 90.0;
    setGlobalDailyRate(defaultRate);
    setGlobalDays(defaultDays);
    setGlobalTier(event.stipend_tier || "Tier 1 - High Cost Metro");
    setGlobalPaymentMethod(event.stipend_payment_method || "direct_deposit");
    setGlobalNotes(`Global per-diem setup for ${event.title}`);
    setGlobalOverwriteCustom(false);
    setGlobalModalOpen(true);
  };

  const handleGlobalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEventForGlobal) return;
    globalSetupMutation.mutate({
      eventId: targetEventForGlobal.id,
      data: {
        daily_rate: Number(globalDailyRate),
        total_days: Number(globalDays),
        currency: globalCurrency,
        destination_tier: globalTier,
        payment_method: globalPaymentMethod,
        notes: globalNotes,
        apply_to_custom_overrides: globalOverwriteCustom,
      },
    });
  };

  const handleOpenCustomModal = (
    event: EventStipendsOverview,
    traveler: EventTravelerStipendOverview
  ) => {
    setTargetEventForCustom(event);
    setTargetTraveler(traveler);

    const initialDaily =
      traveler.pending_daily_rate ||
      traveler.daily_rate ||
      event.default_daily_stipend ||
      90.0;
    const initialDays =
      traveler.pending_total_days ||
      traveler.total_days ||
      event.default_stipend_days ||
      event.duration_days ||
      4;
    const initialTotal =
      traveler.pending_total_amount ||
      traveler.total_amount ||
      Number(initialDaily) * Number(initialDays);

    setCustomDailyRate(Number(initialDaily));
    setCustomDays(Number(initialDays));
    setCustomTotalAmount(Number(initialTotal));
    setCustomTier(traveler.destination_tier || event.stipend_tier || "Tier 1 - High Cost Metro");
    setCustomPaymentMethod(traveler.payment_method || event.stipend_payment_method || "direct_deposit");
    setCustomNotes(
      traveler.pending_notes ||
        traveler.stipend_notes ||
        `Custom stipend adjustment for ${traveler.attendee_name}`
    );
    setCustomModalOpen(true);
  };

  const handleCustomDailyOrDaysChange = (daily: number, days: number) => {
    setCustomDailyRate(daily);
    setCustomDays(days);
    setCustomTotalAmount(round(daily * days));
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEventForCustom || !targetTraveler) return;

    customChangeMutation.mutate({
      event_id: targetEventForCustom.id,
      attendee_id: targetTraveler.attendee_id,
      recipient_name: targetTraveler.attendee_name,
      recipient_email: targetTraveler.attendee_email,
      daily_rate: Number(customDailyRate),
      total_days: Number(customDays),
      total_amount: Number(customTotalAmount),
      currency: targetTraveler.currency || "USD",
      destination_tier: customTier,
      payment_method: customPaymentMethod,
      notes: customNotes,
    });
  };

  const handleOpenRejectModal = (mode: "event" | "single", eventId: string, stipendId?: string) => {
    setRejectMode(mode);
    setRejectEventId(eventId);
    setRejectStipendId(stipendId || "");
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (rejectMode === "event") {
      rejectEventMutation.mutate({ eventId: rejectEventId, reason: rejectReason });
    } else {
      rejectSingleMutation.mutate({ stipendId: rejectStipendId, reason: rejectReason });
    }
  };

  // High-level Metrics (Scoped by active view)
  const metrics = useMemo(() => {
    const scopedEvents = eventsOverview.filter((ev) => {
      if (scope === "upcoming_inprogress") {
        return ev.status !== "completed" && ev.status !== "cancelled";
      } else if (scope === "past") {
        return (
          ev.status === "completed" ||
          (ev.end_date && new Date(ev.end_date + "T23:59:59") < new Date())
        );
      }
      return true;
    });

    let totalEvents = scopedEvents.length;
    let totalTravelers = 0;
    let pendingApprovalCount = 0;
    let approvedCount = 0;
    let disbursedCount = 0;
    let totalApprovedVolume = 0;
    let totalPendingVolume = 0;

    scopedEvents.forEach((ev) => {
      totalTravelers += ev.travelers?.length || 0;
      pendingApprovalCount += Number(ev.pending_stipends_count || 0);
      approvedCount += Number(ev.approved_stipends_count || 0);
      disbursedCount += Number(ev.disbursed_stipends_count || 0);
      totalApprovedVolume += Number(ev.approved_stipends_total || 0);
      totalPendingVolume += Number(ev.pending_stipends_total || 0);
    });

    return {
      totalEvents,
      totalTravelers,
      pendingApprovalCount,
      approvedCount,
      disbursedCount,
      totalApprovedVolume,
      totalPendingVolume,
    };
  }, [eventsOverview, scope]);

  // Filtered Events & Travelers
  const filteredEvents = useMemo(() => {
    return eventsOverview
      .filter((ev) => {
        // Enforce strict scope segregation:
        // Upcoming & In-progress must NEVER show completed or cancelled events
        if (scope === "upcoming_inprogress") {
          if (ev.status === "completed" || ev.status === "cancelled") {
            return false;
          }
        } else if (scope === "past") {
          // Completed should be shown in Past Events tab along with events where end_date has passed
          const isCompleted = ev.status === "completed";
          const isPastDate =
            ev.end_date && new Date(ev.end_date + "T23:59:59") < new Date();
          if (!isCompleted && !isPastDate) {
            return false;
          }
        }
        return true;
      })
      .map((ev) => {
        // Filter travelers by status
        let matchingTravelers = ev.travelers || [];
        if (statusFilter !== "all") {
          matchingTravelers = matchingTravelers.filter((t) => {
            if (statusFilter === "pending_approval") return t.stipend_status === "pending_approval";
            if (statusFilter === "approved") return t.stipend_status === "approved";
            if (statusFilter === "disbursed") return t.stipend_status === "disbursed";
            if (statusFilter === "not_configured") return t.stipend_status === "not_configured";
            return true;
          });
        }

        // Search Query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesEventTitle = ev.title?.toLowerCase().includes(q);
          const matchesEventLoc = (ev.location || "").toLowerCase().includes(q);
          const matchesVenue = (ev.venue || "").toLowerCase().includes(q);

          if (!matchesEventTitle && !matchesEventLoc && !matchesVenue) {
            // check if any individual traveler matches
            matchingTravelers = matchingTravelers.filter(
              (t) =>
                t.attendee_name?.toLowerCase().includes(q) ||
                t.attendee_email?.toLowerCase().includes(q) ||
                (t.role_in_event || "").toLowerCase().includes(q)
            );
          }
        }

        return {
          ...ev,
          travelers: matchingTravelers,
        };
      })
      .filter((ev) => {
        if (searchQuery.trim() || statusFilter !== "all") {
          return ev.travelers.length > 0;
        }
        return true;
      });
  }, [eventsOverview, scope, statusFilter, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                  User Stipends &amp; Per-Diem Management
                </h1>
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold"
                >
                  By Events &bull; Approval Workflow
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                Configure global event per-diem baselines or custom traveler allocations. All updates require approval before applying.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9 gap-1.5 text-xs font-medium bg-white dark:bg-zinc-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${
                isLoading || isRefetching ? "animate-spin text-indigo-600" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Events Monitored */}
        <Card className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-zinc-400">
              {scope === "past"
                ? "Past & Completed Events"
                : scope === "all"
                ? "Total Events Monitored"
                : "Active & Upcoming Events"}
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {metrics.totalEvents}
            </span>
            <span className="text-xs font-medium text-slate-500">
              ({metrics.totalTravelers} Travelers)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            {scope === "past"
              ? "Completed trips & historic events"
              : scope === "all"
              ? "All registered travel events"
              : "Planning, in-progress & upcoming"}
          </p>
        </Card>

        {/* Pending Approvals */}
        <Card
          className={`p-4 rounded-xl border shadow-2xs transition-all ${
            metrics.pendingApprovalCount > 0
              ? "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
              : "border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase ${
                metrics.pendingApprovalCount > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-slate-500 dark:text-zinc-400"
              }`}
            >
              Pending Approvals
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                metrics.pendingApprovalCount > 0
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-500"
              }`}
            >
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                metrics.pendingApprovalCount > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-slate-900 dark:text-zinc-100"
              }`}
            >
              {metrics.pendingApprovalCount}
            </span>
            {metrics.pendingApprovalCount > 0 && (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                (${metrics.totalPendingVolume.toLocaleString()} proposed)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            {metrics.pendingApprovalCount > 0
              ? "Requires admin / manager sign-off"
              : "All stipend change requests approved"}
          </p>
        </Card>

        {/* Approved Stipends */}
        <Card className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
              Approved Stipend Pool
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
              ${metrics.totalApprovedVolume.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600">
              {metrics.approvedCount} approved
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Ready for banking disbursement
          </p>
        </Card>

        {/* Disbursed Payouts */}
        <Card className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-700 dark:text-blue-400">
              Disbursed / Settled
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100/80 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
              {metrics.disbursedCount}
            </span>
            <span className="text-xs font-medium text-blue-600">Travelers</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Direct deposits &amp; cards disbursed
          </p>
        </Card>
      </div>

      {/* ── Toolbar: Scope Tabs & Search/Filters ── */}
      <Card className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Timeline Scope Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
            <button
              onClick={() => setScope("upcoming_inprogress")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                scope === "upcoming_inprogress"
                  ? "bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              Upcoming &amp; In-Progress Events
            </button>
            <button
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                scope === "all"
                  ? "bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setScope("past")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                scope === "past"
                  ? "bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
              }`}
            >
              Past Events
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search event title, city, attendee name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs font-medium">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stipend Statuses</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved &amp; Active</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
                <SelectItem value="not_configured">Not Configured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Events & Travelers List ── */}
      {isLoading ? (
        <Card className="p-12 text-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
              Loading upcoming events and traveler stipends...
            </span>
          </div>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-12 text-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400">
              <Calendar className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">
              No matching events found
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search query or status filter to see all events."
                : "There are currently no events registered under this scope."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => {
            const hasPendingApprovals = (event.pending_stipends_count || 0) > 0;
            const defaultTotal =
              (event.default_daily_stipend || 90.0) *
              (event.default_stipend_days || event.duration_days || 4);

            return (
              <Card
                key={event.id}
                onClick={() => setSelectedEventIdForDetails(event.id)}
                className={`group relative rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden bg-white dark:bg-zinc-900 ${
                  hasPendingApprovals
                    ? "border-amber-300 dark:border-amber-700/80 hover:border-amber-400"
                    : "border-slate-200/90 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                }`}
              >
                {/* Card Main Info */}
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="capitalize text-[10px] font-medium"
                      >
                        {event.event_type?.replace("_", " ") || "Event"}
                      </Badge>
                      <Badge
                        variant={event.status === "completed" ? "secondary" : "outline"}
                        className={`capitalize text-[10px] font-medium ${
                          event.status === "ongoing" || event.status === "in_progress"
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                            : event.status === "confirmed"
                            ? "border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40"
                            : ""
                        }`}
                      >
                        {event.status}
                      </Badge>
                    </div>

                    {hasPendingApprovals ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 gap-1 text-[10px] font-semibold">
                        <Clock className="h-3 w-3" />
                        <span>{event.pending_stipends_count} Pending</span>
                      </Badge>
                    ) : (event.approved_stipends_count || 0) > 0 ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 gap-1 text-[10px] font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{event.approved_stipends_count} Approved</span>
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {event.title}
                    </h3>
                    <div className="mt-1.5 flex flex-col gap-1 text-xs text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {event.location} {event.venue ? `(${event.venue})` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-zinc-300">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>
                          {event.start_date} &ndash; {event.end_date} ({event.duration_days}d)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stipend Baseline & Attendees Box */}
                  <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-zinc-200">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{event.travelers?.length || 0} Travelers</span>
                      </span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                        ${defaultTotal.toLocaleString()} / person
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        ${event.default_daily_stipend || 90.0}/day &bull;{" "}
                        {event.default_stipend_days || event.duration_days || 4} days
                      </span>
                      <span className="truncate max-w-[125px]">
                        {event.stipend_tier || "Tier 1 - High Cost Metro"}
                      </span>
                    </div>
                  </div>

                  {/* Status Banner inside card */}
                  {hasPendingApprovals ? (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-[11px]">
                      <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span>Changes pending:</span>
                      </span>
                      <span className="font-bold font-mono text-amber-700 dark:text-amber-400">
                        +${Number(event.pending_stipends_total || 0).toLocaleString()}
                      </span>
                    </div>
                  ) : (event.approved_stipends_count || 0) > 0 ? (
                    <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                        Approved pool:
                      </span>
                      <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        ${Number(event.approved_stipends_total || 0).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Stipend status:</span>
                      <span>Default baseline set</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3.5 sm:px-5 sm:py-3 border-t bg-slate-50/60 dark:bg-zinc-900/60 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenGlobalModal(event);
                    }}
                    className="h-8 px-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 gap-1.5"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Global Setup</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {hasPendingApprovals && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          approveEventMutation.mutate(event.id);
                        }}
                        disabled={approveEventMutation.isPending}
                        className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventIdForDetails(event.id);
                      }}
                      className="h-8 px-2.5 text-xs font-semibold gap-1 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Event Detail Modal (Full Roster & Interactive Stipend Control) ── */}
      {activeDetailEvent && (
        <Dialog
          open={!!activeDetailEvent}
          onOpenChange={(open) => {
            if (!open) setSelectedEventIdForDetails(null);
          }}
        >
          <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1400px] max-h-[92vh] p-0 overflow-hidden rounded-2xl flex flex-col">
            {/* Modal Header */}
            <DialogHeader className="p-5 pb-4 border-b bg-slate-50/80 dark:bg-zinc-900/60 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                        {activeDetailEvent.title}
                      </DialogTitle>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {activeDetailEvent.event_type?.replace("_", " ") || "Event"}
                      </Badge>
                      <Badge
                        variant={activeDetailEvent.status === "completed" ? "secondary" : "outline"}
                        className="text-[10px] capitalize"
                      >
                        {activeDetailEvent.status}
                      </Badge>
                      {(activeDetailEvent.pending_stipends_count || 0) > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 gap-1 text-[10px] font-semibold">
                          <Clock className="h-3 w-3" />
                          <span>{activeDetailEvent.pending_stipends_count} Pending Approval</span>
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {activeDetailEvent.location} {activeDetailEvent.venue ? `(${activeDetailEvent.venue})` : ""}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-zinc-300">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {activeDetailEvent.start_date} &ndash; {activeDetailEvent.end_date} ({activeDetailEvent.duration_days} Days)
                      </span>
                    </DialogDescription>
                  </div>
                </div>

                {/* Quick Header Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenGlobalModal(activeDetailEvent)}
                    className="h-8 gap-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 shadow-2xs"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Global Setup</span>
                  </Button>

                  {(activeDetailEvent.pending_stipends_count || 0) > 0 && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approveEventMutation.mutate(activeDetailEvent.id)}
                        disabled={approveEventMutation.isPending}
                        className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve All ({activeDetailEvent.pending_stipends_count})</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRejectModal("event", activeDetailEvent.id)}
                        disabled={rejectEventMutation.isPending}
                        className="h-8 gap-1 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 space-y-4 text-xs">
              {/* Approval Notice Banner */}
              {(activeDetailEvent.pending_stipends_count || 0) > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                      <span className="font-bold">Pending Review:</span> There are {activeDetailEvent.pending_stipends_count} traveler stipend changes proposed for this event totaling <span className="font-mono font-bold">${Number(activeDetailEvent.pending_stipends_total || 0).toLocaleString()}</span>. Changes will not be disbursed until approved.
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => approveEventMutation.mutate(activeDetailEvent.id)}
                    disabled={approveEventMutation.isPending}
                    className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-2xs"
                  >
                    Approve All
                  </Button>
                </div>
              )}

              {/* Event Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Travelers</span>
                  <div className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-0.5 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-500" />
                    {activeDetailEvent.travelers?.length || 0} Registered
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Global Baseline</span>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">
                    ${activeDetailEvent.default_daily_stipend || 90.0}/day
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {activeDetailEvent.default_stipend_days || activeDetailEvent.duration_days || 4} days = ${(
                      (activeDetailEvent.default_daily_stipend || 90.0) *
                      (activeDetailEvent.default_stipend_days || activeDetailEvent.duration_days || 4)
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Approved Pool</span>
                  <div className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono">
                    ${Number(activeDetailEvent.approved_stipends_total || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-600/80">
                    {activeDetailEvent.approved_stipends_count || 0} Travelers Approved
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Changes</span>
                  <div className="text-base font-bold text-amber-700 dark:text-amber-300 mt-0.5 font-mono">
                    ${Number(activeDetailEvent.pending_stipends_total || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-600/80">
                    {activeDetailEvent.pending_stipends_count || 0} Awaiting Approval
                  </span>
                </div>
              </div>

              {/* Roster & Stipends Table */}
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
                {activeDetailEvent.travelers.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-zinc-300 block mb-1">
                      No attendees registered
                    </span>
                    <span>No attendees registered for this event yet. Add attendees under Events &amp; Roster to assign stipends.</span>
                  </div>
                ) : (
                  <Table className="m-0 w-full text-xs min-w-[800px]">
                    <TableHeader className="bg-slate-50/70 dark:bg-zinc-900/40 text-[11px] uppercase tracking-wider text-slate-500">
                      <TableRow>
                        <TableHead className="w-56">Traveler</TableHead>
                        <TableHead className="w-36">Event Logistics</TableHead>
                        <TableHead className="w-36">Stipend Allocation</TableHead>
                        <TableHead className="w-32">Daily Rate &bull; Days</TableHead>
                        <TableHead className="w-36">Stipend Total</TableHead>
                        <TableHead className="w-36">Approval Status</TableHead>
                        <TableHead className="w-40 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeDetailEvent.travelers.map((traveler) => {
                        const isPending = traveler.stipend_status === "pending_approval";
                        const isApproved = traveler.stipend_status === "approved";
                        const isDisbursed = traveler.stipend_status === "disbursed";
                        const isRejected = traveler.stipend_status === "rejected";
                        const isUnconfigured = traveler.stipend_status === "not_configured";

                        const displayDaily = isPending
                          ? traveler.pending_daily_rate || traveler.daily_rate || activeDetailEvent.default_daily_stipend || 90.0
                          : traveler.daily_rate || activeDetailEvent.default_daily_stipend || 90.0;

                        const displayDays = isPending
                          ? traveler.pending_total_days || traveler.total_days || activeDetailEvent.default_stipend_days || activeDetailEvent.duration_days || 4
                          : traveler.total_days || activeDetailEvent.default_stipend_days || activeDetailEvent.duration_days || 4;

                        const displayTotal = isPending
                          ? traveler.pending_total_amount || traveler.total_amount || displayDaily * displayDays
                          : traveler.total_amount || displayDaily * displayDays;

                        return (
                          <TableRow
                            key={traveler.attendee_id}
                            className={`transition-colors ${
                              isPending
                                ? "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70"
                                : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                            }`}
                          >
                            {/* Traveler Info */}
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                                  {traveler.attendee_name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {traveler.attendee_email}
                                </span>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                  {traveler.role_in_event || "Lead Drone Pilot"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Logistics Details */}
                            <TableCell>
                              <div className="flex flex-col gap-1 text-[11px]">
                                <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400">
                                  <Plane className="h-3 w-3 text-slate-400" />
                                  <span className="truncate max-w-[130px]">
                                    {traveler.flight_details || "Flight Confirmed"}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400">
                                  <Building className="h-3 w-3 text-slate-400" />
                                  <span className="truncate max-w-[130px]">
                                    {traveler.lodging_details || "Lodging Reserved"}
                                  </span>
                                </span>
                              </div>
                            </TableCell>

                            {/* Stipend Allocation Type */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {traveler.is_custom_override ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 text-[10px] font-semibold w-fit"
                                  >
                                    Custom Override
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-medium w-fit"
                                  >
                                    Global Default
                                  </Badge>
                                )}
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                  {traveler.destination_tier || activeDetailEvent.stipend_tier || "Tier 1 Metro"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Daily Rate & Days */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                  ${displayDaily.toFixed(2)} / day
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {displayDays} {displayDays === 1 ? "Day" : "Days"}
                                </span>
                              </div>
                            </TableCell>

                            {/* Stipend Total Amount */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">
                                  ${displayTotal.toFixed(2)}{" "}
                                  <span className="text-[10px] font-normal text-slate-500">
                                    {traveler.currency || "USD"}
                                  </span>
                                </span>

                                {isPending && traveler.total_amount && traveler.total_amount !== displayTotal && (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium line-through">
                                    Was: ${traveler.total_amount.toFixed(2)}
                                  </span>
                                )}

                                {traveler.stipend_notes && (
                                  <span className="text-[10px] text-slate-400 italic truncate max-w-[130px]" title={traveler.stipend_notes}>
                                    {traveler.stipend_notes}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Approval Status Badge */}
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                {isPending && (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 gap-1 text-[11px] font-semibold w-fit">
                                    <Clock className="h-3 w-3" />
                                    <span>Pending Approval</span>
                                  </Badge>
                                )}
                                {isApproved && (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 gap-1 text-[11px] font-semibold w-fit">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Approved</span>
                                  </Badge>
                                )}
                                {isDisbursed && (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 gap-1 text-[11px] font-semibold w-fit">
                                    <FileCheck2 className="h-3 w-3" />
                                    <span>Disbursed</span>
                                  </Badge>
                                )}
                                {isRejected && (
                                  <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 text-[11px] font-semibold w-fit">
                                    Rejected
                                  </Badge>
                                )}
                                {isUnconfigured && (
                                  <Badge variant="outline" className="text-slate-500 text-[10px] w-fit">
                                    Unconfigured
                                  </Badge>
                                )}

                                {traveler.approved_by && (
                                  <span className="text-[10px] text-slate-400">
                                    By {traveler.approved_by}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Row Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Edit / Custom Override */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenCustomModal(activeDetailEvent, traveler)}
                                  title="Custom change for this traveler"
                                  className="h-7 px-2 text-xs font-semibold gap-1 text-slate-700 dark:text-zinc-200"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Custom</span>
                                </Button>

                                {/* If pending, single approve / reject */}
                                {isPending && traveler.stipend_id && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => approveSingleMutation.mutate(traveler.stipend_id!)}
                                      disabled={approveSingleMutation.isPending}
                                      title="Approve this traveler's stipend change"
                                      className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenRejectModal("single", activeDetailEvent.id, traveler.stipend_id!)}
                                      disabled={rejectSingleMutation.isPending}
                                      title="Reject this stipend change"
                                      className="h-7 w-7 p-0 border-rose-200 text-rose-700 hover:bg-rose-50"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}

                                {/* Disburse button if approved */}
                                {isApproved && traveler.stipend_id && (
                                  <Button
                                    size="sm"
                                    onClick={() => disburseMutation.mutate(traveler.stipend_id!)}
                                    disabled={disburseMutation.isPending}
                                    className="h-7 px-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                  >
                                    <Send className="h-3 w-3" />
                                    <span>Disburse</span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <DialogFooter className="m-0 p-4 sm:px-6 border-t bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between sm:justify-between shrink-0">
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                Event ID: <span className="font-mono text-[11px]">{activeDetailEvent.id}</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedEventIdForDetails(null)}
                className="h-8 text-xs font-semibold px-4"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Global Stipends Setup Modal ── */}
      {targetEventForGlobal && (
        <Dialog open={globalModalOpen} onOpenChange={setGlobalModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl p-0 overflow-hidden rounded-2xl">
            <form onSubmit={handleGlobalSubmit}>
              <DialogHeader className="p-5 pb-3 border-b bg-slate-50/80 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold">
                      Global Event Stipend Setup
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Event: <span className="font-semibold text-slate-800 dark:text-zinc-200">{targetEventForGlobal.title}</span> &bull;{" "}
                      {targetEventForGlobal.travelers?.length || 0} Travelers
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs">
                {/* Approval Notice Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                    <span className="font-bold">Approval Required:</span> Submitting this global setup will stage changes for all travelers in this event under <strong>Pending Approval</strong>. The stipends will only take effect and disburse after approved.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Daily Rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Default Daily Rate ($)</Label>
                    <Input
                      type="number"
                      step="5.00"
                      min="1"
                      required
                      value={globalDailyRate}
                      onChange={(e) => setGlobalDailyRate(Number(e.target.value))}
                      className="h-9 text-xs font-semibold font-mono"
                    />
                  </div>

                  {/* Total Days */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Total Days</Label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={globalDays}
                      onChange={(e) => setGlobalDays(Number(e.target.value))}
                      className="h-9 text-xs font-semibold font-mono"
                    />
                  </div>
                </div>

                {/* Calculated preview */}
                <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-950 dark:text-indigo-200">
                    Total Stipend per Traveler:
                  </span>
                  <span className="text-sm font-bold font-mono text-indigo-700 dark:text-indigo-300">
                    ${round(globalDailyRate * globalDays).toFixed(2)} USD
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Destination Tier */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Destination Cost Tier</Label>
                    <Select value={globalTier} onValueChange={setGlobalTier}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tier 1 - High Cost Metro">Tier 1 - High Cost Metro</SelectItem>
                        <SelectItem value="Tier 2 - Standard Metro">Tier 2 - Standard Metro</SelectItem>
                        <SelectItem value="Tier 3 - Regional / Domestic">Tier 3 - Regional / Domestic</SelectItem>
                        <SelectItem value="International Expedition">International Expedition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Payment Method</Label>
                    <Select value={globalPaymentMethod} onValueChange={setGlobalPaymentMethod}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct_deposit">Direct Deposit / ACH</SelectItem>
                        <SelectItem value="corporate_card">Corporate Card</SelectItem>
                        <SelectItem value="payroll">Payroll Disbursement</SelectItem>
                        <SelectItem value="cash_advance">Cash Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Justification / Notes</Label>
                  <Textarea
                    rows={2}
                    placeholder="Enter reason or policy notes for this global stipend allocation..."
                    value={globalNotes}
                    onChange={(e) => setGlobalNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Overwrite custom checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="overwrite-custom"
                    checked={globalOverwriteCustom}
                    onCheckedChange={(c) => setGlobalOverwriteCustom(!!c)}
                  />
                  <Label htmlFor="overwrite-custom" className="text-xs text-slate-700 dark:text-zinc-300 font-normal cursor-pointer">
                    Overwrite travelers who already have custom overrides configured
                  </Label>
                </div>
              </div>

              <DialogFooter className="m-0 p-4 sm:px-6 sm:py-4 border-t bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGlobalModalOpen(false)}
                  className="text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={globalSetupMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 h-9 px-4 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit for Approval</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Custom Traveler Change Modal ── */}
      {targetEventForCustom && targetTraveler && (
        <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl p-0 overflow-hidden rounded-2xl">
            <form onSubmit={handleCustomSubmit}>
              <DialogHeader className="p-5 pb-3 border-b bg-slate-50/80 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    <Edit3 className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold">
                      Custom Traveler Stipend Adjustment
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {targetTraveler.attendee_name} ({targetTraveler.attendee_email}) &bull; {targetEventForCustom.title}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs">
                {/* Approval Notice Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                    <span className="font-bold">Approval Required:</span> This custom allocation will be submitted for approval first. Once approved, it replaces the global default for this traveler.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Daily Rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Custom Daily Rate ($)</Label>
                    <Input
                      type="number"
                      step="5.00"
                      min="1"
                      required
                      value={customDailyRate}
                      onChange={(e) =>
                        handleCustomDailyOrDaysChange(Number(e.target.value), customDays)
                      }
                      className="h-9 text-xs font-semibold font-mono"
                    />
                  </div>

                  {/* Total Days */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Total Days</Label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={customDays}
                      onChange={(e) =>
                        handleCustomDailyOrDaysChange(customDailyRate, Number(e.target.value))
                      }
                      className="h-9 text-xs font-semibold font-mono"
                    />
                  </div>

                  {/* Total Amount Override */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Calculated Total ($)</Label>
                      <span className="text-[10px] text-muted-foreground">Auto or editable</span>
                    </div>
                    <Input
                      type="number"
                      step="5.00"
                      min="1"
                      required
                      value={customTotalAmount}
                      onChange={(e) => setCustomTotalAmount(Number(e.target.value))}
                      className="h-9 text-xs font-bold font-mono text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Destination Tier */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Destination Cost Tier</Label>
                    <Select value={customTier} onValueChange={setCustomTier}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tier 1 - High Cost Metro">Tier 1 - High Cost Metro</SelectItem>
                        <SelectItem value="Tier 2 - Standard Metro">Tier 2 - Standard Metro</SelectItem>
                        <SelectItem value="Tier 3 - Regional / Domestic">Tier 3 - Regional / Domestic</SelectItem>
                        <SelectItem value="International Expedition">International Expedition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Payment Method</Label>
                    <Select value={customPaymentMethod} onValueChange={setCustomPaymentMethod}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct_deposit">Direct Deposit / ACH</SelectItem>
                        <SelectItem value="corporate_card">Corporate Card</SelectItem>
                        <SelectItem value="payroll">Payroll Disbursement</SelectItem>
                        <SelectItem value="cash_advance">Cash Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reason / Notes (Required for custom overrides) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Override Justification / Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={2}
                    required
                    placeholder="Specify why this traveler requires a custom stipend (e.g. equipment maintenance bonus, travel day extensions)..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="m-0 p-4 sm:px-6 sm:py-4 border-t bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomModalOpen(false)}
                  className="text-xs h-9 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={customChangeMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5 h-9 px-4 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Change for Approval</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Rejection Reason Modal ── */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b bg-rose-50/60 dark:bg-rose-950/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                <X className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-rose-900 dark:text-rose-200">
                  Reject Stipend Change Request
                </DialogTitle>
                <DialogDescription className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                  {rejectMode === "event"
                    ? "Reject all pending stipend requests for this event"
                    : "Reject this traveler's pending stipend request"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <Label className="text-xs font-semibold">Rejection Reason / Feedback</Label>
            <Textarea
              rows={3}
              placeholder="Provide a reason for rejecting this change (e.g. exceeds budget limit, incorrect travel duration)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="m-0 p-4 sm:px-6 sm:py-4 border-t bg-slate-50 dark:bg-zinc-900 flex items-center justify-between gap-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              disabled={rejectEventMutation.isPending || rejectSingleMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-9 px-4 shadow-sm"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function round(val: number): number {
  return Math.round(val * 100) / 100;
}
