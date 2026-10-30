import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { travelService } from "@/services/travelService";
import type { User, Role } from "@/types/auth";
import {
  ShieldCheck,
  Plane,
  Calendar,
  DollarSign,
  Wallet,
  Package,
  Shield,
  Crosshair,
  ArrowRight,
  Globe2,
  MapPin,
} from "lucide-react";
import { TripGlobe } from "@/components/Travel/TripGlobe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole("SUPER_ADMIN") || user?.is_super_admin;

  const { data: summary } = useQuery({
    queryKey: ["travelDashboardSummary"],
    queryFn: travelService.getDashboardSummary,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<User[]>("/api/configuration/users").catch(() => []),
    enabled: !!isSuperAdmin,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<Role[]>("/api/configuration/roles").catch(() => []),
  });

  // Trip destinations for the globe; keep polling while the backend is still geocoding cities
  const { data: tripLocations } = useQuery({
    queryKey: ["travelTripLocations"],
    queryFn: travelService.getTripLocations,
    refetchInterval: (query) => ((query.state.data?.pending_geocodes ?? 0) > 0 ? 8000 : false),
  });
  const tripPins = tripLocations?.locations ?? [];
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const focusedTripId = selectedTripId ?? tripPins[0]?.event_id ?? null;

  const budgetUtilization =
    summary?.budget?.allocated && summary.budget.allocated > 0
      ? (summary.budget.spent / summary.budget.allocated) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Hero Operations Command Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                <Plane className="w-3.5 h-3.5" />
                Zenatech Flight Ops
              </span>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300">
                Connected to Supabase PostgreSQL (Port 8008)
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Travel Management & Drone Expedition Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real-time command center for tournament expeditions, pilot flight rosters, per-diem stipends, Pelican special luggage, and high-risk arena liability policies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button asChild size="sm" className="gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Link to="/travel/navan">
                <Plane className="w-3.5 h-3.5" />
                <span>Navan Live Hub</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
              <Link to="/travel/events">
                <Calendar className="w-3.5 h-3.5" />
                <span>View Expeditions</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs">
              <Link to="/travel/drone-cargo">
                <Package className="w-3.5 h-3.5" />
                <span>Pelican Cargo</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Events */}
        <Card className="border-border shadow-xs hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Expeditions</span>
              <Calendar className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {summary?.events?.total ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {summary?.events?.attendees ?? 0} pilots & crew rostered
          </CardContent>
        </Card>

        {/* Card 2: Budget Allocated */}
        <Card className="border-border shadow-xs hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Budget Pool</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              ${(summary?.budget?.allocated ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            ${(summary?.budget?.spent ?? 0).toLocaleString()} spent ({budgetUtilization.toFixed(0)}%)
          </CardContent>
        </Card>

        {/* Card 3: User Stipends */}
        <Card className="border-border shadow-xs hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>User Stipends</span>
              <Wallet className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${(summary?.stipends?.total_amount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {summary?.stipends?.disbursed_count ?? 0} / {summary?.stipends?.total_recipients ?? 0} disbursed
          </CardContent>
        </Card>

        {/* Card 4: Drone Combat Units */}
        <Card className="border-border shadow-xs hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Combat Drones</span>
              <Crosshair className="w-4 h-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {summary?.drone_combat_gear?.combat_ready ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {summary?.drone_combat_gear?.lipo_packs ?? 0} certified LiPo flight packs
          </CardContent>
        </Card>

        {/* Card 5: Special Luggage */}
        <Card className="border-border shadow-xs hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Special Cargo</span>
              <Package className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {summary?.special_luggage?.cases_count ?? 0} Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {(summary?.special_luggage?.total_weight_kg ?? 0).toFixed(1)} kg gross airfreight
          </CardContent>
        </Card>

        {/* Card 6: Insurance Policy Shield */}
        <Card className="border-border shadow-xs hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Coverage Shield</span>
              <Shield className="w-4 h-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${(summary?.special_coverage?.total_coverage_limit ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {summary?.special_coverage?.active_policies ?? 0} active policies
          </CardContent>
        </Card>
      </div>

      {/* Operational Modules Navigation Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Travel & Operations Workflows
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/travel/events"
            className="group block p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground text-sm flex items-center justify-between">
              <span>Events & Roster</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              "Who is going": Flight reservations, hotel bookings, pilot assignments, and event attendance statuses.
            </p>
          </Link>

          <Link
            to="/travel/budgets"
            className="group block p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground text-sm flex items-center justify-between">
              <span>Trip Budgeting</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              "Add budgeting": Itemized flights, lodging, luggage excess fees, combat gear repairs, and budget tracking.
            </p>
          </Link>

          <Link
            to="/travel/stipends"
            className="group block p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground text-sm flex items-center justify-between">
              <span>User Stipends</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              "User stipend for who": Daily per diems ($/day × days), direct deposit disbursements, and payout ledger.
            </p>
          </Link>

          <Link
            to="/travel/drone-cargo"
            className="group block p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Crosshair className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground text-sm flex items-center justify-between">
              <span>Combat Gear & Cargo</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              "Play fight for drones, special luggage & coverage": Pelican cases, LiPo vaults, arena nets, and insurance policies.
            </p>
          </Link>
        </div>
      </div>

      {/* Trip Destinations Globe: only when events have trips */}
      {tripPins.length > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-primary" />
              <span>Trip Destinations</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Where each event's trip is headed. Pins use the trip's hotel, or the flight destination city when no hotel is booked. Select a trip to spin the globe to it.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            <div className="lg:col-span-2 min-w-0">
              <TripGlobe pins={tripPins} focusedId={focusedTripId} />
            </div>
            <ul className="lg:col-span-3 min-w-0 max-h-[420px] overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {tripPins.map((pin) => {
                const isFocused = pin.event_id === focusedTripId;
                return (
                  <li key={pin.event_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTripId(pin.event_id)}
                      aria-pressed={isFocused}
                      className={`w-full text-left px-3 py-2.5 text-xs flex items-start gap-2.5 transition-colors hover:bg-accent/50 ${
                        isFocused ? "bg-accent/60" : ""
                      }`}
                    >
                      <MapPin
                        className={`w-4 h-4 mt-0.5 shrink-0 ${isFocused ? "text-orange-500" : "text-emerald-500"}`}
                      />
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm truncate">{pin.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {pin.source === "hotel" ? "Hotel" : "City"}
                          </Badge>
                        </span>
                        <span className="block text-muted-foreground truncate" title={pin.address ?? pin.place}>
                          {pin.place}
                        </span>
                        {pin.start_date && (
                          <span className="block text-muted-foreground">
                            {pin.start_date} → {pin.end_date}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Upcoming Expeditions & System Administration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Expeditions Live Feed */}
        <Card className="lg:col-span-2 border-border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                <span>Active Travel Expeditions</span>
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/travel/events">
                  <span>View All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!summary?.events?.recent || summary.events.recent.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No active expeditions scheduled.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.events.recent.map((ev) => (
                  <div key={ev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{ev.title}</span>
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-300">
                          {ev.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-3">
                        <span>{ev.location}</span>
                        <span>•</span>
                        <span>{ev.start_date} → {ev.end_date}</span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="text-xs h-7">
                      <Link to="/travel/events">Manage Roster</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Administration & Security */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Security & Core Platform</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Portal administration & user authorizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/40">
              <span className="text-muted-foreground">Registered Users</span>
              <span className="font-semibold text-foreground">{users.length} Accounts</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/40">
              <span className="text-muted-foreground">Defined Security Roles</span>
              <span className="font-semibold text-foreground">{allRoles.length} Roles</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/40">
              <span className="text-muted-foreground">Backend API Server</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Port 8008</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-accent/40">
              <span className="text-muted-foreground">Frontend Dev Server</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Port 5178</span>
            </div>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <Link to="/configurations/users">Manage Portal Accounts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}