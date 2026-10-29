import { apiClient } from "./apiClient";
import type {
  Booking,
  BookingList,
  BookPayload,
  BookResult,
  CancellationQuote,
  CarRate,
  CarSearchCriteria,
  CheckoutView,
  DirectoryUser,
  DuffelStatus,
  FlightOffer,
  FlightSearchCriteria,
  GeoLocation,
  PlaceSuggestion,
  ProductType,
  SandboxPreset,
  SearchResponse,
  StayResult,
  StaySearchCriteria,
  Trip,
} from "@/types/duffel";

const BASE = "/api/travel/duffel";

// All Duffel traffic goes through the FastAPI backend; no Duffel credentials or URLs exist in the browser.
export const duffelService = {
  getStatus: (refresh = false) => apiClient.get<DuffelStatus>(`${BASE}/status${refresh ? "?refresh=true" : ""}`),
  getSandboxPreset: () => apiClient.get<SandboxPreset>(`${BASE}/sandbox-preset`),
  suggestPlaces: (q: string) =>
    apiClient.get<PlaceSuggestion[]>(`${BASE}/places?q=${encodeURIComponent(q)}`, { skipGlobalLoading: true }),
  searchDirectory: (q: string) =>
    apiClient.get<{ users: DirectoryUser[]; graph_note: string | null }>(`${BASE}/directory?q=${encodeURIComponent(q)}`, {
      skipGlobalLoading: true,
    }),
  searchLocations: (q: string) =>
    apiClient.get<GeoLocation[]>(`${BASE}/locations?q=${encodeURIComponent(q)}`, { skipGlobalLoading: true }),

  searchFlights: (c: FlightSearchCriteria) =>
    apiClient.post<SearchResponse<FlightOffer>>(`${BASE}/flights/search`, c, { actionLabel: "Searching flights" }),
  searchStays: (c: StaySearchCriteria) =>
    apiClient.post<SearchResponse<StayResult>>(`${BASE}/stays/search`, c, { actionLabel: "Searching hotels" }),
  getStayRates: (session_id: string, search_result_id: string) =>
    apiClient.post<{ status: string; result: StayResult }>(`${BASE}/stays/rates`, { session_id, search_result_id }, {
      actionLabel: "Loading room rates",
    }),
  searchCars: (c: CarSearchCriteria) =>
    apiClient.post<SearchResponse<CarRate>>(`${BASE}/cars/search`, c, { actionLabel: "Searching rental cars" }),
  getSearchSession: (id: string) =>
    apiClient.get<{ session_id: string; product_type: ProductType; criteria: unknown; results: unknown[]; expired: boolean }>(
      `${BASE}/searches/${id}`,
    ),

  checkout: (session_id: string, product_type: ProductType, provider_ref: string) =>
    apiClient.post<CheckoutView>(`${BASE}/checkout`, { session_id, product_type, provider_ref }, {
      actionLabel: "Verifying latest price",
      actionSubtitle: "Checking availability and conditions with the supplier...",
    }),
  book: (payload: BookPayload) =>
    apiClient.post<BookResult>(`${BASE}/book`, payload, {
      actionLabel: "Completing booking",
      actionSubtitle: "Please do not close this page...",
    }),

  listBookings: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && qs.set(k, String(v)));
    return apiClient.get<BookingList>(`${BASE}/bookings?${qs.toString()}`);
  },
  getBooking: (id: string) => apiClient.get<Booking>(`${BASE}/bookings/${id}`),
  refreshBooking: (id: string) =>
    apiClient.post<Booking>(`${BASE}/bookings/${id}/refresh`, {}, { actionLabel: "Syncing with supplier" }),
  payHold: (id: string, body: { idempotency_key: string; accepted_total: string; accepted_currency: string; confirmed: boolean }) =>
    apiClient.post<{ status: string; booking?: Booking; message?: string }>(`${BASE}/bookings/${id}/pay`, body, {
      actionLabel: "Paying held order",
    }),
  quoteCancellation: (id: string) =>
    apiClient.post<CancellationQuote>(`${BASE}/bookings/${id}/cancellation-quote`, {}, {
      actionLabel: "Checking cancellation terms",
    }),
  confirmCancellation: (id: string, body: { cancellation_id: string; accepted_refund?: string | null; confirmed: boolean }) =>
    apiClient.post<{ status: string; booking: Booking; message?: string }>(`${BASE}/bookings/${id}/cancel`, body, {
      actionLabel: "Cancelling booking",
    }),
  listTrips: (scope: "mine" | "all" = "mine") =>
    apiClient.get<{ upcoming: Trip[]; previous: Trip[] }>(`${BASE}/trips?scope=${scope}`),
};

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
