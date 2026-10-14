import { apiClient } from "./apiClient";
import type {
  Airport,
  FlightBookingSession,
  FlightSearchFilters,
  FlightSearchResponse,
  SavedFlightOption,
} from "@/types/flight";

export const flightService = {
  searchAirports: (query: string) =>
    apiClient.get<Airport[]>(`/api/travel/flights/airports?q=${encodeURIComponent(query)}`),

  searchFlights: (filters: FlightSearchFilters) =>
    apiClient.post<FlightSearchResponse>("/api/travel/flights/search", filters),

  saveOption: (data: {
    trip_type: string;
    origin_airport: string;
    destination_airport: string;
    departure_date: string;
    return_date?: string;
    airline_name: string;
    flight_numbers: string;
    displayed_price: number;
    currency: string;
    source_url: string;
    itinerary_payload: any;
    notes?: string;
  }) => apiClient.post<SavedFlightOption>("/api/travel/flights/save-option", data),

  getSavedOptions: () =>
    apiClient.get<SavedFlightOption[]>("/api/travel/flights/saved-options"),

  createBookingSession: (data: {
    saved_option_id?: string;
    provider_name: string;
    booking_url: string;
    observed_price: number;
    currency: string;
    itinerary_summary: Record<string, any>;
    segments?: any[];
  }) => apiClient.post<FlightBookingSession>("/api/travel/flights/sessions", data),

  getRecentSessions: () =>
    apiClient.get<FlightBookingSession[]>("/api/travel/flights/sessions"),

  getSessionDetails: (sessionId: string) =>
    apiClient.get<FlightBookingSession>(`/api/travel/flights/sessions/${sessionId}`),

  sendSessionEvent: (
    sessionId: string,
    event: {
      event_type: string;
      source?: string;
      provider_price?: number;
      final_amount_paid?: number;
      confirmation_reference?: string;
      ticket_number?: string;
      traveler_names?: string[];
      raw_payload?: Record<string, any>;
    }
  ) =>
    apiClient.post<FlightBookingSession>(
      `/api/travel/flights/sessions/${sessionId}/events`,
      event
    ),

  submitFallback: (
    sessionId: string,
    data: {
      confirmation_reference: string;
      provider_name: string;
      ticket_number?: string;
      final_amount_paid: number;
      currency?: string;
      traveler_names?: string[];
      verification_notes?: string;
      attachment_url?: string;
    }
  ) =>
    apiClient.post<FlightBookingSession>(
      `/api/travel/flights/sessions/${sessionId}/fallback`,
      data
    ),

  cancelSession: (sessionId: string) =>
    apiClient.post<FlightBookingSession>(
      `/api/travel/flights/sessions/${sessionId}/cancel`,
      {}
    ),
};
