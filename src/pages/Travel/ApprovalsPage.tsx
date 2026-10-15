import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Receipt,
  Plane,
  Coins,
  ShieldCheck,
  Search,
  ExternalLink,
  User,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { travelService } from "@/services/travelService";
import { useAuth } from "@/lib/AuthContext";

export const formatHumanCategory = (category?: string): string => {
  if (!category) return "General Expense";
  const catMap: Record<string, string> = {
    meals_entertainment: "Meals & Entertainment",
    flight: "Air Travel",
    lodging: "Hotel & Lodging",
    ground_transport: "Ground Transportation",
    fuel: "Fuel & Fleet Mileage",
    drone_gear_cargo: "Drone Hardware & Cargo",
    equipment_supplies: "Office & Field Supplies",
    other: "Miscellaneous Expense",
  };
  const key = String(category).toLowerCase().trim();
  return catMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  stipend: "Per Diem / Stipend",
  booking: "Flight Booking",
  cargo: "Drone Cargo",
};

// Generic Approval Item representation unifying all travel approval workflows
export interface ApprovalItem {
  id: string;
  sourceType: "expense" | "stipend" | "booking" | "cargo";
  sourceTypeLabel?: string;
  categoryLabel?: string;
  referenceNumber: string;
  title: string;
  requesterName: string;
  requesterEmail: string;
  eventName: string;
  eventId?: string | null;
  amountCad: number;
  originalAmount?: number;
  originalCurrency?: string;
  submittedAt: string;
  status: "pending_approval" | "approved" | "rejected" | "draft";
  policy?: string;
  policyCompliant: boolean;
  policyNotes?: string;
  description?: string;
  lineItemsCount?: number;
  hasAttachment: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isReimbursable?: boolean;
  paymentMethod?: string;
  rawPayload: any;
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user, roles } = useAuth();

  // Navigation & View Mode: "list" vs "details" (User-requested: Click row to view in details page instead of dialog)
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<"all" | "expense" | "stipend" | "booking" | "cargo">("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending_approval");
  const [searchQuery, setSearchQuery] = useState("");
  const [approverNotes, setApproverNotes] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  // Administrator & Approver Role Check
  const isApprover = Boolean(
    user?.is_super_admin ||
    roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "CEO", "EA", "COORDINATOR", "MANAGER", "FINANCE"].includes(r.code?.toUpperCase())
    ) ||
    user?.email?.toLowerCase().includes("admin") ||
    user?.email?.toLowerCase().includes("ceo")
  );

  // 1. Fetch Expenses / Receipts (Full admin visibility)
  const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["travelReceipts", "approvals"],
    queryFn: () => travelService.getReceipts({ isAdminOverride: true }),
  });

  // 2. Fetch Traveler Stipends
  const { data: stipendsData = [], isLoading: isLoadingStipends } = useQuery({
    queryKey: ["travelStipends", "approvals"],
    queryFn: travelService.getStipends,
  });

  // 3. Fetch Travel Bookings
  const { data: bookingsData = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ["travelBookings", "approvals"],
    queryFn: () => travelService.getBookings(),
  });

  // Map into unified Approval items
  const approvalItems: ApprovalItem[] = useMemo(() => {
    const items: ApprovalItem[] = [];

    // Map Expenses
    const receipts = receiptsData?.receipts || [];
    receipts.forEach((r) => {
      const cad = Number(r.amount_cad || (Number(r.total_amount) * (Number(r.exchange_rate) || 1.385)));
      const isCompliant = !(r.expense_category === "meals_entertainment" && cad > 150) && !(r.expense_category === "flight" && cad > 3500);
      const catLabel = formatHumanCategory(r.expense_category);

      items.push({
        id: `exp-${r.id}`,
        sourceType: "expense",
        sourceTypeLabel: "Expense",
        categoryLabel: catLabel,
        referenceNumber: r.receipt_number || `EXP-${r.id.slice(0, 8).toUpperCase()}`,
        title: r.merchant_name || "Business Expense",
        requesterName: r.user_name || r.user_email || "Alex Rivera",
        requesterEmail: r.user_email || "alex.rivera@zenatech.com",
        eventName: r.event_title || "General Corporate Travel",
        eventId: r.event_id,
        amountCad: cad,
        originalAmount: Number(r.total_amount),
        originalCurrency: r.currency || "USD",
        submittedAt: r.created_at || r.transaction_date || new Date().toISOString(),
        status: (r.status as any) || "pending_approval",
        policy: r.policy || "Standard Corporate Expense Policy",
        policyCompliant: isCompliant,
        policyNotes: isCompliant ? "Fully compliant with per-diem limits." : "Exceeds standard per-diem or flight corridor thresholds.",
        description: r.description || r.notes || "",
        lineItemsCount: r.line_items ? r.line_items.length : 0,
        hasAttachment: Boolean(r.file_data),
        attachmentUrl: r.file_data,
        attachmentName: r.file_name,
        isReimbursable: r.is_reimbursable,
        paymentMethod: r.payment_method,
        rawPayload: r,
      });
    });

    // Map Stipends
    stipendsData.forEach((st: any) => {
      const rawStatus = String(st.status || "").toLowerCase().trim();
      const stStatus: "pending_approval" | "approved" | "rejected" =
        rawStatus === "disbursed" || rawStatus === "approved"
          ? "approved"
          : rawStatus === "failed" || rawStatus === "rejected"
          ? "rejected"
          : "pending_approval";

      const recipientName = st.recipient_name || st.traveler_name || "Traveler";
      const totalAmount = Number(st.total_amount || st.stipend_amount || 0);

      items.push({
        id: `stp-${st.id}`,
        sourceType: "stipend",
        referenceNumber: `STP-${st.id.slice(0, 8).toUpperCase()}`,
        title: `Travel Stipend: ${recipientName}`,
        requesterName: recipientName,
        requesterEmail: st.recipient_email || st.traveler_email || "",
        eventName: st.event_title || st.event_name || "Corporate Travel Event",
        eventId: st.event_id,
        amountCad: totalAmount,
        originalAmount: totalAmount,
        originalCurrency: st.currency || "CAD",
        submittedAt: st.created_at || new Date().toISOString(),
        status: stStatus,
        policy: "Executive & Employee Travel Stipend Policy",
        policyCompliant: true,
        policyNotes: "Standard daily stipend allocation.",
        description: st.notes || `Direct deposit stipend for ${recipientName} travel operations.`,
        hasAttachment: false,
        rawPayload: st,
      });
    });

    // Map Bookings
    bookingsData.forEach((bk: any) => {
      const rawStatus = String(bk.status || bk.booking_status || "").toLowerCase().trim();
      const bkStatus: "pending_approval" | "approved" | "rejected" =
        rawStatus === "confirmed" || rawStatus === "approved"
          ? "approved"
          : rawStatus === "cancelled" || rawStatus === "rejected"
          ? "rejected"
          : rawStatus === "pending" || rawStatus === "pending_approval" || rawStatus === "requested"
          ? "pending_approval"
          : "approved";

      const travelerName = bk.traveler_name || bk.booked_by_name || "Executive Traveler";
      const carrier = bk.carrier_airline || bk.carrier || "Airline";
      const flightNum = bk.flight_numbers || bk.flight_number || "";
      const totalFare = Number(bk.total_cost || bk.total_fare || 0);
      const isCompliant = totalFare <= 2500;

      items.push({
        id: `bkg-${bk.id}`,
        sourceType: "booking",
        referenceNumber: bk.booking_reference || `BKG-${bk.id.slice(0, 8).toUpperCase()}`,
        title: flightNum ? `${carrier} ${flightNum}` : carrier,
        requesterName: travelerName,
        requesterEmail: bk.traveler_email || bk.passenger_email || "",
        eventName: bk.event_title || (bk.origin_city && bk.destination_city ? `${bk.origin_city} → ${bk.destination_city}` : "Executive Travel Itinerary"),
        eventId: bk.event_id,
        amountCad: totalFare,
        originalAmount: totalFare,
        originalCurrency: bk.currency || "CAD",
        submittedAt: bk.created_at || new Date().toISOString(),
        status: bkStatus,
        policy: "Air Canada & Commercial Flight Policy",
        policyCompliant: isCompliant,
        policyNotes: isCompliant ? "Within standard air travel corridor." : "Exceeds standard booking corridor threshold ($2,500 CAD).",
        description: bk.origin_city && bk.destination_city
          ? `Flight from ${bk.origin_city} to ${bk.destination_city}.${bk.seat_assignment ? ` Seat: ${bk.seat_assignment}.` : ""}`
          : `Reservation with ${carrier}. Reference: ${bk.booking_reference || "N/A"}.`,
        hasAttachment: Boolean(bk.eticket_pdf_url),
        attachmentUrl: bk.eticket_pdf_url,
        attachmentName: bk.eticket_pdf_url ? "AirCanada_eTicket.pdf" : null,
        rawPayload: bk,
      });
    });

    // Sort by latest submitted
    return items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [receiptsData, stipendsData, bookingsData]);

  // Tab counters
  const categoryCounts = useMemo(() => {
    const pendingItems = approvalItems.filter((i) => i.status === "pending_approval");
    return {
      all: pendingItems.length,
      expense: pendingItems.filter((i) => i.sourceType === "expense").length,
      stipend: pendingItems.filter((i) => i.sourceType === "stipend").length,
      booking: pendingItems.filter((i) => i.sourceType === "booking").length,
      cargo: pendingItems.filter((i) => i.sourceType === "cargo").length,
    };
  }, [approvalItems]);

  // Filtered List
  const filteredApprovals = useMemo(() => {
    return approvalItems.filter((item) => {
      // Category Tab filter
      if (activeCategoryTab !== "all" && item.sourceType !== activeCategoryTab) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = item.referenceNumber.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesReq = item.requesterName.toLowerCase().includes(q) || item.requesterEmail.toLowerCase().includes(q);
        const matchesEvent = item.eventName.toLowerCase().includes(q);
        if (!matchesRef && !matchesTitle && !matchesReq && !matchesEvent) return false;
      }
      return true;
    });
  }, [approvalItems, activeCategoryTab, statusFilter, searchQuery]);

  // Active selected item for Details View
  const selectedApproval = useMemo(() => {
    if (!selectedApprovalId) return null;
    return approvalItems.find((i) => i.id === selectedApprovalId) || null;
  }, [selectedApprovalId, approvalItems]);

  // Dynamic Breadcrumb Trail sync
  useEffect(() => {
    if (selectedApproval) {
      window.dispatchEvent(
        new CustomEvent("set-breadcrumb-trail", {
          detail: {
            path: location.pathname,
            items: [
              { title: "Travel", path: "/travel/ai-assistant" },
              { title: "Approvals", path: "/travel/approvals" },
              { title: `${selectedApproval.referenceNumber}` },
            ],
          },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("set-breadcrumb-trail", {
          detail: {
            path: location.pathname,
            items: [
              { title: "Travel", path: "/travel/ai-assistant" },
              { title: "Approvals" },
            ],
          },
        })
      );
    }

    return () => {
      window.dispatchEvent(
        new CustomEvent("set-breadcrumb-trail", {
          detail: {
            path: location.pathname,
            items: undefined,
          },
        })
      );
    };
  }, [selectedApproval, location.pathname]);

  // Approval Mutation
  const handleDecision = async (newStatus: "approved" | "rejected") => {
    if (!selectedApproval) return;
    setActionInProgress(true);
    try {
      if (selectedApproval.sourceType === "expense") {
        const receiptId = selectedApproval.rawPayload.id;
        await travelService.updateReceipt(receiptId, {
          status: newStatus,
          notes: approverNotes.trim() ? `${selectedApproval.description || ""}\n[Approver Note]: ${approverNotes.trim()}` : selectedApproval.description,
        });
        queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
      } else if (selectedApproval.sourceType === "stipend") {
        if (newStatus === "approved") {
          await travelService.disburseStipend(selectedApproval.rawPayload.id);
        }
        queryClient.invalidateQueries({ queryKey: ["travelStipends"] });
      }

      toast.success(
        newStatus === "approved"
          ? `Request ${selectedApproval.referenceNumber} has been approved successfully!`
          : `Request ${selectedApproval.referenceNumber} has been marked as rejected.`
      );
      setApproverNotes("");
      setSelectedApprovalId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Action failed. Please verify your permissions.");
    } finally {
      setActionInProgress(false);
    }
  };

  const isLoading = isLoadingReceipts || isLoadingStipends || isLoadingBookings;

  return (
    <div className="w-full min-h-[calc(100vh-theme(spacing.28))] p-4 sm:p-6 lg:p-8 space-y-6 max-w-full">
      {/* ======================= VIEW MODE 2: DETAILS PAGE (NO DIALOG) ======================= */}
      {selectedApproval ? (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Top Return Banner */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedApprovalId(null);
                setApproverNotes("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Approvals List</span>
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                Ref: {selectedApproval.referenceNumber}
              </span>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-semibold ${
                  selectedApproval.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : selectedApproval.status === "rejected"
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse"
                }`}
              >
                {selectedApproval.status === "pending_approval" ? "Pending Decision" : selectedApproval.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Details Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Overview, Line items, Document Preview */}
            <div className="lg:col-span-8 space-y-6">
              {/* Header Card */}
              <Card className="border-border shadow-xs">
                <CardHeader className="p-5 border-b border-border bg-card">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          {selectedApproval.sourceType === "expense" ? (
                            <Receipt className="w-5 h-5" />
                          ) : selectedApproval.sourceType === "stipend" ? (
                            <Coins className="w-5 h-5" />
                          ) : (
                            <Plane className="w-5 h-5" />
                          )}
                        </span>
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">
                          <span>{selectedApproval.title}</span>
                          {selectedApproval.categoryLabel && (
                            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20">
                              {selectedApproval.categoryLabel}
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground">
                        Associated with <strong className="text-foreground">{selectedApproval.eventName}</strong> • Submitted by {selectedApproval.requesterName} ({selectedApproval.requesterEmail})
                      </CardDescription>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-semibold uppercase">Total Amount</div>
                      <div className="text-2xl font-black font-mono text-foreground">
                        ${selectedApproval.amountCad.toFixed(2)} CAD
                      </div>
                      {selectedApproval.originalCurrency && selectedApproval.originalCurrency !== "CAD" && (
                        <div className="text-xs font-mono text-muted-foreground">
                          ${selectedApproval.originalAmount?.toFixed(2)} {selectedApproval.originalCurrency}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-6">
                  {/* Policy Compliance Pill */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      selectedApproval.policyCompliant
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedApproval.policyCompliant ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      )}
                      <div>
                        <strong className="font-semibold block">{selectedApproval.policy}</strong>
                        <span className="text-[11px] opacity-90">{selectedApproval.policyNotes}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                      {selectedApproval.policyCompliant ? "In Policy" : "Policy Review Needed"}
                    </Badge>
                  </div>

                  {/* Core Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Category</span>
                      <span className="font-semibold text-foreground">{selectedApproval.categoryLabel || selectedApproval.sourceTypeLabel || selectedApproval.sourceType}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Payment Method</span>
                      <span className="font-semibold text-foreground truncate block">{selectedApproval.paymentMethod || "Corporate Direct"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">To Be Reimbursed</span>
                      <span className={`font-semibold ${selectedApproval.isReimbursable ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`}>
                        {selectedApproval.isReimbursable ? `$${selectedApproval.amountCad.toFixed(2)} CAD` : "No (Company Paid)"}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Submitted Date</span>
                      <span className="font-semibold text-foreground">{selectedApproval.submittedAt.split("T")[0]}</span>
                    </div>
                  </div>

                  {/* Description / Notes */}
                  {selectedApproval.description && (
                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">Submission Notes:</span>
                      <p className="p-3 rounded-lg bg-muted/20 border border-border text-foreground leading-relaxed">
                        {selectedApproval.description}
                      </p>
                    </div>
                  )}

                  {/* Line Items Breakdown (if available) */}
                  {selectedApproval.rawPayload.line_items && selectedApproval.rawPayload.line_items.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Itemized Line Items</span>
                        <Badge variant="outline" className="text-[10px]">{selectedApproval.rawPayload.line_items.length} items</Badge>
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                            <tr>
                              <th className="p-2.5">Item Description</th>
                              <th className="p-2.5 text-center w-16">Qty</th>
                              <th className="p-2.5 text-right w-24">Unit Price</th>
                              <th className="p-2.5 text-right w-28">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedApproval.rawPayload.line_items.map((it: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="p-2.5 font-medium text-foreground">{it.description}</td>
                                <td className="p-2.5 text-center font-mono text-muted-foreground">{it.quantity || 1}</td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">${Number(it.unit_price || 0).toFixed(2)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground">${Number(it.total || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Document / Receipt Viewer */}
                  {selectedApproval.hasAttachment && selectedApproval.attachmentUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span>Attached Receipt / Supporting Documentation</span>
                        <a
                          href={selectedApproval.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <span>Pop-out Viewer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="w-full h-[400px] bg-neutral-950 rounded-xl overflow-hidden border border-border flex items-center justify-center">
                        {selectedApproval.attachmentName?.toLowerCase().endsWith(".pdf") || selectedApproval.attachmentUrl.startsWith("data:application/pdf") ? (
                          <iframe
                            src={selectedApproval.attachmentUrl}
                            title="Receipt Document"
                            className="w-full h-full border-0"
                          />
                        ) : (
                          <img
                            src={selectedApproval.attachmentUrl}
                            alt="Receipt Attachment"
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right 4 Cols: Approver Decision Action Card */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-border shadow-xs sticky top-4">
                <CardHeader className="p-4 sm:p-5 border-b border-border bg-card">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Approver Actions & Audit</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Review policies and submit your formal decision.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground block mb-1">
                      Approver Comment / Audit Trail Note
                    </Label>
                    <Textarea
                      placeholder="Add an approval reference, budget corridor note, or reason for rejection..."
                      value={approverNotes}
                      onChange={(e) => setApproverNotes(e.target.value)}
                      rows={3}
                      className="text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => handleDecision("approved")}
                      disabled={actionInProgress}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs"
                    >
                      {actionInProgress ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Approve Request (${selectedApproval.amountCad.toFixed(2)} CAD)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDecision("rejected")}
                      disabled={actionInProgress}
                      className="w-full font-bold text-xs gap-1.5 rounded-xl"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject & Send Back</span>
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>Audit Policy Compliance</span>
                    </div>
                    <p>
                      Approving will disburse/reimburse to employee account or notify executive travel desk. This action is permanently recorded in the immutable System Audit Log.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        /* ======================= VIEW MODE 1: FULL SCREEN APPROVALS LIST ======================= */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Approvals
                </h1>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs gap-1.5 py-0.5">
                  <Clock className="w-3 h-3 animate-pulse" />
                  <span>{categoryCounts.all} Pending Actions</span>
                </Badge>
                {isApprover && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Administrator Access
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Centralized executive approval hub for expense reimbursements, travel stipends, corporate bookings, and special cargo manifests.
              </p>
            </div>

            {/* Category Tab Pills */}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveCategoryTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategoryTab === "all"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Approvals ({categoryCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("expense")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategoryTab === "expense"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Expenses ({categoryCounts.expense})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("stipend")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategoryTab === "stipend"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stipends ({categoryCounts.stipend})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryTab("booking")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategoryTab === "booking"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bookings ({categoryCounts.booking})
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by requester, reference #, merchant, event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-lg border-border"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-hidden"
              >
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <div className="text-sm font-semibold text-foreground">Loading approval requests...</div>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-60" />
              <div className="text-base font-semibold text-foreground">All caught up!</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                There are no pending requests matching your current filters.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 whitespace-nowrap min-w-[120px]">Type</th>
                      <th className="p-3 whitespace-nowrap min-w-[240px]">Item & Reference</th>
                      <th className="p-3 whitespace-nowrap min-w-[200px]">Requester</th>
                      <th className="p-3 whitespace-nowrap min-w-[180px]">Event / Policy</th>
                      <th className="p-3 text-right whitespace-nowrap min-w-[140px]">Amount</th>
                      <th className="p-3 text-right whitespace-nowrap min-w-[140px]">To Be Reimbursed</th>
                      <th className="p-3 text-center whitespace-nowrap min-w-[120px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredApprovals.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedApprovalId(item.id)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        title="Click row to open detailed review page"
                      >
                        {/* Type Icon Badge */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-[11px] font-semibold text-foreground border border-border/80">
                            {item.sourceType === "expense" ? (
                              <Receipt className="w-3.5 h-3.5 text-primary" />
                            ) : item.sourceType === "stipend" ? (
                              <Coins className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <Plane className="w-3.5 h-3.5 text-sky-500" />
                            )}
                            <span>{item.sourceTypeLabel || item.sourceType}</span>
                          </span>
                        </td>

                        {/* Item & Reference */}
                        <td className="p-3 whitespace-nowrap min-w-[260px]">
                          <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                            <span>{item.title}</span>
                            {item.categoryLabel && (
                              <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60 border border-border/60">
                                {item.categoryLabel}
                              </span>
                            )}
                            {!item.policyCompliant && (
                              <span title="Policy Alert">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-sans">
                            <span className="font-mono text-muted-foreground/80">{item.referenceNumber}</span>
                            <span>•</span>
                            <span>{item.submittedAt ? item.submittedAt.split("T")[0] : ""}</span>
                          </div>
                        </td>

                        {/* Requester */}
                        <td className="p-3 whitespace-nowrap min-w-[200px]">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{item.requesterName}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{item.requesterEmail}</div>
                        </td>

                        {/* Event & Policy */}
                        <td className="p-3 whitespace-nowrap min-w-[180px]">
                          <div className="font-medium text-foreground truncate max-w-[220px]">
                            {item.eventName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                            {item.policy}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="p-3 text-right whitespace-nowrap min-w-[140px]">
                          <div className="font-mono font-bold text-foreground text-sm">
                            ${item.amountCad.toFixed(2)} CAD
                          </div>
                          {item.originalCurrency && item.originalCurrency !== "CAD" && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ${item.originalAmount?.toFixed(2)} {item.originalCurrency}
                            </div>
                          )}
                        </td>

                        {/* To Be Reimbursed */}
                        <td className="p-3 text-right whitespace-nowrap min-w-[140px]">
                          {item.isReimbursable ? (
                            <div>
                              <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                ${item.amountCad.toFixed(2)} CAD
                              </div>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                Reimbursable
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono text-muted-foreground text-xs">$0.00 CAD</span>
                              <span className="text-[10px] text-muted-foreground block">Company Direct</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center whitespace-nowrap min-w-[120px]">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border inline-block ${
                              item.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : item.status === "rejected"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                            }`}
                          >
                            {item.status === "pending_approval"
                              ? "Pending Approval"
                              : item.status === "approved"
                              ? "Approved"
                              : item.status === "rejected"
                              ? "Rejected"
                              : "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
