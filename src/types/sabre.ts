export interface SabreCapability {
  key: string;
  label: string;
  enabled: boolean;
  reason: string | null;
}

export interface SabreStatus {
  environment: string;
  sandbox: boolean;
  banner: string;
  configured: boolean;
  config_error: string | null;
  capabilities: SabreCapability[];
  permissions: { diagnostics: boolean };
  booking: { entitlement: "denied" | "unknown"; checked_at: string | null };
}

export interface SabreFlightSearch {
  trip_type: "one_way" | "round_trip";
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: "economy" | "premium_economy" | "business" | "first";
  airlines: string[];
  max_stops?: number;
  max_price?: string;
  depart_after?: string;
  depart_before?: string;
}

export interface SabreSegment {
  segment_index: number;
  booking_class?: string | null;
  marketing_carrier: string | null;
  operating_carrier: string | null;
  flight_number: string;
  origin: string;
  destination: string;
  origin_terminal: string | null;
  destination_terminal: string | null;
  /** Local airport time with its UTC offset, e.g. 2026-12-14T09:15:00-05:00 */
  departure_local: string | null;
  arrival_local: string | null;
  duration_minutes: number | null;
  aircraft: string | null;
  layover_minutes_after: number | null;
}

export interface SabreLeg {
  direction: string;
  origin: string;
  destination: string;
  departure_local: string | null;
  arrival_local: string | null;
  duration_minutes: number | null;
  stops: number;
  segments: SabreSegment[];
}

export interface SabreBaggage {
  segment_index: number;
  pieces: number | null;
  weight: number | null;
  unit: string | null;
  description: string | null;
}

export interface SabreOffer {
  offer_id: string;
  sabre_itinerary_id: number | null;
  validating_carrier: string | null;
  carriers: string[];
  carrier_names: Record<string, string | null>;
  total_amount: string;
  currency: string;
  taxes_amount: string | null;
  base_amount: string | null;
  base_currency: string | null;
  refundable: boolean | null;
  cabin: string | null;
  seats_available: number | null;
  last_ticket_date: string | null;
  last_ticket_time: string | null;
  baggage: SabreBaggage[];
  legs: SabreLeg[];
  total_duration_minutes: number | null;
  max_stops: number;
}

export interface SabreSearchResponse {
  session_id: string;
  sandbox: boolean;
  searched_at: string;
  expires_at: string;
  total_before_filters: number;
  currencies: string[];
  offers: SabreOffer[];
}

export type SabreBookingStatus = "pending" | "confirmed" | "failed" | "unknown" | "cancelled";

export interface SabreBookingTravelerInput {
  given_name: string;
  surname: string;
  birth_date?: string;
  gender?: "MALE" | "FEMALE";
}

export interface SabreCreateBooking {
  session_id: string;
  offer_id: string;
  travelers: SabreBookingTravelerInput[];
  contact: { email: string; phone: string };
  accepted_total: string;
}

export interface SabreBooking {
  id: string;
  session_id: string;
  offer_id: string;
  confirmation_id: string | null;
  status: SabreBookingStatus;
  label: string;
  title: string;
  quoted_amount: string;
  currency: string;
  selection: SabreOffer;
  travelers: ({ type: "ADT" | "CNN" | "INF" } & SabreBookingTravelerInput)[];
  contact: { email?: string; phone?: string };
  error_code: string | null;
  error_message: string | null;
  ticketed: boolean;
  sandbox: boolean;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

export interface SabreCancelResult {
  requires_confirmation?: boolean;
  message?: string;
  booking?: SabreBooking;
}

export type SabreOutcome =
  | "working"
  | "reachable"
  | "accepted_no_data"
  | "denied"
  | "not_found"
  | "invalid_request"
  | "rate_limited"
  | "upstream_error"
  | "not_probed"
  | "unchecked";

export interface SabreApiRow {
  key: string;
  title: string;
  version: string;
  category: string;
  function: string;
  audience: string;
  flags: string[];
  note: string | null;
  used_in_app: boolean;
  /** "catalog" = portal try-it-out list; "collection" = only named in the sandbox collection document */
  source: "catalog" | "collection";
  /** Latest version per the sandbox-collection document (third-party summary) */
  doc_version: string | null;
  outcome: SabreOutcome;
  http: number | null;
  path: string | null;
  ms: number | null;
  /** Version of the latest route that answered; outcome, http and path describe this version. */
  tested_version: string;
  /** Every probed version (portal listing first, then newer candidates); `latest` marks the tested one. */
  versions: { version: string; outcome: SabreOutcome; http: number | null; path: string | null; origin: "portal" | "candidate"; latest: boolean }[];
}

export interface SabreDiagnostics {
  environment: string;
  base_host: string;
  credentials_configured: boolean;
  pseudo_city_code: string;
  token_cached: boolean;
  token_expires_at: string | null;
  last_checked_at: string | null;
  summary: Record<string, number>;
  catalog_total: number;
  collection_total: number;
  apis: SabreApiRow[];
  booking: { key: string; title: string; version: string; outcome: SabreOutcome | null; http: number | null; path: string | null }[];
  capabilities: {
    key: string;
    label: string;
    enabled: boolean;
    status: string;
    api: string;
    version: string | null;
    reason: string | null;
  }[];
}

export interface SabreProbeResult {
  checked_at: string;
  summary: Record<string, number>;
}
