import { useState, useEffect } from "react";
import {
  Globe,
  RefreshCw,
  Plane,
  Clock,
  ShieldCheck,
  FileCode,
  Tag,
  Luggage,
  Sparkles,
} from "lucide-react";
import { travelService } from "@/services/travelService";
import type { ScraperLog, TravelBooking } from "@/types/travel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AirCanadaSyncPage() {
  const [carrier, setCarrier] = useState<string>("Air Canada");
  const [bookingRef, setBookingRef] = useState<string>("AC-908144");
  const [executives, setExecutives] = useState<any[]>([]);
  const [passengerName, setPassengerName] = useState<string>("");
  const [initiatedBy, setInitiatedBy] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>(
    "https://www.aircanada.com/en-ca/view-booking?ref=AC-908144"
  );
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapingStep, setScrapingStep] = useState<number>(0);
  const [syncedBooking, setSyncedBooking] = useState<TravelBooking | null>(null);
  const [scraperLogs, setScraperLogs] = useState<ScraperLog[]>([]);
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
    loadExecutives();
  }, []);

  const loadExecutives = async () => {
    try {
      const res = await travelService.getExecutives();
      if (res && Array.isArray(res) && res.length > 0) {
        setExecutives(res);
        setPassengerName(res[0].name);
        if (res[0].assigned_ea_name) {
          setInitiatedBy(res[0].assigned_ea_name);
        }
      }
    } catch (err) {
      console.error("Failed to load executives", err);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await travelService.getScraperLogs(20);
      if (res && Array.isArray(res)) {
        setScraperLogs(res);
      }
    } catch (err) {
      console.error("Failed to load scraper logs", err);
    }
  };

  const handleRunScraper = async () => {
    if (!bookingRef.trim() || isScraping) return;
    setIsScraping(true);
    setScrapingStep(1);

    // Step animation simulator
    setTimeout(() => setScrapingStep(2), 800);
    setTimeout(() => setScrapingStep(3), 1600);
    setTimeout(() => setScrapingStep(4), 2400);

    try {
      const res = await travelService.syncScrapedBooking({
        carrier,
        booking_reference: bookingRef,
        initiated_by: initiatedBy,
        target_url: targetUrl,
        passenger_name: passengerName,
      });

      setTimeout(() => {
        setIsScraping(false);
        setScrapingStep(0);
        if (res?.booking) {
          setSyncedBooking(res.booking);
        }
        loadLogs();
      }, 3000);
    } catch (err) {
      console.error("Scraper sync failed", err);
      setIsScraping(false);
      setScrapingStep(0);
    }
  };

  const scrapingStepsText = [
    "",
    "1/4: Initializing Headless Chromium Session & Navigating Air Canada Portal...",
    "2/4: Reading DOM Confirmation: Parsing Passenger PNR, Flight AC 791, and Pod Seat 1B...",
    "3/4: Extracting Aeroplan Super Elite 100K Perks & 3x Checked Baggage Allowance...",
    "4/4: Synchronizing Record to Zenatech PostgreSQL Travel Database & Budget Ledger...",
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <Plane className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Air Canada & Carrier Screen-Scraper Sync
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Live integration & DOM scraper for airline bookings. Example: Vanessa books CEO travel on Air Canada; system
            reads the website confirmation, syncs PNR, seats, baggage tags, costs, and updates corporate tracking in real
            time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-background text-xs border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Air Canada Web Scraper Active</span>
          </Badge>
          <Button
            onClick={loadLogs}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Logs</span>
          </Button>
        </div>
      </div>

      {/* Main Scraper Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scraper Input Configuration Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-red-500" />
                  <span>Carrier Screen-Scraper Trigger</span>
                </CardTitle>
                <Badge className="bg-red-600 text-white text-[10px]">Live Ingestion</Badge>
              </div>
              <CardDescription className="text-xs">
                Enter booking details or paste confirmation URL from Vanessa's Air Canada session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Airline Carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="Air Canada">Air Canada (Aeroplan Integration)</option>
                  <option value="Delta Air Lines">Delta Air Lines (SkyMiles)</option>
                  <option value="United Airlines">United Airlines (MileagePlus)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">PNR / Booking Reference</label>
                  <Input
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    placeholder="e.g. AC-908144"
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground block mb-1">Passenger Name</label>
                  <select
                    value={passengerName}
                    onChange={(e) => {
                      setPassengerName(e.target.value);
                      const matched = executives.find((x) => x.name === e.target.value);
                      if (matched?.assigned_ea_name) setInitiatedBy(matched.assigned_ea_name);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {executives.map((ex) => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name} — {ex.title}
                      </option>
                    ))}
                    {executives.length === 0 && (
                      <option value="">Loading staff profiles from table...</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Booked By (Executive Assistant)</label>
                <Input
                  value={initiatedBy}
                  onChange={(e) => setInitiatedBy(e.target.value)}
                  placeholder="Vanessa"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Confirmation Portal Target URL</label>
                <Input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://www.aircanada.com/booking/view..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              <Button
                onClick={handleRunScraper}
                disabled={isScraping}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-10 gap-2 shadow-xs transition-all"
              >
                {isScraping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scraping Air Canada Portal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Screen-Scraper & Sync CEO Itinerary</span>
                  </>
                )}
              </Button>

              {/* Progress Stepper */}
              {isScraping && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-semibold text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                    <span>Live DOM Screen-Scraping in Progress</span>
                  </div>
                  <div className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                    {scrapingStepsText[scrapingStep]}
                  </div>
                  <div className="w-full bg-red-200 dark:bg-red-900/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full transition-all duration-500"
                      style={{ width: `${(scrapingStep / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Synced Booking Showcase */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 bg-muted/20 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <CardTitle className="text-base font-semibold text-foreground">
                    Latest Scraped Itinerary Confirmation
                  </CardTitle>
                </div>
                <Badge className="bg-emerald-600 text-white text-xs">
                  {syncedBooking ? "Status: Live Synced" : "Sample Verified Feed"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Parsed by scraper: flights, seating pods, checked baggage allowances, and Aeroplan perks.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-600/10 via-red-500/5 to-transparent border border-red-200/60 dark:border-red-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400 block">
                      Airline & Booking PNR
                    </span>
                    <span className="text-lg font-black tracking-tight text-foreground font-mono">
                      {syncedBooking ? syncedBooking.booking_reference : "AC-908144"}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold">
                    Air Canada Signature Class
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-red-200/40 dark:border-red-900/40">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Passenger:</span>
                    <strong className="text-foreground text-xs">
                      {syncedBooking ? syncedBooking.traveler_name : "CEO (Michael Vance)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Booked By:</span>
                    <strong className="text-foreground text-xs">
                      {syncedBooking ? syncedBooking.booked_by_name : "Vanessa (Executive Assistant)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Flight Legs:</span>
                    <strong className="text-foreground text-xs font-mono">
                      {syncedBooking ? syncedBooking.flight_numbers : "AC 791 / AC 792 (Boeing 787-9 Dreamliner)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Seat Pod:</span>
                    <strong className="text-foreground text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      {syncedBooking ? syncedBooking.seat_assignment : "1B (Lie-flat Executive Pod)"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Luggage className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Baggage Tags</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    3 Checked Bags (70 lbs each) Priority Tagged (Pelican Case Eligible)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Frequent Flyer</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Aeroplan Super Elite 100K (Maple Leaf Lounge Access)
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Total Fare (USD)</span>
                  </div>
                  <p className="text-foreground font-bold text-sm">
                    ${syncedBooking ? syncedBooking.total_cost.toFixed(2) : "1,985.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Screen-Scraper Audit Log History Table */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Screen-Scraper Execution Audit Logs
              </CardTitle>
              <CardDescription className="text-xs">
                History of automated and EA-initiated website scrapes from Air Canada and airline portals.
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">
              Total Recorded Scrapes: {scraperLogs.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Carrier</th>
                  <th className="py-2.5 px-4">PNR Reference</th>
                  <th className="py-2.5 px-4">Initiated By</th>
                  <th className="py-2.5 px-4">Scrape Method</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scraperLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No scraper logs recorded yet. Trigger a scrape above to populate.
                    </td>
                  </tr>
                ) : (
                  scraperLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>{log.carrier}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {log.booking_reference}
                      </td>
                      <td className="py-3 px-4 text-foreground">{log.initiated_by}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {log.scrape_method}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLogPayload(log.scraped_payload || {})}
                          className="h-7 text-[11px] gap-1"
                        >
                          <FileCode className="w-3 h-3" />
                          <span>View JSON</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* JSON Inspection Modal */}
      {selectedLogPayload && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-500" />
                <span>Scraped DOM Payload Inspector</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLogPayload(null)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>
            <pre className="p-4 bg-muted/50 rounded-lg text-xs font-mono overflow-auto max-h-96 text-foreground">
              {JSON.stringify(selectedLogPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <Button
                onClick={() => setSelectedLogPayload(null)}
                size="sm"
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
