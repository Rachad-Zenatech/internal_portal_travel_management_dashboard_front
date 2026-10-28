import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import type { BudgetLineItem } from "@/types/travel";
import {
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
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

export default function TravelBudgetPage() {
  const queryClient = useQueryClient();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [isCreateBudgetModalOpen, setIsCreateBudgetModalOpen] = useState(false);
  const [isAddLineItemModalOpen, setIsAddLineItemModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForecast, setShowForecast] = useState(false);

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

  const deleteLineItemMutation = useMutation({
    mutationFn: (itemId: string) => travelService.deleteBudgetLineItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelBudgetDetail", selectedBudgetId] });
      queryClient.invalidateQueries({ queryKey: ["travelBudgets"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId: string) => travelService.deleteBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelBudgets"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
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

  // Filtered budgets by search
  const filteredBudgets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return budgets;
    return budgets.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.department.toLowerCase().includes(q) ||
        (b.event_title && b.event_title.toLowerCase().includes(q))
    );
  }, [budgets, searchQuery]);

  return (
    <div className="space-y-6 w-full">
      {/* 1. Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Trip Budgeting</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
              Live Allocation
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Authorized trip funds, airfare allocations, pilot stipends, and incidentals. Click any row to view line items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {realtimeForecast && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForecast(!showForecast)}
              className="gap-1.5 h-9 text-xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
              <span>{showForecast ? "Hide Commitments" : "Pre-Trip Forecast"}</span>
              {showForecast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsCreateBudgetModalOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground h-9"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip Budget</span>
          </Button>
        </div>
      </div>

      {/* 2. Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground">
              Total Authorized Pool
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              ${totalAllocatedAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Across {budgets.length} trip expeditions
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground">
              Total Spent / Disbursed
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              ${totalSpentAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            {overallUtilization.toFixed(1)}% of total authorized
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-semibold text-muted-foreground">
              Remaining Balance
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ${totalRemainingAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">
            Available for incidentals & spare parts
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Pre-Trip Commitments */}
      {showForecast && realtimeForecast && (
        <Card className="border-indigo-200 dark:border-indigo-900/60 bg-muted/30 shadow-xs animate-in fade-in duration-200">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              Pre-Trip Commitments (Instant PNR Ledger)
            </CardTitle>
            <Badge className="bg-indigo-600 text-white text-xs">
              Burn Rate: {realtimeForecast.fiscal_summary.burn_rate_percent}%
            </Badge>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {realtimeForecast.recent_commitments?.slice(0, 4).map((c, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-card border border-border">
                <div className="flex justify-between items-center font-semibold text-foreground">
                  <span>{c.traveler}</span>
                  <span className="font-mono text-primary text-[11px]">{c.booking_reference}</span>
                </div>
                <div className="text-muted-foreground text-[11px] mt-0.5">{c.route} ({c.carrier})</div>
                <div className="flex justify-between items-center pt-1 mt-1 border-t border-border/50 text-[11px]">
                  <span className="text-muted-foreground">{c.booked_by}</span>
                  <strong className="text-foreground">${c.amount.toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 3. Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search budgets by title, department, or event..."
            className="pl-9 bg-card border-border h-10 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* 4. Simple, Clean Master Table */}
      <Card className="border-border shadow-xs bg-card overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading expedition budgets...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 min-w-[220px]">Budget / Expedition</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Department & Period</th>
                  <th className="py-3.5 px-4 w-32 text-right whitespace-nowrap">Allocated</th>
                  <th className="py-3.5 px-4 w-32 text-right whitespace-nowrap">Actual Spent</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Remaining & Utilization</th>
                  <th className="py-3.5 px-4 w-28">Status</th>
                  <th className="py-3.5 px-4 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBudgets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No budgets found. Click "New Trip Budget" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredBudgets.map((b) => {
                    const utilization = b.total_allocated > 0 ? (b.total_spent / b.total_allocated) * 100 : 0;
                    const remaining = (b.remaining_balance ?? (b.total_allocated - b.total_spent));

                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBudgetId(b.id)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        {/* Title */}
                        <td className="py-3.5 px-4 font-semibold text-foreground text-sm">
                          <div className="group-hover:text-primary transition-colors">
                            {b.title}
                          </div>
                          {b.event_title && (
                            <span className="text-[11px] text-muted-foreground block font-normal">
                              Event: {b.event_title}
                            </span>
                          )}
                        </td>

                        {/* Dept & FY */}
                        <td className="py-3.5 px-4 text-muted-foreground">
                          <div>{b.department}</div>
                          <span className="text-[11px] text-muted-foreground/70">FY {b.fiscal_year}</span>
                        </td>

                        {/* Allocated */}
                        <td className="py-3.5 px-4 text-right font-medium text-foreground">
                          ${b.total_allocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Spent */}
                        <td className="py-3.5 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                          ${b.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Remaining & Progress */}
                        <td className="py-3.5 px-4 w-48">
                          <div className="flex justify-between items-center text-[11px] mb-1">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-muted-foreground">{utilization.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(utilization, 100)} className="h-1.5" />
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {b.status}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBudgetId(b.id);
                            }}
                            className="h-7 text-xs text-primary font-medium hover:bg-primary/10 px-2"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 5. Click-Inside Budget Details Modal */}
      <Dialog open={!!selectedBudgetId} onOpenChange={(open) => !open && setSelectedBudgetId(null)}>
        <DialogContent className="max-w-3xl bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          {isLoadingDetail ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading budget details...</div>
          ) : selectedBudget ? (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      FY {selectedBudget.fiscal_year}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{selectedBudget.department}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteBudgetMutation.mutate(selectedBudget.id)}
                    className="h-7 text-xs px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Budget
                  </Button>
                </div>
                <DialogTitle className="text-xl font-bold text-foreground mt-1">
                  {selectedBudget.title}
                </DialogTitle>
                {selectedBudget.event_title && (
                  <DialogDescription className="text-xs text-primary font-medium">
                    Linked Event: {selectedBudget.event_title}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Pool Overview Box */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Allocated Pool</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block">
                    ${selectedBudget.total_allocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Actual Spent</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                    ${selectedBudget.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Available Balance</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    ${((selectedBudget.remaining_balance ?? (selectedBudget.total_allocated - selectedBudget.total_spent))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {selectedBudget.notes && (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg border border-border/50">
                  {selectedBudget.notes}
                </p>
              )}

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-primary" />
                    Itemized Expenses ({selectedBudget.line_items?.length || 0})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddLineItemModalOpen(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Expense Line</span>
                  </Button>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Vendor</th>
                        <th className="py-2.5 px-3 text-right">Est.</th>
                        <th className="py-2.5 px-3 text-right">Actual</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(!selectedBudget.line_items || selectedBudget.line_items.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-muted-foreground">
                            No itemized line items recorded yet. Click "Add Expense Line" above.
                          </td>
                        </tr>
                      ) : (
                        selectedBudget.line_items.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {item.category}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground max-w-[180px] truncate">
                              {item.description}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {item.vendor || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                              ${item.estimated_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              ${item.actual_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {item.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteLineItemMutation.mutate(item.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create Budget Modal */}
      <Dialog open={isCreateBudgetModalOpen} onOpenChange={setIsCreateBudgetModalOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>New Expedition Budget</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define authorized funding pool for upcoming expedition or team event.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBudget} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Budget Title</Label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. NexusCon 2026 Travel & Lodging Pool"
                className="mt-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Department</Label>
                <Input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Fiscal Year</Label>
                <Input
                  value={newFiscalYear}
                  onChange={(e) => setNewFiscalYear(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Allocated Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={newAllocated}
                  onChange={(e) => setNewAllocated(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Currency</Label>
                <Input
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Notes / Purpose</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Authorized spend constraints and guidelines..."
                className="mt-1 text-xs h-20"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateBudgetModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createBudgetMutation.isPending} className="bg-primary text-primary-foreground">
                {createBudgetMutation.isPending ? "Creating..." : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Line Item Modal */}
      <Dialog open={isAddLineItemModalOpen} onOpenChange={setIsAddLineItemModalOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Add Expense Line Item</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a flight, hotel, or stipend commitment against this budget pool.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLineItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-md border border-input bg-background"
                >
                  <option value="Flights">Flights</option>
                  <option value="Lodging">Lodging</option>
                  <option value="User Stipends">User Stipends</option>
                  <option value="Special Luggage & Freight">Special Luggage & Freight</option>
                  <option value="Ground Transport & Car Rental">Ground Transport & Car Rental</option>
                  <option value="Meals & Incidentals">Meals & Incidentals</option>
                  <option value="Special Coverage & Insurance">Special Coverage & Insurance</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-md border border-input bg-background"
                >
                  <option value="planned">Planned</option>
                  <option value="committed">Committed</option>
                  <option value="paid">Paid</option>
                  <option value="reimbursed">Reimbursed</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                required
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="e.g. Round-trip flights for drone engineering team"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Vendor / Merchant</Label>
              <Input
                value={itemVendor}
                onChange={(e) => setItemVendor(e.target.value)}
                placeholder="e.g. Air Canada, Marriott, Navan"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Estimated Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={itemEst}
                  onChange={(e) => setItemEst(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Actual Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={itemActual}
                  onChange={(e) => setItemActual(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddLineItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addLineItemMutation.isPending} className="bg-primary text-primary-foreground">
                {addLineItemMutation.isPending ? "Adding..." : "Add Line Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
