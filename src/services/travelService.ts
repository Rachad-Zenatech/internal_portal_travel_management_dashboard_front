import { apiClient } from "./apiClient";
import type {
  TravelEvent,
  EventAttendee,
  TravelBudget,
  BudgetLineItem,
  TravelerStipend,
  EventStipendsOverview,
  SpecialCoverage,
  DroneCombatGear,
  SpecialLuggageManifest,
  TravelDashboardSummary,
  TripLocationsResponse,
  EventCostsSummary,
  TravelVehicle,
  EventTripGroup,
} from "@/types/travel";

export const travelService = {
  // Summary
  getDashboardSummary: () =>
    apiClient.get<TravelDashboardSummary>("/api/travel/dashboard/summary"),
  getTripLocations: () =>
    apiClient.get<TripLocationsResponse>("/api/travel/dashboard/trip-locations"),

  // All Trips & Grouped Bookings
  getAllTrips: () => apiClient.get<EventTripGroup[]>("/api/travel/all-trips"),

  // Events & Attendees ("Who is going")
  getEvents: () => apiClient.get<TravelEvent[]>("/api/travel/events"),
  getEvent: (id: string) =>
    apiClient.get<{
      event: TravelEvent;
      attendees: EventAttendee[];
      budgets: TravelBudget[];
      drone_gear: DroneCombatGear[];
      special_luggage: SpecialLuggageManifest[];
      special_coverages: SpecialCoverage[];
      costs?: EventCostsSummary;
      vehicles?: TravelVehicle[];
    }>(`/api/travel/events/${id}`),
  getEventCosts: (id: string) =>
    apiClient.get<EventCostsSummary>(`/api/travel/events/${id}/costs`),
  createEvent: (data: Partial<TravelEvent> & { attendees?: Partial<EventAttendee>[] }) =>
    apiClient.post<TravelEvent>("/api/travel/events", data),
  updateEvent: (id: string, data: Partial<TravelEvent>) =>
    apiClient.put<TravelEvent>(`/api/travel/events/${id}`, data),
  deleteEvent: (id: string) => apiClient.delete(`/api/travel/events/${id}`),

  addAttendee: (eventId: string, data: Partial<EventAttendee>) =>
    apiClient.post<EventAttendee>(`/api/travel/events/${eventId}/attendees`, data),
  removeAttendee: (attendeeId: string) =>
    apiClient.delete(`/api/travel/attendees/${attendeeId}`),
  updateAttendeeFlight: (
    attendeeId: string,
    data: {
      carrier_airline?: string;
      flight_numbers?: string;
      seat_assignment?: string;
      booking_reference?: string;
      origin_city?: string;
      destination_city?: string;
      flight_details?: string;
      lodging_details?: string;
    }
  ) =>
    apiClient.put<{ message: string; attendee_id: string }>(
      `/api/travel/attendees/${attendeeId}/flight`,
      data
    ),

  // Budgets ("Budgeting")
  getBudgets: () => apiClient.get<TravelBudget[]>("/api/travel/budgets"),
  getBudget: (id: string) => apiClient.get<TravelBudget>(`/api/travel/budgets/${id}`),
  createBudget: (data: Partial<TravelBudget> & { line_items?: Partial<BudgetLineItem>[] }) =>
    apiClient.post<TravelBudget>("/api/travel/budgets", data),
  addBudgetLineItem: (budgetId: string, data: Partial<BudgetLineItem>) =>
    apiClient.post<BudgetLineItem>(`/api/travel/budgets/${budgetId}/line-items`, data),
  deleteBudgetLineItem: (itemId: string, budgetId?: string) =>
    budgetId
      ? apiClient.delete(`/api/travel/budgets/${budgetId}/line-items/${itemId}`)
      : apiClient.delete(`/api/travel/budget-line-items/${itemId}`),
  deleteBudget: (id: string) => apiClient.delete(`/api/travel/budgets/${id}`),

  // Stipends ("User stiphen for who")
  getStipends: () => apiClient.get<TravelerStipend[]>("/api/travel/stipends"),
  getStipendsEventsOverview: (scope: string = "upcoming_inprogress") =>
    apiClient.get<EventStipendsOverview[]>(`/api/travel/stipends/events-overview?scope=${scope}`),
  saveGlobalStipendSetup: (eventId: string, data: {
    daily_rate: number;
    total_days: number;
    currency?: string;
    destination_tier?: string;
    payment_method?: string;
    notes?: string;
    apply_to_custom_overrides?: boolean;
  }) => apiClient.post(`/api/travel/stipends/events/${eventId}/global-setup`, data),
  saveCustomStipendChange: (data: {
    event_id: string;
    attendee_id?: string;
    recipient_name: string;
    recipient_email: string;
    daily_rate: number;
    total_days: number;
    total_amount: number;
    currency?: string;
    destination_tier?: string;
    payment_method?: string;
    notes?: string;
  }) => apiClient.post<TravelerStipend>("/api/travel/stipends/custom", data),
  approveEventStipends: (eventId: string, data?: { approved_by?: string }) =>
    apiClient.post(`/api/travel/stipends/events/${eventId}/approve`, data || {}),
  rejectEventStipends: (eventId: string, data?: { reason?: string }) =>
    apiClient.post(`/api/travel/stipends/events/${eventId}/reject`, data || {}),
  approveSingleStipend: (stipendId: string, data?: { approved_by?: string }) =>
    apiClient.post<TravelerStipend>(`/api/travel/stipends/${stipendId}/approve`, data || {}),
  rejectSingleStipend: (stipendId: string, data?: { reason?: string }) =>
    apiClient.post<TravelerStipend>(`/api/travel/stipends/${stipendId}/reject`, data || {}),
  createStipend: (data: Partial<TravelerStipend>) =>
    apiClient.post<TravelerStipend>("/api/travel/stipends", data),
  disburseStipend: (id: string) =>
    apiClient.put<TravelerStipend>(`/api/travel/stipends/${id}/disburse`, {}),
  deleteStipend: (id: string) => apiClient.delete(`/api/travel/stipends/${id}`),

  // Special Coverage ("Special civerage")
  getSpecialCoverages: () =>
    apiClient.get<SpecialCoverage[]>("/api/travel/special-coverages"),
  createSpecialCoverage: (data: Partial<SpecialCoverage>) =>
    apiClient.post<SpecialCoverage>("/api/travel/special-coverages", data),
  deleteSpecialCoverage: (id: string) =>
    apiClient.delete(`/api/travel/special-coverages/${id}`),

  // Drone Combat Gear ("Stuff for play fight for drones")
  getDroneGear: () => apiClient.get<DroneCombatGear[]>("/api/travel/drone-gear"),
  createDroneGear: (data: Partial<DroneCombatGear>) =>
    apiClient.post<DroneCombatGear>("/api/travel/drone-gear", data),
  deleteDroneGear: (id: string) =>
    apiClient.delete(`/api/travel/drone-gear/${id}`),

  // Special Luggage ("Special luggage")
  getSpecialLuggage: () =>
    apiClient.get<SpecialLuggageManifest[]>("/api/travel/special-luggage"),
  createSpecialLuggage: (data: Partial<SpecialLuggageManifest>) =>
    apiClient.post<SpecialLuggageManifest>("/api/travel/special-luggage", data),
  deleteSpecialLuggage: (id: string) =>
    apiClient.delete(`/api/travel/special-luggage/${id}`),

  // Executives & Loyalty Programs
  getExecutives: () =>
    apiClient.get<import("@/types/travel").ExecutiveProfile[]>("/api/travel/executives"),
  createExecutive: (data: any) =>
    apiClient.post<import("@/types/travel").ExecutiveProfile>("/api/travel/executives", data),
  addLoyaltyProgram: (executiveId: string, data: any) =>
    apiClient.post<import("@/types/travel").LoyaltyProgram>(`/api/travel/executives/${executiveId}/loyalty`, data),

  // Travel Bookings & 20-30 Traveler Weekly Matrix
  getBookings: (params?: Record<string, any>) => {
    const qs = params ? new URLSearchParams(params as any).toString() : "";
    return apiClient.get<import("@/types/travel").TravelBooking[]>(`/api/travel/bookings${qs ? `?${qs}` : ""}`);
  },
  createBooking: (data: any) =>
    apiClient.post<import("@/types/travel").TravelBooking>("/api/travel/bookings", data),
  getWeeklyRoster: () =>
    apiClient.get<import("@/types/travel").WeeklyTravelRoster>("/api/travel/roster/weekly"),

  // Screen Scraper (Air Canada / carrier sync)
  syncScrapedBooking: (payload: {
    carrier?: string;
    booking_reference: string;
    initiated_by?: string;
    target_url?: string;
    passenger_name?: string;
    raw_text_or_html?: string;
  }) => apiClient.post<any>("/api/travel/scraper/sync-booking", payload),
  getScraperLogs: (limit: number = 20) =>
    apiClient.get<import("@/types/travel").ScraperLog[]>(`/api/travel/scraper/logs?limit=${limit}`),

  // AI Chat-Based Travel Planning
  getAiConversations: () =>
    apiClient.get<any[]>("/api/travel/ai-planner/conversations"),
  sendAiChat: (payload: {
    conversation_id?: string;
    assistant_name?: string;
    executive_target?: string;
    message_text: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    budget_cap?: number;
    model?: string;
  }) => apiClient.post<import("@/types/travel").AiChatResponse>("/api/travel/ai-planner/chat", payload),

  sendAiChatStream: async (
    payload: {
      conversation_id?: string;
      assistant_name?: string;
      executive_target?: string;
      message_text: string;
      destination?: string;
      start_date?: string;
      end_date?: string;
      budget_cap?: number;
      model?: string;
    },
    callbacks: {
      onStatus?: (statusText: string) => void;
      onThinking?: (chunk: string, fullThinking: string) => void;
      onContent?: (chunk: string, fullContent: string) => void;
      onFlights?: (flights: any[]) => void;
      onDone?: (data: any) => void;
      onError?: (err: any) => void;
    }
  ) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const baseUrl = window.location.origin.includes("localhost") ? "http://localhost:8008" : window.location.origin;
    try {
      const res = await fetch(`${baseUrl}/api/travel/ai-planner/chat-stream`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Chat stream failed: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream available");

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === "status" && callbacks.onStatus) {
                callbacks.onStatus(data.text);
              } else if (data.type === "flights_ready" && callbacks.onFlights) {
                callbacks.onFlights(data.flights || []);
              } else if (data.type === "thinking" && callbacks.onThinking) {
                callbacks.onThinking(data.chunk, data.full_thinking);
              } else if (data.type === "content" && callbacks.onContent) {
                callbacks.onContent(data.chunk, data.full_content);
              } else if (data.type === "done" && callbacks.onDone) {
                callbacks.onDone(data);
              }
            } catch (e) {
              console.debug("SSE json parse error", e);
            }
          }
        }
      }
    } catch (err) {
      if (callbacks.onError) {
        callbacks.onError(err);
      } else {
        throw err;
      }
    }
  },
  autoBookAiItinerary: (payload: {
    conversation_id?: string;
    traveler_name: string;
    traveler_email: string;
    booked_by_name: string;
    itinerary_payload: any;
  }) => apiClient.post<any>("/api/travel/ai-planner/auto-book", payload),

  // Real-Time Budgeting & Pre-Trip Forecast
  getRealtimeBudgetForecast: () =>
    apiClient.get<import("@/types/travel").RealtimeBudgetForecast>("/api/travel/budgets/realtime-forecast"),

  // Ground Transport & Vehicle Library with Seating Capacity
  getVehicles: (params?: { eventId?: string; userEmail?: string; userName?: string; isAdminOverride?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.eventId && params.eventId !== "all") q.append("event_id", params.eventId);
    if (params?.userEmail) q.append("user_email", params.userEmail);
    if (params?.userName) q.append("user_name", params.userName);
    if (params?.isAdminOverride) q.append("is_admin_override", "true");
    // The endpoint is paginated (default 50); fleet totals need every vehicle, so ask for the max page.
    q.append("page_size", "200");
    return apiClient
      .get<{ items: import("@/types/travel").TravelVehicle[]; total: number }>(`/api/travel/vehicles?${q.toString()}`)
      .then((res) => res.items);
  },
  createVehicle: (payload: Partial<import("@/types/travel").TravelVehicle>) =>
    apiClient.post<import("@/types/travel").TravelVehicle>("/api/travel/vehicles", payload),
  getVehicleCatalog: () =>
    apiClient.get<import("@/types/travel").VehicleCatalogResponse>("/api/travel/vehicles/catalog"),
  lookupVehicleSpecs: (params: { make: string; model?: string; year?: number; vin?: string }) => {
    const query = new URLSearchParams();
    query.append("make", params.make);
    if (params.model) query.append("model", params.model);
    if (params.year) query.append("year", String(params.year));
    if (params.vin) query.append("vin", params.vin);
    return apiClient.get<import("@/types/travel").VehicleSpecLookupResult>(
      `/api/travel/vehicles/lookup-specs?${query.toString()}`
    );
  },
  getVehicleModels: (make: string) =>
    apiClient.get<string[]>(`/api/travel/vehicles/models?make=${encodeURIComponent(make)}`),
  assignVehicleSeat: (
    vehicleId: string,
    payload: { passenger_name: string; row_number: number; seat_position: string; action: "assign" | "unassign" }
  ) =>
    apiClient.put<import("@/types/travel").TravelVehicle>(
      `/api/travel/vehicles/${vehicleId}/assign-seat`,
      payload
    ),
  assignVehicleDriver: (vehicleId: string, assignedDriver: string) =>
    apiClient.put<{
      status: string;
      message: string;
      vehicle: import("@/types/travel").TravelVehicle;
    }>(`/api/travel/vehicles/${vehicleId}/assign-driver`, { assigned_driver: assignedDriver }),
  broadcastVehicleDeparture: (
    vehicleId: string,
    payload: import("@/types/travel").VehicleDepartureBroadcastPayload
  ) =>
    apiClient.post<{
      status: string;
      message: string;
      departure_status: string;
      seats_remaining: number;
      vehicle: import("@/types/travel").TravelVehicle;
    }>(`/api/travel/vehicles/${vehicleId}/broadcast-departure`, payload),
  checkInToVehicle: (
    vehicleId: string,
    payload: import("@/types/travel").VehicleCheckInPayload
  ) =>
    apiClient.post<{
      status: string;
      message: string;
      seat_position?: string;
      row_number?: number;
      seats_remaining: number;
      vehicle: import("@/types/travel").TravelVehicle;
    }>(`/api/travel/vehicles/${vehicleId}/check-in`, payload),
  deleteVehicle: (vehicleId: string) =>
    apiClient.delete<{ message: string }>(`/api/travel/vehicles/${vehicleId}`),
  scrapeVehicleSpecs: (payload: { url: string; vehicle_id?: string; vendor?: string; raw_html?: string }) =>
    apiClient.post<import("@/types/travel").VehicleScrapeResponse>("/api/travel/vehicles/scrape-specs", payload),

  // Trip Calendar & Meeting Spots (Today & Tomorrow Schedule)
  getCalendarSchedule: (params?: { eventId?: string; userEmail?: string; isAdminOverride?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.eventId && params.eventId !== "all") q.append("event_id", params.eventId);
    if (params?.userEmail) q.append("user_email", params.userEmail);
    if (params?.isAdminOverride) q.append("is_admin_override", "true");
    const qs = q.toString();
    return apiClient.get<import("@/types/travel").TripScheduleResponse>(
      qs ? `/api/travel/calendar/schedule?${qs}` : "/api/travel/calendar/schedule"
    );
  },
  createScheduleItem: (payload: Partial<import("@/types/travel").EventScheduleItem>) =>
    apiClient.post<import("@/types/travel").EventScheduleItem>("/api/travel/calendar/schedule", payload),
  deleteScheduleItem: (itemId: string) =>
    apiClient.delete<{ message: string }>(`/api/travel/calendar/schedule/${itemId}`),

  // Receipts & AI OCR Extraction
  uploadAndExtractReceipt: (formData: FormData) =>
    apiClient.post<import("@/types/travel").ReceiptExtractionResult>(
      "/api/travel/receipts/upload-extract",
      formData
    ),
  batchUploadAndExtractReceipts: (formData: FormData) =>
    apiClient.post<import("@/types/travel").BatchReceiptUploadResponse>(
      "/api/travel/receipts/batch-upload",
      formData
    ),
  aiRefineReceipt: (payload: { raw_text?: string; current_data?: any; notes_or_hint?: string }) =>
    apiClient.post<import("@/types/travel").ReceiptExtractionResult>("/api/travel/receipts/ai-refine", payload),
  createReceipt: (payload: Partial<import("@/types/travel").TravelReceipt>) =>
    apiClient.post<import("@/types/travel").TravelReceipt>("/api/travel/receipts", payload),
  getReceipts: (params?: {
    eventId?: string;
    userEmail?: string;
    status?: string;
    category?: string;
    isAdminOverride?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.eventId && params.eventId !== "all") q.append("event_id", params.eventId);
    if (params?.userEmail) q.append("user_email", params.userEmail);
    if (params?.status && params.status !== "all") q.append("status", params.status);
    if (params?.category && params.category !== "all") q.append("category", params.category);
    if (params?.isAdminOverride) q.append("is_admin_override", "true");
    const qs = q.toString();
    return apiClient.get<import("@/types/travel").ReceiptsApiResponse>(
      qs ? `/api/travel/receipts?${qs}` : "/api/travel/receipts"
    );
  },
  getReceipt: (receiptId: string) =>
    apiClient.get<import("@/types/travel").TravelReceipt>(`/api/travel/receipts/${receiptId}`),
  getReceiptAttachmentUrl: (receiptId: string, inline = false) =>
    `/api/travel/receipts/${receiptId}/attachment${inline ? "?inline=true" : ""}`,
  updateReceipt: (receiptId: string, payload: Partial<import("@/types/travel").TravelReceipt>) =>
    apiClient.put<import("@/types/travel").TravelReceipt>(`/api/travel/receipts/${receiptId}`, payload),
  deleteReceipt: (receiptId: string) =>
    apiClient.delete<{ message: string }>(`/api/travel/receipts/${receiptId}`),
  getCurrencies: () =>
    apiClient.get<import("@/types/travel").CurrenciesApiResponse>("/api/travel/receipts/currencies"),

  // Navan Travel & Expense Integration
  getNavanStatus: () =>
    apiClient.get<import("@/types/travel").NavanConnectionStatus>("/api/travel/navan/status"),
  syncNavan: (params?: {
    date_filter_type?: "created" | "startDate" | string;
    from_date?: number;
    to_date?: number;
    trip_uuid?: string;
  }) =>
    apiClient.post<{
      status: string;
      synced_events?: number;
      synced_attendees?: number;
      synced_bookings?: number;
      synced_expenses?: number;
      timestamp: string;
    }>("/api/travel/navan/sync", params),
  getNavanOverview: () =>
    apiClient.get<import("@/types/travel").NavanOverview>("/api/travel/navan/overview"),
  getNavanBookings: (params?: {
    booking_type?: string;
    booking_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.booking_type && params.booking_type !== "ALL") q.append("booking_type", params.booking_type);
    if (params?.booking_status && params.booking_status !== "ALL") q.append("booking_status", params.booking_status);
    if (params?.search) q.append("search", params.search);
    if (params?.limit) q.append("limit", String(params.limit));
    if (params?.offset) q.append("offset", String(params.offset));
    const qs = q.toString();
    return apiClient.get<{ total: number; limit: number; offset: number; bookings: import("@/types/travel").NavanBooking[] }>(
      qs ? `/api/travel/navan/bookings?${qs}` : "/api/travel/navan/bookings"
    );
  },
  getNavanExpenses: (params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== "ALL") q.append("category", params.category);
    if (params?.search) q.append("search", params.search);
    if (params?.limit) q.append("limit", String(params.limit));
    if (params?.offset) q.append("offset", String(params.offset));
    const qs = q.toString();
    return apiClient.get<{ total: number; limit: number; offset: number; expenses: import("@/types/travel").NavanExpense[] }>(
      qs ? `/api/travel/navan/expenses?${qs}` : "/api/travel/navan/expenses"
    );
  },
  getNavanEvents: (status?: string) => {
    const q = new URLSearchParams();
    if (status && status !== "ALL") q.append("event_status", status);
    const qs = q.toString();
    return apiClient.get<{ total: number; events: import("@/types/travel").NavanSyncedEvent[] }>(
      qs ? `/api/travel/navan/events?${qs}` : "/api/travel/navan/events"
    );
  },
  getNavanGroupEvents: (daysBack: number = 30) =>
    apiClient.get<import("@/types/travel").NavanGroupEventsMap>(
      `/api/navan/group-events?days_back=${daysBack}`
    ),
  getUserInfo: (email?: string) =>
    apiClient.get<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      businessCapabilities: {
        supportedSearchTypes: Record<string, string> | string[];
        canBookForOthers?: boolean;
        guestBookingEnabled?: boolean;
      };
    }>(email ? `/api/uaa/userinfo?email=${encodeURIComponent(email)}` : "/api/uaa/userinfo"),
  getNavanEventParticipants: (eventId: string, page: number = 0, size: number = 20) =>
    apiClient.get<{
      content: any[];
      totalElements: number;
      totalPages: number;
      getTravelEventInvitationsResponseDto?: {
        invitations: {
          content: any[];
          totalElements: number;
          totalPages: number;
        };
      };
    }>(`/api/v2/user/travel-events/${eventId}/invitations/filter-participants?page=${page}&size=${size}`),
};
