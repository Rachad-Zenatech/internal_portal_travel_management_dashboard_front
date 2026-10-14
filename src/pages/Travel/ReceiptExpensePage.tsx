import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import { useAuth } from "@/lib/AuthContext";
import type { TravelReceipt, ReceiptExtractionResult, TravelEvent, ReceiptLineItem } from "@/types/travel";
import {
  Receipt,
  UploadCloud,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Plane,
  Building,
  Car,
  Utensils,
  Wrench,
  Fuel,
  Package,
  Layers,
  Search,
  Eye,
  Trash2,
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
import { toast } from "sonner";

export default function ReceiptExpensePage() {
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe helper to reliably parse line_items even if serialized as string from PostgreSQL JSONB
  const getSafeLineItems = (items: any): ReceiptLineItem[] => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [];
      }
    }
    return [];
  };

  // Leadership role check (CEO, EA, Lead, Super Admin)
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

  // Perspective mode: Leaders can switch between Leadership Dispatch & Attendee Mode
  const [perspectiveMode, setPerspectiveMode] = useState<"leadership" | "attendee">(
    isActualLeader ? "leadership" : "attendee"
  );

  // Filters
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload & Extraction Modal States
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<ReceiptExtractionResult | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<TravelReceipt | null>(null);

  // Form Fields for Confirmation / Manual Edit
  const [formMerchant, setFormMerchant] = useState("");
  const [formTotal, setFormTotal] = useState(0.0);
  const [formTax, setFormTax] = useState(0.0);
  const [formTip, setFormTip] = useState(0.0);
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formCategory, setFormCategory] = useState("other");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Corporate Card");
  const [formDate, setFormDate] = useState("");
  const [formReceiptNum, setFormReceiptNum] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Query events
  const { data: eventsList = [] } = useQuery<TravelEvent[]>({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  const isAttendeeView = perspectiveMode === "attendee";
  const effectiveEmail = isAttendeeView ? user?.email || "alex.rivera@zenatech.com" : undefined;

  // Query Receipts
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ["travelReceipts", selectedEventId, statusFilter, categoryFilter, perspectiveMode, effectiveEmail],
    queryFn: () =>
      travelService.getReceipts({
        eventId: selectedEventId,
        userEmail: effectiveEmail,
        status: statusFilter,
        category: categoryFilter,
        isAdminOverride: !isAttendeeView,
      }),
  });

  const receiptsList = receiptsData?.receipts || [];
  const stats = receiptsData?.stats || {
    total_receipts: 0,
    total_amount: 0,
    pending_amount: 0,
    approved_amount: 0,
    reimbursed_amount: 0,
  };

  // Upload Mutation
  const uploadExtractMutation = useMutation({
    mutationFn: (formData: FormData) => travelService.uploadAndExtractReceipt(formData),
    onSuccess: (data) => {
      setIsExtracting(false);
      setExtractedPreview(data);
      // Pre-fill form
      setFormMerchant(data.merchant_name || "");
      setFormTotal(data.total_amount || 0.0);
      setFormTax(data.tax_amount || 0.0);
      setFormTip(data.tip_amount || 0.0);
      setFormCurrency(data.currency || "USD");
      setFormCategory(data.expense_category || "other");
      setFormPaymentMethod(data.payment_method || "Corporate Card");
      setFormDate(data.transaction_date || new Date().toISOString().split("T")[0]);
      setFormReceiptNum(data.receipt_number || "");
      setFormEventId(data.event_id || eventsList[0]?.id || "");
      setFormNotes("");
      setIsConfirmModalOpen(true);
      toast.success("Receipt successfully extracted with AI!");
    },
    onError: (err: any) => {
      setIsExtracting(false);
      toast.error(err?.response?.data?.detail || "Failed to extract receipt");
    },
  });

  // Save Receipt Mutation
  const saveReceiptMutation = useMutation({
    mutationFn: (payload: Partial<TravelReceipt>) => travelService.createReceipt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
      toast.success("Receipt expense recorded successfully!");
      setIsConfirmModalOpen(false);
      setExtractedPreview(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to save receipt expense");
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TravelReceipt> }) =>
      travelService.updateReceipt(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
      toast.success("Receipt status updated");
      if (selectedReceiptDetail) {
        setSelectedReceiptDetail(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update receipt");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => travelService.deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
      toast.success("Receipt removed");
      if (selectedReceiptDetail) {
        setSelectedReceiptDetail(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete receipt");
    },
  });

  // File Handlers
  const handleFileSelect = (file: File) => {
    if (!file) return;
    setIsExtracting(true);
    const formData = new FormData();
    formData.append("file", file);
    if (selectedEventId && selectedEventId !== "all") {
      formData.append("event_id", selectedEventId);
    }
    uploadExtractMutation.mutate(formData);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Sample Receipt Loaders for fast testing
  const handleLoadSample = (sampleType: "delta" | "bellagio" | "uber" | "drone_parts" | "spago") => {
    setIsExtracting(true);
    let sampleText = "";
    let sampleFilename = "";

    if (sampleType === "delta") {
      sampleFilename = "delta_e_ticket_slc_las.txt";
      sampleText = `DELTA AIR LINES PASSENGER RECEIPT
TICKET: 006-8812904128
DATE: 2026-10-14
PASSENGER: Alex Rivera
FLIGHT DL 1482: SLC -> LAS
BASE FARE: $610.00
SECURITY & CARRIER TAXES: $52.40
CHECKED DRONE CARGO BAG: $65.00
TOTAL CHARGED: $727.40 USD
PAYMENT: AMEX ****4012`;
    } else if (sampleType === "bellagio") {
      sampleFilename = "bellagio_folio_oct14.txt";
      sampleText = `BELLAGIO RESORT & CASINO
ROOM 2408 - ALEX RIVERA
DATE: 2026-10-14
NIGHTLY CHARGE: $340.00
RESORT FEE: $45.00
ROOM TAX: $39.50
TOTAL AMOUNT: $424.50 USD
PAID BY: CORPORATE AMEX`;
    } else if (sampleType === "uber") {
      sampleFilename = "uber_las_airport_shuttle.txt";
      sampleText = `UBER TRIP RECEIPT
DATE: 2026-10-14
TRIP FARE: $48.20
AIRPORT SURCHARGE: $3.80
DRIVER TIP: $10.00
TOTAL PAID: $62.00 USD
PAYMENT METHOD: PERSONAL VISA`;
    } else if (sampleType === "drone_parts") {
      sampleFilename = "getfpv_combat_props_esc.txt";
      sampleText = `GETFPV COMBAT DRONE PARTS
ORDER: GFPV-99214
DATE: 2026-10-14
4X COMBAT REINFORCED PROPS: $180.00
2X 6S LIPO FLIGHT BATTERIES: $220.00
SALES TAX: $34.20
TOTAL: $434.20 USD
PAID BY: CORPORATE AMEX`;
    } else {
      sampleFilename = "spago_luncheon_receipt.txt";
      sampleText = `SPAGO BY WOLFGANG PUCK
BELLAGIO OVERLOOK
DATE: 2026-10-14
EXECUTIVE LUNCH TASTING (4 GUESTS): $560.00
BEVERAGES: $65.00
TAX: $65.60
GRATUITY (20%): $130.00
TOTAL: $820.60 USD
PAYMENT: CORPORATE AMEX`;
    }

    const blob = new Blob([sampleText], { type: "text/plain" });
    const file = new File([blob], sampleFilename, { type: "text/plain" });
    handleFileSelect(file);
  };

  // Filtered List
  const filteredReceipts = useMemo(() => {
    return receiptsList.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.receipt_number && r.receipt_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [receiptsList, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "flight":
        return <Plane className="h-4 w-4 text-sky-400" />;
      case "lodging":
        return <Building className="h-4 w-4 text-indigo-400" />;
      case "ground_transport":
        return <Car className="h-4 w-4 text-emerald-400" />;
      case "meals_entertainment":
        return <Utensils className="h-4 w-4 text-amber-400" />;
      case "drone_gear_cargo":
        return <Package className="h-4 w-4 text-rose-400" />;
      case "fuel":
        return <Fuel className="h-4 w-4 text-orange-400" />;
      case "equipment_supplies":
        return <Wrench className="h-4 w-4 text-teal-400" />;
      default:
        return <Layers className="h-4 w-4 text-purple-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "reimbursed":
        return (
          <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 gap-1 text-[11px]">
            <DollarSign className="h-3 w-3" />
            Reimbursed
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1 text-[11px]">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Receipts & AI Expense OCR
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs">
                  Multimodal Extraction
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Upload receipts and flight/hotel invoices for instant multimodal OCR extraction and reimbursement tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Perspective Mode & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isActualLeader && (
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1 text-xs">
              <span className="px-2 text-muted-foreground font-medium">Perspective:</span>
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
                Leadership & Finance
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
                My Expense View
              </Button>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 text-white hover:from-indigo-500 hover:to-sky-500 shadow-sm"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Receipt</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Expense Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Total Tracked</span>
              <span className="text-xl font-bold text-foreground font-mono">
                ${stats.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                {stats.total_receipts} Receipts Processed
              </span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Approved Expenses</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                ${stats.approved_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-400/80 block mt-0.5">Verified & Confirmed</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Pending Review</span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                ${stats.pending_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-amber-400/80 block mt-0.5">Awaiting Manager Approval</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Reimbursed</span>
              <span className="text-xl font-bold text-sky-400 font-mono">
                ${stats.reimbursed_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-sky-400/80 block mt-0.5">Paid Out to Staff</span>
            </div>
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drag & Drop Upload Zone + Sample Triggers */}
      <Card
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-dashed border-2 border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent p-6 text-center hover:border-indigo-500 transition-all cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-0 flex flex-col items-center justify-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
            {isExtracting ? (
              <Sparkles className="h-7 w-7 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="h-7 w-7 text-indigo-400" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {isExtracting ? "Extracting Receipt with AI OCR..." : "Drop your receipts here or click to browse"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Supports JPEG, PNG, WEBP images, PDF hotel folios, and digital flight tickets. Automatically parses vendor, line items, and taxes.
            </p>
          </div>

          {/* Rapid Test Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground mr-1">Quick Demo Samples:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-sky-500/30 hover:bg-sky-500/10 text-sky-400"
              onClick={() => handleLoadSample("delta")}
            >
              <Plane className="h-3 w-3" />
              <span>Delta e-Ticket</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400"
              onClick={() => handleLoadSample("bellagio")}
            >
              <Building className="h-3 w-3" />
              <span>Bellagio Folio</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
              onClick={() => handleLoadSample("uber")}
            >
              <Car className="h-3 w-3" />
              <span>Uber XL Airport</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-rose-500/30 hover:bg-rose-500/10 text-rose-400"
              onClick={() => handleLoadSample("drone_parts")}
            >
              <Package className="h-3 w-3" />
              <span>Drone Combat Parts</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-amber-500/30 hover:bg-amber-500/10 text-amber-400"
              onClick={() => handleLoadSample("spago")}
            >
              <Utensils className="h-3 w-3" />
              <span>Spago Luncheon</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor, traveler, receipt #..."
            className="pl-8 text-xs h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Event Filter */}
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="h-9 text-xs w-[170px]">
              <SelectValue placeholder="All Trips" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trips / Events</SelectItem>
              {eventsList.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_approval">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="reimbursed">Reimbursed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-xs w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="flight">Flights & Airlines</SelectItem>
              <SelectItem value="lodging">Hotel & Lodging</SelectItem>
              <SelectItem value="ground_transport">Ground Transport</SelectItem>
              <SelectItem value="meals_entertainment">Meals & Dining</SelectItem>
              <SelectItem value="drone_gear_cargo">Drone Combat Cargo</SelectItem>
              <SelectItem value="fuel">Fuel & Mileage</SelectItem>
              <SelectItem value="equipment_supplies">Equipment & Tools</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Receipts Table / List */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-muted-foreground border rounded-xl bg-card">
          Loading receipts and expense manifests...
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-foreground">No receipts found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a receipt or adjust your search and filters to view expenses.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.map((r) => (
            <Card
              key={r.id}
              className="border-border hover:border-indigo-500/40 transition-all bg-card/80 backdrop-blur-xs flex flex-col justify-between"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-muted border">
                      {getCategoryIcon(r.expense_category)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        {r.merchant_name}
                      </CardTitle>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {r.receipt_number || "No Receipt #"}
                      </span>
                    </div>
                  </div>
                  <div>{getStatusBadge(r.status)}</div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {/* Amount & Date Bar */}
                <div className="p-2.5 rounded-lg bg-muted/40 border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Total Charged
                    </span>
                    <span className="text-base font-bold text-foreground font-mono">
                      ${Number(r.total_amount).toFixed(2)} {r.currency}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Date
                    </span>
                    <span className="text-xs font-medium text-foreground font-mono">
                      {r.transaction_date}
                    </span>
                  </div>
                </div>

                {/* Submitter & Event */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Submitter:</span>
                    <span className="font-medium text-foreground">{r.user_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Payment:</span>
                    <span className="font-medium text-foreground truncate max-w-[170px]">
                      {r.payment_method}
                    </span>
                  </div>
                  {r.event_title && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Trip:</span>
                      <span className="font-medium text-indigo-400 truncate max-w-[170px]">
                        {r.event_title}
                      </span>
                    </div>
                  )}
                </div>

                {/* AI Confidence Tag */}
                <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Sparkles className="h-3 w-3" />
                    {r.extraction_confidence}% AI Confidence
                  </span>
                  <span>{r.file_name || "Digital Receipt"}</span>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0 border-t flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1.5 flex-1"
                  onClick={() => setSelectedReceiptDetail(r)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect Folio</span>
                </Button>

                {/* Leadership Approval / Reimburse Actions */}
                {(isActualLeader || perspectiveMode === "leadership") && (
                  <>
                    {r.status === "pending_approval" && (
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: r.id,
                            payload: { status: "approved" },
                          })
                        }
                      >
                        Approve
                      </Button>
                    )}
                    {r.status === "approved" && (
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-sky-600 hover:bg-sky-500 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: r.id,
                            payload: { status: "reimbursed" },
                          })
                        }
                      >
                        Reimburse
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:text-rose-300"
                      onClick={() => deleteMutation.mutate(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* CONFIRM / REVIEW EXTRACTED RECEIPT MODAL */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Review & Confirm Extracted Receipt
            </DialogTitle>
            <DialogDescription className="text-xs">
              AI multimodal OCR successfully extracted values from{" "}
              <span className="font-semibold text-foreground">{extractedPreview?.file_name}</span>.
              Review and adjust fields before adding to expense ledgers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Extraction Confidence Header */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">
                  OCR Confidence: {extractedPreview?.extraction_confidence}%
                </span>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                Ready for Approval
              </Badge>
            </div>

            {/* Two-Column Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-xs mb-1 block">Merchant / Vendor Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Transaction Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Total Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 text-xs font-mono font-bold"
                  value={formTotal}
                  onChange={(e) => setFormTotal(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Tax / VAT Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 text-xs font-mono"
                  value={formTax}
                  onChange={(e) => setFormTax(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Expense Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">Flight & Airlines</SelectItem>
                    <SelectItem value="lodging">Hotel & Lodging</SelectItem>
                    <SelectItem value="ground_transport">Ground Transport & Taxis</SelectItem>
                    <SelectItem value="meals_entertainment">Meals & Dining</SelectItem>
                    <SelectItem value="drone_gear_cargo">Drone Combat Cargo & Gear</SelectItem>
                    <SelectItem value="fuel">Fuel & Shuttle Mileage</SelectItem>
                    <SelectItem value="equipment_supplies">Equipment & Hardware</SelectItem>
                    <SelectItem value="other">Other Incidentals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Payment Method</Label>
                <Select value={formPaymentMethod} onValueChange={setFormPaymentMethod}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corporate Amex #4012">Corporate Amex #4012</SelectItem>
                    <SelectItem value="Company Visa">Company Visa</SelectItem>
                    <SelectItem value="Personal Card (Reimbursable)">
                      Personal Card (Reimbursable)
                    </SelectItem>
                    <SelectItem value="Cash / Per Diem">Cash / Per Diem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Receipt / Invoice #</Label>
                <Input
                  className="h-8 text-xs"
                  value={formReceiptNum}
                  onChange={(e) => setFormReceiptNum(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Associated Travel Event</Label>
                <Select value={formEventId} onValueChange={setFormEventId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventsList.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items Breakdown */}
            {getSafeLineItems(extractedPreview?.line_items).length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-foreground block">
                  Extracted Line Items:
                </span>
                <div className="rounded-lg border bg-muted/30 p-2 space-y-1.5">
                  {getSafeLineItems(extractedPreview?.line_items).map((li, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">
                        {li.quantity}x {li.description}
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        ${Number(li.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitter Notes */}
            <div>
              <Label className="text-xs mb-1 block">Expense Purpose / Notes</Label>
              <Textarea
                className="text-xs min-h-[50px]"
                placeholder="Business justification for expense..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {/* Raw Extracted OCR text collapse */}
            {extractedPreview?.raw_extracted_text && (
              <div className="rounded border bg-muted/40 p-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Raw OCR Stream
                </span>
                <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {extractedPreview.raw_extracted_text}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={saveReceiptMutation.isPending || !formMerchant || formTotal <= 0}
              onClick={() =>
                saveReceiptMutation.mutate({
                  event_id: formEventId || null,
                  user_email: user?.email || "alex.rivera@zenatech.com",
                  user_name: user?.full_name || "Alex Rivera",
                  merchant_name: formMerchant,
                  transaction_date: formDate,
                  total_amount: formTotal,
                  tax_amount: formTax,
                  tip_amount: formTip,
                  currency: formCurrency,
                  expense_category: formCategory,
                  payment_method: formPaymentMethod,
                  receipt_number: formReceiptNum,
                  line_items: extractedPreview?.line_items || [],
                  raw_extracted_text: extractedPreview?.raw_extracted_text || "",
                  extraction_confidence: extractedPreview?.extraction_confidence || 95.0,
                  extraction_metadata: extractedPreview?.extraction_metadata || {},
                  file_name: extractedPreview?.file_name || "receipt.jpg",
                  file_type: extractedPreview?.file_type || "image/jpeg",
                  file_size_bytes: extractedPreview?.file_size_bytes || 0,
                  file_data: extractedPreview?.file_data || null,
                  status: "pending_approval",
                  notes: formNotes,
                })
              }
            >
              {saveReceiptMutation.isPending ? "Submitting..." : "Confirm & Save Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INSPECT RECEIPT DETAIL MODAL */}
      <Dialog
        open={Boolean(selectedReceiptDetail)}
        onOpenChange={(open) => !open && setSelectedReceiptDetail(null)}
      >
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          {selectedReceiptDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-indigo-400" />
                    {selectedReceiptDetail.merchant_name}
                  </DialogTitle>
                  {getStatusBadge(selectedReceiptDetail.status)}
                </div>
                <DialogDescription className="text-xs">
                  Receipt #{selectedReceiptDetail.receipt_number || "N/A"} • Submitted by{" "}
                  {selectedReceiptDetail.user_name} on {selectedReceiptDetail.transaction_date}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Financial Breakdown Card */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border text-center">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Grand Total
                    </span>
                    <span className="text-base font-bold text-foreground font-mono">
                      ${Number(selectedReceiptDetail.total_amount).toFixed(2)}{" "}
                      {selectedReceiptDetail.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Tax Amount
                    </span>
                    <span className="text-sm font-semibold text-foreground font-mono">
                      ${Number(selectedReceiptDetail.tax_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Tip / Gratuity
                    </span>
                    <span className="text-sm font-semibold text-foreground font-mono">
                      ${Number(selectedReceiptDetail.tip_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Physical / Digital Folio Document Preview */}
                {selectedReceiptDetail.file_data && (
                  <div className="rounded-lg border overflow-hidden bg-black/5 dark:bg-black/40 p-2 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground self-start mb-1">
                      Attached Folio / Receipt Document
                    </span>
                    {selectedReceiptDetail.file_type?.includes("pdf") ? (
                      <iframe
                        src={selectedReceiptDetail.file_data}
                        className="w-full h-64 rounded border-0"
                        title="Folio Document"
                      />
                    ) : (
                      <img
                        src={
                          selectedReceiptDetail.file_data.startsWith("data:") || selectedReceiptDetail.file_data.startsWith("http")
                            ? selectedReceiptDetail.file_data
                            : `data:${selectedReceiptDetail.file_type || "image/jpeg"};base64,${selectedReceiptDetail.file_data}`
                        }
                        alt={selectedReceiptDetail.merchant_name}
                        className="max-h-72 object-contain rounded shadow-xs"
                      />
                    )}
                  </div>
                )}

                {/* Line Items */}
                {getSafeLineItems(selectedReceiptDetail.line_items).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-semibold text-foreground block">Itemized Charges:</span>
                    <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1.5">
                      {getSafeLineItems(selectedReceiptDetail.line_items).map((li, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>
                            {li.quantity}x {li.description}
                          </span>
                          <span className="font-mono font-semibold">
                            ${Number(li.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes & Expedition details */}
                <div className="space-y-1 rounded-lg border p-2.5 bg-muted/20">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expedition:</span>
                    <span className="font-medium text-foreground">
                      {selectedReceiptDetail.event_title || "General Expedition"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium text-foreground">
                      {selectedReceiptDetail.payment_method}
                    </span>
                  </div>
                  {selectedReceiptDetail.notes && (
                    <div className="pt-1.5 border-t mt-1.5">
                      <span className="text-muted-foreground block mb-0.5">Notes:</span>
                      <p className="text-foreground">{selectedReceiptDetail.notes}</p>
                    </div>
                  )}
                </div>

                {/* Raw OCR Stream */}
                {selectedReceiptDetail.raw_extracted_text && (
                  <div className="rounded border bg-muted/40 p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      OCR Audit Log
                    </span>
                    <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {selectedReceiptDetail.raw_extracted_text}
                    </pre>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedReceiptDetail(null)}
                >
                  Close
                </Button>

                {(isActualLeader || perspectiveMode === "leadership") && (
                  <div className="flex items-center gap-1.5">
                    {selectedReceiptDetail.status !== "approved" && (
                      <Button
                        size="sm"
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedReceiptDetail.id,
                            payload: { status: "approved" },
                          })
                        }
                      >
                        Approve Expense
                      </Button>
                    )}
                    {selectedReceiptDetail.status !== "reimbursed" && (
                      <Button
                        size="sm"
                        className="text-xs bg-sky-600 hover:bg-sky-500 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: selectedReceiptDetail.id,
                            payload: { status: "reimbursed" },
                          })
                        }
                      >
                        Mark Reimbursed
                      </Button>
                    )}
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
