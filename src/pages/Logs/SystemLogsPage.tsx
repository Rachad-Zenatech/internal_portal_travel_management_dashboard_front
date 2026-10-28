import { useState, useEffect, useMemo } from "react";
import { apiClient as api } from "@/services/apiClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  RefreshCw,
  Calendar,
  User as UserIcon,
  Activity,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Send,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Check,
  Terminal,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertOctagon,
  AlertTriangle,
  Info,
  Bot,
  Shield,
  Plane,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface SystemLogItem {
  id: string;
  level: string;
  source: string;
  message: string;
  details?: any;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

interface AuditLogItem {
  id: number | string;
  entity_type: string;
  entity_id: string;
  entity_title?: string | null;
  action: string;
  user_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_department?: string | null;
  actor_job_title?: string | null;
  changes?: any;
  old_value?: any;
  new_value?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export function getActionMeta(action: string) {
  const act = (action || "").toUpperCase();

  if (act.includes("CREATE") || act === "NEW_REQUEST") {
    return {
      label: "Created",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      icon: PlusCircle,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
    };
  }
  if (act.includes("SUBMIT")) {
    return {
      label: "Submitted for Approval",
      color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
      icon: Send,
      iconColor: "text-sky-600 dark:text-sky-400",
      dotColor: "bg-sky-500",
    };
  }
  if (act.includes("REVIEW") || act === "START_REVIEW") {
    return {
      label: "Under Review",
      color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
      icon: Eye,
      iconColor: "text-purple-600 dark:text-purple-400",
      dotColor: "bg-purple-500",
    };
  }
  if (act.includes("APPROV") || act.includes("DECISION")) {
    return {
      label: "Approved",
      color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
      icon: CheckCircle2,
      iconColor: "text-teal-600 dark:text-teal-400",
      dotColor: "bg-teal-500",
    };
  }
  if (act.includes("REJECT")) {
    return {
      label: "Rejected",
      color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      icon: XCircle,
      iconColor: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
    };
  }
  if (act.includes("STIPEND") || act.includes("DISBURS")) {
    return {
      label: "Stipend Disbursed",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      icon: DollarSign,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
    };
  }
  if (act.includes("EVENT") || act.includes("TRAVEL")) {
    return {
      label: "Travel Event",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
      icon: Plane,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      dotColor: "bg-indigo-500",
    };
  }
  if (act.includes("STATUS_CHANGE") || act.includes("TRANSITION")) {
    return {
      label: "Status Changed",
      color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
      icon: RefreshCw,
      iconColor: "text-blue-600 dark:text-blue-400",
      dotColor: "bg-blue-500",
    };
  }
  if (act.includes("UPDATE") || act.includes("EDIT")) {
    return {
      label: "Updated",
      color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
      icon: Edit3,
      iconColor: "text-slate-600 dark:text-zinc-400",
      dotColor: "bg-slate-500",
    };
  }
  if (act.includes("DELETE") || act.includes("REMOVE")) {
    return {
      label: "Deleted",
      color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      icon: Trash2,
      iconColor: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
    };
  }

  return {
    label: action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Activity,
    iconColor: "text-slate-600 dark:text-zinc-400",
    dotColor: "bg-slate-400",
  };
}

function generateChangeSummary(log: AuditLogItem): string {
  const changes = log.changes || log.new_value;
  if (!changes) {
    const meta = getActionMeta(log.action);
    return `${meta.label} on ${log.entity_type} #${log.entity_id}`;
  }

  if (typeof changes === "object") {
    if (changes.status) {
      if (changes.old_status) {
        return `Status transitioned: ${changes.old_status} → ${changes.status}`;
      }
      return `Status set to: ${changes.status}`;
    }
    if (changes.amount != null || changes.total_amount != null) {
      const amt = changes.total_amount ?? changes.amount;
      return `Amount: $${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    if (changes.recipient_name) {
      return `Traveler: ${changes.recipient_name} ($${changes.total_amount || 0})`;
    }
    if (changes.message) {
      return String(changes.message);
    }
    const keys = Object.keys(changes).filter((k) => k !== "id" && k !== "updated_at");
    if (keys.length > 0) {
      return `Modified ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ` +${keys.length - 3} more` : ""}`;
    }
  }

  return getActionMeta(log.action).label;
}

function formatLogDate(dateStr: string) {
  if (!dateStr) return { date: "-", time: "", relative: "" };
  try {
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
    let relative = "";
    if (diffSeconds < 60) relative = "Just now";
    else if (diffSeconds < 3600) relative = `${Math.floor(diffSeconds / 60)}m ago`;
    else if (diffSeconds < 86400) relative = `${Math.floor(diffSeconds / 3600)}h ago`;
    else relative = `${Math.floor(diffSeconds / 86400)}d ago`;

    return { date: dateFormatted, time: timeFormatted, relative };
  } catch {
    return { date: dateStr, time: "", relative: "" };
  }
}

function getInitials(name?: string | null) {
  if (!name) return "SYS";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getSystemLogLevelBadge(level: string) {
  const lvl = (level || "INFO").toUpperCase();
  switch (lvl) {
    case "ERROR":
    case "CRITICAL":
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 gap-1 font-semibold text-xs">
          <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
          {lvl}
        </Badge>
      );
    case "WARN":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 gap-1 font-semibold text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          {lvl}
        </Badge>
      );
    case "DEBUG":
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 gap-1 font-semibold text-xs">
          <Terminal className="h-3.5 w-3.5" />
          {lvl}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 gap-1 font-semibold text-xs">
          <Info className="h-3.5 w-3.5 text-sky-500" />
          {lvl}
        </Badge>
      );
  }
}

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<"system_logs" | "audit_trail">("system_logs");

  // ---------------------------------------------------------------------------
  // SYSTEM LOGS STATE
  // ---------------------------------------------------------------------------
  const [systemLogs, setSystemLogs] = useState<SystemLogItem[]>([]);
  const [systemTotal, setSystemTotal] = useState(0);
  const [systemLoading, setSystemLoading] = useState(true);
  const [sysLevelFilter, setSysLevelFilter] = useState("ALL");
  const [sysSourceFilter, setSysSourceFilter] = useState("ALL");
  const [sysSearch, setSysSearch] = useState("");
  const [sysPage, setSysPage] = useState(1);
  const [sysLimit, setSysLimit] = useState(50);
  const [selectedSystemLog, setSelectedSystemLog] = useState<SystemLogItem | null>(null);

  // ---------------------------------------------------------------------------
  // AUDIT LOGS STATE
  // ---------------------------------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);
  const [entityHistory, setEntityHistory] = useState<AuditLogItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [copied, setCopied] = useState(false);

  // Fetch system logs
  const fetchSystemLogs = async () => {
    try {
      setSystemLoading(true);
      const params = new URLSearchParams();
      params.append("limit", String(sysLimit));
      params.append("offset", String((sysPage - 1) * sysLimit));
      if (sysLevelFilter && sysLevelFilter !== "ALL") params.append("level", sysLevelFilter);
      if (sysSourceFilter && sysSourceFilter !== "ALL") params.append("source", sysSourceFilter);
      if (sysSearch.trim()) params.append("search", sysSearch.trim());

      const res = await api.get<{ items: SystemLogItem[]; total: number }>(`/api/system-logs?${params.toString()}`);
      setSystemLogs(res.items || []);
      setSystemTotal(res.total || 0);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load system logs");
    } finally {
      setSystemLoading(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("offset", String((page - 1) * limit));
      if (entityTypeFilter && entityTypeFilter !== "ALL") params.append("entity_type", entityTypeFilter);
      if (actionFilter && actionFilter !== "ALL") params.append("action", actionFilter);
      if (search.trim()) params.append("search", search.trim());

      if (timeFilter === "TODAY") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append("date_from", today.toISOString());
      } else if (timeFilter === "WEEK") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.append("date_from", weekAgo.toISOString());
      } else if (timeFilter === "MONTH") {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        params.append("date_from", monthAgo.toISOString());
      }

      const res = await api.get<{ items: AuditLogItem[]; total: number }>(`/api/logs?${params.toString()}`);
      setAuditLogs(res.items || []);
      setAuditTotal(res.total || 0);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemLogs();
  }, [sysPage, sysLimit, sysLevelFilter, sysSourceFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSysPage(1);
      fetchSystemLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [sysSearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, [page, limit, entityTypeFilter, actionFilter, timeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAuditLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open inspector for audit log
  const handleOpenAuditInspector = async (log: AuditLogItem) => {
    setSelectedAuditLog(log);
    setLoadingHistory(true);
    try {
      const res = await api.get<{ items: AuditLogItem[] }>(
        `/api/logs?limit=50&entity_type=${log.entity_type}&entity_id=${log.entity_id}`
      );
      setEntityHistory(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // KPI calculations
  const stats = useMemo(() => {
    const errCount = systemLogs.filter((l) => l.level === "ERROR" || l.level === "CRITICAL").length;
    const warnCount = systemLogs.filter((l) => l.level === "WARN").length;
    const uniqueSources = new Set(systemLogs.map((l) => l.source)).size;
    const uniqueActors = new Set(auditLogs.map((l) => l.actor_name || "System")).size;

    return {
      totalSystemEvents: systemTotal,
      errorCount: errCount,
      warnCount: warnCount,
      uniqueSources: uniqueSources || 1,
      totalAuditEvents: auditTotal,
      uniqueActors: uniqueActors || 1,
    };
  }, [systemLogs, systemTotal, auditLogs, auditTotal]);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-5 pb-6 p-4 sm:p-6 max-w-[1650px] mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                System & Audit Logs
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Centralized telemetry for system runtime diagnostics, daemon events, and tamper-evident audit history.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "system_logs") fetchSystemLogs();
              else fetchAuditLogs();
            }}
            disabled={systemLoading || auditLoading}
            className="h-9 gap-1.5 bg-white dark:bg-zinc-950 shadow-2xs font-medium text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${systemLoading || auditLoading ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Logs</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Terminal className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-2">
            {stats.totalSystemEvents.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Diagnostic & service events</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit Trail</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.totalAuditEvents.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Action & mutation records</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Errors & Warnings</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats.errorCount + stats.warnCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{stats.errorCount} errors, {stats.warnCount} warnings</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subsystems</span>
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mt-2">
            {stats.uniqueSources} Active
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Modules reporting telemetry</p>
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0 space-y-4">
        <TabsList className="grid w-full sm:w-[500px] grid-cols-2" variant="line">
          <TabsTrigger value="system_logs" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>System Activity Logs</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {systemTotal}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="audit_trail" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>System Audit Trail</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {auditTotal}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: SYSTEM ACTIVITY LOGS                                           */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="system_logs" className="space-y-4 flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={sysSearch}
                  onChange={(e) => setSysSearch(e.target.value)}
                  placeholder="Search system logs by message, source, or subsystem..."
                  className="pl-9 h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50"
                />
                {sysSearch && (
                  <button
                    onClick={() => setSysSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="w-full md:w-52">
                <Select
                  value={sysLevelFilter}
                  onValueChange={(val) => {
                    setSysLevelFilter(val);
                    setSysPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground mr-1">Severity:</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    <SelectItem value="INFO">ℹ️ Info</SelectItem>
                    <SelectItem value="WARN">⚠️ Warning</SelectItem>
                    <SelectItem value="ERROR">🚨 Error</SelectItem>
                    <SelectItem value="DEBUG">🔍 Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-56">
                <Select
                  value={sysSourceFilter}
                  onValueChange={(val) => {
                    setSysSourceFilter(val);
                    setSysPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground mr-1">Source:</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    <SelectItem value="SYSTEM">System Engine</SelectItem>
                    <SelectItem value="STIPEND_SERVICE">Stipend Service</SelectItem>
                    <SelectItem value="TRAVEL_SERVICE">Travel Service</SelectItem>
                    <SelectItem value="DATABASE">Database</SelectItem>
                    <SelectItem value="CACHE">Cache Pub/Sub</SelectItem>
                    <SelectItem value="AUTH">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[400px]">
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider py-3.5">
                      Timestamp
                    </TableHead>
                    <TableHead className="w-[130px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Severity
                    </TableHead>
                    <TableHead className="w-[170px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Source Module
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Log Message & Diagnostics
                    </TableHead>
                    <TableHead className="w-[180px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Actor / Origin
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider pr-4">
                      Details
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="py-4">
                          <div className="h-8 bg-slate-100 dark:bg-zinc-900 rounded-lg animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : systemLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <ShieldAlert className="h-10 w-10 text-slate-300 dark:text-zinc-700 stroke-1" />
                          <p className="text-base font-semibold text-slate-700 dark:text-zinc-300">No system logs found</p>
                          <p className="text-xs max-w-sm">No telemetry matching current criteria.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    systemLogs.map((log) => {
                      const dateInfo = formatLogDate(log.created_at);
                      const isSystem = !log.actor_user_id || log.actor_name === "System";

                      return (
                        <TableRow
                          key={log.id}
                          onClick={() => setSelectedSystemLog(log)}
                          className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors group"
                        >
                          <TableCell className="py-3 font-medium">
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{dateInfo.time}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>{dateInfo.date}</span>
                                <span className="text-[10px] px-1 py-0 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 font-mono">
                                  {dateInfo.relative}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            {getSystemLogLevelBadge(log.level)}
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                              {log.source}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="text-xs font-medium text-slate-900 dark:text-zinc-100 line-clamp-2 max-w-xl">
                              {log.message}
                            </div>
                            {log.details && (
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-lg">
                                {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details)}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            {isSystem ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                <Bot className="h-3.5 w-3.5" />
                                <span>System Daemon</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200">
                                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                                <span>{log.actor_name || "User"}</span>
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-right pr-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSystemLog(log);
                              }}
                              className="h-7 text-xs font-medium px-2.5 opacity-80 group-hover:opacity-100 gap-1 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>Details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong>{systemLogs.length > 0 ? (sysPage - 1) * sysLimit + 1 : 0}</strong> to{" "}
                  <strong>{Math.min(sysPage * sysLimit, systemTotal)}</strong> of <strong>{systemTotal}</strong> records
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-muted-foreground">Per page:</span>
                  <Select
                    value={String(sysLimit)}
                    onValueChange={(val) => {
                      setSysLimit(Number(val));
                      setSysPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-20 bg-white dark:bg-zinc-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sysPage <= 1 || systemLoading}
                  onClick={() => setSysPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs gap-1 bg-white dark:bg-zinc-950 px-2.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="px-3 py-1 font-semibold text-slate-800 dark:text-zinc-200">
                  Page {sysPage} of {Math.max(1, Math.ceil(systemTotal / sysLimit))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sysPage * sysLimit >= systemTotal || systemLoading}
                  onClick={() => setSysPage((p) => p + 1)}
                  className="h-8 text-xs gap-1 bg-white dark:bg-zinc-950 px-2.5"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SYSTEM AUDIT TRAIL                                             */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit_trail" className="space-y-4 flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by user, email, event title, action, or record ID..."
                  className="pl-9 h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Entity Type Selector */}
              <div className="w-full md:w-56">
                <Select
                  value={entityTypeFilter}
                  onValueChange={(val) => {
                    setEntityTypeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground mr-1">Entity:</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Entity Types</SelectItem>
                    <SelectItem value="TravelEvent">✈️ Travel Event</SelectItem>
                    <SelectItem value="TravelerStipend">💵 Traveler Stipend</SelectItem>
                    <SelectItem value="TravelBudget">📊 Travel Budget</SelectItem>
                    <SelectItem value="User">👤 User Account</SelectItem>
                    <SelectItem value="Role">🛡️ Role & Permission</SelectItem>
                    <SelectItem value="SYSTEM">⚙️ System Core</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Category Selector */}
              <div className="w-full md:w-56">
                <Select
                  value={actionFilter}
                  onValueChange={(val) => {
                    setActionFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground mr-1">Action:</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Action Types</SelectItem>
                    <SelectItem value="CREATE">✨ Create</SelectItem>
                    <SelectItem value="UPDATE">✏️ Update</SelectItem>
                    <SelectItem value="DELETE">🗑️ Delete</SelectItem>
                    <SelectItem value="APPROVE">✅ Approve</SelectItem>
                    <SelectItem value="REJECT">❌ Reject</SelectItem>
                    <SelectItem value="SYSTEM_STARTUP">⚙️ System Startup</SelectItem>
                    <SelectItem value="AUTO_RECALCULATE">🔄 Auto Recalculate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Window Filter */}
              <div className="w-full md:w-48">
                <Select
                  value={timeFilter}
                  onValueChange={(val) => {
                    setTimeFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-zinc-900/50 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Time</SelectItem>
                    <SelectItem value="TODAY">Today Only</SelectItem>
                    <SelectItem value="WEEK">Past 7 Days</SelectItem>
                    <SelectItem value="MONTH">Past 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[400px]">
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider py-3.5">
                      Timestamp
                    </TableHead>
                    <TableHead className="w-[240px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Actor / User
                    </TableHead>
                    <TableHead className="w-[190px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Action
                    </TableHead>
                    <TableHead className="w-[260px] font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Target Entity
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider">
                      Summary & Context
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-semibold text-slate-700 dark:text-zinc-300 text-xs uppercase tracking-wider pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="py-4">
                          <div className="h-8 bg-slate-100 dark:bg-zinc-900 rounded-lg animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <ShieldAlert className="h-10 w-10 text-slate-300 dark:text-zinc-700 stroke-1" />
                          <p className="text-base font-semibold text-slate-700 dark:text-zinc-300">No audit logs found</p>
                          <p className="text-xs max-w-sm">No events match your current search and filter criteria.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => {
                      const actionMeta = getActionMeta(log.action);
                      const ActionIcon = actionMeta.icon;
                      const dateInfo = formatLogDate(log.created_at);
                      const isSystem = !log.user_id || log.actor_name === "System";

                      return (
                        <TableRow
                          key={log.id}
                          onClick={() => handleOpenAuditInspector(log)}
                          className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-900/60 transition-colors group"
                        >
                          <TableCell className="py-3 font-medium">
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{dateInfo.time}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>{dateInfo.date}</span>
                                <span className="text-[10px] px-1 py-0 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 font-mono">
                                  {dateInfo.relative}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-8 w-8 rounded-full ${isSystem ? "bg-gradient-to-tr from-purple-500 to-indigo-600" : "bg-gradient-to-tr from-indigo-500 to-indigo-700"} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-white dark:ring-zinc-900`}>
                                {isSystem ? <Bot className="h-4 w-4" /> : getInitials(log.actor_name)}
                              </div>
                              <div className="min-w-0 flex flex-col">
                                <div className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                  {log.actor_name || "System Automation"}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                  {log.actor_email ? (
                                    <span>{log.actor_email}</span>
                                  ) : (
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {isSystem ? "system-daemon" : log.user_id ? log.user_id.slice(0, 8) : "System"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold px-2.5 py-1 gap-1.5 inline-flex items-center rounded-lg ${actionMeta.color}`}
                            >
                              <ActionIcon className={`h-3.5 w-3.5 ${actionMeta.iconColor}`} />
                              <span>{actionMeta.label}</span>
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 text-xs truncate">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-slate-50 dark:bg-zinc-800">
                                {log.entity_type}
                              </Badge>
                              <span className="font-medium text-slate-800 dark:text-zinc-200 truncate" title={log.entity_title || log.entity_id}>
                                {log.entity_title || `#${log.entity_id}`}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="text-xs text-slate-600 dark:text-zinc-400 font-normal truncate max-w-md">
                              {generateChangeSummary(log)}
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-right pr-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAuditInspector(log);
                              }}
                              className="h-7 text-xs font-medium px-2.5 opacity-80 group-hover:opacity-100 gap-1 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>Details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong>{auditLogs.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to{" "}
                  <strong>{Math.min(page * limit, auditTotal)}</strong> of <strong>{auditTotal}</strong> records
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-muted-foreground">Per page:</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => {
                      setLimit(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-20 bg-white dark:bg-zinc-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || auditLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs gap-1 bg-white dark:bg-zinc-950 px-2.5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="px-3 py-1 font-semibold text-slate-800 dark:text-zinc-200">
                  Page {page} of {Math.max(1, Math.ceil(auditTotal / limit))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * limit >= auditTotal || auditLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs gap-1 bg-white dark:bg-zinc-950 px-2.5"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── System Log Inspector Sheet ── */}
      <Sheet open={!!selectedSystemLog} onOpenChange={(open) => !open && setSelectedSystemLog(null)}>
        <SheetContent className="!w-full sm:!w-[640px] md:!w-[768px] lg:!w-[880px] sm:!max-w-2xl md:!max-w-3xl lg:!max-w-4xl flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950">
          {selectedSystemLog && (
            <div className="flex flex-col h-full">
              <div className="p-6 pb-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/50 shadow-2xs shrink-0">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <SheetTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>System Log Entry</span>
                        {getSystemLogLevelBadge(selectedSystemLog.level)}
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Recorded on {formatLogDate(selectedSystemLog.created_at).date} at {formatLogDate(selectedSystemLog.created_at).time}
                      </p>
                    </div>
                  </div>

                  <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                    {selectedSystemLog.source}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                    Message
                  </span>
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100 whitespace-pre-wrap">
                    {selectedSystemLog.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <span className="text-muted-foreground block text-[11px]">Actor / Origin</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-100">
                      {selectedSystemLog.actor_name || "System Daemon"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <span className="text-muted-foreground block text-[11px]">IP Address</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                      {selectedSystemLog.ip_address || "Internal / Local"}
                    </span>
                  </div>
                </div>

                {selectedSystemLog.details && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                        Payload & Context Metadata
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => handleCopyJson(selectedSystemLog.details)}
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy JSON"}
                      </Button>
                    </div>
                    <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto max-h-[400px]">
                      {JSON.stringify(selectedSystemLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Rich Audit Log Inspector Drawer (Sheet) ── */}
      <Sheet open={!!selectedAuditLog} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <SheetContent className="!w-full sm:!w-[640px] md:!w-[768px] lg:!w-[900px] xl:!w-[1020px] sm:!max-w-2xl md:!max-w-3xl lg:!max-w-4xl xl:!max-w-5xl flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950">
          {selectedAuditLog && (
            <div className="flex flex-col h-full">
              <div className="p-6 pb-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs shrink-0">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <SheetTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                        Audit Event #{selectedAuditLog.id}
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Recorded on {formatLogDate(selectedAuditLog.created_at).date} at {formatLogDate(selectedAuditLog.created_at).time}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-3 py-1 gap-1.5 ${getActionMeta(selectedAuditLog.action).color}`}
                  >
                    {getActionMeta(selectedAuditLog.action).label}
                  </Badge>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                      {getInitials(selectedAuditLog.actor_name)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {selectedAuditLog.actor_name || "System Automation"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedAuditLog.actor_email || "system@internal.zenatech.com"}
                        {selectedAuditLog.actor_department ? ` • ${selectedAuditLog.actor_department}` : ""}
                      </div>
                    </div>
                  </div>

                  {selectedAuditLog.user_id && (
                    <div className="text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      ID: {selectedAuditLog.user_id.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 space-y-2.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                    Target Entity
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Entity Type</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {selectedAuditLog.entity_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Record ID</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-zinc-100">
                        #{selectedAuditLog.entity_id}
                      </span>
                    </div>
                    {selectedAuditLog.entity_title && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-muted-foreground block">Subject / Title</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                          {selectedAuditLog.entity_title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="diff" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 h-9">
                    <TabsTrigger value="diff" className="text-xs font-medium">Field Changes</TabsTrigger>
                    <TabsTrigger value="json" className="text-xs font-medium">Raw JSON</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs font-medium">Entity History ({entityHistory.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="diff" className="space-y-3 pt-1">
                    {selectedAuditLog.changes && typeof selectedAuditLog.changes === "object" ? (
                      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100/70 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                            <tr>
                              <th className="text-left p-2.5 pl-3">Field</th>
                              <th className="text-left p-2.5">Updated / New Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                            {Object.entries(selectedAuditLog.changes).map(([key, val]) => (
                              <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                                <td className="p-2.5 pl-3 font-semibold text-slate-700 dark:text-zinc-300 font-mono text-[11px]">{key}</td>
                                <td className="p-2.5 font-medium text-slate-900 dark:text-zinc-100">
                                  {typeof val === "object" && val !== null ? (
                                    <pre className="text-[11px] font-mono bg-slate-50 dark:bg-zinc-900 p-2 rounded max-h-36 overflow-auto">
                                      {JSON.stringify(val, null, 2)}
                                    </pre>
                                  ) : (
                                    <span className="font-mono text-emerald-700 dark:text-emerald-400">{String(val)}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl border-dashed">
                        No field-level delta captured for this action.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="json" className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">Payload representation</span>
                      <Button variant="outline" size="sm" onClick={() => handleCopyJson(selectedAuditLog)} className="h-7 text-xs gap-1">
                        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-auto max-h-[380px]">
                      {JSON.stringify(selectedAuditLog, null, 2)}
                    </pre>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-3 pt-1">
                    {loadingHistory ? (
                      <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-indigo-600" /></div>
                    ) : entityHistory.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl border-dashed">
                        No other recorded events for this entity.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {entityHistory.map((h) => (
                          <div key={h.id} className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-900 dark:text-zinc-100">{h.action}</span>
                              <span className="text-[11px] text-muted-foreground block">{formatLogDate(h.created_at).date} at {formatLogDate(h.created_at).time}</span>
                            </div>
                            <Badge variant="outline" className={getActionMeta(h.action).color}>{getActionMeta(h.action).label}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
