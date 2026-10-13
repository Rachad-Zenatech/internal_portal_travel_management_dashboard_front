import { useState, useEffect } from "react";
import {
  Crown,
  Plane,
  Building2,
  Car,
  User,
  Plus,
  Clock,
  Award,
} from "lucide-react";
import { travelService } from "@/services/travelService";
import type { ExecutiveProfile } from "@/types/travel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ExecutiveProfilesPage() {
  const [executives, setExecutives] = useState<ExecutiveProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState<boolean>(false);
  const [targetExecForLoyalty, setTargetExecForLoyalty] = useState<ExecutiveProfile | null>(null);

  // New Exec Form
  const [newExecName, setNewExecName] = useState("");
  const [newExecEmail, setNewExecEmail] = useState("");
  const [newExecTitle, setNewExecTitle] = useState("");
  const [newExecEa, setNewExecEa] = useState("Vanessa");
  const [newExecAirlines, setNewExecAirlines] = useState("Air Canada, Delta");
  const [newExecSeat, setNewExecSeat] = useState("Business Class (Row 1-2 Aisle)");
  const [newExecHotels, setNewExecHotels] = useState("Marriott Bonvoy, Four Seasons");
  const [newExecCars, setNewExecCars] = useState("Hertz President's Circle SUV");

  // New Loyalty Form
  const [programName, setProgramName] = useState("Air Canada Aeroplan");
  const [accountNumber, setAccountNumber] = useState("");
  const [tierStatus, setTierStatus] = useState("Super Elite 100K");
  const [pointsBalance, setPointsBalance] = useState<number>(100000);
  const [perksSummary, setPerksSummary] = useState("Concierge priority, Maple Leaf lounge access, 3x 70lb bags");

  useEffect(() => {
    loadExecutives();
  }, []);

  const loadExecutives = async () => {
    try {
      const res = await travelService.getExecutives();
      if (res && Array.isArray(res)) {
        setExecutives(res);
      }
    } catch (err) {
      console.error("Failed to load executive profiles", err);
    }
  };

  const handleCreateExec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExecName.trim() || !newExecEmail.trim()) return;

    try {
      await travelService.createExecutive({
        name: newExecName,
        email: newExecEmail,
        title: newExecTitle,
        assigned_ea_name: newExecEa,
        assigned_ea_email: `${newExecEa.toLowerCase()}@zenatech.com`,
        preferred_airlines: newExecAirlines,
        preferred_seat_class: newExecSeat,
        preferred_hotel_chains: newExecHotels,
        preferred_car_rental: newExecCars,
        home_time_zone: "America/Toronto",
      });
      setShowAddModal(false);
      loadExecutives();
    } catch (err) {
      console.error("Failed to create executive", err);
    }
  };

  const handleAddLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExecForLoyalty || !accountNumber.trim()) return;

    try {
      await travelService.addLoyaltyProgram(targetExecForLoyalty.id, {
        program_name: programName,
        account_number: accountNumber,
        tier_status: tierStatus,
        points_balance: pointsBalance,
        perks_summary: perksSummary,
      });
      setShowLoyaltyModal(false);
      loadExecutives();
    } catch (err) {
      console.error("Failed to add loyalty program", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Crown className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Executive Travel Profiles & Loyalty Vault
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Centralized preferences, assigned Executive Assistants (Vanessa, Pat), and frequent flyer / hotel loyalty perks
            for Zenatech executives (CEO, Sajjad, Jim, Simon, Phil, Linda).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 h-9"
          >
            <Plus className="w-4 h-4" />
            <span>Add Executive Profile</span>
          </Button>
        </div>
      </div>

      {/* Grid of Executive Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {executives.map((exec) => {
          const isCeo = exec.name.includes("CEO");
          return (
            <Card
              key={exec.id}
              className={`border-border hover:border-amber-400 dark:hover:border-amber-600 transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                isCeo ? "ring-1 ring-amber-500/30" : ""
              }`}
            >
              <div>
                {/* Header Strip */}
                <div className="bg-muted/40 p-4 border-b border-border flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                      {isCeo && <Crown className="w-4 h-4 text-amber-500" />}
                      <span>{exec.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{exec.title}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{exec.email}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-background text-[11px] border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <User className="w-3 h-3 text-indigo-500" />
                    <span>EA: {exec.assigned_ea_name}</span>
                  </Badge>
                </div>

                {/* Preferences Details */}
                <CardContent className="p-4 space-y-3.5 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Plane className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">Airlines & Seating:</span>
                        <div className="text-muted-foreground">{exec.preferred_airlines}</div>
                        <div className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px]">
                          {exec.preferred_seat_class}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">Preferred Hotels:</span>
                        <div className="text-muted-foreground">{exec.preferred_hotel_chains}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Car className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">Ground Transport:</span>
                        <div className="text-muted-foreground">{exec.preferred_car_rental}</div>
                      </div>
                    </div>
                  </div>

                  {/* Loyalty Programs Vault */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-foreground text-[11px] flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>Loyalty & Work Points ({exec.loyalty_programs?.length || 0})</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTargetExecForLoyalty(exec);
                          setShowLoyaltyModal(true);
                        }}
                        className="h-6 text-[10px] px-2 text-indigo-600 dark:text-indigo-400 font-medium"
                      >
                        + Add Card
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      {exec.loyalty_programs && exec.loyalty_programs.length > 0 ? (
                        exec.loyalty_programs.map((lp) => (
                          <div
                            key={lp.id}
                            className="p-2 rounded-md bg-muted/30 border border-border/60 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-semibold text-foreground">
                              <span>{lp.program_name}</span>
                              <Badge className="bg-amber-600 text-white text-[9px] py-0">
                                {lp.tier_status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                              <span>Acc: {lp.account_number}</span>
                              <span>{Number(lp.points_balance).toLocaleString()} pts</span>
                            </div>
                            {lp.perks_summary && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {lp.perks_summary}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-muted-foreground italic">
                          No frequent flyer numbers added yet.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-muted/20 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span>{exec.home_time_zone || "America/Toronto"}</span>
                </span>
                <span className="font-medium text-foreground">
                  Routing: {exec.assigned_ea_name === "Vanessa" ? "VIP EA Desk" : "Operations Desk"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Executive Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Create Executive Profile</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleCreateExec} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Executive Name</label>
                  <Input
                    value={newExecName}
                    onChange={(e) => setNewExecName(e.target.value)}
                    placeholder="e.g. Linda Vance"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Email</label>
                  <Input
                    value={newExecEmail}
                    onChange={(e) => setNewExecEmail(e.target.value)}
                    placeholder="linda@zenatech.com"
                    type="email"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Title</label>
                  <Input
                    value={newExecTitle}
                    onChange={(e) => setNewExecTitle(e.target.value)}
                    placeholder="VP Strategic Partnerships"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Assigned Executive Assistant</label>
                  <select
                    value={newExecEa}
                    onChange={(e) => setNewExecEa(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="Vanessa">Vanessa (CEO & VP Team)</option>
                    <option value="Pat">Pat (Operations & Trade Shows)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Preferred Airlines & Cabin</label>
                <Input
                  value={newExecAirlines}
                  onChange={(e) => setNewExecAirlines(e.target.value)}
                  placeholder="Air Canada, Delta, United"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Preferred Seat Class</label>
                <Input
                  value={newExecSeat}
                  onChange={(e) => setNewExecSeat(e.target.value)}
                  placeholder="Business Class (Row 1-2 Aisle)"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Preferred Hotels</label>
                <Input
                  value={newExecHotels}
                  onChange={(e) => setNewExecHotels(e.target.value)}
                  placeholder="Marriott Bonvoy, Four Seasons"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Preferred Rental Car</label>
                <Input
                  value={newExecCars}
                  onChange={(e) => setNewExecCars(e.target.value)}
                  placeholder="Hertz President's Circle SUV"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Loyalty Card Modal */}
      {showLoyaltyModal && targetExecForLoyalty && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Add Loyalty Program for {targetExecForLoyalty.name}</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLoyaltyModal(false)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleAddLoyalty} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Program Name</label>
                <select
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="Air Canada Aeroplan">Air Canada Aeroplan</option>
                  <option value="Marriott Bonvoy">Marriott Bonvoy</option>
                  <option value="Hertz President's Circle">Hertz President's Circle</option>
                  <option value="Delta SkyMiles">Delta SkyMiles</option>
                  <option value="United MileagePlus">United MileagePlus</option>
                  <option value="Hilton Honors">Hilton Honors</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Account / Membership Number</label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. AC-908124991"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Tier Status</label>
                  <Input
                    value={tierStatus}
                    onChange={(e) => setTierStatus(e.target.value)}
                    placeholder="Super Elite 100K / Titanium"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Current Points</label>
                  <Input
                    type="number"
                    value={pointsBalance}
                    onChange={(e) => setPointsBalance(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Perks & Baggage Summary</label>
                <Input
                  value={perksSummary}
                  onChange={(e) => setPerksSummary(e.target.value)}
                  placeholder="Maple Leaf Lounge, 3x 70lb baggage tags, late checkout"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoyaltyModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Attach Loyalty Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
