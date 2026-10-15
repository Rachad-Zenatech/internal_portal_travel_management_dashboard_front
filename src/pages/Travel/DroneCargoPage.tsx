import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import {
  Package,
  Crosshair,
  Shield,
  CheckCircle2,
  Plus,
  Trash2,
  Zap,
  PhoneCall,
  FileCheck2,
  Barcode,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DroneCargoPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("luggage");

  // Modals
  const [isLuggageModalOpen, setIsLuggageModalOpen] = useState(false);
  const [isGearModalOpen, setIsGearModalOpen] = useState(false);
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);

  // Queries
  const { data: luggageList = [], isLoading: isLoadingLuggage } = useQuery({
    queryKey: ["specialLuggage"],
    queryFn: travelService.getSpecialLuggage,
  });

  const { data: eventsList = [] } = useQuery({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  const { data: gearList = [], isLoading: isLoadingGear } = useQuery({
    queryKey: ["droneGear"],
    queryFn: travelService.getDroneGear,
  });

  const { data: coverageList = [], isLoading: isLoadingCoverage } = useQuery({
    queryKey: ["specialCoverages"],
    queryFn: travelService.getSpecialCoverages,
  });

  // Luggage Filter & Form
  const [filterEventId, setFilterEventId] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [caseCode, setCaseCode] = useState("");

  const displayedLuggageList = filterEventId === "all"
    ? luggageList
    : filterEventId === "unassigned"
    ? luggageList.filter((l) => !l.event_id)
    : luggageList.filter((l) => l.event_id === filterEventId);
  const [caseName, setCaseName] = useState("");
  const [luggageClass, setLuggageClass] = useState("oversized_hard_case");
  const [airline, setAirline] = useState("Delta Air Lines");
  const [bagTag, setBagTag] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [dimensions, setDimensions] = useState("75 x 48 x 32");
  const [weightKg, setWeightKg] = useState(21.5);
  const [excessFee, setExcessFee] = useState(0.0);
  const [isIata, setIsIata] = useState(true);
  const [carnet, setCarnet] = useState("");
  const [custodian, setCustodian] = useState("");
  const [handlingNote, setHandlingNote] = useState("");

  // Gear Form
  const [gearName, setGearName] = useState("");
  const [gearCategory, setGearCategory] = useState("combat_drone");
  const [modelSku, setModelSku] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [readiness, setReadiness] = useState<"combat_ready" | "needs_prop_replacement" | "spare_reserve">("combat_ready");
  const [gearWeight, setGearWeight] = useState(0.85);
  const [isHazmat, setIsHazmat] = useState(false);
  const [lipoWh, setLipoWh] = useState(0.0);
  const [assignedPilot, setAssignedPilot] = useState("");
  const [selectedLuggageId, setSelectedLuggageId] = useState("");
  const [gearNotes, setGearNotes] = useState("");

  // Coverage Form
  const [policyTitle, setPolicyTitle] = useState("");
  const [coverageType, setCoverageType] = useState("play_fight_arena_liability");
  const [insurerName, setInsurerName] = useState("SkyGuard Aero Underwriters");
  const [policyNo, setPolicyNo] = useState("");
  const [coverageLimit, setCoverageLimit] = useState(250000);
  const [deductible, setDeductible] = useState(750);
  const [premium, setPremium] = useState(1280);
  const [covStart, setCovStart] = useState("");
  const [covEnd, setCovEnd] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("+1 (800) 555-0199");
  const [covNotes, setCovNotes] = useState("");

  // Mutations
  const createLuggageMutation = useMutation({
    mutationFn: travelService.createSpecialLuggage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialLuggage"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsLuggageModalOpen(false);
      resetLuggageForm();
    },
  });

  const deleteLuggageMutation = useMutation({
    mutationFn: travelService.deleteSpecialLuggage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialLuggage"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
    },
  });

  const createGearMutation = useMutation({
    mutationFn: travelService.createDroneGear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["droneGear"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsGearModalOpen(false);
      resetGearForm();
    },
  });

  const deleteGearMutation = useMutation({
    mutationFn: travelService.deleteDroneGear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["droneGear"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
    },
  });

  const createCoverageMutation = useMutation({
    mutationFn: travelService.createSpecialCoverage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialCoverages"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
      setIsCoverageModalOpen(false);
      resetCoverageForm();
    },
  });

  const deleteCoverageMutation = useMutation({
    mutationFn: travelService.deleteSpecialCoverage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialCoverages"] });
      queryClient.invalidateQueries({ queryKey: ["travelDashboardSummary"] });
    },
  });

  const resetLuggageForm = () => {
    setSelectedEventId("");
    setCaseCode("");
    setCaseName("");
    setLuggageClass("oversized_hard_case");
    setAirline("Delta Air Lines");
    setBagTag("");
    setTrackingNo("");
    setDimensions("75 x 48 x 32");
    setWeightKg(21.5);
    setExcessFee(0.0);
    setIsIata(true);
    setCarnet("");
    setCustodian("");
    setHandlingNote("");
  };

  const resetGearForm = () => {
    setGearName("");
    setGearCategory("combat_drone");
    setModelSku("");
    setSerialNo("");
    setQuantity(1);
    setReadiness("combat_ready");
    setGearWeight(0.85);
    setIsHazmat(false);
    setLipoWh(0.0);
    setAssignedPilot("");
    setSelectedLuggageId("");
    setGearNotes("");
  };

  const resetCoverageForm = () => {
    setPolicyTitle("");
    setCoverageType("play_fight_arena_liability");
    setInsurerName("SkyGuard Aero Underwriters");
    setPolicyNo("");
    setCoverageLimit(250000);
    setDeductible(750);
    setPremium(1280);
    setCovStart("");
    setCovEnd("");
    setEmergencyPhone("+1 (800) 555-0199");
    setCovNotes("");
  };

  const handleCreateLuggage = (e: React.FormEvent) => {
    e.preventDefault();
    createLuggageMutation.mutate({
      event_id: selectedEventId || null,
      case_code: caseCode,
      case_name: caseName,
      luggage_classification: luggageClass,
      carrier_airline: airline,
      baggage_tag_number: bagTag,
      tracking_number: trackingNo,
      dimensions_cm: dimensions,
      gross_weight_kg: Number(weightKg),
      max_airline_allowance_kg: 23.0,
      excess_baggage_fee: Number(excessFee),
      iata_lipo_compliant: isIata,
      carnet_customs_declaration: carnet,
      custodian_name: custodian,
      status: "packed",
      handling_instructions: handlingNote,
    });
  };

  const handleCreateGear = (e: React.FormEvent) => {
    e.preventDefault();
    createGearMutation.mutate({
      name: gearName,
      gear_category: gearCategory,
      model_sku: modelSku,
      serial_number: serialNo,
      quantity: Number(quantity),
      combat_readiness_status: readiness as any,
      weight_kg: Number(gearWeight),
      is_hazmat_battery: isHazmat,
      lipo_wh_rating: Number(lipoWh),
      assigned_pilot_or_custodian: assignedPilot,
      luggage_manifest_id: selectedLuggageId || undefined,
      notes: gearNotes,
    });
  };

  const handleCreateCoverage = (e: React.FormEvent) => {
    e.preventDefault();
    createCoverageMutation.mutate({
      policy_title: policyTitle,
      coverage_type: coverageType,
      insurer_name: insurerName,
      policy_number: policyNo,
      coverage_limit: Number(coverageLimit),
      deductible: Number(deductible),
      premium_paid: Number(premium),
      currency: "USD",
      start_date: covStart,
      end_date: covEnd,
      status: "active",
      emergency_claims_contact: emergencyPhone,
      notes: covNotes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Drone Combat, Cargo & Special Coverage
            </h1>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800">
              Combat Logistics
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Pelican hard cases, Hazmat LiPo battery compliance, play-fight combat drones, and arena liability coverage policies.
          </p>
        </div>
      </div>

      {/* Primary Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="luggage" className="gap-2 text-xs">
              <Package className="w-3.5 h-3.5" />
              <span>Special Luggage ({luggageList.length})</span>
            </TabsTrigger>
            <TabsTrigger value="gear" className="gap-2 text-xs">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Play-Fight Gear ({gearList.length})</span>
            </TabsTrigger>
            <TabsTrigger value="coverage" className="gap-2 text-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>Special Coverage ({coverageList.length})</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "luggage" && (
            <Button onClick={() => setIsLuggageModalOpen(true)} className="gap-2 text-xs">
              <Plus className="w-4 h-4" />
              <span>New Pelican / Luggage Case</span>
            </Button>
          )}
          {activeTab === "gear" && (
            <Button onClick={() => setIsGearModalOpen(true)} className="gap-2 text-xs">
              <Plus className="w-4 h-4" />
              <span>Add Combat Drone / Gear</span>
            </Button>
          )}
          {activeTab === "coverage" && (
            <Button onClick={() => setIsCoverageModalOpen(true)} className="gap-2 text-xs">
              <Plus className="w-4 h-4" />
              <span>Add Insurance Policy</span>
            </Button>
          )}
        </div>

        {/* TAB 1: SPECIAL LUGGAGE MANIFESTS */}
        <TabsContent value="luggage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Tracked Hard Cases</CardDescription>
                <CardTitle className="text-2xl font-bold">{luggageList.length} Pelican Cases</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                All cases registered for air freight
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Gross Cargo Weight</CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {luggageList.reduce((acc, l) => acc + (l.gross_weight_kg || 0), 0).toFixed(1)} kg
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                Max airline allowance: 23.0 kg per case
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">LiPo Hazmat Compliance</CardDescription>
                <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>IATA DGR Section II</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground pt-0">
                Sub-100Wh packs in fireproof vaults
              </CardContent>
            </Card>
          </div>

          {/* Event Filter & Counts */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Filter by Event:</span>
              <select
                value={filterEventId}
                onChange={(e) => setFilterEventId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="all">All Events ({luggageList.length})</option>
                <option value="unassigned">Unassigned ({luggageList.filter((l) => !l.event_id).length})</option>
                {eventsList.map((ev) => {
                  const cnt = luggageList.filter((l) => l.event_id === ev.id).length;
                  return (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({cnt})
                    </option>
                  );
                })}
              </select>
            </div>
            {filterEventId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterEventId("all")}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingLuggage ? (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
                Loading luggage manifests...
              </div>
            ) : luggageList.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No luggage cases registered. Click "New Pelican / Luggage Case" to add one.
              </div>
            ) : displayedLuggageList.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No cases found for the selected event filter.
              </div>
            ) : (
              displayedLuggageList.map((caseItem) => (
                <Card key={caseItem.id} className="border-border relative flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground font-semibold">
                        {caseItem.case_code}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          caseItem.status === "delivered_at_venue"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                            : "bg-blue-500/10 text-blue-600 border-blue-300"
                        }
                      >
                        {caseItem.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-1 line-clamp-1">
                      {caseItem.case_name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {caseItem.carrier_airline} • {caseItem.dimensions_cm} cm
                    </CardDescription>
                    {caseItem.event_title ? (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-1.5 bg-primary/10 px-2 py-1 rounded border border-primary/20">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{caseItem.event_title}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5 bg-muted/40 px-2 py-0.5 rounded">
                        <Calendar className="w-3 h-3 shrink-0 opacity-40" />
                        <span className="italic">Unassigned to Event</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="text-xs space-y-2 pt-0 pb-3">
                    <div className="p-2.5 bg-accent/40 rounded-lg space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Weight:</span>
                        <span className={`font-semibold ${caseItem.gross_weight_kg > 23.0 ? "text-amber-500" : "text-foreground"}`}>
                          {caseItem.gross_weight_kg} kg / {caseItem.max_airline_allowance_kg} kg max
                        </span>
                      </div>
                      {caseItem.excess_baggage_fee > 0 && (
                        <div className="flex justify-between text-amber-600 dark:text-amber-400">
                          <span>Overweight Fee:</span>
                          <span className="font-semibold">${caseItem.excess_baggage_fee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custodian:</span>
                        <span className="font-medium text-foreground">{caseItem.custodian_name}</span>
                      </div>
                    </div>

                    {caseItem.baggage_tag_number && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Barcode className="w-3.5 h-3.5 text-primary" />
                        <span>Tag: {caseItem.baggage_tag_number}</span>
                      </div>
                    )}
                    {caseItem.carnet_customs_declaration && (
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Carnet: {caseItem.carnet_customs_declaration}</span>
                      </div>
                    )}
                    {caseItem.handling_instructions && (
                      <p className="text-[11px] text-muted-foreground/80 line-clamp-2">
                        {caseItem.handling_instructions}
                      </p>
                    )}
                  </CardContent>

                  <div className="p-3 pt-0 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {caseItem.iata_lipo_compliant ? "✓ IATA Compliant" : "Standard Baggage"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLuggageMutation.mutate(caseItem.id)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 2: PLAY-FIGHT DRONE GEAR */}
        <TabsContent value="gear" className="space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-rose-500" />
                    <span>Drone Combat & Play-Fight Arsenal</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Combat quads, laser hit-detection target packs, protective Kevlar netting, and FPV pilot gear.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {gearList.filter((g) => g.combat_readiness_status === "combat_ready").length} Ready for Combat
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingGear ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading gear...</div>
              ) : gearList.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                  No gear items added yet. Click "Add Combat Drone / Gear" to register equipment.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {gearList.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{item.name}</span>
                          <Badge
                            variant="outline"
                            className={
                              item.combat_readiness_status === "combat_ready"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                : "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800"
                            }
                          >
                            {item.combat_readiness_status.replace("_", " ").toUpperCase()}
                          </Badge>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                            {item.gear_category.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.model_sku && <span>SKU: {item.model_sku}</span>}
                          {item.serial_number && <span>SN: {item.serial_number}</span>}
                          <span>Qty: {item.quantity}</span>
                          <span>Weight: {item.weight_kg} kg</span>
                          {item.is_hazmat_battery && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              LiPo {item.lipo_wh_rating} Wh
                            </span>
                          )}
                        </div>
                        {item.assigned_pilot_or_custodian && (
                          <div className="text-[11px] text-primary">
                            Assigned Pilot / Custodian: {item.assigned_pilot_or_custodian}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        {item.case_code && (
                          <Badge variant="outline" className="font-mono text-[11px] bg-primary/5">
                            In {item.case_code}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteGearMutation.mutate(item.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SPECIAL COVERAGE & INSURANCE */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingCoverage ? (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
                Loading coverage policies...
              </div>
            ) : coverageList.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No active insurance policies registered. Click "Add Insurance Policy" to add one.
              </div>
            ) : (
              coverageList.map((policy) => (
                <Card key={policy.id} className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-300">
                          {policy.status.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {policy.policy_number}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold mt-1">{policy.policy_title}</CardTitle>
                    <CardDescription className="text-xs">
                      Underwriter: {policy.insurer_name}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="text-xs space-y-3 pt-0">
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-accent/40 rounded-lg">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Coverage Limit</span>
                        <span className="font-bold text-foreground">
                          ${(policy.coverage_limit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Deductible</span>
                        <span className="font-bold text-foreground">
                          ${(policy.deductible || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Premium</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ${(policy.premium_paid || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-muted-foreground">
                      <div>
                        Active Window: {policy.start_date} → {policy.end_date}
                      </div>
                      {policy.emergency_claims_contact && (
                        <div className="flex items-center gap-1.5 text-foreground font-medium pt-1">
                          <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                          <span>Claims Hotline: {policy.emergency_claims_contact}</span>
                        </div>
                      )}
                      {policy.notes && <p className="text-[11px] pt-1">{policy.notes}</p>}
                    </div>
                  </CardContent>

                  <div className="p-3 pt-0 border-t border-border/50 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCoverageMutation.mutate(policy.id)}
                      className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: New Pelican Luggage Case */}
      <Dialog open={isLuggageModalOpen} onOpenChange={setIsLuggageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Special Luggage Hard Case</DialogTitle>
            <DialogDescription>
              Register Pelican case, LiPo hazmat container, or oversized equipment trunk for airline transport.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLuggage} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Assign to Travel Event</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs mt-1"
              >
                <option value="">-- No Event Assigned (General Freight) --</option>
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.location} • {ev.start_date})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Assigns this Pelican luggage case directly to an official travel event.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Case Code / ID</Label>
                <Input
                  required
                  value={caseCode}
                  onChange={(e) => setCaseCode(e.target.value)}
                  placeholder="PELICAN-AIR-1615-02"
                  className="text-xs uppercase font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Case Name / Content</Label>
                <Input
                  required
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="Combat Drones & Transmitter"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Classification</Label>
                <select
                  value={luggageClass}
                  onChange={(e) => setLuggageClass(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="oversized_hard_case">Oversized Pelican Hard Case</option>
                  <option value="lipo_fireproof_vault">LiPo Fireproof Vault (Hazmat)</option>
                  <option value="arena_hardware_crate">Arena Netting & Pits Crate</option>
                  <option value="precision_optics_trunk">FPV Optics & Goggles Trunk</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Airline Carrier</Label>
                <Input
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                  placeholder="Delta Air Lines"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Gross Wt (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Excess Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={excessFee}
                  onChange={(e) => setExcessFee(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Dimensions (cm)</Label>
                <Input
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="75 x 48 x 32"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Custodian Name</Label>
                <Input
                  required
                  value={custodian}
                  onChange={(e) => setCustodian(e.target.value)}
                  placeholder="e.g. Equipment Custodian"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Customs Carnet #</Label>
                <Input
                  value={carnet}
                  onChange={(e) => setCarnet(e.target.value)}
                  placeholder="US-CARNET-2026-8812"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Handling Instructions</Label>
              <Input
                value={handlingNote}
                onChange={(e) => setHandlingNote(e.target.value)}
                placeholder="Fragile carbon-fiber frames; storage voltage 3.82V/cell"
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLuggageModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={createLuggageMutation.isPending} className="text-xs">
                {createLuggageMutation.isPending ? "Creating..." : "Save Case Manifest"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: New Drone Gear */}
      <Dialog open={isGearModalOpen} onOpenChange={setIsGearModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Drone Combat / Play-Fight Equipment</DialogTitle>
            <DialogDescription>
              Register combat quad units, hit-detection systems, or arena safety gear.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGear} className="space-y-4">
            <div>
              <Label className="text-xs">Equipment Name</Label>
              <Input
                required
                value={gearName}
                onChange={(e) => setGearName(e.target.value)}
                placeholder="e.g. Falcon-X Combat Quad V4"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  value={gearCategory}
                  onChange={(e) => setGearCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="combat_drone">Combat Drone (Play Fight)</option>
                  <option value="fpv_equipment">FPV Goggles / Video Rx</option>
                  <option value="radio_telemetry">Radio Transmitter / ELRS</option>
                  <option value="hit_sensor_combat_kit">Laser Hit Scoring Sensor</option>
                  <option value="lipo_battery_bank">LiPo Flight Battery Bank</option>
                  <option value="arena_protective_gear">Arena Kevlar Netting & Barrier</option>
                  <option value="pit_repair_tools">Pit Field Repair Tools</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Combat Readiness</Label>
                <select
                  value={readiness}
                  onChange={(e) => setReadiness(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="combat_ready">Combat Ready</option>
                  <option value="needs_prop_replacement">Needs Prop Replacement</option>
                  <option value="spare_reserve">Spare Reserve</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Serial Number</Label>
                <Input
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="SN-DRN-2026-004"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={gearWeight}
                  onChange={(e) => setGearWeight(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Assigned Pilot / Handler</Label>
                <Input
                  value={assignedPilot}
                  onChange={(e) => setAssignedPilot(e.target.value)}
                  placeholder="e.g. Lead Pilot / Handler"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Pack in Luggage Case</Label>
                <select
                  value={selectedLuggageId}
                  onChange={(e) => setSelectedLuggageId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="">Unassigned</option>
                  {luggageList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.case_code} ({l.case_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGearModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={createGearMutation.isPending} className="text-xs">
                {createGearMutation.isPending ? "Creating..." : "Save Equipment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: New Coverage Policy */}
      <Dialog open={isCoverageModalOpen} onOpenChange={setIsCoverageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Special Coverage & Insurance</DialogTitle>
            <DialogDescription>
              Record high-risk aerial combat liability, crash hull protection, and hazardous freight coverage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCoverage} className="space-y-4">
            <div>
              <Label className="text-xs">Policy Title</Label>
              <Input
                required
                value={policyTitle}
                onChange={(e) => setPolicyTitle(e.target.value)}
                placeholder="e.g. Arena Play-Fight Combat Shield"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Insurer / Underwriter</Label>
                <Input
                  required
                  value={insurerName}
                  onChange={(e) => setInsurerName(e.target.value)}
                  placeholder="SkyGuard Aero Underwriters"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Policy Number</Label>
                <Input
                  required
                  value={policyNo}
                  onChange={(e) => setPolicyNo(e.target.value)}
                  placeholder="SG-AERO-2026-9042"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Coverage Limit ($)</Label>
                <Input
                  type="number"
                  step="1000"
                  value={coverageLimit}
                  onChange={(e) => setCoverageLimit(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Deductible ($)</Label>
                <Input
                  type="number"
                  step="100"
                  value={deductible}
                  onChange={(e) => setDeductible(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Premium ($)</Label>
                <Input
                  type="number"
                  step="100"
                  value={premium}
                  onChange={(e) => setPremium(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coverage Start Date</Label>
                <Input
                  type="date"
                  required
                  value={covStart}
                  onChange={(e) => setCovStart(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Coverage End Date</Label>
                <Input
                  type="date"
                  required
                  value={covEnd}
                  onChange={(e) => setCovEnd(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">24/7 Emergency Claims Hotline</Label>
              <Input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+1 (800) 555-0199"
                className="text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCoverageModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={createCoverageMutation.isPending} className="text-xs">
                {createCoverageMutation.isPending ? "Creating..." : "Save Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
