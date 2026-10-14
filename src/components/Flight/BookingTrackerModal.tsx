import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertTriangle,
  FileCheck,
  Copy,
  Plane,
} from "lucide-react";
import { flightService } from "@/services/flightService";
import type { FlightBookingSession } from "@/types/flight";

interface BookingTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: FlightBookingSession | null;
  onSessionUpdated: (session: FlightBookingSession) => void;
}

export const BookingTrackerModal: React.FC<BookingTrackerModalProps> = ({
  isOpen,
  onClose,
  session,
  onSessionUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<"live" | "fallback" | "audit">("live");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedPnr, setCopiedPnr] = useState(false);

  // Fallback form states
  const [fbPnr, setFbPnr] = useState("");
  const [fbProvider, setFbProvider] = useState(session?.provider_name || "Air Canada");
  const [fbTicket, setFbTicket] = useState("");
  const [fbPaid, setFbPaid] = useState<number>(session?.observed_price || 0);
  const [fbTraveler, setFbTraveler] = useState("");
  const [fbNotes, setFbNotes] = useState("");
  const [fbAttachment, setFbAttachment] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  // Auto-poll session every 3 seconds while modal is open and not confirmed
  useEffect(() => {
    if (!isOpen || !session?.id) return;
    if (session.status === "CONFIRMED" || session.status === "CANCELLED") return;

    const interval = setInterval(async () => {
      try {
        const updated = await flightService.getSessionDetails(session.id);
        if (updated) {
          onSessionUpdated(updated);
        }
      } catch (e) {
        console.error("Polling session update error", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, session?.id, session?.status]);

  if (!session) return null;

  const isConfirmed = session.status === "CONFIRMED";

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await flightService.getSessionDetails(session.id);
      if (updated) onSessionUpdated(updated);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyPnr = () => {
    if (session.confirmation_reference) {
      navigator.clipboard.writeText(session.confirmation_reference);
      setCopiedPnr(true);
      setTimeout(() => setCopiedPnr(false), 2000);
    }
  };

  const handleSubmitFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbPnr.trim()) {
      setFbError("Please enter a valid confirmation reference (PNR).");
      return;
    }
    setFbSubmitting(true);
    setFbError(null);
    try {
      const res = await flightService.submitFallback(session.id, {
        confirmation_reference: fbPnr.trim().toUpperCase(),
        provider_name: fbProvider,
        ticket_number: fbTicket.trim() || undefined,
        final_amount_paid: Number(fbPaid),
        currency: session.currency || "CAD",
        traveler_names: fbTraveler.trim() ? [fbTraveler.trim()] : [],
        verification_notes: fbNotes.trim() || undefined,
        attachment_url: fbAttachment.trim() || undefined,
      });
      if (res) {
        onSessionUpdated(res);
        setActiveTab("live");
      }
    } catch (err: any) {
      setFbError(err?.message || "Failed to submit verification fallback");
    } finally {
      setFbSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (session.status) {
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1">CONFIRMED</Badge>;
      case "BOOKING_LINK_OPENED":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-3 py-1">BOOKING LINK OPENED</Badge>;
      case "PENDING_VERIFICATION":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-3 py-1">PENDING VERIFICATION</Badge>;
      case "CANCELLED":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-3 py-1">CANCELLED</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground px-3 py-1">{session.status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span>Booking Session Monitor</span>
                  {getStatusBadge()}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Session ID: <code className="font-mono text-foreground">{session.id}</code>
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="xs"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="gap-1.5 text-xs"
            >
              <Clock className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Navigation tabs */}
        <div className="flex border-b border-border mt-3 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("live")}
            className={`pb-2.5 transition-colors relative ${
              activeTab === "live"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Live Monitor & Telemetry
          </button>
          <button
            onClick={() => setActiveTab("fallback")}
            className={`pb-2.5 transition-colors relative flex items-center gap-1.5 ${
              activeTab === "fallback"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Verification Fallback</span>
            {!isConfirmed && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-2.5 transition-colors relative ${
              activeTab === "audit"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Audit Trail ({session.audit_logs?.length || 0})
          </button>
        </div>

        {/* TAB 1: LIVE MONITOR */}
        {activeTab === "live" && (
          <div className="space-y-5 pt-3">
            {/* 3 DISTINCT PRICES BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    1. Observed in Search
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    ${session.observed_price.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{session.currency}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Initial scraper observation</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-border">
                <CardHeader className="pb-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    2. Provider Checkout Price
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {session.provider_price ? (
                      <>
                        ${session.provider_price.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">{session.currency}</span>
                      </>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">Pending capture</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Air Canada checkout price</p>
                </CardContent>
              </Card>

              <Card className={`${isConfirmed ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30 border-border"}`}>
                <CardHeader className="pb-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    3. Final Confirmed Paid
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {session.final_amount_paid ? (
                      <>
                        ${session.final_amount_paid.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">{session.currency}</span>
                      </>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">Pending receipt</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Confirmed on ticket receipt</p>
                </CardContent>
              </Card>
            </div>

            {/* CONFIRMED DETAILS CARD */}
            {isConfirmed ? (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Booking Officially Confirmed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card p-3 rounded-xl border border-border">
                    <div>
                      <span className="text-xs text-muted-foreground block">PNR Reference</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-base font-mono font-bold text-foreground">
                          {session.confirmation_reference}
                        </span>
                        <button
                          onClick={handleCopyPnr}
                          className="text-muted-foreground hover:text-foreground p-1 rounded"
                          title="Copy PNR"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedPnr && <span className="text-[10px] text-emerald-500 font-bold">Copied!</span>}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">Carrier</span>
                      <span className="text-sm font-semibold text-foreground">{session.provider_name}</span>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">Ticket Number</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {session.ticket_number || "Issued via carrier"}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">Verified Via</span>
                      <Badge variant="outline" className="text-xs uppercase mt-0.5">
                        {session.verification_source || "Extension"}
                      </Badge>
                    </div>
                  </div>

                  {session.traveler_names && session.traveler_names.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Travelers:</span>{" "}
                      {session.traveler_names.join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* LIVE STATUS WAITING STATE */
              <Card className="border-border bg-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping"></div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Monitoring live booking progress on Air Canada...
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Complete your booking in the opened provider tab. The companion Chrome extension automatically reports confirmation details in real time.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Target URL:</span>{" "}
                      <span className="font-mono text-foreground truncate max-w-xs inline-block align-bottom">
                        {session.booking_url}
                      </span>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      className="gap-1.5 text-xs shrink-0"
                      onClick={() => window.open(session.booking_url, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Re-open Provider Tab</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* EXTENSION SETUP INFO */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-foreground">Companion Chrome Extension: Air Canada Ready</div>
                <p className="text-muted-foreground">
                  The extension source is available in <code className="font-mono text-foreground">public/flight_monitor_extension</code>.
                  Load it unpacked in <code className="font-mono text-foreground">chrome://extensions</code> to automatically monitor booking flows without entering passwords or credit cards.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL VERIFICATION FALLBACK */}
        {activeTab === "fallback" && (
          <form onSubmit={handleSubmitFallback} className="space-y-4 pt-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Manual Verification Fallback:</span> Use this form if the companion extension is not installed, or if booking was completed on an unsupported carrier website.
              </div>
            </div>

            {fbError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                {fbError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Confirmation Reference / PNR *
                </label>
                <Input
                  required
                  placeholder="e.g. AC9K7L or 2ABC4D"
                  value={fbPnr}
                  onChange={(e) => setFbPnr(e.target.value)}
                  className="font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Provider / Airline
                </label>
                <Input
                  value={fbProvider}
                  onChange={(e) => setFbProvider(e.target.value)}
                  placeholder="Air Canada, WestJet, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Actual Amount Paid (CAD) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={fbPaid}
                  onChange={(e) => setFbPaid(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  E-Ticket Number (Optional)
                </label>
                <Input
                  placeholder="e.g. 014-998823104"
                  value={fbTicket}
                  onChange={(e) => setFbTicket(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Traveler Name(s)
                </label>
                <Input
                  placeholder="e.g. Marcus Vance"
                  value={fbTraveler}
                  onChange={(e) => setFbTraveler(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  E-Ticket / Receipt Attachment URL
                </label>
                <Input
                  placeholder="e.g. /uploads/receipts/ac_eticket.pdf"
                  value={fbAttachment}
                  onChange={(e) => setFbAttachment(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Verification Notes / Discrepancies
              </label>
              <Input
                placeholder="e.g. Verified by travel assistant against email confirmation receipt."
                value={fbNotes}
                onChange={(e) => setFbNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setActiveTab("live")}>
                Cancel
              </Button>
              <Button type="submit" disabled={fbSubmitting}>
                {fbSubmitting ? "Verifying..." : "Confirm & Save Booking Record"}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="pt-3 space-y-3">
            <div className="text-xs text-muted-foreground">
              Complete history of status transitions and telemetry captured for this booking session.
            </div>

            <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-card">
              {session.audit_logs && session.audit_logs.length > 0 ? (
                session.audit_logs.map((log) => (
                  <div key={log.id} className="p-3 text-xs flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{log.event_type}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {log.source}
                        </Badge>
                      </div>
                      <pre className="text-[11px] text-muted-foreground font-mono bg-muted/40 p-1.5 rounded max-w-lg overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">No audit logs recorded yet</div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
