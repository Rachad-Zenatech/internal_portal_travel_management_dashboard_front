import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import type { BudgetLineItem } from "@/types/travel";
import {
  DollarSign,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  Plane,
  Building,
  Shield,
  Package,
  Crosshair,
  Coffee,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORY_ICONS: Record<string, any> = {
  Flights: Plane,
  Lodging: Building,
  "User Stipends": DollarSign,
  "Special Luggage & Freight": Package,
  "Special Coverage & Insurance": Shield,
  "Play-Fight Equipment & Parts": Crosshair,
  "Ground Transport & Car Rental": CreditCard,
  "Meals & Incidentals": Coffee,
};

export default function TravelBudgetPage() {
  const queryClient = useQueryClient();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [isCreateBudgetModalOpen, setIsCreateBudgetModalOpen] = useState(false);
  const [isAddLineItemModalOpen, setIsAddLineItemModalOpen] = useState(false);

  // Form for new budget
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("Aviation & Robotics");
  const [newFiscalYear, setNewFiscalYear] = useState("2026");
  const [newAllocated, setNewAllocated] = useState(25000);
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newNotes, setNewNotes] = useState("");

  // Form for new line item
  const [itemCategory, setItemCategory] = useState("Flights");
  const [itemDesc, setItemDesc] = useState("");
  const [itemEst, setItemEst] = useState(1000);
  const [itemActual, setItemActual] = useState(1000);
  const [itemVendor, setItemVendor] = useState("");
  const [itemStatus, setItemStatus] = useState<"planned" | "committed" | "paid" | "reimbursed">("paid");

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["travelBudgets"],
    queryFn: travelService.getBudgets,
  });

  const { data: realtimeForecast } = useQuery({
    queryKey: ["travelRealtimeForecast"],
    queryFn: travelService.getRealtimeBudgetForecast,
  });

  const { data: selectedBudget, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["travelBudgetDetail", selectedBudgetId],
    queryFn: () => (selectedBudgetId ? travelService.getBudget(selectedBudgetId) : null),
    enabled: !!selectedBudgetId,
  });

  const createBudgetMutation = useMutation({
    mutationFn: travelService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelBudgets"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsCreateBudgetModalOpen(false);
      resetBudgetForm();
    },
  });

  const addLineItemMutation = useMutation({
    mutationFn: ({ budgetId, data }: { budgetId: string; data: Partial<BudgetLineItem> }) =>
      travelService.addBudgetLineItem(budgetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelBudgetDetail", selectedBudgetId] });
      queryClient.invalidateQueries({ queryKey: ["travelBudgets"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsAddLineItemModalOpen(false);
      resetLineItemForm();
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: travelService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelBudgets"] });
      setSelectedBudgetId(null);
    },
  });

  const resetBudgetForm = () => {
    setNewTitle("");
    setNewDept("Aviation & Robotics");
    setNewFiscalYear("2026");
    setNewAllocated(25000);
    setNewCurrency("USD");
    setNewNotes("");
  };

  const resetLineItemForm = () => {
    setItemCategory("Flights");
    setItemDesc("");
    setItemEst(1000);
    setItemActual(1000);
    setItemVendor("");
    setItemStatus("paid");
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    createBudgetMutation.mutate({
      title: newTitle,
      department: newDept,
      fiscal_year: newFiscalYear,
      total_allocated: Number(newAllocated),
      currency: newCurrency,
      status: "approved",
      notes: newNotes,
    });
  };

  const handleAddLineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudgetId) return;
    addLineItemMutation.mutate({
      budgetId: selectedBudgetId,
      data: {
        category: itemCategory,
        description: itemDesc,
        estimated_amount: Number(itemEst),
        actual_amount: Number(itemActual),
        vendor: itemVendor,
        status: itemStatus,
      },
    });
  };

  // Aggregate totals
  const totalAllocatedAll = budgets.reduce((acc, b) => acc + (b.total_allocated || 0), 0);
  const totalSpentAll = budgets.reduce((acc, b) => acc + (b.total_spent || 0), 0);
  const totalRemainingAll = totalAllocatedAll - totalSpentAll;
  const overallUtilization = totalAllocatedAll > 0 ? (totalSpentAll / totalAllocatedAll) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Expedition & Travel Budgeting</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
              Live Allocation
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track authorized trip funds, pilot stipends, airfare, oversized cargo fees, and equipment repair budgets.
          </p>
        </div>
        <Button onClick={() => setIsCreateBudgetModalOpen(true)} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          <span>New Trip Budget</span>
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Allocated</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              ${totalAllocatedAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Across {budgets.length} trip expeditions
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Spent / Disbursed</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${totalSpentAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {overallUtilization.toFixed(1)}% of total authorized
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Remaining Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalRemainingAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Available for incidentals & spare parts
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Budget Health</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Within Target</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={Math.min(overallUtilization, 100)} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Pre-Trip Commit & Expense Forecast ("Track budget in real time, not just after the fact") */}
      {realtimeForecast && (
        <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/50 via-card to-card dark:from-indigo-950/20 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Live Pre-Trip Commit & Real-Time Spend Forecast
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tracks committed flights, hotel blocks, and rental car reservations before post-facto expense reports are filed.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-indigo-600 text-white text-xs w-fit">
                Burn Rate: {realtimeForecast.fiscal_summary.burn_rate_percent}%
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[11px] text-muted-foreground block font-medium">VIP Executive EA Spend (Vanessa)</span>
                <span className="text-lg font-bold text-foreground">
                  ${realtimeForecast.breakdown_by_routing_tier.executive_ea_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">Air Canada Business Pods & Luxury Hotels</span>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[11px] text-muted-foreground block font-medium">Central Travel Department (Pat)</span>
                <span className="text-lg font-bold text-foreground">
                  ${realtimeForecast.breakdown_by_routing_tier.central_travel_dept_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block mt-0.5">Engineering crews & field rotation</span>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[11px] text-muted-foreground block font-medium">Trade Shows & Drone Freight</span>
                <span className="text-lg font-bold text-foreground">
                  ${realtimeForecast.breakdown_by_routing_tier.trade_shows_and_gear_spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">Pelican cases, LiPo compliance & carnet</span>
              </div>
            </div>

            {realtimeForecast.recent_commitments && realtimeForecast.recent_commitments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="font-semibold text-foreground text-[11px] block">
                  Recent Live Pre-Trip Commitments (Instant PNR Ledger):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {realtimeForecast.recent_commitments.slice(0, 4).map((c, i) => (
                    <div key={i} className="p-2 rounded-md bg-muted/40 border border-border/50 text-[11px]">
                      <div className="flex justify-between items-center font-semibold text-foreground">
                        <span>{c.traveler}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{c.booking_reference}</span>
                      </div>
                      <div className="text-muted-foreground">{c.route} ({c.carrier})</div>
                      <div className="flex justify-between items-center pt-1 text-[10px]">
                        <span className="text-muted-foreground">By {c.booked_by}</span>
                        <strong className="text-foreground">${c.amount.toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Budget Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budgets List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Expedition Budgets ({budgets.length})
          </h2>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading budgets...</div>
          ) : budgets.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No budgets recorded yet. Click "New Trip Budget" to create one.
            </Card>
          ) : (
            budgets.map((b) => {
              const isSelected = selectedBudgetId === b.id || (!selectedBudgetId && budgets[0]?.id === b.id);
              if (!selectedBudgetId && budgets[0]?.id === b.id) {
                setSelectedBudgetId(b.id);
              }
              const utilization = b.total_allocated > 0 ? (b.total_spent / b.total_allocated) * 100 : 0;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBudgetId(b.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-border hover:border-border/80 hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">{b.department}</span>
                    <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-300">
                      {b.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-2">{b.title}</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Spent: ${(b.total_spent || 0).toLocaleString()}</span>
                      <span className="font-medium text-foreground">
                        Allocated: ${(b.total_allocated || 0).toLocaleString()}
                      </span>
                    </div>
                    <Progress value={Math.min(utilization, 100)} className="h-1.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Budget Details & Line Items */}
        <div className="lg:col-span-2">
          {isLoadingDetail ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Loading budget line items...</Card>
          ) : selectedBudget ? (
            <div className="space-y-6">
              {/* Detail Card Header */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          FY {selectedBudget.fiscal_year}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{selectedBudget.department}</span>
                      </div>
                      <CardTitle className="text-xl font-bold">{selectedBudget.title}</CardTitle>
                      {selectedBudget.event_title && (
                        <CardDescription className="text-xs mt-0.5 text-primary">
                          Event: {selectedBudget.event_title}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddLineItemModalOpen(true)}
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Line Item</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteBudgetMutation.mutate(selectedBudget.id)}
                        className="text-xs px-2.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-3 bg-accent/40 rounded-lg text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Allocated Pool</span>
                      <span className="text-sm font-bold text-foreground">
                        ${selectedBudget.total_allocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Actual Spent</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        ${selectedBudget.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Available Balance</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ${((selectedBudget.remaining_balance ?? (selectedBudget.total_allocated - selectedBudget.total_spent))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  {selectedBudget.notes && (
                    <p className="text-xs text-muted-foreground">{selectedBudget.notes}</p>
                  )}
                </CardContent>
              </Card>

              {/* Line Items Table */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      <span>Itemized Expenses & Commitments</span>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {selectedBudget.line_items?.length || 0} line items
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {(!selectedBudget.line_items || selectedBudget.line_items.length === 0) ? (
                    <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                      No expense line items added. Click "Add Line Item" to enter flights, lodging, or equipment fees.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {selectedBudget.line_items.map((item) => {
                        const Icon = CATEGORY_ICONS[item.category] || Receipt;
                        return (
                          <div
                            key={item.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">
                                    {item.category}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={
                                      item.status === "paid"
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                        : "bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800"
                                    }
                                  >
                                    {item.status}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mt-0.5">{item.description}</p>
                                {item.vendor && (
                                  <span className="text-[11px] text-muted-foreground/80">Vendor: {item.vendor}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right sm:self-center shrink-0">
                              <span className="font-bold text-foreground text-sm block">
                                ${(item.actual_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Est: ${(item.estimated_amount || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              Select an expedition budget on the left to examine expense items and allocations.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Create Budget */}
      <Dialog open={isCreateBudgetModalOpen} onOpenChange={setIsCreateBudgetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Expedition Budget</DialogTitle>
            <DialogDescription>
              Allocate financial envelope for a travel trip, drone tournament, or logistics deployment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBudget} className="space-y-4">
            <div>
              <Label className="text-xs">Budget Title</Label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Las Vegas Drone Combat Budget"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Department</Label>
                <Input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Aviation & Robotics"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Fiscal Year</Label>
                <Input
                  value={newFiscalYear}
                  onChange={(e) => setNewFiscalYear(e.target.value)}
                  placeholder="2026"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Total Allocated ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={newAllocated}
                  onChange={(e) => setNewAllocated(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Input
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  placeholder="USD"
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes / Budget Justification</Label>
              <Textarea
                rows={3}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Budget scope, cost centers, and expenditure targets..."
                className="text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateBudgetModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={createBudgetMutation.isPending} className="text-xs">
                {createBudgetMutation.isPending ? "Creating..." : "Save Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Line Item */}
      <Dialog open={isAddLineItemModalOpen} onOpenChange={setIsAddLineItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense Line Item</DialogTitle>
            <DialogDescription>
              Record an itemized expense or planned cost under this budget.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLineItem} className="space-y-4">
            <div>
              <Label className="text-xs">Expense Category</Label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="Flights">Flights</option>
                <option value="Lodging">Lodging</option>
                <option value="User Stipends">User Stipends</option>
                <option value="Special Luggage & Freight">Special Luggage & Freight</option>
                <option value="Special Coverage & Insurance">Special Coverage & Insurance</option>
                <option value="Play-Fight Equipment & Parts">Play-Fight Equipment & Parts</option>
                <option value="Ground Transport & Car Rental">Ground Transport & Car Rental</option>
                <option value="Meals & Incidentals">Meals & Incidentals</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                required
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="e.g. Round-trip flights for pilots"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Estimated ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemEst}
                  onChange={(e) => setItemEst(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Actual Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={itemActual}
                  onChange={(e) => setItemActual(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vendor / Merchant</Label>
                <Input
                  value={itemVendor}
                  onChange={(e) => setItemVendor(e.target.value)}
                  placeholder="e.g. Delta Airlines"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="paid">Paid</option>
                  <option value="committed">Committed</option>
                  <option value="planned">Planned</option>
                  <option value="reimbursed">Reimbursed</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddLineItemModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={addLineItemMutation.isPending} className="text-xs">
                {addLineItemMutation.isPending ? "Adding..." : "Add Line Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
