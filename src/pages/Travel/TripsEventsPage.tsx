import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plane,
  Bed,
  Car,
  Train,
  Receipt,
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  Briefcase,
  ArrowUpDown,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { travelService } from "@/services/travelService";
import type { EventTripGroup } from "@/types/travel";

// Gradient palettes for traveler avatars
const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-600",
  "from-emerald-600 to-teal-600",
  "from-violet-600 to-purple-600",
  "from-amber-600 to-orange-600",
  "from-pink-600 to-rose-600",
  "from-cyan-600 to-blue-600",
];

const getAvatarGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const getInitials = (name: string) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatCurrency = (val?: number | null) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Dates to be announced";
  if (start && !end) return start;
  if (!start && end) return end;
  if (start === end) return start!;
  return `${start} – ${end}`;
};

const formatFlightTime = (timeStr?: string | null) => {
  if (!timeStr) return "";
  try {
    if (timeStr.includes("T")) {
      const timePart = timeStr.split("T")[1];
      const [h, m] = timePart.split(":");
      return `${h}:${m}`;
    }
    return timeStr;
  } catch {
    return timeStr || "";
  }
};

export default function TripsEventsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "spend" | "bookings" | "name">("date");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic Navan Date Filtering Parameters
  const [dateFilterType, setDateFilterType] = useState<"created" | "startDate">("created");
  const [fromDate, setFromDate] = useState<string>("2026-01-01");
  const [toDate, setToDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  // Convert date string (YYYY-MM-DD) into int64 Unix epoch seconds (UTC)
  const getEpochSecondsUtc = (dateStr: string, isEndOfDay: boolean = false): number | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;
    const parts = dateStr.trim().split("-");
    if (parts.length !== 3) return undefined;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
    if (isEndOfDay) {
      return Math.floor(Date.UTC(y, m, d, 23, 59, 59) / 1000);
    }
    return Math.floor(Date.UTC(y, m, d, 0, 0, 0) / 1000);
  };

  // Fetch grouped trips and events from backend
  const {
    data: trips = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<EventTripGroup[]>({
    queryKey: ["tripsEventsGrouped"],
    queryFn: async () => {
      const res = await travelService.getAllTrips();
      return Array.isArray(res) ? res : ((res as any)?.data || []);
    },
    staleTime: 1000 * 30,
  });

  // Navan Real-Time Sync Mutation with UTC Unix Epoch Seconds parameters
  const syncMutation = useMutation({
    mutationFn: () => {
      const fromSec = getEpochSecondsUtc(fromDate, false);
      const toSec = getEpochSecondsUtc(toDate, true);
      return travelService.syncNavan({
        date_filter_type: dateFilterType,
        from_date: fromSec,
        to_date: toSec,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["tripsEventsGrouped"] });
      refetch();
      const bookingsCount = res?.synced_bookings ?? res?.data?.synced_bookings ?? res?.data?.bookings_synced ?? 0;
      const eventsCount = res?.synced_events ?? res?.data?.synced_events ?? res?.data?.events_synced ?? 0;
      toast.success("Navan sync completed", {
        description: `Successfully synchronized ${bookingsCount} live bookings across ${eventsCount} scheduled corporate events.`,
      });
    },
    onError: (err: any) => {
      toast.error("Navan sync failed", {
        description: err?.response?.data?.detail || err?.message || "Could not reach Navan gateway.",
      });
    },
  });

  const toggleEvent = (eventName: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventName]: !prev[eventName],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    trips.forEach((t) => {
      next[t.event_name] = true;
    });
    setExpandedEvents(next);
  };

  const collapseAll = () => {
    setExpandedEvents({});
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Confirmation copied to clipboard", {
      description: text,
      duration: 2000,
    });
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // KPI Metrics Calculations
  const stats = useMemo(() => {
    let totalSpend = 0;
    let totalBookings = 0;
    const travelerSet = new Set<string>();
    let eventsWithBookings = 0;
    let eventsWithoutBookings = 0;

    trips.forEach((t) => {
      totalSpend += t.total_spend || 0;
      totalBookings += t.total_bookings || 0;
      if (t.users.length > 0) {
        eventsWithBookings++;
      } else {
        eventsWithoutBookings++;
      }
      t.users.forEach((u) => {
        travelerSet.add(u.email || u.name);
      });
    });

    return {
      totalTrips: trips.length,
      totalSpend,
      totalBookings,
      totalTravelers: travelerSet.size,
      eventsWithBookings,
      eventsWithoutBookings,
    };
  }, [trips]);

  // Filtered and Sorted Trips/Events List
  const filteredTrips = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return trips
      .filter((t) => {
        // Search filter
        const matchesSearch =
          !term ||
          t.event_name.toLowerCase().includes(term) ||
          (t.location && t.location.toLowerCase().includes(term)) ||
          t.users.some(
            (u) =>
              u.name.toLowerCase().includes(term) ||
              (u.email && u.email.toLowerCase().includes(term)) ||
              u.bookings.some(
                (b) =>
                  (b.vendor && b.vendor.toLowerCase().includes(term)) ||
                  (b.origin && b.origin.toLowerCase().includes(term)) ||
                  (b.destination && b.destination.toLowerCase().includes(term)) ||
                  (b.confirmation_number && b.confirmation_number.toLowerCase().includes(term))
              )
          );

        // Booking Type & Zero-Booking Filter
        let matchesType = true;
        if (typeFilter === "ZERO_BOOKINGS") {
          matchesType = t.users.length === 0;
        } else if (typeFilter === "WITH_BOOKINGS") {
          matchesType = t.users.length > 0;
        } else if (typeFilter !== "ALL") {
          matchesType = t.users.some((u) =>
            u.bookings.some((b) => b.booking_type.toUpperCase() === typeFilter)
          );
        }

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "spend") return (b.total_spend || 0) - (a.total_spend || 0);
        if (sortBy === "bookings") return (b.total_bookings || 0) - (a.total_bookings || 0);
        if (sortBy === "name") return a.event_name.localeCompare(b.event_name);
        // Default: date (newest first)
        return (b.start_date || "").localeCompare(a.start_date || "");
      });
  }, [trips, searchTerm, typeFilter, sortBy]);

  return (
    <div className="w-full min-h-[calc(100vh-theme(spacing.28))] p-4 sm:p-6 lg:p-8 space-y-6 max-w-full">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Travel Operations • Navan Live Enterprise Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Trips & Events
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed">
              Consolidated enterprise roster of all corporate trips and scheduled group events.
              Grouped by event name with genuine Navan API bookings, real-time passenger spend, and active itineraries.
            </p>
          </div>

          <div className="flex flex-col xl:flex-row flex-wrap items-start xl:items-center gap-3 shrink-0">
            {/* Navan Date Range Filter & Sync Controls */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-indigo-500/30 rounded-xl p-2 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  aria-label="Filter Date Type"
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value as "created" | "startDate")}
                  className="bg-transparent text-white font-medium text-xs focus:outline-hidden cursor-pointer py-1"
                >
                  <option value="created" className="bg-slate-900 text-white">Created Date</option>
                  <option value="startDate" className="bg-slate-900 text-white">Start Date</option>
                </select>
              </div>

              <div className="h-4 w-px bg-white/20 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-slate-300 font-medium pl-1">
                  {dateFilterType === "startDate" ? "Start From:" : "Create From:"}
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 focus:bg-slate-900 text-white border border-white/15 rounded-lg px-2 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-slate-300 font-medium">
                  {dateFilterType === "startDate" ? "Start To:" : "Create To:"}
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 focus:bg-slate-900 text-white border border-white/15 rounded-lg px-2 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                />
              </div>

              <Button
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || isFetching}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md text-xs h-8 px-3 gap-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncMutation.isPending || isFetching ? "animate-spin" : ""}`}
                />
                {syncMutation.isPending ? "Syncing..." : "Sync Navan"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 text-xs h-8"
              >
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="bg-white/5 text-slate-200 border-white/10 hover:bg-white/10 text-xs h-8"
              >
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Collapse All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards - Full Width Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="bg-card/70 backdrop-blur-xs border-border/80 shadow-xs hover:border-indigo-500/30 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Corporate Trips & Events
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.totalTrips}</p>
              <p className="text-[11px] text-muted-foreground">
                {stats.eventsWithBookings} with bookings • {stats.eventsWithoutBookings} upcoming
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-xs border-border/80 shadow-xs hover:border-indigo-500/30 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Unique Travelers
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.totalTravelers}</p>
              <p className="text-[11px] text-muted-foreground">Active Corporate Roster</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-xs border-border/80 shadow-xs hover:border-indigo-500/30 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Travelers Booked
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
              <p className="text-[11px] text-muted-foreground">Confirmed Traveler Bookings</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur-xs border-border/80 shadow-xs hover:border-indigo-500/30 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Corporate Spend
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.totalSpend)}
              </p>
              <p className="text-[11px] text-muted-foreground">Live Navan Spend Total</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar - Full Width */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3.5 rounded-xl border border-border shadow-xs w-full">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events, travelers, flights, hotels, confirmation numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Booking Type Filter Tabs */}
          <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border/60">
            {[
              { id: "ALL", label: "All" },
              { id: "FLIGHT", label: "Flights", icon: Plane },
              { id: "HOTEL", label: "Hotels", icon: Bed },
              { id: "CAR", label: "Cars", icon: Car },
              { id: "ZERO_BOOKINGS", label: "0 Bookings", icon: AlertCircle },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTypeFilter(btn.id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  typeFilter === btn.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {btn.icon && <btn.icon className="w-3 h-3" />}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Sort By Select */}
          <div className="flex items-center gap-1 text-xs bg-muted/60 border border-border px-2 py-1 rounded-lg">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-foreground text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="spend">Highest Spend</option>
              <option value="bookings">Most Bookings</option>
              <option value="name">Event Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accordion Trips List - Full Width */}
      {isLoading ? (
        <div className="space-y-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-card/40 border border-border/60 animate-pulse w-full"
            />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card className="bg-card/50 border-dashed border-2 border-border p-12 text-center w-full">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Trips or Events Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchTerm || typeFilter !== "ALL"
              ? "No corporate trips match your search filters. Try clearing filters or searching for another event."
              : "No trip records currently available. Click 'Sync Navan' to import corporate travel."}
          </p>
          {(searchTerm || typeFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("ALL");
              }}
              className="mt-4 text-xs"
            >
              Clear All Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3.5 w-full">
          {filteredTrips.map((trip) => {
            const isExpanded = !!expandedEvents[trip.event_name];
            const flightCount = trip.users.reduce(
              (acc, u) => acc + u.bookings.filter((b) => b.booking_type === "FLIGHT").length,
              0
            );
            const hotelCount = trip.users.reduce(
              (acc, u) => acc + u.bookings.filter((b) => b.booking_type === "HOTEL").length,
              0
            );
            const carCount = trip.users.reduce(
              (acc, u) => acc + u.bookings.filter((b) => b.booking_type === "CAR").length,
              0
            );

            return (
              <div
                key={trip.event_name}
                className={`w-full rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "border-indigo-500/40 bg-card shadow-md ring-1 ring-indigo-500/10"
                    : "border-border/70 bg-card/70 hover:border-border hover:bg-card/90 shadow-xs"
                }`}
              >
                {/* Accordion Header Row */}
                <div
                  onClick={() => toggleEvent(trip.event_name)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                >
                  {/* Left: Title & Event Metadata */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      type="button"
                      aria-label={isExpanded ? "Collapse event" : "Expand event"}
                      className={`mt-0.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-transform duration-200 shrink-0 ${
                        isExpanded ? "rotate-180 text-indigo-500" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-foreground truncate tracking-tight">
                          {trip.event_name}
                        </h2>
                        {trip.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3 h-3 text-red-500" />
                            <span className="truncate max-w-[240px]">{trip.location}</span>
                          </span>
                        )}
                        {trip.total_bookings === 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1 font-medium"
                          >
                            <Clock className="w-2.5 h-2.5" />
                            No bookings yet
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                        </span>

                        <span>•</span>

                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium text-foreground">{trip.travelers_count}</span>
                          <span>{trip.travelers_count === 1 ? "Traveler" : "Travelers"}</span>
                        </span>

                        {trip.total_bookings > 0 && (
                          <>
                            <span>•</span>
                            <div className="inline-flex items-center gap-2 font-medium">
                              {flightCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400">
                                  <Plane className="w-3 h-3" /> {flightCount}
                                </span>
                              )}
                              {hotelCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                  <Bed className="w-3 h-3" /> {hotelCount}
                                </span>
                              )}
                              {carCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <Car className="w-3 h-3" /> {carCount}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Spend & Summary */}
                  <div className="flex items-center justify-between md:justify-end gap-4 pl-7 md:pl-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/40 shrink-0">
                    {/* Avatar stack of travelers */}
                    {trip.users.length > 0 && (
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {trip.users.slice(0, 4).map((u) => (
                          <div
                            key={u.email || u.name}
                            title={u.name}
                            className={`inline-block h-7 w-7 rounded-full ring-2 ring-background bg-gradient-to-br ${getAvatarGradient(
                              u.name
                            )} text-white flex items-center justify-center text-[10px] font-bold shadow-xs`}
                          >
                            {getInitials(u.name)}
                          </div>
                        ))}
                        {trip.users.length > 4 && (
                          <div className="inline-block h-7 w-7 rounded-full ring-2 ring-background bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium">
                            +{trip.users.length - 4}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-right min-w-[90px]">
                      <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(trip.total_spend)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium">
                        {trip.total_bookings} {trip.total_bookings === 1 ? "booking" : "bookings"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion Expanded Content: List of Users & Their Bookings */}
                {isExpanded && (
                  <div className="border-t border-border/80 bg-muted/20 p-4 sm:p-6 space-y-4 w-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        Travelers & Booking Roster ({trip.users.length})
                      </h4>
                      {trip.users.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          Click on confirmation number to copy
                        </span>
                      )}
                    </div>

                    {trip.users.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs bg-card rounded-xl border border-dashed border-border p-6 space-y-2 w-full">
                        <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40 mb-1" />
                        <p className="font-semibold text-foreground text-sm">
                          No bookings recorded for this event yet
                        </p>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          This event is registered in the corporate calendar. Once travelers complete
                          reservations through Navan, passenger itineraries and spend will automatically stream here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 w-full">
                        {trip.users.map((user) => (
                          <div
                            key={user.email || user.name}
                            className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3 w-full"
                          >
                            {/* User Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                    user.name
                                  )} text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                                >
                                  {getInitials(user.name)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground">
                                      {user.name}
                                    </span>
                                    {user.booking_types.map((bt) => (
                                      <Badge
                                        key={bt}
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 h-4 uppercase font-semibold"
                                      >
                                        {bt === "FLIGHT" && "✈️ Flight"}
                                        {bt === "HOTEL" && "🏨 Hotel"}
                                        {bt === "CAR" && "🚗 Car"}
                                        {bt !== "FLIGHT" && bt !== "HOTEL" && bt !== "CAR" && bt}
                                      </Badge>
                                    ))}
                                  </div>
                                  {user.email && (
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-center">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">User Total Spend</p>
                                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(user.total_spend)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* User Bookings Table / Cards */}
                            <div className="space-y-2">
                              {user.bookings.map((booking, bIdx) => {
                                const isFlight = booking.booking_type === "FLIGHT";
                                const isHotel = booking.booking_type === "HOTEL";
                                const isCar = booking.booking_type === "CAR";
                                const isTrain = booking.booking_type === "RAIL" || booking.booking_type === "TRAIN";
                                const isUnpaidCar =
                                  isCar &&
                                  (booking.amount <= 0 ||
                                    !booking.amount ||
                                    booking.vehicle_name ===
                                      "Payment Not Made - No Car Information yet" ||
                                    booking.vendor === "Payment Not Made - No Car Information yet");

                                return (
                                  <div
                                    key={booking.booking_id || bIdx}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40 gap-3"
                                  >
                                    {/* Left: Icon, Vendor/Vehicle, Confirmation */}
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      <div
                                        className={`p-2 rounded-md shrink-0 mt-0.5 ${
                                          isFlight
                                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                            : isHotel
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : isCar
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            : isTrain
                                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                      >
                                        {isFlight && <Plane className="w-4 h-4" />}
                                        {isHotel && <Bed className="w-4 h-4" />}
                                        {isCar && <Car className="w-4 h-4" />}
                                        {isTrain && <Train className="w-4 h-4" />}
                                        {!isFlight && !isHotel && !isCar && !isTrain && (
                                          <Receipt className="w-4 h-4" />
                                        )}
                                      </div>

                                      <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-foreground text-xs">
                                            {isUnpaidCar
                                              ? "Payment Not Made - No Car Information yet"
                                              : booking.vendor ||
                                                (isFlight
                                                  ? "No Flight information"
                                                  : isHotel
                                                  ? "No Hotel information"
                                                  : isCar
                                                  ? "No Vehicles information"
                                                  : isTrain
                                                  ? "No Train information"
                                                  : "Corporate Travel")}
                                          </span>

                                          {booking.booking_status && (
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] px-1.5 py-0 font-medium ${
                                                booking.booking_status === "CONFIRMED" ||
                                                booking.booking_status === "TICKETED"
                                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                  : booking.booking_status === "CANCELED" ||
                                                    booking.booking_status === "CANCELLED" ||
                                                    booking.booking_status === "VOIDED"
                                                  ? "bg-red-500/10 text-red-600 border-red-500/20"
                                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                              }`}
                                            >
                                              {booking.booking_status}
                                            </Badge>
                                          )}

                                          {isFlight && (
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] px-1.5 py-0 font-medium ${
                                                booking.is_round_trip
                                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                                              }`}
                                            >
                                              {booking.is_round_trip ? "Round-Trip" : "One-Way"}
                                            </Badge>
                                          )}

                                          {booking.confirmation_number && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleCopy(
                                                  booking.confirmation_number!,
                                                  booking.booking_id
                                                )
                                              }
                                              className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground bg-muted px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                              title="Click to copy confirmation number"
                                            >
                                              {copiedId === booking.booking_id ? (
                                                <Check className="w-3 h-3 text-emerald-500" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                              <span>{booking.confirmation_number}</span>
                                            </button>
                                          )}
                                        </div>

                                        {/* Route or Venue */}
                                        <div className="text-muted-foreground text-xs space-y-1">
                                          {isFlight && booking.is_round_trip ? (
                                            <div className="space-y-2 pt-0.5">
                                              {/* Outbound Leg */}
                                              <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                  <span className="font-semibold text-sky-600 dark:text-sky-400 text-[10px] uppercase tracking-wide bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                                    Departure
                                                  </span>
                                                  <span className="font-bold text-foreground tracking-tight">
                                                    {booking.outbound?.route_path || (
                                                      booking.outbound?.origin
                                                        ? `${booking.outbound.origin} → ${booking.outbound.destination}`
                                                        : `${booking.origin || "Origin"} → ${booking.destination || "Destination"}`
                                                    )}
                                                  </span>
                                                  {(booking.outbound?.flight_numbers || booking.flight_number) && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                      (Flight {booking.outbound?.flight_numbers || booking.flight_number}
                                                      {booking.outbound?.cabin || booking.cabin_class ? ` • ${booking.outbound?.cabin || booking.cabin_class}` : ""})
                                                    </span>
                                                  )}
                                                  {booking.outbound?.date && (
                                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                                      {booking.outbound.date}
                                                    </span>
                                                  )}
                                                  {booking.departure_flight_amount !== undefined && booking.departure_flight_amount !== null && (
                                                    <span className="text-[11px] font-semibold text-foreground/90">
                                                      • {formatCurrency(booking.departure_flight_amount)}
                                                    </span>
                                                  )}
                                                </div>
                                                {booking.outbound?.segments && booking.outbound.segments.length > 1 && (
                                                  <div className="flex flex-wrap items-center gap-1.5 pl-2.5 my-0.5 border-l-2 border-sky-500/30 ml-1">
                                                    {booking.outbound.segments.map((seg: any, sIdx: number) => {
                                                      const depCode = seg.departure?.airportCode || seg.departureAirportCode;
                                                      const arrCode = seg.arrival?.airportCode || seg.arrivalAirportCode;
                                                      const depTime = formatFlightTime(seg.startLocalDateTime || seg.departureTime);
                                                      const arrTime = formatFlightTime(seg.endLocalDateTime || seg.arrivalTime);
                                                      const fNum = seg.flightNumber || seg.flight_number;
                                                      const airline = seg.providerName || seg.airline || "";
                                                      return (
                                                        <span
                                                          key={sIdx}
                                                          className="inline-flex items-center gap-1 text-[10.5px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/40 font-mono"
                                                          title={`${airline ? `${airline} ` : ""}Flight ${fNum}: ${seg.departure?.city || depCode} to ${seg.arrival?.city || arrCode}`}
                                                        >
                                                          <span className="font-medium text-foreground/90">
                                                            {airline ? `${airline} ` : ""}Flt {fNum}:
                                                          </span>
                                                          <span>{depCode} {depTime ? `(${depTime})` : ""} → {arrCode} {arrTime ? `(${arrTime})` : ""}</span>
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Return Leg */}
                                              <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wide bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                    Return
                                                  </span>
                                                  <span className="font-bold text-foreground tracking-tight">
                                                    {booking.return_leg?.route_path || (
                                                      booking.return_leg?.origin
                                                        ? `${booking.return_leg.origin} → ${booking.return_leg.destination}`
                                                        : `${booking.destination || "Destination"} → ${booking.origin || "Origin"}`
                                                    )}
                                                  </span>
                                                  {booking.return_leg?.flight_numbers && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                      (Flight {booking.return_leg.flight_numbers}
                                                      {booking.return_leg.cabin || booking.cabin_class ? ` • ${booking.return_leg.cabin || booking.cabin_class}` : ""})
                                                    </span>
                                                  )}
                                                  {booking.return_leg?.date && (
                                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                                      {booking.return_leg.date}
                                                    </span>
                                                  )}
                                                  {booking.return_flight_amount !== undefined && booking.return_flight_amount !== null && (
                                                    <span className="text-[11px] font-semibold text-foreground/90">
                                                      • {formatCurrency(booking.return_flight_amount)}
                                                    </span>
                                                  )}
                                                </div>
                                                {booking.return_leg?.segments && booking.return_leg.segments.length > 1 && (
                                                  <div className="flex flex-wrap items-center gap-1.5 pl-2.5 my-0.5 border-l-2 border-emerald-500/30 ml-1">
                                                    {booking.return_leg.segments.map((seg: any, sIdx: number) => {
                                                      const depCode = seg.departure?.airportCode || seg.departureAirportCode;
                                                      const arrCode = seg.arrival?.airportCode || seg.arrivalAirportCode;
                                                      const depTime = formatFlightTime(seg.startLocalDateTime || seg.departureTime);
                                                      const arrTime = formatFlightTime(seg.endLocalDateTime || seg.arrivalTime);
                                                      const fNum = seg.flightNumber || seg.flight_number;
                                                      const airline = seg.providerName || seg.airline || "";
                                                      return (
                                                        <span
                                                          key={sIdx}
                                                          className="inline-flex items-center gap-1 text-[10.5px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/40 font-mono"
                                                          title={`${airline ? `${airline} ` : ""}Flight ${fNum}: ${seg.departure?.city || depCode} to ${seg.arrival?.city || arrCode}`}
                                                        >
                                                          <span className="font-medium text-foreground/90">
                                                            {airline ? `${airline} ` : ""}Flt {fNum}:
                                                          </span>
                                                          <span>{depCode} {depTime ? `(${depTime})` : ""} → {arrCode} {arrTime ? `(${arrTime})` : ""}</span>
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ) : isFlight ? (
                                            <div className="space-y-1">
                                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                <span className="font-bold text-foreground tracking-tight">
                                                  {booking.outbound?.route_path || (
                                                    booking.origin || booking.destination
                                                      ? `${booking.origin || "Origin"} → ${booking.destination || "Destination"}`
                                                      : "No Flight information"
                                                  )}
                                                </span>
                                                {booking.flight_number &&
                                                  booking.flight_number !== "No Flight information" && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                      (Flight {booking.flight_number}
                                                      {booking.cabin_class
                                                        ? ` • ${booking.cabin_class}`
                                                        : ""})
                                                    </span>
                                                  )}
                                                {booking.start_date && (
                                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                                    {booking.start_date.slice(0, 10)}
                                                  </span>
                                                )}
                                              </div>
                                              {booking.outbound?.segments && booking.outbound.segments.length > 1 && (
                                                <div className="flex flex-wrap items-center gap-1.5 pl-2.5 my-0.5 border-l-2 border-primary/30 ml-1">
                                                  {booking.outbound.segments.map((seg: any, sIdx: number) => {
                                                    const depCode = seg.departure?.airportCode || seg.departureAirportCode;
                                                    const arrCode = seg.arrival?.airportCode || seg.arrivalAirportCode;
                                                    const depTime = formatFlightTime(seg.startLocalDateTime || seg.departureTime);
                                                    const arrTime = formatFlightTime(seg.endLocalDateTime || seg.arrivalTime);
                                                    const fNum = seg.flightNumber || seg.flight_number;
                                                    const airline = seg.providerName || seg.airline || "";
                                                    return (
                                                      <span
                                                        key={sIdx}
                                                        className="inline-flex items-center gap-1 text-[10.5px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border/40 font-mono"
                                                      >
                                                        <span className="font-medium text-foreground/90">
                                                          {airline ? `${airline} ` : ""}Flt {fNum}:
                                                        </span>
                                                        <span>{depCode} {depTime ? `(${depTime})` : ""} → {arrCode} {arrTime ? `(${arrTime})` : ""}</span>
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          ) : null}

                                          {isHotel && (
                                            <div>
                                              <span className="font-medium text-foreground">
                                                {booking.hotel_room_name ||
                                                  booking.hotel_address ||
                                                  "No Hotel information"}
                                              </span>
                                              {booking.hotel_city && (
                                                <span className="ml-1 text-[11px] text-muted-foreground">
                                                  in {booking.hotel_city}
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {isCar && (
                                            <div className="space-y-1">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-medium text-foreground">
                                                  {isUnpaidCar
                                                    ? "Payment Not Made - No Car Information yet"
                                                    : "Car Rental"}
                                                </span>
                                                {!isUnpaidCar && booking.car_uuid && (
                                                  <span
                                                    title={`Car Booking UUID: ${booking.car_uuid}`}
                                                    className="text-[10px] text-muted-foreground/80 font-mono bg-muted/40 px-1 py-0.5 rounded cursor-help"
                                                  >
                                                    UUID: {booking.car_uuid.slice(0, 8)}...
                                                  </span>
                                                )}
                                              </div>

                                              {!isUnpaidCar && (booking.pickup_location || booking.dropoff_location) && (
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[11px] text-muted-foreground">
                                                  {booking.pickup_location && (
                                                    <span className="flex items-center gap-1">
                                                      <span className="font-semibold text-foreground/80">Pick-up:</span>
                                                      <span>{booking.pickup_location}</span>
                                                    </span>
                                                  )}
                                                  {booking.dropoff_location && (
                                                    <span className="flex items-center gap-1">
                                                      <span className="font-semibold text-foreground/80">Drop-off:</span>
                                                      <span>{booking.dropoff_location}</span>
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {isTrain && (
                                            <div>
                                              <span className="font-medium text-foreground">
                                                {booking.origin || booking.destination
                                                  ? `${booking.origin || "Origin"} → ${booking.destination || "Destination"}`
                                                  : "No Train information"}
                                              </span>
                                              {booking.flight_number &&
                                                booking.flight_number !== "No Train information" && (
                                                  <span className="ml-2 text-[11px] text-muted-foreground">
                                                    (Train {booking.flight_number})
                                                  </span>
                                                )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Date & Spend */}
                                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-1.5 sm:pt-0 border-border/40 gap-1 min-w-[120px] shrink-0">
                                      {isFlight && booking.is_round_trip ? (
                                        <div className="text-right">
                                          <div
                                            className="font-bold text-foreground text-xs"
                                            title={`Round-trip total: ${formatCurrency(booking.flight_total_amount || booking.amount)} (Outbound ${formatCurrency(booking.departure_flight_amount)} + Return ${formatCurrency(booking.return_flight_amount)})`}
                                          >
                                            {formatCurrency(booking.flight_total_amount || booking.amount)}
                                          </div>
                                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold tracking-tight">
                                            Round-trip total
                                          </div>
                                          {booking.departure_flight_amount !== undefined && booking.return_flight_amount !== undefined && (
                                            <div className="text-[10px] text-muted-foreground font-mono">
                                              {formatCurrency(booking.departure_flight_amount)} + {formatCurrency(booking.return_flight_amount)}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="font-bold text-foreground text-xs">
                                          {formatCurrency(booking.amount)}
                                        </span>
                                      )}
                                      <span className="text-[11px] text-muted-foreground">
                                        {formatDateRange(
                                          booking.start_date ? booking.start_date.slice(0, 10) : null,
                                          booking.end_date ? booking.end_date.slice(0, 10) : null
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
