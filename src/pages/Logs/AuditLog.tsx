import { useState, useMemo } from "react";
import HelpIcon from "@/components/ui/HelpIcon";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Search,
  ArrowUpDown,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Terminal,
  Shield,
  Eye,
  AlertTriangle,
  Info,
  AlertOctagon,
  Bot,
  User as UserIcon,
  Filter,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

export default function AuditLog() {
  const [detailModalItem, setDetailModalItem] = useState<{ title: string; data: any } | null>(null);
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: auditLogs = [], isLoading: isAuditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => apiClient.get<any[]>("/api/audit-logs"),
  });

  const { data: systemLogsData, isLoading: isSystemLoading, refetch: refetchSystem } = useQuery({
    queryKey: ["systemLogs"],
    queryFn: () => apiClient.get<{ items: any[]; total: number }>("/api/system-logs?limit=200"),
  });
  const systemLogs = systemLogsData?.items || [];

  const { data: loginActivities = [], isLoading: isLoginLoading, refetch: refetchLogins } = useQuery({
    queryKey: ["loginActivities"],
    queryFn: () => apiClient.get<any[]>("/api/login-activities"),
  });

  const handleRefreshAll = () => {
    refetchAudit();
    refetchSystem();
    refetchLogins();
    toast.success("Logs refreshed");
  };

  const getActionBadgeColor = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE")) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400";
    if (act.includes("UPDATE")) return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
    if (act.includes("DELETE") || act.includes("REJECT")) return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400";
    if (act.includes("SYSTEM") || act.includes("AUTO")) return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300";
  };

  const getSystemLogLevelBadge = (level: string) => {
    const lvl = (level || "INFO").toUpperCase();
    switch (lvl) {
      case "ERROR":
      case "CRITICAL":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 gap-1 font-semibold">
            <AlertOctagon className="h-3 w-3 text-rose-500" />
            {lvl}
          </Badge>
        );
      case "WARN":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 gap-1 font-semibold">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            {lvl}
          </Badge>
        );
      case "DEBUG":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 gap-1 font-semibold">
            <Terminal className="h-3 w-3" />
            {lvl}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 gap-1 font-semibold">
            <Info className="h-3 w-3 text-sky-500" />
            {lvl}
          </Badge>
        );
    }
  };

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // 1. AUDIT LOGS TABLE
  // ---------------------------------------------------------------------------
  const [auditSorting, setAuditSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [auditColumnFilters, setAuditColumnFilters] = useState<ColumnFiltersState>([]);
  const [auditColumnVisibility, setAuditColumnVisibility] = useState<VisibilityState>({});
  const [auditGlobalFilter, setAuditGlobalFilter] = useState("");
  const [auditActorFilter, setAuditActorFilter] = useState("ALL");

  const filteredAuditLogs = useMemo(() => {
    if (auditActorFilter === "SYSTEM") {
      return auditLogs.filter((l) => !l.actor_user_id || (l.actor_name && l.actor_name.toLowerCase() === "system"));
    }
    if (auditActorFilter === "USER") {
      return auditLogs.filter((l) => l.actor_user_id && l.actor_name && l.actor_name.toLowerCase() !== "system");
    }
    return auditLogs;
  }, [auditLogs, auditActorFilter]);

  const auditColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Date & Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-xs sm:text-sm whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "actor_name",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Actor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isSystem = !row.original.actor_user_id || (row.original.actor_name || "").toLowerCase() === "system";
        return (
          <div className="flex items-center gap-2">
            {isSystem ? (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 gap-1 px-2 py-0.5 text-xs font-semibold">
                <Bot className="h-3 w-3" />
                System
              </Badge>
            ) : (
              <div className="flex flex-col">
                <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <UserIcon className="h-3 w-3 text-slate-400" />
                  {row.original.actor_name || "User"}
                </span>
                {row.original.actor_email && <span className="text-xs text-slate-500">{row.original.actor_email}</span>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Action
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className={getActionBadgeColor(row.original.action)}>
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: "entity_type",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Target Entity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-xs px-1.5 py-0 bg-slate-50 dark:bg-zinc-800">
            {row.original.entity_type}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "entity_id",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Entity ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-500 max-w-[160px] truncate block" title={row.original.entity_id}>
          {row.original.entity_id}
        </span>
      ),
    },
    {
      id: "actions_btn",
      header: () => <div className="text-right pr-2">Details</div>,
      cell: ({ row }) => {
        const item = row.original;
        const hasData = item.new_value || item.old_value;
        if (!hasData) return null;
        return (
          <div className="text-right pr-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1"
              onClick={() =>
                setDetailModalItem({
                  title: `Audit Action: ${item.action} (${item.entity_type} #${item.entity_id})`,
                  data: {
                    old_value: item.old_value,
                    new_value: item.new_value,
                    ip_address: item.ip_address,
                    user_agent: item.user_agent,
                    created_at: item.created_at,
                  },
                })
              }
            >
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span>Inspect</span>
            </Button>
          </div>
        );
      },
    },
  ], []);

  const auditTable = useReactTable({
    data: filteredAuditLogs,
    columns: auditColumns,
    onSortingChange: setAuditSorting,
    onColumnFiltersChange: setAuditColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setAuditColumnVisibility,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const actor = (row.getValue("actor_name") as string)?.toLowerCase() || "";
      const action = (row.getValue("action") as string)?.toLowerCase() || "";
      const entity = (row.getValue("entity_type") as string)?.toLowerCase() || "";
      const entityId = (row.getValue("entity_id") as string)?.toLowerCase() || "";
      return actor.includes(search) || action.includes(search) || entity.includes(search) || entityId.includes(search);
    },
    state: {
      sorting: auditSorting,
      columnFilters: auditColumnFilters,
      columnVisibility: auditColumnVisibility,
      globalFilter: auditGlobalFilter,
    },
    onGlobalFilterChange: setAuditGlobalFilter,
  });

  // ---------------------------------------------------------------------------
  // 2. SYSTEM LOGS TABLE
  // ---------------------------------------------------------------------------
  const [sysSorting, setSysSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [sysColumnFilters, setSysColumnFilters] = useState<ColumnFiltersState>([]);
  const [sysColumnVisibility, setSysColumnVisibility] = useState<VisibilityState>({});
  const [sysGlobalFilter, setSysGlobalFilter] = useState("");
  const [sysLevelFilter, setSysLevelFilter] = useState("ALL");
  const [sysSourceFilter, setSysSourceFilter] = useState("ALL");

  const filteredSystemLogs = useMemo(() => {
    return systemLogs.filter((log) => {
      if (sysLevelFilter !== "ALL" && log.level !== sysLevelFilter) return false;
      if (sysSourceFilter !== "ALL" && log.source !== sysSourceFilter) return false;
      return true;
    });
  }, [systemLogs, sysLevelFilter, sysSourceFilter]);

  const systemColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Timestamp
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "level",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Severity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getSystemLogLevelBadge(row.original.level),
    },
    {
      accessorKey: "source",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Source
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
          {row.original.source}
        </Badge>
      ),
    },
    {
      accessorKey: "message",
      header: () => <div className="font-semibold">Message & Operation</div>,
      cell: ({ row }) => (
        <div className="max-w-[480px]">
          <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-zinc-100 line-clamp-2">
            {row.original.message}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "actor_name",
      header: () => <div className="font-semibold">Actor / Origin</div>,
      cell: ({ row }) => {
        const isSystem = !row.original.actor_user_id || row.original.actor_name === "System";
        return isSystem ? (
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Bot className="h-3.5 w-3.5" />
            System
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
            {row.original.actor_name}
          </span>
        );
      },
    },
    {
      id: "sys_details",
      header: () => <div className="text-right pr-2">Details</div>,
      cell: ({ row }) => {
        const item = row.original;
        if (!item.details && !item.ip_address) return null;
        return (
          <div className="text-right pr-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 gap-1"
              onClick={() =>
                setDetailModalItem({
                  title: `[${item.level}] ${item.source} System Log`,
                  data: {
                    message: item.message,
                    level: item.level,
                    source: item.source,
                    details: item.details,
                    actor_name: item.actor_name,
                    ip_address: item.ip_address,
                    user_agent: item.user_agent,
                    created_at: item.created_at,
                  },
                })
              }
            >
              <Eye className="h-3 w-3 text-slate-500" />
              <span>Details</span>
            </Button>
          </div>
        );
      },
    },
  ], []);

  const systemTable = useReactTable({
    data: filteredSystemLogs,
    columns: systemColumns,
    onSortingChange: setSysSorting,
    onColumnFiltersChange: setSysColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setSysColumnVisibility,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const msg = (row.getValue("message") as string)?.toLowerCase() || "";
      const src = (row.getValue("source") as string)?.toLowerCase() || "";
      const lvl = (row.getValue("level") as string)?.toLowerCase() || "";
      return msg.includes(search) || src.includes(search) || lvl.includes(search);
    },
    state: {
      sorting: sysSorting,
      columnFilters: sysColumnFilters,
      columnVisibility: sysColumnVisibility,
      globalFilter: sysGlobalFilter,
    },
    onGlobalFilterChange: setSysGlobalFilter,
  });

  // ---------------------------------------------------------------------------
  // 3. LOGIN ACTIVITIES TABLE
  // ---------------------------------------------------------------------------
  const [loginSorting, setLoginSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [loginColumnFilters, setLoginColumnFilters] = useState<ColumnFiltersState>([]);
  const [loginColumnVisibility, setLoginColumnVisibility] = useState<VisibilityState>({});
  const [loginGlobalFilter, setLoginGlobalFilter] = useState("");

  const loginColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold w-[200px] justify-start" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Date & Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium whitespace-nowrap">{new Date(row.original.created_at).toLocaleString()}</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Account
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-slate-100">{row.original.user_full_name || "Unknown"}</span>
          <span className="text-xs text-slate-500">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "success",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const log = row.original;
        return log.success ? (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 gap-1.5 w-fit">
              <CheckCircle2 className="h-3 w-3" />
              Success
            </Badge>
            {log.logout_at && (
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Logged out: {new Date(log.logout_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 gap-1.5 w-fit">
              <XCircle className="h-3 w-3" />
              Failed
            </Badge>
            <span className="text-xs text-red-600 dark:text-red-400 font-medium truncate max-w-[200px]" title={log.failure_reason}>
              {log.failure_reason}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "ip_address",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          IP Address
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip_address || "N/A"}</span>,
    },
    {
      accessorKey: "user_agent",
      header: () => <div className="font-semibold w-[300px]">User Agent</div>,
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 truncate max-w-[300px] block" title={row.original.user_agent}>
          {row.original.user_agent || "Unknown"}
        </span>
      ),
    },
  ], []);

  const loginTable = useReactTable({
    data: loginActivities,
    columns: loginColumns,
    onSortingChange: setLoginSorting,
    onColumnFiltersChange: setLoginColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setLoginColumnVisibility,
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = (row.original.user_full_name as string)?.toLowerCase() || "";
      const email = (row.getValue("email") as string)?.toLowerCase() || "";
      const ip = (row.getValue("ip_address") as string)?.toLowerCase() || "";
      const reason = (row.original.failure_reason as string)?.toLowerCase() || "";
      return name.includes(search) || email.includes(search) || ip.includes(search) || reason.includes(search);
    },
    state: {
      sorting: loginSorting,
      columnFilters: loginColumnFilters,
      columnVisibility: loginColumnVisibility,
      globalFilter: loginGlobalFilter,
    },
    onGlobalFilterChange: setLoginGlobalFilter,
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Audit & System Logs
            <HelpIcon text="Displays administrative action history, system diagnostic logs, and security login events." />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
            Track and monitor both system background processes and user administrative activities.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isAuditLoading || isSystemLoading || isLoginLoading}
          className="h-9 gap-1.5 bg-white dark:bg-zinc-950 shadow-2xs font-medium text-xs sm:text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isAuditLoading || isSystemLoading || isLoginLoading ? "animate-spin text-indigo-600" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="actions" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full sm:w-[540px] grid-cols-3 mb-4" variant="line">
          <TabsTrigger value="actions" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Audit Logs ({auditLogs.length})
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1.5">
            <Terminal className="h-4 w-4" />
            System Logs ({systemLogs.length})
          </TabsTrigger>
          <TabsTrigger value="logins" className="flex items-center gap-1.5">
            <UserIcon className="h-4 w-4" />
            Login Activities ({loginActivities.length})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: AUDIT LOGS ── */}
        <TabsContent value="actions" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    type="text"
                    placeholder="Search audit actions..."
                    value={auditGlobalFilter}
                    onChange={(e) => setAuditGlobalFilter(e.target.value)}
                    className="pl-9 w-[260px] h-9 text-xs sm:text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>

                <Select value={auditActorFilter} onValueChange={setAuditActorFilter}>
                  <SelectTrigger className="h-9 w-[160px] text-xs bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Actor" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Actors</SelectItem>
                    <SelectItem value="SYSTEM">System Only</SelectItem>
                    <SelectItem value="USER">Users Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {auditTable
                      .getAllColumns()
                      .filter((col) => col.getCanHide())
                      .map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          className="capitalize text-xs"
                          checked={col.getIsVisible()}
                          onCheckedChange={(val) => col.toggleVisibility(!!val)}
                        >
                          {col.id.replace(/_/g, " ")}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Card className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs flex flex-col p-0">
              <Table className="m-0 relative" containerClassName="w-full overflow-x-auto">
                <TableHeader>
                  {auditTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-t-0 bg-slate-50/60 dark:bg-zinc-900/40">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-10 text-xs">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isAuditLoading ? (
                    <TableRow>
                      <TableCell colSpan={auditColumns.length} className="text-center py-12">
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                      </TableCell>
                    </TableRow>
                  ) : auditTable.getRowModel().rows?.length ? (
                    auditTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={auditColumns.length} className="text-center py-12 text-slate-500 text-xs">
                        No audit actions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5">
              <DataTablePagination table={auditTable} noun="action(s)" />
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: SYSTEM LOGS ── */}
        <TabsContent value="system" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    type="text"
                    placeholder="Search system logs..."
                    value={sysGlobalFilter}
                    onChange={(e) => setSysGlobalFilter(e.target.value)}
                    className="pl-9 w-[260px] h-9 text-xs sm:text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>

                <Select value={sysLevelFilter} onValueChange={setSysLevelFilter}>
                  <SelectTrigger className="h-9 w-[140px] text-xs bg-white dark:bg-zinc-900">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Levels</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARN">Warnings</SelectItem>
                    <SelectItem value="ERROR">Errors</SelectItem>
                    <SelectItem value="DEBUG">Debug</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sysSourceFilter} onValueChange={setSysSourceFilter}>
                  <SelectTrigger className="h-9 w-[160px] text-xs bg-white dark:bg-zinc-900">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    <SelectItem value="SYSTEM">System Engine</SelectItem>
                    <SelectItem value="STIPEND_SERVICE">Stipend Service</SelectItem>
                    <SelectItem value="TRAVEL_SERVICE">Travel Service</SelectItem>
                    <SelectItem value="DATABASE">Database</SelectItem>
                    <SelectItem value="CACHE">Cache & PubSub</SelectItem>
                    <SelectItem value="AUTH">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {systemTable
                      .getAllColumns()
                      .filter((col) => col.getCanHide())
                      .map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          className="capitalize text-xs"
                          checked={col.getIsVisible()}
                          onCheckedChange={(val) => col.toggleVisibility(!!val)}
                        >
                          {col.id.replace(/_/g, " ")}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Card className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs flex flex-col p-0">
              <Table className="m-0 relative" containerClassName="w-full overflow-x-auto">
                <TableHeader>
                  {systemTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-t-0 bg-slate-50/60 dark:bg-zinc-900/40">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-10 text-xs">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isSystemLoading ? (
                    <TableRow>
                      <TableCell colSpan={systemColumns.length} className="text-center py-12">
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
                      </TableCell>
                    </TableRow>
                  ) : systemTable.getRowModel().rows?.length ? (
                    systemTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={systemColumns.length} className="text-center py-12 text-slate-500 text-xs">
                        No system logs found matching criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5">
              <DataTablePagination table={systemTable} noun="log(s)" />
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: LOGIN ACTIVITIES ── */}
        <TabsContent value="logins" className="flex-1 flex flex-col min-h-0 m-0 data-[state=active]:flex">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  type="text"
                  placeholder="Search activities..."
                  value={loginGlobalFilter}
                  onChange={(e) => setLoginGlobalFilter(e.target.value)}
                  className="pl-9 w-[280px] h-9 text-xs sm:text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto h-9">
                    Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {loginTable
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-xs"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id.replace(/_/g, " ")}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Card className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs flex flex-col p-0">
              <Table className="m-0 relative" containerClassName="w-full overflow-x-auto">
                <TableHeader>
                  {loginTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-t-0 bg-slate-50/60 dark:bg-zinc-900/40">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-10 text-xs">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoginLoading ? (
                    <TableRow>
                      <TableCell colSpan={loginColumns.length} className="text-center py-12">
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                      </TableCell>
                    </TableRow>
                  ) : loginTable.getRowModel().rows?.length ? (
                    loginTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={loginColumns.length} className="text-center py-12 text-slate-500 text-xs">
                        No login activities found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5">
              <DataTablePagination table={loginTable} noun="activity(ies)" />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Inspector Dialog */}
      <Dialog open={!!detailModalItem} onOpenChange={(open) => !open && setDetailModalItem(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
          <DialogHeader className="border-b border-slate-100 dark:border-zinc-800 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center justify-between">
              <span>{detailModalItem?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detailed payload and system metadata recorded for this log entry.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => handleCopyJson(detailModalItem?.data)}
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>

            <pre className="text-xs font-mono bg-slate-50 dark:bg-zinc-900 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-x-auto max-h-[380px] text-slate-800 dark:text-zinc-200">
              {JSON.stringify(detailModalItem?.data, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
