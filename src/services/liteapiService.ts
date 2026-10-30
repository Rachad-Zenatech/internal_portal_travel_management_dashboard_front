import { apiClient } from "./apiClient";
import type {
  BookPayload,
  CancelResult,
  CheckoutView,
  DirectoryPerson,
  HotelSearchCriteria,
  HotelSearchResponse,
  LiteApiStatus,
  LiteBooking,
  LiteBookingList,
} from "@/types/liteapi";

const BASE = "/api/travel/liteapi";

// All LiteAPI traffic goes through the FastAPI backend; no LiteAPI credentials or URLs exist in the browser.
export const liteapiService = {
  searchDirectory: (q: string) =>
    apiClient.get<{ users: DirectoryPerson[]; graph_note: string | null }>(`${BASE}/directory?q=${encodeURIComponent(q)}`, {
      skipGlobalLoading: true,
    }),
  getStatus: () => apiClient.get<LiteApiStatus>(`${BASE}/status`),
  searchHotels: (c: HotelSearchCriteria) =>
    apiClient.post<HotelSearchResponse>(`${BASE}/hotels/search`, c, { actionLabel: "Searching hotels" }),
  prebook: (session_id: string, offer_id: string) =>
    apiClient.post<CheckoutView>(`${BASE}/hotels/prebook`, { session_id, offer_id }, {
      actionLabel: "Verifying latest price",
      actionSubtitle: "Checking availability and conditions with the supplier...",
    }),
  book: (payload: BookPayload) =>
    apiClient.post<LiteBooking>(`${BASE}/hotels/book`, payload, {
      actionLabel: "Completing booking",
      actionSubtitle: "Please do not close this page...",
    }),
  listBookings: (scope: "mine" | "all", page: number, page_size: number) =>
    apiClient.get<LiteBookingList>(`${BASE}/bookings?scope=${scope}&page=${page}&page_size=${page_size}`),
  getBooking: (id: string) => apiClient.get<LiteBooking>(`${BASE}/bookings/${id}`),
  refreshBooking: (id: string) =>
    apiClient.post<LiteBooking>(`${BASE}/bookings/${id}/refresh`, {}, { actionLabel: "Syncing with supplier" }),
  cancelBooking: (id: string, confirm: boolean) =>
    apiClient.post<CancelResult | LiteBooking>(`${BASE}/bookings/${id}/cancel`, { confirm }, {
      actionLabel: "Cancelling booking",
    }),
};
