import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import {
  Wallet,
  Plus,
  Trash2,
  Send,
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

export default function TravelStipendPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form states
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [dailyRate, setDailyRate] = useState(90.0);
  const [totalDays, setTotalDays] = useState(5);
  const [currency, setCurrency] = useState("USD");
  const [destinationTier, setDestinationTier] = useState("Tier 1 - High Cost Metro");
  const [paymentMethod, setPaymentMethod] = useState("direct_deposit");
  const [stipendStatus, setStipendStatus] = useState<"pending" | "approved" | "disbursed">("approved");
  const [notes, setNotes] = useState("");

  const { data: stipends = [], isLoading } = useQuery({
    queryKey: ["travelStipends"],
    queryFn: travelService.getStipends,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const createStipendMutation = useMutation({
    mutationFn: travelService.createStipend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelStipends"] });
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
    setRecipientName("");
    setRecipientEmail("");
    setDailyRate(90.0);
    setTotalDays(5);
    setCurrency("USD");
    setDestinationTier("Tier 1 - High Cost Metro");
    setPaymentMethod("direct_deposit");
    setStipendStatus("approved");
    setNotes("");
    setSelectedEventId("");
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

  const filteredStipends = stipends.filter((s) => {
    if (filterStatus === "all") return true;
    return s.status === filterStatus;
  });

  const totalDisbursed = stipends
    .filter((s) => s.status === "disbursed")
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalPending = stipends
    .filter((s) => s.status !== "disbursed")
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">User Stipends & Per Diems</h1>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800">
              User Stipend for Who
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Authorize daily per-diem allowances, track traveler recipients, and manage direct deposit or corporate card disbursements.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          <span>New User Stipend</span>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Disbursed to Date</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {stipends.filter((s) => s.status === "disbursed").length} completed disbursements
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Pending / Approved Payouts</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {stipends.filter((s) => s.status !== "disbursed").length} awaiting settlement
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Active Travelers</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {stipends.length} Pilots & Crew
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Calculated by GSA / Corporate per-diem tier
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-2">Filter Status:</span>
        {["all", "disbursed", "approved", "pending"].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={filterStatus === st ? "default" : "outline"}
            onClick={() => setFilterStatus(st)}
            className="text-xs capitalize h-8"
          >
            {st}
          </Button>
        ))}
      </div>

      {/* Stipends Ledger Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span>Traveler Stipend Ledger ("Who Receives What")</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Showing {filteredStipends.length} entries
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
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
                        <span className="text-primary font-medium">Expedition: {stipend.event_title}</span>
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

      {/* Modal: New Stipend */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Stipend ("Stipend for Who")</DialogTitle>
            <DialogDescription>
              Calculate per-diem allowance and assign funds to a traveler or pilot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-xs">Associated Expedition Event (Optional)</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="">None / General Travel</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recipient Full Name</Label>
                <Input
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
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
                  placeholder="e.g. alex.rivera@zenatech.com"
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
            <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Calculated Payout:</span>
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
                {createStipendMutation.isPending ? "Creating..." : "Authorize Stipend"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
