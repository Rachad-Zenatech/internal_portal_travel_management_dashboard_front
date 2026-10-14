import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Plane,
  Building2,
  Car,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  User,
  Crown,
  Luggage,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { travelService } from "@/services/travelService";
import type { AiItineraryOption, ExecutiveProfile } from "@/types/travel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AiTravelAssistantPage() {
  const [executives, setExecutives] = useState<ExecutiveProfile[]>([]);
  const [selectedExecName, setSelectedExecName] = useState<string>("CEO (Michael Vance)");
  const [assistantName, setAssistantName] = useState<string>("Vanessa");
  const [destination, setDestination] = useState<string>("Los Angeles (LAX)");
  const [budgetCap, setBudgetCap] = useState<number>(5000);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      sender: "assistant" | "bot";
      message_text: string;
      itinerary_payload?: any;
      created_at: string;
    }>
  >([]);

  const [activeOptions, setActiveOptions] = useState<AiItineraryOption[]>([]);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
  const [lastBookingResult, setLastBookingResult] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeOptions]);

  const loadInitialData = async () => {
    try {
      const execRes = await travelService.getExecutives();
      if (execRes && execRes.length > 0) {
        setExecutives(execRes);
        setSelectedExecName(execRes[0].name);
      }
      // Load recent AI conversations
      const convRes = await travelService.getAiConversations();
      if (convRes && convRes.length > 0) {
        const latest = convRes[0];
        setConversationId(latest.id);
        if (latest.messages && latest.messages.length > 0) {
          setChatMessages(latest.messages);
          const lastBot = [...latest.messages].reverse().find((m: any) => m.sender === "bot" && m.itinerary_payload);
          if (lastBot && lastBot.itinerary_payload?.options) {
            setActiveOptions(lastBot.itinerary_payload.options);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: "temp-" + Date.now(),
      sender: "assistant" as const,
      message_text: text,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await travelService.sendAiChat({
        conversation_id: conversationId || undefined,
        assistant_name: assistantName,
        executive_target: selectedExecName,
        message_text: text,
        destination,
        budget_cap: budgetCap,
      });

      if (res) {
        setConversationId(res.conversation_id);
        setChatMessages(res.messages || []);
        setActiveOptions(res.itinerary_options || []);
      }
    } catch (err) {
      console.error("Error during AI chat", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoBook = async (option: AiItineraryOption) => {
    setBookingInProgress(option.option_id);
    try {
      const targetExec = executives.find((e) => e.name === selectedExecName);
      const res = await travelService.autoBookAiItinerary({
        conversation_id: conversationId || undefined,
        traveler_name: selectedExecName,
        traveler_email: targetExec?.email || "ceo@zenatech.com",
        booked_by_name: assistantName,
        itinerary_payload: option,
      });

      setLastBookingResult(res);
    } catch (err) {
      console.error("Auto book failed", err);
    } finally {
      setBookingInProgress(null);
    }
  };

  const quickPrompts = [
    {
      title: "CEO to LAX (Air Canada Signature)",
      text: "Book CEO's trip to LAX on Air Canada Signature Class pod with 4 nights at Ritz-Carlton and Hertz Escalade.",
      exec: "CEO (Michael Vance)",
      dest: "Los Angeles (LAX)",
    },
    {
      title: "Sajjad to Chicago (Drone Kit Support)",
      text: "Plan Sajjad's trip to Chicago for sensor flight tests with priority luggage for drone payload cases.",
      exec: "Sajjad",
      dest: "Chicago (ORD)",
    },
    {
      title: "Jim to Dallas (AUVSI Trade Show)",
      text: "Prepare Jim's travel to Dallas for trade show booth coordination, keeping total spend under $3,500.",
      exec: "Jim",
      dest: "Dallas (DFW)",
    },
    {
      title: "Check Schedule Conflicts",
      text: "Review CEO schedule conflicts next week and find earliest morning direct return flight.",
      exec: "CEO (Michael Vance)",
      dest: "Vancouver (YVR)",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              AI Executive Travel Planner & Dispatch
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Centralized intelligent booking engine for Executive Assistants (Vanessa, Pat). Enforces CEO preferences,
            loyalty tiers, pre-trip budget caps, and calendar conflict detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-background text-xs border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            <span>Active Assistant:</span>
            <strong className="text-foreground">{assistantName}</strong>
          </Badge>
          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              onClick={() => setAssistantName("Vanessa")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                assistantName === "Vanessa" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vanessa (CEO / Sajjad)
            </button>
            <button
              onClick={() => setAssistantName("Pat")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                assistantName === "Pat" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pat (Jim / Ops / Central)
            </button>
          </div>
        </div>
      </div>

      {/* Control Strip: Executive, Destination, Budget Cap */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-card border border-border shadow-xs">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Traveling Executive
          </label>
          <select
            value={selectedExecName}
            onChange={(e) => setSelectedExecName(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {executives.map((ex) => (
              <option key={ex.id} value={ex.name}>
                {ex.name} — {ex.title}
              </option>
            ))}
            {executives.length === 0 && (
              <option value="" disabled>No executives found in database table</option>
            )}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Destination & Airport
          </label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Los Angeles (LAX)"
            className="h-9 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Pre-Trip Budget Cap (USD)
          </label>
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="number"
              value={budgetCap}
              onChange={(e) => setBudgetCap(Number(e.target.value))}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Air Canada & Carrier APIs Linked</span>
          </div>
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Live Corporate Rates & Priority Status Active
          </div>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>One-Click EA Assistant Prompts</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedExecName(qp.exec);
                setDestination(qp.dest);
                handleSendPrompt(qp.text);
              }}
              className="text-left p-3 rounded-lg border border-border bg-card/60 hover:bg-accent/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-xs group"
            >
              <div className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-1 flex items-center justify-between">
                <span>{qp.title}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-muted-foreground line-clamp-2">{qp.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat and Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat History */}
        <div className="lg:col-span-6 flex flex-col h-[640px] bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground">
                Assistant Chat Session ({assistantName} ↔ Zenatech Travel Bot)
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Executive: {selectedExecName.split(" ")[0]}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                <div className="p-3 bg-muted rounded-full mb-3 text-indigo-500">
                  <Plane className="w-8 h-8" />
                </div>
                <h4 className="font-semibold text-foreground text-sm">No Active Messages</h4>
                <p className="text-xs max-w-sm mt-1">
                  Type a request or click a quick prompt above to have the AI plan, price, and conflict-check travel for{" "}
                  {selectedExecName}.
                </p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex flex-col ${
                    msg.sender === "assistant" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                    {msg.sender === "assistant" ? (
                      <>
                        <span>{assistantName} (Executive Assistant)</span>
                        <User className="w-3 h-3 text-indigo-500" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Zenatech Travel Agent</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`p-3.5 rounded-xl max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                      msg.sender === "assistant"
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-muted/70 text-foreground border border-border/80 rounded-tl-xs shadow-2xs"
                    }`}
                  >
                    {msg.message_text}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/40 rounded-lg max-w-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Searching airline inventory, Bonvoy hotels & conflict checks...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-border bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask Travel Bot (e.g. 'Book CEO Air Canada flight next Tuesday to LAX under $5k')...`}
                className="h-10 text-sm focus-visible:ring-indigo-500"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Generated Itineraries & One-Click Booking */}
        <div className="lg:col-span-6 flex flex-col h-[640px] overflow-y-auto space-y-4">
          {/* Confirmed Booking Toast / Card */}
          {lastBookingResult && (
            <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm animate-in fade-in duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base text-emerald-900 dark:text-emerald-200">
                      Booking Confirmed & Synchronized!
                    </CardTitle>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs">
                    PNR: {lastBookingResult.confirmation_code}
                  </Badge>
                </div>
                <CardDescription className="text-emerald-700 dark:text-emerald-300 text-xs">
                  {lastBookingResult.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs space-y-1.5 text-foreground/80">
                <div className="flex justify-between border-t border-emerald-200 dark:border-emerald-800/50 pt-2">
                  <span>E-Ticket Reference:</span>
                  <strong className="font-mono">{lastBookingResult.e_ticket}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Calendar Invite Status:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {lastBookingResult.calendar_sync}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Budget Allocation Impact:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    Pre-Trip Spent Committed in Real-Time
                  </strong>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">
                Synthesized Travel Itineraries ({activeOptions.length} Options)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              Filtered for: {selectedExecName.split(" ")[0]}
            </span>
          </div>

          {activeOptions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-border border-dashed text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mb-2 text-muted-foreground/60" />
              <p className="text-sm font-medium">No Itinerary Packages Generated Yet</p>
              <p className="text-xs max-w-xs mt-1">
                Send a chat query on the left. The AI bot will parse airline schedules, seat pods, luxury hotels, and
                car rentals into ready-to-book cards here.
              </p>
            </div>
          ) : (
            activeOptions.map((opt) => (
              <Card
                key={opt.option_id}
                className="border-border hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-xs overflow-hidden"
              >
                <div className="bg-muted/40 p-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        opt.tier.includes("Recommended")
                          ? "bg-indigo-600 text-white text-xs font-semibold"
                          : "bg-secondary text-secondary-foreground text-xs"
                      }
                    >
                      {opt.tier}
                    </Badge>
                    <span className="text-xs font-bold text-foreground">{opt.airline}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-foreground">
                      ${opt.total_package_cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Within Budget (${opt.budget_headroom.toFixed(0)} under cap)
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3.5 text-xs">
                  {/* Flight Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Plane className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Flights & Cabin Seating</span>
                    </div>
                    <div className="bg-muted/20 p-2 rounded-md border border-border/50 space-y-1">
                      <div className="text-foreground font-medium">{opt.flight_outbound}</div>
                      <div className="text-muted-foreground">{opt.flight_return}</div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <Badge variant="outline" className="text-[10px] bg-background">
                          Cabin: {opt.cabin}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-background">
                          Seat: {opt.seat_preferred}
                        </Badge>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          +{opt.points_earned.toLocaleString()} pts ({opt.loyalty_program.split("(")[0]})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hotel Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lodging & Corporate Perks</span>
                    </div>
                    <div className="bg-muted/20 p-2 rounded-md border border-border/50 space-y-1">
                      <div className="text-foreground font-medium">{opt.hotel}</div>
                      <div className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                        {opt.hotel_perks}
                      </div>
                    </div>
                  </div>

                  {/* Ground & Drone Baggage */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-muted/20 rounded-md border border-border/50">
                      <div className="flex items-center gap-1 font-semibold text-foreground mb-0.5">
                        <Car className="w-3 h-3 text-amber-500" />
                        <span>Rental Vehicle</span>
                      </div>
                      <div className="text-muted-foreground">{opt.car_rental}</div>
                    </div>
                    <div className="p-2 bg-muted/20 rounded-md border border-border/50">
                      <div className="flex items-center gap-1 font-semibold text-foreground mb-0.5">
                        <Luggage className="w-3 h-3 text-cyan-500" />
                        <span>Special Luggage / Drones</span>
                      </div>
                      <div className="text-muted-foreground">{opt.drone_gear_support}</div>
                    </div>
                  </div>

                  {/* Cost breakdown strip */}
                  <div className="flex items-center justify-between pt-1 border-t border-border text-[11px] text-muted-foreground">
                    <span>Flight: ${opt.flight_cost}</span>
                    <span>Hotel: ${opt.hotel_cost}</span>
                    <span>Car: ${opt.car_cost}</span>
                    <span className="font-semibold text-foreground">Total: ${opt.total_package_cost}</span>
                  </div>

                  {/* Auto-Book Button */}
                  <Button
                    onClick={() => handleAutoBook(opt)}
                    disabled={bookingInProgress === opt.option_id}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 gap-2 shadow-xs"
                  >
                    {bookingInProgress === opt.option_id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Reserving Flights & Booking Confirmed...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Instant 1-Click Auto-Book & Calendar Dispatch</span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
