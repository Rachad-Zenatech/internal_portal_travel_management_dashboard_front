import { apiClient } from "./apiClient";
import type {
  SabreBooking,
  SabreCancelResult,
  SabreCreateBooking,
  SabreDiagnostics,
  SabreFlightSearch,
  SabreProbeResult,
  SabreSearchResponse,
  SabreStatus,
} from "@/types/sabre";

const BASE = "/api/travel/sabre";

// All Sabre traffic goes through the FastAPI backend; no Sabre credentials, tokens or URLs exist in the browser.
export const sabreService = {
  getStatus: () => apiClient.get<SabreStatus>(`${BASE}/status`),
  searchFlights: (c: SabreFlightSearch) =>
    apiClient.post<SabreSearchResponse>(`${BASE}/flights/search`, c, {
      actionLabel: "Searching Sabre sandbox flights",
      actionSubtitle: "This can take up to a minute...",
    }),
  createBooking: (body: SabreCreateBooking) =>
    apiClient.post<SabreBooking>(`${BASE}/bookings`, body, {
      actionLabel: "Booking flight with Sabre",
      actionSubtitle: "Please do not close this page...",
    }),
  listBookings: () => apiClient.get<SabreBooking[]>(`${BASE}/bookings`),
  refreshBooking: (id: string) =>
    apiClient.post<SabreBooking>(`${BASE}/bookings/${id}/refresh`, {}, { actionLabel: "Syncing with Sabre" }),
  cancelBooking: (id: string, confirm: boolean) =>
    apiClient.post<SabreCancelResult | SabreBooking>(`${BASE}/bookings/${id}/cancel`, { confirm }, { actionLabel: "Cancelling booking" }),
  getDiagnostics: () => apiClient.get<SabreDiagnostics>(`${BASE}/diagnostics`),
  runProbe: () =>
    apiClient.post<SabreProbeResult>(`${BASE}/diagnostics/probe`, {}, { actionLabel: "Checking Sabre sandbox" }),
};
