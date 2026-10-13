import { apiClient } from "./apiClient";
import type {
  TravelEvent,
  EventAttendee,
  TravelBudget,
  BudgetLineItem,
  TravelerStipend,
  SpecialCoverage,
  DroneCombatGear,
  SpecialLuggageManifest,
  TravelDashboardSummary,
} from "@/types/travel";

export const travelService = {
  // Summary
  getDashboardSummary: () =>
    apiClient.get<TravelDashboardSummary>("/api/travel/dashboard/summary"),

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
    }>(`/api/travel/events/${id}`),
  createEvent: (data: Partial<TravelEvent> & { attendees?: Partial<EventAttendee>[] }) =>
    apiClient.post<TravelEvent>("/api/travel/events", data),
  updateEvent: (id: string, data: Partial<TravelEvent>) =>
    apiClient.put<TravelEvent>(`/api/travel/events/${id}`, data),
  deleteEvent: (id: string) => apiClient.delete(`/api/travel/events/${id}`),

  addAttendee: (eventId: string, data: Partial<EventAttendee>) =>
    apiClient.post<EventAttendee>(`/api/travel/events/${eventId}/attendees`, data),
  removeAttendee: (attendeeId: string) =>
    apiClient.delete(`/api/travel/attendees/${attendeeId}`),

  // Budgets ("Budgeting")
  getBudgets: () => apiClient.get<TravelBudget[]>("/api/travel/budgets"),
  getBudget: (id: string) => apiClient.get<TravelBudget>(`/api/travel/budgets/${id}`),
  createBudget: (data: Partial<TravelBudget> & { line_items?: Partial<BudgetLineItem>[] }) =>
    apiClient.post<TravelBudget>("/api/travel/budgets", data),
  addBudgetLineItem: (budgetId: string, data: Partial<BudgetLineItem>) =>
    apiClient.post<BudgetLineItem>(`/api/travel/budgets/${budgetId}/line-items`, data),
  deleteBudget: (id: string) => apiClient.delete(`/api/travel/budgets/${id}`),

  // Stipends ("User stiphen for who")
  getStipends: () => apiClient.get<TravelerStipend[]>("/api/travel/stipends"),
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
    assistant_name: string;
    executive_target: string;
    message_text: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    budget_cap?: number;
  }) => apiClient.post<import("@/types/travel").AiChatResponse>("/api/travel/ai-planner/chat", payload),
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
};

