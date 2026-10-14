import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Plane,
  User,
  Loader2,
  Bot,
  Bookmark,
  Trash2,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  ArrowRightLeft,
  Users,
  Search,
} from "lucide-react";
import { travelService } from "@/services/travelService";
import { flightService } from "@/services/flightService";
import type { ExecutiveProfile } from "@/types/travel";
import type {
  FlightBookingSession,
  FlightSearchResultItem,
  SavedFlightOption,
  Airport,
} from "@/types/flight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FlightCard } from "@/components/Flight/FlightCard";
import { AirportCombobox } from "@/components/Flight/AirportCombobox";
import { BookingTrackerModal } from "@/components/Flight/BookingTrackerModal";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function AiTravelAssistantPage() {
  const { user } = useAuth();
  // Navigation Tabs: "chat" | "explorer" | "saved" | "sessions"
  const [activeHubTab, setActiveHubTab] = useState<"chat" | "explorer" | "saved" | "sessions">("chat");

  // Flight Explorer State
  const [searchOrigin, setSearchOrigin] = useState<string>("YYZ");
  const [searchDestination, setSearchDestination] = useState<string>("LAS");
  const [searchTripType, setSearchTripType] = useState<"round_trip" | "one_way">("round_trip");
  const [searchDepartureDate, setSearchDepartureDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [searchReturnDate, setSearchReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 11);
    return d.toISOString().split("T")[0];
  });
  const [searchAdults, setSearchAdults] = useState<number>(1);
  const [searchCabin, setSearchCabin] = useState<"economy" | "premium_economy" | "business" | "first">("economy");
  const [searchCurrency, setSearchCurrency] = useState<string>("CAD");
  const [searchMaxStops, setSearchMaxStops] = useState<number | undefined>(undefined);
  const [searchSortBy, setSearchSortBy] = useState<"recommended" | "lowest_price" | "shortest_duration" | "departure_time">("recommended");
  const [searchResults, setSearchResults] = useState<FlightSearchResultItem[]>([]);
  const [isSearchingFlights, setIsSearchingFlights] = useState<boolean>(false);
  const [hasSearchedFlights, setHasSearchedFlights] = useState<boolean>(false);

  // Executive & Chat State
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

  // Booking Modal & Saved Options
  const [activeSession, setActiveSession] = useState<FlightBookingSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savedOptionIds, setSavedOptionIds] = useState<Set<string>>(new Set());
  const [savedOptions, setSavedOptions] = useState<SavedFlightOption[]>([]);
  const [recentSessions, setRecentSessions] = useState<FlightBookingSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
    loadSavedOptions();
    loadRecentSessions();
  }, []);

  useEffect(() => {
    if (activeHubTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeHubTab]);

  const loadInitialData = async () => {
    try {
      const execRes = await travelService.getExecutives();
      if (execRes && execRes.length > 0) {
        setExecutives(execRes);
      }
    } catch (err) {
      console.error("Failed to load executives", err);
    }
  };

  const loadSavedOptions = async () => {
    try {
      const res = await flightService.getSavedOptions();
      if (res) {
        setSavedOptions(res);
        setSavedOptionIds(new Set(res.map((o) => o.id || o.itinerary_payload?.option_id)));
      }
    } catch (e) {
      console.error("Failed to load saved options", e);
    }
  };

  const loadRecentSessions = async () => {
    try {
      const res = await flightService.getRecentSessions();
      if (res) {
        setRecentSessions(res);
      }
    } catch (e) {
      console.error("Failed to load recent sessions", e);
    }
  };

  const handleSendPrompt = async (promptOverride?: string) => {
    const text = promptOverride || inputText;
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
      }
    } catch (err) {
      console.error("Error during AI chat", err);
      toast.error("Failed to communicate with AI Travel Assistant");
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setConversationId(null);
    toast.success("Chat conversation cleared.");
  };

  const handleContinueToBooking = async (flight: FlightSearchResultItem) => {
    try {
      const targetExec = executives.find((e) => e.name === selectedExecName);

      const session = await flightService.createBookingSession({
        provider_name: flight.airline_name || "Airline Portal",
        observed_price: flight.price,
        currency: flight.currency,
        booking_url: flight.booking_url || `https://www.google.com/travel/flights`,
        itinerary_summary: {
          flight_option_id: flight.option_id,
          target_executive_name: selectedExecName,
          booked_by_name: assistantName,
          booked_by_email: user?.email || "assistant@zenatech.com",
          traveler_name: selectedExecName,
          traveler_email: targetExec?.email || "executive@zenatech.com",
          flight_details_snapshot: flight,
        },
      });

      if (session) {
        setActiveSession(session);
        setIsModalOpen(true);
        loadRecentSessions();

        const bookingUrl = flight.booking_url || `https://www.google.com/travel/flights`;
        const newTab = window.open(bookingUrl, "_blank");

        newTab?.postMessage(
          {
            type: "ZENATECH_SESSION_ATTACH",
            payload: {
              sessionId: session.id,
              traveler: selectedExecName,
              provider: session.provider_name,
              apiUrl: window.location.origin.includes("localhost")
                ? "http://localhost:8008"
                : window.location.origin,
            },
          },
          "*"
        );

        await flightService.sendSessionEvent(session.id, {
          event_type: "BOOKING_LINK_OPENED",
          source: "web_app",
          raw_payload: { action: "booking_url_opened_in_new_tab" },
        });
      }
    } catch (e) {
      console.error("Failed to initiate booking session", e);
    }
  };

  const handleSaveFlight = async (flight: FlightSearchResultItem) => {
    try {
      await flightService.saveOption({
        trip_type: flight.trip_type,
        origin_airport: flight.outbound.origin_airport,
        destination_airport: flight.outbound.destination_airport,
        departure_date: flight.outbound.departure_time.split(" ")[0],
        airline_name: flight.airline_name,
        flight_numbers: flight.flight_numbers,
        displayed_price: flight.price,
        currency: flight.currency,
        source_url: flight.booking_url,
        itinerary_payload: flight,
      });
      setSavedOptionIds((prev) => new Set(prev).add(flight.option_id));
      loadSavedOptions();
      toast.success(`Bookmarked ${flight.airline_name} flight`);
    } catch (e) {
      console.error("Failed to save flight", e);
    }
  };

  const handleSwapAirports = () => {
    const temp = searchOrigin;
    setSearchOrigin(searchDestination);
    setSearchDestination(temp);
  };

  const handleExecuteFlightSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchOrigin || !searchDestination || !searchDepartureDate) {
      toast.error("Please specify origin airport, destination airport, and departure date.");
      return;
    }
    setIsSearchingFlights(true);
    setHasSearchedFlights(true);
    try {
      const response = await flightService.searchFlights({
        trip_type: searchTripType,
        origin_airport: searchOrigin,
        destination_airport: searchDestination,
        departure_date: searchDepartureDate,
        return_date: searchTripType === "round_trip" ? searchReturnDate : undefined,
        adults: searchAdults,
        children: 0,
        infants: 0,
        cabin: searchCabin,
        currency: searchCurrency,
        search_market: "CA",
        max_stops: searchMaxStops,
        sort_by: searchSortBy,
      });

      if (response && response.results) {
        setSearchResults(response.results);
        if (response.results.length === 0) {
          toast.info("No flights found matching your search criteria.");
        } else {
          toast.success(`Found ${response.results.length} live flight options!`);
        }
      }
    } catch (err: any) {
      console.error("Flight search failed", err);
      toast.error("Failed to query live flight prices.");
    } finally {
      setIsSearchingFlights(false);
    }
  };

  const handleQuickFlightPreset = (orig: string, dest: string, name: string) => {
    setSearchOrigin(orig);
    setSearchDestination(dest);
    toast.info(`Updated search route to ${orig} → ${dest} (${name})`);
  };

  const handleAskBotAboutFlight = (flight: FlightSearchResultItem) => {
    setActiveHubTab("chat");
    const prompt = `Analyze this ${flight.airline_name} flight (${flight.flight_numbers}) from ${flight.outbound.origin_airport} to ${flight.outbound.destination_airport} at $${flight.price} ${flight.currency} for ${selectedExecName}. Check corporate travel policy and suggest booking recommendations.`;
    handleSendPrompt(prompt);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              AI Travel Assistant
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1.5 py-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live Google Flights Engine Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Intelligent booking engine for Executive Assistants. Queries live airline fares, checks corporate policy, and embeds interactive flight options directly inside the conversation.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border shrink-0 self-start">
          <button
            onClick={() => setActiveHubTab("chat")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeHubTab === "chat"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Travel Bot</span>
          </button>
          <button
            onClick={() => setActiveHubTab("explorer")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeHubTab === "explorer"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-blue-500" />
            <span>Flight Explorer</span>
          </button>
          <button
            onClick={() => setActiveHubTab("saved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeHubTab === "saved"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({savedOptions.length})</span>
          </button>
          <button
            onClick={() => setActiveHubTab("sessions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeHubTab === "sessions"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Audit & Sessions ({recentSessions.length})</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: AI TRAVEL BOT & CHAT ===================== */}
      {activeHubTab === "chat" && (
        <div className="space-y-6">
          {/* Executive & Travel Control Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-card border border-border shadow-xs">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Traveling Executive
              </label>
              <select
                value={selectedExecName}
                onChange={(e) => setSelectedExecName(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-hidden"
              >
                {executives.map((ex) => (
                  <option key={ex.id} value={ex.name}>
                    {ex.name} — {ex.title}
                  </option>
                ))}
                {executives.length === 0 && (
                  <>
                    <option value="CEO (Michael Vance)">CEO (Michael Vance)</option>
                    <option value="Sajjad">Sajjad (VP Engineering)</option>
                    <option value="Jim">Jim (VP Operations)</option>
                    <option value="Simon">Simon (VP Hardware)</option>
                    <option value="Phil">Phil (VP Flight Testing)</option>
                    <option value="Linda">Linda (VP Strategic Partnerships)</option>
                  </>
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
                placeholder="e.g. Los Angeles (LAX) or Vancouver (YVR)"
                className="h-9 text-xs rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Executive Assistant (EA)
              </label>
              <select
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-hidden"
              >
                <option value="Vanessa">Vanessa (Executive Assistant)</option>
                <option value="Pat">Pat (Executive Assistant)</option>
                <option value="Alex">Alex (Travel Coordinator)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Pre-Trip Budget Cap (CAD)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(Number(e.target.value))}
                  className="h-9 pl-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* ===================== FULL-WIDTH CHAT SESSION ===================== */}
          <div className="w-full flex flex-col h-[780px] bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            {/* Chat Session Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Assistant Chat Session ({assistantName} ↔ Zenatech Travel Bot)
                </span>
                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold">
                  Executive: {selectedExecName.split(" ")[0]}
                </Badge>
              </div>

              {/* Clear Chat Button */}
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleClearChat}
                    className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 px-2.5 rounded-lg border border-border/80 transition-colors"
                    title="Clear conversation history and reset session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Chat</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <div className="p-4 bg-muted/60 rounded-full mb-3 text-indigo-500 border border-border/50">
                    <Plane className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-foreground text-base">Travel Bot Ready</h4>
                  <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                    Ask the Travel Bot to find flights, recommend luxury hotels, or verify policy for{" "}
                    <strong className="text-foreground">{selectedExecName}</strong>.
                    Live flight results will appear directly in this window with complete outbound & return schedules.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={`flex flex-col ${
                      msg.sender === "assistant" ? "items-end" : "items-start"
                    } space-y-2`}
                  >
                    <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
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

                    {/* Text Bubble */}
                    <div
                      className={`p-4 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed text-xs sm:text-sm ${
                        msg.sender === "assistant"
                          ? "bg-indigo-600 text-white rounded-tr-xs"
                          : "bg-muted/60 text-foreground border border-border/80 rounded-tl-xs shadow-2xs"
                      }`}
                    >
                      {msg.message_text}
                    </div>

                    {/* EMBEDDED FLIGHT CARDS (WIDE & FULLY DETAILED) */}
                    {msg.sender === "bot" && msg.itinerary_payload?.flights && msg.itinerary_payload.flights.length > 0 && (
                      <div className="w-full mt-3 space-y-4 pt-3 border-t border-border/60">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground px-1 pb-1">
                          <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm">
                            <Plane className="w-4 h-4" />
                            Live Google Flights ({msg.itinerary_payload.flights.length} Options)
                          </span>
                          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline" />
                            Real-Time Fares Verified
                          </span>
                        </div>

                        <div className="space-y-4">
                          {msg.itinerary_payload.flights.map((flight: FlightSearchResultItem, fIdx: number) => (
                            <FlightCard
                              key={flight.option_id || fIdx}
                              flight={flight}
                              isSaved={savedOptionIds.has(flight.option_id)}
                              isCheapest={fIdx === 0}
                              onSelect={(f) => handleContinueToBooking(f)}
                              onSave={(f) => handleSaveFlight(f)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground p-3.5 bg-muted/40 rounded-xl max-w-md border border-border/60">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />
                  <span>Scraping live Google Flights, Bonvoy hotels & checking calendar...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-border bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrompt();
                }}
                className="flex items-center gap-3"
              >
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ask the Travel Bot (e.g. "Find direct flights to ${destination} under $${budgetCap} for ${selectedExecName}")...`}
                  className="h-11 text-xs sm:text-sm rounded-xl px-4 flex-1"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-2 rounded-xl font-semibold shadow-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: FLIGHT EXPLORER ===================== */}
      {activeHubTab === "explorer" && (
        <div className="space-y-6">
          {/* Main Flight Search Bar Card */}
          <Card className="border-border bg-card rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Plane className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Flight Explorer
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live flight fare scraper & aggregator for executive travel routes.
                    </CardDescription>
                  </div>
                </div>

                {/* Trip Type Toggle (Round Trip default vs One Way) */}
                <div className="flex bg-muted/60 p-1 rounded-xl border border-border text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setSearchTripType("round_trip")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      searchTripType === "round_trip"
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Round Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTripType("one_way")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      searchTripType === "one_way"
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    One Way
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <form onSubmit={handleExecuteFlightSearch} className="space-y-4">
                {/* Airports & Dates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Origin Airport */}
                  <div className="md:col-span-3">
                    <AirportCombobox
                      label="From (Origin)"
                      value={searchOrigin}
                      onChange={(airport: Airport) => setSearchOrigin(airport.iata)}
                      placeholder="Origin Airport..."
                    />
                  </div>

                  {/* Swap Button */}
                  <div className="hidden md:flex md:col-span-1 justify-center pb-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSwapAirports}
                      title="Swap Origin and Destination"
                      className="rounded-full w-8 h-8 border-border hover:border-primary shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Destination Airport */}
                  <div className="md:col-span-3">
                    <AirportCombobox
                      label="To (Destination)"
                      value={searchDestination}
                      onChange={(airport: Airport) => setSearchDestination(airport.iata)}
                      placeholder="Destination Airport..."
                    />
                  </div>

                  {/* Departure Date */}
                  <div className={searchTripType === "round_trip" ? "md:col-span-2" : "md:col-span-3"}>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Departure Date
                    </label>
                    <Input
                      type="date"
                      value={searchDepartureDate}
                      onChange={(e) => setSearchDepartureDate(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  {/* Return Date (if Round Trip) */}
                  {searchTripType === "round_trip" && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Return Date
                      </label>
                      <Input
                        type="date"
                        value={searchReturnDate}
                        min={searchDepartureDate}
                        onChange={(e) => setSearchReturnDate(e.target.value)}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                  )}

                  {/* Search Button */}
                  <div className={searchTripType === "round_trip" ? "md:col-span-1" : "md:col-span-2"}>
                    <Button
                      type="submit"
                      disabled={isSearchingFlights}
                      className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg gap-1.5 shadow-xs"
                    >
                      {isSearchingFlights ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Search</span>
                    </Button>
                  </div>
                </div>

                {/* Secondary Filters Strip (Passengers, Cabin, Currency, Quick Presets) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Passengers */}
                    <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">Pax:</span>
                      <select
                        value={searchAdults}
                        onChange={(e) => setSearchAdults(parseInt(e.target.value, 10) || 1)}
                        className="bg-transparent font-semibold text-foreground text-xs focus:outline-hidden cursor-pointer"
                      >
                        <option value={1}>1 Adult</option>
                        <option value={2}>2 Adults</option>
                        <option value={3}>3 Adults</option>
                        <option value={4}>4 Adults</option>
                      </select>
                    </div>

                    {/* Cabin Class */}
                    <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border">
                      <span className="text-muted-foreground font-medium">Class:</span>
                      <select
                        value={searchCabin}
                        onChange={(e) => setSearchCabin(e.target.value as any)}
                        className="bg-transparent font-semibold text-foreground text-xs focus:outline-hidden cursor-pointer"
                      >
                        <option value="economy">Economy</option>
                        <option value="premium_economy">Premium Economy</option>
                        <option value="business">Business / First</option>
                      </select>
                    </div>

                    {/* Currency */}
                    <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border border-border">
                      <span className="text-muted-foreground font-medium">Currency:</span>
                      <select
                        value={searchCurrency}
                        onChange={(e) => setSearchCurrency(e.target.value)}
                        className="bg-transparent font-semibold font-mono text-foreground text-xs focus:outline-hidden cursor-pointer"
                      >
                        <option value="CAD">CAD ($)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  {/* Popular Executive Routes */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-medium">Quick Routes:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickFlightPreset("YYZ", "LAS", "CES / Drone Arena")}
                      className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      YYZ → LAS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFlightPreset("YYZ", "LAX", "Executive West")}
                      className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      YYZ → LAX
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFlightPreset("YYZ", "YVR", "Vancouver Office")}
                      className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      YYZ → YVR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFlightPreset("YYZ", "LHR", "UK Headquarters")}
                      className="px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      YYZ → LHR
                    </button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results Toolbar & List */}
          {isSearchingFlights ? (
            <Card className="border-border bg-card rounded-2xl p-12 text-center shadow-xs">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <div className="text-sm font-bold text-foreground">Scraping Live Flights...</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Searching real-time Google Flights and airline inventory for {searchOrigin} → {searchDestination}.
              </p>
            </Card>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              {/* Results Filter & Sorting Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                    {searchResults.length} Flights Found
                  </Badge>
                  <span className="text-muted-foreground">
                    {searchOrigin} to {searchDestination} • {searchTripType === "round_trip" ? "Round Trip" : "One Way"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Stops Filter */}
                  <select
                    value={searchMaxStops === undefined ? "all" : searchMaxStops}
                    onChange={(e) => setSearchMaxStops(e.target.value === "all" ? undefined : parseInt(e.target.value, 10))}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:outline-hidden"
                  >
                    <option value="all">All Stops</option>
                    <option value={0}>Non-stop Only</option>
                    <option value={1}>Up to 1 Stop</option>
                  </select>

                  {/* Sort By */}
                  <select
                    value={searchSortBy}
                    onChange={(e) => setSearchSortBy(e.target.value as any)}
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:outline-hidden"
                  >
                    <option value="recommended">Sort: Recommended</option>
                    <option value="lowest_price">Sort: Lowest Price</option>
                    <option value="shortest_duration">Sort: Shortest Duration</option>
                    <option value="departure_time">Sort: Departure Time</option>
                  </select>
                </div>
              </div>

              {/* Flights Grid */}
              <div className="space-y-3">
                {searchResults.map((flight, idx) => (
                  <FlightCard
                    key={flight.option_id || idx}
                    flight={flight}
                    onSelect={handleContinueToBooking}
                    onSave={handleSaveFlight}
                    onAnalyzeWithAi={handleAskBotAboutFlight}
                    isSaved={savedOptionIds.has(flight.option_id)}
                    isCheapest={idx === 0 && searchSortBy === "lowest_price"}
                  />
                ))}
              </div>
            </div>
          ) : hasSearchedFlights ? (
            <Card className="border-border bg-card rounded-2xl p-12 text-center shadow-xs">
              <Plane className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <div className="text-sm font-bold text-foreground">No flights found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                No flights were returned for this route and date combination. Try adjusting your dates or airports.
              </p>
            </Card>
          ) : (
            <Card className="border-border bg-card rounded-2xl p-8 text-center shadow-xs">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <Plane className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Explore Corporate Airline Flights</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select origin and destination airports above, or pick one of the quick executive routes to browse real-time airline fares.
                  </p>
                </div>
                <Button
                  onClick={() => handleExecuteFlightSearch()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl h-9 gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Flights for {searchOrigin} → {searchDestination}</span>
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================== TAB 2: SAVED FLIGHT OPTIONS ===================== */}
      {activeHubTab === "saved" && (
        <Card className="border-border bg-card rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Saved Flight Options ({savedOptions.length})</span>
              <Button size="xs" variant="outline" onClick={loadSavedOptions} className="gap-1 text-xs rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Executive flight itineraries bookmarked for review or supervisor approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedOptions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No saved flights yet. Click the bookmark icon on any flight in the chat session.
              </div>
            ) : (
              savedOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span>{opt.airline_name}</span>
                      <span className="font-mono text-muted-foreground">{opt.flight_numbers}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {opt.trip_type === "round_trip" ? "Round Trip" : "One Way"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      {opt.origin_airport} → {opt.destination_airport} • Depart {opt.departure_date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        ${opt.displayed_price.toFixed(2)} {opt.currency}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Saved on {new Date(opt.created_at).toLocaleDateString()}</div>
                    </div>
                    {opt.itinerary_payload && (
                      <Button
                        size="xs"
                        onClick={() => handleContinueToBooking(opt.itinerary_payload)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs"
                      >
                        Select Flight
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================== TAB 3: BOOKING SESSIONS AUDIT ===================== */}
      {activeHubTab === "sessions" && (
        <Card className="border-border bg-card rounded-2xl shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Booking Sessions & Chrome Extension Audit ({recentSessions.length})</span>
              <Button size="xs" variant="outline" onClick={loadRecentSessions} className="gap-1 text-xs rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Live sessions initiated by users. Tracks confirmation codes, e-tickets, and price changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No active booking sessions yet. Select a flight to launch the real-time tracking session.
              </div>
            ) : (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    setActiveSession(session);
                    setIsModalOpen(true);
                  }}
                  className="p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span>{session.provider_name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          session.status === "CONFIRMED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : session.status === "BOOKING_LINK_OPENED"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {session.status}
                      </Badge>
                      {session.confirmation_reference && (
                        <span className="font-mono text-emerald-600 font-bold">PNR: {session.confirmation_reference}</span>
                      )}
                    </div>
                    <div className="text-muted-foreground font-mono text-[11px]">
                      Session ID: {session.id} • Started {new Date(session.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-foreground">
                        Observed: ${session.observed_price?.toFixed(2)} {session.currency}
                      </div>
                      {session.final_amount_paid && (
                        <div className="text-emerald-600 font-bold text-[11px]">
                          Confirmed: ${session.final_amount_paid.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <Button size="xs" variant="outline" className="text-xs rounded-lg">
                      Track Live
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Tracker Modal Dialog */}
      <BookingTrackerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        session={activeSession}
        onSessionUpdated={() => loadRecentSessions()}
      />
    </div>
  );
}
